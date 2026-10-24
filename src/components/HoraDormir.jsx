import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SoundFilled } from '@ant-design/icons';
import {
  LUNA_MIN, PRORROGA_MIN, apagarPorHoy, audioDe, audioDeAviso, calcular, darProrroga, imagenDeAviso,
  terminarPrueba, useHoraDormir,
} from '../utils/horaDormir';
import './HoraDormir.css';

// Lo que ve el niño de la hora de dormir (la logica esta en
// utils/horaDormir.js y se configura en Actividades > Hora de dormir, modo
// desarrollador). Tres piezas:
// - la luna: aparece 30 min antes en la esquina y se va vaciando, como un
//   reloj de arena (un preescolar no lee la hora, pero ve cuanto queda);
// - los avisos: tarjeta arriba + campanita + voz grabada (si esta el audio)
//   a los 30, 15 y 5 min; el adulto puede apagar cualquiera. Nada de voz
//   sintetizada (pedido explicito). No bloquean: el juego sigue debajo;
// - la noche: pantalla de buenas noches (un adulto la desbloquea con 20
//   toques en la esquina de abajo a la derecha) que tapa todo hasta despertar, con
//   su audio. La musica se apaga despacio (App.jsx, onDormirChange).
// Va fuera del app-shell (que queda inert en el modo auto) y por encima del
// drawer de Actividades (9998) y del reproductor flotante (10000).

// Por nivel de aviso (primero, segundo, ultimo).
const TITULOS = ['En un ratito es hora de dormir', 'Ve terminando tu juego', '¡Último juego!'];

// La tarjeta se va sola; la luna queda para volver a verla.
const AVISO_VISIBLE_MS = 20000;

// Campanita suave de dos notas (sin archivo de audio).
function campanita() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [[784, 0], [523, 0.28]].forEach(([frecuencia, desfase]) => {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      const t = ctx.currentTime + desfase;
      osc.type = 'sine';
      osc.frequency.value = frecuencia;
      vol.gain.setValueAtTime(0.0001, t);
      vol.gain.exponentialRampToValueAtTime(0.18, t + 0.03);
      vol.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      osc.connect(vol).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 1.2);
    });
    setTimeout(() => ctx.close(), 1800);
  } catch {
    // Sin audio: la tarjeta basta.
  }
}

// Voz grabada (src/assets/hora-dormir/). Una sola a la vez. Al aparecer
// un aviso entra 1,5 s despues (pedido 2026-10-24): primero la campanita y
// la tarjeta, luego la voz. Volver a escucharla (boton, luna) es inmediato.
const RETARDO_VOZ_MS = 1500;
let vozActual = null;
let vozPendiente = null;
function callarVoz() {
  clearTimeout(vozPendiente);
  vozActual?.pause();
  vozActual = null;
}
function decir(url, retardo = RETARDO_VOZ_MS) {
  callarVoz();
  if (!url) return;
  vozPendiente = setTimeout(() => {
    // document.createElement, no new Audio(): mismo cuidado que con Image.
    const audio = document.createElement('audio');
    audio.src = url;
    vozActual = audio;
    audio.play().catch(() => {
      // El navegador puede bloquear el sonido si nadie ha tocado la pantalla.
    });
  }, retardo);
}

function Luna({ tamano = 40 }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M26 6a15 15 0 1 0 8 26A13 13 0 0 1 26 6z" fill="#FFD66B" />
    </svg>
  );
}

// Luna en la esquina con un anillo que se vacia en los ultimos 30 minutos.
function Reloj({ restantes, ultimo, onTocar }) {
  const r = 30;
  const largo = 2 * Math.PI * r;
  const fraccion = Math.max(0, Math.min(1, restantes / LUNA_MIN));
  return (
    <button
      type="button"
      className={`hd-reloj${ultimo ? ' hd-reloj--ultimo' : ''}`}
      onClick={onTocar}
      aria-label="Cuánto falta para dormir"
    >
      <svg viewBox="0 0 72 72" className="hd-reloj-anillo" aria-hidden="true">
        <circle cx="36" cy="36" r={r} className="hd-reloj-pista" />
        <circle
          cx="36"
          cy="36"
          r={r}
          className="hd-reloj-tiempo"
          strokeDasharray={largo}
          strokeDashoffset={largo * (1 - fraccion)}
        />
      </svg>
      <Luna tamano={34} />
    </button>
  );
}

// Volver a escuchar la voz. Solo si esta el audio: un boton que no suena
// confunde al niño.
function Escuchar({ url, className = '' }) {
  if (!url) return null;
  return (
    <button
      type="button"
      className={`hd-escuchar ${className}`}
      onClick={() => decir(url, 0)}
      aria-label="Escuchar otra vez"
    >
      <SoundFilled />
    </button>
  );
}

function Aviso({ nivel, onCerrar }) {
  const imagen = imagenDeAviso(nivel);
  return (
    <div className="hd-aviso" role="status">
      <div className={`hd-aviso-ilustracion${imagen ? ' hd-aviso-ilustracion--imagen' : ''}`}>
        {imagen ? <img src={imagen} alt="" /> : <Luna tamano={56} />}
      </div>
      <p className="hd-aviso-titulo">{TITULOS[nivel]}</p>
      <div className="hd-aviso-botones">
        <Escuchar url={audioDeAviso(nivel)} />
        <button type="button" className="hd-aviso-ok" onClick={onCerrar}>
          ¡Ya voy!
        </button>
      </div>
    </div>
  );
}

// Desbloqueo oculto: TOQUES_DESBLOQUEO toques seguidos en la esquina de
// abajo a la derecha de la pantalla de dormir (sin boton visible ni
// pregunta, pedido 2026-10-24), igual que el modo desarrollador. Cada toque
// debe llegar antes de VENTANA_TOQUES_MS desde el anterior.
const TOQUES_DESBLOQUEO = 20;
const VENTANA_TOQUES_MS = 1200;

// Opciones del adulto una vez desbloqueado.
function OpcionesAdulto({ prueba, onCerrar }) {
  return (
    <div className="hd-puerta-fondo" onClick={onCerrar}>
      <div className="hd-puerta" onClick={(e) => e.stopPropagation()}>
        <p className="hd-puerta-titulo">¿Qué quieres hacer?</p>
        <div className="hd-puerta-opciones">
          {prueba ? (
            <button type="button" className="hd-btn" onClick={terminarPrueba}>Terminar prueba</button>
          ) : (
            <>
              <button type="button" className="hd-btn" onClick={darProrroga}>
                {PRORROGA_MIN} minutos más
              </button>
              <button type="button" className="hd-btn hd-btn--suave" onClick={apagarPorHoy}>
                Apagar por hoy
              </button>
            </>
          )}
          <button type="button" className="hd-btn hd-btn--suave" onClick={onCerrar}>Volver</button>
        </div>
      </div>
    </div>
  );
}

// Estrellas fijas (sin JS): pocas y quietas salvo un titileo de opacidad,
// que el modo liviano apaga.
const ESTRELLAS = [
  [8, 12, 3], [22, 30, 2], [35, 8, 2], [48, 20, 3], [63, 10, 2], [78, 26, 3],
  [90, 14, 2], [12, 55, 2], [86, 60, 2], [70, 44, 2], [28, 72, 2], [94, 82, 3],
];

function Noche({ prueba }) {
  const [opciones, setOpciones] = useState(false);
  const toquesRef = useRef({ n: 0, t: 0 });
  const tocarEsquina = () => {
    const ahora = Date.now();
    const cuenta = toquesRef.current;
    cuenta.n = ahora - cuenta.t <= VENTANA_TOQUES_MS ? cuenta.n + 1 : 1;
    cuenta.t = ahora;
    if (cuenta.n < TOQUES_DESBLOQUEO) return;
    cuenta.n = 0;
    setOpciones(true);
  };
  // Despues de que la musica alcanza a bajar un poco.
  useEffect(() => {
    decir(audioDe('buenas-noches'));
    return callarVoz;
  }, []);

  return (
    <div className="hd-noche" role="dialog" aria-modal="true" aria-label="Hora de dormir">
      {ESTRELLAS.map(([x, y, t], i) => (
        <span
          key={i}
          className="hd-estrella"
          style={{ left: `${x}%`, top: `${y}%`, width: t * 2, height: t * 2, animationDelay: `${i * 0.37}s` }}
        />
      ))}
      <div className="hd-noche-centro">
        <div className="hd-noche-ilustracion">
          <Luna tamano={160} />
        </div>
        <h1 className="hd-noche-titulo">Hora de dormir</h1>
        <p className="hd-noche-texto">Buenas noches. Mañana seguimos jugando.</p>
        <Escuchar url={audioDe('buenas-noches')} className="hd-escuchar--noche" />
      </div>
      {prueba && <span className="hd-prueba-chip">Prueba</span>}
      <button type="button" className="hd-desbloqueo" onClick={tocarEsquina} aria-label="Desbloquear (adulto)" />
      {opciones && <OpcionesAdulto prueba={prueba} onCerrar={() => setOpciones(false)} />}
    </div>
  );
}

export default function HoraDormir({ onDormirChange }) {
  const almacen = useHoraDormir();
  const [ahora, setAhora] = useState(Date.now);
  // { fase, n }: n cambia en cada aparicion para reiniciar el auto-cierre.
  const [aviso, setAviso] = useState(null);
  const avisadasRef = useRef(new Set());
  const nPruebaRef = useRef(almacen.nPrueba);

  // Reloj: un tic por segundo. Solo re-renderiza lo que cambia (la luna)
  // cuando ya faltan 30 minutos o menos; antes el estado no cambia.
  useEffect(() => {
    const tic = () => setAhora(Date.now());
    const id = setInterval(tic, 1000);
    const alVolver = () => document.visibilityState === 'visible' && tic();
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, []);

  const { fase, nivel, restantes, prueba } = calcular(almacen, ahora);

  const mostrarAviso = useCallback((nv) => setAviso((a) => ({ nivel: nv, n: (a?.n ?? 0) + 1 })), []);
  useEffect(() => {
    if (!aviso) return undefined;
    const id = setTimeout(() => setAviso(null), AVISO_VISIBLE_MS);
    return () => clearTimeout(id);
  }, [aviso]);

  // Cada aviso sale UNA vez por noche (al llegar a su minuto). Si la app se
  // abre ya pasado un aviso, sale ese y no los anteriores. Una prueba nueva
  // del modo desarrollador empieza la cuenta de cero.
  useEffect(() => {
    const avisadas = avisadasRef.current;
    if (nPruebaRef.current !== almacen.nPrueba) {
      nPruebaRef.current = almacen.nPrueba;
      avisadas.clear();
    }
    if (fase !== 'aviso') {
      if (fase === 'libre') avisadas.clear();
      setAviso(null);
      return;
    }
    if (nivel < 0 || avisadas.has(nivel)) return;
    for (let i = 0; i <= nivel; i++) avisadas.add(i);
    // Aviso apagado por el adulto: no sale (la luna sigue). La vista previa
    // del modo desarrollador lo muestra igual.
    if (!almacen.config.avisosActivos[nivel] && prueba !== 'vista') return;
    campanita();
    decir(audioDeAviso(nivel));
    mostrarAviso(nivel);
  }, [fase, nivel, prueba, almacen.nPrueba, almacen.config.avisosActivos, mostrarAviso]);

  const dormido = fase === 'dormir';
  useEffect(() => {
    onDormirChange?.(dormido);
  }, [dormido, onDormirChange]);

  if (fase === 'libre') return null;

  return createPortal(
    <>
      {dormido ? (
        <Noche prueba={prueba} />
      ) : (
        <>
          <Reloj
            restantes={restantes}
            ultimo={nivel === TITULOS.length - 1}
            onTocar={() => {
              const nv = Math.max(0, nivel);
              decir(audioDeAviso(nv), 0);
              mostrarAviso(nv);
            }}
          />
          {aviso && <Aviso nivel={aviso.nivel} onCerrar={() => setAviso(null)} />}
          {prueba && (
            <button type="button" className="hd-prueba-cerrar" onClick={terminarPrueba}>
              Terminar prueba
            </button>
          )}
        </>
      )}
    </>,
    document.body,
  );
}

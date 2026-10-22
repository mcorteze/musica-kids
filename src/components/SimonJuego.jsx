import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { CaretRightFilled } from '@ant-design/icons';
import { GiCheckMark, GiCrossMark, GiEyeTarget, GiHearts, GiPawPrint, GiPointing, GiSnowflake2, GiFlowerStar, GiLawStar, GiSparkles, GiTrophyCup, GiWaveCrest } from 'react-icons/gi';
import './SimonJuego.css';

// ========== SIMÓN DICE ==========
// El clásico juego de luces: el equipo enciende una secuencia de colores y
// hay que repetirla tocando los mismos botones en el mismo orden. Cada nivel
// agrega una luz más y va un poco más rápido.
//
// Los 4 colores del equipo son SIEMPRE los mismos (verde, rojo, azul,
// amarillo, como el juguete original). Lo que cambia con el grupo de música
// elegido es todo lo demás: el fondo de la página (gradient del tema), la
// carcasa del equipo (playerBg, el mismo fondo oscuro de la carátula en la
// página del grupo), el anillo y los brillos (accentColor) y los textos.
//
// Sin emojis (la tablet no los tiene): iconos de react-icons.

// Sentido horario desde arriba a la izquierda, igual que el juguete.
// tono = notas del Simon original (un acorde de La mayor), en Hz.
export const SIMON_COLORES = [
  { id: 'verde', nombre: 'Verde', base: '#0A5C2E', luz: '#3DFF8F', tono: 329.63 },
  { id: 'rojo', nombre: 'Rojo', base: '#7E0F26', luz: '#FF4D6D', tono: 220 },
  { id: 'azul', nombre: 'Azul', base: '#0C3C86', luz: '#4FB8FF', tono: 164.81 },
  { id: 'amarillo', nombre: 'Amarillo', base: '#8C6500', luz: '#FFE55C', tono: 277.18 },
];

// Nivel 10 superado = juego ganado. Con 3 vidas: cada error resta una y se
// vuelve a mostrar la MISMA secuencia (no se pierde el nivel).
export const SIMON_NIVEL_META = 10;
const VIDAS = 3;
// Ancho de la columna lateral (corazones, récord y estado) cuando la
// pantalla es baja y ancha; debe calzar con .simon-juego.apaisado en el CSS.
const ANCHO_COSTADO = 300;

// Ritmo: cuánto dura encendida cada luz al mostrar la secuencia y la pausa
// entre una y otra. Baja con cada nivel hasta un piso que un niño todavía
// puede seguir.
function luzMs(nivel) {
  return Math.max(320, 640 - (nivel - 1) * 36);
}

function pausaMs(nivel) {
  return Math.max(120, 260 - (nivel - 1) * 15);
}

// Al sumar la luz nueva se evita la tercera repetición seguida del mismo
// color: para un niño, tres iguales seguidas parecen una sola.
function luzNueva(secuencia) {
  const n = secuencia.length;
  const repetido = n >= 2 && secuencia[n - 1] === secuencia[n - 2] ? secuencia[n - 1] : null;
  let i;
  do {
    i = Math.floor(Math.random() * SIMON_COLORES.length);
  } while (i === repetido);
  return i;
}

function recordKey(grupoId) {
  return `musica-kids-simon-record-${grupoId}`;
}

function leerRecord(grupoId) {
  try {
    const n = Number(localStorage.getItem(recordKey(grupoId)));
    return Number.isInteger(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function guardarRecord(grupoId, nivel) {
  try {
    localStorage.setItem(recordKey(grupoId), String(nivel));
  } catch {
    // Sin localStorage el récord dura lo que dure la sesión.
  }
}

// ===== Sonido (Web Audio, sin archivos) =====
// Un solo AudioContext para toda la app: se crea con el primer toque a
// "Jugar" (los navegadores exigen un gesto para que suene).
let contextoAudio = null;

function audio() {
  if (!contextoAudio) {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return null;
    contextoAudio = new Contexto();
  }
  if (contextoAudio.state === 'suspended') contextoAudio.resume();
  return contextoAudio;
}

function tono(frecuencia, ms, { tipo = 'triangle', volumen = 0.22, inicio = 0 } = {}) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + inicio;
  const fin = t + ms / 1000;
  const ganancia = c.createGain();
  ganancia.gain.setValueAtTime(0.0001, t);
  ganancia.gain.exponentialRampToValueAtTime(volumen, t + 0.012);
  ganancia.gain.setValueAtTime(volumen, Math.max(t + 0.013, fin - 0.04));
  ganancia.gain.exponentialRampToValueAtTime(0.0001, fin + 0.14);
  ganancia.connect(c.destination);
  // Fundamental + una octava suave arriba: más "electrónico" que un
  // triángulo solo, sin llegar a chillar.
  const osc = c.createOscillator();
  osc.type = tipo;
  osc.frequency.value = frecuencia;
  osc.connect(ganancia);
  const octava = c.createOscillator();
  const gananciaOctava = c.createGain();
  octava.type = 'sine';
  octava.frequency.value = frecuencia * 2;
  gananciaOctava.gain.value = 0.22;
  octava.connect(gananciaOctava).connect(ganancia);
  osc.start(t);
  octava.start(t);
  osc.stop(fin + 0.16);
  octava.stop(fin + 0.16);
}

function sonidoError() {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  const filtro = c.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 900;
  const ganancia = c.createGain();
  ganancia.gain.setValueAtTime(0.0001, t);
  ganancia.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
  ganancia.gain.setValueAtTime(0.16, t + 0.42);
  ganancia.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  filtro.connect(ganancia).connect(c.destination);
  [92, 98].forEach((f) => {
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = f;
    osc.connect(filtro);
    osc.start(t);
    osc.stop(t + 0.62);
  });
}

// Las 4 notas del equipo subiendo (una octava arriba): suena a "¡bien!".
function sonidoAcierto() {
  [164.81, 220, 277.18, 329.63].forEach((f, k) => {
    tono(f * 2, 90, { tipo: 'sine', volumen: 0.16, inicio: k * 0.075 });
  });
}

function sonidoVictoria() {
  [220, 277.18, 329.63, 440, 554.37, 659.25].forEach((f, k) => {
    tono(f, k === 5 ? 520 : 120, { tipo: 'triangle', volumen: 0.18, inicio: k * 0.11 });
  });
}

// ===== El equipo (SVG) =====
// viewBox 400x400 centrado en 200,200. Cada botón es un cuarto de anillo
// desplazado hacia afuera en diagonal: así las ranuras entre botones quedan
// paralelas (como el juguete) y no en cuña. El trazo del mismo color con
// esquinas redondas les redondea las puntas.
const CENTRO = 200;
const R_INTERNO = 80;
const R_EXTERNO = 174;
const DESPLAZAMIENTO = 9;

function punto(r, grados) {
  const rad = (grados * Math.PI) / 180;
  return [CENTRO + r * Math.cos(rad), CENTRO + r * Math.sin(rad)];
}

function cuarto(indice) {
  const a0 = 180 + indice * 90;
  const a1 = a0 + 90;
  const [x0, y0] = punto(R_EXTERNO, a0);
  const [x1, y1] = punto(R_EXTERNO, a1);
  const [x2, y2] = punto(R_INTERNO, a1);
  const [x3, y3] = punto(R_INTERNO, a0);
  const medio = ((a0 + 45) * Math.PI) / 180;
  return {
    d: `M${x0} ${y0}A${R_EXTERNO} ${R_EXTERNO} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${R_INTERNO} ${R_INTERNO} 0 0 0 ${x3} ${y3}Z`,
    dx: Math.cos(medio) * DESPLAZAMIENTO,
    dy: Math.sin(medio) * DESPLAZAMIENTO,
    medio: a0 + 45,
  };
}

const CUARTOS = SIMON_COLORES.map((_, i) => cuarto(i));

// Centro visual de cada botón (dentro de su grupo ya desplazado) y tamaño
// del motivo grabado, en unidades del viewBox.
const CENTRO_BOTON = CUARTOS.map((q) => punto((R_INTERNO + R_EXTERNO) / 2 + 4, q.medio));
const MOTIVO_TAM = 50;

// Marcas del anillo exterior (el "dial" tecnológico): 72 rayitas, una más
// larga cada 6.
const MARCAS = Array.from({ length: 72 }, (_, k) => {
  const larga = k % 6 === 0;
  const [x1, y1] = punto(larga ? 184 : 187, k * 5);
  const [x2, y2] = punto(193, k * 5);
  return { x1, y1, x2, y2, larga };
});

function EquipoSvg({ encendido, onTocar, interactivo, Motivo }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="simon-svg" viewBox="0 0 400 400" aria-hidden={!interactivo || undefined}>
      <defs>
        <filter id={`brillo-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="lejano" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="cercano" />
          <feMerge>
            <feMergeNode in="lejano" />
            <feMergeNode in="lejano" />
            <feMergeNode in="cercano" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Núcleo blanco del botón encendido: el neón se ve "caliente" al
            centro y del color puro hacia los bordes. */}
        <radialGradient id={`nucleo-${id}`} cx={CENTRO} cy={CENTRO} r={R_EXTERNO} gradientUnits="userSpaceOnUse">
          <stop offset={R_INTERNO / R_EXTERNO} stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.72" stopColor="#FFFFFF" stopOpacity="0.38" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`reflejo-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
          <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.04" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.18" />
        </linearGradient>
      </defs>

      <g className="simon-marcas">
        {MARCAS.map((m, k) => (
          <line key={k} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} className={m.larga ? 'larga' : undefined} />
        ))}
      </g>

      {SIMON_COLORES.map((color, i) => {
        const q = CUARTOS[i];
        const on = encendido === i;
        const [lx, ly] = punto(196.5, q.medio);
        return (
          <g key={color.id} transform={`translate(${q.dx} ${q.dy})`}>
            <path
              d={q.d}
              className={`simon-boton${on ? ' on' : ''}`}
              style={{ fill: on ? color.luz : color.base, stroke: on ? color.luz : color.base }}
              filter={on ? `url(#brillo-${id})` : undefined}
              onPointerDown={interactivo ? (e) => { e.preventDefault(); onTocar(i); } : undefined}
              role={interactivo ? 'button' : undefined}
              aria-label={interactivo ? color.nombre : undefined}
            />
            <path d={q.d} className="simon-boton-reflejo" fill={`url(#reflejo-${id})`} opacity={on ? 0.6 : 1} />
            {on && <path d={q.d} className="simon-boton-reflejo" fill={`url(#nucleo-${id})`} />}
            {/* Motivo del grupo grabado al centro del botón: tenue apagado,
                blanco brillante con la luz encendida. */}
            {Motivo && (
              <Motivo
                className={`simon-motivo${on ? ' on' : ''}`}
                size={MOTIVO_TAM}
                x={CENTRO_BOTON[i][0] - MOTIVO_TAM / 2}
                y={CENTRO_BOTON[i][1] - MOTIVO_TAM / 2}
                aria-hidden="true"
              />
            )}
            {/* LED testigo en el dial, frente a cada botón */}
            <circle
              cx={lx - q.dx}
              cy={ly - q.dy}
              r="3.2"
              className="simon-led"
              style={{ fill: on ? color.luz : 'rgba(255,255,255,0.22)' }}
            />
          </g>
        );
      })}

      <circle cx={CENTRO} cy={CENTRO} r="72" className="simon-anillo-interno" />
    </svg>
  );
}

// ===== Traje de cada grupo =====
// Grupos con los que se juega (los ids de src/data/groups.js). Del tema
// sale lo general (fondo, carcasa, color principal, botones, tarjetas); aquí
// va lo que lo hace sentirse de ESE grupo:
//   aro        borde del equipo (los colores del personaje/película)
//   detalle    marcas del dial, anillo del centro, puntos: reemplaza al
//              accentColor del tema cuando este no es "de la marca" (el de
//              Toy Story es verde, el de Paw Patrol naranjo)
//   decoracion motivo animado de fondo
//   portada    false = el centro no muestra la carátula (la de Disney es el
//              arcoíris de 4 cuadrantes; el tema Disney es noche y estrellas)
//   motivo     icono grabado en los 4 botones y de las chispas al acertar
//   chispa     icono de las chispas si el motivo no se lee en chiquito
//   centro     clase extra para el centro sin carátula
//   posicion   encuadre de la carátula en el centro (background-position)
export const SIMON_GRUPOS = ['disney', 'frozen', 'moana', 'paw-patrol', 'toy-story'];

const ESTILOS_GRUPO = {
  frozen: {
    aro: 'linear-gradient(140deg, #FFFFFF 0%, #BFE9FF 22%, #6FB8E8 48%, #2D7FC1 70%, #D5CCF2 100%)',
    detalle: '#BFE9FF',
    decoracion: 'nieve',
    motivo: GiSnowflake2,
  },
  'paw-patrol': {
    aro: 'linear-gradient(140deg, #FFB8D8 0%, #F0559E 30%, #E0298C 60%, #F5A623 100%)',
    detalle: '#FFC94D',
    decoracion: 'patitas',
    motivo: GiPawPrint,
  },
  moana: {
    aro: 'linear-gradient(140deg, #A8E6E6 0%, #2FB5B0 30%, #0E8C93 62%, #F2694B 100%)',
    detalle: '#FF8A6B',
    decoracion: 'olas',
    motivo: GiWaveCrest,
    // La ola en chiquito parece medusa: las chispas son flores de la isla.
    chispa: GiFlowerStar,
  },
  'toy-story': {
    // Woody: camisa amarilla, chaleco de vaca, pañuelo rojo y cuero café.
    aro: 'linear-gradient(140deg, #FFE27A 0%, #F5B91E 28%, #C97F2E 55%, #A9631E 75%, #D93A2B 100%)',
    detalle: '#FFD24A',
    decoracion: 'nubes',
    // La estrella de sheriff de Woody.
    motivo: GiLawStar,
    // El póster tiene el logo arriba y los pies de Buzz al centro.
    posicion: 'center 12%',
  },
  disney: {
    aro: 'linear-gradient(140deg, #FFF1B8 0%, #FFD24A 25%, #FFB020 50%, #B9780A 75%, #FFE08A 100%)',
    detalle: '#FFC94D',
    decoracion: 'estrellas',
    motivo: GiSparkles,
    portada: false,
    centro: 'centro-estrellas',
  },
};

function hexARgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16)).join(', ');
}

// Posiciones fijas (no al azar en cada render) y con variación "natural":
// el número áureo reparte sin que se note un patrón.
function repartir(cantidad, fn) {
  return Array.from({ length: cantidad }, (_, k) => fn(k, (k * 0.618034) % 1, (k * 0.414214) % 1));
}

const COPOS = repartir(22, (k, a, b) => ({
  left: `${(a * 100).toFixed(1)}%`,
  size: 12 + Math.round(b * 26),
  dur: 10 + Math.round(b * 9),
  delay: -((k * 1.7) % 18),
  opacity: 0.45 + b * 0.5,
}));

// Dos rastros de huellitas que cruzan la pantalla en diagonal.
const HUELLAS = [
  ...repartir(7, (k) => ({ left: 4 + k * 4.2, top: 82 - k * 10, rot: 28, delay: k * 0.45 })),
  ...repartir(7, (k) => ({ left: 96 - k * 4.2, top: 12 + k * 10, rot: 208, delay: 3.2 + k * 0.45 })),
].map((h, k) => ({ ...h, left: `${h.left + (k % 2 ? 1.6 : -1.6)}%`, top: `${h.top}%` }));

const NUBES = [
  { top: '5%', escala: 1.1, dur: 95, delay: -10 },
  { top: '18%', escala: 0.75, dur: 120, delay: -70 },
  { top: '32%', escala: 0.95, dur: 105, delay: -40 },
  { top: '9%', escala: 0.6, dur: 140, delay: -110 },
  { top: '46%', escala: 0.7, dur: 130, delay: -20 },
  { top: '26%', escala: 1.25, dur: 115, delay: -88 },
];

const DESTELLOS = repartir(16, (k, a, b) => ({
  left: `${(a * 96 + 2).toFixed(1)}%`,
  top: `${(b * 60 + 2).toFixed(1)}%`,
  size: 10 + Math.round(((k * 7) % 5) * 4),
  delay: -((k * 0.37) % 3),
  dorado: k % 3 === 0,
}));

const PATH_DESTELLO = 'M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z';
const PATH_NUBE = 'M30 70a22 22 0 0 1 4-43.6A30 30 0 0 1 90 20a26 26 0 0 1 44 14 20 20 0 0 1 6 36Z';

function Decoracion({ tipo }) {
  if (tipo === 'nieve') {
    return (
      <div className="simon-decoracion deco-nieve" aria-hidden="true">
        {COPOS.map((c, k) => (
          <GiSnowflake2
            key={k}
            className="simon-copo"
            style={{ left: c.left, fontSize: c.size, opacity: c.opacity, animationDuration: `${c.dur}s, ${c.dur / 3}s`, animationDelay: `${c.delay}s, ${c.delay}s` }}
          />
        ))}
        <div className="simon-escarcha" />
      </div>
    );
  }
  if (tipo === 'patitas') {
    return (
      <div className="simon-decoracion deco-patitas" aria-hidden="true">
        {HUELLAS.map((h, k) => (
          <GiPawPrint key={k} className="simon-huella" style={{ left: h.left, top: h.top, rotate: `${h.rot}deg`, animationDelay: `${h.delay}s` }} />
        ))}
      </div>
    );
  }
  if (tipo === 'olas') {
    const ola = 'M0 30 Q 50 0 100 30 T 200 30 T 300 30 T 400 30 V 80 H 0 Z';
    return (
      <div className="simon-decoracion deco-olas" aria-hidden="true">
        <div className="simon-sol" />
        {[0, 1, 2].map((k) => (
          <svg key={k} className={`simon-ola ola-${k}`} viewBox="0 0 400 80" preserveAspectRatio="none">
            <path d={ola} />
          </svg>
        ))}
      </div>
    );
  }
  if (tipo === 'nubes') {
    return (
      <div className="simon-decoracion deco-nubes" aria-hidden="true">
        {NUBES.map((n, k) => (
          <svg
            key={k}
            className="simon-nube"
            viewBox="0 0 150 76"
            style={{ top: n.top, width: 150 * n.escala * 1.4, animationDuration: `${n.dur}s`, animationDelay: `${n.delay}s` }}
          >
            <path d={PATH_NUBE} />
          </svg>
        ))}
      </div>
    );
  }
  if (tipo === 'estrellas') {
    return (
      <div className="simon-decoracion deco-estrellas" aria-hidden="true">
        {DESTELLOS.map((d, k) => (
          <svg
            key={k}
            className={`simon-destello${d.dorado ? ' dorado' : ''}`}
            viewBox="0 0 24 24"
            style={{ left: d.left, top: d.top, width: d.size, height: d.size, animationDelay: `${d.delay}s` }}
          >
            <path d={PATH_DESTELLO} />
          </svg>
        ))}
        <span className="simon-fugaz" />
      </div>
    );
  }
  return null;
}

// ===== El juego =====
// fase: 'listo' (esperando "Jugar") → 'anuncio' (texto de nivel en pantalla)
// → 'muestra' (el equipo enseña la secuencia) → 'turno' (repite la niña)
// → 'acierto' | 'error' → ... → 'victoria' | 'fin'.
const ESTADO_TEXTO = {
  listo: 'Toca Jugar para empezar',
  anuncio: '',
  muestra: 'Mira y escucha…',
  turno: '¡Tu turno!',
  acierto: '¡Muy bien!',
  error: '¡Uy! Ese no era',
  victoria: '¡Lo lograste!',
  fin: '¡Buen juego!',
};

export default function SimonJuego({ tema, grupoId, portada, autoIniciar = false, onNivel }) {
  const [fase, setFase] = useState('listo');
  const [nivel, setNivel] = useState(1);
  const [secuencia, setSecuencia] = useState([]);
  const [paso, setPaso] = useState(0);
  const [tocados, setTocados] = useState([]);
  const [vidas, setVidas] = useState(VIDAS);
  const [encendido, setEncendido] = useState(null);
  const [banner, setBanner] = useState(null);
  const [record, setRecord] = useState(() => leerRecord(grupoId));
  const [nuevoRecord, setNuevoRecord] = useState(false);
  const [lado, setLado] = useState(0);
  const [apaisado, setApaisado] = useState(false);
  // Onda de luz que sale del equipo cada vez que se enciende un botón, y
  // chispas con el motivo del grupo (al acertar un botón y al pasar de nivel).
  const [onda, setOnda] = useState(null);
  const [chispas, setChispas] = useState([]);
  const ondaIdRef = useRef(0);
  const chispaIdRef = useRef(0);

  // Copias en refs para el toque (corre fuera del ciclo de render) y la
  // secuencia asíncrona de la partida.
  const faseRef = useRef(fase);
  const secuenciaRef = useRef(secuencia);
  const pasoRef = useRef(0);
  const vidasRef = useRef(VIDAS);
  const nivelRef = useRef(1);
  const tokenRef = useRef(0);
  const timersRef = useRef(new Set());
  const luzTimerRef = useRef(null);
  const bannerIdRef = useRef(0);
  const juegoRef = useRef(null);
  const barraRef = useRef(null);
  const pieRef = useRef(null);

  const prender = useCallback((i) => {
    setEncendido(i);
    ondaIdRef.current += 1;
    setOnda({ id: ondaIdRef.current, color: SIMON_COLORES[i].luz });
  }, []);

  // origen en fracción del equipo (0..1), alcance en fracción del lado.
  const lanzarChispas = useCallback((origen, cantidad, colores, alcance, tamano = 1) => {
    const nuevas = Array.from({ length: cantidad }, (_, k) => {
      chispaIdRef.current += 1;
      const ang = (k / cantidad) * Math.PI * 2 + Math.random() * 0.5;
      const dist = alcance * (0.65 + Math.random() * 0.45);
      return {
        id: chispaIdRef.current,
        x: origen[0],
        y: origen[1],
        dx: Math.cos(ang) * dist,
        dy: Math.sin(ang) * dist,
        rot: Math.round((Math.random() - 0.5) * 220),
        tam: (0.035 + Math.random() * 0.03) * tamano,
        color: colores[k % colores.length],
      };
    });
    const ids = new Set(nuevas.map((c) => c.id));
    setChispas((prev) => [...prev, ...nuevas]);
    setTimeout(() => setChispas((prev) => prev.filter((c) => !ids.has(c.id))), 1100);
  }, []);

  const cambiarFase = useCallback((f) => {
    faseRef.current = f;
    setFase(f);
  }, []);

  useEffect(() => {
    onNivel?.(fase === 'listo' ? null : nivel);
  }, [fase, nivel, onNivel]);

  // Toda espera de la partida pasa por aquí: al desmontar (o reiniciar) se
  // limpian los timers y la partida vieja deja de avanzar.
  const esperar = useCallback((ms) => new Promise((resolve) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      resolve();
    }, ms);
    timersRef.current.add(id);
  }), []);

  useEffect(() => () => {
    tokenRef.current += 1;
    timersRef.current.forEach(clearTimeout);
    clearTimeout(luzTimerRef.current);
  }, []);

  // El equipo ocupa el cuadrado más grande que entra en lo que dejan libre
  // la barra de arriba y el pie (recalculado al rotar la tablet). El bloque
  // completo queda centrado en alto: sin huecos muertos en el celular.
  useLayoutEffect(() => {
    const el = juegoRef.current;
    if (!el) return undefined;
    const medir = () => {
      const { width, height } = el.getBoundingClientRect();
      // Pantalla baja y ancha (celular acostado): en columna el equipo
      // quedaba diminuto; ahí la barra y el pie pasan a un costado.
      const enFila = height < 520 && width > height * 1.4;
      setApaisado(enFila);
      if (enFila) {
        setLado(Math.floor(Math.max(0, Math.min(height - 16, width - ANCHO_COSTADO - 28, 680))));
        return;
      }
      const gap = parseFloat(getComputedStyle(el).rowGap) || 0;
      const resto = (barraRef.current?.offsetHeight ?? 0) + (pieRef.current?.offsetHeight ?? 0) + gap * 2 + 24;
      setLado(Math.floor(Math.max(0, Math.min(width - 24, height - resto, 680))));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const anunciar = useCallback(async (titulo, sub, ms, token) => {
    bannerIdRef.current += 1;
    setBanner({ id: bannerIdRef.current, titulo, sub, ms });
    await esperar(ms);
    if (tokenRef.current === token) setBanner(null);
  }, [esperar]);

  const mostrarSecuencia = useCallback(async (seq, niv, token) => {
    cambiarFase('muestra');
    pasoRef.current = 0;
    setPaso(0);
    setTocados([]);
    await esperar(420);
    for (let k = 0; k < seq.length; k += 1) {
      if (tokenRef.current !== token) return;
      prender(seq[k]);
      setPaso(k + 1);
      tono(SIMON_COLORES[seq[k]].tono, luzMs(niv));
      await esperar(luzMs(niv));
      if (tokenRef.current !== token) return;
      setEncendido(null);
      await esperar(pausaMs(niv));
    }
    if (tokenRef.current !== token) return;
    pasoRef.current = 0;
    setPaso(0);
    cambiarFase('turno');
  }, [cambiarFase, esperar, prender]);

  const empezar = useCallback(async () => {
    audio();
    tokenRef.current += 1;
    const token = tokenRef.current;
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
    const seq = [luzNueva([])];
    secuenciaRef.current = seq;
    vidasRef.current = VIDAS;
    nivelRef.current = 1;
    setSecuencia(seq);
    setVidas(VIDAS);
    setNivel(1);
    setNuevoRecord(false);
    setEncendido(null);
    setTocados([]);
    setPaso(0);
    cambiarFase('anuncio');
    await anunciar('¡Prepárate!', 'Mira las luces y repítelas', 1700, token);
    if (tokenRef.current !== token) return;
    await anunciar('Nivel 1', 'Una luz', 1350, token);
    if (tokenRef.current !== token) return;
    mostrarSecuencia(seq, 1, token);
  }, [anunciar, cambiarFase, mostrarSecuencia]);

  useEffect(() => {
    if (autoIniciar) empezar();
    // Solo al montar: "Reiniciar" remonta el componente con otra key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const terminar = useCallback((nivelAlcanzado) => {
    if (nivelAlcanzado > record) {
      setRecord(nivelAlcanzado);
      setNuevoRecord(true);
      guardarRecord(grupoId, nivelAlcanzado);
    }
  }, [record, grupoId]);

  const acertar = useCallback(async () => {
    const token = tokenRef.current;
    cambiarFase('acierto');
    await esperar(260);
    if (tokenRef.current !== token) return;
    sonidoAcierto();
    lanzarChispas([0.5, 0.5], 20, [...SIMON_COLORES.map((c) => c.luz), '#FFFFFF'], 0.66, 1.6);
    await esperar(760);
    if (tokenRef.current !== token) return;

    const niv = nivelRef.current;
    if (niv >= SIMON_NIVEL_META) {
      // Ronda final de luces mientras el modal de victoria espera sus 5 s.
      cambiarFase('victoria');
      terminar(SIMON_NIVEL_META);
      sonidoVictoria();
      for (let k = 0; k < 16; k += 1) {
        if (tokenRef.current !== token) return;
        prender(k % SIMON_COLORES.length);
        if (k % 4 === 0) lanzarChispas([0.5, 0.5], 16, [...SIMON_COLORES.map((c) => c.luz), '#FFFFFF'], 0.7, 1.6);
        await esperar(150);
      }
      setEncendido(null);
      return;
    }

    const siguiente = niv + 1;
    const seq = [...secuenciaRef.current, luzNueva(secuenciaRef.current)];
    nivelRef.current = siguiente;
    secuenciaRef.current = seq;
    setNivel(siguiente);
    setSecuencia(seq);
    setTocados([]);
    setPaso(0);
    cambiarFase('anuncio');
    const sub = siguiente === 4 || siguiente === 7 || siguiente === SIMON_NIVEL_META
      ? (siguiente === SIMON_NIVEL_META ? '¡El último!' : '¡Más rápido!')
      : `${siguiente} luces`;
    await anunciar(`Nivel ${siguiente}`, sub, 1350, token);
    if (tokenRef.current !== token) return;
    mostrarSecuencia(seq, siguiente, token);
  }, [anunciar, cambiarFase, esperar, lanzarChispas, mostrarSecuencia, prender, terminar]);

  const fallar = useCallback(async () => {
    const token = tokenRef.current;
    cambiarFase('error');
    sonidoError();
    const quedan = vidasRef.current - 1;
    vidasRef.current = quedan;
    setVidas(quedan);
    await esperar(900);
    if (tokenRef.current !== token) return;
    if (quedan <= 0) {
      cambiarFase('anuncio');
      await anunciar('¡Se acabó!', `Llegaste al nivel ${nivelRef.current}`, 1700, token);
      if (tokenRef.current !== token) return;
      terminar(nivelRef.current);
      cambiarFase('fin');
      return;
    }
    cambiarFase('anuncio');
    await anunciar('¡Otra vez!', quedan === 1 ? 'Te queda 1 corazón' : `Te quedan ${quedan} corazones`, 1450, token);
    if (tokenRef.current !== token) return;
    mostrarSecuencia(secuenciaRef.current, nivelRef.current, token);
  }, [anunciar, cambiarFase, esperar, mostrarSecuencia, terminar]);

  const tocar = useCallback((i) => {
    if (faseRef.current !== 'turno') return;
    const seq = secuenciaRef.current;
    const p = pasoRef.current;
    clearTimeout(luzTimerRef.current);
    prender(i);
    luzTimerRef.current = setTimeout(() => setEncendido((e) => (e === i ? null : e)), 260);

    if (seq[p] !== i) {
      fallar();
      return;
    }
    tono(SIMON_COLORES[i].tono, 260);
    lanzarChispas(CENTRO_BOTON[i].map((v) => v / 400), 7, [SIMON_COLORES[i].luz], 0.13);
    const np = p + 1;
    pasoRef.current = np;
    setPaso(np);
    setTocados((t) => [...t, i]);
    if (np === seq.length) acertar();
  }, [acertar, fallar, lanzarChispas, prender]);

  const estilo = ESTILOS_GRUPO[grupoId] ?? {};
  const detalle = estilo.detalle ?? tema.accentColor;
  const conPortada = Boolean(portada) && estilo.portada !== false;
  const estiloTema = {
    '--simon-acento': detalle,
    '--simon-acento-rgb': hexARgb(detalle),
    '--simon-sombra-rgb': tema.playerOverlayRgb,
    '--simon-texto': tema.token.colorText,
    '--simon-primario': tema.token.colorPrimary,
    '--simon-primario-rgb': hexARgb(tema.token.colorPrimary),
    '--simon-carcasa': tema.playerBg,
    '--simon-aro': estilo.aro ?? tema.headerStyle.background,
    '--simon-boton': tema.buttonPrimary.background,
    '--simon-boton-sombra': tema.buttonPrimary.boxShadow,
    '--simon-tarjeta': tema.cardBg,
    '--simon-borde': tema.cardStyle?.borderColor ?? tema.token.colorBorder,
    '--simon-velo': `rgba(${hexARgb(tema.token.colorBgLayout)}, 0.86)`,
  };

  const IconoCentro = {
    muestra: GiEyeTarget,
    turno: GiPointing,
    acierto: GiCheckMark,
    error: GiCrossMark,
    victoria: GiTrophyCup,
  }[fase];

  return (
    <div className={`simon-juego fase-${fase}${apaisado ? ' apaisado' : ''}`} style={estiloTema} ref={juegoRef}>
      <Decoracion tipo={estilo.decoracion} />
      <div className="simon-barra" ref={barraRef} style={apaisado ? undefined : { maxWidth: Math.max(lado + 24, 320) }}>
        <div className="simon-vidas" aria-label={`${vidas} ${vidas === 1 ? 'corazón' : 'corazones'}`}>
          {Array.from({ length: VIDAS }, (_, k) => (
            <GiHearts key={k} className={`simon-vida${k < vidas ? '' : ' perdida'}`} aria-hidden="true" />
          ))}
        </div>
        <div className="simon-record">
          <GiTrophyCup aria-hidden="true" />
          <span>Récord {record > 0 ? `nivel ${record}` : '—'}</span>
        </div>
      </div>

      <div className="simon-area" style={{ width: lado, height: lado }}>
        {/* El resplandor de atrás toma el color del botón encendido. */}
        <div
          className="simon-halo"
          style={{
            width: lado * 1.3,
            height: lado * 1.3,
            ...(encendido !== null && { '--simon-halo': SIMON_COLORES[encendido].luz }),
          }}
          aria-hidden="true"
        />
        <div className="simon-equipo" style={{ width: lado, height: lado, borderWidth: Math.max(8, Math.round(lado * 0.026)) }}>
          <EquipoSvg encendido={encendido} onTocar={tocar} interactivo Motivo={estilo.motivo} />
          {/* Centro: la carátula del grupo (los personajes), oscurecida
              mientras se juega para que el icono de encima se lea. */}
          <div
            className={`simon-centro${conPortada ? ' con-portada' : ''}${estilo.centro ? ` ${estilo.centro}` : ''}`}
            style={conPortada ? { backgroundImage: `url(${portada})`, backgroundPosition: estilo.posicion } : undefined}
          >
            {fase === 'listo' ? (
              <button type="button" className="simon-jugar" onClick={empezar}>
                <CaretRightFilled aria-hidden="true" />
                <span>Jugar</span>
              </button>
            ) : (
              fase !== 'anuncio' && (
                <span key={fase} className="simon-centro-icono">
                  {IconoCentro ? <IconoCentro aria-hidden="true" /> : <span className="simon-centro-nivel">{nivel}</span>}
                </span>
              )
            )}
          </div>
        </div>
        {onda && (
          <span key={onda.id} className="simon-onda" style={{ width: lado, height: lado, '--onda': onda.color }} aria-hidden="true" />
        )}
        <div className="simon-chispas" aria-hidden="true">
          {chispas.map((c) => {
            const Chispa = estilo.chispa ?? estilo.motivo ?? GiSparkles;
            return (
              <Chispa
                key={c.id}
                className="simon-chispa"
                style={{
                  left: c.x * lado,
                  top: c.y * lado,
                  fontSize: Math.max(14, Math.round(c.tam * lado)),
                  color: c.color,
                  '--dx': `${Math.round(c.dx * lado)}px`,
                  '--dy': `${Math.round(c.dy * lado)}px`,
                  '--rot': `${c.rot}deg`,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="simon-pie" ref={pieRef}>
        <p className="simon-estado" role="status" aria-live="polite">
          <span key={fase}>{ESTADO_TEXTO[fase] || ' '}</span>
        </p>
        <div className="simon-pasos" aria-hidden="true">
          {secuencia.map((c, k) => {
            const hecho = fase === 'muestra' ? k < paso : k < tocados.length;
            const color = fase === 'muestra' ? null : SIMON_COLORES[tocados[k]]?.luz;
            return (
              <span
                key={k}
                className={`simon-paso${hecho ? ' hecho' : ''}`}
                style={hecho && color ? { background: color, boxShadow: `0 0 10px ${color}` } : undefined}
              />
            );
          })}
        </div>
      </div>

      {banner && (
        <div key={banner.id} className="simon-banner" style={{ '--simon-banner-ms': `${banner.ms}ms` }} aria-hidden="true">
          <span className="simon-banner-titulo">{banner.titulo}</span>
          {banner.sub && <span className="simon-banner-sub">{banner.sub}</span>}
        </div>
      )}

      {fase === 'victoria' && (
        <div className="memory-victoria-overlay victoria">
          <div className="memory-victoria">
            <GiTrophyCup className="memory-victoria-icono trofeo" aria-hidden="true" />
            <p>¡Ganaste los {SIMON_NIVEL_META} niveles!</p>
            <button type="button" className="memory-victoria-btn simon-btn" onClick={empezar}>
              Jugar otra vez
            </button>
          </div>
        </div>
      )}

      {fase === 'fin' && (
        <div className="memory-victoria-overlay simon-fin">
          <div className="memory-victoria">
            <GiHearts className="memory-victoria-icono simon-fin-icono" aria-hidden="true" />
            <p>Llegaste al nivel {nivel}</p>
            {nuevoRecord && <span className="simon-nuevo-record"><GiTrophyCup aria-hidden="true" /> ¡Nuevo récord!</span>}
            <button type="button" className="memory-victoria-btn simon-btn" onClick={empezar}>
              Jugar otra vez
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

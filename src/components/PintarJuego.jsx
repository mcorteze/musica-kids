import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CheckOutlined } from '@ant-design/icons';
import { cuadricularImagen, esColorClaro, numeroLamina } from '../utils/pintarNumeros';

// Tienen que coincidir con App.css: GAP_CELDAS es el gap de .pintar-tablero
// y BORDE_TABLERO su padding. CELDA_MAX evita celdas gigantes en un monitor
// enorme con un nivel de pocas celdas.
const GAP_CELDAS = 1;
const BORDE_TABLERO = 6;
const CELDA_MAX = 64;

// Espera antes de avisar que la lámina está terminada (deja ver cómo se
// quita la cuadrícula). El modal de victoria además trae su propio retardo
// (.memory-victoria-overlay.victoria en App.css), común a todos los juegos.
const COMPLETADO_MS = 400;

// Pintar por números: la imagen se convierte en una cuadrícula de celdas
// grises numeradas (utils/pintarNumeros.js) y se pinta un número a la vez,
// en orden obligado 01 → 02 → 03...: solo las celdas del número en curso se
// pueden pintar (se ven en un gris más oscuro) y al terminarlas se pasa solo
// al siguiente. Se pinta tocando o arrastrando el dedo por encima. Al
// terminar se quita la cuadrícula para ver la imagen entera y se llama a
// onCompletado. El padre lo vuelve a montar (key) para reiniciar el juego.
// Opcionales (solo "Pintar pixel art"): calcular(img) arma la lámina en vez de
// pixelar al nivel (utils/pintarPixel.js) y nitida muestra la imagen de fondo
// sin suavizado (pixel art de pocos pixeles ampliado).
export default function PintarJuego({ imagen, nivel, onCompletado, calcular, nitida }) {
  const [lamina, setLamina] = useState(null);
  const [pintadas, setPintadas] = useState(null);
  const [tamCelda, setTamCelda] = useState(0);
  const areaRef = useRef(null);
  const tableroRef = useRef(null);
  const pintandoRef = useRef(false);
  // Último punto del trazo en curso ([x, y] de pantalla, null al levantar el dedo).
  const ultimoPuntoRef = useRef(null);

  useEffect(() => {
    let vivo = true;
    imagen.cargar().then((m) => {
      const img = document.createElement('img');
      img.onload = () => {
        if (!vivo) return;
        const l = calcular ? calcular(img) : cuadricularImagen(img, nivel.lado, nivel.colores);
        setLamina({ ...l, src: m.default });
        setPintadas(l.celdas.map((n) => n === null));
      };
      img.src = m.default;
    });
    return () => {
      vivo = false;
    };
  }, [imagen, nivel, calcular]);

  // Celdas que faltan por número (índice = número).
  const faltan = useMemo(() => {
    if (!lamina || !pintadas) return [];
    const f = new Array(lamina.paleta.length + 1).fill(0);
    lamina.celdas.forEach((n, i) => {
      if (n !== null && !pintadas[i]) f[n]++;
    });
    return f;
  }, [lamina, pintadas]);

  // Número en curso: el menor que todavía tiene celdas sin pintar.
  const numeroActual = useMemo(() => {
    for (let n = 1; n < faltan.length; n++) if (faltan[n] > 0) return n;
    return null;
  }, [faltan]);
  const terminado = Boolean(lamina) && numeroActual === null;

  useEffect(() => {
    if (!terminado) return;
    const t = setTimeout(onCompletado, COMPLETADO_MS);
    return () => clearTimeout(t);
  }, [terminado, onCompletado]);

  // Celda más grande que cabe en el espacio disponible, sin scroll.
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el || !lamina) return;
    const recalcular = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const porAncho = (width - 2 * BORDE_TABLERO - (lamina.columnas - 1) * GAP_CELDAS) / lamina.columnas;
      const porAlto = (height - 2 * BORDE_TABLERO - (lamina.filas - 1) * GAP_CELDAS) / lamina.filas;
      setTamCelda(Math.max(0, Math.floor(Math.min(porAncho, porAlto, CELDA_MAX))));
    };
    recalcular();
    const ro = new ResizeObserver(recalcular);
    ro.observe(el);
    return () => ro.disconnect();
  }, [lamina]);

  // Pinta las celdas del número en curso por donde pasa el dedo. El
  // navegador agrupa los movimientos de un mismo cuadro (un barrido rápido
  // llega como pocos puntos separados), así que se recorre el trazo desde
  // el punto anterior en pasos de media celda: si no, quedarían huecos.
  const pintarTrazo = useCallback((puntos) => {
    const tablero = tableroRef.current;
    if (!tablero || !lamina || numeroActual === null || !tamCelda) return;
    const rect = tablero.getBoundingClientRect();
    const paso = tamCelda + GAP_CELDAS;
    const nuevas = new Set();
    const marcar = (x, y) => {
      const c = Math.floor((x - rect.left - BORDE_TABLERO) / paso);
      const f = Math.floor((y - rect.top - BORDE_TABLERO) / paso);
      if (c < 0 || f < 0 || c >= lamina.columnas || f >= lamina.filas) return;
      const i = f * lamina.columnas + c;
      if (lamina.celdas[i] === numeroActual) nuevas.add(i);
    };
    for (const [x, y] of puntos) {
      const prev = ultimoPuntoRef.current;
      if (prev) {
        const pasos = Math.ceil(Math.hypot(x - prev[0], y - prev[1]) / (paso / 2));
        for (let s = 1; s < pasos; s++) {
          marcar(prev[0] + ((x - prev[0]) * s) / pasos, prev[1] + ((y - prev[1]) * s) / pasos);
        }
      }
      marcar(x, y);
      ultimoPuntoRef.current = [x, y];
    }
    if (nuevas.size === 0) return;
    setPintadas((prev) => {
      if ([...nuevas].every((i) => prev[i])) return prev;
      const sig = prev.slice();
      for (const i of nuevas) sig[i] = true;
      return sig;
    });
  }, [lamina, numeroActual, tamCelda]);

  const alPresionar = useCallback((e) => {
    pintandoRef.current = true;
    ultimoPuntoRef.current = null;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pintarTrazo([[e.clientX, e.clientY]]);
  }, [pintarTrazo]);

  const alMover = useCallback((e) => {
    if (!pintandoRef.current) return;
    const eventos = e.nativeEvent.getCoalescedEvents?.() ?? [];
    pintarTrazo(eventos.length ? eventos.map((ev) => [ev.clientX, ev.clientY]) : [[e.clientX, e.clientY]]);
  }, [pintarTrazo]);

  const alSoltar = useCallback(() => {
    pintandoRef.current = false;
    ultimoPuntoRef.current = null;
  }, []);

  if (!lamina || !pintadas) {
    return (
      <div className="pintar-juego">
        <p className="gallery-empty">Preparando la lámina...</p>
      </div>
    );
  }

  const fuente = Math.max(8, Math.round(tamCelda * 0.42));
  // La imagen original va detrás de las celdas, del tamaño exacto de la
  // cuadrícula: se asoma tenue a través de las celdas sin pintar.
  const anchoGrilla = lamina.columnas * tamCelda + (lamina.columnas - 1) * GAP_CELDAS;
  const altoGrilla = lamina.filas * tamCelda + (lamina.filas - 1) * GAP_CELDAS;

  return (
    <div className="pintar-juego">
      <div className="pintar-area" ref={areaRef}>
        <div
          ref={tableroRef}
          className={`pintar-tablero${terminado ? ' terminado' : ''}`}
          style={{
            gridTemplateColumns: `repeat(${lamina.columnas}, ${tamCelda}px)`,
            gridAutoRows: `${tamCelda}px`,
            fontSize: `${fuente}px`,
          }}
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
        >
          <img
            src={lamina.src}
            alt=""
            className={`pintar-fondo${nitida ? ' nitida' : ''}`}
            style={{ left: BORDE_TABLERO, top: BORDE_TABLERO, width: anchoGrilla, height: altoGrilla }}
            draggable={false}
          />
          {lamina.celdas.map((n, i) => {
            if (n === null) return <span key={i} className="pintar-celda vacia" />;
            if (pintadas[i]) {
              // La sombra de 1px rellena el gap con el mismo color: entre
              // celdas pintadas no se asoma la imagen de fondo.
              const color = lamina.paleta[n - 1];
              return <span key={i} className="pintar-celda pintada" style={{ background: color, boxShadow: `0 0 0 ${GAP_CELDAS}px ${color}` }} />;
            }
            return (
              <span key={i} className={`pintar-celda${n === numeroActual ? ' actual' : ''}`}>
                {numeroLamina(n)}
              </span>
            );
          })}
        </div>
      </div>

      <div className="pintar-paleta" aria-label="Colores">
        {lamina.paleta.map((color, idx) => {
          const n = idx + 1;
          const listo = faltan[n] === 0;
          const estado = listo ? 'listo' : n === numeroActual ? 'actual' : 'despues';
          return (
            <span
              key={n}
              className={`pintar-color ${estado}${esColorClaro(color) ? ' claro' : ''}`}
              style={{ background: color }}
              aria-label={`Color ${numeroLamina(n)}${listo ? ', listo' : ''}`}
            >
              {listo ? <CheckOutlined /> : numeroLamina(n)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

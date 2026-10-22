import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cuadricularImagen, numeroLamina } from '../utils/pintarNumeros';

// Tienen que coincidir con App.css: GAP_CELDAS es el gap de .pintar-tablero
// y BORDE_TABLERO su padding. CELDA_MAX evita celdas gigantes en un monitor
// enorme con un nivel de pocas celdas.
const GAP_CELDAS = 1;
const BORDE_TABLERO = 6;
const CELDA_MAX = 64;
// Mientras se pinta, la lámina se ve AMPLIADA para que un niño PREESCOLAR lea
// los números y atine con el dedo: ZOOM veces el tamaño que cabe entero, pero
// NUNCA menos de CELDA_MIN_JUEGO (en láminas de muchos cuadros o pantallas
// chicas el 3x relativo seguía dejando celdas diminutas) ni más de
// CELDA_MAX_ZOOM. Se desplaza con dos dedos (o rueda/barras con mouse). Al
// terminar vuelve a 1x para ver la imagen completa. (2026-10-21: un poco más
// alejado que el primer ajuste 3x / 64-96 px, que costaba recorrer.)
const ZOOM = 2.5;
const CELDA_MIN_JUEGO = 52;
const CELDA_MAX_ZOOM = 80;
// Número de la celda: proporción del lado (52 px → número de ~25 px).
const FUENTE_CELDA = 0.48;
// Sin pintar ninguna celda durante este tiempo, la lámina se desplaza sola
// hasta la celda pendiente del número en curso más cercana a la vista.
const AYUDA_MS = 15000;

// Espera antes de avisar que la lámina está terminada (deja ver cómo se
// quita la cuadrícula). El modal de victoria además trae su propio retardo
// (.memory-victoria-overlay.victoria en App.css), común a todos los juegos.
const COMPLETADO_MS = 400;

// Pintar por números: la imagen se convierte en una cuadrícula de celdas
// grises numeradas (utils/pintarNumeros.js) y se pinta un número a la vez,
// en orden obligado 1 → 2 → 3...: solo las celdas del número en curso se
// pueden pintar (se ven en un gris más oscuro) y al terminarlas se pasa solo
// al siguiente. Se pinta tocando o arrastrando el dedo por encima. Al
// terminar se quita la cuadrícula para ver la imagen entera y se llama a
// onCompletado. Mientras se pinta la lámina se ve ampliada (ZOOM) y se
// desplaza con dos dedos; al terminar vuelve a 1x. El padre lo vuelve a
// montar (key) para reiniciar el juego.
// Opcionales (solo "Pintar pixel art"): calcular(img) arma la lámina en vez de
// pixelar al nivel (utils/pintarPixel.js) y nitida muestra la imagen de fondo
// sin suavizado (pixel art de pocos pixeles ampliado). progreso
// ({ total, pintadas: [índices] }) retoma una lámina a medias; onProgreso
// (pintadas, total) avisa cada avance para guardarlo; onEstado({ actual,
// total }) avisa el número en curso (el stepper del encabezado).
export default function PintarJuego({ imagen, nivel, onCompletado, calcular, nitida, progreso, onProgreso, onEstado }) {
  const [lamina, setLamina] = useState(null);
  const [pintadas, setPintadas] = useState(null);
  // Celda del tamaño que cabe entera (1x); mientras se pinta se amplía.
  const [celdaEntera, setCeldaEntera] = useState(0);
  const areaRef = useRef(null);
  // Dedos apoyados en el tablero ({ id: [x, y] }): con dos se desplaza.
  const dedosRef = useRef(new Map());
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
        // Progreso guardado de ESTA lámina (mismo total de celdas: si la
        // lámina se recreó, el guardado ya no sirve y se parte de cero).
        const guardadas = progreso && progreso.total === l.celdas.length ? new Set(progreso.pintadas) : null;
        setPintadas(l.celdas.map((n, i) => n === null || Boolean(guardadas?.has(i))));
      };
      img.src = m.default;
    });
    return () => {
      vivo = false;
    };
    // progreso solo se lee al cargar la lámina.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const tamCelda = terminado || !celdaEntera
    ? celdaEntera
    : Math.min(Math.max(celdaEntera * ZOOM, CELDA_MIN_JUEGO), CELDA_MAX_ZOOM);

  useEffect(() => {
    if (!terminado) return;
    const t = setTimeout(onCompletado, COMPLETADO_MS);
    return () => clearTimeout(t);
  }, [terminado, onCompletado]);

  // Avisos al padre: avance (para retomarlo si se cierra la ventana) y número
  // en curso (stepper del encabezado).
  useEffect(() => {
    if (!lamina || !pintadas || !onProgreso) return;
    const hechas = [];
    pintadas.forEach((p, i) => {
      if (p && lamina.celdas[i] !== null) hechas.push(i);
    });
    onProgreso(hechas, lamina.celdas.length);
  }, [lamina, pintadas, onProgreso]);

  useEffect(() => {
    if (!lamina || !onEstado) return;
    onEstado({ actual: numeroActual, total: lamina.paleta.length });
  }, [lamina, numeroActual, onEstado]);

  // Celda más grande que cabe en el espacio disponible, sin scroll.
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el || !lamina) return;
    const recalcular = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const porAncho = (width - 2 * BORDE_TABLERO - (lamina.columnas - 1) * GAP_CELDAS) / lamina.columnas;
      const porAlto = (height - 2 * BORDE_TABLERO - (lamina.filas - 1) * GAP_CELDAS) / lamina.filas;
      setCeldaEntera(Math.max(0, Math.floor(Math.min(porAncho, porAlto, CELDA_MAX))));
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

  // Lleva la vista hasta la celda pendiente del número en curso más cercana
  // al centro de lo que se está viendo (centrada). soloSiNoSeVe: no se mueve
  // si ya hay alguna a la vista.
  const irAlMasCercano = useCallback((soloSiNoSeVe) => {
    const area = areaRef.current;
    const tablero = tableroRef.current;
    if (!area || !tablero || !lamina || !pintadas || numeroActual === null || !tamCelda) return;
    const paso = tamCelda + GAP_CELDAS;
    const vista = area.getBoundingClientRect();
    const base = tablero.getBoundingClientRect();
    const cx = vista.left + vista.width / 2;
    const cy = vista.top + vista.height / 2;
    let mejor = null;
    let mejorDist = Infinity;
    for (let i = 0; i < lamina.celdas.length; i++) {
      if (lamina.celdas[i] !== numeroActual || pintadas[i]) continue;
      const x = base.left + BORDE_TABLERO + (i % lamina.columnas) * paso;
      const y = base.top + BORDE_TABLERO + Math.floor(i / lamina.columnas) * paso;
      const seVe = x + tamCelda > vista.left && x < vista.right && y + tamCelda > vista.top && y < vista.bottom;
      if (seVe && soloSiNoSeVe) return;
      const d = Math.hypot(x + tamCelda / 2 - cx, y + tamCelda / 2 - cy);
      if (d < mejorDist) {
        mejor = [x, y];
        mejorDist = d;
      }
    }
    if (!mejor) return;
    area.scrollTo({
      left: area.scrollLeft + mejor[0] - cx + tamCelda / 2,
      top: area.scrollTop + mejor[1] - cy + tamCelda / 2,
      behavior: 'smooth',
    });
  }, [lamina, pintadas, numeroActual, tamCelda]);

  // Con el número nuevo (o al cambiar el tamaño): si ninguna de sus celdas
  // está a la vista, se desplaza sola hasta la más cercana.
  useLayoutEffect(() => {
    irAlMasCercano(true);
    // Solo al cambiar de número o de tamaño, no con cada celda pintada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numeroActual, tamCelda, lamina]);

  // Ayuda: AYUDA_MS sin pintar ninguna celda nueva → se desplaza hasta la
  // más cercana del número en curso (y repite cada AYUDA_MS mientras siga
  // sin avanzar). Cada celda pintada reinicia la cuenta.
  const irAlMasCercanoRef = useRef(irAlMasCercano);
  irAlMasCercanoRef.current = irAlMasCercano;
  useEffect(() => {
    if (!lamina || terminado) return;
    let t;
    const programar = () => {
      t = setTimeout(() => {
        irAlMasCercanoRef.current(false);
        programar();
      }, AYUDA_MS);
    };
    programar();
    return () => clearTimeout(t);
  }, [lamina, pintadas, terminado]);

  // Un dedo pinta; al apoyar el segundo se deja de pintar y los dos
  // desplazan la lámina ampliada (el tablero no deja al navegador hacerlo:
  // touch-action none, para que arrastrar un dedo pinte).
  const centroDedos = () => {
    const [a, b] = [...dedosRef.current.values()];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };

  const alPresionar = useCallback((e) => {
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Puntero que ya no existe (se levantó justo): se sigue sin captura.
    }
    dedosRef.current.set(e.pointerId, [e.clientX, e.clientY]);
    if (dedosRef.current.size > 1) {
      pintandoRef.current = false;
      ultimoPuntoRef.current = null;
      return;
    }
    pintandoRef.current = true;
    ultimoPuntoRef.current = null;
    pintarTrazo([[e.clientX, e.clientY]]);
  }, [pintarTrazo]);

  const alMover = useCallback((e) => {
    const dedos = dedosRef.current;
    if (dedos.has(e.pointerId) && dedos.size === 2) {
      const antes = centroDedos();
      dedos.set(e.pointerId, [e.clientX, e.clientY]);
      const ahora = centroDedos();
      const area = areaRef.current;
      if (area) area.scrollBy(antes[0] - ahora[0], antes[1] - ahora[1]);
      return;
    }
    if (!pintandoRef.current) return;
    const eventos = e.nativeEvent.getCoalescedEvents?.() ?? [];
    pintarTrazo(eventos.length ? eventos.map((ev) => [ev.clientX, ev.clientY]) : [[e.clientX, e.clientY]]);
  }, [pintarTrazo]);

  const alSoltar = useCallback((e) => {
    dedosRef.current.delete(e.pointerId);
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

  const fuente = Math.max(8, Math.round(tamCelda * FUENTE_CELDA));
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
    </div>
  );
}

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { cargarImagenConAspecto } from '../utils/cargarImagen';

// Tienen que coincidir con App.css: GAP_IMAGENES es el gap de .dif-par,
// ALTO_PUNTOS el alto de .dif-puntos y GAP_VERTICAL el gap de .dif-juego.
// IMAGEN_MAX_W evita imagenes gigantes en un monitor enorme.
const GAP_IMAGENES = 16;
const ALTO_PUNTOS = 44;
const GAP_VERTICAL = 12;
const IMAGEN_MAX_W = 900;

// Tiempo que se ve el ✕ rojo de un click errado, y espera antes de dar el
// juego por completado (para alcanzar a ver el ultimo circulo verde).
const FALLO_MS = 700;
const COMPLETADO_MS = 800;

// Encuentra las diferencias: dos imagenes lado a lado; se hace click en la
// SEGUNDA (la que tiene las diferencias) y, si el click cae dentro del radio
// de una diferencia anotada en src/data/diferencias.js, aparece un circulo
// verde de acierto SOLO en esa imagen (la primera se queda limpia, es la
// referencia). Un click errado muestra un ✕ rojo un instante, sin
// penalizar. Al encontrar todas llama a
// onCompletado. El padre lo vuelve a montar (key) para reiniciar el juego.
export default function DiferenciasJuego({ par, radio, onCompletado }) {
  const [imagenes, setImagenes] = useState(null);
  const [encontradas, setEncontradas] = useState(() => par.diferencias.map(() => false));
  const [fallo, setFallo] = useState(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const areaRef = useRef(null);
  const falloTimeoutRef = useRef(null);

  useEffect(() => {
    let vivo = true;
    Promise.all([
      cargarImagenConAspecto(par.cargarOriginal),
      cargarImagenConAspecto(par.cargarModificada),
    ]).then(([a, b]) => {
      if (vivo) setImagenes({ a, b });
    });
    return () => {
      vivo = false;
    };
  }, [par]);

  // Mide el espacio disponible y calcula el ancho de cada imagen: la mas
  // grande que entra con las dos lado a lado y la fila de progreso arriba,
  // respetando la proporcion real (manda la de la segunda imagen).
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el || !imagenes) return;
    const aspecto = imagenes.b.aspecto;
    const recalcular = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const wPorAncho = (width - GAP_IMAGENES) / 2;
      const hLibre = height - ALTO_PUNTOS - GAP_VERTICAL;
      const w = Math.max(0, Math.floor(Math.min(wPorAncho, hLibre * aspecto, IMAGEN_MAX_W)));
      setTam({ w, h: Math.floor(w / aspecto) });
    };
    recalcular();
    const ro = new ResizeObserver(recalcular);
    ro.observe(el);
    return () => ro.disconnect();
  }, [imagenes]);

  const total = par.diferencias.length;
  const cantidad = encontradas.filter(Boolean).length;

  useEffect(() => {
    if (total === 0 || cantidad !== total) return;
    const t = setTimeout(onCompletado, COMPLETADO_MS);
    return () => clearTimeout(t);
  }, [cantidad, total, onCompletado]);

  useEffect(() => () => clearTimeout(falloTimeoutRef.current), []);

  // Click en la segunda imagen: convierte el punto a % de la imagen y busca
  // la diferencia MAS CERCANA que lo tenga dentro de su radio. La distancia
  // se mide en pixeles reales (no en % por separado) para que el margen sea
  // un circulo y no una elipse cuando la imagen no es cuadrada.
  const alClickear = (e) => {
    if (cantidad === total) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    let mejor = -1;
    let mejorDist = Infinity;
    par.diferencias.forEach((d, i) => {
      const dx = ((x - d.x) * rect.width) / 100;
      const dy = ((y - d.y) * rect.height) / 100;
      const dist = Math.hypot(dx, dy);
      const radioPx = ((d.r ?? radio) * rect.width) / 100;
      if (dist <= radioPx && dist < mejorDist) {
        mejor = i;
        mejorDist = dist;
      }
    });

    if (mejor === -1) {
      clearTimeout(falloTimeoutRef.current);
      setFallo({ x, y, id: Date.now() });
      falloTimeoutRef.current = setTimeout(() => setFallo(null), FALLO_MS);
      return;
    }
    // Ya encontrada: no cuenta como error ni como acierto nuevo.
    if (encontradas[mejor]) return;
    setEncontradas((prev) => prev.map((v, i) => (i === mejor ? true : v)));
  };

  // Circulos verdes de las diferencias ya encontradas (solo se dibujan en la
  // segunda imagen). Ancho en % del ancho de la imagen + aspect-ratio 1 = un
  // circulo perfecto sin importar la proporcion de la imagen.
  const aciertos = par.diferencias.map((d, i) => (
    encontradas[i] ? (
      <span
        key={i}
        className="dif-acierto"
        style={{ left: `${d.x}%`, top: `${d.y}%`, width: `${(d.r ?? radio) * 2}%` }}
      >
        <CheckOutlined />
      </span>
    ) : null
  ));

  return (
    <div className="dif-juego" ref={areaRef}>
      <div className="dif-puntos" role="img" aria-label={`Diferencias encontradas: ${cantidad} de ${total}`}>
        {encontradas.map((ok, i) => (
          <span key={i} className={`dif-punto${ok ? ' encontrado' : ''}`}>
            {ok && <CheckOutlined />}
          </span>
        ))}
      </div>

      {!imagenes ? (
        <p className="memory-cargando">Preparando las imágenes...</p>
      ) : (
        <div className="dif-par" style={{ visibility: tam.w ? 'visible' : 'hidden' }}>
          <div className="dif-imagen" style={{ width: tam.w, height: tam.h }}>
            <img src={imagenes.a.src} alt="" draggable={false} />
          </div>
          <div
            className="dif-imagen dif-imagen--clic"
            style={{ width: tam.w, height: tam.h }}
            onClick={alClickear}
          >
            <img src={imagenes.b.src} alt="" draggable={false} />
            {aciertos}
            {fallo && (
              <span
                key={fallo.id}
                className="dif-fallo"
                style={{ left: `${fallo.x}%`, top: `${fallo.y}%` }}
              >
                <CloseOutlined />
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

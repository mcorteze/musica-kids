import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { cargarImagenConAspecto } from '../utils/cargarImagen';
import { centroDe, distanciaDeAcierto, esZona } from '../utils/zonasDiferencias';

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

// Encuentra las diferencias: dos imagenes lado a lado (o apiladas en
// pantalla vertical); se hace click en la
// SEGUNDA (la que tiene las diferencias) y, si el click cae dentro de la
// ZONA de una diferencia anotada en src/data/diferencias.js (o del radio, si
// esta anotada como punto; ver utils/zonasDiferencias.js), aparece un
// circulo verde de acierto en el CENTRO de esa zona, SOLO en esa imagen (la primera se queda limpia, es la
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
  // grande que entra con la fila de progreso arriba, respetando la
  // proporcion real (manda la de la segunda imagen). Prueba las dos
  // disposiciones (lado a lado o una arriba de la otra) y se queda con la
  // que da imagenes mas grandes: en pantalla vertical gana la apilada.
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el || !imagenes) return;
    const aspecto = imagenes.b.aspecto;
    const recalcular = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const hLibre = height - ALTO_PUNTOS - GAP_VERTICAL;
      const wLado = Math.min((width - GAP_IMAGENES) / 2, hLibre * aspecto, IMAGEN_MAX_W);
      const wApiladas = Math.min(width, ((hLibre - GAP_IMAGENES) / 2) * aspecto, IMAGEN_MAX_W);
      const apiladas = wApiladas > wLado;
      const w = Math.max(0, Math.floor(apiladas ? wApiladas : wLado));
      setTam({ w, h: Math.floor(w / aspecto), apiladas });
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
  // la diferencia que lo contiene (zona) o lo tiene dentro de su radio
  // (punto); si toca dos, gana la mas cercana. Las distancias van en
  // pixeles reales para que el margen no se deforme si la imagen no es
  // cuadrada.
  const alClickear = (e) => {
    if (cantidad === total) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    let mejor = -1;
    let mejorDist = Infinity;
    par.diferencias.forEach((d, i) => {
      const dist = distanciaDeAcierto(d, x, y, rect.width, rect.height, radio);
      if (dist !== null && dist < mejorDist) {
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

  // Diferencias ya encontradas (solo en la segunda imagen). Una ZONA se
  // ilumina entera (borde y relleno verdes, la misma forma marcada en el
  // Modo desarrollador) con un check chico en su centro (pedido explicito);
  // las zonas van en un SVG estirado a la imagen (viewBox 0-100 = %). Una
  // diferencia vieja anotada como PUNTO conserva el circulo con check
  // (ancho en % + aspect-ratio 1 = circulo perfecto).
  const zonasEncontradas = par.diferencias
    .map((d, i) => (encontradas[i] && esZona(d) ? (
      <polygon key={i} points={d.zona.map(([x, y]) => `${x},${y}`).join(' ')} className="dif-zona-acierto" />
    ) : null));
  const aciertos = par.diferencias.map((d, i) => {
    if (!encontradas[i]) return null;
    const c = centroDe(d);
    return esZona(d) ? (
      <span key={i} className="dif-acierto-check" style={{ left: `${c.x}%`, top: `${c.y}%` }}>
        <CheckOutlined />
      </span>
    ) : (
      <span
        key={i}
        className="dif-acierto"
        style={{ left: `${c.x}%`, top: `${c.y}%`, width: `${(d.r ?? radio) * 2}%` }}
      >
        <CheckOutlined />
      </span>
    );
  });

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
        <div className={`dif-par${tam.apiladas ? ' dif-par--apiladas' : ''}`} style={{ visibility: tam.w ? 'visible' : 'hidden' }}>
          <div className="dif-imagen" style={{ width: tam.w, height: tam.h }}>
            <img src={imagenes.a.src} alt="" draggable={false} />
          </div>
          <div
            className="dif-imagen dif-imagen--clic"
            style={{ width: tam.w, height: tam.h }}
            onClick={alClickear}
          >
            <img src={imagenes.b.src} alt="" draggable={false} />
            <svg className="dif-zonas" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {zonasEncontradas}
            </svg>
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

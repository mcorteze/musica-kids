import { useEffect, useRef, useState } from 'react';
import { GiSparkles } from 'react-icons/gi';
import { esLiviano } from '../utils/rendimiento';
import './ExplosionChispas.css';

// Destellos de festejo al completar un juego (pedido explicito: los mismos
// de Simon dice al pasar de nivel, ahora en todos los juegos). Se monta
// cuando el juego se gana y lanza tres rafagas sobre la pantalla; los
// modales de victoria aparecen despues (a los 5 s), asi no se tapan.

const COLORES = ['#FFD54F', '#FF8A65', '#F06292', '#BA68C8', '#4FC3F7', '#81C784', '#FFFFFF'];
// Destello de 4 puntas (el mismo de Simon, version Disney).
const PATH_DESTELLO = 'M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z';
// [x, y] en fraccion de la pantalla, cantidad y momento de cada rafaga.
const RAFAGAS = [
  { origen: [0.5, 0.45], cantidad: 24, ms: 0 },
  { origen: [0.24, 0.32], cantidad: 14, ms: 350 },
  { origen: [0.76, 0.36], cantidad: 14, ms: 700 },
];
const DURACION_MS = 1100;

export default function ExplosionChispas() {
  const [chispas, setChispas] = useState([]);
  const idRef = useRef(0);

  useEffect(() => {
    const lado = Math.min(window.innerWidth, window.innerHeight);
    // Modo liviano: una sola rafaga con la mitad de chispas.
    const rafagas = esLiviano() ? [{ ...RAFAGAS[0], cantidad: 12 }] : RAFAGAS;
    const timers = rafagas.map(({ origen, cantidad, ms }) => setTimeout(() => {
      const nuevas = Array.from({ length: cantidad }, (_, k) => {
        idRef.current += 1;
        const ang = (k / cantidad) * Math.PI * 2 + Math.random() * 0.5;
        const dist = lado * 0.32 * (0.6 + Math.random() * 0.5);
        return {
          id: idRef.current,
          x: origen[0] * 100,
          y: origen[1] * 100,
          dx: Math.round(Math.cos(ang) * dist),
          dy: Math.round(Math.sin(ang) * dist),
          rot: Math.round((Math.random() - 0.5) * 220),
          tam: Math.round(lado * (0.035 + Math.random() * 0.035)),
          color: COLORES[k % COLORES.length],
          destello: k % 2 === 0,
        };
      });
      const ids = new Set(nuevas.map((c) => c.id));
      setChispas((prev) => [...prev, ...nuevas]);
      setTimeout(() => setChispas((prev) => prev.filter((c) => !ids.has(c.id))), DURACION_MS);
    }, ms));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="explosion-chispas" aria-hidden="true">
      {chispas.map((c) => {
        const estilo = {
          left: `${c.x}%`,
          top: `${c.y}%`,
          width: c.tam,
          height: c.tam,
          fontSize: c.tam,
          color: c.color,
          '--dx': `${c.dx}px`,
          '--dy': `${c.dy}px`,
          '--rot': `${c.rot}deg`,
        };
        return c.destello ? (
          <svg key={c.id} className="explosion-chispa" style={estilo} viewBox="0 0 24 24">
            <path d={PATH_DESTELLO} fill="currentColor" />
          </svg>
        ) : (
          <GiSparkles key={c.id} className="explosion-chispa" style={estilo} />
        );
      })}
    </div>
  );
}

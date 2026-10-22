import { useId } from 'react';
import { FORMAS_SELLO } from '../utils/pincelesColorear';

// Herramientas ilustradas de "Colorear": se dibujan horizontales con la
// punta a la izquierda y se giran 45° (punta abajo a la izquierda, como un
// lapiz en la mano). La punta lleva el color elegido. Los mismos dibujos
// son el cursor en laptop: PUNTAS dice donde cae la punta (el "hotspot")
// dentro del cuadro de 48x48.

const TRAZO = '#3B2F45';
const LINEA = { stroke: TRAZO, strokeWidth: 1.6, strokeLinejoin: 'round' };

// x de la punta en el dibujo horizontal (y = 24), girada como el <g>.
const puntaGirada = (x) => ({ x: 24 + (x - 24) * Math.SQRT1_2, y: 24 - (x - 24) * Math.SQRT1_2 });
export const PUNTAS = {
  crayon: puntaGirada(3),
  lapiz: puntaGirada(3),
  plumon: puntaGirada(3),
  pincel: puntaGirada(2.5),
  acuarela: puntaGirada(2.5),
  destacador: puntaGirada(2.5),
  tiza: puntaGirada(3.5),
  spray: puntaGirada(2),
  neon: puntaGirada(3),
  brillos: puntaGirada(9),
  sellos: puntaGirada(4),
  goma: puntaGirada(4),
};

function estrella(cx, cy, r) {
  const puntos = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const radio = i % 2 === 0 ? r : r * 0.45;
    puntos.push(`${(cx + Math.cos(ang) * radio).toFixed(2)},${(cy + Math.sin(ang) * radio).toFixed(2)}`);
  }
  return puntos.join(' ');
}

function Dibujo({ herramienta, c }) {
  switch (herramienta) {
    case 'crayon':
      return (
        <>
          <path d="M3 24 L12 18.5 L12 29.5 Z" fill={c} {...LINEA} />
          <rect x="12" y="18" width="32" height="12" rx="2.5" fill={c} />
          <rect x="17" y="18" width="21" height="12" fill="#fff" opacity="0.55" />
          <path d="M21 18v12 M34 18v12" stroke={TRAZO} strokeOpacity="0.35" strokeWidth="1.2" />
          <rect x="12" y="18" width="32" height="12" rx="2.5" fill="none" {...LINEA} />
        </>
      );
    case 'lapiz':
      return (
        <>
          <rect x="14" y="19" width="31" height="10" rx="1.5" fill={c} />
          <path d="M14 22.3 H45 M14 25.7 H45" stroke="#000" strokeOpacity="0.18" strokeWidth="1.1" />
          <rect x="14" y="19" width="31" height="10" rx="1.5" fill="none" {...LINEA} />
          <path d="M3 24 L14 19 L14 29 Z" fill="#F3D2A2" {...LINEA} />
          <path d="M3 24 L7.6 21.9 L7.6 26.1 Z" fill={c} {...LINEA} strokeWidth="1.1" />
        </>
      );
    case 'acuarela':
      return (
        <>
          <path d="M23 20.2 L44.5 22.4 Q46.2 24 44.5 25.6 L23 27.8 Z" fill="#4F7CD8" {...LINEA} />
          <rect x="17" y="19" width="6" height="10" rx="1.2" fill="#C5CED8" {...LINEA} />
          <path d="M2.5 24 C4.5 16.5 12.5 15.5 17 18.5 L17 29.5 C12.5 32.5 4.5 31.5 2.5 24 Z" fill={c} {...LINEA} />
          <path d="M7 21 q2.5 -2 5.5 -1.5" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </>
      );
    case 'destacador':
      return (
        <>
          <path d="M2.5 21.5 L9 19.5 L9 28.5 L2.5 26.5 Z" fill={c} {...LINEA} />
          <rect x="9" y="18" width="4.5" height="12" rx="1" fill="#E7ECF2" {...LINEA} />
          <rect x="13.5" y="15" width="31" height="18" rx="4.5" fill={c} />
          <rect x="13.5" y="15" width="31" height="18" rx="4.5" fill="#fff" opacity="0.45" />
          <rect x="22" y="15" width="13" height="18" fill={c} opacity="0.85" />
          <rect x="13.5" y="15" width="31" height="18" rx="4.5" fill="none" {...LINEA} />
        </>
      );
    case 'tiza':
      return (
        <>
          <rect x="3.5" y="18" width="38" height="12" rx="5.5" fill={c} {...LINEA} />
          <circle cx="12" cy="21.5" r="1.3" fill="#fff" opacity="0.55" />
          <circle cx="20" cy="26" r="1.1" fill="#fff" opacity="0.5" />
          <circle cx="29" cy="22" r="1.4" fill="#fff" opacity="0.5" />
          <circle cx="36" cy="26.5" r="1" fill="#fff" opacity="0.45" />
        </>
      );
    case 'spray':
      return (
        <>
          <rect x="16" y="13" width="28" height="22" rx="5" fill={c} {...LINEA} />
          <rect x="16" y="20" width="28" height="8" fill="#fff" opacity="0.6" />
          <rect x="10" y="18.5" width="6" height="11" rx="1.5" fill="#C5CED8" {...LINEA} />
          <rect x="5" y="21.8" width="5" height="4.4" rx="1" fill={TRAZO} />
          <circle cx="2.6" cy="21" r="0.9" fill={c} />
          <circle cx="2" cy="24" r="1" fill={c} />
          <circle cx="2.6" cy="27" r="0.9" fill={c} />
        </>
      );
    case 'neon':
      return (
        <>
          <rect x="9" y="12" width="38" height="24" rx="12" fill={c} opacity="0.3" />
          <path d="M3 24 L9.5 21.2 L9.5 26.8 Z" fill={c} {...LINEA} />
          <rect x="9.5" y="20" width="5" height="8" rx="1" fill="#E7ECF2" {...LINEA} />
          <rect x="14.5" y="17" width="30" height="14" rx="4" fill="#2B2540" {...LINEA} />
          <rect x="18" y="22.5" width="23" height="3" rx="1.5" fill={c} />
        </>
      );
    case 'sellos':
      return (
        <>
          <circle cx="40" cy="24" r="6" fill="#E8A85C" {...LINEA} />
          <rect x="17" y="21" width="19" height="6" rx="2" fill="#D9984F" {...LINEA} />
          <rect x="9" y="14.5" width="8" height="19" rx="2" fill="#D9984F" {...LINEA} />
          <rect x="3" y="15.5" width="6" height="17" rx="1.5" fill={c} {...LINEA} />
        </>
      );
    case 'plumon':
      return (
        <>
          <path d="M3 24 L9.5 21.2 L9.5 26.8 Z" fill={c} {...LINEA} />
          <rect x="9.5" y="20" width="5" height="8" rx="1" fill="#E7ECF2" {...LINEA} />
          <rect x="14.5" y="16.5" width="30" height="15" rx="4" fill="#F7F9FC" />
          <rect x="24" y="16.5" width="13" height="15" fill={c} />
          <rect x="14.5" y="16.5" width="30" height="15" rx="4" fill="none" {...LINEA} />
        </>
      );
    case 'pincel':
      return (
        <>
          <path d="M22 20.5 L44.5 22.6 Q46.2 24 44.5 25.4 L22 27.5 Z" fill="#D9984F" {...LINEA} />
          <rect x="15" y="19.5" width="7" height="9" rx="1.2" fill="#C5CED8" {...LINEA} />
          <path d="M2.5 24 C6 19.5 11 18.6 15 20 L15 28 C11 29.4 6 28.5 2.5 24 Z" fill={c} {...LINEA} />
        </>
      );
    case 'brillos':
      return (
        <>
          <rect x="15" y="22.4" width="30" height="3.2" rx="1.6" fill="#6A5ACD" {...LINEA} />
          <polygon points={estrella(9, 24, 8)} fill={c} {...LINEA} />
          <path d="M17 13 q0 3 3 3 q-3 0 -3 3 q0 -3 -3 -3 q3 0 3 -3 Z" fill="#FFE066" {...LINEA} strokeWidth="1" />
          <path d="M19 31 q0 2 2 2 q-2 0 -2 2 q0 -2 -2 -2 q2 0 2 -2 Z" fill="#FFE066" {...LINEA} strokeWidth="1" />
        </>
      );
    case 'goma':
      return (
        <>
          <rect x="4" y="16" width="40" height="16" rx="3.5" fill="#F48FB1" />
          <path d="M26 16 H40.5 A3.5 3.5 0 0 1 44 19.5 V28.5 A3.5 3.5 0 0 1 40.5 32 H26 Z" fill="#64B5F6" />
          <rect x="4" y="16" width="40" height="16" rx="3.5" fill="none" {...LINEA} />
        </>
      );
    default:
      return null;
  }
}

// color: 'rgb(...)' o 'arcoiris'.
export default function IconoHerramienta({ herramienta, color, size = 48 }) {
  const idArcoiris = useId();
  const c = color === 'arcoiris' ? `url(#${idArcoiris})` : color;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {color === 'arcoiris' && (
        <defs>
          <linearGradient id={idArcoiris} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E53935" />
            <stop offset="0.25" stopColor="#FDD835" />
            <stop offset="0.5" stopColor="#43A047" />
            <stop offset="0.75" stopColor="#1E88E5" />
            <stop offset="1" stopColor="#8E24AA" />
          </linearGradient>
        </defs>
      )}
      <g transform="rotate(-45 24 24)">
        <Dibujo herramienta={herramienta} c={c} />
      </g>
    </svg>
  );
}

// Forma de sello (mismo trazado que se estampa, ver FORMAS_SELLO) o
// 'surtido': tres formas chicas mezcladas. color: 'rgb(...)' o 'arcoiris'.
const SURTIDO = [
  { id: 'corazon', x: 2, y: 4, s: 0.5 },
  { id: 'estrella', x: 48, y: 10, s: 0.48 },
  { id: 'flor', x: 22, y: 50, s: 0.48 },
];
const FORMA = Object.fromEntries(FORMAS_SELLO.map((f) => [f.id, f]));

// Contorno abajo y relleno encima: las formas hechas de varios circulos
// (nube, huellita, flor) muestran solo el borde de afuera, sin lineas
// internas. El contorno tambien deja ver el sello blanco sobre el panel.
function Forma({ forma, c }) {
  return (
    <>
      <path d={forma.d} fill="none" stroke={TRAZO} strokeWidth="6" strokeOpacity="0.3" strokeLinejoin="round" />
      <path d={forma.d} fill={c} />
      {forma.centro && <path d={forma.centro} fill="#fff" opacity="0.6" />}
    </>
  );
}

export function IconoSello({ forma, color, size = 40 }) {
  const idArcoiris = useId();
  const c = color === 'arcoiris' ? `url(#${idArcoiris})` : color;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {color === 'arcoiris' && (
        <defs>
          <linearGradient id={idArcoiris} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E53935" />
            <stop offset="0.33" stopColor="#FDD835" />
            <stop offset="0.66" stopColor="#43A047" />
            <stop offset="1" stopColor="#1E88E5" />
          </linearGradient>
        </defs>
      )}
      {forma === 'surtido'
        ? SURTIDO.map((f) => (
          <g key={f.id} transform={`translate(${f.x} ${f.y}) scale(${f.s})`}>
            <Forma forma={FORMA[f.id]} c={c} />
          </g>
        ))
        : <Forma forma={FORMA[forma]} c={c} />}
    </svg>
  );
}

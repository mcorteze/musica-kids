import { useId } from 'react';
import { FORMA_POR_ID } from '../utils/formasSello';
import { VARIANTES_BRILLO, aHex, mezclar } from '../utils/pincelesColorear';

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
  rayas: puntaGirada(3),
  puntitos: puntaGirada(3),
  cuadros: puntaGirada(3),
  estrellitas: puntaGirada(3),
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

const PATRONES = new Set(['rayas', 'puntitos', 'cuadros', 'estrellitas']);

function Dibujo({ herramienta, c, patron }) {
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
    case 'rayas':
    case 'puntitos':
    case 'cuadros':
    case 'estrellitas':
      // Plumon gordo con la tela del patron en el cuerpo.
      return (
        <>
          <path d="M3 24 L9.5 21 L9.5 27 Z" fill={c} {...LINEA} />
          <rect x="9.5" y="19.5" width="5" height="9" rx="1" fill="#E7ECF2" {...LINEA} />
          <rect x="14.5" y="15" width="30" height="18" rx="4.5" fill={patron} />
          <rect x="14.5" y="15" width="30" height="18" rx="4.5" fill="none" {...LINEA} />
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

// Motivo del patron en el icono (en coordenadas de una tesela de 6x6).
function MotivoPatron({ tipo, c }) {
  if (tipo === 'rayas') return <path d="M-1 7 L7 -1 M-1 1 L1 -1 M5 7 L7 5" stroke={c} strokeWidth="1.8" />;
  if (tipo === 'puntitos') return <><circle cx="1.5" cy="1.5" r="1" fill={c} /><circle cx="4.5" cy="4.5" r="1" fill={c} /></>;
  if (tipo === 'cuadros') return <><rect x="0" y="0" width="3" height="6" fill={c} opacity="0.55" /><rect x="0" y="0" width="6" height="3" fill={c} opacity="0.55" /></>;
  return <path d="M3 0.6 L3.7 2.3 L5.5 2.4 L4.1 3.5 L4.6 5.3 L3 4.3 L1.4 5.3 L1.9 3.5 L0.5 2.4 L2.3 2.3 Z" fill={c} />;
}

// color: 'rgb(...)' o 'arcoiris'.
export default function IconoHerramienta({ herramienta, color, size = 48 }) {
  const idArcoiris = useId();
  const idPatron = useId();
  const c = color === 'arcoiris' ? `url(#${idArcoiris})` : color;
  const conPatron = PATRONES.has(herramienta);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <defs>
        {color === 'arcoiris' && (
          <linearGradient id={idArcoiris} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E53935" />
            <stop offset="0.25" stopColor="#FDD835" />
            <stop offset="0.5" stopColor="#43A047" />
            <stop offset="0.75" stopColor="#1E88E5" />
            <stop offset="1" stopColor="#8E24AA" />
          </linearGradient>
        )}
        {conPatron && (
          <pattern id={idPatron} width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#FFFFFF" />
            <rect width="6" height="6" fill={c} opacity="0.3" />
            <MotivoPatron tipo={herramienta} c={c} />
          </pattern>
        )}
      </defs>
      <g transform="rotate(-45 24 24)">
        <Dibujo herramienta={herramienta} c={c} patron={`url(#${idPatron})`} />
      </g>
    </svg>
  );
}

// ---------- Sellos ----------
// Figura (mismas capas que se estampan, ver formasSello.js) con aspecto de
// pegatina: silueta blanca con sombra debajo y las capas de color encima.
// 'surtido:<grupo>' muestra tres figuras chicas del grupo. rgb: [r, g, b] o
// null (arcoiris: las capas del color elegido van con un degradado).
const TRIO_SURTIDO = {
  naturaleza: ['sol', 'flor', 'hoja'],
  animales: ['mariposa', 'huella', 'pez'],
  cosas: ['corazon', 'corona', 'helado'],
};
const LUGARES_TRIO = [{ x: 0, y: 2, s: 0.52 }, { x: 48, y: 6, s: 0.5 }, { x: 22, y: 48, s: 0.52 }];

function Figura({ forma, colores }) {
  return (
    <>
      <g filter="drop-shadow(0 2px 2px rgba(40, 30, 60, 0.3))">
        {forma.capas.map((capa, i) => (
          <path key={`s${i}`} d={capa.d} fill="#fff" stroke="#fff" strokeWidth="10" strokeLinejoin="round" />
        ))}
      </g>
      {forma.capas.map((capa, i) => (
        <path key={i} d={capa.d} fill={colores[capa.c] ?? capa.c} />
      ))}
    </>
  );
}

export function IconoSello({ forma, rgb, size = 40 }) {
  const idArcoiris = useId();
  const arcoiris = `url(#${idArcoiris})`;
  const colores = rgb
    ? { base: aHex(rgb), oscuro: aHex(mezclar(rgb, [0, 0, 0], 0.35)), claro: aHex(mezclar(rgb, [255, 255, 255], 0.55)) }
    : { base: arcoiris, oscuro: arcoiris, claro: arcoiris };
  const trio = forma.startsWith('surtido') ? TRIO_SURTIDO[forma.split(':')[1]] ?? TRIO_SURTIDO.cosas : null;
  return (
    <svg width={size} height={size} viewBox="-6 -6 112 112" aria-hidden="true" focusable="false">
      {!rgb && (
        <defs>
          <linearGradient id={idArcoiris} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#E53935" />
            <stop offset="0.33" stopColor="#FDD835" />
            <stop offset="0.66" stopColor="#43A047" />
            <stop offset="1" stopColor="#1E88E5" />
          </linearGradient>
        </defs>
      )}
      {trio
        ? trio.map((id, i) => (
          <g key={id} transform={`translate(${LUGARES_TRIO[i].x} ${LUGARES_TRIO[i].y}) scale(${LUGARES_TRIO[i].s})`}>
            <Figura forma={FORMA_POR_ID[id]} colores={colores} />
          </g>
        ))
        : <Figura forma={FORMA_POR_ID[forma]} colores={colores} />}
    </svg>
  );
}

// ---------- Muestra de cada polvo de la varita ----------
// Unas particulas fijas con la forma y los colores de la variante (el color
// elegido para las que no traen paleta propia). Fondo oscuro suave para que
// se vean la nieve y la plata.
const PARTICULAS = [[14, 16, 4], [32, 10, 3], [40, 26, 4.5], [22, 32, 3.5], [8, 36, 2.5], [30, 40, 3], [44, 42, 2.5]];
const DESTELLO = (x, y, s) => `M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s} Z`;
const ESTRELLITA = (x, y, s) => `M${x} ${y - s * 1.4} L${x + s * 0.4} ${y - s * 0.4} L${x + s * 1.4} ${y - s * 0.3} L${x + s * 0.6} ${y + s * 0.3} L${x + s * 0.9} ${y + s * 1.3} L${x} ${y + s * 0.7} L${x - s * 0.9} ${y + s * 1.3} L${x - s * 0.6} ${y + s * 0.3} L${x - s * 1.4} ${y - s * 0.3} L${x - s * 0.4} ${y - s * 0.4} Z`;
const CORAZONCITO = (x, y, s) => `M${x} ${y + s} C${x - s * 2} ${y - s * 0.4} ${x - s} ${y - s * 1.6} ${x} ${y - s * 0.6} C${x + s} ${y - s * 1.6} ${x + s * 2} ${y - s * 0.4} ${x} ${y + s} Z`;

export function MuestraPolvo({ variante, rgb, size = 44 }) {
  const v = VARIANTES_BRILLO.find((x) => x.id === variante) ?? VARIANTES_BRILLO[0];
  const base = rgb ?? [229, 57, 53];
  const paleta = v.paleta ?? [base, mezclar(base, [255, 255, 255], 0.4), [255, 255, 255], mezclar(base, [0, 0, 0], 0.2)];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="colorear-muestra-polvo">
      <rect width="48" height="48" rx="12" fill="#3B2F5C" opacity="0.88" />
      {PARTICULAS.map(([x, y, s], i) => {
        const color = aHex(paleta[i % paleta.length]);
        if (v.forma === 'confeti') return <rect key={i} x={x - s} y={y - s / 2} width={s * 2} height={s} fill={color} transform={`rotate(${i * 37} ${x} ${y})`} />;
        if (v.forma === 'corazon') return <path key={i} d={CORAZONCITO(x, y, s)} fill={color} />;
        if (v.forma === 'estrella') return <path key={i} d={ESTRELLITA(x, y, s)} fill={color} />;
        if (v.forma === 'copo') return <path key={i} d={`M${x - s} ${y} H${x + s} M${x - s / 2} ${y - s * 0.87} L${x + s / 2} ${y + s * 0.87} M${x + s / 2} ${y - s * 0.87} L${x - s / 2} ${y + s * 0.87}`} stroke={color} strokeWidth="1.3" strokeLinecap="round" />;
        return i % 2 === 0 ? <path key={i} d={DESTELLO(x, y, s * 1.5)} fill={color} /> : <circle key={i} cx={x} cy={y} r={s * 0.7} fill={color} />;
      })}
    </svg>
  );
}

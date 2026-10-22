// Figuras de los sellos de "Colorear" (pedido explicito 2026-10-22: mas
// figuras, de varios colores y con aspecto de pegatina).
//
// Cada figura es una lista de CAPAS en una caja de 100x100 centrada en
// (50, 50), de atras hacia adelante: { d: trazado SVG, c: color }. El MISMO
// trazado se estampa en el canvas (Path2D, pincelesColorear.js) y dibuja los
// iconos del panel (ColorearIconos.jsx), asi lo que se elige es exactamente
// lo que se estampa. Cada capa se rellena por separado (nunca se juntan
// trazados de sentidos distintos en un mismo relleno: dejarian huecos).
//
// Colores de capa:
//   'base'   el color elegido en la paleta
//   'oscuro' el elegido oscurecido · 'claro' el elegido aclarado
//   '#rrggbb' fijo (el cono del helado, los puntos de la mariquita...)

const circulo = (cx, cy, r) => `M${cx - r} ${cy} a${r} ${r} 0 1 1 ${2 * r} 0 a${r} ${r} 0 1 1 ${-2 * r} 0 Z`;
const elipse = (cx, cy, rx, ry) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 1 ${2 * rx} 0 a${rx} ${ry} 0 1 1 ${-2 * rx} 0 Z`;
const poligono = (puntos) => `M${puntos.map(([x, y]) => `${+x.toFixed(2)} ${+y.toFixed(2)}`).join(' L')} Z`;
const rect = (x, y, w, h, r = 0) => (r
  ? `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`
  : `M${x} ${y} H${x + w} V${y + h} H${x} Z`);
const estrella = (cx, cy, R, r, puntas = 5, giro = -90) => poligono(Array.from({ length: puntas * 2 }, (_, i) => {
  const ang = ((giro + (i * 180) / puntas) * Math.PI) / 180;
  const radio = i % 2 === 0 ? R : r;
  return [cx + Math.cos(ang) * radio, cy + Math.sin(ang) * radio];
}));
// Rectangulo largo girado en torno al centro (rayos, brazos del copo).
const barra = (cx, cy, largo, grueso, grados, desde = 0) => {
  const a = (grados * Math.PI) / 180;
  const [ux, uy] = [Math.cos(a), Math.sin(a)];
  const [nx, ny] = [-uy * (grueso / 2), ux * (grueso / 2)];
  const p0 = [cx + ux * desde, cy + uy * desde];
  const p1 = [cx + ux * (desde + largo), cy + uy * (desde + largo)];
  return poligono([[p0[0] + nx, p0[1] + ny], [p1[0] + nx, p1[1] + ny], [p1[0] - nx, p1[1] - ny], [p0[0] - nx, p0[1] - ny]]);
};
// Banda de un arco (arcoiris, sonrisa): entre radio exterior e interior.
const banda = (cx, cy, R, r) => `M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy} L${cx + r} ${cy} A${r} ${r} 0 0 0 ${cx - r} ${cy} Z`;
const capas = (c, ...ds) => ds.map((d) => ({ d, c }));

const CORAZON = 'M50 88 C20 68 6 50 6 32 C6 17 18 8 30 8 C40 8 47 14 50 21 C53 14 60 8 70 8 C82 8 94 17 94 32 C94 50 80 68 50 88 Z';
const NEGRO = '#2B2B2B';
const BLANCO = '#FFFFFF';

export const GRUPOS_SELLO = [
  { id: 'naturaleza', nombre: 'Naturaleza' },
  { id: 'animales', nombre: 'Animales' },
  { id: 'cosas', nombre: 'Cosas lindas' },
];

export const FORMAS_SELLO = [
  // ---------- Naturaleza ----------
  { id: 'estrella', grupo: 'naturaleza', nombre: 'Estrella', capas: capas('base', 'M50 4 L61.5 36 L95 37 L68.5 57.5 L78 90 L50 71 L22 90 L31.5 57.5 L5 37 L38.5 36 Z') },
  { id: 'sol', grupo: 'naturaleza', nombre: 'Sol', capas: [
    ...capas('base', ...Array.from({ length: 8 }, (_, i) => barra(50, 50, 16, 9, i * 45, 30))),
    ...capas('base', circulo(50, 50, 26)),
    ...capas('claro', circulo(50, 50, 18)),
  ] },
  { id: 'arcoiris', grupo: 'naturaleza', nombre: 'Arcoíris', capas: [
    { d: banda(50, 72, 46, 39), c: '#E53935' },
    { d: banda(50, 72, 39, 32), c: '#FB8C00' },
    { d: banda(50, 72, 32, 25), c: '#FDD835' },
    { d: banda(50, 72, 25, 18), c: '#43A047' },
    { d: banda(50, 72, 18, 11), c: '#1E88E5' },
    ...capas(BLANCO, circulo(10, 74, 9), circulo(20, 70, 9), circulo(80, 70, 9), circulo(90, 74, 9)),
  ] },
  { id: 'nube', grupo: 'naturaleza', nombre: 'Nube', capas: capas('base', circulo(28, 60, 18), circulo(50, 46, 24), circulo(73, 60, 17), rect(28, 60, 45, 18)) },
  { id: 'luna', grupo: 'naturaleza', nombre: 'Luna', capas: capas('base', 'M60 6 A44 44 0 1 0 94 72 A36 36 0 1 1 60 6 Z') },
  { id: 'flor', grupo: 'naturaleza', nombre: 'Flor', capas: [
    ...capas('base', ...Array.from({ length: 5 }, (_, i) => {
      const a = ((-90 + i * 72) * Math.PI) / 180;
      return circulo(+(50 + Math.cos(a) * 24).toFixed(1), +(50 + Math.sin(a) * 24).toFixed(1), 17);
    })),
    { d: circulo(50, 50, 12), c: '#FFD54F' },
  ] },
  { id: 'tulipan', grupo: 'naturaleza', nombre: 'Tulipán', capas: [
    { d: rect(47, 48, 6, 46, 3), c: '#43A047' },
    { d: 'M50 92 C34 86 28 74 30 62 C40 66 48 76 50 92 Z', c: '#66BB6A' },
    ...capas('base', 'M24 18 L37 32 L50 12 L63 32 L76 18 L76 44 C76 64 24 64 24 44 Z'),
  ] },
  { id: 'hoja', grupo: 'naturaleza', nombre: 'Hoja', capas: [
    ...capas('base', 'M50 6 C82 22 88 58 50 94 C12 58 18 22 50 6 Z'),
    ...capas('oscuro', rect(48.5, 22, 3, 66, 1.5), barra(50, 44, 18, 3, -40), barra(50, 62, 18, 3, -140)),
  ] },
  { id: 'gota', grupo: 'naturaleza', nombre: 'Gota', capas: capas('base', 'M50 6 C50 6 82 46 82 64 C82 82 68 94 50 94 C32 94 18 82 18 64 C18 46 50 6 50 6 Z') },
  { id: 'copo', grupo: 'naturaleza', nombre: 'Copo', capas: capas('base',
    ...Array.from({ length: 6 }, (_, i) => barra(50, 50, 44, 7, i * 60)),
    ...Array.from({ length: 6 }, (_, i) => {
      const a = (i * 60 * Math.PI) / 180;
      const [x, y] = [50 + Math.cos(a) * 26, 50 + Math.sin(a) * 26];
      return barra(x, y, 12, 5, i * 60 + 45) + ' ' + barra(x, y, 12, 5, i * 60 - 45);
    }),
    circulo(50, 50, 9)) },
  { id: 'hongo', grupo: 'naturaleza', nombre: 'Hongo', capas: [
    { d: rect(36, 48, 28, 42, 9), c: '#FFF3E0' },
    ...capas('base', 'M8 54 C8 18 92 18 92 54 Z'),
    ...capas(BLANCO, circulo(30, 38, 6), circulo(56, 30, 7), circulo(72, 44, 5)),
  ] },

  // ---------- Animales ----------
  { id: 'huella', grupo: 'animales', nombre: 'Huellita', capas: capas('base', elipse(50, 66, 23, 19), circulo(23, 40, 10), circulo(39, 23, 10), circulo(61, 23, 10), circulo(77, 40, 10)) },
  { id: 'mariposa', grupo: 'animales', nombre: 'Mariposa', capas: [
    ...capas('base', circulo(29, 34, 22), circulo(71, 34, 22), circulo(33, 68, 16), circulo(67, 68, 16)),
    ...capas('claro', circulo(27, 32, 9), circulo(73, 32, 9), circulo(33, 69, 6), circulo(67, 69, 6)),
    { d: elipse(50, 52, 6, 32), c: NEGRO },
    { d: barra(50, 22, 14, 2.5, -120), c: NEGRO },
    { d: barra(50, 22, 14, 2.5, -60), c: NEGRO },
  ] },
  { id: 'mariquita', grupo: 'animales', nombre: 'Mariquita', capas: [
    { d: circulo(50, 22, 15), c: NEGRO },
    ...capas('base', circulo(50, 58, 36)),
    { d: rect(48.5, 24, 3, 70), c: NEGRO },
    ...capas(NEGRO, circulo(33, 48, 7), circulo(67, 48, 7), circulo(36, 72, 6), circulo(64, 72, 6)),
    ...capas(BLANCO, circulo(44, 18, 3.5), circulo(56, 18, 3.5)),
  ] },
  { id: 'pez', grupo: 'animales', nombre: 'Pez', capas: [
    ...capas('base', poligono([[70, 50], [96, 26], [96, 74]]), elipse(44, 50, 36, 24)),
    ...capas('oscuro', poligono([[40, 28], [58, 14], [60, 30]])),
    ...capas(BLANCO, circulo(26, 44, 7)),
    { d: circulo(25, 44, 3.5), c: NEGRO },
  ] },
  { id: 'abeja', grupo: 'animales', nombre: 'Abeja', capas: [
    ...capas('#E3F2FD', elipse(40, 28, 14, 11), elipse(60, 28, 14, 11)),
    { d: poligono([[82, 56], [96, 52], [96, 60]]), c: NEGRO },
    ...capas('base', elipse(52, 58, 34, 24)),
    ...capas(NEGRO, rect(40, 36, 7, 44, 3), rect(57, 36, 7, 44, 3), circulo(18, 56, 11)),
    ...capas(BLANCO, circulo(15, 53, 3)),
  ] },
  { id: 'conejo', grupo: 'animales', nombre: 'Conejo', capas: [
    ...capas('base', elipse(37, 26, 9, 24), elipse(63, 26, 9, 24), circulo(50, 62, 28)),
    ...capas('claro', elipse(37, 26, 4.5, 16), elipse(63, 26, 4.5, 16), circulo(50, 70, 3.5)),
    ...capas(NEGRO, circulo(40, 58, 3.5), circulo(60, 58, 3.5)),
  ] },
  { id: 'gato', grupo: 'animales', nombre: 'Gatito', capas: [
    ...capas('base', poligono([[16, 50], [22, 12], [44, 32]]), poligono([[84, 50], [78, 12], [56, 32]]), circulo(50, 58, 34)),
    ...capas('claro', poligono([[22, 40], [25, 22], [36, 34]]), poligono([[78, 40], [75, 22], [64, 34]])),
    ...capas(NEGRO, elipse(38, 54, 4, 6), elipse(62, 54, 4, 6)),
    { d: poligono([[46, 66], [54, 66], [50, 71]]), c: '#F48FB1' },
  ] },

  // ---------- Cosas lindas ----------
  { id: 'corazon', grupo: 'cosas', nombre: 'Corazón', capas: capas('base', CORAZON) },
  { id: 'circulo', grupo: 'cosas', nombre: 'Círculo', capas: capas('base', circulo(50, 50, 42)) },
  { id: 'carita', grupo: 'cosas', nombre: 'Carita feliz', capas: [
    ...capas('base', circulo(50, 50, 44)),
    ...capas(NEGRO, elipse(36, 40, 5, 7), elipse(64, 40, 5, 7), banda(50, 56, 24, 16)),
    ...capas('claro', circulo(26, 60, 6), circulo(74, 60, 6)),
  ] },
  { id: 'corona', grupo: 'cosas', nombre: 'Corona', capas: [
    ...capas('base', poligono([[10, 80], [10, 30], [30, 52], [50, 20], [70, 52], [90, 30], [90, 80]])),
    ...capas('oscuro', rect(10, 70, 80, 12)),
    ...capas(BLANCO, circulo(50, 20, 6), circulo(10, 30, 5), circulo(90, 30, 5)),
    { d: circulo(50, 76, 4), c: '#E53935' },
  ] },
  { id: 'globo', grupo: 'cosas', nombre: 'Globo', capas: [
    { d: barra(50, 80, 18, 2, 90), c: '#78909C' },
    ...capas('base', elipse(50, 40, 30, 36), poligono([[44, 80], [56, 80], [50, 74]])),
  ] },
  { id: 'regalo', grupo: 'cosas', nombre: 'Regalo', capas: [
    ...capas('base', rect(14, 42, 72, 50, 4)),
    ...capas('oscuro', rect(10, 30, 80, 15, 3)),
    ...capas('#FFD54F', rect(44, 30, 12, 62), elipse(37, 24, 13, 8), elipse(63, 24, 13, 8), circulo(50, 26, 6)),
  ] },
  { id: 'nota', grupo: 'cosas', nombre: 'Nota musical', capas: capas('base', elipse(34, 76, 17, 13), rect(45, 12, 7, 64), poligono([[45, 12], [80, 24], [80, 40], [52, 30]])) },
  { id: 'diamante', grupo: 'cosas', nombre: 'Diamante', capas: [
    ...capas('base', poligono([[20, 36], [34, 16], [66, 16], [80, 36], [50, 88]])),
    ...capas('oscuro', poligono([[20, 36], [80, 36], [50, 88]])),
    ...capas('claro', poligono([[34, 16], [50, 36], [66, 16]])),
  ] },
  { id: 'helado', grupo: 'cosas', nombre: 'Helado', capas: [
    { d: poligono([[30, 52], [70, 52], [50, 96]]), c: '#D7A15E' },
    ...capas('base', circulo(37, 44, 16), circulo(63, 44, 16), circulo(50, 30, 19)),
    { d: circulo(50, 9, 7), c: '#E53935' },
  ] },
  { id: 'cupcake', grupo: 'cosas', nombre: 'Cupcake', capas: [
    ...capas('oscuro', poligono([[22, 58], [78, 58], [69, 94], [31, 94]])),
    ...capas('base', circulo(33, 52, 15), circulo(67, 52, 15), circulo(50, 40, 20), rect(20, 52, 60, 10, 5)),
    { d: circulo(50, 17, 8), c: '#E53935' },
  ] },
  { id: 'cohete', grupo: 'cosas', nombre: 'Cohete', capas: [
    { d: poligono([[40, 74], [60, 74], [50, 97]]), c: '#FF9800' },
    ...capas('oscuro', poligono([[34, 54], [18, 80], [36, 74]]), poligono([[66, 54], [82, 80], [64, 74]])),
    ...capas('base', 'M50 4 C68 20 70 50 66 76 L34 76 C30 50 32 20 50 4 Z'),
    { d: circulo(50, 38, 10), c: BLANCO },
    { d: circulo(50, 38, 6), c: '#4FC3F7' },
  ] },
];

export const FORMA_POR_ID = Object.fromEntries(FORMAS_SELLO.map((f) => [f.id, f]));

// "surtido:<grupo>" = va eligiendo al azar entre las figuras de ese grupo.
export const formasDeSurtido = (forma) => {
  const grupo = forma.split(':')[1];
  return FORMAS_SELLO.filter((f) => !grupo || f.grupo === grupo);
};
export const esSurtido = (forma) => forma.startsWith('surtido');

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

// Patita de Paw Patrol: la MISMA del fondo de Simón dice (GiPawPrint de
// react-icons, caja 512) llevada a la caja de 100 (pedido explicito
// 2026-10-22). Contorno con el dibujo de adentro: se rellena con nonzero,
// igual que el icono.
const PATITA_PAW = 'M50.1 3l-1.49 2.04s-2.91 3.99 -5.84 8.81c-1.46 2.41 -2.93 5.02 -4.06 7.5c-1.13 2.48 -1.96 4.76 -1.96 6.91c0 7.35 6 13.34 13.34 13.34c7.35 0 13.34 -6 13.34 -13.34c0 -2.14 -0.84 -4.43 -1.96 -6.91c-1.13 -2.48 -2.59 -5.09 -4.05 -7.5c-2.92 -4.82 -5.84 -8.81 -5.84 -8.81l-1.49 -2.04zm0 6.45c0.95 1.35 2.1 2.87 4.18 6.31c1.41 2.33 2.82 4.85 3.85 7.11c1.03 2.27 1.63 4.35 1.63 5.38c0 2.76 -1.14 5.24 -2.99 7c0.34 -0.83 0.52 -1.74 0.52 -2.7c0 -3.98 -7.2 -13.85 -7.2 -13.85s-7.2 9.88 -7.2 13.85c0 0.96 0.19 1.87 0.53 2.7c-1.85 -1.76 -2.99 -4.24 -2.99 -7.01c0 -1.03 0.61 -3.11 1.64 -5.38c1.03 -2.27 2.44 -4.78 3.85 -7.11c2.09 -3.44 3.22 -4.96 4.18 -6.31zM11.15 15.33l-0.65 2.44s-1.28 4.78 -2.26 10.33c-0.49 2.77 -0.92 5.75 -1.07 8.47c-0.15 2.72 -0.11 5.14 0.67 7.14c2.65 6.85 10.41 10.28 17.26 7.62c6.85 -2.65 10.28 -10.42 7.62 -17.27c-0.77 -2 -2.38 -3.82 -4.33 -5.72c-1.95 -1.9 -4.26 -3.82 -6.5 -5.53C17.43 19.37 13.27 16.7 13.27 16.7l-2.13 -1.37zm77.71 0L86.73 16.7s-4.16 2.67 -8.62 6.11c-2.23 1.72 -4.55 3.63 -6.5 5.53c-1.95 1.9 -3.54 3.72 -4.32 5.72c-2.65 6.85 0.77 14.61 7.62 17.27c6.85 2.65 14.61 -0.77 17.27 -7.62c0.77 -2 0.82 -4.42 0.66 -7.14c-0.15 -2.72 -0.58 -5.69 -1.07 -8.47c-0.99 -5.55 -2.26 -10.33 -2.26 -10.33l-0.65 -2.44zm-2.33 6.01c0.4 1.6 0.91 3.43 1.62 7.39c0.48 2.68 0.88 5.54 1.02 8.03c0.14 2.49 -0.05 4.64 -0.42 5.6c-1 2.57 -2.96 4.47 -5.31 5.45c0.61 -0.65 1.12 -1.43 1.46 -2.32c1.44 -3.71 -1.71 -15.52 -1.71 -15.52s-10.28 6.61 -11.72 10.32c-0.34 0.89 -0.5 1.8 -0.49 2.7c-1.08 -2.3 -1.26 -5.03 -0.26 -7.61c0.37 -0.96 1.68 -2.68 3.46 -4.42c1.78 -1.74 4 -3.58 6.17 -5.25c3.19 -2.45 4.81 -3.46 6.18 -4.38zm-73.05 0.01c1.38 0.91 2.99 1.92 6.17 4.37c2.16 1.66 4.39 3.5 6.17 5.25c1.78 1.74 3.09 3.46 3.46 4.42c1 2.58 0.83 5.3 -0.26 7.61c0.01 -0.9 -0.14 -1.81 -0.49 -2.7c-1.44 -3.71 -11.72 -10.32 -11.72 -10.32s-3.15 11.81 -1.71 15.52c0.34 0.89 0.85 1.67 1.46 2.32c-2.35 -0.97 -4.32 -2.87 -5.31 -5.45c-0.37 -0.96 -0.57 -3.12 -0.42 -5.6c0.14 -2.49 0.55 -5.34 1.03 -8.03c0.7 -3.96 1.21 -5.78 1.62 -7.39zm36.28 24.09c-8.59 0 -15.61 5.61 -17.2 13.13c-4.51 1.69 -8.53 3.88 -11.36 6.75c-3.05 3.09 -4.94 6.86 -4.94 10.93c0 6.07 4.13 11.34 10.26 14.96c6.13 3.63 14.41 5.78 23.49 5.78s17.32 -2.16 23.43 -5.78c6.1 -3.63 10.2 -8.89 10.2 -14.96c0 -4.11 -1.92 -7.91 -5.02 -11.02c-2.88 -2.89 -6.97 -5.09 -11.55 -6.78c-1.65 -7.48 -8.76 -13.01 -17.31 -13.01zm0 3.68c7.3 0 13.12 4.81 14.01 10.82l0.16 1.11l1.07 0.36c4.61 1.55 8.42 3.81 11.01 6.41c2.59 2.6 3.95 5.45 3.95 8.43c0 2.94 -1.34 5.78 -3.84 8.3c0.72 -1.5 1.11 -3.08 1.11 -4.73c0 -4.97 -6.22 -12.74 -17.62 -15.7c0.03 -0.31 0.05 -0.62 0.05 -0.94c0 -5.03 -4.35 -9.12 -9.71 -9.12c-5.36 0 -9.71 4.08 -9.71 9.12c0 0.3 0.02 0.6 0.05 0.9c-11.46 2.94 -17.62 10.79 -17.62 15.74h0c0 1.62 0.38 3.19 1.09 4.67c-2.48 -2.51 -3.82 -5.33 -3.82 -8.25c0 -2.94 1.33 -5.77 3.88 -8.34C26.37 65.34 30.12 63.09 34.66 61.52l1.06 -0.37l0.16 -1.12c0.85 -6.07 6.54 -10.91 13.88 -10.91z';
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
  // id 'huella' se conserva: lo usan las historias de dibujos ya guardados.
  { id: 'huella', grupo: 'animales', nombre: 'Patita de gato', capas: capas('base', elipse(50, 66, 23, 19), circulo(23, 40, 10), circulo(39, 23, 10), circulo(61, 23, 10), circulo(77, 40, 10)) },
  { id: 'huella-paw', grupo: 'animales', nombre: 'Patita Paw Patrol', capas: capas('base', PATITA_PAW) },
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

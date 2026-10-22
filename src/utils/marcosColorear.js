// Marcos decorativos para imprimir o guardar el dibujo de "Colorear".
// conMarco(canvas, marcoId) devuelve un canvas nuevo: el dibujo con un borde
// alrededor. Los marcos de figuras usan las mismas pegatinas de los sellos
// (estampar, FORMAS_SELLO), asi todo se ve de la misma familia.
import { FORMA_POR_ID } from './formasSello';
import { estampar } from './pincelesColorear';

export const MARCOS = [
  { id: 'ninguno', nombre: 'Sin marco' },
  { id: 'arcoiris', nombre: 'Arcoíris' },
  { id: 'estrellas', nombre: 'Estrellas' },
  { id: 'corazones', nombre: 'Corazones' },
  { id: 'flores', nombre: 'Flores' },
  { id: 'lunares', nombre: 'Lunares' },
];

const ARCOIRIS = ['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#8E24AA'];
const COLORES_FIGURAS = [[229, 57, 53], [251, 140, 0], [253, 216, 53], [67, 160, 71], [30, 136, 229], [142, 36, 170], [244, 143, 177]];
const FIGURA_DE = { estrellas: 'estrella', corazones: 'corazon', flores: 'flor' };
const FONDO_DE = { estrellas: '#FFF8E1', corazones: '#FCE4EC', flores: '#F1F8E9', lunares: '#E3F2FD' };

// Centros repartidos a lo largo del borde (rectangulo a "inset" del canto).
function puntosDelBorde(ancho, alto, inset, paso) {
  const puntos = [];
  const tramo = (x0, y0, x1, y1) => {
    const largo = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(largo / paso));
    for (let i = 0; i < n; i++) puntos.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
  };
  const [a, b, c, d] = [inset, inset, ancho - inset, alto - inset];
  tramo(a, b, c, b);
  tramo(c, b, c, d);
  tramo(c, d, a, d);
  tramo(a, d, a, b);
  return puntos;
}

export function conMarco(dibujo, marcoId) {
  if (!marcoId || marcoId === 'ninguno') return dibujo;
  const m = Math.round(Math.max(dibujo.width, dibujo.height) * 0.085);
  const c = document.createElement('canvas');
  c.width = dibujo.width + m * 2;
  c.height = dibujo.height + m * 2;
  const ctx = c.getContext('2d');
  ctx.fillStyle = FONDO_DE[marcoId] ?? '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);

  if (marcoId === 'arcoiris') {
    const banda = m / ARCOIRIS.length;
    ARCOIRIS.forEach((color, i) => {
      ctx.fillStyle = color;
      const inset = i * banda;
      ctx.beginPath();
      ctx.roundRect(inset, inset, c.width - inset * 2, c.height - inset * 2, m * 0.6);
      ctx.fill();
    });
  } else if (marcoId === 'lunares') {
    puntosDelBorde(c.width, c.height, m / 2, m * 0.9).forEach(([x, y], i) => {
      ctx.fillStyle = ARCOIRIS[i % ARCOIRIS.length];
      ctx.beginPath();
      ctx.arc(x, y, m * 0.26, 0, Math.PI * 2);
      ctx.fill();
    });
  } else {
    const forma = FORMA_POR_ID[FIGURA_DE[marcoId]];
    puntosDelBorde(c.width, c.height, m / 2, m * 1.05).forEach(([x, y], i) => {
      estampar(ctx, forma, x, y, m * 0.78, ((i % 5) - 2) * 0.12, COLORES_FIGURAS[i % COLORES_FIGURAS.length]);
    });
  }

  // El dibujo, sobre blanco, con un borde fino.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(m, m, dibujo.width, dibujo.height);
  ctx.drawImage(dibujo, m, m);
  ctx.strokeStyle = 'rgba(11, 79, 115, 0.18)';
  ctx.lineWidth = Math.max(2, m * 0.04);
  ctx.strokeRect(m, m, dibujo.width, dibujo.height);
  return c;
}

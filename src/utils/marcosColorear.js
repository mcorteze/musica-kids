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
  // Tematicos (pedido explicito 2026-10-23): motivos propios, sin logos.
  { id: 'paw-patrol', nombre: 'Paw Patrol' },
  { id: 'gatitos', nombre: 'Gatitos' },
  { id: 'hielo', nombre: 'Reino de hielo' },
  { id: 'toy-story', nombre: 'Toy Story' },
  { id: 'mar', nombre: 'Mar tropical' },
  { id: 'princesas', nombre: 'Princesas' },
  { id: 'dinosaurios', nombre: 'Dinosaurios' },
  { id: 'espacio', nombre: 'Espacio' },
];

const ARCOIRIS = ['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#8E24AA'];
const COLORES_FIGURAS = [[229, 57, 53], [251, 140, 0], [253, 216, 53], [67, 160, 71], [30, 136, 229], [142, 36, 170], [244, 143, 177]];
const FIGURA_DE = { estrellas: 'estrella', corazones: 'corazon', flores: 'flor' };
const FONDO_DE = { estrellas: '#FFF8E1', corazones: '#FCE4EC', flores: '#F1F8E9', lunares: '#E3F2FD' };

// Marcos tematicos: fondo (un color, o dos = degradado de arriba a abajo) y
// la secuencia de [figura, color] que se repite a lo largo del borde.
// estrellasDeFondo: puntitos blancos sueltos en el borde (cielo de noche).
const TEMATICOS = {
  'paw-patrol': { fondo: '#E3F2FD', figuras: [['huella-paw', [229, 57, 53]], ['huella-paw', [30, 136, 229]], ['huella-paw', [253, 216, 53]]] },
  gatitos: { fondo: '#FCE4EC', figuras: [['huella', [240, 98, 146]], ['gato', [255, 183, 77]], ['huella', [186, 104, 200]], ['gato', [161, 136, 127]]] },
  hielo: { fondo: ['#E1F5FE', '#81D4FA'], figuras: [['copo', [255, 255, 255]], ['destello', [179, 229, 252]], ['copo', [79, 195, 247]], ['destello', [255, 255, 255]]] },
  'toy-story': { fondo: '#81D4FA', figuras: [['nube', [255, 255, 255]], ['sheriff', [255, 193, 7]], ['nube', [255, 255, 255]], ['estrella', [255, 87, 34]]] },
  mar: { fondo: ['#E0F7FA', '#80DEEA'], figuras: [['ola', [0, 172, 193]], ['hibisco', [255, 112, 67]], ['ola', [38, 198, 218]], ['hibisco', [236, 64, 122]]] },
  princesas: { fondo: '#F3E5F5', figuras: [['corona', [255, 193, 7]], ['diamante', [171, 71, 188]], ['corona', [255, 213, 79]], ['diamante', [236, 64, 122]]] },
  dinosaurios: { fondo: '#F1F8E9', figuras: [['huella-dino', [85, 139, 47]], ['hoja', [124, 179, 66]], ['huella-dino', [121, 85, 72]], ['hoja', [56, 142, 60]]] },
  espacio: { fondo: ['#1A237E', '#311B92'], estrellasDeFondo: true, figuras: [['planeta', [255, 112, 67]], ['cohete', [229, 57, 53]], ['estrella', [255, 235, 59]], ['planeta', [126, 87, 194]]] },
};

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
  const tematico = TEMATICOS[marcoId];
  const fondo = tematico?.fondo ?? FONDO_DE[marcoId] ?? '#ffffff';
  if (Array.isArray(fondo)) {
    const degradado = ctx.createLinearGradient(0, 0, 0, c.height);
    degradado.addColorStop(0, fondo[0]);
    degradado.addColorStop(1, fondo[1]);
    ctx.fillStyle = degradado;
  } else {
    ctx.fillStyle = fondo;
  }
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
  } else if (tematico) {
    if (tematico.estrellasDeFondo) {
      // Repartidas con una regla fija (no al azar): la vista previa y lo
      // impreso salen iguales.
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let i = 0; i < 160; i++) {
        const x = ((i * 0.618034) % 1) * c.width;
        const y = ((i * 0.41421356) % 1) * c.height;
        ctx.beginPath();
        ctx.arc(x, y, m * (0.03 + (i % 3) * 0.02), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    puntosDelBorde(c.width, c.height, m / 2, m * 1.05).forEach(([x, y], i) => {
      const [id, color] = tematico.figuras[i % tematico.figuras.length];
      estampar(ctx, FORMA_POR_ID[id], x, y, m * 0.78, ((i % 5) - 2) * 0.12, color);
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

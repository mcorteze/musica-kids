// Textos de "Colorear" (pedido explicito 2026-10-23): se escriben sobre la
// hoja y se pueden seleccionar, mover y volver a editar. NO son pintura:
// viven aparte, como una lista de objetos, encima de las lineas de la
// lamina (la goma no los borra). En pantalla los dibuja un SVG (ColorearJuego);
// al imprimir, descargar y en la miniatura, dibujarTextos en el canvas.
//
// Texto = { id, x, y, texto, rgb, tam, fuente }
//   x, y: centro, en px del lienzo · tam: alto de letra en px del lienzo
//   rgb: [r, g, b], o null = arcoiris (cada letra de un color)
//   fuente: id de FUENTES
// Estilo de pegatina, como los sellos: letra de color con borde blanco.

// Las 4 letras infantiles (Google Fonts, cargadas en App.css).
export const FUENTES = [
  { id: 'redonda', nombre: 'Redonda', familia: "'Fredoka', sans-serif", peso: 700 },
  { id: 'mano', nombre: 'A mano', familia: "'Patrick Hand', cursive", peso: 400 },
  { id: 'divertida', nombre: 'Divertida', familia: "'Chewy', cursive", peso: 400 },
  { id: 'simple', nombre: 'Simple', familia: "'Nunito', sans-serif", peso: 800 },
];
export const FUENTE_POR_ID = Object.fromEntries(FUENTES.map((f) => [f.id, f]));
const fuenteDe = (t) => FUENTE_POR_ID[t.fuente] ?? FUENTES[0];

// Arcoiris: cada letra con el siguiente color (los espacios no gastan color).
const ARCOIRIS = ['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#8E24AA'];
export function letrasArcoiris(texto) {
  let k = 0;
  return [...texto].map((letra) => ({ letra, color: letra.trim() ? ARCOIRIS[k++ % ARCOIRIS.length] : null }));
}

export const colorTexto = (rgb) => (rgb ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : null);
// Grosor del borde blanco (centrado en el contorno: se ve la mitad afuera).
export const bordeTexto = (tam) => tam * 0.22;

// Antes de dibujar en un canvas, las letras deben estar cargadas (si no,
// el navegador usa otra y la imagen sale distinta a la pantalla).
export async function cargarFuentes(textos = []) {
  if (!document.fonts?.load) return;
  const usadas = new Set(textos.map((t) => fuenteDe(t).id));
  await Promise.all([...usadas].map((id) => {
    const f = FUENTE_POR_ID[id];
    return document.fonts.load(`${f.peso} 40px ${f.familia}`).catch(() => null);
  }));
}

// Medida aproximada del texto en px del lienzo (con su borde blanco).
let ctxMedir = null;
export function medirTexto(t) {
  if (!ctxMedir) ctxMedir = document.createElement('canvas').getContext('2d');
  const f = fuenteDe(t);
  ctxMedir.font = `${f.peso} ${t.tam}px ${f.familia}`;
  const borde = bordeTexto(t.tam);
  return { w: ctxMedir.measureText(t.texto).width + borde, h: t.tam * 1.2 + borde };
}

// Deja el texto entero dentro de la hoja (ancho x alto, px del lienzo):
// si es mas ancho que la hoja lo achica, y corre el centro hacia adentro
// (pedido explicito: un texto cortado por el borde no se podia tomar).
export function encajarTexto(t, ancho, alto) {
  let texto = t;
  let { w, h } = medirTexto(texto);
  const maxAncho = ancho * 0.96;
  if (w > maxAncho) {
    texto = { ...texto, tam: Math.max(8, Math.floor((texto.tam * maxAncho) / w)) };
    ({ w, h } = medirTexto(texto));
  }
  const x = Math.round(Math.min(ancho - w / 2, Math.max(w / 2, texto.x)) * 10) / 10;
  const y = Math.round(Math.min(alto - h / 2, Math.max(h / 2, texto.y)) * 10) / 10;
  return x === texto.x && y === texto.y && texto === t ? t : { ...texto, x, y };
}

// Dibuja los textos en un canvas cuyo ancho es k veces el del lienzo.
export function dibujarTextos(ctx, textos = [], k = 1) {
  for (const t of textos) {
    const f = fuenteDe(t);
    const tam = t.tam * k;
    ctx.save();
    ctx.font = `${f.peso} ${tam}px ${f.familia}`;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = bordeTexto(tam);
    const x = t.x * k;
    const y = t.y * k;
    if (t.rgb) {
      ctx.textAlign = 'center';
      ctx.strokeText(t.texto, x, y);
      ctx.fillStyle = colorTexto(t.rgb);
      ctx.fillText(t.texto, x, y);
    } else {
      // Letra por letra (primero todos los bordes, despues los colores),
      // desde el borde izquierdo del texto centrado.
      ctx.textAlign = 'left';
      const letras = letrasArcoiris(t.texto);
      const anchos = letras.map(({ letra }) => ctx.measureText(letra).width);
      const inicio = x - anchos.reduce((a, b) => a + b, 0) / 2;
      for (const pasada of ['borde', 'color']) {
        let cx = inicio;
        letras.forEach(({ letra, color }, i) => {
          if (pasada === 'borde') ctx.strokeText(letra, cx, y);
          else if (color) {
            ctx.fillStyle = color;
            ctx.fillText(letra, cx, y);
          }
          cx += anchos[i];
        });
      }
    }
    ctx.restore();
  }
}

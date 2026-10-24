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

export const colorTexto = (rgb) => (rgb ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : null);
// Grosor del borde blanco (centrado en el contorno: se ve la mitad afuera).
// 0,11 del alto de letra (pedido explicito 2026-10-24: antes 0,22, muy grueso).
export const bordeTexto = (tam) => tam * 0.11;

// Caracteres "de verdad" (un emoji compuesto, como ❤️ o 👍🏽, es UNO solo).
const separador = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('es', { granularity: 'grapheme' }) : null;
const caracteres = (texto) => (separador ? [...separador.segment(texto)].map((g) => g.segment) : [...texto]);
const esEmoji = (c) => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(c);

// El texto en tramos para dibujarlo: { texto, color, emoji }. Los emojis van
// aparte, SIN borde blanco ni color encima (traen el suyo; con el borde y el
// relleno de las letras se veian mal o no se veian). Arcoiris: cada letra
// con el siguiente color (los espacios no gastan color).
const ARCOIRIS = ['#E53935', '#FB8C00', '#FDD835', '#43A047', '#1E88E5', '#8E24AA'];
export function tramosTexto(texto, rgb) {
  const tramos = [];
  let k = 0;
  for (const c of caracteres(texto)) {
    const emoji = esEmoji(c);
    let color = null;
    if (!emoji) color = rgb ? colorTexto(rgb) : c.trim() ? ARCOIRIS[k++ % ARCOIRIS.length] : null;
    const previo = tramos[tramos.length - 1];
    // Con un solo color las letras seguidas van juntas (se ven mejor unidas).
    if (rgb && previo && !emoji && !previo.emoji) previo.texto += c;
    else tramos.push({ texto: c, color, emoji });
  }
  return tramos;
}

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
    // Por tramos (primero todos los bordes, despues los colores), desde el
    // borde izquierdo del texto centrado. Los emojis, sin borde.
    ctx.textAlign = 'left';
    const tramos = tramosTexto(t.texto, t.rgb);
    const anchos = tramos.map((tr) => ctx.measureText(tr.texto).width);
    const inicio = x - anchos.reduce((a, b) => a + b, 0) / 2;
    for (const pasada of ['borde', 'color']) {
      let cx = inicio;
      tramos.forEach((tr, i) => {
        if (pasada === 'borde') {
          if (!tr.emoji) ctx.strokeText(tr.texto, cx, y);
        } else if (tr.emoji || tr.color) {
          ctx.fillStyle = tr.color ?? '#000';
          ctx.fillText(tr.texto, cx, y);
        }
        cx += anchos[i];
      });
    }
    ctx.restore();
  }
}

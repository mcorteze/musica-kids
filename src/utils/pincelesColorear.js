// Motor de trazos de "Colorear" (ColorearJuego.jsx): cada herramienta pinta
// un tramo de a -> b. Todo en px INTERNOS del lienzo (el componente ya
// convierte el tamaño elegido, que es UNO solo para todas las herramientas;
// cada una lo ajusta con su "escala").
//
// Herramientas con "capa" (crayon, lapiz, tiza, pincel, acuarela,
// destacador, neon) no pintan directo en la hoja: el trazo se arma en un
// canvas aparte y al soltar se funde (fundirCapa). Pintura PLANA (pedido
// explicito 2026-10-23): donde el trazo cae sobre el MISMO color queda la
// intensidad mayor de los dos (pasar dos veces no oscurece); sobre otro
// color se mezcla como siempre. El spray no: acumular puntitos es lo suyo.
//
// El color llega como [r, g, b], o null = arcoiris (cambia de tono a lo
// largo del trazo, con cualquier herramienta).
//
// Todo lo "al azar" de un trazo (grano, chispas, giro de los sellos...) sale
// de trazo.azar, un generador con semilla: con la misma semilla el trazo se
// dibuja identico, asi "Ver cómo lo pinté" repite el dibujo tal cual.
//
// Espejo: con trazo.espejo (= ancho del lienzo) cada tramo se pinta tambien
// reflejado en el otro lado (trazo.gemelo, con su propia semilla).
//
// Para la interfaz, el trazo junta trazo.titilan (brillos que siguen
// parpadeando encima de la hoja) y trazo.nuevosSellos (para el "pop" al
// estampar); el componente los lee despues de cada tramo.

import { FORMA_POR_ID, FORMAS_SELLO, esSurtido, formasDeSurtido } from './formasSello';
import { esLiviano } from './rendimiento';

export { FORMAS_SELLO, GRUPOS_SELLO } from './formasSello';

// grupo: a que boton de la barra pertenece ('lapiz' = panel de lapices;
// 'sello', 'varita' y 'goma' tienen boton propio, pedido explicito).
export const HERRAMIENTAS = [
  { id: 'crayon', nombre: 'Crayón', escala: 1, grupo: 'lapiz', capa: { alfa: 1, modo: 'source-over' } },
  { id: 'lapiz', nombre: 'Lápiz de color', escala: 0.45, grupo: 'lapiz', capa: { alfa: 1, modo: 'source-over' } },
  { id: 'plumon', nombre: 'Plumón', escala: 0.8, grupo: 'lapiz' },
  { id: 'pincel', nombre: 'Pincel', escala: 1, grupo: 'lapiz', capa: { alfa: 1, modo: 'source-over' } },
  { id: 'acuarela', nombre: 'Acuarela', escala: 1.15, grupo: 'lapiz', capa: { alfa: 0.42, modo: 'source-over' } },
  { id: 'destacador', nombre: 'Destacador', escala: 1.2, grupo: 'lapiz', capa: { alfa: 0.5, modo: 'source-over' } },
  { id: 'tiza', nombre: 'Tiza', escala: 1, grupo: 'lapiz', capa: { alfa: 1, modo: 'source-over' } },
  { id: 'spray', nombre: 'Spray', escala: 1.5, grupo: 'lapiz' },
  // Neon: en su capa se redibuja el trazo ENTERO en cada tramo (halo y
  // centro claro); por tramos, cada halo nuevo tapaba el centro del anterior
  // y la linea salia cortada.
  { id: 'neon', nombre: 'Neón', escala: 0.7, grupo: 'lapiz', capa: { alfa: 1, modo: 'source-over' } },
  // Plumones con patron: la tela del trazo es un dibujo repetido.
  { id: 'rayas', nombre: 'Rayas', escala: 1.1, grupo: 'lapiz' },
  { id: 'puntitos', nombre: 'Puntitos', escala: 1.1, grupo: 'lapiz' },
  { id: 'cuadros', nombre: 'Cuadros', escala: 1.1, grupo: 'lapiz' },
  { id: 'estrellitas', nombre: 'Estrellitas', escala: 1.1, grupo: 'lapiz' },
  { id: 'brillos', nombre: 'Varita mágica', escala: 1.2, grupo: 'varita' },
  { id: 'sellos', nombre: 'Sellos', escala: 1.1, grupo: 'sello' },
  { id: 'goma', nombre: 'Goma', escala: 1, grupo: 'goma' },
];

// Polvos de la varita. paleta = colores propios (null = el color elegido).
export const VARIANTES_BRILLO = [
  { id: 'magia', nombre: 'Mágico', paleta: null, forma: 'mixto' },
  { id: 'hada', nombre: 'Polvo de hada', paleta: [[248, 187, 208], [225, 190, 231], [179, 229, 252], [200, 230, 201], [255, 249, 196], [255, 255, 255]], forma: 'mixto' },
  { id: 'oro', nombre: 'Oro', paleta: [[255, 213, 79], [255, 193, 7], [255, 224, 130], [230, 167, 0], [255, 248, 225]], forma: 'mixto', metal: true },
  { id: 'plata', nombre: 'Plata', paleta: [[236, 239, 241], [207, 216, 220], [176, 190, 197], [144, 164, 174], [255, 255, 255]], forma: 'mixto', metal: true },
  { id: 'confeti', nombre: 'Confeti', paleta: [[229, 57, 53], [253, 216, 53], [67, 160, 71], [30, 136, 229], [142, 36, 170], [251, 140, 0]], forma: 'confeti' },
  { id: 'corazones', nombre: 'Corazoncitos', paleta: null, forma: 'corazon' },
  { id: 'estrellas', nombre: 'Estrellitas', paleta: null, forma: 'estrella' },
  { id: 'nieve', nombre: 'Nieve', paleta: [[255, 255, 255], [227, 242, 253], [187, 222, 251]], forma: 'copo' },
];
const VARIANTE_POR_ID = Object.fromEntries(VARIANTES_BRILLO.map((v) => [v.id, v]));

const HERRAMIENTA_POR_ID = Object.fromEntries(HERRAMIENTAS.map((h) => [h.id, h]));
export const capaDe = (herramienta) => HERRAMIENTA_POR_ID[herramienta]?.capa ?? null;

export const COLORES = [
  { id: 'rojo', nombre: 'Rojo', rgb: [229, 57, 53] },
  { id: 'naranjo', nombre: 'Naranjo', rgb: [251, 140, 0] },
  { id: 'amarillo', nombre: 'Amarillo', rgb: [253, 216, 53] },
  { id: 'verde-claro', nombre: 'Verde claro', rgb: [124, 179, 66] },
  { id: 'verde', nombre: 'Verde', rgb: [46, 125, 50] },
  { id: 'celeste', nombre: 'Celeste', rgb: [79, 195, 247] },
  { id: 'azul', nombre: 'Azul', rgb: [30, 136, 229] },
  { id: 'morado', nombre: 'Morado', rgb: [142, 36, 170] },
  { id: 'rosado', nombre: 'Rosado', rgb: [244, 143, 177] },
  { id: 'fucsia', nombre: 'Fucsia', rgb: [216, 27, 96] },
  { id: 'cafe', nombre: 'Café', rgb: [121, 85, 72] },
  { id: 'piel-clara', nombre: 'Piel clara', rgb: [255, 214, 170] },
  { id: 'piel-morena', nombre: 'Piel morena', rgb: [198, 134, 66] },
  { id: 'gris', nombre: 'Gris', rgb: [158, 158, 158] },
  { id: 'negro', nombre: 'Negro', rgb: [33, 33, 33] },
  { id: 'blanco', nombre: 'Blanco', rgb: [255, 255, 255] },
  { id: 'arcoiris', nombre: 'Arcoíris', rgb: null },
];

export const css = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;
export const aHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

export function hslARgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

// Selector de "Más colores": 12 tonos x 6 luminosidades + una fila de grises.
export const ESPECTRO = [
  ...[86, 74, 62, 50, 38, 26].flatMap((l) => Array.from({ length: 12 }, (_, i) => hslARgb(i * 30, 85, l))),
  ...Array.from({ length: 12 }, (_, i) => {
    const v = Math.round(255 - (i * 255) / 11);
    return [v, v, v];
  }),
];

export const mezclar = (rgb, otro, t) => rgb.map((v, i) => Math.round(v + (otro[i] - v) * t));
const NEGRO = [0, 0, 0];
const BLANCO = [255, 255, 255];

// Generador con semilla (mulberry32): numeros de 0 a 1.
export function generadorAzar(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const trazados = new Map();
const trazado = (d) => {
  if (!trazados.has(d)) trazados.set(d, new Path2D(d));
  return trazados.get(d);
};

// ---------- Texturas de grano (crayon, lapiz, tiza) ----------
// Ruido de "celdas" x "celdas" ampliado "celda" veces con suavizado: manchas
// blandas, no pixeles. "lleno" = parte del grano que pinta. Se arma una vez
// por sesion con una semilla fija (repetir un dibujo da el mismo grano).
const GRANOS = {
  crayon: { celda: 3, celdas: 64, lleno: 0.7, alto: 215, bajo: 90, semilla: 11 },
  lapiz: { celda: 2, celdas: 96, lleno: 0.58, alto: 190, bajo: 40, semilla: 23 },
  tiza: { celda: 5, celdas: 48, lleno: 0.5, alto: 235, bajo: 30, semilla: 37 },
};
const mascaras = {};
const texturas = new Map();

function mascara(tipo) {
  if (mascaras[tipo]) return mascaras[tipo];
  const { celda, celdas, lleno, alto, bajo, semilla } = GRANOS[tipo];
  const azar = generadorAzar(semilla);
  const chico = document.createElement('canvas');
  chico.width = celdas;
  chico.height = celdas;
  const ctx = chico.getContext('2d');
  const datos = ctx.createImageData(celdas, celdas);
  for (let i = 0; i < celdas * celdas; i++) {
    datos.data[i * 4 + 3] = azar() < lleno ? alto + azar() * (255 - alto) : azar() * bajo;
  }
  ctx.putImageData(datos, 0, 0);
  const grande = document.createElement('canvas');
  grande.width = celdas * celda;
  grande.height = celdas * celda;
  const g = grande.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(chico, 0, 0, grande.width, grande.height);
  mascaras[tipo] = grande;
  return grande;
}

// Arma los granos antes del primer trazo (si no, el primer trazo de crayon,
// lapiz o tiza se trababa un momento armandolos).
export function prepararTexturas() {
  Object.keys(GRANOS).forEach(mascara);
}

// Muchos tonos (arcoiris, Mas colores): las cachés no crecen sin fin.
const guardarEnCache = (cache, clave, valor) => {
  if (cache.size > 160) cache.clear();
  cache.set(clave, valor);
  return valor;
};

function textura(tipo, rgb) {
  const clave = `${tipo}:${rgb.join(',')}`;
  if (texturas.has(clave)) return texturas.get(clave);
  const m = mascara(tipo);
  const tex = document.createElement('canvas');
  tex.width = m.width;
  tex.height = m.height;
  const ctx = tex.getContext('2d');
  ctx.fillStyle = css(rgb);
  ctx.fillRect(0, 0, tex.width, tex.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(m, 0, 0);
  return guardarEnCache(texturas, clave, tex);
}

// ---------- Patrones (rayas, puntitos, cuadros, estrellitas) ----------
// Tesela de LADO px: fondo del color aclarado y el dibujo en el color. Va
// anclada a la hoja (no al trazo), asi dos trazos que se tocan siguen el
// mismo dibujo sin cortes.
const LADO_PATRON = 40;
const teselas = new Map();

function estrellaEn(ctx, cx, cy, R) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? R : R * 0.45;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

function tesela(tipo, rgb) {
  const clave = `${tipo}:${rgb.join(',')}`;
  if (teselas.has(clave)) return teselas.get(clave);
  const L = LADO_PATRON;
  const c = document.createElement('canvas');
  c.width = L;
  c.height = L;
  const ctx = c.getContext('2d');
  ctx.fillStyle = css(mezclar(rgb, BLANCO, 0.62));
  ctx.fillRect(0, 0, L, L);
  ctx.fillStyle = css(rgb);
  ctx.strokeStyle = css(rgb);
  if (tipo === 'rayas') {
    ctx.lineWidth = L * 0.28;
    for (const x0 of [-L, 0, L]) {
      ctx.beginPath();
      ctx.moveTo(x0, L);
      ctx.lineTo(x0 + L, 0);
      ctx.stroke();
    }
  } else if (tipo === 'puntitos') {
    for (const [x, y] of [[L / 4, L / 4], [(3 * L) / 4, (3 * L) / 4]]) {
      ctx.beginPath();
      ctx.arc(x, y, L * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (tipo === 'cuadros') {
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, L / 2, L);
    ctx.fillRect(0, 0, L, L / 2);
    ctx.globalAlpha = 1;
  } else {
    estrellaEn(ctx, L / 2, L / 2, L * 0.3);
    for (const [x, y] of [[0, 0], [L, 0], [0, L], [L, L]]) {
      ctx.beginPath();
      ctx.arc(x, y, L * 0.07, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return guardarEnCache(teselas, clave, c);
}

// ---------- Trazo ----------
// ancho: tamaño elegido en px internos; cada herramienta aplica su escala.
// opciones: forma (sello), variante (varita), semilla (azar repetible) y
// espejo (ancho del lienzo para pintar tambien reflejado; 0 = sin espejo).
export function empezarTrazo(herramienta, rgb, ancho, opciones = {}) {
  const { forma = 'surtido:cosas', variante = 'magia', semilla = Math.floor(Math.random() * 2 ** 31), espejo = 0 } = opciones;
  const azar = generadorAzar(semilla);
  const trazo = {
    herramienta,
    rgb,
    forma,
    variante,
    azar,
    ancho: ancho * (HERRAMIENTA_POR_ID[herramienta]?.escala ?? 1),
    tono: azar() * 360,
    resto: 0,
    // Ya no se usa (el grano va fijo a la hoja, ver lineaConGrano); se
    // siguen pidiendo los dos numeros para que el azar de los trazos ya
    // guardados siga igual al repetirlos.
    desfase: [azar() * 300, azar() * 300],
    titilan: [],
    nuevosSellos: [],
  };
  if (espejo) {
    trazo.espejo = espejo;
    trazo.gemelo = empezarTrazo(herramienta, rgb, ancho, { forma, variante, semilla: (semilla + 7919) >>> 0 });
    trazo.gemelo.tono = trazo.tono;
  }
  return trazo;
}

function colorActual(trazo) {
  if (trazo.rgb) return trazo.rgb;
  // Tono redondeado: las texturas se reusan en vez de crear una por tramo.
  return hslARgb((Math.round(trazo.tono / 8) * 8) % 360, 88, 55);
}

function linea(ctx, a, b, ancho, estilo) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = ancho;
  ctx.strokeStyle = estilo;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  // Un tramo de largo 0 no dibuja nada: el punto inicial necesita algo de largo.
  ctx.lineTo(b.x === a.x && b.y === a.y ? b.x + 0.01 : b.x, b.y);
  ctx.stroke();
}

// El grano va FIJO a la hoja, como la textura del papel (pedido explicito
// 2026-10-23: pintura plana): repasar cae en los mismos puntitos y, con el
// fundido de la capa, no oscurece. Antes se corria al azar en cada trazo y
// repasar iba tapando los huecos.
function lineaConGrano(ctx, trazo, tipo, a, b, ancho, rgb) {
  const patron = ctx.createPattern(textura(tipo, rgb), 'repeat');
  linea(ctx, a, b, ancho, patron);
}

// Recorre el tramo dejando una "marca" cada "paso" px (brillos, spray,
// sellos). trazo.resto guarda lo avanzado desde la ultima marca.
function cadaPaso(trazo, a, b, paso, marcar) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  // Tramo de largo 0: solo el toque inicial deja marca. En una pantalla
  // tactil el dedo quieto sigue mandando "movimientos" sin moverse (cambios
  // de presion): antes cada uno estampaba otra figura encima, girada al
  // azar, y una patita salia difusa (lo mismo acumulaba de mas la varita).
  if (d === 0) {
    if (!trazo.marcoInicial) {
      trazo.marcoInicial = true;
      marcar(a);
    }
    return;
  }
  trazo.marcoInicial = true;
  for (let t = paso - trazo.resto; t <= d; t += paso) {
    marcar({ x: a.x + (b.x - a.x) * (t / d), y: a.y + (b.y - a.y) * (t / d) });
  }
  trazo.resto = (trazo.resto + d) % paso;
}

function destello(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y);
  ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y);
  ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill();
}

const CORAZON = new Path2D('M50 88 C20 68 6 50 6 32 C6 17 18 8 30 8 C40 8 47 14 50 21 C53 14 60 8 70 8 C82 8 94 17 94 32 C94 50 80 68 50 88 Z');

function copo(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  // Borde celeste suave debajo: el copo blanco se ve tambien sobre el blanco.
  for (const [ancho, estilo] of [[s * 0.55, 'rgba(120, 160, 200, 0.55)'], [s * 0.3, color]]) {
    ctx.lineWidth = ancho;
    ctx.strokeStyle = estilo;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(-Math.cos(a) * s, -Math.sin(a) * s);
      ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Polvo de la varita: n particulas alrededor de p, segun la variante.
function chispas(ctx, trazo, p, ancho, rgb, n) {
  const { azar } = trazo;
  const variante = VARIANTE_POR_ID[trazo.variante] ?? VARIANTES_BRILLO[0];
  for (let i = 0; i < n; i++) {
    const ang = azar() * Math.PI * 2;
    const r = Math.sqrt(azar()) * ancho / 2;
    const x = p.x + Math.cos(ang) * r;
    const y = p.y + Math.sin(ang) * r;
    const s = ancho * (0.05 + azar() * 0.09);
    const elegido = azar();
    let tono;
    if (variante.paleta) {
      tono = variante.paleta[Math.floor(elegido * variante.paleta.length)];
    } else {
      tono = elegido < 0.15
        ? BLANCO
        : elegido < 0.35 ? mezclar(rgb, NEGRO, azar() * 0.25) : mezclar(rgb, BLANCO, azar() * 0.45);
    }
    ctx.fillStyle = css(tono);
    const tipo = azar();
    let titila = false;
    if (variante.forma === 'confeti') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(azar() * Math.PI);
      if (tipo < 0.7) ctx.fillRect(-s * 1.3, -s * 0.55, s * 2.6, s * 1.1);
      else {
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (variante.forma === 'corazon' && tipo < 0.75) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((azar() - 0.5) * 0.8);
      ctx.scale((s * 2.4) / 100, (s * 2.4) / 100);
      ctx.translate(-50, -50);
      ctx.fill(CORAZON);
      ctx.restore();
    } else if (variante.forma === 'estrella' && tipo < 0.75) {
      estrellaEn(ctx, x, y, s * 1.7);
      titila = true;
    } else if (variante.forma === 'copo' && tipo < 0.55) {
      copo(ctx, x, y, s * 1.6, css(tono));
    } else if (tipo < 0.4) {
      destello(ctx, x, y, s * 1.9);
      titila = true;
    } else {
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
    }
    // Oro y plata: un puntito de luz arriba a la izquierda (brillo de metal).
    if (variante.metal) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(x - s * 0.3, y - s * 0.3, s * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
    // Algunos destellos siguen titilando encima de la hoja (no todos: sobra).
    if (titila && trazo.titilan.length < 40 && azar() < 0.35) {
      trazo.titilan.push([Math.round(x), Math.round(y), Math.round(s * 2.4), aHex(variante.metal || variante.paleta ? tono : mezclar(tono, BLANCO, 0.4))]);
    }
  }
}

function rocio(ctx, trazo, p, ancho, rgb) {
  const { azar } = trazo;
  const radio = ancho / 2;
  const gotas = Math.max(8, Math.round(radio * 0.9));
  const punto = Math.max(1, ancho / 70);
  ctx.fillStyle = css(rgb);
  for (let i = 0; i < gotas; i++) {
    const ang = azar() * Math.PI * 2;
    // Radio uniforme: mas denso al centro, como un spray.
    const r = azar() * radio;
    ctx.globalAlpha = 0.55 + azar() * 0.45;
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r, punto * (0.6 + azar()), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Color de una capa de figura: 'base' / 'oscuro' / 'claro' o un hex fijo.
function colorDeCapa(c, tono) {
  if (c === 'base') return css(tono);
  if (c === 'oscuro') return css(mezclar(tono, NEGRO, 0.35));
  if (c === 'claro') return css(mezclar(tono, BLANCO, 0.55));
  return c;
}

// Estampa una figura como PEGATINA: silueta blanca con sombra suave (el
// borde), las capas de color encima y un reflejo de luz en la capa principal.
// tam = lado de la figura en px internos; giro en radianes.
export function estampar(ctx, forma, x, y, tam, giro, tono) {
  const k = tam / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(giro);
  ctx.scale(k, k);
  ctx.translate(-50, -50);
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 10;
  // Modo liviano: sin la sombra suave (la sombra difusa es lo caro).
  if (!esLiviano()) {
    ctx.shadowColor = 'rgba(40, 30, 60, 0.3)';
    ctx.shadowBlur = Math.max(2, tam * 0.06);
    ctx.shadowOffsetY = tam * 0.025;
  }
  for (const capa of forma.capas) {
    const p = trazado(capa.d);
    ctx.fill(p);
    ctx.stroke(p);
  }
  ctx.shadowColor = 'transparent';
  for (const capa of forma.capas) {
    ctx.fillStyle = colorDeCapa(capa.c, tono);
    ctx.fill(trazado(capa.d));
  }
  const principal = forma.capas.find((c) => c.c === 'base');
  if (principal) {
    ctx.save();
    ctx.clip(trazado(principal.d));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.beginPath();
    ctx.ellipse(36, 28, 17, 9, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function sello(ctx, trazo, p, rgb) {
  const { azar } = trazo;
  const surtido = esSurtido(trazo.forma);
  const opciones = surtido ? formasDeSurtido(trazo.forma) : null;
  const forma = surtido
    ? opciones[Math.floor(azar() * opciones.length)]
    : FORMA_POR_ID[trazo.forma] ?? FORMAS_SELLO[0];
  // Surtido: tamaño y giro mas variados (se ve mas natural).
  const tam = trazo.ancho * (surtido ? 0.78 + azar() * 0.44 : 0.92 + azar() * 0.16);
  const giro = (azar() - 0.5) * (surtido ? 1.2 : 0.6);
  const tono = mezclar(rgb, azar() < 0.5 ? BLANCO : NEGRO, azar() * 0.15);
  estampar(ctx, forma, p.x, p.y, tam, giro, tono);
  trazo.nuevosSellos.push({ x: p.x, y: p.y, tam });
}

function pintarUno(ctx, trazo, a, b) {
  const rgb = colorActual(trazo);
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (!trazo.rgb) trazo.tono = (trazo.tono + d * 0.35) % 360;
  const { ancho } = trazo;
  ctx.save();
  switch (trazo.herramienta) {
    case 'goma':
      ctx.globalCompositeOperation = 'destination-out';
      linea(ctx, a, b, ancho, '#000');
      break;
    case 'crayon':
    case 'lapiz':
    case 'tiza':
      lineaConGrano(ctx, trazo, trazo.herramienta, a, b, ancho, rgb);
      break;
    case 'rayas':
    case 'puntitos':
    case 'cuadros':
    case 'estrellitas':
      linea(ctx, a, b, ancho, ctx.createPattern(tesela(trazo.herramienta, rgb), 'repeat'));
      break;
    case 'pincel':
      ctx.shadowColor = css(rgb);
      ctx.shadowBlur = ancho * 0.45;
      linea(ctx, a, b, ancho * 0.72, css(rgb));
      break;
    case 'acuarela':
      // Opaco en su capa; la transparencia la pone el fundido (capaDe).
      ctx.shadowColor = css(rgb);
      ctx.shadowBlur = ancho * 0.35;
      linea(ctx, a, b, ancho * 0.8, css(rgb));
      break;
    case 'spray':
      cadaPaso(trazo, a, b, Math.max(3, ancho * 0.12), (p) => rocio(ctx, trazo, p, ancho, rgb));
      break;
    case 'brillos': {
      // Lento (tramos cortos) = polvo mas concentrado.
      const lento = d > 0 && d < ancho * 0.18;
      cadaPaso(trazo, a, b, Math.max(4, ancho * 0.3), (p) => chispas(ctx, trazo, p, ancho, rgb, lento ? 5 : 3));
      break;
    }
    case 'sellos':
      cadaPaso(trazo, a, b, Math.max(8, ancho * 1.25), (p) => sello(ctx, trazo, p, rgb));
      break;
    default:
      // plumon y destacador: liso (el destacador se transparenta al fundirse).
      linea(ctx, a, b, ancho, css(rgb));
  }
  ctx.restore();
}

// Neon, por tramos (antes redibujaba el trazo ENTERO en cada movimiento: un
// trazo largo se ponia cada vez mas lento). El tramo nuevo se pinta en dos
// capas aparte, el cuerpo de color (halo) y el centro claro, y en la capa
// visible del trazo solo se rehace el rectangulo que toco: primero el halo
// con su brillo difuso (calculado sobre el halo ya pintado alrededor, asi no
// hay manchas en las uniones) y encima el centro (el halo de un tramo nuevo
// nunca tapa el centro de los anteriores).
const capasNeon = {};
// ctx.filter (desenfoque en el canvas): Chrome/Android y Firefox si; Safari
// viejo no, y ahi el brillo usa la sombra de un color.
const FILTRO_CANVAS = typeof document !== 'undefined'
  && 'filter' in (document.createElement('canvas').getContext('2d') ?? {});
function capaNeon(nombre, ancho, alto) {
  let c = capasNeon[nombre];
  if (!c || c.width !== ancho || c.height !== alto) {
    c = document.createElement('canvas');
    c.width = ancho;
    c.height = alto;
    capasNeon[nombre] = c;
  }
  return c;
}

function pintarNeon(ctx, trazo, a, b) {
  const { width: W, height: H } = ctx.canvas;
  const halo = capaNeon('halo', W, H);
  const centro = capaNeon('centro', W, H);
  const hctx = halo.getContext('2d');
  const cctx = centro.getContext('2d');
  if (!trazo.neonIniciado) {
    trazo.neonIniciado = true;
    hctx.clearRect(0, 0, W, H);
    cctx.clearRect(0, 0, W, H);
  }
  const rgb = colorActual(trazo);
  if (!trazo.rgb) trazo.tono = (trazo.tono + Math.hypot(b.x - a.x, b.y - a.y) * 0.35) % 360;
  const { ancho } = trazo;
  const brillo = ancho * 1.1;
  const reflejar = (p) => ({ x: trazo.espejo - p.x, y: p.y });
  const tramos = trazo.espejo ? [[a, b], [reflejar(a), reflejar(b)]] : [[a, b]];
  for (const [p, q] of tramos) {
    linea(hctx, p, q, ancho, css(rgb));
    linea(cctx, p, q, ancho * 0.38, css(mezclar(rgb, BLANCO, 0.7)));
  }
  for (const [p, q] of tramos) {
    // Zona a rehacer: el tramo + su grosor + el brillo; se lee un poco mas
    // (otro brillo) para que el difuso del borde incluya a los vecinos.
    const m = ancho / 2 + brillo * 2;
    const x0 = Math.max(0, Math.floor(Math.min(p.x, q.x) - m));
    const y0 = Math.max(0, Math.floor(Math.min(p.y, q.y) - m));
    const x1 = Math.min(W, Math.ceil(Math.max(p.x, q.x) + m));
    const y1 = Math.min(H, Math.ceil(Math.max(p.y, q.y) + m));
    const e = Math.ceil(brillo * 2);
    const sx = Math.max(0, x0 - e);
    const sy = Math.max(0, y0 - e);
    const sw = Math.min(W, x1 + e) - sx;
    const sh = Math.min(H, y1 + e) - sy;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, x1 - x0, y1 - y0);
    ctx.clip();
    ctx.clearRect(x0, y0, x1 - x0, y1 - y0);
    if (FILTRO_CANVAS) {
      // El brillo es el mismo halo desenfocado: cada parte brilla con SU
      // color (con una sombra de un solo color, el neon arcoiris recoloreaba
      // en bloques el brillo de los tramos vecinos).
      ctx.filter = `blur(${brillo / 2}px)`;
      ctx.drawImage(halo, sx, sy, sw, sh, sx, sy, sw, sh);
      ctx.filter = 'none';
    } else {
      ctx.shadowColor = css(rgb);
      ctx.shadowBlur = brillo;
    }
    ctx.drawImage(halo, sx, sy, sw, sh, sx, sy, sw, sh);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.drawImage(centro, sx, sy, sw, sh, sx, sy, sw, sh);
    ctx.restore();
  }
}

export function pintarTramo(ctx, trazo, a, b) {
  if (trazo.herramienta === 'neon') {
    pintarNeon(ctx, trazo, a, b);
    return;
  }
  pintarUno(ctx, trazo, a, b);
  if (trazo.gemelo) {
    const reflejar = (p) => ({ x: trazo.espejo - p.x, y: p.y });
    pintarUno(ctx, trazo.gemelo, reflejar(a), reflejar(b));
  }
}

// Lo que el trazo dejo para la interfaz desde la ultima consulta (y lo vacia).
export function recogerEfectos(trazo) {
  const fuentes = trazo.gemelo ? [trazo, trazo.gemelo] : [trazo];
  const efectos = { sellos: [], titilan: [] };
  for (const t of fuentes) {
    efectos.sellos.push(...t.nuevosSellos);
    t.nuevosSellos = [];
  }
  return efectos;
}

// Destellos que titilan de todo el trazo (con su reflejo).
export const titilanDe = (trazo) => (trazo.gemelo ? [...trazo.titilan, ...trazo.gemelo.titilan] : trazo.titilan);

// Funde el trazo de una herramienta con capa sobre la hoja (solo en la
// zona del trazo, px del lienzo) y limpia la capa. Pixel por pixel: sobre
// el mismo color (o casi) queda la intensidad mayor (pintura plana); sobre
// otro color, o en blanco, se mezcla normal (source-over).
const MISMO_COLOR = 36;
export function fundirCapa(ctx, capa, herramienta, zona = null) {
  const { alfa } = capaDe(herramienta);
  const z = zona ?? { x: 0, y: 0, w: capa.width, h: capa.height };
  const cctx = capa.getContext('2d');
  if (z.w > 0 && z.h > 0) {
    const src = cctx.getImageData(z.x, z.y, z.w, z.h).data;
    const imagen = ctx.getImageData(z.x, z.y, z.w, z.h);
    const dst = imagen.data;
    for (let i = 0; i < dst.length; i += 4) {
      const sa = (src[i + 3] / 255) * alfa;
      if (sa === 0) continue;
      const da = dst[i + 3] / 255;
      const mismo = da > 0 && Math.abs(src[i] - dst[i]) + Math.abs(src[i + 1] - dst[i + 1]) + Math.abs(src[i + 2] - dst[i + 2]) < MISMO_COLOR;
      if (mismo) {
        if (sa > da) dst[i + 3] = Math.round(sa * 255);
        continue;
      }
      const a = sa + da * (1 - sa);
      for (let k = 0; k < 3; k++) dst[i + k] = Math.round((src[i + k] * sa + dst[i + k] * da * (1 - sa)) / a);
      dst[i + 3] = Math.round(a * 255);
    }
    ctx.putImageData(imagen, z.x, z.y);
  }
  cctx.clearRect(0, 0, capa.width, capa.height);
}

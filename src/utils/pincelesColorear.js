// Motor de trazos de "Colorear" (ColorearJuego.jsx): cada herramienta pinta
// un tramo de a -> b. Todo en px INTERNOS del lienzo (el componente ya
// convierte el tamaño elegido, que es UNO solo para todas las herramientas;
// cada una lo ajusta con su "escala").
//
// Herramientas con "capa" (acuarela, destacador) no pintan directo en la
// hoja: el trazo se arma opaco en un canvas aparte y al soltar se funde con
// esa transparencia (y modo). Asi un mismo trazo no se oscurece donde se
// pisa a si mismo, pero dos trazos distintos si se superponen, como en papel.
//
// El color llega como [r, g, b], o null = arcoiris (cambia de tono a lo
// largo del trazo, con cualquier herramienta).

// grupo: a que boton de la barra pertenece ('lapiz' = panel de lapices;
// 'sello' y 'goma' tienen boton propio, pedido explicito).
export const HERRAMIENTAS = [
  { id: 'crayon', nombre: 'Crayón', escala: 1, grupo: 'lapiz' },
  { id: 'lapiz', nombre: 'Lápiz de color', escala: 0.45, grupo: 'lapiz' },
  { id: 'plumon', nombre: 'Plumón', escala: 0.8, grupo: 'lapiz' },
  { id: 'pincel', nombre: 'Pincel', escala: 1, grupo: 'lapiz' },
  { id: 'acuarela', nombre: 'Acuarela', escala: 1.15, grupo: 'lapiz', capa: { alfa: 0.42, modo: 'source-over' } },
  { id: 'destacador', nombre: 'Destacador', escala: 1.2, grupo: 'lapiz', capa: { alfa: 0.5, modo: 'multiply' } },
  { id: 'tiza', nombre: 'Tiza', escala: 1, grupo: 'lapiz' },
  { id: 'spray', nombre: 'Spray', escala: 1.5, grupo: 'lapiz' },
  // Neon: en su capa se redibuja el trazo ENTERO en cada tramo (halo y
  // centro claro); por tramos, cada halo nuevo tapaba el centro del anterior
  // y la linea salia cortada.
  { id: 'neon', nombre: 'Neón', escala: 0.7, grupo: 'lapiz', capa: { alfa: 1, modo: 'source-over' } },
  { id: 'brillos', nombre: 'Brillos', escala: 1.2, grupo: 'lapiz' },
  { id: 'sellos', nombre: 'Sellos', escala: 1.1, grupo: 'sello' },
  { id: 'goma', nombre: 'Goma', escala: 1, grupo: 'goma' },
];

// ---------- Formas de los sellos ----------
// Cada forma es un trazado SVG en una caja de 100x100 centrada en (50, 50):
// el MISMO trazado se estampa en el canvas (Path2D) y dibuja los iconos del
// panel, asi lo que se elige es exactamente lo que se estampa. "centro" =
// circulo mas claro encima (el centro de la flor). Todos los circulos van
// en el mismo sentido: con la regla nonzero, sentidos opuestos dejarian
// huecos donde se superponen.
const circulo = (cx, cy, r) => `M${cx - r} ${cy} a${r} ${r} 0 1 1 ${2 * r} 0 a${r} ${r} 0 1 1 ${-2 * r} 0 Z`;
const elipse = (cx, cy, rx, ry) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 1 ${2 * rx} 0 a${rx} ${ry} 0 1 1 ${-2 * rx} 0 Z`;
const petalos = Array.from({ length: 5 }, (_, i) => {
  const ang = (-90 + i * 72) * (Math.PI / 180);
  return circulo(+(50 + Math.cos(ang) * 24).toFixed(1), +(50 + Math.sin(ang) * 24).toFixed(1), 17);
}).join(' ');

export const FORMAS_SELLO = [
  { id: 'corazon', nombre: 'Corazón', d: 'M50 88 C20 68 6 50 6 32 C6 17 18 8 30 8 C40 8 47 14 50 21 C53 14 60 8 70 8 C82 8 94 17 94 32 C94 50 80 68 50 88 Z' },
  { id: 'estrella', nombre: 'Estrella', d: 'M50 4 L61.5 36 L95 37 L68.5 57.5 L78 90 L50 71 L22 90 L31.5 57.5 L5 37 L38.5 36 Z' },
  { id: 'flor', nombre: 'Flor', d: petalos, centro: circulo(50, 50, 12) },
  { id: 'huella', nombre: 'Huellita', d: [elipse(50, 66, 23, 19), circulo(23, 40, 10), circulo(39, 23, 10), circulo(61, 23, 10), circulo(77, 40, 10)].join(' ') },
  { id: 'circulo', nombre: 'Círculo', d: circulo(50, 50, 42) },
  { id: 'nube', nombre: 'Nube', d: [circulo(28, 60, 18), circulo(50, 46, 24), circulo(73, 60, 17), 'M28 60 H73 V78 H28 Z'].join(' ') },
  { id: 'luna', nombre: 'Luna', d: 'M60 6 A44 44 0 1 0 94 72 A36 36 0 1 1 60 6 Z' },
];
const FORMA_POR_ID = Object.fromEntries(FORMAS_SELLO.map((f) => [f.id, f]));
const trazados = new Map();
const trazado = (d) => {
  if (!trazados.has(d)) trazados.set(d, new Path2D(d));
  return trazados.get(d);
};

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

const mezclar = (rgb, otro, t) => rgb.map((v, i) => Math.round(v + (otro[i] - v) * t));

// ---------- Texturas de grano (crayon, lapiz, tiza) ----------
// Ruido de "celdas" x "celdas" ampliado "celda" veces con suavizado: manchas
// blandas, no pixeles. "lleno" = parte del grano que pinta.
const GRANOS = {
  crayon: { celda: 3, celdas: 64, lleno: 0.7, alto: 215, bajo: 90 },
  lapiz: { celda: 2, celdas: 96, lleno: 0.58, alto: 190, bajo: 40 },
  tiza: { celda: 5, celdas: 48, lleno: 0.5, alto: 235, bajo: 30 },
};
const mascaras = {};
const texturas = new Map();

function mascara(tipo) {
  if (mascaras[tipo]) return mascaras[tipo];
  const { celda, celdas, lleno, alto, bajo } = GRANOS[tipo];
  const chico = document.createElement('canvas');
  chico.width = celdas;
  chico.height = celdas;
  const ctx = chico.getContext('2d');
  const datos = ctx.createImageData(celdas, celdas);
  for (let i = 0; i < celdas * celdas; i++) {
    datos.data[i * 4 + 3] = Math.random() < lleno ? alto + Math.random() * (255 - alto) : Math.random() * bajo;
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

function textura(tipo, rgb) {
  const clave = `${tipo}:${rgb.join(',')}`;
  let tex = texturas.get(clave);
  if (!tex) {
    const m = mascara(tipo);
    tex = document.createElement('canvas');
    tex.width = m.width;
    tex.height = m.height;
    const ctx = tex.getContext('2d');
    ctx.fillStyle = css(rgb);
    ctx.fillRect(0, 0, tex.width, tex.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(m, 0, 0);
    // Muchos tonos (arcoiris, Mas colores): no acumular texturas sin fin.
    if (texturas.size > 160) texturas.clear();
    texturas.set(clave, tex);
  }
  return tex;
}

// ---------- Trazo ----------
// ancho: tamaño elegido en px internos; cada herramienta aplica su escala.
// forma: la del sello ('surtido' = va alternando todas).
export function empezarTrazo(herramienta, rgb, ancho, forma = 'surtido') {
  return {
    herramienta,
    rgb,
    forma,
    ancho: ancho * (HERRAMIENTA_POR_ID[herramienta]?.escala ?? 1),
    tono: Math.random() * 360,
    resto: 0,
    sello: 0,
    // El grano se corre al azar en cada trazo: repasar una zona va tapando
    // los huecos, como con un crayon de verdad.
    desfase: [Math.random() * 300, Math.random() * 300],
  };
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

function lineaConGrano(ctx, trazo, tipo, a, b, ancho, rgb) {
  const patron = ctx.createPattern(textura(tipo, rgb), 'repeat');
  patron.setTransform(new DOMMatrix().translate(trazo.desfase[0], trazo.desfase[1]));
  linea(ctx, a, b, ancho, patron);
}

// Recorre el tramo dejando una "marca" cada "paso" px (brillos, spray,
// sellos). trazo.resto guarda lo avanzado desde la ultima marca.
function cadaPaso(trazo, a, b, paso, marcar) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (d === 0) {
    marcar(a);
    return;
  }
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

function chispas(ctx, p, ancho, rgb) {
  for (let i = 0; i < 3; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * ancho / 2;
    const x = p.x + Math.cos(ang) * r;
    const y = p.y + Math.sin(ang) * r;
    const s = ancho * (0.05 + Math.random() * 0.09);
    const azar = Math.random();
    const tono = azar < 0.15
      ? [255, 255, 255]
      : azar < 0.35 ? mezclar(rgb, [0, 0, 0], Math.random() * 0.25) : mezclar(rgb, [255, 255, 255], Math.random() * 0.45);
    ctx.fillStyle = css(tono);
    if (Math.random() < 0.4) {
      destello(ctx, x, y, s * 1.9);
    } else {
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function rocio(ctx, p, ancho, rgb) {
  const radio = ancho / 2;
  const gotas = Math.max(8, Math.round(radio * 0.9));
  const punto = Math.max(1, ancho / 70);
  ctx.fillStyle = css(rgb);
  for (let i = 0; i < gotas; i++) {
    const ang = Math.random() * Math.PI * 2;
    // Radio uniforme: mas denso al centro, como un spray.
    const r = Math.random() * radio;
    ctx.globalAlpha = 0.55 + Math.random() * 0.45;
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r, punto * (0.6 + Math.random()), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function sello(ctx, trazo, p, rgb) {
  const forma = trazo.forma === 'surtido'
    ? FORMAS_SELLO[trazo.sello % FORMAS_SELLO.length]
    : FORMA_POR_ID[trazo.forma] ?? FORMAS_SELLO[0];
  const tono = mezclar(rgb, Math.random() < 0.5 ? [255, 255, 255] : [0, 0, 0], Math.random() * 0.2);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate((Math.random() - 0.5) * 0.7);
  // La forma mide trazo.ancho de lado (caja de 100 escalada).
  ctx.scale(trazo.ancho / 100, trazo.ancho / 100);
  ctx.translate(-50, -50);
  ctx.fillStyle = css(tono);
  ctx.fill(trazado(forma.d));
  if (forma.centro) {
    ctx.fillStyle = css(mezclar(tono, [255, 255, 255], 0.6));
    ctx.fill(trazado(forma.centro));
  }
  ctx.restore();
  trazo.sello += 1;
}

export function pintarTramo(ctx, trazo, a, b) {
  const rgb = colorActual(trazo);
  if (!trazo.rgb) trazo.tono = (trazo.tono + Math.hypot(b.x - a.x, b.y - a.y) * 0.35) % 360;
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
    case 'neon': {
      trazo.puntos ??= [a];
      trazo.puntos.push(b);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      const recorrido = (grosor, estilo) => {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = grosor;
        ctx.strokeStyle = estilo;
        ctx.beginPath();
        trazo.puntos.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        if (trazo.puntos.length === 2 && a.x === b.x && a.y === b.y) ctx.lineTo(b.x + 0.01, b.y);
        ctx.stroke();
      };
      ctx.shadowColor = css(rgb);
      ctx.shadowBlur = ancho * 1.1;
      recorrido(ancho, css(rgb));
      ctx.shadowBlur = 0;
      recorrido(ancho * 0.38, css(mezclar(rgb, [255, 255, 255], 0.7)));
      break;
    }
    case 'spray':
      cadaPaso(trazo, a, b, Math.max(3, ancho * 0.12), (p) => rocio(ctx, p, ancho, rgb));
      break;
    case 'brillos':
      cadaPaso(trazo, a, b, Math.max(4, ancho * 0.3), (p) => chispas(ctx, p, ancho, rgb));
      break;
    case 'sellos':
      cadaPaso(trazo, a, b, Math.max(8, ancho * 1.25), (p) => sello(ctx, trazo, p, rgb));
      break;
    default:
      // plumon y destacador: liso (el destacador se transparenta al fundirse).
      linea(ctx, a, b, ancho, css(rgb));
  }
  ctx.restore();
}

// Funde el trazo de una herramienta con capa sobre la hoja y limpia la capa.
export function fundirCapa(ctx, capa, herramienta) {
  const { alfa, modo } = capaDe(herramienta);
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.globalCompositeOperation = modo;
  ctx.drawImage(capa, 0, 0);
  ctx.restore();
  capa.getContext('2d').clearRect(0, 0, capa.width, capa.height);
}

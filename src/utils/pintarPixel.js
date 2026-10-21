// Juego "Pintar pixel art" (oficial, "Pintar por números" en el menú): la cuadrícula la
// establece el usuario sobre una imagen original y manda; no hay niveles.
//
// - recrearConGrilla(img, grilla): ajusta las líneas de la cuadrícula a las
//   reales, rescata el color dominante de cada celda sobre el ORIGINAL y
//   consolida la paleta (máx. MAX_COLORES). Es
//   la vista previa del editor y hace exactamente lo mismo que
//   herramientas/pintar_desde_cuadricula.py, que crea la lámina definitiva.
// - laminaDePixelArt(img): lee una lámina YA RECREADA (1 pixel = 1 celda,
//   AVIF sin pérdida): cada color exacto es un número, sin fusionar nada.
// Ambas devuelven { columnas, filas, paleta: ['#rrggbb'], celdas: [n|null] }
// (números desde 1, de más a menos celdas), lo mismo que usa PintarJuego.

const DELTA_E = 12;
const MAX_COLORES = 15;
// Zona central de cada celda que se mira, lejos de las líneas del patrón.
const MARGEN = 0.25;
// Cuánto (fracción de cuadro) puede moverse una línea interior para calzar
// con la línea real de la imagen.
const AJUSTE = 0.25;
// Muestras por lado de la zona central y distancia RGB para "parecido".
const MUESTRAS = 8;
const PARECIDO = 40;
// Un color con menos de esta fracción de las celdas pasa al frecuente más cercano.
const RARO = 0.004;
const ALFA_MIN = 128;

function lab([r, g, b]) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
  const y = f(R * 0.2126 + G * 0.7152 + B * 0.0722);
  const z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
const aHex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

function leerPixeles(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
}

// Numera grupos (índice por celda, -1 = vacía) de más a menos celdas.
function numerar(columnas, filas, grupoDeCelda, colorDeGrupo) {
  const cuenta = new Map();
  grupoDeCelda.forEach((g) => {
    if (g >= 0) cuenta.set(g, (cuenta.get(g) ?? 0) + 1);
  });
  const orden = [...cuenta.keys()].sort((a, b) => cuenta.get(b) - cuenta.get(a));
  const numero = new Map(orden.map((g, i) => [g, i + 1]));
  return {
    columnas,
    filas,
    paleta: orden.map((g) => colorDeGrupo(g)),
    celdas: grupoDeCelda.map((g) => (g >= 0 ? numero.get(g) : null)),
  };
}

// Acerca cada línea INTERIOR de la cuadrícula (hasta AJUSTE de cuadro) a la
// línea real más marcada de la imagen: borde(i) = fuerza del borde entre los
// pixeles i-1 e i a lo largo de toda la cuadrícula, suavizada en 3 (una
// línea de 1-2 px son 2 bordes). Sin una línea clara ahí, queda la del
// usuario. Los bordes de la cuadrícula no se mueven.
function ajustarLineas(inicio, paso, n, largo, borde) {
  const perfil = new Float64Array(largo + 1);
  for (let i = 1; i < largo; i++) perfil[i] = borde(i);
  const suave = (i) => (i > 0 && i < largo ? perfil[i - 1] + perfil[i] + perfil[i + 1] : 0);
  const lineas = Array.from({ length: n + 1 }, (_, k) => inicio + k * paso);
  for (let k = 1; k < n; k++) {
    const e = lineas[k];
    const desde = Math.max(1, Math.round(e - AJUSTE * paso));
    const hasta = Math.min(largo - 1, Math.round(e + AJUSTE * paso));
    if (hasta < desde) continue;
    const valores = [];
    let mejor = desde;
    for (let i = desde; i <= hasta; i++) {
      valores.push(suave(i));
      if (suave(i) > suave(mejor)) mejor = i;
    }
    valores.sort((p, q) => p - q);
    if (suave(mejor) > 1.5 * valores[Math.floor(valores.length / 2)] && mejor > lineas[k - 1] + paso / 2) lineas[k] = mejor;
  }
  return lineas;
}

// Pixeles de muestra (MUESTRAS por lado) de la zona central entre dos líneas.
function rango(a0, a1, limite) {
  const m = MARGEN * (a1 - a0);
  const i0 = a0 + m;
  const i1 = a1 - m;
  const r = new Set();
  for (let k = 0; k < MUESTRAS; k++) r.add(Math.min(limite - 1, Math.max(0, Math.floor(i0 + ((i1 - i0) * (k + 0.5)) / MUESTRAS))));
  return [...r].sort((p, q) => p - q);
}

// Color DOMINANTE de las muestras: el pixel con más vecinos parecidos,
// promediado con ellos. Las líneas del patrón (claras u oscuras) y los
// agujeros de los beads son minoría y no ganan.
function dominante(muestras) {
  const t2 = PARECIDO * PARECIDO;
  let mejor = [];
  for (const p of muestras) {
    const vecinos = muestras.filter((q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2 <= t2);
    if (vecinos.length > mejor.length) mejor = vecinos;
  }
  return [0, 1, 2].map((j) => Math.round(mejor.reduce((t, q) => t + q[j], 0) / mejor.length));
}

export function recrearConGrilla(img, { x, y, ancho, alto, columnas, filas }) {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const datos = leerPixeles(img);
  const dif = (p, q) => Math.abs(datos[p] - datos[q]) + Math.abs(datos[p + 1] - datos[q + 1]) + Math.abs(datos[p + 2] - datos[q + 2]);

  const fy0 = Math.max(0, Math.floor(y));
  const fy1 = Math.min(H, Math.floor(y + filas * alto));
  const fx0 = Math.max(0, Math.floor(x));
  const fx1 = Math.min(W, Math.floor(x + columnas * ancho));
  const xs = ajustarLineas(x, ancho, columnas, W, (i) => {
    let t = 0;
    for (let yy = fy0; yy < fy1; yy++) t += dif((yy * W + i) * 4, (yy * W + i - 1) * 4);
    return t;
  });
  const ys = ajustarLineas(y, alto, filas, H, (i) => {
    let t = 0;
    for (let xx = fx0; xx < fx1; xx++) t += dif((i * W + xx) * 4, ((i - 1) * W + xx) * 4);
    return t;
  });

  // Celda transparente si la mayoría de sus muestras lo es.
  const celdas = [];
  for (let f = 0; f < filas; f++) {
    const ry = rango(ys[f], ys[f + 1], H);
    for (let c = 0; c < columnas; c++) {
      const rx = rango(xs[c], xs[c + 1], W);
      const muestras = [];
      let transparentes = 0;
      for (const yy of ry) {
        for (const xx of rx) {
          const p = (yy * W + xx) * 4;
          if (datos[p + 3] < ALFA_MIN) transparentes++;
          else muestras.push([datos[p], datos[p + 1], datos[p + 2]]);
        }
      }
      celdas.push(muestras.length <= transparentes ? null : dominante(muestras));
    }
  }

  const labs = celdas.map((c) => (c ? lab(c) : null));
  const frecuencia = new Map();
  celdas.forEach((c) => {
    if (!c) return;
    const k = c.map((v) => v >> 3).join(',');
    frecuencia.set(k, (frecuencia.get(k) ?? 0) + 1);
  });
  const claves = [...frecuencia.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k.split(',').map(Number));

  // Paleta: los colores frecuentes son los reales y absorben a los parecidos;
  // los raros pasan al frecuente más cercano. Si quedan más de MAX_COLORES,
  // se junta un poco más.
  const agrupar = (delta) => {
    const reps = [];
    for (const k of claves) {
      const L = lab(k.map((v) => v * 8 + 4));
      if (reps.every((r) => d2(L, r) >= delta * delta)) reps.push(L);
    }
    const masCerca = (L, ids) => ids.reduce((m, i) => (d2(L, reps[i]) < d2(L, reps[m]) ? i : m), ids[0]);
    const todos = reps.map((_, i) => i);
    const asig = labs.map((L) => (L ? masCerca(L, todos) : -1));
    const cuenta = new Map();
    asig.forEach((g) => { if (g >= 0) cuenta.set(g, (cuenta.get(g) ?? 0) + 1); });
    const minimo = Math.max(2, Math.round(celdas.length * RARO));
    const frecuentes = todos.filter((i) => (cuenta.get(i) ?? 0) >= minimo);
    return asig.map((g, i) => (g < 0 || (cuenta.get(g) ?? 0) >= minimo || !frecuentes.length ? g : masCerca(labs[i], frecuentes)));
  };
  let delta = DELTA_E;
  let asig = agrupar(delta);
  while (new Set(asig.filter((g) => g >= 0)).size > MAX_COLORES) {
    delta += 2;
    asig = agrupar(delta);
  }

  // Color final de cada grupo: el más común real de sus celdas (no un promedio
  // que invente un tono).
  const colorDe = new Map();
  asig.forEach((g, i) => {
    if (g < 0) return;
    const k = celdas[i].join(',');
    const m = colorDe.get(g) ?? new Map();
    m.set(k, (m.get(k) ?? 0) + 1);
    colorDe.set(g, m);
  });
  return numerar(columnas, filas, asig, (g) => {
    const [k] = [...colorDe.get(g).entries()].sort((a, b) => b[1] - a[1])[0];
    return aHex(k.split(',').map(Number));
  });
}

export function laminaDePixelArt(img) {
  const columnas = img.naturalWidth;
  const filas = img.naturalHeight;
  const datos = leerPixeles(img);
  const grupos = new Map();
  const grupoDeCelda = [];
  for (let i = 0; i < columnas * filas; i++) {
    const p = i * 4;
    if (datos[p + 3] < ALFA_MIN) {
      grupoDeCelda.push(-1);
      continue;
    }
    const k = aHex([datos[p], datos[p + 1], datos[p + 2]]);
    if (!grupos.has(k)) grupos.set(k, grupos.size);
    grupoDeCelda.push(grupos.get(k));
  }
  const colores = [...grupos.keys()];
  return numerar(columnas, filas, grupoDeCelda, (g) => colores[g]);
}

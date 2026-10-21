// Pintar por números: convierte una imagen en una cuadrícula de celdas
// numeradas (pixel art). Se hace en el navegador al abrir cada imagen, así
// que para sumar una imagen basta con dejar el archivo en su carpeta (ver
// skills/agregar-pintar.md); no hay coordenadas ni datos que anotar.
//
// Pasos:
// 1. La imagen se dibuja en un canvas de (columnas*MUESTRAS) x (filas*MUESTRAS):
//    cada celda queda con MUESTRAS x MUESTRAS pixeles propios.
// 2. Los pixeles se agrupan en un histograma de colores (5 bits por canal) y
//    se reducen a "maxColores" con k-means sobre ese histograma (rápido y
//    determinista: la misma imagen siempre da la misma paleta).
// 3. Cada celda toma el color que MÁS se repite entre sus pixeles (no el
//    promedio): en dibujos con contornos el promedio inventa tonos sucios en
//    los bordes; la mayoría conserva colores limpios.
// 4. Los colores se numeran de más a menos celdas (01 = el que más ocupa).
//    Una celda mayormente transparente queda vacía (sin número, no se pinta).

const MUESTRAS = 8;
const ITERACIONES = 12;
// Pixeles con alfa menor a esto cuentan como transparentes.
const ALFA_MIN = 128;

// Distancia "redmean": aproxima la percepción mejor que RGB plano y es barata.
function distancia(a, b) {
  const rm = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
}

function masCercano(color, centros) {
  let mejor = 0;
  let mejorD = Infinity;
  for (let i = 0; i < centros.length; i++) {
    const d = distancia(color, centros[i]);
    if (d < mejorD) {
      mejorD = d;
      mejor = i;
    }
  }
  return mejor;
}

// k-means ponderado sobre el histograma. Inicio determinista: el color más
// frecuente y luego, uno a uno, el más lejano (ponderado por frecuencia) a
// los centros ya elegidos.
function agrupar(cubetas, k) {
  const centros = [cubetas.reduce((a, b) => (b.n > a.n ? b : a)).c.slice()];
  while (centros.length < Math.min(k, cubetas.length)) {
    let mejor = null;
    let mejorPeso = -1;
    for (const cub of cubetas) {
      let dMin = Infinity;
      for (const c of centros) dMin = Math.min(dMin, distancia(cub.c, c));
      const peso = dMin * Math.sqrt(cub.n);
      if (peso > mejorPeso) {
        mejorPeso = peso;
        mejor = cub;
      }
    }
    if (!mejor || mejorPeso <= 0) break;
    centros.push(mejor.c.slice());
  }
  for (let it = 0; it < ITERACIONES; it++) {
    const sumas = centros.map(() => [0, 0, 0, 0]);
    for (const cub of cubetas) {
      const s = sumas[masCercano(cub.c, centros)];
      s[0] += cub.c[0] * cub.n;
      s[1] += cub.c[1] * cub.n;
      s[2] += cub.c[2] * cub.n;
      s[3] += cub.n;
    }
    sumas.forEach((s, i) => {
      if (s[3]) centros[i] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
    });
  }
  return centros;
}

function aHex(c) {
  return `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

// img: <img> ya cargado. lado: celdas del lado MÁS LARGO (el otro sale de la
// proporción). Devuelve { columnas, filas, paleta: ['#rrggbb', ...],
// celdas: [numero|null, ...] } con números desde 1 (fila por fila).
export function cuadricularImagen(img, lado, maxColores) {
  const aspecto = img.naturalWidth / img.naturalHeight || 1;
  const columnas = aspecto >= 1 ? lado : Math.max(1, Math.round(lado * aspecto));
  const filas = aspecto >= 1 ? Math.max(1, Math.round(lado / aspecto)) : lado;
  const ancho = columnas * MUESTRAS;
  const alto = filas * MUESTRAS;

  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, ancho, alto);
  const datos = ctx.getImageData(0, 0, ancho, alto).data;

  const histograma = new Map();
  for (let p = 0; p < datos.length; p += 4) {
    if (datos[p + 3] < ALFA_MIN) continue;
    const clave = ((datos[p] >> 3) << 10) | ((datos[p + 1] >> 3) << 5) | (datos[p + 2] >> 3);
    const cub = histograma.get(clave);
    if (cub) {
      cub.s[0] += datos[p];
      cub.s[1] += datos[p + 1];
      cub.s[2] += datos[p + 2];
      cub.n++;
    } else {
      histograma.set(clave, { s: [datos[p], datos[p + 1], datos[p + 2]], n: 1 });
    }
  }
  if (histograma.size === 0) return { columnas, filas, paleta: [], celdas: new Array(columnas * filas).fill(null) };

  const cubetas = [...histograma.entries()].map(([clave, cub]) => ({
    clave,
    n: cub.n,
    c: [cub.s[0] / cub.n, cub.s[1] / cub.n, cub.s[2] / cub.n],
  }));
  const centros = agrupar(cubetas, maxColores);
  const grupoDeClave = new Map(cubetas.map((cub) => [cub.clave, masCercano(cub.c, centros)]));

  // Grupo ganador de cada celda (-1 = transparente).
  const grupos = new Array(columnas * filas);
  const votos = new Array(centros.length);
  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      votos.fill(0);
      let transparentes = 0;
      for (let y = 0; y < MUESTRAS; y++) {
        for (let x = 0; x < MUESTRAS; x++) {
          const p = ((f * MUESTRAS + y) * ancho + c * MUESTRAS + x) * 4;
          if (datos[p + 3] < ALFA_MIN) {
            transparentes++;
            continue;
          }
          const clave = ((datos[p] >> 3) << 10) | ((datos[p + 1] >> 3) << 5) | (datos[p + 2] >> 3);
          votos[grupoDeClave.get(clave)]++;
        }
      }
      let ganador = -1;
      let max = transparentes;
      votos.forEach((v, g) => {
        if (v > max) {
          max = v;
          ganador = g;
        }
      });
      grupos[f * columnas + c] = ganador;
    }
  }

  // Numerar los grupos usados, de más a menos celdas.
  const cuenta = centros.map(() => 0);
  for (const g of grupos) if (g >= 0) cuenta[g]++;
  const orden = centros
    .map((_, g) => g)
    .filter((g) => cuenta[g] > 0)
    .sort((a, b) => cuenta[b] - cuenta[a]);
  const numeroDeGrupo = new Map(orden.map((g, i) => [g, i + 1]));

  return {
    columnas,
    filas,
    paleta: orden.map((g) => aHex(centros[g])),
    celdas: grupos.map((g) => (g >= 0 ? numeroDeGrupo.get(g) : null)),
  };
}

// Texto de un número como en la lámina: siempre 2 dígitos (01, 02...).
export function numeroLamina(n) {
  return String(n).padStart(2, '0');
}


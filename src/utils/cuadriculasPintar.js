// Cuadrículas ajustadas en el editor (PintarCuadriculaEditor) que todavía no
// están anotadas en src/data/pintarCuadriculas.js: se guardan en este
// navegador hasta copiarlas y pasárselas a Claude. { "<tema>/<nombre>": grilla }.
const BORRADORES_KEY = 'musica-kids-pintar-cuadriculas';

const valida = (g) => g && ['x', 'y', 'ancho', 'alto', 'columnas', 'filas'].every((k) => Number.isFinite(g[k]))
  && g.ancho > 0 && g.alto > 0 && g.columnas >= 1 && g.filas >= 1;

export function leerBorradoresCuadricula() {
  try {
    const guardado = JSON.parse(localStorage.getItem(BORRADORES_KEY));
    if (!guardado || typeof guardado !== 'object' || Array.isArray(guardado)) return {};
    return Object.fromEntries(Object.entries(guardado).filter(([, g]) => valida(g)));
  } catch {
    return {};
  }
}

export function guardarBorradoresCuadricula(borradores) {
  try {
    localStorage.setItem(BORRADORES_KEY, JSON.stringify(borradores));
  } catch {
    // Sin localStorage los borradores duran lo que dure la pagina.
  }
}

const r2 = (n) => Math.round(n * 100) / 100;

// Imágenes originales marcadas para DESCARTAR (no sirven para el juego): se
// guardan en este navegador hasta copiarlas; Claude borra el original.
// Lista de "<tema>/<nombre>".
const DESCARTES_KEY = 'musica-kids-pintar-pixel-descartes';

export function leerDescartesPixel() {
  try {
    const guardado = JSON.parse(localStorage.getItem(DESCARTES_KEY));
    return Array.isArray(guardado) ? guardado.filter((c) => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

export function guardarDescartesPixel(descartes) {
  try {
    localStorage.setItem(DESCARTES_KEY, JSON.stringify(descartes));
  } catch {
    // Sin localStorage los descartes duran lo que dure la pagina.
  }
}

// Láminas ya creadas marcadas para LIMPIAR (líneas o manchas raras que
// quedaron al recrearlas): mismo funcionamiento que los descartes.
const LIMPIEZAS_KEY = 'musica-kids-pintar-pixel-limpiezas';

export function leerLimpiezasPixel() {
  try {
    const guardado = JSON.parse(localStorage.getItem(LIMPIEZAS_KEY));
    return Array.isArray(guardado) ? guardado.filter((c) => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

export function guardarLimpiezasPixel(limpiezas) {
  try {
    localStorage.setItem(LIMPIEZAS_KEY, JSON.stringify(limpiezas));
  } catch {
    // Sin localStorage las marcas duran lo que dure la pagina.
  }
}

// Texto para pegarle a Claude: cuadrículas (van a src/data/pintarCuadriculas.js)
// originales a descartar y láminas a limpiar.
export function textoCuadriculas(borradores, descartes = [], limpiezas = []) {
  const bloques = [];
  const filas = Object.keys(borradores)
    .sort()
    .map((clave) => {
      const g = borradores[clave];
      return `  '${clave}': { x: ${r2(g.x)}, y: ${r2(g.y)}, ancho: ${r2(g.ancho)}, alto: ${r2(g.alto)}, columnas: ${g.columnas}, filas: ${g.filas} },`;
    });
  if (filas.length > 0) bloques.push(`Cuadrículas de Pintar pixel art (src/data/pintarCuadriculas.js):\n${filas.join('\n')}`);
  if (descartes.length > 0) bloques.push(`Descartar en Pintar pixel art (borrar el original y su lámina si la tiene):\n${[...descartes].sort().map((c) => `  ${c}`).join('\n')}`);
  if (limpiezas.length > 0) bloques.push(`Limpiar en Pintar pixel art (lámina con líneas o manchas raras):\n${[...limpiezas].sort().map((c) => `  ${c}`).join('\n')}`);
  return bloques.join('\n\n');
}

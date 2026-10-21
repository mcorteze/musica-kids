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

// Texto listo para pegar en src/data/pintarCuadriculas.js.
export function textoCuadriculas(borradores) {
  const filas = Object.keys(borradores)
    .sort()
    .map((clave) => {
      const g = borradores[clave];
      return `  '${clave}': { x: ${r2(g.x)}, y: ${r2(g.y)}, ancho: ${r2(g.ancho)}, alto: ${r2(g.alto)}, columnas: ${g.columnas}, filas: ${g.filas} },`;
    });
  if (filas.length === 0) return '';
  return `Cuadrículas de Pintar por números (src/data/pintarCuadriculas.js):\n${filas.join('\n')}`;
}

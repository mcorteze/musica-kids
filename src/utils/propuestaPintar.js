// Propuesta de Pintar por números (Modo desarrollador, PintarDev): por
// lámina, el número de nivel elegido o 'descartar'. { "<tema>/<id>": n | 'descartar' }.
// Se guarda en este navegador hasta que se copia y se le pasa a Claude, que
// mueve cada archivo a su carpeta nivel-<n> o lo borra (ver
// skills/agregar-pintar.md).
const PROPUESTA_KEY = 'musica-kids-pintar-propuesta';

export const DESCARTAR = 'descartar';

const valida = (v) => v === DESCARTAR || Number.isInteger(v);

export function leerPropuestaPintar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(PROPUESTA_KEY));
    if (!guardado || typeof guardado !== 'object' || Array.isArray(guardado)) return {};
    return Object.fromEntries(Object.entries(guardado).filter(([, v]) => valida(v)));
  } catch {
    return {};
  }
}

export function guardarPropuestaPintar(propuesta) {
  try {
    localStorage.setItem(PROPUESTA_KEY, JSON.stringify(propuesta));
  } catch {
    // Sin localStorage la propuesta dura lo que dure la pagina.
  }
}

// Cambios que de verdad propone, por tema: lo que no existe más o ya está
// en el nivel elegido no cuenta.
export function cambiosPropuestaPintar(temas, propuesta) {
  return temas
    .map((t) => ({
      tema: t,
      cambios: t.laminas
        .map((l) => ({ lamina: l, destino: propuesta[`${t.id}/${l.id}`] }))
        .filter((c) => c.destino !== undefined && c.destino !== c.lamina.nivel),
    }))
    .filter((g) => g.cambios.length > 0);
}

export function contarPropuestaPintar(temas, propuesta) {
  return cambiosPropuestaPintar(temas, propuesta).reduce((s, g) => s + g.cambios.length, 0);
}

// Texto para pegarle a Claude: por tema, agrupado por destino.
export function textoPropuestaPintar(temas, propuesta) {
  const bloques = cambiosPropuestaPintar(temas, propuesta).map(({ tema, cambios }) => {
    const grupos = {};
    cambios.forEach(({ lamina, destino }) => {
      const etiqueta = lamina.nivel ? `${lamina.id} (estaba en nivel ${lamina.nivel})` : lamina.id;
      (grupos[destino] ??= []).push(etiqueta);
    });
    const orden = Object.keys(grupos).sort((a, b) => (a === DESCARTAR) - (b === DESCARTAR) || a - b);
    return [
      `${tema.nombre} (${tema.id})`,
      ...orden.map((d) => `  ${d === DESCARTAR ? 'Descartar' : `Nivel ${d}`}: ${grupos[d].join(', ')}`),
    ].join('\n');
  });
  if (bloques.length === 0) return '';
  return `Propuesta de Pintar por números (src/assets/pintar/):\n${bloques.join('\n')}`;
}

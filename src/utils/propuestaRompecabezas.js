// Propuesta de asignacion de rompecabezas por cantidad de piezas (pagina
// "Todos los rompecabezas", tabs "En preparacion" y "Procesados"): { "<codigo>":
// piezas }. Se guarda en este navegador hasta que se copia y se le pasa a
// Claude, que mueve cada rompecabezas al nivel de esa cantidad de piezas
// (ver skills/agregar-rompecabezas.md). La clave conserva su nombre
// original para no perder lo ya elegido.
const PROPUESTA_KEY = 'musica-kids-rompecabezas-afinar-piezas';

export function leerPropuestaRompecabezas() {
  try {
    const guardado = JSON.parse(localStorage.getItem(PROPUESTA_KEY));
    if (!guardado || typeof guardado !== 'object' || Array.isArray(guardado)) return {};
    return Object.fromEntries(Object.entries(guardado).filter(([, p]) => Number.isInteger(p)));
  } catch {
    return {};
  }
}

export function guardarPropuestaRompecabezas(propuesta) {
  try {
    localStorage.setItem(PROPUESTA_KEY, JSON.stringify(propuesta));
  } catch {
    // Sin localStorage la propuesta dura lo que dure la pagina.
  }
}

// Cambios que de verdad propone, por tema: los en preparacion con piezas
// elegidas y los ya en juego cuyo nivel cambia. Lo que no existe mas o
// coincide con el nivel actual no cuenta.
export function cambiosPropuesta(temas, propuesta) {
  return temas.map((t) => {
    const afinar = t.porAfinar
      .filter((r) => propuesta[r.id])
      .map((r) => ({ id: r.id, piezas: propuesta[r.id] }));
    const mover = t.niveles.flatMap((n) => n.rompecabezas
      .filter((r) => propuesta[r.id] && propuesta[r.id] !== n.piezas)
      .map((r) => ({ id: r.id, piezas: propuesta[r.id], desde: n.piezas })));
    return { tema: t, afinar, mover };
  });
}

export function contarPropuesta(temas, propuesta) {
  return cambiosPropuesta(temas, propuesta).reduce((s, c) => s + c.afinar.length + c.mover.length, 0);
}

// Texto para pegarle a Claude: por tema, agrupado por piezas de destino.
export function textoPropuesta(temas, propuesta) {
  const porPiezas = (lista, etiqueta) => {
    const grupos = {};
    lista.forEach((c) => (grupos[c.piezas] ??= []).push(etiqueta(c)));
    return Object.keys(grupos)
      .map(Number)
      .sort((a, b) => a - b)
      .map((p) => `    ${p} piezas: ${grupos[p].join(', ')}`);
  };
  const bloques = cambiosPropuesta(temas, propuesta)
    .filter((c) => c.afinar.length + c.mover.length > 0)
    .map(({ tema, afinar, mover }) => {
      const filas = [`${tema.nombre} (${tema.id})`];
      if (afinar.length) filas.push('  En preparación → nivel:', ...porPiezas(afinar, (c) => c.id));
      if (mover.length) {
        filas.push('  Procesados → cambiar de nivel:', ...porPiezas(mover, (c) => `${c.id} (estaba en ${c.desde})`));
      }
      return filas.join('\n');
    });
  if (bloques.length === 0) return '';
  return `Propuesta de asignación de rompecabezas por cantidad de piezas:\n${bloques.join('\n')}`;
}

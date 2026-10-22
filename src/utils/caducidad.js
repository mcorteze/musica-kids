// Nada de lo guardado en el navegador dura mas de una semana (pedido
// explicito, 2026-10-21): niveles, completados, avance, records, chats
// leidos... todo vence a los 7 dias de haberse guardado por PRIMERA vez (no
// se renueva al seguir usandolo). Excepciones, que no vencen nunca:
// - las marcas de canciones (me gusta, corazon, estrella, unicornio);
// - el trabajo del modo desarrollador (el interruptor mismo y los borradores
//   de las herramientas: cuadriculas, marcas, propuestas).
// Lo pintado en Colorear vive en IndexedDB y vence aparte, a las 48 h
// (utils/dibujosColorear.js).
//
// Las claves no llevan fecha propia, asi que se anota cuando se vio cada una
// por primera vez (FECHAS_KEY). Solo se tocan claves "musica-kids-": el
// sitio comparte localStorage con los demas proyectos de mcorteze.github.io.
// Se revisa al abrir la app y cada vez que vuelve a primer plano (en la
// tablet puede quedar abierta dias).

const PREFIJO = 'musica-kids-';
const FECHAS_KEY = 'musica-kids-fechas';
const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000;

const PERMANENTES = new Set([
  FECHAS_KEY,
  // Marcas de canciones
  'musica-kids-liked-songs',
  'musica-kids-loved-songs',
  'musica-kids-starred-songs',
  'musica-kids-unicorn-songs',
  // Modo desarrollador y su trabajo
  'musica-kids-modo-desarrollador',
  'musica-kids-diferencias-marcas',
  'musica-kids-pintar-cuadriculas',
  'musica-kids-pintar-pixel-descartes',
  'musica-kids-pintar-pixel-limpiezas',
  'musica-kids-pintar-propuesta',
  'musica-kids-rompecabezas-afinar-piezas',
]);

export function limpiarGuardadoVencido() {
  try {
    let fechas;
    try {
      fechas = JSON.parse(localStorage.getItem(FECHAS_KEY)) ?? {};
    } catch {
      fechas = {};
    }
    const ahora = Date.now();
    const vigentes = {};
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const clave = localStorage.key(i);
      if (!clave?.startsWith(PREFIJO) || PERMANENTES.has(clave)) continue;
      const desde = Number(fechas[clave]) || ahora;
      if (ahora - desde > VIGENCIA_MS) localStorage.removeItem(clave);
      else vigentes[clave] = desde;
    }
    localStorage.setItem(FECHAS_KEY, JSON.stringify(vigentes));
  } catch {
    // Sin localStorage: no hay nada que limpiar.
  }
}

export function iniciarCaducidad() {
  limpiarGuardadoVencido();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') limpiarGuardadoVencido();
  });
}

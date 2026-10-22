// Lo guardado en el navegador vence a la semana SIN USO (pedido explicito;
// hasta el 2026-10-22 vencia a la semana de guardarse por primera vez,
// aunque se usara a diario): niveles, completados, avance, records, chats
// leidos... cada clave vence a los 7 dias desde la ultima vez que la app la
// LEYO o la ESCRIBIO. Leer cuenta: un nivel que el niño juega sin subir solo
// se lee, y no por eso debe borrarse. Excepciones, que no vencen nunca:
// - las marcas de canciones (me gusta, corazon, estrella, unicornio);
// - el trabajo del modo desarrollador (el interruptor mismo y los borradores
//   de las herramientas: cuadriculas, marcas, propuestas).
// Lo pintado en Colorear vive en IndexedDB y vence aparte, a las 48 h de
// empezado (utils/dibujosColorear.js).
//
// Las claves no llevan fecha propia: FECHAS_KEY guarda { clave: ultimo uso }.
// El uso se anota interceptando getItem/setItem/removeItem de localStorage
// (un solo lugar, sin tocar cada juego) y se guarda en lotes, no en cada
// lectura. Solo se tocan claves "musica-kids-": el sitio comparte
// localStorage con los demas proyectos de mcorteze.github.io. Lo vencido se
// borra al abrir la app y cada vez que vuelve a primer plano (en la tablet
// puede quedar abierta dias).

const PREFIJO = 'musica-kids-';
const FECHAS_KEY = 'musica-kids-fechas';
const VIGENCIA_MS = 7 * 24 * 60 * 60 * 1000;
// Cada cuanto se guardan los usos anotados (y siempre al ir a segundo plano).
const GUARDAR_USOS_MS = 3000;

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

const vence = (clave) => typeof clave === 'string' && clave.startsWith(PREFIJO) && !PERMANENTES.has(clave);

// Metodos originales de Storage (los interceptados llaman a estos).
const original = {
  getItem: Storage.prototype.getItem,
  setItem: Storage.prototype.setItem,
  removeItem: Storage.prototype.removeItem,
};

// Usos anotados en memoria y aun no guardados: { clave: ms } (null = borrada).
let usos = {};
let temporizador = null;

function leerFechas() {
  try {
    return JSON.parse(original.getItem.call(localStorage, FECHAS_KEY)) ?? {};
  } catch {
    return {};
  }
}

function guardarUsos() {
  clearTimeout(temporizador);
  temporizador = null;
  if (!Object.keys(usos).length) return;
  try {
    const fechas = leerFechas();
    for (const [clave, ms] of Object.entries(usos)) {
      if (ms === null) delete fechas[clave];
      else fechas[clave] = ms;
    }
    original.setItem.call(localStorage, FECHAS_KEY, JSON.stringify(fechas));
  } catch {
    // Sin espacio o sin localStorage: se reintenta con el proximo uso.
    return;
  }
  usos = {};
}

function anotarUso(clave, ms) {
  usos[clave] = ms;
  if (!temporizador) temporizador = setTimeout(guardarUsos, GUARDAR_USOS_MS);
}

export function limpiarGuardadoVencido() {
  guardarUsos();
  try {
    const fechas = leerFechas();
    const ahora = Date.now();
    const vigentes = {};
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const clave = localStorage.key(i);
      if (!vence(clave)) continue;
      // Sin fecha (clave anterior a esta regla o escrita por otra via): cuenta desde hoy.
      const ultimoUso = Number(fechas[clave]) || ahora;
      if (ahora - ultimoUso > VIGENCIA_MS) original.removeItem.call(localStorage, clave);
      else vigentes[clave] = ultimoUso;
    }
    original.setItem.call(localStorage, FECHAS_KEY, JSON.stringify(vigentes));
  } catch {
    // Sin localStorage: no hay nada que limpiar.
  }
}

// Anota cada lectura o escritura de una clave que vence (solo localStorage,
// no sessionStorage). Una lectura de una clave que no existe no cuenta.
function interceptar() {
  Storage.prototype.getItem = function getItem(clave) {
    const valor = original.getItem.call(this, clave);
    if (this === localStorage && valor !== null && vence(clave)) anotarUso(clave, Date.now());
    return valor;
  };
  Storage.prototype.setItem = function setItem(clave, valor) {
    original.setItem.call(this, clave, valor);
    if (this === localStorage && vence(clave)) anotarUso(clave, Date.now());
  };
  Storage.prototype.removeItem = function removeItem(clave) {
    original.removeItem.call(this, clave);
    if (this === localStorage && vence(clave)) anotarUso(clave, null);
  };
}

export function iniciarCaducidad() {
  limpiarGuardadoVencido();
  try {
    interceptar();
  } catch {
    // Navegador sin Storage: la app sigue sin caducidad.
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') limpiarGuardadoVencido();
    else guardarUsos();
  });
  window.addEventListener('pagehide', guardarUsos);
}

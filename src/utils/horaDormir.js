// Hora de dormir: a cierta hora la app avisa que se acaba el dia y, al
// llegar, muestra una pantalla de "buenas noches" que tapa todo hasta la
// hora de despertar. Nunca corta en seco: avisa antes en tres pasos
// (AVISOS) para que el niño alcance a terminar lo que esta haciendo, como
// los avisos de transicion del jardin ("en 10 minutos guardamos").
//
// Se configura en el modo desarrollador (Actividades > Hora de dormir) y
// queda guardado en ESTE equipo. Viene apagado.
//
// Fases (de menos a mas cerca de la hora):
//   libre    -> falta mas de 30 min (o esta apagado)
//   aviso30  -> 30 min: aparece la luna con el tiempo que queda
//   aviso10  -> 10 min: "ve terminando tu juego"
//   ultimo   ->  2 min: "ultimo juego"
//   dormir   -> pantalla de buenas noches hasta la hora de despertar
//
// Un adulto puede dar 15 minutos mas o apagarlo por hoy desde la pantalla
// de dormir (pregunta de adulto). Las dos cosas se guardan con su hora de
// termino, asi que recargar la pagina no sirve para saltarselo.

import { useSyncExternalStore } from 'react';

const CLAVE = 'musica-kids-hora-dormir';
const MIN = 60 * 1000;
const DIA_MIN = 24 * 60;

export const AVISOS = { aviso30: 30, aviso10: 10, ultimo: 2 };
export const PRORROGA_MIN = 15;

const PREDETERMINADA = {
  activo: false,
  dormir: '20:30',
  despertar: '07:00',
  // ms hasta cuando corre la prorroga de 15 minutos (0 = ninguna)
  prorrogaHasta: 0,
  // ms hasta cuando esta apagado "por hoy" (0 = no)
  pausaHasta: 0,
};

const aMinutos = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

function leer() {
  try {
    return { ...PREDETERMINADA, ...JSON.parse(localStorage.getItem(CLAVE) || '{}') };
  } catch {
    return { ...PREDETERMINADA };
  }
}

// ---------- Almacen (config + pruebas del modo desarrollador) ----------
// ensayo: la secuencia completa acelerada (empieza justo antes de los 30 min y corre
// FACTOR_ENSAYO veces mas rapido: dura ~1 minuto). vistaPrevia: muestra una
// fase puntual al instante. Ninguna de las dos se guarda.
const FACTOR_ENSAYO = 30;
// nPrueba cambia con cada prueba nueva: asi una misma vista previa pedida
// dos veces vuelve a avisar.
let estado = { config: leer(), ensayo: null, vistaPrevia: null, nPrueba: 0 };
const oyentes = new Set();

function cambiar(parcial) {
  estado = { ...estado, ...parcial };
  oyentes.forEach((f) => f());
}

export function guardarConfig(parcial) {
  const config = { ...estado.config, ...parcial };
  try {
    localStorage.setItem(CLAVE, JSON.stringify(config));
  } catch {
    // Sin localStorage dura lo que dure la sesion.
  }
  cambiar({ config });
}

const prueba = (ensayo, vistaPrevia) => cambiar({ ensayo, vistaPrevia, nPrueba: estado.nPrueba + 1 });
export const iniciarEnsayo = () => prueba({ inicio: Date.now() }, null);
export const verFase = (fase) => prueba(null, fase);
export const terminarPrueba = () => prueba(null, null);

const suscribir = (f) => {
  oyentes.add(f);
  return () => oyentes.delete(f);
};
export const useHoraDormir = () => useSyncExternalStore(suscribir, () => estado);

// ---------- Calculo ----------
const faseSegun = (restantes) => {
  if (restantes <= 0) return 'dormir';
  if (restantes <= AVISOS.ultimo) return 'ultimo';
  if (restantes <= AVISOS.aviso10) return 'aviso10';
  if (restantes <= AVISOS.aviso30) return 'aviso30';
  return 'libre';
};

// Proxima hora de despertar (ms) a partir de "ahora".
export function proximoDespertar(config, ahora = Date.now()) {
  const d = new Date(ahora);
  const w = aMinutos(config.despertar);
  d.setHours(Math.floor(w / 60), w % 60, 0, 0);
  if (d.getTime() <= ahora) d.setDate(d.getDate() + 1);
  return d.getTime();
}

// { fase, restantes (minutos, con decimales; null en libre lejano/dormir),
//   prueba: 'ensayo' | 'vista' | null }
export function calcular({ config, ensayo, vistaPrevia }, ahora = Date.now()) {
  if (vistaPrevia) {
    return { fase: vistaPrevia, restantes: AVISOS[vistaPrevia] ?? 0, prueba: 'vista' };
  }
  if (ensayo) {
    const restantes = AVISOS.aviso30 + 0.2 - ((ahora - ensayo.inicio) * FACTOR_ENSAYO) / MIN;
    return { fase: faseSegun(restantes), restantes: Math.max(0, restantes), prueba: 'ensayo' };
  }
  if (!config.activo || config.pausaHasta > ahora) return { fase: 'libre', restantes: null, prueba: null };

  if (config.prorrogaHasta > ahora) {
    const restantes = (config.prorrogaHasta - ahora) / MIN;
    return { fase: faseSegun(restantes), restantes, prueba: null };
  }

  const d = new Date(ahora);
  const m = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  const D = aMinutos(config.dormir);
  const W = aMinutos(config.despertar);
  // La ventana de descanso casi siempre cruza la medianoche (20:30 a 07:00).
  const enVentana = D > W ? (m >= D || m < W) : (m >= D && m < W);
  if (enVentana) return { fase: 'dormir', restantes: 0, prueba: null };
  const restantes = (D - m + DIA_MIN) % DIA_MIN;
  return { fase: faseSegun(restantes), restantes, prueba: null };
}

// Acciones del adulto en la pantalla de dormir.
export const darProrroga = () => guardarConfig({ prorrogaHasta: Date.now() + PRORROGA_MIN * MIN });
export const apagarPorHoy = () => guardarConfig({ pausaHasta: proximoDespertar(estado.config), prorrogaHasta: 0 });

// Texto para el adulto (panel): "Faltan 2 h 10 min".
export function describir(config, ahora = Date.now()) {
  if (!config.activo) return 'Apagado en este equipo.';
  if (config.pausaHasta > ahora) return `Apagado por hoy, vuelve a las ${config.despertar}.`;
  const { fase, restantes } = calcular({ config }, ahora);
  if (fase === 'dormir') return `Ahora es hora de dormir (hasta las ${config.despertar}).`;
  const total = Math.ceil(restantes);
  const h = Math.floor(total / 60);
  const min = total % 60;
  const extra = config.prorrogaHasta > ahora ? ' (con 15 minutos más)' : '';
  return `Faltan ${h ? `${h} h ` : ''}${min} min para la hora de dormir${extra}.`;
}

// Hora de dormir: a cierta hora la app avisa que se acaba el dia y, al
// llegar, muestra una pantalla de "buenas noches" que tapa todo hasta la
// hora de despertar. Nunca corta en seco: avisa antes en tres pasos (30, 15
// y 5 minutos, fijos; el adulto solo enciende o apaga cada uno) para que el
// niño alcance a terminar lo que esta haciendo, como los avisos de
// transicion del jardin.
//
// Se configura en el modo desarrollador (Actividades > Hora de dormir) y
// queda guardado en ESTE equipo. Viene ENCENDIDO (pedido 2026-10-24). Cada dia de la semana tiene
// su hora de dormir; la de despertar es una sola.
//
// Fases:
//   libre   -> falta mas de LUNA_MIN (o esta apagado): no se ve nada
//   aviso   -> la luna en la esquina; nivel = ultimo aviso alcanzado
//              (-1 = luna sin aviso todavia, 0 = primero, ...)
//   dormir  -> pantalla de buenas noches hasta la hora de despertar
//
// Un adulto puede dar 15 minutos mas o apagarlo por hoy desde la pantalla
// de dormir (pregunta de adulto). Las dos cosas se guardan con su hora de
// termino, asi que recargar la pagina no sirve para saltarselo.

import { useSyncExternalStore } from 'react';

const CLAVE = 'musica-kids-hora-dormir';
const MIN = 60 * 1000;

// La luna aparece 30 minutos antes, este o no encendido el primer aviso.
export const LUNA_MIN = 30;
export const PRORROGA_MIN = 15;
// Minutos antes de la hora, de mayor a menor (fijos, pedido 2026-10-24).
export const AVISOS = [30, 15, 5];

// Indice = getDay() de JS (0 domingo ... 6 sabado). El panel los muestra
// de lunes a domingo (ORDEN_DIAS).
export const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];

const PREDETERMINADA = {
  activo: true,
  dias: ['20:00', '19:45', '19:45', '19:45', '19:45', '19:45', '20:30'],
  despertar: '07:00',
  // encendido/apagado de cada aviso de AVISOS
  avisosActivos: [true, true, true],
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
    const guardada = JSON.parse(localStorage.getItem(CLAVE) || '{}');
    const config = { ...PREDETERMINADA, ...guardada };
    if (!Array.isArray(config.dias) || config.dias.length !== 7) config.dias = [...PREDETERMINADA.dias];
    if (!Array.isArray(config.avisosActivos) || config.avisosActivos.length !== AVISOS.length) {
      config.avisosActivos = [...PREDETERMINADA.avisosActivos];
    }
    // Versiones anteriores: una sola hora ("dormir") y minutos editables.
    delete config.dormir;
    delete config.avisos;
    return config;
  } catch {
    return { ...PREDETERMINADA };
  }
}

// ---------- Audios (voz grabada) ----------
// Archivos en src/assets/hora-dormir/ con estos nombres exactos; el que no
// este simplemente no suena (queda la campanita). Ver README.txt de la
// carpeta.
export const AUDIOS = ['aviso-30', 'aviso-15', 'aviso-5', 'buenas-noches'];
const ARCHIVOS_AUDIO = import.meta.glob('../assets/hora-dormir/*.mp3', { eager: true, query: '?url', import: 'default' });
export const audioDe = (nombre) => ARCHIVOS_AUDIO[`../assets/hora-dormir/${nombre}.mp3`] ?? null;
export const audioDeAviso = (nivel) => audioDe(`aviso-${AVISOS[nivel]}`);
// Ilustracion de Skye de cada aviso (aviso-30.avif...); sin ella, la luna.
const IMAGENES = import.meta.glob('../assets/hora-dormir/*.avif', { eager: true, query: '?url', import: 'default' });
export const imagenDeAviso = (nivel) => IMAGENES[`../assets/hora-dormir/aviso-${AVISOS[nivel]}.avif`] ?? null;

// ---------- Almacen (config + pruebas del modo desarrollador) ----------
// ensayo: la secuencia completa acelerada; parte justo antes de que aparezca
// la luna y dura ~1 minuto. vistaPrevia: { nivel } de un aviso o
// { dormir: true }, al instante. Ninguna de las dos se guarda. nPrueba
// cambia con cada prueba nueva: asi una misma vista previa pedida dos veces
// vuelve a avisar.
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
export const verAviso = (nivel) => prueba(null, { nivel });
export const verDormir = () => prueba(null, { dormir: true });
export const terminarPrueba = () => prueba(null, null);

const suscribir = (f) => {
  oyentes.add(f);
  return () => oyentes.delete(f);
};
export const useHoraDormir = () => useSyncExternalStore(suscribir, () => estado);

// ---------- Calculo ----------
// nivel = ultimo aviso alcanzado (este encendido o no: HoraDormir.jsx
// decide si lo muestra).
function segun(restantes) {
  if (restantes <= 0) return { fase: 'dormir', nivel: AVISOS.length - 1, restantes: 0 };
  if (restantes > LUNA_MIN) return { fase: 'libre', nivel: -1, restantes };
  let nivel = -1;
  AVISOS.forEach((m, i) => { if (restantes <= m) nivel = i; });
  return { fase: 'aviso', nivel, restantes };
}

// Momento (ms) en que empieza la noche del dia de "base" (fecha local) y en
// que termina. Una hora de dormir menor que la de despertar (ej. 00:30) se
// toma como de la madrugada siguiente.
function noche(config, base) {
  const dormir = aMinutos(config.dias[base.getDay()]);
  const despertar = aMinutos(config.despertar);
  const inicio = new Date(base);
  inicio.setHours(Math.floor(dormir / 60), dormir % 60, 0, 0);
  if (dormir < despertar) inicio.setDate(inicio.getDate() + 1);
  const fin = new Date(inicio);
  fin.setHours(Math.floor(despertar / 60), despertar % 60, 0, 0);
  if (fin <= inicio) fin.setDate(fin.getDate() + 1);
  return { inicio: inicio.getTime(), fin: fin.getTime() };
}

// Noche en curso o la proxima: { inicio, fin, enCurso }.
export function nocheRelevante(config, ahora = Date.now()) {
  const dia = (desfase) => {
    const d = new Date(ahora);
    d.setDate(d.getDate() + desfase);
    return noche(config, d);
  };
  for (const n of [dia(-1), dia(0)]) {
    if (n.inicio <= ahora && ahora < n.fin) return { ...n, enCurso: true };
  }
  const hoy = dia(0);
  return { ...(hoy.inicio > ahora ? hoy : dia(1)), enCurso: false };
}

// { fase, nivel, restantes (minutos), prueba: 'ensayo' | 'vista' | null }
export function calcular({ config, ensayo, vistaPrevia }, ahora = Date.now()) {
  if (vistaPrevia) {
    if (vistaPrevia.dormir) return { fase: 'dormir', nivel: AVISOS.length - 1, restantes: 0, prueba: 'vista' };
    return { fase: 'aviso', nivel: vistaPrevia.nivel, restantes: AVISOS[vistaPrevia.nivel], prueba: 'vista' };
  }
  if (ensayo) {
    const desde = LUNA_MIN + 0.2;
    // "desde" minutos en 60 segundos.
    const restantes = desde - ((ahora - ensayo.inicio) * desde) / MIN;
    return { ...segun(restantes), prueba: 'ensayo' };
  }
  if (!config.activo || config.pausaHasta > ahora) return { fase: 'libre', nivel: -1, restantes: null, prueba: null };
  if (config.prorrogaHasta > ahora) {
    return { ...segun((config.prorrogaHasta - ahora) / MIN), prueba: null };
  }
  const n = nocheRelevante(config, ahora);
  if (n.enCurso) return { fase: 'dormir', nivel: AVISOS.length - 1, restantes: 0, prueba: null };
  return { ...segun((n.inicio - ahora) / MIN), prueba: null };
}

// Acciones del adulto en la pantalla de dormir.
export const darProrroga = () => guardarConfig({ prorrogaHasta: Date.now() + PRORROGA_MIN * MIN });
export const apagarPorHoy = () => guardarConfig({
  pausaHasta: nocheRelevante(estado.config).fin,
  prorrogaHasta: 0,
});

// Texto para el adulto (panel): "Faltan 2 h 10 min para la hora de dormir."
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

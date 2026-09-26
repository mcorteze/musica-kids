import { useState, useCallback, useEffect, useMemo, useRef, useLayoutEffect, cloneElement, Children } from 'react';
import { createPortal } from 'react-dom';
import { Image } from 'antd';
import { cargarImagenConAspecto } from '../utils/cargarImagen';
import DiferenciasJuego from './DiferenciasJuego';
import DiferenciasDev from './DiferenciasDev';
import diferenciasCoordenadas, { RADIO_ACIERTO } from '../data/diferencias';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  BarsOutlined,
  CloseOutlined,
  LeftOutlined,
  PictureOutlined,
  PrinterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import themes from '../themes';
import imagenMemorice from '../assets/menu-general/memorice.avif';
import imagenImprimir from '../assets/menu-general/imprimir.avif';
import imagenRompecabezas from '../assets/menu-general/rompecabezas.avif';
import imagenContar from '../assets/menu-general/contar.avif';
import imagenDiferencias from '../assets/menu-general/diferencias.avif';
import imagenSecuencias from '../assets/menu-general/secuencias.avif';

// ========== MENU GENERAL ==========
// El icono del header abre este drawer con un menu de tarjetas (Imprimir,
// Memorice, Rompecabezas) — "vista" dice cual de las pantallas (o el menu
// raiz) esta activa. Elegir Memorice entra al flujo de temas/juego de mas
// abajo; elegir Imprimir entra al selector de grupos con galeria; elegir
// Rompecabezas entra al flujo de temas/niveles definido en la seccion
// ROMPECABEZAS, mas abajo.
const ROMPECABEZAS_HABILITADO = true;
// ========== TEMAS ==========
// Cada tema vive en src/assets/memorice/<id>/ (ver el README.txt de esa
// carpeta): ui/fondo.avif, ui/back.avif y caras/*.avif (una foto por
// personaje). Un tema queda "listo" recien cuando tiene los tres — si
// falta algo aparece en el selector marcado "Muy pronto" y no se puede
// elegir, sin que haya que tocar codigo cuando se completen las fotos. El
// selector muestra el dorso real de las cartas (no un emoji generico), asi
// que el nombre sale de groups.js pero el "icono" es la propia imagen.
import gruposReproductor from '../data/groups';

// "grupo" busca el nombre en groups.js (reusa el nombre del reproductor).
// "nombre" lo pisa/reemplaza cuando el tema no tiene un grupo de canciones
// equivalente (ej. Frozen: hay grupo "Disney" pero es mas generico que el
// set real, asi que este tema no se ata a ningun grupo del reproductor).
// "header" es el gradiente del header del drawer para ESE tema — Paw
// Patrol es el original/pedido explicito de mantener, los demas se
// sacaron muestreando los colores reales del dorso de cada set (no son
// los mismos colores que usa ese grupo en el reproductor: alla el tema
// "sky" de Paw Patrol es rosa Skye especificamente, no el azul/rojo del
// logo general, que es lo que corresponde aca).
const TEMAS_META = [
  {
    id: 'paw-patrol',
    grupo: 'paw-patrol',
    header: 'linear-gradient(120deg, #0BA3E0 0%, #0E8FD1 55%, #E31A22 100%)',
  },
  {
    id: 'munecas',
    nombre: 'Gabby Dollhouse',
    header: 'linear-gradient(120deg, #B04FCB 0%, #9B3FC0 55%, #E85FB8 100%)',
  },
  {
    id: 'toy-story',
    grupo: 'toy-story',
    header: 'linear-gradient(120deg, #5AB0F5 0%, #1C6FB0 55%, #E00024 100%)',
  },
  {
    id: 'frozen',
    nombre: 'Frozen',
    header: 'linear-gradient(120deg, #47ACD8 0%, #1E5FA8 55%, #7C3AED 100%)',
  },
];

// Rutas conocidas al toque (import.meta.glob solo espera cuando se llama
// al loader, no para listar las claves) — de ahi sale, sin cargar ningun
// byte todavia, cuantas fotos tiene cada tema y si ya esta "listo".
const ENTRADAS_CARAS = import.meta.glob('../assets/memorice/*/caras/*.{png,jpg,jpeg,webp,avif}');
const ENTRADAS_UI = import.meta.glob('../assets/memorice/*/ui/*.{png,jpg,jpeg,webp,avif}');

function partesDeRuta(ruta, carpeta) {
  const m = ruta.match(new RegExp(`memorice/([^/]+)/${carpeta}/([^/.]+)\\.[a-z0-9]+$`, 'i'));
  return m ? { tema: m[1], archivo: m[2] } : null;
}

function etiquetaDesdeArchivo(nombreArchivo) {
  return nombreArchivo
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const TEMAS = TEMAS_META.map(({ id, grupo, nombre: nombreFijo, header, oculto, soloLaptop }) => {
  const info = grupo ? gruposReproductor.find((g) => g.id === grupo) : null;
  const nombre = nombreFijo ?? info?.name ?? id;

  const caras = Object.entries(ENTRADAS_CARAS)
    .map(([ruta, cargar]) => ({ info: partesDeRuta(ruta, 'caras'), cargar }))
    .filter((e) => e.info?.tema === id)
    .sort((a, b) => a.info.archivo.localeCompare(b.info.archivo));

  const entradasUi = Object.entries(ENTRADAS_UI)
    .map(([ruta, cargar]) => ({ info: partesDeRuta(ruta, 'ui'), cargar }))
    .filter((e) => e.info?.tema === id);
  const fondo = entradasUi.find((e) => e.info.archivo === 'fondo')?.cargar ?? null;
  const back = entradasUi.find((e) => e.info.archivo === 'back')?.cargar ?? null;

  return {
    id,
    nombre,
    header,
    caras,
    fondo,
    back,
    // Minimo jugable: fondo + dorso + al menos 2 caras (el tablero mas
    // chico son 4 cartas = 2 parejas).
    listo: Boolean(fondo && back && caras.length >= 2),
    oculto: Boolean(oculto),
    soloLaptop: Boolean(soloLaptop),
  };
});

// ========== NIVELES ==========
// SIN selector manual: el unico modo de pasar a mas cartas es ganando el
// tablero actual (pedido explicito). Min 4, max 48 (24 parejas). La forma
// (columnas x filas) de la grilla ya no es fija por nivel: se elige sola
// segun el espacio real disponible (ver paresDivisores/celda mas abajo),
// asi aprovecha mejor el alto disponible en vez de dejar una columna de
// mas con espacio vertical sobrando.
const NIVELES = [
  { total: 4 },
  { total: 8 },
  { total: 12 },
  { total: 16 },
  { total: 20 },
  { total: 24 },
  { total: 30 },
  { total: 36 },
  { total: 42 },
  { total: 48 },
];

function nivelesDelTema(tema) {
  return NIVELES.filter((n) => n.total / 2 <= tema.caras.length);
}

function nivelKey(temaId) {
  return `musica-kids-memorice-nivel-${temaId}`;
}

function leerNivelGuardado(temaId, disponibles) {
  try {
    const n = parseInt(localStorage.getItem(nivelKey(temaId)), 10);
    return disponibles.some((x) => x.total === n) ? n : disponibles[0].total;
  } catch {
    return disponibles[0].total;
  }
}

// Cuanto se espera antes de resolver un par volteado: con match alcanza con
// lo que dura la animacion de vuelta (App.css: .memory-card-inner
// transition); sin match hay que dejar mas tiempo para que la nina alcance
// a mirar las dos antes de que se den vuelta solas.
const ESPERA_MATCH_MS = 550;
const ESPERA_ERROR_MS = 900;

// Las tarjetas tienen que ser cuadradas de verdad (no estiradas a lo que
// mida cada celda). GAP tiene que ser el mismo valor que "gap" en
// .memory-grid (App.css) — CELDA_MAX evita que en un monitor gigante las
// tarjetas queden enormes.
const GAP = 5;
const CELDA_MAX = 200;

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function crearTablero(totalCartas, caras) {
  const parejas = totalCartas / 2;
  const elegidas = shuffle(caras).slice(0, parejas);
  return shuffle([...elegidas, ...elegidas]).map((cara, i) => ({
    uid: `${cara.id}-${i}-${Math.random().toString(36).slice(2)}`,
    cara,
    volteada: false,
    encontrada: false,
  }));
}

// ========== IMPRIMIR (galerias de fotos por grupo de musica) ==========
// Mismo mapeo que antes vivia en App.jsx (icono de galeria en el header
// del reproductor, uno por grupo) — el acceso se movio aca, al menu
// general, asi que ya no hay boton de galeria en el reproductor.
const GALLERY_FOLDERS = {
  'paw-patrol': 'paw-patrol-gallery',
  'toy-story': 'toy-story-gallery',
  disney: 'disney-gallery',
  '31-minutos': '31-minutos-gallery',
  bluey: 'bluey-gallery',
  munecas: 'munecas-gallery',
  gimnasia: 'gimnasia-gallery',
  'efecto-n': 'efecto-n-gallery',
  'perro-chocolo': 'perro-chocolo-gallery',
  varias: 'varias-gallery',
};

// Perezoso igual que las fotos de Memorice: nada se pide hasta que se abre
// la galeria puntual de ese grupo.
const ENTRADAS_GALERIAS = import.meta.glob('../assets/*-gallery/*.{png,jpg,jpeg,webp,avif}');
const LOADERS_GALERIA = {};
for (const [ruta, cargar] of Object.entries(ENTRADAS_GALERIAS)) {
  const m = ruta.match(/assets\/([a-z0-9-]+-gallery)\//);
  if (!m) continue;
  (LOADERS_GALERIA[m[1]] ??= []).push([ruta, cargar]);
}
for (const carpeta in LOADERS_GALERIA) {
  LOADERS_GALERIA[carpeta].sort(([a], [b]) => a.localeCompare(b));
}

// z-index de la vista previa (Image de antd) de las fotos de Imprimir: el
// drawer esta en 9998 (.memory-overlay) y el reproductor flotante en 10000,
// y la vista previa se monta en <body> con 1080 por defecto — quedaria
// DETRAS del drawer. Va por encima de todo (incluso del reproductor: es un
// visor a pantalla completa y su barra de herramientas no debe quedar tapada).
const Z_PREVIEW_GALERIA = 10002;

// ========== MODO DESARROLLADOR (oculto) ==========
// Las actividades del drawer estan restringidas en movil (y varias solo en
// laptop) y eso sigue igual para los ninos. Para poder verlas en el celular
// mientras se desarrollan hay un interruptor OCULTO: tocar TOQUES_MODO_DEV
// veces seguidas el titulo "Actividades" del menu principal del drawer (solo
// ahi, en ningun otro lugar del sitio) lo activa; repetirlo lo desactiva.
// Se guarda en localStorage, asi que vale solo para ESE dispositivo. Activo,
// el drawer muestra todas las tarjetas sin importar el responsive (ver
// .memory-dev en App.css). Cada toque debe llegar antes de VENTANA_TOQUES_MS
// desde el anterior o la cuenta vuelve a empezar.
const TOQUES_MODO_DEV = 20;
const VENTANA_TOQUES_MS = 1200;
const MODO_DEV_KEY = 'musica-kids-modo-desarrollador';

function leerModoDev() {
  try {
    return localStorage.getItem(MODO_DEV_KEY) === '1';
  } catch {
    return false;
  }
}

// Imprime SOLO una imagen (no la pagina): se arma un iframe oculto que
// contiene nada mas que esa <img>, centrada y escalada para caber en la
// hoja, y se llama a print() sobre el iframe — asi el dialogo de impresion
// del navegador recibe unicamente la foto. Se espera a que la imagen cargue
// y se decodifique (si no, algunos navegadores imprimen la hoja en blanco).
// El iframe se retira solo al terminar de imprimir (afterprint) o, como
// respaldo para navegadores que no lo disparan, a los 5 minutos.
function imprimirImagen(url) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
  const quitar = () => iframe.remove();
  iframe.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><title>Imprimir</title>'
    + '<style>@page{margin:10mm}html,body{height:100%;margin:0}'
    + 'body{display:flex;align-items:center;justify-content:center}'
    + 'img{max-width:100%;max-height:100%;object-fit:contain}</style></head><body><img alt=""></body></html>';
  iframe.onload = () => {
    const ventana = iframe.contentWindow;
    const img = ventana.document.querySelector('img');
    img.onload = () => {
      (img.decode ? img.decode() : Promise.resolve())
        .catch(() => {})
        .then(() => {
          ventana.onafterprint = quitar;
          ventana.focus();
          ventana.print();
        });
    };
    img.onerror = quitar;
    img.src = new URL(url, window.location.href).href;
  };
  document.body.appendChild(iframe);
  setTimeout(quitar, 300000);
}

// Tarjetas del selector de "Imprimir": misma portada que el grupo de
// musica correspondiente (pedido explicito — "cards con las mismas
// imagenes de los grupos de musica"), mas el gradiente de su tema para
// pintar el header al ver esa galeria puntual.
const GRUPOS_IMPRIMIBLES = Object.entries(GALLERY_FOLDERS).map(([id, folder]) => {
  const info = gruposReproductor.find((g) => g.id === id);
  return {
    id,
    nombre: info?.name ?? id,
    cover: info?.cover ?? null,
    header: info ? themes[info.theme]?.headerStyle?.background : null,
    folder,
  };
});

// ========== ROMPECABEZAS ==========
// Un NIVEL define la dificultad (la cantidad de piezas) y agrupa VARIOS
// rompecabezas, cada uno con una foto distinta (pedido explicito — "no
// vamos a reciclar imagenes"), no la misma foto cortada mas fina. Al
// empezar un nivel el juego elige uno de sus rompecabezas AL AZAR, sin
// repetir el que se acaba de jugar (elegirAlAzarPendiente). Para
// DESBLOQUEAR el nivel siguiente hay que armar TODOS los rompecabezas del
// nivel: mientras falten, el sorteo solo toma los que aun no se armaron
// (los ya armados se guardan por tema en localStorage, ver
// leerCompletadosRompecabezas). Por eso la cantidad de piezas se define
// aqui, por nivel, no se calcula sola.
// Cada rompecabezas tiene un CODIGO permanente "<tema>_NNN" (ej.
// toy_story_001: el id del tema con guion bajo + un numero de 3 cifras,
// correlativo por tema, NO por nivel) que sirve para referenciarlo al
// hablar de el. Ese mismo codigo es el "id" del rompecabezas y el nombre de
// su imagen: src/assets/rompecabezas/<tema>/<codigo>.avif. Nunca se
// reutiliza ni se renumera, aunque cambie el nivel o el orden en que esta
// declarado — ver skills/agregar-rompecabezas.md.
// "orientacion" clasifica la foto: 'horizontal' (mas ancha que alta),
// 'cuadrado' o 'vertical' (mas alta que ancha). Se declara a mano por
// rompecabezas (ver skills/agregar-rompecabezas.md, que obliga a
// preguntarla) y hoy la usa la pagina "Todos los rompecabezas" solo para el
// tamaño MAXIMO de las miniaturas. Es una etiqueta aproximada: las fotos de
// una misma orientacion no miden lo mismo (una horizontal puede ser 16:9,
// 4:3 o 21:9 y una "cuadrada" casi nunca lo es exacta), asi que NADA asume
// una proporcion fija — ni el tablero, que mide las proporciones REALES de
// la imagen para calcular la grilla de piezas y donde poner el carrousel,
// ni las miniaturas.
const TEMAS_ROMPECABEZAS_META = [
  {
    id: 'frozen',
    nombre: 'Frozen',
    header: 'linear-gradient(120deg, #47ACD8 0%, #1E5FA8 55%, #7C3AED 100%)',
    niveles: [
      { piezas: 12, rompecabezas: [{ id: 'frozen_001', orientacion: 'horizontal' }] },
      {
        piezas: 18,
        rompecabezas: [
          { id: 'frozen_002', orientacion: 'horizontal' },
          { id: 'frozen_003', orientacion: 'vertical' },
          { id: 'frozen_004', orientacion: 'vertical' },
          { id: 'frozen_005', orientacion: 'vertical' },
          { id: 'frozen_006', orientacion: 'cuadrado' },
        ],
      },
      {
        piezas: 24,
        rompecabezas: [
          { id: 'frozen_007', orientacion: 'vertical' },
          { id: 'frozen_008', orientacion: 'vertical' },
          { id: 'frozen_009', orientacion: 'vertical' },
          { id: 'frozen_012', orientacion: 'vertical' },
        ],
      },
      {
        piezas: 30,
        rompecabezas: [
          { id: 'frozen_010', orientacion: 'horizontal' },
          { id: 'frozen_011', orientacion: 'horizontal' },
        ],
      },
    ],
  },
  {
    id: 'toy-story',
    nombre: 'Toy Story',
    header: 'linear-gradient(120deg, #5AB0F5 0%, #1C6FB0 55%, #E00024 100%)',
    niveles: [
      {
        piezas: 12,
        rompecabezas: [
          { id: 'toy_story_001', orientacion: 'horizontal' },
          { id: 'toy_story_016', orientacion: 'horizontal' },
          { id: 'toy_story_005', orientacion: 'vertical' },
          { id: 'toy_story_007', orientacion: 'cuadrado' },
        ],
      },
      {
        piezas: 18,
        rompecabezas: [
          { id: 'toy_story_002', orientacion: 'horizontal' },
          { id: 'toy_story_008', orientacion: 'horizontal' },
          { id: 'toy_story_009', orientacion: 'horizontal' },
          { id: 'toy_story_006', orientacion: 'vertical' },
          { id: 'toy_story_012', orientacion: 'vertical' },
          { id: 'toy_story_013', orientacion: 'cuadrado' },
          { id: 'toy_story_014', orientacion: 'cuadrado' },
          { id: 'toy_story_015', orientacion: 'cuadrado' },
        ],
      },
      {
        piezas: 24,
        rompecabezas: [
          { id: 'toy_story_003', orientacion: 'horizontal' },
          { id: 'toy_story_017', orientacion: 'horizontal' },
          { id: 'toy_story_018', orientacion: 'horizontal' },
        ],
      },
      {
        piezas: 30,
        rompecabezas: [
          { id: 'toy_story_020', orientacion: 'horizontal' },
          { id: 'toy_story_021', orientacion: 'horizontal' },
          { id: 'toy_story_022', orientacion: 'cuadrado' },
          { id: 'toy_story_023', orientacion: 'cuadrado' },
        ],
      },
    ],
  },
  {
    id: 'paw-patrol',
    nombre: 'Paw Patrol',
    header: 'linear-gradient(120deg, #0BA3E0 0%, #0E8FD1 55%, #E31A22 100%)',
    niveles: [
      {
        piezas: 12,
        rompecabezas: [
          { id: 'paw_patrol_001', orientacion: 'vertical' },
          { id: 'paw_patrol_002', orientacion: 'horizontal' },
          { id: 'paw_patrol_003', orientacion: 'cuadrado' },
          { id: 'paw_patrol_004', orientacion: 'vertical' },
        ],
      },
      {
        piezas: 18,
        rompecabezas: [
          { id: 'paw_patrol_005', orientacion: 'vertical' },
          { id: 'paw_patrol_006', orientacion: 'horizontal' },
          { id: 'paw_patrol_007', orientacion: 'horizontal' },
          { id: 'paw_patrol_008', orientacion: 'vertical' },
          { id: 'paw_patrol_009', orientacion: 'vertical' },
          { id: 'paw_patrol_010', orientacion: 'vertical' },
          { id: 'paw_patrol_011', orientacion: 'horizontal' },
          { id: 'paw_patrol_012', orientacion: 'cuadrado' },
          { id: 'paw_patrol_013', orientacion: 'vertical' },
          { id: 'paw_patrol_014', orientacion: 'vertical' },
          { id: 'paw_patrol_015', orientacion: 'vertical' },
          { id: 'paw_patrol_016', orientacion: 'vertical' },
          { id: 'paw_patrol_017', orientacion: 'vertical' },
        ],
      },
      {
        piezas: 24,
        rompecabezas: [
          { id: 'paw_patrol_018', orientacion: 'horizontal' },
          { id: 'paw_patrol_019', orientacion: 'horizontal' },
          { id: 'paw_patrol_020', orientacion: 'horizontal' },
          { id: 'paw_patrol_021', orientacion: 'vertical' },
          { id: 'paw_patrol_022', orientacion: 'cuadrado' },
          { id: 'paw_patrol_023', orientacion: 'horizontal' },
          { id: 'paw_patrol_024', orientacion: 'cuadrado' },
        ],
      },
      {
        piezas: 30,
        rompecabezas: [
          { id: 'paw_patrol_025', orientacion: 'horizontal' },
          { id: 'paw_patrol_026', orientacion: 'vertical' },
          { id: 'paw_patrol_027', orientacion: 'horizontal' },
          { id: 'paw_patrol_028', orientacion: 'vertical' },
          { id: 'paw_patrol_029', orientacion: 'horizontal' },
          { id: 'paw_patrol_030', orientacion: 'horizontal' },
        ],
      },
    ],
  },
];

const ENTRADAS_ROMPECABEZAS = import.meta.glob('../assets/rompecabezas/*/*.{png,jpg,jpeg,webp,avif}');

function cargadorRompecabezas(temaId, codigo) {
  for (const [ruta, cargar] of Object.entries(ENTRADAS_ROMPECABEZAS)) {
    const m = ruta.match(/rompecabezas\/([^/]+)\/([^/.]+)\.[a-z0-9]+$/i);
    if (m && m[1] === temaId && m[2] === codigo) return cargar;
  }
  return null;
}

// Elige al azar uno de los items de un nivel (rompecabezas o pares de
// diferencias, cada uno con su "id"). Para pasar de nivel hay que resolver
// TODOS los de ese nivel, asi que mientras falten se sortea solo entre los
// que aun no se han resuelto ("completados": ids ya resueltos); cuando ya
// estan todos (nivel repasado) se sortea entre todos. En ambos casos no
// repite "excluirId" (el que se acaba de jugar) salvo que sea el unico
// candidato.
function elegirAlAzarPendiente(items, excluirId, completados) {
  const pendientes = items.filter((r) => !completados.includes(r.id));
  const pool = pendientes.length > 0 ? pendientes : items;
  const candidatos = pool.length > 1 ? pool.filter((r) => r.id !== excluirId) : pool;
  return candidatos[Math.floor(Math.random() * candidatos.length)].id;
}

const TEMAS_ROMPECABEZAS = TEMAS_ROMPECABEZAS_META.map(({ id, nombre, header, niveles, soloLaptop }) => {
  // Solo quedan los rompecabezas cuya imagen existe, y solo los niveles que
  // conservan al menos uno.
  const nivelesConCarga = niveles
    .map((n) => ({
      ...n,
      rompecabezas: n.rompecabezas
        .map((r) => ({ ...r, cargar: cargadorRompecabezas(id, r.id) }))
        .filter((r) => r.cargar),
    }))
    .filter((n) => n.rompecabezas.length > 0);
  return {
    id,
    nombre,
    header,
    niveles: nivelesConCarga,
    // Listo con al menos el primer nivel disponible — los siguientes
    // pueden ir llegando despues sin que el tema deje de jugarse.
    listo: nivelesConCarga.length > 0,
    soloLaptop: Boolean(soloLaptop),
  };
});

function nivelKeyRompecabezas(temaId) {
  return `musica-kids-rompecabezas-nivel-${temaId}`;
}

function leerNivelGuardadoRompecabezas(temaId, totalNiveles) {
  try {
    const n = parseInt(localStorage.getItem(nivelKeyRompecabezas(temaId)), 10);
    return n >= 0 && n < totalNiveles ? n : 0;
  } catch {
    return 0;
  }
}

// Codigos de los rompecabezas del tema que ya se armaron al menos una vez
// (persistidos por tema). Junto con el nivel maximo desbloqueado deciden si
// un nivel esta completo.
function completadosKeyRompecabezas(temaId) {
  return `musica-kids-rompecabezas-completados-${temaId}`;
}

function leerCompletadosRompecabezas(temaId) {
  try {
    const lista = JSON.parse(localStorage.getItem(completadosKeyRompecabezas(temaId)));
    return Array.isArray(lista) ? lista.filter((c) => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

function guardarCompletadosRompecabezas(temaId, lista) {
  try {
    localStorage.setItem(completadosKeyRompecabezas(temaId), JSON.stringify(lista));
  } catch {
    // Sin localStorage el progreso dura lo que dure la sesion.
  }
}

// Todos los pares (columnas, filas) que arman exactamente "total" piezas.
function paresDivisores(total) {
  const pares = [];
  for (let filas = 1; filas <= total; filas++) {
    if (total % filas === 0) pares.push({ columnas: total / filas, filas });
  }
  return pares;
}

// De todos los pares posibles, el que arma una grilla mas parecida en
// proporcion a la foto real (para no dejar piezas demasiado angostas o
// demasiado altas comparadas con como se ve la imagen completa).
function grillaRompecabezas(total, aspecto) {
  let mejor = null;
  let mejorDelta = Infinity;
  for (const par of paresDivisores(total)) {
    const delta = Math.abs(par.columnas / par.filas - aspecto);
    if (delta < mejorDelta) {
      mejorDelta = delta;
      mejor = par;
    }
  }
  return mejor;
}

// Estado inicial de un nivel: "orden" es el orden barajado en el que se
// listan las piezas del carrousel (fijo mientras dure el nivel, para que
// no salten de lugar cada vez que se coloca una); "posiciones" dice, por
// cada ranura del tablero, que pieza tiene puesta ahi (o null si esta
// vacia) — CUALQUIER pieza puede ir en CUALQUIER ranura, se puede mover
// libremente. El carrousel en pantalla sale de restar: las piezas de
// "orden" que no aparecen en "posiciones" en ese momento.
function estadoInicialRompecabezas(total) {
  return {
    orden: shuffle(Array.from({ length: total }, (_, i) => i)),
    posiciones: new Array(total).fill(null),
  };
}

// Tienen que coincidir con App.css: GAP_LAYOUT_ROMP es el "gap" de
// .romp-layout (separacion entre tablero y carrousel), PADDING_TRAY_ROMP
// es 2x el padding de .romp-tray. El calculo de tamano de abajo los usa
// para repartir el espacio entre tablero y carrousel con una formula
// directa, sin tener que medir dos veces.
const GAP_LAYOUT_ROMP = 10;
const PADDING_TRAY_ROMP = 12;

// Una ranura del tablero: siempre es "droppable" (para soltar ahi
// cualquier pieza, este vacia u ocupada por otra). Si tiene una pieza
// puesta, esa pieza ADEMAS es arrastrable (se puede sacar de ahi y
// moverla a otra ranura, o devolverla al carrousel soltandola afuera de
// la cuadricula) — useDraggable se llama siempre (regla de hooks), pero
// queda "disabled" cuando la ranura esta vacia, ya que ahi no hay nada
// que agarrar. El recorte que se muestra sale de la pieza puesta (su
// posicion real en la foto), no de la ranura — asi una pieza mal puesta
// se nota, como en un rompecabezas de verdad.
function RanuraRompecabezas({ id, piezaId, imagen, columnas, filas }) {
  const { isOver, setNodeRef: setDropRef } = useDroppable({ id });
  const dragId = piezaId !== null ? piezaId : `vacia-${id}`;
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: dragId,
    disabled: piezaId === null,
  });

  let pieza = null;
  if (piezaId !== null) {
    const fila = Math.floor(piezaId / columnas);
    const col = piezaId % columnas;
    pieza = (
      <div
        ref={setDragRef}
        className="romp-pieza-tablero"
        style={{
          backgroundImage: `url(${imagen})`,
          backgroundSize: `${columnas * 100}% ${filas * 100}%`,
          backgroundPosition: `${columnas === 1 ? 0 : (col * 100) / (columnas - 1)}% ${filas === 1 ? 0 : (fila * 100) / (filas - 1)}%`,
          transform: transform ? CSS.Translate.toString(transform) : undefined,
          opacity: isDragging ? 0.3 : 1,
        }}
        {...listeners}
        {...attributes}
        aria-label={`Pieza ${piezaId + 1}`}
      />
    );
  }

  return (
    <div
      ref={setDropRef}
      className={`romp-slot${piezaId !== null ? ' ocupada' : ''}${piezaId === id ? ' correcta' : ''}${isOver ? ' sobre' : ''}`}
    >
      {pieza}
    </div>
  );
}

// Una pieza del carrousel, arrastrable con mouse o con el dedo. Se
// dibuja al mismo tamano exacto (ancho/alto en px) que tiene esa pieza
// puesta en el tablero — pedido explicito, nada de miniaturas — asi que
// el tamano llega por prop en vez de venir de una regla CSS fija. Mientras
// se arrastra queda semi-transparente aqui (el DragOverlay del componente
// principal es el que se ve "volando" siguiendo el puntero, sin quedar
// atrapado por el scroll del carrousel).
function PiezaCarrousel({ id, imagen, columnas, filas, ancho, alto }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const fila = Math.floor(id / columnas);
  const col = id % columnas;
  return (
    <button
      type="button"
      ref={setNodeRef}
      className="romp-tray-pieza"
      style={{
        width: ancho,
        height: alto,
        backgroundImage: `url(${imagen})`,
        backgroundSize: `${columnas * 100}% ${filas * 100}%`,
        backgroundPosition: `${columnas === 1 ? 0 : (col * 100) / (columnas - 1)}% ${filas === 1 ? 0 : (fila * 100) / (filas - 1)}%`,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        opacity: isDragging ? 0.3 : 1,
      }}
      {...listeners}
      {...attributes}
      aria-label={`Pieza ${id + 1}`}
    />
  );
}

// ========== CONTAR ==========
// Disponible de tablet para arriba, oculto en movil (pedido explicito:
// todas las actividades salvo Imprimir se restringen en movil; su card usa
// .memory-solo-tablet). Reutiliza los MISMOS temas y fotos de personajes ya
// convertidas para el Memorice (TEMAS, arriba) — no hace falta ningun
// asset nuevo, solo la cantidad de fotos que ya tiene cada tema.
// Cada ronda: se elige una foto al azar del tema y se muestra repetida
// "objetivo" veces; hay que tocar el numero correcto entre 4 opciones
// (el objetivo + 3 distractores cercanos). Un nivel = 5 rondas seguidas
// bien contestadas; se avanza solo ganando (mismo criterio que el Memorice
// y el Rompecabezas). Al ganar el ULTIMO nivel el juego termina: se muestra
// un recuadro de "completaste el juego" y no se vuelve a repetir en bucle.
const RONDAS_CONTAR = 5;
const NIVELES_CONTAR = [
  { max: 3 },
  { max: 5 },
  { max: 10 },
  { max: 12 },
  { max: 15 },
  { max: 20 },
];

// Las fotos a contar deben verse grandes (pedido explicito, para una
// nina de 5 años) — GAP_CONTAR tiene que coincidir con el gap de
// .contar-area (App.css); CELDA_MAX_CONTAR evita que en un monitor
// gigante, con pocas fotos en la ronda, queden desproporcionadas.
const GAP_CONTAR = 14;
const CELDA_MAX_CONTAR = 220;

// Reparte "total" fotos en el espacio real disponible: prueba cada cantidad
// de columnas (con las filas justas, la ultima fila puede quedar
// incompleta y se centra) y se queda con la que da la foto mas grande. Asi
// 7 fotos no quedan en una sola fila cuando 4 + 3 en dos filas las deja
// mas grandes (con solo los divisores exactos, 7 no tenia mas opcion que
// una fila). Si varias opciones dan el mismo tamaño (tope de
// CELDA_MAX_CONTAR, tipico en pantallas grandes) gana la que deja menos
// huecos y, a igualdad, la de forma mas parecida a la del espacio.
function mejorGrillaContar(total, width, height) {
  let mejor = null;
  for (let columnas = 1; columnas <= total; columnas++) {
    const filas = Math.ceil(total / columnas);
    const porAncho = (width - (columnas - 1) * GAP_CONTAR) / columnas;
    const porAlto = (height - (filas - 1) * GAP_CONTAR) / filas;
    const celda = Math.floor(Math.min(porAncho, porAlto, CELDA_MAX_CONTAR));
    const huecos = columnas * filas - total;
    const desvio = Math.abs(Math.log(columnas / filas / (width / height)));
    const gana = !mejor
      || celda > mejor.celda
      || (celda === mejor.celda && (huecos < mejor.huecos
        || (huecos === mejor.huecos && desvio < mejor.desvio)));
    if (gana) mejor = { columnas, celda, huecos, desvio };
  }
  return { columnas: mejor.columnas, celda: Math.max(0, mejor.celda) };
}

function nivelKeyContar(temaId) {
  return `musica-kids-contar-nivel-${temaId}`;
}

function leerNivelGuardadoContar(temaId) {
  try {
    const n = parseInt(localStorage.getItem(nivelKeyContar(temaId)), 10);
    return n >= 0 && n < NIVELES_CONTAR.length ? n : 0;
  } catch {
    return 0;
  }
}

// Arma una ronda nueva: cuantos personajes hay que contar, cual foto se
// usa esta vez, y las 4 opciones de numero (el correcto + 3 distractores
// cercanos, sin repetir). "items" trae una rotacion chica al azar por
// cada copia de la foto, fija mientras dure la ronda (no en cada
// render), para que no se vean en fila perfecta sino desparramadas.
function generarRondaContar(caras, max) {
  const objetivo = 1 + Math.floor(Math.random() * max);
  const cara = caras[Math.floor(Math.random() * caras.length)];
  const candidatos = new Set();
  let intentos = 0;
  while (candidatos.size < 3 && intentos < 50) {
    intentos++;
    const delta = Math.floor(Math.random() * 7) - 3; // -3..3
    const val = objetivo + delta;
    if (val >= 1 && val !== objetivo) candidatos.add(val);
  }
  const opciones = shuffle([objetivo, ...candidatos]);
  const items = Array.from({ length: objetivo }, (_, i) => ({
    id: i,
    rot: Math.floor(Math.random() * 17) - 8,
  }));
  return { objetivo, cara, opciones, items };
}

// Reubicacion libre de una pieza, compartida por Rompecabezas y Ordena la
// secuencia: se puede soltar en CUALQUIER ranura (vacia u ocupada), venga
// del carrousel o de otra ranura. Si la ranura destino ya tenia otra pieza,
// esa pieza deja de estar en "posiciones" (vuelve sola al carrousel). Si se
// suelta afuera de toda ranura (destino null), la pieza vuelve al carrousel
// y, si venia de una ranura, esa queda vacia. Soltar donde mismo estaba no
// cambia nada.
function reubicarPieza(tablero, piezaId, destinoSlot) {
  const origenSlot = tablero.posiciones.indexOf(piezaId);
  if (destinoSlot === origenSlot) return tablero;
  const posiciones = [...tablero.posiciones];
  if (origenSlot !== -1) posiciones[origenSlot] = null;
  if (destinoSlot !== null) posiciones[destinoSlot] = piezaId;
  return { ...tablero, posiciones };
}

// ========== ORDENA LA SECUENCIA ==========
// Habilitado momentaneamente solo en laptop/desktop (pedido explicito,
// misma clase .memory-solo-laptop que usa Frozen dentro de Rompecabezas).
// Cada NIVEL es
// una secuencia de cuadros (3 a 12) que hay que ordenar arrastrandolos de
// un carrousel a casilleros numerados. Cada secuencia vive en
// src/assets/secuencias/<tema>/<secuencia>/NN.avif: el orden correcto es el
// del nombre de archivo (01, 02, 03...) y la cantidad de cuadros sale sola de
// cuantos archivos haya. Los niveles de un tema salen en el orden en que
// se listan en TEMAS_SECUENCIAS_META (de mas simple a mas compleja); el
// nombre y el gradiente del tema se toman de TEMAS (mismos ids).
const ENTRADAS_SECUENCIAS = import.meta.glob('../assets/secuencias/*/*/*.{png,jpg,jpeg,webp,avif}');

const TEMAS_SECUENCIAS_META = [
  {
    id: 'paw-patrol',
    secuencias: ['muneco-de-nieve'],
  },
];

const TEMAS_SECUENCIAS = TEMAS_SECUENCIAS_META.map(({ id, secuencias }) => {
  const base = TEMAS.find((t) => t.id === id);
  const niveles = secuencias
    .map((secuenciaId) => {
      const cuadros = Object.entries(ENTRADAS_SECUENCIAS)
        .map(([ruta, cargar]) => {
          const m = ruta.match(/secuencias\/([^/]+)\/([^/]+)\/([^/.]+)\.[a-z0-9]+$/i);
          return m ? { tema: m[1], secuencia: m[2], archivo: m[3], cargar } : null;
        })
        .filter((e) => e && e.tema === id && e.secuencia === secuenciaId)
        .sort((a, b) => a.archivo.localeCompare(b.archivo, undefined, { numeric: true }));
      return { id: secuenciaId, cuadros };
    })
    .filter((n) => n.cuadros.length >= 2);
  return {
    id,
    nombre: base?.nombre ?? id,
    header: base?.header,
    niveles,
    listo: niveles.length > 0,
  };
});

function nivelKeySecuencias(temaId) {
  return `musica-kids-secuencias-nivel-${temaId}`;
}

function leerNivelGuardadoSecuencias(temaId, totalNiveles) {
  try {
    const n = parseInt(localStorage.getItem(nivelKeySecuencias(temaId)), 10);
    return n >= 0 && n < totalNiveles ? n : 0;
  } catch {
    return 0;
  }
}

// Estado inicial de un nivel: mismo modelo que el Rompecabezas ("orden" del
// carrousel + "posiciones" por casillero, la pieza N va en el casillero N).
// Aqui ademas se evita que el carrousel arranque ya en el orden correcto.
function estadoInicialSecuencia(total) {
  const ids = Array.from({ length: total }, (_, i) => i);
  let orden;
  do {
    orden = shuffle(ids);
  } while (total > 1 && orden.every((v, i) => v === i));
  return { orden, posiciones: new Array(total).fill(null) };
}

// Tienen que coincidir con App.css: GAP_SEC es el "gap" de .sec-board y de
// .sec-tray, GAP_LAYOUT_SEC el de .sec-layout (separacion entre tablero y
// carrousel) y PADDING_TRAY_SEC es 2x el padding de .sec-tray. CELDA_MAX_SEC
// evita cuadros desproporcionados en un monitor gigante con pocos cuadros.
const GAP_SEC = 12;
const GAP_LAYOUT_SEC = 14;
const PADDING_TRAY_SEC = 12;
const CELDA_MAX_SEC = 380;

// Un casillero numerado del tablero: siempre es "droppable"; si tiene un
// cuadro puesto, ese cuadro ADEMAS es arrastrable (se puede mover a otro
// casillero o devolver al carrousel soltandolo afuera). useDraggable se
// llama siempre (regla de hooks) pero queda "disabled" con el casillero
// vacio. El numero se pinta encima del cuadro (no lo tapa ni intercepta el
// arrastre). "correcta" marca cuando el cuadro puesto es el que va ahi.
function RanuraSecuencia({ id, piezaId, cuadros }) {
  const { isOver, setNodeRef: setDropRef } = useDroppable({ id });
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: piezaId !== null ? piezaId : `vacia-sec-${id}`,
    disabled: piezaId === null,
  });

  return (
    <div
      ref={setDropRef}
      className={`sec-slot${piezaId !== null ? ' ocupada' : ''}${piezaId === id ? ' correcta' : ''}${isOver ? ' sobre' : ''}`}
    >
      {piezaId !== null && (
        <div
          ref={setDragRef}
          className="sec-pieza-tablero"
          style={{
            backgroundImage: `url(${cuadros[piezaId].src})`,
            opacity: isDragging ? 0.3 : 1,
          }}
          {...listeners}
          {...attributes}
          aria-label="Cuadro de la secuencia"
        />
      )}
      <span className="sec-numero" aria-hidden="true">{id + 1}</span>
    </div>
  );
}

// Un cuadro del carrousel, al mismo tamano exacto que tiene puesto en el
// tablero (ancho/alto en px por prop — nada de miniaturas). El DragOverlay
// del componente principal es el que se ve "volando" con el puntero.
function PiezaSecuencia({ id, cuadros, ancho, alto }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <button
      type="button"
      ref={setNodeRef}
      className="sec-pieza-tray"
      style={{
        width: ancho,
        height: alto,
        backgroundImage: `url(${cuadros[id].src})`,
        opacity: isDragging ? 0.3 : 1,
      }}
      {...listeners}
      {...attributes}
      aria-label="Cuadro de la secuencia"
    />
  );
}

// ========== ENCUENTRA LAS DIFERENCIAS ==========
// Habilitado de tablet para arriba (.memory-solo-tablet, igual que
// Rompecabezas), con todos sus temas; el boton "Modo desarrollador" de su
// selector queda solo en laptop. Cada JUEGO es un PAR de imagenes en
// src/assets/diferencias/<tema>/<par>/{original,modificada}.avif (la
// "imagen a" es la original, correcta; la "imagen b" es la modificada, la
// que lleva las diferencias) y las coordenadas de cada diferencia se anotan
// en src/data/diferencias.js — ese archivo explica el flujo completo,
// incluido el Modo desarrollador para sacarlas.
// Los pares salen solos de los archivos que haya; los temas y su orden se
// toman de TEMAS (mismos ids que el Memorice). Los NIVELES los arma solo el
// codigo agrupando los pares JUGABLES (con coordenadas anotadas) por la
// CANTIDAD de diferencias a encontrar, de menos a mas: un nivel = todos los
// pares que tienen la misma cantidad. Igual que Rompecabezas, al empezar un
// nivel se sortea un par al azar y para desbloquear el nivel siguiente hay
// que resolver TODOS los pares del nivel (elegirAlAzarPendiente).
// "pares" trae TODOS los pares (el Modo desarrollador los necesita para
// calibrar, tengan o no coordenadas); "niveles" solo los jugables.
const ENTRADAS_DIFERENCIAS = import.meta.glob('../assets/diferencias/*/*/*.{png,jpg,jpeg,webp,avif}');

const PARES_DIFERENCIAS = {};
for (const [ruta, cargar] of Object.entries(ENTRADAS_DIFERENCIAS)) {
  const m = ruta.match(/diferencias\/([^/]+)\/([^/]+)\/(original|modificada)\.[a-z0-9]+$/i);
  if (!m) continue;
  ((PARES_DIFERENCIAS[m[1]] ??= {})[m[2]] ??= {})[m[3].toLowerCase()] = cargar;
}

const TEMAS_DIFERENCIAS = TEMAS
  .map((t) => {
    const porPar = PARES_DIFERENCIAS[t.id] ?? {};
    const pares = Object.keys(porPar)
      .filter((pid) => porPar[pid].original && porPar[pid].modificada)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((pid) => ({
        id: pid,
        cargarOriginal: porPar[pid].original,
        cargarModificada: porPar[pid].modificada,
        diferencias: diferenciasCoordenadas[`${t.id}/${pid}`] ?? [],
      }));
    const niveles = [];
    for (const par of pares.filter((p) => p.diferencias.length > 0)) {
      const cantidad = par.diferencias.length;
      let nivel = niveles.find((n) => n.cantidad === cantidad);
      if (!nivel) {
        nivel = { cantidad, pares: [] };
        niveles.push(nivel);
      }
      nivel.pares.push(par);
    }
    niveles.sort((a, b) => a.cantidad - b.cantidad);
    return {
      id: t.id,
      nombre: t.nombre,
      header: t.header,
      pares,
      niveles,
    };
  })
  .filter((t) => t.pares.length > 0);

function nivelKeyDiferencias(temaId) {
  return `musica-kids-diferencias-nivel-${temaId}`;
}

function leerNivelGuardadoDiferencias(temaId, totalNiveles) {
  try {
    const n = parseInt(localStorage.getItem(nivelKeyDiferencias(temaId)), 10);
    return n >= 0 && n < totalNiveles ? n : 0;
  } catch {
    return 0;
  }
}

// Ids de los pares del tema que ya se resolvieron al menos una vez
// (persistidos por tema): con el nivel maximo desbloqueado deciden si un
// nivel esta completo.
function completadosKeyDiferencias(temaId) {
  return `musica-kids-diferencias-completados-${temaId}`;
}

function leerCompletadosDiferencias(temaId) {
  try {
    const lista = JSON.parse(localStorage.getItem(completadosKeyDiferencias(temaId)));
    return Array.isArray(lista) ? lista.filter((c) => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

function guardarCompletadosDiferencias(temaId, lista) {
  try {
    localStorage.setItem(completadosKeyDiferencias(temaId), JSON.stringify(lista));
  } catch {
    // Sin localStorage el progreso dura lo que dure la sesion.
  }
}

export default function MenuActividades({ onOpenChange }) {
  // 'menu' = las 2 tarjetas raiz. 'memorice'/'imprimir' = cada seccion.
  const [vista, setVista] = useState('menu');
  // Grupo cuya galeria se esta viendo dentro de "Imprimir" (null = todavia
  // en el selector de grupos).
  const [grupoImprimir, setGrupoImprimir] = useState(null);
  const [imagenesGaleria, setImagenesGaleria] = useState(null);
  const [open, setOpen] = useState(false);
  // true mientras la vista previa de una foto (Imprimir) esta abierta: el
  // Escape debe cerrar SOLO la vista previa, no todo el drawer.
  const previewGaleriaAbiertaRef = useRef(false);

  // Modo desarrollador oculto (ver arriba): estado guardado, cuenta de
  // toques al titulo y aviso breve al activarlo/desactivarlo.
  const [modoDev, setModoDev] = useState(leerModoDev);
  const [avisoDev, setAvisoDev] = useState(null);
  const toquesTituloRef = useRef({ n: 0, t: 0 });
  const avisoDevTimeoutRef = useRef(null);

  // Avisa a App si el drawer esta abierto o no: mientras lo esta, el
  // reproductor debe mostrarse como cluster flotante (MiniPlayerFab) y no
  // como la barra completa (PlayerBar), aunque no se este viendo el menu
  // de grupos de musica.
  useEffect(() => {
    onOpenChange?.(open);
  }, [open, onOpenChange]);
  // null = todavia no se eligio tema (se ve el selector).
  const [temaId, setTemaId] = useState(null);
  // null = fotos del tema todavia no pedidas/listas.
  const [fotosTema, setFotosTema] = useState(null);
  // tamano = lo que se esta jugando AHORA (puede ser un nivel ya superado,
  // si se elige "Reiniciar" y se vuelve a uno anterior). nivelMaximo = el
  // techo alcanzado de verdad en este tema, eso es lo unico que se
  // persiste — asi rejugar un nivel viejo no pisa el progreso guardado.
  const [tamano, setTamano] = useState(NIVELES[0].total);
  const [nivelMaximo, setNivelMaximo] = useState(NIVELES[0].total);
  const [mostrarNiveles, setMostrarNiveles] = useState(false);
  const [cartas, setCartas] = useState([]);
  const [volteadas, setVolteadas] = useState([]);
  const [bloqueado, setBloqueado] = useState(false);
  // { [temaId]: url } — dorsos para el selector de temas (ver abajo). Son
  // livianos (~20KB cada uno) y se piden todos apenas se abre el drawer,
  // antes incluso de elegir tema, para que el selector los pueda mostrar.
  const [dorsosSelector, setDorsosSelector] = useState({});
  const timeoutRef = useRef(null);

  // ===== Rompecabezas: mismo espiritu que el Memorice de arriba, pero
  // cada nivel agrupa varios rompecabezas con fotos propias (no se corta
  // mas fina la misma) y se juega uno elegido al azar. =====
  const [temaRompId, setTemaRompId] = useState(null);
  // null = imagen del rompecabezas todavia no pedida/lista.
  const [imagenRomp, setImagenRomp] = useState(null);
  const [nivelIdxRomp, setNivelIdxRomp] = useState(0);
  // Codigo del rompecabezas que se esta jugando dentro del nivel (el sorteo).
  const [rompIdRomp, setRompIdRomp] = useState(null);
  // Codigos de los rompecabezas ya armados del tema en juego.
  const [completadosRomp, setCompletadosRomp] = useState([]);
  const [nivelMaximoRomp, setNivelMaximoRomp] = useState(0);
  // { orden: [idx,...] (orden fijo del carrousel), posiciones: [idx|null,...] (que pieza tiene cada ranura) }
  const [tableroRomp, setTableroRomp] = useState({ orden: [], posiciones: [] });
  // Id de la pieza que se esta arrastrando ahora (para el DragOverlay).
  const [piezaArrastrandoRomp, setPiezaArrastrandoRomp] = useState(null);
  const [mostrarNivelesRomp, setMostrarNivelesRomp] = useState(false);
  // Vista previa de la imagen completa armada (boton "Ver imagen" del
  // header) — util sobre todo del nivel 2 en adelante, donde ya no hay
  // guia transparente de fondo.
  const [mostrarPreviaRomp, setMostrarPreviaRomp] = useState(false);
  // Pagina "Todos los rompecabezas" (boton del selector de temas, solo
  // laptop): un tab por tema, con todos sus niveles en miniatura.
  const [catalogoRomp, setCatalogoRomp] = useState(false);
  const [tabCatalogoRomp, setTabCatalogoRomp] = useState(null);
  // { "<temaId>-<idxNivel>": url } — se va llenando a medida que se abren tabs.
  const [miniaturasRomp, setMiniaturasRomp] = useState({});

  // ===== Contar: mismo espiritu que Memorice/Rompecabezas, reutiliza los
  // temas y fotos ya cargados (TEMAS) en vez de traer los suyos propios. =====
  const [temaContarId, setTemaContarId] = useState(null);
  // null = fotos del tema todavia no pedidas/listas.
  const [fotosTemaContar, setFotosTemaContar] = useState(null);
  const [nivelIdxContar, setNivelIdxContar] = useState(0);
  const [nivelMaximoContar, setNivelMaximoContar] = useState(0);
  // Cuantas rondas de ESTE nivel ya se contestaron bien (0..RONDAS_CONTAR).
  const [rondaIdxContar, setRondaIdxContar] = useState(0);
  // null = todavia no hay ronda armada.
  const [rondaContar, setRondaContar] = useState(null);
  // { valor, correcto } del ultimo numero tocado, mientras dura la
  // animacion de acierto/error — null en cualquier otro momento.
  const [feedbackContar, setFeedbackContar] = useState(null);
  const [bloqueadoContar, setBloqueadoContar] = useState(false);
  const [mostrarNivelesContar, setMostrarNivelesContar] = useState(false);
  const timeoutContarRef = useRef(null);

  // ===== Ordena la secuencia: cada nivel es una secuencia de cuadros que se
  // ordenan arrastrandolos; misma reubicacion libre que el Rompecabezas. =====
  const [temaSecId, setTemaSecId] = useState(null);
  const [nivelIdxSec, setNivelIdxSec] = useState(0);
  const [nivelMaximoSec, setNivelMaximoSec] = useState(0);
  // null = cuadros del nivel todavia no pedidos/listos; despues [{src, aspecto}].
  const [cuadrosSec, setCuadrosSec] = useState(null);
  // { orden: [idx,...] (orden fijo del carrousel), posiciones: [idx|null,...] }
  const [tableroSec, setTableroSec] = useState({ orden: [], posiciones: [] });
  const [piezaArrastrandoSec, setPiezaArrastrandoSec] = useState(null);
  const [mostrarNivelesSec, setMostrarNivelesSec] = useState(false);

  // ===== Encuentra las diferencias: el juego en si vive en
  // DiferenciasJuego (se reinicia volviendolo a montar con otra "key");
  // aqui solo esta lo que necesita el header y los modales del drawer. =====
  const [temaDifId, setTemaDifId] = useState(null);
  const [nivelIdxDif, setNivelIdxDif] = useState(0);
  const [nivelMaximoDif, setNivelMaximoDif] = useState(0);
  // Par sorteado dentro del nivel y ids de los pares ya resueltos del tema.
  const [parIdDif, setParIdDif] = useState(null);
  const [completadosDif, setCompletadosDif] = useState([]);
  // Cambia cada vez que se (re)empieza un nivel: es la "key" del juego.
  const [partidaDif, setPartidaDif] = useState(0);
  const [ganoDif, setGanoDif] = useState(false);
  const [mostrarNivelesDif, setMostrarNivelesDif] = useState(false);
  // Pagina del Modo desarrollador (para sacar las coordenadas).
  const [devDif, setDevDif] = useState(false);

  const tema = temaId ? TEMAS.find((t) => t.id === temaId) : null;
  const cargando = Boolean(temaId) && fotosTema === null;

  // Fotos de la galeria elegida en "Imprimir": se piden recien cuando se
  // elige un grupo puntual, no antes.
  useEffect(() => {
    if (!grupoImprimir) {
      setImagenesGaleria(null);
      return;
    }
    let vivo = true;
    const entradas = LOADERS_GALERIA[GALLERY_FOLDERS[grupoImprimir]] ?? [];
    Promise.all(entradas.map(([, cargar]) => cargar().then((m) => m.default))).then((urls) => {
      if (vivo) setImagenesGaleria(urls);
    });
    return () => {
      vivo = false;
    };
  }, [grupoImprimir]);

  const irAMemorice = useCallback(() => setVista('memorice'), []);
  const irAImprimir = useCallback(() => {
    setVista('imprimir');
    setGrupoImprimir(null);
  }, []);
  const irARompecabezas = useCallback(() => setVista('rompecabezas'), []);
  const irAContar = useCallback(() => setVista('contar'), []);
  const irASecuencias = useCallback(() => setVista('secuencias'), []);
  const irADiferencias = useCallback(() => setVista('diferencias'), []);
  const volverAlMenu = useCallback(() => {
    setVista('menu');
    setGrupoImprimir(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    let vivo = true;
    const listos = TEMAS.filter((t) => t.listo);
    Promise.all(listos.map((t) => t.back().then((m) => [t.id, m.default])))
      .then((pares) => {
        if (vivo) setDorsosSelector(Object.fromEntries(pares));
      });
    return () => {
      vivo = false;
    };
  }, [open]);

  const parejasTotal = tamano / 2;
  const parejasEncontradas = useMemo(
    () => cartas.filter((c) => c.encontrada).length / 2,
    [cartas]
  );
  const gano = cartas.length > 0 && parejasEncontradas === parejasTotal;
  const disponibles = tema ? nivelesDelTema(tema) : [];
  // Nivel = posicion (1, 2, 3...) dentro de los tableros de ESTE tema, no
  // la cantidad de cartas — es lo que se muestra en el header y en el
  // mensaje de victoria.
  const indiceNivel = disponibles.findIndex((n) => n.total === tamano);
  const nivelActual = indiceNivel + 1;
  const siguienteTamano = disponibles[indiceNivel + 1]?.total;
  // "En la frontera" = esta jugando el nivel mas alto que alcanzo — solo
  // ahi ganar desbloquea algo nuevo de verdad. Si esta rejugando uno
  // anterior (elegido desde el modal de "Reiniciar"), ganar no desbloquea
  // nada que no estuviera ya.
  const enFrontera = tamano === nivelMaximo;
  const indiceNivelMaximo = disponibles.findIndex((n) => n.total === nivelMaximo);
  const nivelesAlcanzados = disponibles.slice(0, indiceNivelMaximo + 1);

  // El techo nunca baja: si tamano llega a superar lo guardado (al ganar
  // en la frontera y pasar al siguiente), el techo avanza con el. Rejugar
  // un nivel anterior nunca dispara esto (tamano ahi es <= nivelMaximo).
  useEffect(() => {
    if (tamano > nivelMaximo) setNivelMaximo(tamano);
  }, [tamano, nivelMaximo]);

  // Elegir un tema arranca de cero: limpia lo del tema anterior (si habia)
  // y dispara la carga de fondo + dorso + caras de este.
  const elegirTema = useCallback((id) => {
    clearTimeout(timeoutRef.current);
    setTemaId(id);
    setFotosTema(null);
    setCartas([]);
    setVolteadas([]);
    setBloqueado(false);
    setMostrarNiveles(false);
  }, []);

  // Volver al selector: mismo reset que elegir tema pero sin elegir
  // ninguno — si no se limpiara fotosTema, el selector se veria con el
  // fondo del tema que se acaba de dejar en vez de neutro.
  const volverAlSelector = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setTemaId(null);
    setFotosTema(null);
    setCartas([]);
    setVolteadas([]);
    setBloqueado(false);
    setMostrarNiveles(false);
  }, []);

  useEffect(() => {
    if (!tema || !tema.listo) return;
    let vivo = true;
    Promise.all([
      tema.fondo(),
      tema.back(),
      Promise.all(tema.caras.map(({ info, cargar }) =>
        cargar().then((m) => ({ id: info.archivo, src: m.default, alt: etiquetaDesdeArchivo(info.archivo) }))
      )),
    ]).then(([fondoMod, backMod, caras]) => {
      if (vivo) setFotosTema({ fondo: fondoMod.default, back: backMod.default, caras });
    });
    return () => {
      vivo = false;
    };
  }, [tema]);

  // Primer armado del tablero para este tema, recien cuando sus fotos ya
  // estan listas: retoma el techo guardado (o el minimo, la primera vez) y
  // arranca jugando ESE nivel.
  useEffect(() => {
    if (!fotosTema || !temaId || cartas.length > 0) return;
    const disp = nivelesDelTema(tema);
    const inicial = leerNivelGuardado(temaId, disp);
    setNivelMaximo(inicial);
    setTamano(inicial);
    setCartas(crearTablero(inicial, fotosTema.caras));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotosTema]);

  // Guarda el TECHO de ESTE tema cada vez que avanza (nunca el nivel que
  // se este jugando en el momento: rejugar uno anterior no debe pisar el
  // progreso ya guardado).
  useEffect(() => {
    if (!temaId || cartas.length === 0) return;
    try {
      localStorage.setItem(nivelKey(temaId), String(nivelMaximo));
    } catch {
      // Sin localStorage el progreso dura lo que dure la sesion.
    }
  }, [temaId, nivelMaximo, cartas.length]);

  const reiniciar = useCallback((nuevoTamano) => {
    if (!fotosTema) return;
    const siguiente = nuevoTamano ?? tamano;
    clearTimeout(timeoutRef.current);
    setTamano(siguiente);
    setCartas(crearTablero(siguiente, fotosTema.caras));
    setVolteadas([]);
    setBloqueado(false);
  }, [tamano, fotosTema]);

  // ===== Rompecabezas: logica del juego =====
  const temaRomp = temaRompId ? TEMAS_ROMPECABEZAS.find((t) => t.id === temaRompId) : null;
  const cargandoRomp = Boolean(temaRompId) && imagenRomp === null;
  const nivelActualRomp = temaRomp?.niveles[nivelIdxRomp];
  // El rompecabezas sorteado, solo si pertenece al nivel actual: entre que
  // cambia el tema/nivel y se sortea de nuevo puede quedar un codigo viejo,
  // y asi se ignora en vez de cargar la foto equivocada.
  const rompActualRomp = nivelActualRomp?.rompecabezas.find((r) => r.id === rompIdRomp) ?? null;

  const elegirTemaRomp = useCallback((id) => {
    setTemaRompId(id);
    setRompIdRomp(null);
    setImagenRomp(null);
    setTableroRomp({ orden: [], posiciones: [] });
    setPiezaArrastrandoRomp(null);
    setMostrarNivelesRomp(false);
    setMostrarPreviaRomp(false);
  }, []);

  const volverAlSelectorRomp = useCallback(() => {
    setTemaRompId(null);
    setRompIdRomp(null);
    setImagenRomp(null);
    setTableroRomp({ orden: [], posiciones: [] });
    setPiezaArrastrandoRomp(null);
    setMostrarNivelesRomp(false);
    setMostrarPreviaRomp(false);
  }, []);

  // Pagina "Todos los rompecabezas": un tab por tema (solo los que ya
  // tienen algun nivel), y el tab activo cae en el primero mientras no se
  // haya elegido otro.
  const temasCatalogoRomp = TEMAS_ROMPECABEZAS.filter((t) => t.listo);
  const tabActivaRomp = temasCatalogoRomp.some((t) => t.id === tabCatalogoRomp)
    ? tabCatalogoRomp
    : temasCatalogoRomp[0]?.id;

  // Trae las imagenes de los niveles del tab activo (recien cuando se
  // abre esa pagina, y solo las del tab que se esta viendo). Los loaders de
  // import.meta.glob ya cachean el modulo, asi que volver a un tab ya
  // visto no pide nada de nuevo.
  useEffect(() => {
    if (!catalogoRomp) return;
    const tema = TEMAS_ROMPECABEZAS.find((t) => t.id === tabActivaRomp);
    if (!tema) return;
    let vivo = true;
    tema.niveles.forEach((nivel) => {
      nivel.rompecabezas.forEach((romp) => {
        // Con la proporcion real de la foto: la misma que usa el juego para
        // elegir la grilla, asi el corte que se dibuja encima es el real.
        cargarImagenConAspecto(romp.cargar).then((res) => {
          if (!vivo) return;
          setMiniaturasRomp((prev) => (prev[romp.id]?.src === res.src ? prev : { ...prev, [romp.id]: res }));
        });
      });
    });
    return () => {
      vivo = false;
    };
  }, [catalogoRomp, tabActivaRomp]);

  // Elegir un tema (o volver a elegirlo) retoma el nivel guardado de ESE
  // tema y sortea su rompecabezas antes de pedir ninguna imagen — asi el
  // efecto de carga de abajo pide la foto correcta desde el principio, no
  // la del nivel que se estaba jugando en el tema anterior.
  useEffect(() => {
    if (!temaRompId || !temaRomp) return;
    const inicial = leerNivelGuardadoRompecabezas(temaRompId, temaRomp.niveles.length);
    const completados = leerCompletadosRompecabezas(temaRompId);
    setNivelMaximoRomp(inicial);
    setNivelIdxRomp(inicial);
    setCompletadosRomp(completados);
    setRompIdRomp(elegirAlAzarPendiente(temaRomp.niveles[inicial].rompecabezas, null, completados));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temaRompId]);

  // Carga la imagen del rompecabezas sorteado (no de todo el nivel: cada
  // rompecabezas trae su propia foto) cada vez que cambia.
  useEffect(() => {
    if (!rompActualRomp) return;
    let vivo = true;
    setImagenRomp(null);
    cargarImagenConAspecto(rompActualRomp.cargar).then((res) => {
      if (vivo) setImagenRomp(res);
    });
    return () => {
      vivo = false;
    };
  }, [rompActualRomp]);

  // Arma (o rearma) el tablero apenas la imagen del rompecabezas esta lista:
  // cubre tanto la primera vez que se elige un tema como cada cambio de
  // nivel o de rompecabezas despues.
  useEffect(() => {
    if (!imagenRomp || !nivelActualRomp) return;
    setTableroRomp(estadoInicialRompecabezas(nivelActualRomp.piezas));
  }, [imagenRomp, nivelActualRomp]);

  const totalPiezasRomp = tableroRomp.posiciones.length;
  // Gana cuando CADA ranura tiene puesta justo la pieza que le corresponde
  // (no solo "todas ocupadas": podrian estar todas llenas pero mal
  // repartidas, ya que ahora cualquier pieza puede ir en cualquier lado).
  const ganoRomp = totalPiezasRomp > 0 && tableroRomp.posiciones.every((p, i) => p === i);
  // El carrousel en pantalla: las piezas de "orden" que ahora mismo no
  // estan puestas en ninguna ranura.
  const pendientesRomp = useMemo(
    () => tableroRomp.orden.filter((id) => !tableroRomp.posiciones.includes(id)),
    [tableroRomp]
  );
  const siguienteNivelIdxRomp = temaRomp && nivelIdxRomp + 1 < temaRomp.niveles.length
    ? nivelIdxRomp + 1
    : undefined;
  const enFronteraRomp = nivelIdxRomp === nivelMaximoRomp;
  const nivelesAlcanzadosRomp = temaRomp ? temaRomp.niveles.slice(0, nivelMaximoRomp + 1) : [];

  // Rompecabezas armados, contando el que se acaba de terminar (el efecto
  // que lo guarda corre un render despues, y el mensaje de victoria no debe
  // salir con la cuenta atrasada).
  const idsCompletosRomp = useMemo(
    () => (ganoRomp && rompActualRomp && !completadosRomp.includes(rompActualRomp.id)
      ? [...completadosRomp, rompActualRomp.id]
      : completadosRomp),
    [ganoRomp, rompActualRomp, completadosRomp]
  );
  // Cuantos rompecabezas del nivel actual faltan por armar. Mientras falte
  // alguno en el nivel de la frontera, el siguiente nivel sigue bloqueado.
  const faltanRomp = nivelActualRomp
    ? nivelActualRomp.rompecabezas.filter((r) => !idsCompletosRomp.includes(r.id)).length
    : 0;
  const seguirEnNivelRomp = enFronteraRomp && faltanRomp > 0;

  // Guarda cada rompecabezas apenas se arma.
  useEffect(() => {
    if (!ganoRomp || !temaRompId || !rompActualRomp) return;
    if (completadosRomp.includes(rompActualRomp.id)) return;
    const siguiente = [...completadosRomp, rompActualRomp.id];
    setCompletadosRomp(siguiente);
    guardarCompletadosRompecabezas(temaRompId, siguiente);
  }, [ganoRomp, temaRompId, rompActualRomp, completadosRomp]);

  // El techo nunca baja, misma logica que el Memorice.
  useEffect(() => {
    if (nivelIdxRomp > nivelMaximoRomp) setNivelMaximoRomp(nivelIdxRomp);
  }, [nivelIdxRomp, nivelMaximoRomp]);

  useEffect(() => {
    if (!temaRompId || totalPiezasRomp === 0) return;
    try {
      localStorage.setItem(nivelKeyRompecabezas(temaRompId), String(nivelMaximoRomp));
    } catch {
      // Sin localStorage el progreso dura lo que dure la sesion.
    }
  }, [temaRompId, nivelMaximoRomp, totalPiezasRomp]);

  // Empieza de nuevo el nivel actual o salta a otro (elegido desde
  // "Reiniciar" o al ganar): en los dos casos se sortea un rompecabezas del
  // nivel destino, sin repetir el que se estaba jugando. Cambiar de
  // rompecabezas dispara el efecto de carga de imagen de arriba, que a su
  // vez dispara el armado del tablero cuando esa foto este lista. Solo si
  // el sorteo cae en el mismo (un nivel con un unico rompecabezas) no hay
  // carga: ahi se rebaraja el tablero directamente, la imagen ya esta lista.
  const reiniciarRomp = useCallback((idx) => {
    if (!temaRomp) return;
    const siguiente = idx ?? nivelIdxRomp;
    const nivel = temaRomp.niveles[siguiente];
    if (!nivel) return;
    setPiezaArrastrandoRomp(null);
    setMostrarPreviaRomp(false);
    const nuevoId = elegirAlAzarPendiente(nivel.rompecabezas, rompIdRomp, idsCompletosRomp);
    if (siguiente === nivelIdxRomp && nuevoId === rompIdRomp) {
      setTableroRomp(estadoInicialRompecabezas(nivel.piezas));
      return;
    }
    setRompIdRomp(nuevoId);
    if (siguiente !== nivelIdxRomp) setNivelIdxRomp(siguiente);
  }, [nivelIdxRomp, temaRomp, rompIdRomp, idsCompletosRomp]);

  // Arrastrar y soltar (mouse o dedo), con reubicacion libre: una pieza se
  // puede soltar en CUALQUIER ranura (no solo la correcta), tanto si sale
  // del carrousel como si ya estaba puesta en otra ranura (se puede
  // reordenar el tablero). Si la ranura destino ya tenia otra pieza, esa
  // pieza queda "expulsada" (deja de estar en "posiciones", asi que
  // vuelve sola al carrousel). Si se suelta afuera de cualquier ranura,
  // la pieza vuelve al carrousel (si venia de una ranura, esa queda
  // vacia). PointerSensor cubre mouse; TouchSensor con un pequeno delay
  // deja que el carrousel se pueda seguir scrolleando con el dedo sin
  // arrancar un arrastre por accidente.
  const sensoresRomp = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const empezarArrastreRomp = useCallback((event) => {
    setPiezaArrastrandoRomp(event.active.id);
  }, []);

  const soltarPiezaRomp = useCallback((event) => {
    setPiezaArrastrandoRomp(null);
    const { active, over } = event;
    const piezaId = active.id;
    if (typeof piezaId !== 'number') return; // ranura vacia (draggable deshabilitado), no deberia llegar aca
    const destinoSlot = over ? over.id : null;

    setTableroRomp((prev) => reubicarPieza(prev, piezaId, destinoSlot));
  }, []);

  // Mide el layout COMPLETO (tablero + carrousel juntos, no solo el
  // tablero) porque el tamano del carrousel depende del tamano de cada
  // celda y el tamano del tablero depende de cuanto espacio le deja el
  // carrousel — se resuelve con una formula directa en vez de iterar:
  // primero se prueba el caso "el tablero entra a todo el ancho (o alto,
  // si esta de costado) y sobra lugar de sobra para el carrousel"; si no
  // alcanza, se resuelve el otro caso (el tablero es el que manda).
  // Se calculan las DOS disposiciones (carrousel abajo y carrousel al lado)
  // con las proporciones reales de la imagen y se elige la que da la celda
  // mas grande: una foto horizontal en una pantalla ancha y baja rinde mas
  // con el carrousel al lado, una vertical tambien, y una en una pantalla
  // alta y angosta rinde mas con el carrousel abajo — sin depender de como
  // este girado el dispositivo.
  const areaRefRomp = useRef(null);
  const [celdaRomp, setCeldaRomp] = useState({
    anchoTablero: 0, altoTablero: 0, columnas: 1, filas: 1,
    celdaW: 0, celdaH: 0, trayAlto: null, trayAncho: null, bandeja: 'abajo',
  });

  useLayoutEffect(() => {
    const el = areaRefRomp.current;
    if (!el || !imagenRomp || totalPiezasRomp === 0) return;
    const recalcular = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const { columnas, filas } = grillaRompecabezas(totalPiezasRomp, imagenRomp.aspecto);
      const aspecto = imagenRomp.aspecto;

      // Carrousel ABAJO: se reparte el ALTO entre tablero y carrousel.
      let abajoW;
      let abajoH;
      const boardHSiAnchoManda = width / aspecto;
      const trayAbajoPrueba = boardHSiAnchoManda / filas + PADDING_TRAY_ROMP;
      if (boardHSiAnchoManda <= height - trayAbajoPrueba - GAP_LAYOUT_ROMP) {
        abajoW = width;
        abajoH = boardHSiAnchoManda;
      } else {
        abajoH = Math.max(0, (height - PADDING_TRAY_ROMP - GAP_LAYOUT_ROMP) * filas / (filas + 1));
        abajoW = abajoH * aspecto;
      }

      // Carrousel AL LADO: se reparte el ANCHO entre tablero y carrousel.
      let ladoW;
      let ladoH;
      const boardWSiAltoManda = height * aspecto;
      const trayLadoPrueba = boardWSiAltoManda / columnas + PADDING_TRAY_ROMP;
      if (boardWSiAltoManda <= width - trayLadoPrueba - GAP_LAYOUT_ROMP) {
        ladoH = height;
        ladoW = boardWSiAltoManda;
      } else {
        ladoW = Math.max(0, (width - PADDING_TRAY_ROMP - GAP_LAYOUT_ROMP) * columnas / (columnas + 1));
        ladoH = ladoW / aspecto;
      }

      // Gana la disposicion con la celda mas grande (empate: abajo).
      const bandeja = Math.floor(ladoW / columnas) > Math.floor(abajoW / columnas) ? 'lado' : 'abajo';
      const boardW = bandeja === 'lado' ? ladoW : abajoW;
      const boardH = bandeja === 'lado' ? ladoH : abajoH;

      // Redondear a pixeles enteros y que el tablero sea multiplo EXACTO
      // de la celda: asi el grid de CSS (1fr por columna/fila) no tiene
      // ningun resto que repartirle de mas o de menos a la ultima
      // columna/fila (eso se notaba a traves de la transparencia).
      const celdaW = Math.max(0, Math.floor(boardW / columnas));
      const celdaH = Math.max(0, Math.floor(boardH / filas));

      setCeldaRomp({
        anchoTablero: celdaW * columnas,
        altoTablero: celdaH * filas,
        columnas,
        filas,
        celdaW,
        celdaH,
        trayAlto: bandeja === 'abajo' ? celdaH + PADDING_TRAY_ROMP : null,
        trayAncho: bandeja === 'lado' ? celdaW + PADDING_TRAY_ROMP : null,
        bandeja,
      });
    };
    recalcular();
    const ro = new ResizeObserver(recalcular);
    ro.observe(el);
    return () => ro.disconnect();
  }, [imagenRomp, totalPiezasRomp, open, temaRompId]);

  // ===== Contar: logica del juego =====
  const temaContar = temaContarId ? TEMAS.find((t) => t.id === temaContarId) : null;
  const cargandoContar = Boolean(temaContarId) && fotosTemaContar === null;

  const elegirTemaContar = useCallback((id) => {
    setTemaContarId(id);
    setFotosTemaContar(null);
    setRondaContar(null);
    setRondaIdxContar(0);
    setFeedbackContar(null);
    setBloqueadoContar(false);
    setMostrarNivelesContar(false);
  }, []);

  const volverAlSelectorContar = useCallback(() => {
    setTemaContarId(null);
    setFotosTemaContar(null);
    setRondaContar(null);
    setRondaIdxContar(0);
    setFeedbackContar(null);
    setBloqueadoContar(false);
    setMostrarNivelesContar(false);
  }, []);

  // Carga las fotos del tema elegido (las mismas del Memorice, ver TEMAS
  // arriba) — Contar no necesita fondo ni dorso, solo las caras.
  useEffect(() => {
    if (!temaContar) return;
    let vivo = true;
    Promise.all(temaContar.caras.map(({ info, cargar }) =>
      cargar().then((m) => ({ id: info.archivo, src: m.default, alt: etiquetaDesdeArchivo(info.archivo) }))
    )).then((caras) => {
      if (vivo) setFotosTemaContar(caras);
    });
    return () => {
      vivo = false;
    };
  }, [temaContar]);

  // Primera vez que se elige este tema: retoma el nivel guardado y arma
  // la primera ronda apenas las fotos estan listas.
  useEffect(() => {
    if (!fotosTemaContar || !temaContarId || rondaContar) return;
    const inicial = leerNivelGuardadoContar(temaContarId);
    setNivelMaximoContar(inicial);
    setNivelIdxContar(inicial);
    setRondaIdxContar(0);
    setRondaContar(generarRondaContar(fotosTemaContar, NIVELES_CONTAR[inicial].max));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotosTemaContar]);

  // Arma la siguiente ronda cada vez que se avanza (la primera la arma el
  // efecto de arriba, y no hay que armar ninguna mas una vez completado
  // el nivel).
  useEffect(() => {
    if (!fotosTemaContar || rondaIdxContar === 0 || rondaIdxContar >= RONDAS_CONTAR) return;
    setRondaContar(generarRondaContar(fotosTemaContar, NIVELES_CONTAR[nivelIdxContar].max));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rondaIdxContar]);

  const ganoNivelContar = rondaIdxContar >= RONDAS_CONTAR;
  const siguienteNivelIdxContar = nivelIdxContar + 1 < NIVELES_CONTAR.length ? nivelIdxContar + 1 : undefined;
  const enFronteraContar = nivelIdxContar === nivelMaximoContar;
  const nivelesAlcanzadosContar = NIVELES_CONTAR.slice(0, nivelMaximoContar + 1);

  // El techo nunca baja, misma logica que Memorice/Rompecabezas.
  useEffect(() => {
    if (nivelIdxContar > nivelMaximoContar) setNivelMaximoContar(nivelIdxContar);
  }, [nivelIdxContar, nivelMaximoContar]);

  useEffect(() => {
    if (!temaContarId || !rondaContar) return;
    try {
      localStorage.setItem(nivelKeyContar(temaContarId), String(nivelMaximoContar));
    } catch {
      // Sin localStorage el progreso dura lo que dure la sesion.
    }
  }, [temaContarId, nivelMaximoContar, rondaContar]);

  // Reinicia el nivel actual (rebaraja de cero, mismas fotos) o salta a
  // otro nivel (elegido desde "Reiniciar" o al ganar).
  const reiniciarContar = useCallback((idx) => {
    const siguiente = idx ?? nivelIdxContar;
    clearTimeout(timeoutContarRef.current);
    setFeedbackContar(null);
    setBloqueadoContar(false);
    setRondaIdxContar(0);
    setNivelIdxContar(siguiente);
    if (fotosTemaContar) {
      setRondaContar(generarRondaContar(fotosTemaContar, NIVELES_CONTAR[siguiente].max));
    }
  }, [nivelIdxContar, fotosTemaContar]);

  // Tocar un numero: si es el correcto, festeja y pasa a la ronda
  // siguiente (o queda "ganado" si era la ultima del nivel); si no,
  // tiembla un instante y sigue en la misma ronda — sin penalizar, mismo
  // criterio que el resto de los juegos.
  const elegirOpcionContar = useCallback((valor) => {
    if (bloqueadoContar || !rondaContar || ganoNivelContar) return;
    const correcto = valor === rondaContar.objetivo;
    setFeedbackContar({ valor, correcto });
    setBloqueadoContar(true);
    clearTimeout(timeoutContarRef.current);
    timeoutContarRef.current = setTimeout(() => {
      setFeedbackContar(null);
      setBloqueadoContar(false);
      if (correcto) setRondaIdxContar((i) => i + 1);
    }, correcto ? 700 : 450);
  }, [bloqueadoContar, rondaContar, ganoNivelContar]);

  useEffect(() => () => clearTimeout(timeoutContarRef.current), []);

  // Las fotos a contar tienen que verse grandes de verdad (pedido
  // explicito, es para una nina de 5 años) — nada de un tamano fijo
  // chico que se vea igual con 2 fotos que con 10. La forma (columnas x
  // filas) que arma la celda mas grande posible en el espacio real
  // disponible la elige mejorGrillaContar, segun la cantidad de fotos de
  // ESTA ronda.
  const areaRefContar = useRef(null);
  const [grillaContar, setGrillaContar] = useState({ columnas: 1, celda: 0 });

  useLayoutEffect(() => {
    const el = areaRefContar.current;
    if (!el || !rondaContar) return;
    const recalcular = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      setGrillaContar(mejorGrillaContar(rondaContar.items.length, width, height));
    };
    recalcular();
    const ro = new ResizeObserver(recalcular);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rondaContar]);

  // ===== Ordena la secuencia: logica del juego =====
  const temaSec = temaSecId ? TEMAS_SECUENCIAS.find((t) => t.id === temaSecId) : null;
  const cargandoSec = Boolean(temaSecId) && cuadrosSec === null;
  const nivelActualSec = temaSec?.niveles[nivelIdxSec];

  const elegirTemaSec = useCallback((id) => {
    setTemaSecId(id);
    setCuadrosSec(null);
    setTableroSec({ orden: [], posiciones: [] });
    setPiezaArrastrandoSec(null);
    setMostrarNivelesSec(false);
  }, []);

  const volverAlSelectorSec = useCallback(() => {
    setTemaSecId(null);
    setCuadrosSec(null);
    setTableroSec({ orden: [], posiciones: [] });
    setPiezaArrastrandoSec(null);
    setMostrarNivelesSec(false);
  }, []);

  // Elegir un tema retoma el nivel guardado de ESE tema antes de pedir
  // ningun cuadro, asi el efecto de carga de abajo (que depende del nivel)
  // pide los cuadros correctos desde el principio.
  useEffect(() => {
    if (!temaSecId || !temaSec) return;
    const inicial = leerNivelGuardadoSecuencias(temaSecId, temaSec.niveles.length);
    setNivelMaximoSec(inicial);
    setNivelIdxSec(inicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temaSecId]);

  // Carga TODOS los cuadros de ESTE nivel (y de paso mide sus proporciones)
  // cada vez que cambia el tema o el nivel elegido.
  useEffect(() => {
    if (!nivelActualSec) return;
    let vivo = true;
    setCuadrosSec(null);
    // Tambien se vacia el tablero: si no, al terminar de cargar los cuadros
    // del nivel nuevo habria un render con las posiciones del nivel anterior
    // (que pueden apuntar a cuadros que ya no existen si el nuevo es mas corto).
    setTableroSec({ orden: [], posiciones: [] });
    Promise.all(nivelActualSec.cuadros.map((c) => cargarImagenConAspecto(c.cargar))).then((res) => {
      if (vivo) setCuadrosSec(res);
    });
    return () => {
      vivo = false;
    };
  }, [nivelActualSec]);

  // Arma (o rearma) el tablero apenas los cuadros de este nivel estan listos.
  useEffect(() => {
    if (!cuadrosSec) return;
    setTableroSec(estadoInicialSecuencia(cuadrosSec.length));
  }, [cuadrosSec]);

  const totalSec = tableroSec.posiciones.length;
  // Gana cuando CADA casillero tiene puesto justo el cuadro que le
  // corresponde (no basta con que esten todos ocupados).
  const ganoSec = totalSec > 0 && tableroSec.posiciones.every((p, i) => p === i);
  // El carrousel en pantalla: los cuadros de "orden" que ahora mismo no
  // estan puestos en ningun casillero.
  const pendientesSec = useMemo(
    () => tableroSec.orden.filter((id) => !tableroSec.posiciones.includes(id)),
    [tableroSec]
  );
  const siguienteNivelIdxSec = temaSec && nivelIdxSec + 1 < temaSec.niveles.length
    ? nivelIdxSec + 1
    : undefined;
  const enFronteraSec = nivelIdxSec === nivelMaximoSec;
  const nivelesAlcanzadosSec = temaSec ? temaSec.niveles.slice(0, nivelMaximoSec + 1) : [];

  // El techo nunca baja, misma logica que el resto de los juegos.
  useEffect(() => {
    if (nivelIdxSec > nivelMaximoSec) setNivelMaximoSec(nivelIdxSec);
  }, [nivelIdxSec, nivelMaximoSec]);

  useEffect(() => {
    if (!temaSecId || totalSec === 0) return;
    try {
      localStorage.setItem(nivelKeySecuencias(temaSecId), String(nivelMaximoSec));
    } catch {
      // Sin localStorage el progreso dura lo que dure la sesion.
    }
  }, [temaSecId, nivelMaximoSec, totalSec]);

  // Reinicia el nivel actual (rebaraja nomas, los cuadros ya estan listos) o
  // salta a otro nivel (elegido desde "Reiniciar" o al ganar): cambiar de
  // nivel dispara la carga de cuadros de arriba y luego el armado del tablero.
  const reiniciarSec = useCallback((idx) => {
    const siguiente = idx ?? nivelIdxSec;
    setPiezaArrastrandoSec(null);
    if (siguiente === nivelIdxSec) {
      if (cuadrosSec) setTableroSec(estadoInicialSecuencia(cuadrosSec.length));
    } else {
      setNivelIdxSec(siguiente);
    }
  }, [nivelIdxSec, cuadrosSec]);

  // Arrastrar y soltar con reubicacion libre (ver reubicarPieza): mismos
  // sensores que el Rompecabezas — el TouchSensor con un pequeno delay
  // deja scrollear el carrousel con el dedo sin arrancar un arrastre.
  const sensoresSec = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const empezarArrastreSec = useCallback((event) => {
    setPiezaArrastrandoSec(event.active.id);
  }, []);

  const soltarPiezaSec = useCallback((event) => {
    setPiezaArrastrandoSec(null);
    const { active, over } = event;
    const piezaId = active.id;
    if (typeof piezaId !== 'number') return; // casillero vacio (draggable deshabilitado), no deberia llegar aqui
    const destinoSlot = over ? over.id : null;
    setTableroSec((prev) => reubicarPieza(prev, piezaId, destinoSlot));
  }, []);

  // Mide el layout COMPLETO (tablero + carrousel) y elige cuantos casilleros
  // por fila (de 1 a N) da el cuadro mas grande posible sin desbordar: el
  // tablero ocupa "filas" filas y el carrousel una fila mas del mismo
  // tamano (cuadros a tamano real, no miniaturas). Con 3-4 cuadros sale
  // todo en una fila; con hasta 12 se reparte solo en varias.
  const areaRefSec = useRef(null);
  const [celdaSec, setCeldaSec] = useState({ columnas: 1, filas: 1, celdaW: 0, celdaH: 0 });

  useLayoutEffect(() => {
    const el = areaRefSec.current;
    if (!el || !cuadrosSec || totalSec === 0) return;
    const recalcular = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const aspecto = cuadrosSec[0].aspecto;
      let mejor = null;
      for (let columnas = 1; columnas <= totalSec; columnas++) {
        const filas = Math.ceil(totalSec / columnas);
        // El carrousel mide el ancho del tablero MAS su padding (12px), asi
        // que ese padding tambien se descuenta del ancho disponible.
        const wPorAncho = (width - PADDING_TRAY_SEC - (columnas - 1) * GAP_SEC) / columnas;
        const hLibre = (height - (filas - 1) * GAP_SEC - GAP_LAYOUT_SEC - PADDING_TRAY_SEC) / (filas + 1);
        const w = Math.min(wPorAncho, hLibre * aspecto, CELDA_MAX_SEC);
        if (!mejor || w > mejor.w) mejor = { columnas, filas, w };
      }
      const celdaW = Math.max(0, Math.floor(mejor.w));
      const celdaH = Math.max(0, Math.floor(mejor.w / aspecto));
      setCeldaSec({ columnas: mejor.columnas, filas: mejor.filas, celdaW, celdaH });
    };
    recalcular();
    const ro = new ResizeObserver(recalcular);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cuadrosSec, totalSec, open, temaSecId]);

  // ===== Encuentra las diferencias: logica del drawer =====
  const temaDif = temaDifId ? TEMAS_DIFERENCIAS.find((t) => t.id === temaDifId) : null;
  const nivelActualDif = temaDif?.niveles[nivelIdxDif];
  // El par sorteado, solo si pertenece al nivel actual (mismo criterio que
  // Rompecabezas: un codigo viejo no debe cargar el par equivocado).
  const parActualDif = nivelActualDif?.pares.find((p) => p.id === parIdDif) ?? null;

  // Elegir un tema retoma el nivel guardado de ESE tema y sortea su par. No
  // hay nada que cargar aqui: las imagenes las pide DiferenciasJuego al
  // montarse.
  const elegirTemaDif = useCallback((id) => {
    const t = TEMAS_DIFERENCIAS.find((x) => x.id === id);
    if (!t || t.niveles.length === 0) return;
    const inicial = leerNivelGuardadoDiferencias(id, t.niveles.length);
    const completados = leerCompletadosDiferencias(id);
    setTemaDifId(id);
    setNivelIdxDif(inicial);
    setNivelMaximoDif(inicial);
    setCompletadosDif(completados);
    setParIdDif(elegirAlAzarPendiente(t.niveles[inicial].pares, null, completados));
    setPartidaDif((p) => p + 1);
    setGanoDif(false);
    setMostrarNivelesDif(false);
  }, []);

  const volverAlSelectorDif = useCallback(() => {
    setTemaDifId(null);
    setParIdDif(null);
    setGanoDif(false);
    setMostrarNivelesDif(false);
  }, []);

  // Par completo (lo avisa DiferenciasJuego al encontrar la ultima).
  const marcarGanoDif = useCallback(() => setGanoDif(true), []);

  const siguienteNivelIdxDif = temaDif && nivelIdxDif + 1 < temaDif.niveles.length
    ? nivelIdxDif + 1
    : undefined;
  // El "numero" de un nivel de diferencias es su cantidad de diferencias (el
  // primer nivel de un tema que solo tiene juegos de 3 es el "Nivel 3").
  const numeroSiguienteNivelDif = siguienteNivelIdxDif !== undefined
    ? temaDif.niveles[siguienteNivelIdxDif].cantidad
    : null;
  const enFronteraDif = nivelIdxDif === nivelMaximoDif;
  const nivelesAlcanzadosDif = temaDif ? temaDif.niveles.slice(0, nivelMaximoDif + 1) : [];

  // Pares resueltos, contando el que se acaba de terminar (el efecto que lo
  // guarda corre un render despues, y el mensaje de victoria no debe salir
  // con la cuenta atrasada).
  const idsCompletosDif = useMemo(
    () => (ganoDif && parActualDif && !completadosDif.includes(parActualDif.id)
      ? [...completadosDif, parActualDif.id]
      : completadosDif),
    [ganoDif, parActualDif, completadosDif]
  );
  // Cuantos pares del nivel actual faltan por resolver. Mientras falte
  // alguno en el nivel de la frontera, el siguiente nivel sigue bloqueado.
  const faltanDif = nivelActualDif
    ? nivelActualDif.pares.filter((p) => !idsCompletosDif.includes(p.id)).length
    : 0;
  const seguirEnNivelDif = enFronteraDif && faltanDif > 0;

  // Guarda cada par apenas se resuelve.
  useEffect(() => {
    if (!ganoDif || !temaDifId || !parActualDif) return;
    if (completadosDif.includes(parActualDif.id)) return;
    const siguiente = [...completadosDif, parActualDif.id];
    setCompletadosDif(siguiente);
    guardarCompletadosDiferencias(temaDifId, siguiente);
  }, [ganoDif, temaDifId, parActualDif, completadosDif]);

  // Empieza de nuevo el nivel actual o salta a otro (elegido desde
  // "Reiniciar" o al ganar): en los dos casos se sortea un par del nivel
  // destino, sin repetir el que se estaba jugando. Volver a montar el juego
  // (otra "key") limpia lo encontrado.
  const reiniciarDif = useCallback((idx) => {
    if (!temaDif) return;
    const siguiente = idx ?? nivelIdxDif;
    const nivel = temaDif.niveles[siguiente];
    if (!nivel) return;
    setNivelIdxDif(siguiente);
    setParIdDif(elegirAlAzarPendiente(nivel.pares, parIdDif, idsCompletosDif));
    setPartidaDif((p) => p + 1);
    setGanoDif(false);
    setMostrarNivelesDif(false);
  }, [temaDif, nivelIdxDif, parIdDif, idsCompletosDif]);

  // El techo nunca baja, misma logica que el resto de los juegos.
  useEffect(() => {
    if (nivelIdxDif > nivelMaximoDif) setNivelMaximoDif(nivelIdxDif);
  }, [nivelIdxDif, nivelMaximoDif]);

  useEffect(() => {
    if (!temaDifId) return;
    try {
      localStorage.setItem(nivelKeyDiferencias(temaDifId), String(nivelMaximoDif));
    } catch {
      // Sin localStorage el progreso dura lo que dure la sesion.
    }
  }, [temaDifId, nivelMaximoDif]);

  // Al cerrar el drawer se vuelve a foja cero: la proxima vez que se abre,
  // arranca en el menu general de nuevo (pedido explicito, extendido del
  // "siempre elegir tema de nuevo" que ya regia solo para Memorice).
  useEffect(() => {
    if (open) return;
    clearTimeout(timeoutRef.current);
    previewGaleriaAbiertaRef.current = false;
    setVista('menu');
    setGrupoImprimir(null);
    setTemaId(null);
    setFotosTema(null);
    setCartas([]);
    setVolteadas([]);
    setBloqueado(false);
    setMostrarNiveles(false);
    setTemaRompId(null);
    setImagenRomp(null);
    setTableroRomp({ orden: [], posiciones: [] });
    setPiezaArrastrandoRomp(null);
    setMostrarNivelesRomp(false);
    setMostrarPreviaRomp(false);
    setCatalogoRomp(false);
    setTabCatalogoRomp(null);
    setNivelIdxRomp(0);
    clearTimeout(timeoutContarRef.current);
    setTemaContarId(null);
    setFotosTemaContar(null);
    setRondaContar(null);
    setRondaIdxContar(0);
    setFeedbackContar(null);
    setBloqueadoContar(false);
    setMostrarNivelesContar(false);
    setNivelIdxContar(0);
    setTemaSecId(null);
    setCuadrosSec(null);
    setTableroSec({ orden: [], posiciones: [] });
    setPiezaArrastrandoSec(null);
    setMostrarNivelesSec(false);
    setNivelIdxSec(0);
    setTemaDifId(null);
    setParIdDif(null);
    setGanoDif(false);
    setMostrarNivelesDif(false);
    setDevDif(false);
    setNivelIdxDif(0);
  }, [open]);

  // Volver desde donde sea: dentro de Memorice, si hay tema elegido vuelve
  // al selector de temas (como antes); si ya estaba en el selector, sube
  // al menu general. Dentro de Imprimir, misma logica con el grupo elegido.
  // Dentro de Rompecabezas/Contar, misma logica con el tema elegido.
  const manejarVolver = useCallback(() => {
    if (vista === 'memorice') {
      if (temaId) volverAlSelector();
      else volverAlMenu();
    } else if (vista === 'imprimir') {
      if (grupoImprimir) setGrupoImprimir(null);
      else volverAlMenu();
    } else if (vista === 'contar') {
      if (temaContarId) volverAlSelectorContar();
      else volverAlMenu();
    } else if (vista === 'secuencias') {
      if (temaSecId) volverAlSelectorSec();
      else volverAlMenu();
    } else if (vista === 'diferencias') {
      if (devDif) setDevDif(false);
      else if (temaDifId) volverAlSelectorDif();
      else volverAlMenu();
    } else if (vista === 'rompecabezas') {
      if (catalogoRomp) setCatalogoRomp(false);
      else if (temaRompId) volverAlSelectorRomp();
      else volverAlMenu();
    }
  }, [vista, temaId, grupoImprimir, temaRompId, catalogoRomp, temaContarId, temaSecId, devDif, temaDifId, volverAlSelector, volverAlMenu, volverAlSelectorRomp, volverAlSelectorContar, volverAlSelectorSec, volverAlSelectorDif]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);
  useEffect(() => () => clearTimeout(avisoDevTimeoutRef.current), []);

  // Toque al titulo "Actividades": solo cuenta en el menu principal del
  // drawer (el h2 solo lleva este onClick alli, y aqui se vuelve a chequear).
  // Toques seguidos, cada uno a menos de VENTANA_TOQUES_MS del anterior; al
  // llegar a TOQUES_MODO_DEV se alterna el modo desarrollador.
  const tocarTitulo = useCallback(() => {
    if (vista !== 'menu') return;
    const ahora = Date.now();
    const cuenta = toquesTituloRef.current;
    cuenta.n = ahora - cuenta.t <= VENTANA_TOQUES_MS ? cuenta.n + 1 : 1;
    cuenta.t = ahora;
    if (cuenta.n < TOQUES_MODO_DEV) return;

    cuenta.n = 0;
    const nuevo = !modoDev;
    try {
      localStorage.setItem(MODO_DEV_KEY, nuevo ? '1' : '0');
    } catch {
      // Sin localStorage el modo dura lo que dure la sesion.
    }
    setModoDev(nuevo);
    setAvisoDev(nuevo ? 'Modo desarrollador activado' : 'Modo desarrollador desactivado');
    clearTimeout(avisoDevTimeoutRef.current);
    avisoDevTimeoutRef.current = setTimeout(() => setAvisoDev(null), 2600);
  }, [vista, modoDev]);

  // Salir del menu principal (o cerrar el drawer) reinicia la cuenta.
  useEffect(() => {
    toquesTituloRef.current = { n: 0, t: 0 };
  }, [vista, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      // Con la vista previa de una foto abierta, el Escape lo maneja ella
      // (se cierra sola) y el drawer se queda como esta.
      if (previewGaleriaAbiertaRef.current) return;
      setOpen(false);
    };
    // Fase de captura: corre ANTES que el cierre de la vista previa, asi
    // todavia ve el ref en true (si corriera despues, la vista previa ya se
    // habria cerrado y el mismo Escape cerraria tambien el drawer).
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  const voltearCarta = useCallback((uid) => {
    if (bloqueado || gano) return;
    const carta = cartas.find((c) => c.uid === uid);
    if (!carta || carta.volteada || carta.encontrada) return;

    const nuevasVolteadas = [...volteadas, uid];
    setCartas((prev) => prev.map((c) => (c.uid === uid ? { ...c, volteada: true } : c)));
    setVolteadas(nuevasVolteadas);

    if (nuevasVolteadas.length < 2) return;

    setBloqueado(true);
    const [idA, idB] = nuevasVolteadas;
    const caraA = cartas.find((c) => c.uid === idA)?.cara;
    const esPar = caraA?.id === carta.cara.id;

    timeoutRef.current = setTimeout(() => {
      setCartas((prev) => prev.map((c) => {
        if (c.uid !== idA && c.uid !== idB) return c;
        return esPar ? { ...c, encontrada: true } : { ...c, volteada: false };
      }));
      setVolteadas([]);
      setBloqueado(false);
    }, esPar ? ESPERA_MATCH_MS : ESPERA_ERROR_MS);
  }, [bloqueado, gano, cartas, volteadas]);

  // Mide el espacio real disponible (el area donde va el tablero, dentro
  // del drawer) y elige, de todas las formas (columnas x filas) que arman
  // el total de cartas, la que da la celda cuadrada mas grande sin
  // scroll — asi no queda una columna de mas con espacio vertical
  // sobrante cuando el alto disponible alcanzaria para una fila extra
  // (pedido explicito). ResizeObserver hace que esto se recalcule solo
  // con cualquier cambio de tamano de la ventana, incluida la rotacion.
  const areaRef = useRef(null);
  const [celda, setCelda] = useState(0);
  const [grilla, setGrilla] = useState({ columnas: 1, filas: tamano });

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const recalcular = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      let mejor = null;
      for (const par of paresDivisores(tamano)) {
        const porAncho = (width - (par.columnas - 1) * GAP) / par.columnas;
        const porAlto = (height - (par.filas - 1) * GAP) / par.filas;
        const tam = Math.min(porAncho, porAlto, CELDA_MAX);
        if (!mejor || tam > mejor.tam) mejor = { ...par, tam };
      }
      setGrilla({ columnas: mejor.columnas, filas: mejor.filas });
      setCelda(Math.max(0, Math.floor(mejor.tam)));
    };
    recalcular();
    const ro = new ResizeObserver(recalcular);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tamano, open, temaId]);

  const columnas = grilla.columnas;
  const filas = grilla.filas;

  // Que muestra el header segun la vista (titulo y volver). El header es
  // transparente en TODAS las paginas (pedido explicito), asi que
  // "colorHeader" ya no pinta nada: solo distingue las pantallas de "menu"
  // (raiz, elegir tema, elegir grupo, catalogo — sin color) de las de
  // juego/galeria (con color), para decidir el fondo del drawer: los menus
  // llevan el fondo pastel de la pagina de Casa de Muñecas del reproductor.
  const grupoImprimirInfo = grupoImprimir
    ? GRUPOS_IMPRIMIBLES.find((g) => g.id === grupoImprimir)
    : null;
  let tituloHeader = 'Actividades';
  let mostrarVolver = false;
  let colorHeader;
  if (vista === 'memorice') {
    mostrarVolver = true;
    tituloHeader = temaId ? tema.nombre : 'Memorice';
    colorHeader = tema?.header;
  } else if (vista === 'imprimir') {
    mostrarVolver = true;
    tituloHeader = grupoImprimirInfo?.nombre ?? 'Imprimir';
    colorHeader = grupoImprimirInfo?.header;
  } else if (vista === 'rompecabezas') {
    mostrarVolver = true;
    tituloHeader = catalogoRomp ? 'Todos los rompecabezas' : temaRompId ? temaRomp.nombre : 'Rompecabezas';
    colorHeader = catalogoRomp ? undefined : temaRomp?.header;
  } else if (vista === 'contar') {
    mostrarVolver = true;
    tituloHeader = temaContarId ? temaContar.nombre : 'Contar';
    colorHeader = temaContar?.header;
  } else if (vista === 'secuencias') {
    mostrarVolver = true;
    tituloHeader = temaSecId ? temaSec.nombre : 'Ordena la secuencia';
    colorHeader = temaSec?.header;
  } else if (vista === 'diferencias') {
    mostrarVolver = true;
    tituloHeader = devDif ? 'Modo desarrollador' : temaDifId ? temaDif.nombre : 'Encuentra las diferencias';
    colorHeader = devDif ? undefined : temaDif?.header;
  }
  const esMenu = !colorHeader;

  let estiloDrawer;
  if (vista === 'memorice' && fotosTema) {
    estiloDrawer = { backgroundImage: `url(${fotosTema.fondo})` };
  } else if (esMenu) {
    estiloDrawer = { background: themes.munecas.gradient };
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="theme-trigger-btn memory-trigger-btn"
        aria-label="Abrir menú"
      >
        <BarsOutlined />
      </button>

      {open && createPortal(
        <div className="memory-overlay" onClick={() => setOpen(false)}>
          <div
            className={`memory-drawer${modoDev ? ' memory-dev' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={estiloDrawer}
          >
            <div className="memory-drawer-header">
              <div className="memory-drawer-title">
                {mostrarVolver ? (
                  <div className="memory-titulo-fila">
                    <button
                      type="button"
                      className="memory-volver-btn"
                      onClick={manejarVolver}
                      aria-label="Volver"
                    >
                      <LeftOutlined />
                    </button>
                    <h2>{tituloHeader}</h2>
                  </div>
                ) : (
                  // Solo el titulo del menu principal cuenta los toques del
                  // modo desarrollador oculto (tocarTitulo).
                  <h2 className="memory-titulo-secreto" onClick={tocarTitulo}>{tituloHeader}</h2>
                )}
              </div>
              {/* Centrado real (no space-between): el bloque de la
                  izquierda cambia de ancho segun el titulo, asi que solo un
                  grid de 3 columnas deja esto siempre al medio del header
                  sin importar eso. */}
              <div className="memory-header-centro">
                {vista === 'menu' && modoDev && (
                  <span className="memory-dev-chip">Modo desarrollador</span>
                )}
                {vista === 'memorice' && temaId && !cargando && (
                  <span className="memory-nivel-badge">Nivel {nivelActual}</span>
                )}
                {vista === 'rompecabezas' && temaRompId && !cargandoRomp && (
                  <span className="memory-nivel-badge">Nivel {nivelIdxRomp + 1}</span>
                )}
                {vista === 'contar' && temaContarId && !cargandoContar && (
                  <span className="memory-nivel-badge">Nivel {nivelIdxContar + 1}</span>
                )}
                {vista === 'secuencias' && temaSecId && !cargandoSec && (
                  <span className="memory-nivel-badge">Nivel {nivelIdxSec + 1}</span>
                )}
                {vista === 'diferencias' && temaDifId && !devDif && (
                  <span className="memory-nivel-badge">Nivel {temaDif?.niveles[nivelIdxDif]?.cantidad}</span>
                )}
              </div>
              <div className="memory-header-actions">
                {vista === 'memorice' && temaId && !cargando && !gano && (
                  <button
                    type="button"
                    className="memory-reiniciar-btn"
                    onClick={() => setMostrarNiveles(true)}
                  >
                    <ReloadOutlined /> Reiniciar
                  </button>
                )}
                {vista === 'rompecabezas' && temaRompId && !cargandoRomp && !ganoRomp && (
                  <button
                    type="button"
                    className="memory-reiniciar-btn romp-ver-imagen-btn"
                    onClick={() => setMostrarPreviaRomp(true)}
                    aria-label="Ver la imagen completa"
                  >
                    <img src={imagenRomp.src} alt="" className="romp-ver-imagen-miniatura" />
                  </button>
                )}
                {vista === 'rompecabezas' && temaRompId && !cargandoRomp && !ganoRomp && (
                  <button
                    type="button"
                    className="memory-reiniciar-btn"
                    onClick={() => setMostrarNivelesRomp(true)}
                  >
                    <ReloadOutlined /> Reiniciar
                  </button>
                )}
                {vista === 'contar' && temaContarId && !cargandoContar && !ganoNivelContar && (
                  <button
                    type="button"
                    className="memory-reiniciar-btn"
                    onClick={() => setMostrarNivelesContar(true)}
                  >
                    <ReloadOutlined /> Reiniciar
                  </button>
                )}
                {vista === 'secuencias' && temaSecId && !cargandoSec && !ganoSec && (
                  <button
                    type="button"
                    className="memory-reiniciar-btn"
                    onClick={() => setMostrarNivelesSec(true)}
                  >
                    <ReloadOutlined /> Reiniciar
                  </button>
                )}
                {vista === 'diferencias' && temaDifId && !devDif && !ganoDif && (
                  <button
                    type="button"
                    className="memory-reiniciar-btn"
                    onClick={() => setMostrarNivelesDif(true)}
                  >
                    <ReloadOutlined /> Reiniciar
                  </button>
                )}
                <button
                  type="button"
                  className="memory-cerrar-x"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                >
                  <CloseOutlined />
                </button>
              </div>
            </div>

            <div className="memory-body">
              {vista === 'menu' && (
                <div className="memory-picker">
                  <div className="memory-picker-grid">
                    <button
                      type="button"
                      className="memory-picker-tile memory-solo-tablet"
                      onClick={irAMemorice}
                      aria-label="Jugar Memorice"
                    >
                      <span className="memory-picker-img-wrap">
                        <img src={imagenMemorice} alt="" className="memory-picker-img" />
                      </span>
                      <span className="memory-picker-nombre">Memorice</span>
                    </button>
                    <button
                      type="button"
                      className="memory-picker-tile"
                      onClick={irAImprimir}
                      aria-label="Imprimir"
                    >
                      <span className="memory-picker-img-wrap">
                        <img src={imagenImprimir} alt="" className="memory-picker-img" />
                      </span>
                      <span className="memory-picker-nombre">Imprimir</span>
                    </button>
                    {ROMPECABEZAS_HABILITADO && (
                      <button
                        type="button"
                        className="memory-picker-tile memory-solo-tablet"
                        onClick={irARompecabezas}
                        aria-label="Rompecabezas"
                      >
                        <span className="memory-picker-img-wrap">
                          <img src={imagenRompecabezas} alt="" className="memory-picker-img" />
                        </span>
                        <span className="memory-picker-nombre">Rompecabezas</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="memory-picker-tile memory-solo-tablet"
                      onClick={irAContar}
                      aria-label="Contar"
                    >
                      <span className="memory-picker-img-wrap">
                        <img src={imagenContar} alt="" className="memory-picker-img" />
                      </span>
                      <span className="memory-picker-nombre">Contar</span>
                    </button>
                    <button
                      type="button"
                      className="memory-picker-tile memory-solo-laptop"
                      onClick={irASecuencias}
                      aria-label="Ordena la secuencia"
                    >
                      <span className="memory-picker-img-wrap">
                        <img src={imagenSecuencias} alt="" className="memory-picker-img" />
                      </span>
                      <span className="memory-picker-nombre">Ordena la secuencia</span>
                    </button>
                    <button
                      type="button"
                      className="memory-picker-tile memory-solo-tablet"
                      onClick={irADiferencias}
                      aria-label="Encuentra las diferencias"
                    >
                      <span className="memory-picker-img-wrap">
                        <img src={imagenDiferencias} alt="" className="memory-picker-img" />
                      </span>
                      <span className="memory-picker-nombre">Encuentra las diferencias</span>
                    </button>
                  </div>
                </div>
              )}

              {vista === 'imprimir' && (
                grupoImprimir === null ? (
                  <div className="memory-picker">
                    <div className="memory-picker-grid">
                      {GRUPOS_IMPRIMIBLES.map((g) => (
                        <button
                          type="button"
                          key={g.id}
                          className="memory-picker-tile"
                          onClick={() => setGrupoImprimir(g.id)}
                          aria-label={`Ver fotos de ${g.nombre}`}
                        >
                          <span className="memory-picker-img-wrap">
                            {g.cover ? (
                              <img src={g.cover} alt="" className="memory-picker-img" />
                            ) : (
                              <PictureOutlined className="memory-picker-placeholder" aria-hidden="true" />
                            )}
                          </span>
                          <span className="memory-picker-nombre">{g.nombre}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="gallery-body">
                    {imagenesGaleria === null ? (
                      <p className="gallery-empty">Cargando fotos...</p>
                    ) : imagenesGaleria.length === 0 ? (
                      <p className="gallery-empty">Muy pronto van a haber fotos aca.</p>
                    ) : (
                      // Al tocar una foto se abre la vista previa de antd
                      // (zoom, girar, y pasar a la siguiente/anterior
                      // gracias al PreviewGroup). El z-index la sube por
                      // encima del drawer; el "hover" con texto en ingles
                      // que trae por defecto se apaga (cover:false).
                      <Image.PreviewGroup
                        preview={{
                          zIndex: Z_PREVIEW_GALERIA,
                          onOpenChange: (abierta) => {
                            previewGaleriaAbiertaRef.current = abierta;
                          },
                          // Boton de imprimir al final de la barra de la
                          // vista previa: imprime SOLO la foto que se esta
                          // viendo en ese momento (info.image.url cambia al
                          // pasar de una foto a otra), no la pagina. Reusa
                          // la clase de los botones de antd para verse igual.
                          actionsRender: (originalNode, info) => cloneElement(
                            originalNode,
                            undefined,
                            ...Children.toArray(originalNode.props.children),
                            <button
                              type="button"
                              key="imprimir"
                              className="ant-image-preview-actions-action"
                              onClick={() => imprimirImagen(info.image.url)}
                              aria-label="Imprimir esta imagen"
                              title="Imprimir esta imagen"
                            >
                              <PrinterOutlined />
                            </button>
                          ),
                        }}
                      >
                        {imagenesGaleria.map((src) => (
                          <Image
                            key={src}
                            src={src}
                            alt=""
                            rootClassName="gallery-img-root"
                            className="gallery-img"
                            loading="lazy"
                            preview={{ cover: false }}
                          />
                        ))}
                      </Image.PreviewGroup>
                    )}
                  </div>
                )
              )}

              {vista === 'memorice' && (!temaId ? (
                <div className="memory-picker">
                  <div className="memory-picker-grid">
                    {TEMAS.filter((t) => !t.oculto).map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        className={`memory-picker-tile${t.soloLaptop ? ' memory-solo-laptop' : ''}`}
                        onClick={() => elegirTema(t.id)}
                        disabled={!t.listo}
                        aria-label={t.listo ? `Jugar con ${t.nombre}` : `${t.nombre} (muy pronto)`}
                      >
                        <span className="memory-picker-img-wrap">
                          {dorsosSelector[t.id] ? (
                            <img src={dorsosSelector[t.id]} alt="" className="memory-picker-img" />
                          ) : (
                            <PictureOutlined className="memory-picker-placeholder" aria-hidden="true" />
                          )}
                        </span>
                        <span className="memory-picker-nombre">{t.nombre}</span>
                        {!t.listo && <span className="memory-picker-badge">Muy pronto</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Modal superpuesto (no un elemento en el flujo): no debe
                      correr ni achicar la fila de cartas al aparecer. */}
                  {gano && (
                    <div className="memory-victoria-overlay">
                      <div className="memory-victoria">
                        <span className="memory-victoria-emoji">🎉</span>
                        <p>
                          {!siguienteTamano
                            ? '¡Completaste todos los niveles!'
                            : enFrontera
                              ? `¡Nivel ${nivelActual + 1} desbloqueado!`
                              : '¡Ganaste de nuevo!'}
                        </p>
                        <button
                          type="button"
                          className="memory-victoria-btn"
                          onClick={() => reiniciar(siguienteTamano ?? tamano)}
                        >
                          {siguienteTamano ? 'Jugar nivel siguiente' : 'Jugar de nuevo'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Modal de niveles: se abre desde "Reiniciar". Solo
                      niveles YA alcanzados (incluido el actual) — no deja
                      saltar a uno todavia no jugado. */}
                  {mostrarNiveles && (
                    <div
                      className="memory-victoria-overlay"
                      onClick={() => setMostrarNiveles(false)}
                    >
                      <div className="memory-niveles-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="memory-niveles-header">
                          <h3>Elige un nivel</h3>
                          <button
                            type="button"
                            className="memory-cerrar-x memory-niveles-cerrar"
                            onClick={() => setMostrarNiveles(false)}
                            aria-label="Cerrar"
                          >
                            <CloseOutlined />
                          </button>
                        </div>
                        <div className="memory-niveles-grid">
                          {nivelesAlcanzados.map((n, i) => (
                            <button
                              type="button"
                              key={n.total}
                              className={`memory-nivel-btn${n.total === tamano ? ' activo' : ''}`}
                              onClick={() => {
                                reiniciar(n.total);
                                setMostrarNiveles(false);
                              }}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="memory-board-area" ref={areaRef}>
                    {cargando || cartas.length === 0 ? (
                      <p className="memory-cargando">
                        {cargando ? `Preparando ${tema.nombre}...` : 'Preparando las tarjetas...'}
                      </p>
                    ) : (
                      <div
                        className="memory-grid"
                        style={{
                          '--memory-cols': columnas,
                          '--memory-rows': filas,
                          width: celda ? columnas * celda + (columnas - 1) * GAP : 0,
                          height: celda ? filas * celda + (filas - 1) * GAP : 0,
                          visibility: celda ? 'visible' : 'hidden',
                        }}
                      >
                        {cartas.map((carta) => {
                          const mostrar = carta.volteada || carta.encontrada;
                          return (
                            <button
                              type="button"
                              key={carta.uid}
                              className={`memory-card${mostrar ? ' volteada' : ''}${carta.encontrada ? ' encontrada' : ''}`}
                              onClick={() => voltearCarta(carta.uid)}
                              disabled={mostrar}
                              aria-label={mostrar ? `Carta ${carta.cara.alt}` : 'Carta boca abajo'}
                            >
                              <span className="memory-card-inner">
                                <span className="memory-card-face memory-card-back" aria-hidden="true">
                                  <img src={fotosTema.back} alt="" className="memory-card-img" />
                                </span>
                                <span className="memory-card-face memory-card-front">
                                  <img src={carta.cara.src} alt="" className="memory-card-img" />
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ))}

              {vista === 'rompecabezas' && catalogoRomp && (
                <div className="romp-catalogo">
                  <div className="romp-tabs" role="tablist" aria-label="Temas">
                    {temasCatalogoRomp.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        role="tab"
                        aria-selected={t.id === tabActivaRomp}
                        className={`romp-tab${t.id === tabActivaRomp ? ' activo' : ''}`}
                        style={t.id === tabActivaRomp ? { background: t.header } : undefined}
                        onClick={() => setTabCatalogoRomp(t.id)}
                      >
                        {t.nombre}
                      </button>
                    ))}
                  </div>
                  <div className="romp-tab-panel" role="tabpanel">
                    {temasCatalogoRomp
                      .find((t) => t.id === tabActivaRomp)
                      ?.niveles.map((nivel, i) => (
                        <section key={i} className="romp-nivel-seccion">
                          <h3 className="romp-nivel-titulo">
                            Nivel {i + 1}
                            <span>{nivel.piezas} piezas · {nivel.rompecabezas.length} rompecabezas</span>
                          </h3>
                          <div className="romp-miniaturas">
                            {nivel.rompecabezas.map((romp) => {
                              const imagen = miniaturasRomp[romp.id];
                              // Misma grilla que arma el juego para esta foto y
                              // esta cantidad de piezas (grillaRompecabezas).
                              const grilla = imagen ? grillaRompecabezas(nivel.piezas, imagen.aspecto) : null;
                              return (
                                <figure key={romp.id} className="romp-miniatura-item">
                                  {imagen ? (
                                    <div className="romp-miniatura-marco">
                                      <img src={imagen.src} alt="" className={`romp-miniatura romp-miniatura--${romp.orientacion}`} />
                                      <div
                                        className="romp-miniatura-cortes"
                                        style={{
                                          gridTemplateColumns: `repeat(${grilla.columnas}, 1fr)`,
                                          gridTemplateRows: `repeat(${grilla.filas}, 1fr)`,
                                        }}
                                        aria-hidden="true"
                                      >
                                        {Array.from({ length: nivel.piezas }, (_, p) => (
                                          <span key={p} className="romp-miniatura-pieza" />
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={`romp-miniatura romp-miniatura--${romp.orientacion} romp-miniatura--cargando`} />
                                  )}
                                  <figcaption>
                                    <span className="romp-nivel-codigo" title="Código del rompecabezas (un click lo selecciona)">
                                      {romp.id}
                                    </span>
                                    <span className="romp-miniatura-orientacion">{romp.orientacion}</span>
                                    {grilla && (
                                      <span className="romp-miniatura-orientacion">
                                        {grilla.columnas} × {grilla.filas}
                                        {imagen.ancho > 0 && ` · pieza de ${Math.round(imagen.ancho / grilla.columnas)}×${Math.round(imagen.alto / grilla.filas)} px`}
                                      </span>
                                    )}
                                  </figcaption>
                                </figure>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                  </div>
                </div>
              )}

              {vista === 'rompecabezas' && !catalogoRomp && (!temaRompId ? (
                <div className="memory-picker">
                  <div className="memory-picker-grid">
                    {TEMAS_ROMPECABEZAS.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        className={`memory-picker-tile${t.soloLaptop ? ' memory-solo-laptop' : ''}`}
                        onClick={() => elegirTemaRomp(t.id)}
                        disabled={!t.listo}
                        aria-label={t.listo ? `Armar ${t.nombre}` : `${t.nombre} (muy pronto)`}
                      >
                        <span className="memory-picker-img-wrap">
                          {dorsosSelector[t.id] ? (
                            <img src={dorsosSelector[t.id]} alt="" className="memory-picker-img" />
                          ) : (
                            <PictureOutlined className="memory-picker-placeholder" aria-hidden="true" />
                          )}
                        </span>
                        <span className="memory-picker-nombre">{t.nombre}</span>
                        {!t.listo && <span className="memory-picker-badge">Muy pronto</span>}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="romp-catalogo-btn"
                    onClick={() => setCatalogoRomp(true)}
                  >
                    <PictureOutlined /> Ver todos los rompecabezas
                  </button>
                </div>
              ) : (
                <>
                  {ganoRomp && (
                    <div className="memory-victoria-overlay">
                      <div className="memory-victoria">
                        <span className="memory-victoria-emoji">🧩</span>
                        <p>
                          {seguirEnNivelRomp
                            ? `¡Lo armaste! ${faltanRomp === 1 ? 'Te falta 1 rompecabezas' : `Te faltan ${faltanRomp} rompecabezas`} para el nivel siguiente.`
                            : siguienteNivelIdxRomp === undefined
                              ? '¡Completaste todos los niveles!'
                              : enFronteraRomp
                                ? `¡Nivel ${nivelIdxRomp + 2} desbloqueado!`
                                : '¡Lo armaste de nuevo!'}
                        </p>
                        <button
                          type="button"
                          className="memory-victoria-btn"
                          onClick={() => reiniciarRomp(seguirEnNivelRomp ? nivelIdxRomp : (siguienteNivelIdxRomp ?? nivelIdxRomp))}
                        >
                          {seguirEnNivelRomp
                            ? 'Otro rompecabezas'
                            : siguienteNivelIdxRomp === undefined ? 'Armar de nuevo' : 'Jugar nivel siguiente'}
                        </button>
                      </div>
                    </div>
                  )}

                  {mostrarNivelesRomp && (
                    <div
                      className="memory-victoria-overlay"
                      onClick={() => setMostrarNivelesRomp(false)}
                    >
                      <div className="memory-niveles-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="memory-niveles-header">
                          <h3>Elige un nivel</h3>
                          <button
                            type="button"
                            className="memory-cerrar-x memory-niveles-cerrar"
                            onClick={() => setMostrarNivelesRomp(false)}
                            aria-label="Cerrar"
                          >
                            <CloseOutlined />
                          </button>
                        </div>
                        <div className="memory-niveles-grid">
                          {nivelesAlcanzadosRomp.map((_, i) => (
                            <button
                              type="button"
                              key={i}
                              className={`memory-nivel-btn${i === nivelIdxRomp ? ' activo' : ''}`}
                              onClick={() => {
                                reiniciarRomp(i);
                                setMostrarNivelesRomp(false);
                              }}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {mostrarPreviaRomp && (
                    <div
                      className="memory-victoria-overlay"
                      onClick={() => setMostrarPreviaRomp(false)}
                    >
                      <div className="romp-previa-modal" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="memory-cerrar-x romp-previa-cerrar"
                          onClick={() => setMostrarPreviaRomp(false)}
                          aria-label="Cerrar"
                        >
                          <CloseOutlined />
                        </button>
                        <img src={imagenRomp.src} alt="" className="romp-previa-img" />
                      </div>
                    </div>
                  )}

                  {cargandoRomp || totalPiezasRomp === 0 ? (
                    <div className="memory-board-area">
                      <p className="memory-cargando">
                        {cargandoRomp ? `Preparando ${temaRomp.nombre}...` : 'Preparando las piezas...'}
                      </p>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensoresRomp}
                      onDragStart={empezarArrastreRomp}
                      onDragEnd={soltarPiezaRomp}
                    >
                      <div
                        className={`romp-layout${celdaRomp.bandeja === 'lado' ? ' romp-layout--lado' : ''}`}
                        ref={areaRefRomp}
                      >
                        <div
                          className="romp-board-wrap"
                          style={{
                            width: celdaRomp.anchoTablero || 0,
                            height: celdaRomp.altoTablero || 0,
                            visibility: celdaRomp.anchoTablero ? 'visible' : 'hidden',
                          }}
                        >
                          {/* Guia transparente: se ve la foto completa
                              bien tenue detras, para saber donde va cada
                              pieza sin regalar la respuesta. Solo en el
                              nivel 1 (pedido explicito) — de ahi en
                              adelante no hay ayuda visual. */}
                          {nivelIdxRomp === 0 && (
                            <img className="romp-referencia" src={imagenRomp.src} alt="" aria-hidden="true" />
                          )}
                          <div
                            className="romp-board"
                            style={{
                              '--romp-cols': celdaRomp.columnas,
                              '--romp-rows': celdaRomp.filas,
                            }}
                          >
                            {tableroRomp.posiciones.map((piezaId, indice) => (
                              <RanuraRompecabezas
                                key={indice}
                                id={indice}
                                piezaId={piezaId}
                                imagen={imagenRomp.src}
                                columnas={celdaRomp.columnas}
                                filas={celdaRomp.filas}
                              />
                            ))}
                          </div>
                        </div>

                        <div
                          className={`romp-tray${celdaRomp.bandeja === 'lado' ? ' romp-tray--lado' : ''}`}
                          style={{ height: celdaRomp.trayAlto ?? undefined, width: celdaRomp.trayAncho ?? undefined }}
                        >
                          {pendientesRomp.map((id) => (
                            <PiezaCarrousel
                              key={id}
                              id={id}
                              imagen={imagenRomp.src}
                              columnas={celdaRomp.columnas}
                              filas={celdaRomp.filas}
                              ancho={celdaRomp.celdaW}
                              alto={celdaRomp.celdaH}
                            />
                          ))}
                        </div>
                      </div>

                      <DragOverlay>
                        {piezaArrastrandoRomp !== null ? (
                          <div
                            className="romp-tray-pieza romp-tray-pieza--overlay"
                            style={{
                              width: celdaRomp.celdaW,
                              height: celdaRomp.celdaH,
                              backgroundImage: `url(${imagenRomp.src})`,
                              backgroundSize: `${celdaRomp.columnas * 100}% ${celdaRomp.filas * 100}%`,
                              backgroundPosition: `${celdaRomp.columnas === 1 ? 0 : ((piezaArrastrandoRomp % celdaRomp.columnas) * 100) / (celdaRomp.columnas - 1)}% ${celdaRomp.filas === 1 ? 0 : (Math.floor(piezaArrastrandoRomp / celdaRomp.columnas) * 100) / (celdaRomp.filas - 1)}%`,
                            }}
                          />
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  )}
                </>
              ))}

              {vista === 'contar' && (!temaContarId ? (
                <div className="memory-picker">
                  <div className="memory-picker-grid">
                    {TEMAS.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        className="memory-picker-tile"
                        onClick={() => elegirTemaContar(t.id)}
                        disabled={!t.caras.length}
                        aria-label={t.caras.length ? `Contar con ${t.nombre}` : `${t.nombre} (muy pronto)`}
                      >
                        <span className="memory-picker-img-wrap">
                          {dorsosSelector[t.id] ? (
                            <img src={dorsosSelector[t.id]} alt="" className="memory-picker-img" />
                          ) : (
                            <PictureOutlined className="memory-picker-placeholder" aria-hidden="true" />
                          )}
                        </span>
                        <span className="memory-picker-nombre">{t.nombre}</span>
                        {!t.caras.length && <span className="memory-picker-badge">Muy pronto</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {ganoNivelContar && (
                    <div className="memory-victoria-overlay">
                      <div className="memory-victoria">
                        {siguienteNivelIdxContar === undefined ? (
                          <>
                            {/* Fin del juego: sin "jugar de nuevo" en bucle. */}
                            <span className="memory-victoria-emoji">🏆</span>
                            <p>¡Completaste el juego de contar!</p>
                            <p>Ya sabes contar hasta {NIVELES_CONTAR[nivelIdxContar].max}.</p>
                            <button
                              type="button"
                              className="memory-victoria-btn"
                              onClick={volverAlSelectorContar}
                            >
                              Elegir otro tema
                            </button>
                            <button
                              type="button"
                              className="memory-victoria-btn"
                              onClick={() => setMostrarNivelesContar(true)}
                            >
                              Repasar un nivel
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="memory-victoria-emoji">🔢</span>
                            <p>
                              {enFronteraContar
                                ? `¡Nivel ${nivelIdxContar + 2} desbloqueado!`
                                : '¡Ganaste de nuevo!'}
                            </p>
                            <button
                              type="button"
                              className="memory-victoria-btn"
                              onClick={() => reiniciarContar(siguienteNivelIdxContar)}
                            >
                              Jugar nivel siguiente
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {mostrarNivelesContar && (
                    <div
                      className="memory-victoria-overlay"
                      onClick={() => setMostrarNivelesContar(false)}
                    >
                      <div className="memory-niveles-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="memory-niveles-header">
                          <h3>Elige un nivel</h3>
                          <button
                            type="button"
                            className="memory-cerrar-x memory-niveles-cerrar"
                            onClick={() => setMostrarNivelesContar(false)}
                            aria-label="Cerrar"
                          >
                            <CloseOutlined />
                          </button>
                        </div>
                        <div className="memory-niveles-grid">
                          {nivelesAlcanzadosContar.map((_, i) => (
                            <button
                              type="button"
                              key={i}
                              className={`memory-nivel-btn${i === nivelIdxContar ? ' activo' : ''}`}
                              onClick={() => {
                                reiniciarContar(i);
                                setMostrarNivelesContar(false);
                              }}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="contar-juego">
                    {cargandoContar || !rondaContar ? (
                      <p className="memory-cargando">
                        {cargandoContar ? `Preparando ${temaContar.nombre}...` : 'Preparando...'}
                      </p>
                    ) : (
                      <>
                        <div className="contar-area" ref={areaRefContar}>
                          {/* Ancho exacto de "columnas" fotos: fuerza el reparto
                              elegido (p. ej. 4 + 3) y centra la ultima fila. */}
                          <div
                            className="contar-grilla"
                            style={{
                              width: grillaContar.celda
                                ? grillaContar.columnas * grillaContar.celda + (grillaContar.columnas - 1) * GAP_CONTAR
                                : undefined,
                            }}
                          >
                            {rondaContar.items.map((item) => (
                              <img
                                key={item.id}
                                src={rondaContar.cara.src}
                                alt=""
                                className="contar-foto"
                                style={{
                                  width: grillaContar.celda || undefined,
                                  height: grillaContar.celda || undefined,
                                  visibility: grillaContar.celda ? 'visible' : 'hidden',
                                  transform: `rotate(${item.rot}deg)`,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="contar-pregunta">¿Cuántos hay?</p>
                        <div className="contar-opciones">
                          {rondaContar.opciones.map((n) => (
                            <button
                              type="button"
                              key={n}
                              className={`contar-opcion-btn${feedbackContar?.valor === n ? (feedbackContar.correcto ? ' correcto' : ' incorrecto') : ''}`}
                              onClick={() => elegirOpcionContar(n)}
                              disabled={bloqueadoContar}
                              aria-label={`Elegir ${n}`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </>
              ))}

              {vista === 'secuencias' && (!temaSecId ? (
                <div className="memory-picker">
                  <div className="memory-picker-grid">
                    {TEMAS_SECUENCIAS.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        className="memory-picker-tile"
                        onClick={() => elegirTemaSec(t.id)}
                        disabled={!t.listo}
                        aria-label={t.listo ? `Ordenar secuencias de ${t.nombre}` : `${t.nombre} (muy pronto)`}
                      >
                        <span className="memory-picker-img-wrap">
                          {dorsosSelector[t.id] ? (
                            <img src={dorsosSelector[t.id]} alt="" className="memory-picker-img" />
                          ) : (
                            <PictureOutlined className="memory-picker-placeholder" aria-hidden="true" />
                          )}
                        </span>
                        <span className="memory-picker-nombre">{t.nombre}</span>
                        {!t.listo && <span className="memory-picker-badge">Muy pronto</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {ganoSec && (
                    <div className="memory-victoria-overlay">
                      <div className="memory-victoria">
                        <span className="memory-victoria-emoji">🎉</span>
                        <p>
                          {siguienteNivelIdxSec === undefined
                            ? '¡Completaste todas las secuencias!'
                            : enFronteraSec
                              ? `¡Nivel ${nivelIdxSec + 2} desbloqueado!`
                              : '¡Lo ordenaste de nuevo!'}
                        </p>
                        <button
                          type="button"
                          className="memory-victoria-btn"
                          onClick={() => reiniciarSec(siguienteNivelIdxSec ?? nivelIdxSec)}
                        >
                          {siguienteNivelIdxSec === undefined ? 'Jugar de nuevo' : 'Jugar la siguiente secuencia'}
                        </button>
                      </div>
                    </div>
                  )}

                  {mostrarNivelesSec && (
                    <div
                      className="memory-victoria-overlay"
                      onClick={() => setMostrarNivelesSec(false)}
                    >
                      <div className="memory-niveles-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="memory-niveles-header">
                          <h3>Elige un nivel</h3>
                          <button
                            type="button"
                            className="memory-cerrar-x memory-niveles-cerrar"
                            onClick={() => setMostrarNivelesSec(false)}
                            aria-label="Cerrar"
                          >
                            <CloseOutlined />
                          </button>
                        </div>
                        <div className="memory-niveles-grid">
                          {nivelesAlcanzadosSec.map((_, i) => (
                            <button
                              type="button"
                              key={i}
                              className={`memory-nivel-btn${i === nivelIdxSec ? ' activo' : ''}`}
                              onClick={() => {
                                reiniciarSec(i);
                                setMostrarNivelesSec(false);
                              }}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {cargandoSec || totalSec === 0 ? (
                    <div className="memory-board-area">
                      <p className="memory-cargando">
                        {cargandoSec ? `Preparando ${temaSec.nombre}...` : 'Preparando los cuadros...'}
                      </p>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensoresSec}
                      onDragStart={empezarArrastreSec}
                      onDragEnd={soltarPiezaSec}
                    >
                      <div className="sec-layout" ref={areaRefSec}>
                        <div
                          className="sec-board"
                          style={{
                            gridTemplateColumns: `repeat(${celdaSec.columnas}, ${celdaSec.celdaW}px)`,
                            gridAutoRows: `${celdaSec.celdaH}px`,
                            visibility: celdaSec.celdaW ? 'visible' : 'hidden',
                          }}
                        >
                          {tableroSec.posiciones.map((piezaId, indice) => (
                            <RanuraSecuencia
                              key={indice}
                              id={indice}
                              piezaId={piezaId}
                              cuadros={cuadrosSec}
                            />
                          ))}
                        </div>

                        <div
                          className="sec-tray"
                          style={{
                            width: celdaSec.columnas * celdaSec.celdaW + (celdaSec.columnas - 1) * GAP_SEC + PADDING_TRAY_SEC,
                            height: celdaSec.celdaH + PADDING_TRAY_SEC,
                            visibility: celdaSec.celdaW ? 'visible' : 'hidden',
                          }}
                        >
                          {pendientesSec.map((id) => (
                            <PiezaSecuencia
                              key={id}
                              id={id}
                              cuadros={cuadrosSec}
                              ancho={celdaSec.celdaW}
                              alto={celdaSec.celdaH}
                            />
                          ))}
                        </div>
                      </div>

                      <DragOverlay>
                        {piezaArrastrandoSec !== null ? (
                          <div
                            className="sec-pieza-tray sec-pieza-tray--overlay"
                            style={{
                              width: celdaSec.celdaW,
                              height: celdaSec.celdaH,
                              backgroundImage: `url(${cuadrosSec[piezaArrastrandoSec].src})`,
                            }}
                          />
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  )}
                </>
              ))}

              {vista === 'diferencias' && devDif && (
                <DiferenciasDev
                  temas={TEMAS_DIFERENCIAS}
                  radio={RADIO_ACIERTO}
                  coordenadas={diferenciasCoordenadas}
                />
              )}

              {vista === 'diferencias' && !devDif && (!temaDifId ? (
                <div className="memory-picker">
                  {TEMAS_DIFERENCIAS.length === 0 ? (
                    <p className="gallery-empty">Muy pronto van a haber imágenes aquí.</p>
                  ) : (
                    <div className="memory-picker-grid">
                      {TEMAS_DIFERENCIAS.map((t) => (
                        <button
                          type="button"
                          key={t.id}
                          className="memory-picker-tile"
                          onClick={() => elegirTemaDif(t.id)}
                          disabled={t.niveles.length === 0}
                          aria-label={t.niveles.length ? `Buscar diferencias con ${t.nombre}` : `${t.nombre} (muy pronto)`}
                        >
                          <span className="memory-picker-img-wrap">
                            {dorsosSelector[t.id] ? (
                              <img src={dorsosSelector[t.id]} alt="" className="memory-picker-img" />
                            ) : (
                              <PictureOutlined className="memory-picker-placeholder" aria-hidden="true" />
                            )}
                          </span>
                          <span className="memory-picker-nombre">{t.nombre}</span>
                          {t.niveles.length === 0 && <span className="memory-picker-badge">Muy pronto</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="dif-dev-btn"
                    onClick={() => setDevDif(true)}
                  >
                    <PictureOutlined /> Modo desarrollador
                  </button>
                </div>
              ) : (
                <>
                  {ganoDif && (
                    <div className="memory-victoria-overlay">
                      <div className="memory-victoria">
                        <span className="memory-victoria-emoji">🎉</span>
                        <p>
                          {seguirEnNivelDif
                            ? `¡Encontraste todo! ${faltanDif === 1 ? 'Te falta 1 juego' : `Te faltan ${faltanDif} juegos`} para el nivel siguiente.`
                            : siguienteNivelIdxDif === undefined
                              ? '¡Completaste todos los niveles!'
                              : enFronteraDif
                                ? `¡Nivel ${numeroSiguienteNivelDif} desbloqueado!`
                                : '¡Encontraste todo de nuevo!'}
                        </p>
                        <button
                          type="button"
                          className="memory-victoria-btn"
                          onClick={() => reiniciarDif(seguirEnNivelDif ? nivelIdxDif : (siguienteNivelIdxDif ?? nivelIdxDif))}
                        >
                          {seguirEnNivelDif
                            ? 'Otro juego'
                            : siguienteNivelIdxDif === undefined ? 'Jugar de nuevo' : 'Jugar el siguiente nivel'}
                        </button>
                      </div>
                    </div>
                  )}

                  {mostrarNivelesDif && (
                    <div
                      className="memory-victoria-overlay"
                      onClick={() => setMostrarNivelesDif(false)}
                    >
                      <div className="memory-niveles-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="memory-niveles-header">
                          <h3>Elige un nivel</h3>
                          <button
                            type="button"
                            className="memory-cerrar-x memory-niveles-cerrar"
                            onClick={() => setMostrarNivelesDif(false)}
                            aria-label="Cerrar"
                          >
                            <CloseOutlined />
                          </button>
                        </div>
                        <div className="memory-niveles-grid">
                          {nivelesAlcanzadosDif.map((n, i) => (
                            <button
                              type="button"
                              key={i}
                              className={`memory-nivel-btn${i === nivelIdxDif ? ' activo' : ''}`}
                              onClick={() => reiniciarDif(i)}
                            >
                              {n.cantidad}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {parActualDif && (
                    <DiferenciasJuego
                      key={`${temaDifId}-${nivelIdxDif}-${parIdDif}-${partidaDif}`}
                      par={parActualDif}
                      radio={RADIO_ACIERTO}
                      onCompletado={marcarGanoDif}
                    />
                  )}
                </>
              ))}
            </div>

            {avisoDev && <div className="memory-toast" role="status">{avisoDev}</div>}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

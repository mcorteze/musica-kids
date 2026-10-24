import { useState, useCallback, useEffect, useMemo, useRef, useLayoutEffect, cloneElement, Children, Fragment } from 'react';
import { createPortal } from 'react-dom';
// Iconos SVG en vez de emojis en los modales de victoria: algunas tablets
// no tienen esos emojis y mostraban un simbolo desconocido.
import { GiAbacus, GiPartyPopper, GiPuzzle, GiTrophyCup } from 'react-icons/gi';
import { Image } from 'antd';
import { cargarImagenConAspecto } from '../utils/cargarImagen';
import DiferenciasJuego from './DiferenciasJuego';
import DiferenciasDev from './DiferenciasDev';
import PintarJuego from './PintarJuego';
import PintarDev from './PintarDev';
import PintarPixelDev from './PintarPixelDev';
import SimonJuego, { SIMON_GRUPOS } from './SimonJuego';
import ExplosionChispas from './ExplosionChispas';
import HoraDormirPanel from './HoraDormirPanel';
import ColorearLienzo, { ColorearGaleria, MisDibujos, guardarImagenDibujo, imprimirDibujo } from './ColorearJuego';
import { LuPencil } from 'react-icons/lu';
import { borrarDibujo, leerDibujos, limpiarDibujosVencidos } from '../utils/dibujosColorear';
import imagenColorear from '../assets/menu-general/colorear.avif';
import { laminaDePixelArt } from '../utils/pintarPixel';
import cuadriculasPintar from '../data/pintarCuadriculas';
import EstadoDevTabs from './EstadoDevTabs';
import RompecabezasPropuesta from './RompecabezasPropuesta';
import {
  contarPropuesta,
  guardarPropuestaRompecabezas,
  leerPropuestaRompecabezas,
  textoPropuesta,
} from '../utils/propuestaRompecabezas';
import { elegirEstadoDev } from '../utils/estadoDev';
import { aplicarDesgaste } from '../utils/desgasteRompecabezas';
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
import imagenPintar from '../assets/menu-general/pintar.avif';
import imagenPintarNumeros from '../assets/menu-general/pintar-numeros.avif';
import imagenSimon from '../assets/menu-general/simon.avif';

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
// personaje). Un tema queda "listo" con el dorso y al menos 2 caras; el
// fondo es opcional (sin el, el drawer usa un degradado, ver fondoAlterno).
// Si falta algo aparece en el selector marcado "Muy pronto" y no se puede
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
  {
    // Sin grupo propio en el reproductor ("Disney" es mas generico): nombre fijo.
    id: 'mickey',
    nombre: 'Mickey',
    header: 'linear-gradient(120deg, #E8323C 0%, #B3121C 55%, #1F1F1F 100%)',
    // Fondo apaisado (2.3:1) con Mickey al CENTRO: el anclaje por defecto
    // (abajo a la derecha, pensado para la torre de Paw Patrol) lo dejaba
    // fuera de cuadro en pantallas verticales.
    fondoPosicion: 'center bottom',
  },
  {
    id: 'moana',
    grupo: 'moana',
    header: 'linear-gradient(120deg, #2FB5B0 0%, #0E8C93 55%, #F2694B 100%)',
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

const TEMAS = TEMAS_META.map(({ id, grupo, nombre: nombreFijo, header, fondoPosicion, oculto, soloDev }) => {
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
    // Si el tema todavia no tiene fondo.avif, el drawer usa este degradado
    // (el del tema del reproductor si tiene grupo, si no el del header): el
    // fondo es opcional, no bloquea el juego (pedido explicito).
    fondoAlterno: themes[info?.theme]?.gradient ?? header,
    // Posicion propia del fondo (opcional; por defecto la del CSS).
    fondoPosicion: fondoPosicion ?? null,
    back,
    // Minimo jugable: dorso + al menos 2 caras (el tablero mas chico son 4
    // cartas = 2 parejas). El fondo es opcional (ver fondoAlterno).
    listo: Boolean(back && caras.length >= 2),
    oculto: Boolean(oculto),
    soloDev: Boolean(soloDev),
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
// Los juegos publicados se ven en todas las pantallas; los no publicados y
// las herramientas de trabajo (botones "Modo desarrollador", "Ver todos los
// rompecabezas") quedan ocultos para los ninos en CUALQUIER pantalla, laptop
// incluida. Para verlos hay un interruptor OCULTO: tocar TOQUES_MODO_DEV
// veces seguidas el titulo "Actividades" del menu principal del drawer (solo
// ahi, en ningun otro lugar del sitio) lo activa; repetirlo lo desactiva.
// Se guarda en localStorage, asi que vale solo para ESE dispositivo. Activo,
// el drawer muestra todo (ver .memory-dev en App.css). Cada toque debe llegar antes de VENTANA_TOQUES_MS
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
// Simón dice se juega "vestido" de un grupo de música (pedido explícito:
// solo los que tienen traje propio, ver SIMON_GRUPOS en SimonJuego.jsx).
const GRUPOS_SIMON = gruposReproductor.filter((g) => SIMON_GRUPOS.includes(g.id) && themes[g.theme]);

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

// ========== COLOREAR ==========
// Las mismas laminas de Imprimir (pedido explicito), pintadas con pincel en
// ColorearJuego.jsx. Id de cada lamina = su ruta dentro de src/assets (es la
// llave de lo guardado en el dispositivo, utils/dibujosColorear.js).
const idLaminaColorear = (ruta) => ruta.replace(/^.*\/assets\//, '');
const CARGAR_LAMINA_COLOREAR = Object.fromEntries(
  Object.entries(ENTRADAS_GALERIAS).map(([ruta, cargar]) => [idLaminaColorear(ruta), cargar]),
);
// "Hoja en blanco" (dibujo libre): una lamina blanca vertical, armada una
// sola vez. Se guarda y aparece en "Mis dibujos" como cualquier lamina.
const HOJA_EN_BLANCO = 'hoja-en-blanco';
let srcHojaEnBlanco = null;
function hojaEnBlanco() {
  if (!srcHojaEnBlanco) {
    const c = document.createElement('canvas');
    c.width = 1350;
    c.height = 1800;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    srcHojaEnBlanco = c.toDataURL('image/png');
  }
  return srcHojaEnBlanco;
}
const cargarLaminaColorear = (id) => (id === HOJA_EN_BLANCO
  ? Promise.resolve(hojaEnBlanco())
  : CARGAR_LAMINA_COLOREAR[id]?.().then((m) => m.default) ?? Promise.resolve(null));

// ========== ROMPECABEZAS ==========
// Un NIVEL define la dificultad (la cantidad de piezas) y agrupa VARIOS
// rompecabezas, cada uno con una foto distinta (pedido explicito — "no
// vamos a reciclar imagenes"), no la misma foto cortada mas fina. Al
// empezar un nivel el juego elige uno de sus rompecabezas AL AZAR, sin
// repetir el que se acaba de jugar (elegirAlAzarPendiente). Para
// DESBLOQUEAR el nivel siguiente hay que armar TODOS los rompecabezas del
// nivel: mientras falten, el sorteo solo toma los que aun no se armaron
// (los ya armados se guardan por tema en localStorage, ver
// leerRegistroCompletadosRompecabezas). Por eso la cantidad de piezas se define
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
    porAfinar: [],
    niveles: [
      {
        piezas: 12,
        rompecabezas: [
          { id: 'frozen_001', orientacion: 'horizontal' },
          { id: 'frozen_014', orientacion: 'horizontal' },
          { id: 'frozen_027', orientacion: 'vertical' },
          { id: 'frozen_041', orientacion: 'vertical' },
        ],
      },
      {
        piezas: 18,
        rompecabezas: [
          { id: 'frozen_002', orientacion: 'horizontal' },
          { id: 'frozen_003', orientacion: 'vertical' },
          { id: 'frozen_004', orientacion: 'vertical' },
          { id: 'frozen_005', orientacion: 'vertical' },
          { id: 'frozen_006', orientacion: 'cuadrado' },
          { id: 'frozen_017', orientacion: 'horizontal' },
          { id: 'frozen_023', orientacion: 'cuadrado' },
          { id: 'frozen_024', orientacion: 'vertical' },
          { id: 'frozen_025', orientacion: 'vertical' },
          { id: 'frozen_029', orientacion: 'vertical' },
          { id: 'frozen_031', orientacion: 'cuadrado' },
          { id: 'frozen_035', orientacion: 'vertical' },
          { id: 'frozen_037', orientacion: 'cuadrado' },
          { id: 'frozen_038', orientacion: 'vertical' },
          { id: 'frozen_040', orientacion: 'vertical' },
          { id: 'frozen_044', orientacion: 'cuadrado' },
        ],
      },
      {
        piezas: 24,
        rompecabezas: [
          { id: 'frozen_007', orientacion: 'vertical' },
          { id: 'frozen_008', orientacion: 'vertical' },
          { id: 'frozen_009', orientacion: 'vertical' },
          { id: 'frozen_012', orientacion: 'vertical' },
          { id: 'frozen_015', orientacion: 'cuadrado' },
          { id: 'frozen_016', orientacion: 'cuadrado' },
          { id: 'frozen_021', orientacion: 'cuadrado' },
          { id: 'frozen_042', orientacion: 'vertical' },
          { id: 'frozen_045', orientacion: 'cuadrado' },
        ],
      },
      {
        piezas: 30,
        rompecabezas: [
          { id: 'frozen_010', orientacion: 'horizontal' },
          { id: 'frozen_011', orientacion: 'horizontal' },
          { id: 'frozen_018', orientacion: 'cuadrado' },
          { id: 'frozen_019', orientacion: 'cuadrado' },
          { id: 'frozen_026', orientacion: 'vertical' },
          { id: 'frozen_033', orientacion: 'vertical' },
          { id: 'frozen_034', orientacion: 'horizontal' },
          { id: 'frozen_036', orientacion: 'vertical' },
          { id: 'frozen_039', orientacion: 'cuadrado' },
          { id: 'frozen_043', orientacion: 'cuadrado' },
        ],
      },
      {
        piezas: 36,
        rompecabezas: [
          { id: 'frozen_013', orientacion: 'cuadrado' },
          { id: 'frozen_020', orientacion: 'horizontal' },
          { id: 'frozen_028', orientacion: 'cuadrado' },
          { id: 'frozen_030', orientacion: 'cuadrado' },
          { id: 'frozen_032', orientacion: 'vertical' },
        ],
      },
      {
        piezas: 42,
        rompecabezas: [
          { id: 'frozen_022', orientacion: 'cuadrado' },
        ],
      },
    ],
  },
  {
    id: 'toy-story',
    nombre: 'Toy Story',
    header: 'linear-gradient(120deg, #5AB0F5 0%, #1C6FB0 55%, #E00024 100%)',
    porAfinar: [],
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
          { id: 'toy_story_024', orientacion: 'cuadrado' },
          { id: 'toy_story_028', orientacion: 'cuadrado' },
          { id: 'toy_story_041', orientacion: 'cuadrado' },
        ],
      },
      {
        piezas: 24,
        rompecabezas: [
          { id: 'toy_story_003', orientacion: 'horizontal' },
          { id: 'toy_story_017', orientacion: 'horizontal' },
          { id: 'toy_story_018', orientacion: 'horizontal' },
          { id: 'toy_story_027', orientacion: 'cuadrado' },
          { id: 'toy_story_032', orientacion: 'cuadrado' },
          { id: 'toy_story_037', orientacion: 'cuadrado' },
          { id: 'toy_story_039', orientacion: 'cuadrado' },
        ],
      },
      {
        piezas: 30,
        rompecabezas: [
          { id: 'toy_story_020', orientacion: 'horizontal' },
          { id: 'toy_story_021', orientacion: 'horizontal' },
          { id: 'toy_story_022', orientacion: 'cuadrado' },
          { id: 'toy_story_023', orientacion: 'cuadrado' },
          { id: 'toy_story_025', orientacion: 'cuadrado' },
          { id: 'toy_story_026', orientacion: 'cuadrado' },
          { id: 'toy_story_033', orientacion: 'cuadrado' },
          { id: 'toy_story_034', orientacion: 'cuadrado' },
          { id: 'toy_story_038', orientacion: 'vertical' },
          { id: 'toy_story_040', orientacion: 'cuadrado' },
        ],
      },
      {
        piezas: 36,
        rompecabezas: [
          { id: 'toy_story_029', orientacion: 'cuadrado' },
          { id: 'toy_story_030', orientacion: 'cuadrado' },
          { id: 'toy_story_035', orientacion: 'cuadrado' },
          { id: 'toy_story_036', orientacion: 'cuadrado' },
        ],
      },
      { piezas: 42, rompecabezas: [] },
    ],
  },
  {
    id: 'paw-patrol',
    nombre: 'Paw Patrol',
    header: 'linear-gradient(120deg, #0BA3E0 0%, #0E8FD1 55%, #E31A22 100%)',
    porAfinar: [],
    niveles: [
      {
        piezas: 12,
        rompecabezas: [
          { id: 'paw_patrol_001', orientacion: 'vertical' },
          { id: 'paw_patrol_002', orientacion: 'horizontal' },
          { id: 'paw_patrol_003', orientacion: 'cuadrado' },
          { id: 'paw_patrol_004', orientacion: 'vertical' },
          { id: 'paw_patrol_031', orientacion: 'vertical' },
          { id: 'paw_patrol_036', orientacion: 'vertical' },
          { id: 'paw_patrol_039', orientacion: 'vertical' },
          { id: 'paw_patrol_041', orientacion: 'vertical' },
          { id: 'paw_patrol_043', orientacion: 'vertical' },
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
          { id: 'paw_patrol_035', orientacion: 'vertical' },
          { id: 'paw_patrol_040', orientacion: 'vertical' },
          { id: 'paw_patrol_045', orientacion: 'vertical' },
          { id: 'paw_patrol_046', orientacion: 'vertical' },
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
          { id: 'paw_patrol_032', orientacion: 'cuadrado' },
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
      {
        piezas: 36,
        rompecabezas: [
          { id: 'paw_patrol_033', orientacion: 'horizontal' },
        ],
      },
      { piezas: 42, rompecabezas: [] },
    ],
  },
  {
    id: 'mickey',
    nombre: 'Mickey',
    header: 'linear-gradient(120deg, #E8323C 0%, #B3121C 55%, #1F1F1F 100%)',
    porAfinar: [],
    niveles: [
      {
        piezas: 12,
        rompecabezas: [
          { id: 'mickey_001', orientacion: 'vertical' },
          { id: 'mickey_002', orientacion: 'cuadrado' },
          { id: 'mickey_008', orientacion: 'vertical' },
          { id: 'mickey_018', orientacion: 'horizontal' },
          { id: 'mickey_020', orientacion: 'horizontal' },
          { id: 'mickey_021', orientacion: 'horizontal' },
          { id: 'mickey_027', orientacion: 'cuadrado' },
          { id: 'mickey_031', orientacion: 'cuadrado' },
        ],
      },
      {
        piezas: 18,
        rompecabezas: [
          { id: 'mickey_003', orientacion: 'cuadrado' },
          { id: 'mickey_004', orientacion: 'horizontal' },
          { id: 'mickey_009', orientacion: 'vertical' },
          { id: 'mickey_013', orientacion: 'horizontal' },
          { id: 'mickey_014', orientacion: 'cuadrado' },
          { id: 'mickey_025', orientacion: 'vertical' },
          { id: 'mickey_030', orientacion: 'vertical' },
        ],
      },
      {
        piezas: 24,
        rompecabezas: [
          { id: 'mickey_012', orientacion: 'horizontal' },
          { id: 'mickey_015', orientacion: 'cuadrado' },
          { id: 'mickey_019', orientacion: 'cuadrado' },
          { id: 'mickey_022', orientacion: 'vertical' },
          { id: 'mickey_023', orientacion: 'vertical' },
          { id: 'mickey_028', orientacion: 'vertical' },
          { id: 'mickey_029', orientacion: 'horizontal' },
          { id: 'mickey_032', orientacion: 'horizontal' },
          { id: 'mickey_034', orientacion: 'horizontal' },
        ],
      },
      {
        piezas: 30,
        rompecabezas: [
          { id: 'mickey_006', orientacion: 'horizontal' },
          { id: 'mickey_007', orientacion: 'horizontal' },
          { id: 'mickey_010', orientacion: 'horizontal' },
          { id: 'mickey_016', orientacion: 'horizontal' },
          { id: 'mickey_024', orientacion: 'vertical' },
          { id: 'mickey_033', orientacion: 'horizontal' },
        ],
      },
      {
        piezas: 36,
        rompecabezas: [
          { id: 'mickey_011', orientacion: 'horizontal' },
        ],
      },
      {
        piezas: 42,
        rompecabezas: [
          { id: 'mickey_017', orientacion: 'horizontal' },
        ],
      },
    ],
  },
  {
    id: 'moana',
    nombre: 'Moana',
    header: 'linear-gradient(120deg, #2FB5B0 0%, #0E8C93 55%, #F2694B 100%)',
    porAfinar: [],
    niveles: [
      {
        piezas: 12,
        rompecabezas: [
          { id: 'moana_003', orientacion: 'vertical' },
          { id: 'moana_007', orientacion: 'horizontal' },
          { id: 'moana_012', orientacion: 'vertical' },
          { id: 'moana_014', orientacion: 'cuadrado' },
          { id: 'moana_015', orientacion: 'cuadrado' },
          { id: 'moana_024', orientacion: 'vertical' },
          { id: 'moana_032', orientacion: 'horizontal' },
          { id: 'moana_034', orientacion: 'vertical' },
          { id: 'moana_037', orientacion: 'vertical' },
          { id: 'moana_039', orientacion: 'vertical' },
          { id: 'moana_053', orientacion: 'cuadrado' },
          { id: 'moana_055', orientacion: 'cuadrado' },
          { id: 'moana_058', orientacion: 'horizontal' },
          { id: 'moana_059', orientacion: 'vertical' },
        ],
      },
      {
        piezas: 18,
        rompecabezas: [
          { id: 'moana_001', orientacion: 'vertical' },
          { id: 'moana_006', orientacion: 'horizontal' },
          { id: 'moana_010', orientacion: 'horizontal' },
          { id: 'moana_011', orientacion: 'horizontal' },
          { id: 'moana_013', orientacion: 'cuadrado' },
          { id: 'moana_016', orientacion: 'cuadrado' },
          { id: 'moana_019', orientacion: 'horizontal' },
          { id: 'moana_021', orientacion: 'horizontal' },
          { id: 'moana_022', orientacion: 'horizontal' },
          { id: 'moana_023', orientacion: 'vertical' },
          { id: 'moana_027', orientacion: 'cuadrado' },
          { id: 'moana_030', orientacion: 'vertical' },
          { id: 'moana_035', orientacion: 'vertical' },
          { id: 'moana_044', orientacion: 'cuadrado' },
          { id: 'moana_046', orientacion: 'cuadrado' },
          { id: 'moana_049', orientacion: 'vertical' },
          { id: 'moana_054', orientacion: 'cuadrado' },
          { id: 'moana_056', orientacion: 'cuadrado' },
        ],
      },
      {
        piezas: 24,
        rompecabezas: [
          { id: 'moana_005', orientacion: 'horizontal' },
          { id: 'moana_018', orientacion: 'cuadrado' },
          { id: 'moana_020', orientacion: 'horizontal' },
          { id: 'moana_026', orientacion: 'cuadrado' },
          { id: 'moana_031', orientacion: 'cuadrado' },
          { id: 'moana_033', orientacion: 'vertical' },
          { id: 'moana_036', orientacion: 'vertical' },
          { id: 'moana_038', orientacion: 'horizontal' },
          { id: 'moana_040', orientacion: 'vertical' },
          { id: 'moana_042', orientacion: 'cuadrado' },
          { id: 'moana_043', orientacion: 'vertical' },
          { id: 'moana_045', orientacion: 'vertical' },
          { id: 'moana_048', orientacion: 'vertical' },
        ],
      },
      {
        piezas: 30,
        rompecabezas: [
          { id: 'moana_004', orientacion: 'horizontal' },
          { id: 'moana_008', orientacion: 'vertical' },
          { id: 'moana_009', orientacion: 'cuadrado' },
          { id: 'moana_025', orientacion: 'cuadrado' },
          { id: 'moana_028', orientacion: 'vertical' },
          { id: 'moana_047', orientacion: 'horizontal' },
          { id: 'moana_052', orientacion: 'cuadrado' },
        ],
      },
      {
        piezas: 36,
        rompecabezas: [
          { id: 'moana_002', orientacion: 'cuadrado' },
          { id: 'moana_017', orientacion: 'vertical' },
          { id: 'moana_050', orientacion: 'vertical' },
          { id: 'moana_051', orientacion: 'vertical' },
        ],
      },
      { piezas: 42, rompecabezas: [] },
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

// Los rompecabezas recien agregados van en "porAfinar" (del tema, sin
// nivel): NO se juegan todavia y en la pagina "Todos los rompecabezas" salen
// en el tab "En preparacion", separados de los que ya estan en el juego
// ("Procesados"), con un selector de piezas para ver como quedaria el corte en
// cada nivel. Cuando se decide su nivel, se mueven de "porAfinar" a ese
// nivel y pasan solos al juego.
const TEMAS_ROMPECABEZAS = TEMAS_ROMPECABEZAS_META.map(({ id, nombre, header, niveles, porAfinar = [], soloDev }) => {
  // Solo quedan los rompecabezas cuya imagen existe, y solo los niveles que
  // conservan al menos uno.
  const conCarga = (lista) => lista
    .map((r) => ({ ...r, cargar: cargadorRompecabezas(id, r.id) }))
    .filter((r) => r.cargar);
  const nivelesConCarga = niveles
    .map((n, i) => ({ ...n, numero: i + 1, rompecabezas: conCarga(n.rompecabezas) }))
    .filter((n) => n.rompecabezas.length > 0);
  const porAfinarConCarga = conCarga(porAfinar);
  return {
    id,
    nombre,
    header,
    niveles: nivelesConCarga,
    porAfinar: porAfinarConCarga,
    // Lo que muestra cada tab del catalogo, como bloques de niveles: los por
    // afinar van en un solo bloque "sin nivel".
    catalogo: {
      afinar: porAfinarConCarga.length > 0 ? [{ sinNivel: true, rompecabezas: porAfinarConCarga }] : [],
      listos: nivelesConCarga,
    },
    // Listo con al menos el primer nivel disponible — los siguientes
    // pueden ir llegando despues sin que el tema deje de jugarse.
    listo: nivelesConCarga.length > 0,
    soloDev: Boolean(soloDev),
  };
});

// Cuantos rompecabezas hay en un estado del catalogo ('afinar' | 'listos').
function contarRompecabezas(temas, estado) {
  return temas.reduce(
    (total, t) => total + t.catalogo[estado].reduce((s, n) => s + n.rompecabezas.length, 0),
    0
  );
}

// Cantidades de piezas que se pueden elegir para un rompecabezas por
// afinar (una por nivel posible, de menor a mayor). Cada tema declara sus
// niveles con estas mismas cantidades; un nivel sin rompecabezas todavia no
// aparece en el juego.
const PIEZAS_ROMPECABEZAS = [12, 18, 24, 30, 36, 42];

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
// un nivel esta completo, y el modal de "Reiniciar" los muestra en color
// (los que faltan, en gris).
// Se guarda { ids, ultima, aplicados }: "ultima" es cuando se armo el
// ultimo rompecabezas del tema y "aplicados" cuantos reinicios por
// inactividad ya se hicieron desde entonces. El avance se reinicia de a un
// nivel, progresivamente, si el tema no se juega (ver
// utils/desgasteRompecabezas.js). Formatos viejos (lista suelta o
// { desde, ids } del antiguo vaciado diario): se conservan los ids y el reloj
// empieza al leerlos.
function completadosKeyRompecabezas(temaId) {
  return `musica-kids-rompecabezas-completados-${temaId}`;
}

function leerRegistroCompletadosRompecabezas(temaId) {
  try {
    const guardado = JSON.parse(localStorage.getItem(completadosKeyRompecabezas(temaId)));
    const ids = Array.isArray(guardado) ? guardado : guardado?.ids;
    const conReloj = Number.isFinite(guardado?.ultima);
    return {
      ids: Array.isArray(ids) ? ids.filter((c) => typeof c === 'string') : [],
      ultima: conReloj ? guardado.ultima : Date.now(),
      aplicados: Number.isInteger(guardado?.aplicados) ? guardado.aplicados : 0,
      sinReloj: !conReloj,
    };
  } catch {
    return { ids: [], ultima: Date.now(), aplicados: 0, sinReloj: true };
  }
}

function escribirRegistroCompletadosRompecabezas(temaId, { ids, ultima, aplicados }) {
  try {
    localStorage.setItem(completadosKeyRompecabezas(temaId), JSON.stringify({ ids, ultima, aplicados }));
  } catch {
    // Sin localStorage el progreso dura lo que dure la sesion.
  }
}

// Armar un rompecabezas es actividad: reinicia el reloj de inactividad.
function guardarCompletadosRompecabezas(temaId, lista) {
  escribirRegistroCompletadosRompecabezas(temaId, { ids: lista, ultima: Date.now(), aplicados: 0 });
  return lista;
}

// Al elegir un tema: aplica los reinicios por inactividad que correspondan
// (nivel maximo y armados) y deja guardado el resultado.
function retomarProgresoRompecabezas(tema) {
  const registro = leerRegistroCompletadosRompecabezas(tema.id);
  const nivelGuardado = leerNivelGuardadoRompecabezas(tema.id, tema.niveles.length);
  const resultado = aplicarDesgaste(
    { nivelMaximo: nivelGuardado, ids: registro.ids, ultima: registro.ultima, aplicados: registro.aplicados },
    tema.niveles.map((n) => n.rompecabezas.map((r) => r.id))
  );
  if (registro.sinReloj || resultado.aplicados !== registro.aplicados) {
    escribirRegistroCompletadosRompecabezas(tema.id, resultado);
  }
  if (resultado.nivelMaximo !== nivelGuardado) {
    try {
      localStorage.setItem(nivelKeyRompecabezas(tema.id), String(resultado.nivelMaximo));
    } catch {
      // Sin localStorage el progreso dura lo que dure la sesion.
    }
  }
  return resultado;
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
// "rompId" ata el tablero al rompecabezas que se esta armando: asi un
// tablero ya resuelto no cuenta como victoria del SIGUIENTE rompecabezas en
// el instante en que se elige otro y todavia no se rearma (ver ganoRomp).
function estadoInicialRompecabezas(total, rompId = null) {
  return {
    orden: shuffle(Array.from({ length: total }, (_, i) => i)),
    posiciones: new Array(total).fill(null),
    rompId,
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
// Estilo de fondo de una pieza: su recorte propio (imagen chica del tamaño
// justo, ver recortarPiezasRomp) o, mientras no esta listo, la foto entera
// ampliada y corrida hasta su lugar.
function fondoPiezaRomp(piezaId, imagen, recorte, columnas, filas) {
  if (recorte) return { backgroundImage: `url(${recorte})`, backgroundSize: '100% 100%' };
  const fila = Math.floor(piezaId / columnas);
  const col = piezaId % columnas;
  return {
    backgroundImage: `url(${imagen})`,
    backgroundSize: `${columnas * 100}% ${filas * 100}%`,
    backgroundPosition: `${columnas === 1 ? 0 : (col * 100) / (columnas - 1)}% ${filas === 1 ? 0 : (fila * 100) / (filas - 1)}%`,
  };
}

// Recorta cada pieza en su propia imagen, del tamaño en que se ve (x la
// densidad de la pantalla, hasta 2). Antes cada pieza pintaba la foto
// ENTERA (hasta 1600 px) ampliada columnas x filas veces y corrida: en una
// tablet modesta, arrastrar una pieza escalaba la foto grande en cada
// cuadro. Ahora se decodifica la foto una vez y cada pieza es chica.
async function recortarPiezasRomp(src, columnas, filas, ancho, alto) {
  // createElement y no "new Image()": en este archivo Image es el de antd.
  const img = document.createElement('img');
  img.src = src;
  await img.decode();
  const densidad = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(ancho * densidad));
  const h = Math.max(1, Math.round(alto * densidad));
  const sw = img.naturalWidth / columnas;
  const sh = img.naturalHeight / filas;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const urls = [];
  for (let id = 0; id < columnas * filas; id++) {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, (id % columnas) * sw, Math.floor(id / columnas) * sh, sw, sh, 0, 0, w, h);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
    urls.push(URL.createObjectURL(blob));
  }
  return urls;
}

function RanuraRompecabezas({ id, piezaId, imagen, recorte, columnas, filas }) {
  const { isOver, setNodeRef: setDropRef } = useDroppable({ id });
  const dragId = piezaId !== null ? piezaId : `vacia-${id}`;
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: dragId,
    disabled: piezaId === null,
  });

  let pieza = null;
  if (piezaId !== null) {
    pieza = (
      <div
        ref={setDragRef}
        className="romp-pieza-tablero"
        style={{
          ...fondoPiezaRomp(piezaId, imagen, recorte, columnas, filas),
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
function PiezaCarrousel({ id, imagen, recorte, columnas, filas, ancho, alto }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <button
      type="button"
      ref={setNodeRef}
      className="romp-tray-pieza"
      style={{
        width: ancho,
        height: alto,
        ...fondoPiezaRomp(id, imagen, recorte, columnas, filas),
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
// Publicado: visible en todas las pantallas. Reutiliza los MISMOS temas y fotos de personajes ya
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
// En desarrollo: solo con el modo desarrollador activo (.memory-solo-dev).
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
// Publicado (todas las pantallas), con todos sus temas; el boton "Modo
// desarrollador" de su selector solo aparece con el modo desarrollador
// activo (.dif-dev-btn). Cada JUEGO es un PAR de imagenes en
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

// ========== PINTAR POR NÚMEROS (DESCONTINUADO) ==========
// Desde 2026-10-21 el juego oficial es el de láminas con cuadrícula ("pixel",
// más abajo), que en el menú se llama "Pintar por números". Este queda como
// "Pintar por números (descontinuado)", solo con el modo desarrollador
// (.memory-solo-dev).
// Publicado (todas las pantallas, igual que Diferencias); el boton "Modo
// desarrollador" de su selector solo aparece con el modo desarrollador
// activo (.dif-dev-btn). Cada lámina es UNA imagen en
// src/assets/pintar/<tema>/nivel-<n>/<archivo>; la cuadrícula numerada la
// arma sola PintarJuego al abrirla (utils/pintarNumeros.js), así que no hay
// nada que anotar: basta con dejar el archivo en la carpeta del nivel (ver
// skills/agregar-pintar.md). Los temas y su orden se toman de TEMAS (mismos
// ids que el Memorice). El nivel define el tamaño de la cuadrícula (celdas
// del lado más largo) y el tope de colores. Igual que Diferencias: se
// sortea una lámina del nivel y para desbloquear el siguiente hay que
// terminar TODAS las del nivel; un nivel sin láminas no aparece.
const NIVELES_PINTAR = [
  { numero: 1, lado: 14, colores: 6 },
  { numero: 2, lado: 20, colores: 8 },
  { numero: 3, lado: 28, colores: 10 },
  { numero: 4, lado: 36, colores: 12 },
  { numero: 5, lado: 44, colores: 14 },
];

const ENTRADAS_PINTAR = import.meta.glob('../assets/pintar/*/*/*.{png,jpg,jpeg,webp,avif}');

// { <tema>: [{ id, nombre, cargar, nivel }] } — nivel = null si está en
// <tema>/por-asignar/ (solo se ve en el Modo desarrollador, PintarDev).
const LAMINAS_PINTAR = {};
for (const [ruta, cargar] of Object.entries(ENTRADAS_PINTAR)) {
  const m = ruta.match(/pintar\/([^/]+)\/(?:nivel-(\d+)|por-asignar)\/([^/]+)\.[a-z0-9]+$/i);
  if (!m) continue;
  const nivel = m[2] ? Number(m[2]) : null;
  (LAMINAS_PINTAR[m[1]] ??= []).push({
    id: `${nivel ? `nivel-${nivel}` : 'por-asignar'}/${m[3]}`,
    nombre: m[3],
    cargar,
    nivel,
  });
}

// Todas las láminas por tema (para el Modo desarrollador).
const TEMAS_PINTAR_DEV = TEMAS
  .map((t) => ({
    id: t.id,
    nombre: t.nombre,
    header: t.header,
    laminas: (LAMINAS_PINTAR[t.id] ?? []).sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })),
  }))
  .filter((t) => t.laminas.length > 0);

// Solo lo jugable: láminas con nivel, agrupadas por nivel.
const TEMAS_PINTAR = TEMAS_PINTAR_DEV
  .map((t) => ({
    id: t.id,
    nombre: t.nombre,
    header: t.header,
    niveles: NIVELES_PINTAR
      .map((n) => ({ ...n, laminas: t.laminas.filter((l) => l.nivel === n.numero) }))
      .filter((n) => n.laminas.length > 0),
  }))
  .filter((t) => t.niveles.length > 0);

function nivelKeyPintar(temaId) {
  return `musica-kids-pintar-nivel-${temaId}`;
}

function leerNivelGuardadoPintar(temaId, totalNiveles) {
  try {
    const n = parseInt(localStorage.getItem(nivelKeyPintar(temaId)), 10);
    return n >= 0 && n < totalNiveles ? n : 0;
  } catch {
    return 0;
  }
}

// Ids de las láminas del tema ya terminadas al menos una vez (por tema).
function completadosKeyPintar(temaId) {
  return `musica-kids-pintar-completados-${temaId}`;
}

function leerCompletadosPintar(temaId) {
  try {
    const lista = JSON.parse(localStorage.getItem(completadosKeyPintar(temaId)));
    return Array.isArray(lista) ? lista.filter((c) => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

function guardarCompletadosPintar(temaId, lista) {
  try {
    localStorage.setItem(completadosKeyPintar(temaId), JSON.stringify(lista));
  } catch {
    // Sin localStorage el progreso dura lo que dure la sesion.
  }
}

// ========== PINTAR PIXEL ART (juego oficial "Pintar por números") ==========
// Publicado desde 2026-10-21 (visible para todos) con el nombre "Pintar por
// números"; internamente sigue siendo "pixel". La cuadrícula la
// establece el usuario sobre cada imagen original y MANDA: no hay niveles.
// - src/assets/pintar-pixel/<tema>/originales/<nombre>.avif: la imagen tal
//   como la trajo el usuario (solo la ve el Modo desarrollador, PintarPixelDev).
// - src/assets/pintar-pixel/<tema>/laminas/<nombre>.avif: la lámina RECREADA
//   desde cero con esa cuadrícula (herramientas/pintar_desde_cuadricula.py:
//   1 pixel = 1 celda, máx. 15 colores, AVIF sin pérdida). Es lo que se juega.
// Flujo completo en skills/agregar-pintar.md.
const ENTRADAS_PIXEL = import.meta.glob('../assets/pintar-pixel/*/*/*.{png,jpg,jpeg,webp,avif}');
const ARCHIVOS_PIXEL = {};
for (const [ruta, cargar] of Object.entries(ENTRADAS_PIXEL)) {
  const m = ruta.match(/pintar-pixel\/([^/]+)\/(originales|laminas)\/([^/]+)\.[a-z0-9]+$/i);
  if (!m) continue;
  ((ARCHIVOS_PIXEL[m[1]] ??= { originales: [], laminas: [] })[m[2]]).push({ id: m[3], nombre: m[3], cargar });
}
// Temas que solo existen en este juego (no tienen set de Memorice, así que
// tampoco dorso): su card del selector es src/assets/pintar-pixel/<tema>/portada.avif
// (cuadrada). Los temas del Memorice siguen usando su dorso.
const TEMAS_PIXEL_PROPIOS = [
  { id: 'hello-kitty', nombre: 'Hello Kitty', header: 'linear-gradient(120deg, #F78FB3 0%, #E8457A 55%, #D7263D 100%)' },
  { id: 'kpop', nombre: 'Guerreras K-pop', header: 'linear-gradient(120deg, #9B5DE5 0%, #E0388F 55%, #1F3A93 100%)' },
  { id: 'winnie-pooh', nombre: 'Winnie Pooh', header: 'linear-gradient(120deg, #F6B93B 0%, #E58E26 55%, #C0392B 100%)' },
  { id: 'bluey', nombre: 'Bluey', header: 'linear-gradient(120deg, #7FB3E8 0%, #3D5A98 55%, #F28C38 100%)' },
  { id: 'halloween', nombre: 'Halloween', header: 'linear-gradient(120deg, #F28C28 0%, #7A3FA0 55%, #2B2B2B 100%)' },
  { id: 'pokemon', nombre: 'Pokémon', header: 'linear-gradient(120deg, #FFD93B 0%, #F2A007 55%, #E3350D 100%)' },
  { id: 'sonic', nombre: 'Sonic', header: 'linear-gradient(120deg, #3A7BD5 0%, #1E3C9E 55%, #E0262E 100%)' },
  { id: 'unicornio', nombre: 'Unicornios', header: 'linear-gradient(120deg, #F7A8D8 0%, #B57EDC 55%, #6EC6F0 100%)' },
];
const PORTADAS_PIXEL = Object.fromEntries(
  Object.entries(import.meta.glob('../assets/pintar-pixel/*/portada.avif', { eager: true, import: 'default' }))
    .map(([ruta, url]) => [ruta.match(/pintar-pixel\/([^/]+)\//)[1], url]),
);
const TEMAS_PIXEL = [...TEMAS, ...TEMAS_PIXEL_PROPIOS]
  .filter((t) => ARCHIVOS_PIXEL[t.id])
  .map((t) => {
    const orden = (a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true });
    return {
      id: t.id,
      nombre: t.nombre,
      header: t.header,
      portada: PORTADAS_PIXEL[t.id] ?? null,
      originales: ARCHIVOS_PIXEL[t.id].originales.sort(orden),
      laminas: ARCHIVOS_PIXEL[t.id].laminas.sort(orden),
    };
  });

// Láminas ya terminadas por tema (solo para marcarlas en la lista).
function completadasKeyPixel(temaId) {
  return `musica-kids-pixel-completadas-${temaId}`;
}

function leerCompletadasPixel(temaId) {
  try {
    const lista = JSON.parse(localStorage.getItem(completadasKeyPixel(temaId)));
    return Array.isArray(lista) ? lista.filter((c) => typeof c === 'string') : [];
  } catch {
    return [];
  }
}

function guardarCompletadasPixel(temaId, lista) {
  try {
    localStorage.setItem(completadasKeyPixel(temaId), JSON.stringify(lista));
  } catch {
    // Sin localStorage las marcas duran lo que dure la sesion.
  }
}

// Lámina a medias por tema ({ lamina, total, pintadas: [índices] }): si se
// cierra la ventana a mitad de una lámina, al volver a entrar al MISMO tema
// se retoma esa lámina con lo ya pintado.
function progresoKeyPixel(temaId) {
  return `musica-kids-pixel-progreso-${temaId}`;
}

function leerProgresoPixel(temaId) {
  try {
    const p = JSON.parse(localStorage.getItem(progresoKeyPixel(temaId)));
    return p && typeof p.lamina === 'string' && Number.isInteger(p.total) && Array.isArray(p.pintadas) ? p : null;
  } catch {
    return null;
  }
}

function guardarProgresoPixel(temaId, progreso) {
  try {
    if (progreso) localStorage.setItem(progresoKeyPixel(temaId), JSON.stringify(progreso));
    else localStorage.removeItem(progresoKeyPixel(temaId));
  } catch {
    // Sin localStorage el avance dura lo que dure la sesion.
  }
}

// Stepper del encabezado en Pintar por números: un círculo por número de la
// lámina, unidos por una línea; los ya pintados en violeta, el que toca más
// grande con anillo, los que vienen en gris. En celular solo se ven los
// cercanos al actual (.lejos), para que quepa.
function StepperPintar({ actual, total }) {
  const enCurso = actual ?? total + 1;
  return (
    <div className="pintar-stepper" aria-label={actual ? `Número ${actual} de ${total}` : 'Lámina terminada'}>
      {Array.from({ length: total }, (_, k) => {
        const n = k + 1;
        const estado = n < enCurso ? ' hecho' : n === enCurso ? ' actual' : '';
        const lejos = Math.abs(n - Math.min(enCurso, total)) > 2 ? ' lejos' : '';
        return (
          <Fragment key={n}>
            {k > 0 && <span className={`pintar-stepper-linea${n <= enCurso ? ' hecho' : ''}${lejos}`} aria-hidden="true" />}
            <span className={`pintar-stepper-paso${estado}${lejos}`}>{n}</span>
          </Fragment>
        );
      })}
    </div>
  );
}

export default function MenuActividades({ onOpenChange }) {
  // 'menu' = las 2 tarjetas raiz. 'memorice'/'imprimir' = cada seccion.
  const [vista, setVista] = useState('menu');
  // Grupo cuya galeria se esta viendo dentro de "Imprimir" (null = todavia
  // en el selector de grupos).
  const [grupoImprimir, setGrupoImprimir] = useState(null);
  const [imagenesGaleria, setImagenesGaleria] = useState(null);
  // Colorear: grupo elegido (id de GRUPOS_IMPRIMIBLES, 'mios' = "Mis
  // dibujos", null = selector), lamina abierta en el lienzo y lo guardado.
  const [grupoColorear, setGrupoColorear] = useState(null);
  const [laminaColorear, setLaminaColorear] = useState(null);
  const [laminasColorear, setLaminasColorear] = useState(null);
  const [dibujosColorear, setDibujosColorear] = useState(null);
  const [miniaturasColorear, setMiniaturasColorear] = useState({});
  const [versionDibujos, setVersionDibujos] = useState(0);
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
  // Nivel cuya grilla de rompecabezas se ve en ese modal (null = la lista
  // de niveles).
  const [nivelVistoRomp, setNivelVistoRomp] = useState(null);
  // Vista previa de la imagen completa armada (boton "Ver imagen" del
  // header) — util sobre todo del nivel 2 en adelante, donde ya no hay
  // guia transparente de fondo.
  const [mostrarPreviaRomp, setMostrarPreviaRomp] = useState(false);
  // Pagina "Todos los rompecabezas" (boton del selector de temas, solo con
  // el modo desarrollador): un tab por tema, con todos sus niveles en miniatura.
  const [catalogoRomp, setCatalogoRomp] = useState(false);
  const [tabCatalogoRomp, setTabCatalogoRomp] = useState(null);
  // 'afinar' | 'listos' | null (null = el que corresponda, ver elegirEstadoDev).
  const [estadoCatalogoRompElegido, setEstadoCatalogoRompElegido] = useState(null);
  // true mientras el panel lateral de la propuesta esta abierto: el Escape
  // lo cierra el (antd Drawer) y no debe cerrar tambien el drawer del menu.
  const panelAfinarRompAbiertoRef = useRef(false);
  const marcarPanelAfinarRomp = useCallback((abierto) => {
    panelAfinarRompAbiertoRef.current = abierto;
  }, []);
  // Igual para Colorear: con un panel de la barra (lapices, colores,
  // tamaño) o un dialogo de borrado abierto, el Escape cierra solo eso.
  const capaColorearAbiertaRef = useRef(false);
  const marcarCapaColorear = useCallback((abierta) => {
    capaColorearAbiertaRef.current = abierta;
  }, []);
  // Propuesta de asignacion por piezas ({ codigo: piezas }), armada en los
  // dos tabs; el boton del centro del header la cuenta y abre su modal con
  // "Copiar" (ver utils/propuestaRompecabezas.js).
  const [propuestaRomp, setPropuestaRomp] = useState(leerPropuestaRompecabezas);
  const [mostrarPropuestaRomp, setMostrarPropuestaRomp] = useState(false);
  // false | 'ok' | 'error'
  const [copiadoPropuestaRomp, setCopiadoPropuestaRomp] = useState(false);
  useEffect(() => {
    guardarPropuestaRompecabezas(propuestaRomp);
  }, [propuestaRomp]);
  // piezas = null lo saca de la propuesta.
  const cambiarPropuestaRomp = useCallback((id, piezas) => {
    setPropuestaRomp((prev) => {
      const copia = { ...prev };
      if (piezas) copia[id] = piezas;
      else delete copia[id];
      return copia;
    });
  }, []);
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

  // ===== Pintar por números: el juego vive en PintarJuego (mismo esquema
  // que Diferencias: se reinicia volviendolo a montar con otra "key"). =====
  const [temaPinId, setTemaPinId] = useState(null);
  const [nivelIdxPin, setNivelIdxPin] = useState(0);
  const [nivelMaximoPin, setNivelMaximoPin] = useState(0);
  const [laminaIdPin, setLaminaIdPin] = useState(null);
  const [completadosPin, setCompletadosPin] = useState([]);
  const [partidaPin, setPartidaPin] = useState(0);
  const [ganoPin, setGanoPin] = useState(false);
  const [mostrarNivelesPin, setMostrarNivelesPin] = useState(false);
  // Pagina del Modo desarrollador (ver cada lamina en todos los niveles).
  const [devPin, setDevPin] = useState(false);

  // ===== Pintar pixel art (oficial "Pintar por números"): tema → lámina al azar. =====
  const [temaPixId, setTemaPixId] = useState(null);
  const [laminaPixId, setLaminaPixId] = useState(null);
  const [partidaPix, setPartidaPix] = useState(0);
  const [ganoPix, setGanoPix] = useState(false);
  const [completadasPix, setCompletadasPix] = useState([]);
  const [devPix, setDevPix] = useState(false);

  // ===== Simón dice: grupo de música elegido (define los colores de la
  // página y de la carcasa), nivel en curso para el header (null = antes de
  // tocar Jugar) y partida (cambia con "Reiniciar" para remontar el juego).
  const [grupoSimonId, setGrupoSimonId] = useState(null);
  const [nivelSimon, setNivelSimon] = useState(null);
  const [partidaSimon, setPartidaSimon] = useState(0);
  // Avance guardado con el que se retoma la lámina al entrar al tema (null =
  // lámina desde cero) y número en curso / total para el stepper del header.
  const [progresoPix, setProgresoPix] = useState(null);
  const [estadoPix, setEstadoPix] = useState(null);

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
  const irAPintar = useCallback(() => setVista('pintar'), []);
  const irAPixel = useCallback(() => setVista('pixel'), []);
  const irAColorear = useCallback(() => setVista('colorear'), []);

  // ===== Colorear =====
  // Lo vencido (7 dias sin uso) se borra apenas abre la app, no solo al entrar a Colorear.
  useEffect(() => {
    limpiarDibujosVencidos();
  }, []);

  // Laminas del grupo elegido (perezoso, como la galeria de Imprimir).
  useEffect(() => {
    if (!grupoColorear || grupoColorear === 'mios') {
      setLaminasColorear(null);
      return;
    }
    let vivo = true;
    const entradas = LOADERS_GALERIA[GALLERY_FOLDERS[grupoColorear]] ?? [];
    Promise.all(entradas.map(([ruta, cargar]) => cargar().then((m) => ({ id: idLaminaColorear(ruta), src: m.default }))))
      .then((laminas) => {
        if (vivo) setLaminasColorear(laminas);
      });
    return () => {
      vivo = false;
    };
  }, [grupoColorear]);

  // Lo pintado en este dispositivo (miniaturas para las grillas). Se relee
  // cada vez que el lienzo guarda o se borra algo (versionDibujos).
  // Las URLs anteriores se liberan recien cuando llegan las nuevas (si no,
  // las miniaturas parpadean rotas mientras se relee).
  const miniaturasColorearRef = useRef({});
  useEffect(() => {
    if (vista !== 'colorear') return;
    let vivo = true;
    leerDibujos().then((dibujos) => {
      if (!vivo) return;
      const urls = Object.fromEntries(dibujos.map((d) => [d.id, URL.createObjectURL(d.miniatura)]));
      Object.values(miniaturasColorearRef.current).forEach((u) => URL.revokeObjectURL(u));
      miniaturasColorearRef.current = urls;
      setDibujosColorear(dibujos);
      setMiniaturasColorear(urls);
    });
    return () => {
      vivo = false;
    };
  }, [vista, versionDibujos]);

  // Lamina abierta: { id, src } (src se pide recien al abrirla).
  const abrirLaminaColorear = useCallback((id) => {
    cargarLaminaColorear(id).then((src) => {
      if (src) setLaminaColorear({ id, src });
    });
  }, []);
  const avisarGuardadoColorear = useCallback(() => setVersionDibujos((v) => v + 1), []);
  const imprimirDibujoGuardado = useCallback((d) => {
    cargarLaminaColorear(d.id).then((src) => {
      if (src) imprimirDibujo(d.capa, src, imprimirImagen, d.textos);
    });
  }, []);
  const guardarImagenDibujoGuardado = useCallback((d) => {
    cargarLaminaColorear(d.id).then((src) => {
      if (src) guardarImagenDibujo(d.capa, src, d.id, d.textos);
    });
  }, []);
  const borrarDibujoGuardado = useCallback((id) => {
    borrarDibujo(id).then(() => setVersionDibujos((v) => v + 1));
  }, []);
  const volverColorear = useCallback(() => {
    if (laminaColorear) setLaminaColorear(null);
    else if (grupoColorear) setGrupoColorear(null);
    else setVista('menu');
  }, [laminaColorear, grupoColorear]);
  const irASimon = useCallback(() => setVista('simon'), []);
  const irAHoraDormir = useCallback(() => setVista('horaDormir'), []);
  const volverAlMenu = useCallback(() => {
    setVista('menu');
    setGrupoImprimir(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    let vivo = true;
    // Todo tema con dorso, listo o no: un tema "Muy pronto" (ej. sin fondo
    // todavia) tambien muestra su dorso en la card del selector.
    const conDorso = TEMAS.filter((t) => t.back);
    Promise.all(conDorso.map((t) => t.back().then((m) => [t.id, m.default])))
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
      tema.fondo ? tema.fondo() : Promise.resolve(null),
      tema.back(),
      Promise.all(tema.caras.map(({ info, cargar }) =>
        cargar().then((m) => ({ id: info.archivo, src: m.default, alt: etiquetaDesdeArchivo(info.archivo) }))
      )),
    ]).then(([fondoMod, backMod, caras]) => {
      if (vivo) setFotosTema({ fondo: fondoMod?.default ?? null, back: backMod.default, caras });
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

  // Pagina "Todos los rompecabezas": primero el estado ("En preparacion" /
  // "Procesados", abre en "En preparacion" si hay alguno), despues un tab por tema
  // (solo los que tienen algun rompecabezas en ese estado), y el tab activo
  // cae en el primero mientras no se haya elegido otro.
  const estadoCatalogoRomp = elegirEstadoDev(
    estadoCatalogoRompElegido,
    TEMAS_ROMPECABEZAS.some((t) => t.catalogo.afinar.length > 0)
  );
  const temasCatalogoRomp = TEMAS_ROMPECABEZAS.filter((t) => t.catalogo[estadoCatalogoRomp].length > 0);
  const tabActivaRomp = temasCatalogoRomp.some((t) => t.id === tabCatalogoRomp)
    ? tabCatalogoRomp
    : temasCatalogoRomp[0]?.id;
  const temaActivoCatalogoRomp = temasCatalogoRomp.find((t) => t.id === tabActivaRomp);
  // Bloques del tab activo para RompecabezasPropuesta: "Sin nivel" en Por
  // afinar, uno por nivel en Listos (con las piezas de ese nivel).
  let seccionesCatalogoRomp = [];
  if (temaActivoCatalogoRomp && estadoCatalogoRomp === 'afinar') {
    const lista = temaActivoCatalogoRomp.porAfinar;
    seccionesCatalogoRomp = [{
      clave: 'sin-nivel',
      titulo: 'Sin nivel',
      subtitulo: `${lista.length} rompecabezas`,
      rompecabezas: lista.map((r) => ({ ...r, piezasActuales: null })),
    }];
  } else if (temaActivoCatalogoRomp) {
    seccionesCatalogoRomp = temaActivoCatalogoRomp.niveles.map((n) => ({
      clave: `nivel-${n.numero}`,
      titulo: `Nivel ${n.numero}`,
      subtitulo: `${n.piezas} piezas · ${n.rompecabezas.length} rompecabezas`,
      rompecabezas: n.rompecabezas.map((r) => ({ ...r, piezasActuales: n.piezas })),
    }));
  }
  const cantidadPropuestaRomp = contarPropuesta(TEMAS_ROMPECABEZAS, propuestaRomp);
  const textoPropuestaRomp = textoPropuesta(TEMAS_ROMPECABEZAS, propuestaRomp);

  const copiarPropuestaRomp = () => {
    const avisar = (valor) => {
      setCopiadoPropuestaRomp(valor);
      setTimeout(() => setCopiadoPropuestaRomp(false), valor === 'error' ? 4000 : 1600);
    };
    if (!navigator.clipboard) {
      avisar('error');
      return;
    }
    navigator.clipboard.writeText(textoPropuestaRomp).then(() => avisar('ok')).catch(() => avisar('error'));
  };

  const vaciarPropuestaRomp = () => {
    if (window.confirm('¿Vaciar toda la propuesta? Se pierden las piezas elegidas.')) setPropuestaRomp({});
  };

  // Trae las imagenes de los niveles del tab activo (recien cuando se
  // abre esa pagina, y solo las del tab que se esta viendo). Los loaders de
  // import.meta.glob ya cachean el modulo, asi que volver a un tab ya
  // visto no pide nada de nuevo.
  useEffect(() => {
    if (!catalogoRomp) return;
    const tema = TEMAS_ROMPECABEZAS.find((t) => t.id === tabActivaRomp);
    if (!tema) return;
    let vivo = true;
    tema.catalogo[estadoCatalogoRomp].forEach((nivel) => {
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
  }, [catalogoRomp, tabActivaRomp, estadoCatalogoRomp]);

  // Elegir un tema (o volver a elegirlo) retoma el nivel guardado de ESE
  // tema y sortea su rompecabezas antes de pedir ninguna imagen — asi el
  // efecto de carga de abajo pide la foto correcta desde el principio, no
  // la del nivel que se estaba jugando en el tema anterior.
  useEffect(() => {
    if (!temaRompId || !temaRomp) return;
    const { nivelMaximo: inicial, ids: completados } = retomarProgresoRompecabezas(temaRomp);
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
      if (vivo) setImagenRomp({ ...res, rompId: rompActualRomp.id });
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
    setTableroRomp(estadoInicialRompecabezas(nivelActualRomp.piezas, imagenRomp.rompId));
  }, [imagenRomp, nivelActualRomp]);

  const totalPiezasRomp = tableroRomp.posiciones.length;
  // Gana cuando CADA ranura tiene puesta justo la pieza que le corresponde
  // (no solo "todas ocupadas": podrian estar todas llenas pero mal
  // repartidas, ya que ahora cualquier pieza puede ir en cualquier lado).
  // Y solo si el tablero es del rompecabezas elegido AHORA: al tocar "Otro
  // rompecabezas" (o uno de la grilla del modal) el tablero viejo, resuelto,
  // sigue en pantalla hasta que carga la foto nueva; sin este control, en
  // ese instante se guardaba como armado el rompecabezas NUEVO sin haberlo
  // hecho.
  const ganoRomp = totalPiezasRomp > 0
    && tableroRomp.rompId === rompIdRomp
    && tableroRomp.posiciones.every((p, i) => p === i);
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
  // Mientras falte alguno del nivel se sigue en el, sea o no el nivel mas
  // alto desbloqueado: un nivel ya superado puede volver a tener pendientes
  // (rompecabezas nuevos, o armados borrados por inactividad)
  // y antes, al armar uno, se saltaba al siguiente aunque faltaran.
  const seguirEnNivelRomp = faltanRomp > 0;

  // Guarda cada rompecabezas apenas se arma.
  useEffect(() => {
    if (!ganoRomp || !temaRompId || !rompActualRomp) return;
    if (completadosRomp.includes(rompActualRomp.id)) return;
    setCompletadosRomp(guardarCompletadosRompecabezas(temaRompId, [...completadosRomp, rompActualRomp.id]));
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
  // Abre el modal de "Reiniciar" en la lista de niveles.
  const abrirNivelesRomp = useCallback(() => {
    setNivelVistoRomp(null);
    setMostrarNivelesRomp(true);
  }, []);

  // Miniaturas del nivel abierto en el modal (solo de ese nivel, y recien
  // cuando se abre). Comparten el cache con la pagina "Todos los
  // rompecabezas".
  useEffect(() => {
    if (!mostrarNivelesRomp || nivelVistoRomp === null || !temaRomp) return;
    const nivel = temaRomp.niveles[nivelVistoRomp];
    if (!nivel) return;
    let vivo = true;
    nivel.rompecabezas.forEach((romp) => {
      cargarImagenConAspecto(romp.cargar).then((res) => {
        if (!vivo) return;
        setMiniaturasRomp((prev) => (prev[romp.id]?.src === res.src ? prev : { ...prev, [romp.id]: res }));
      });
    });
    return () => {
      vivo = false;
    };
  }, [mostrarNivelesRomp, nivelVistoRomp, temaRomp]);

  // "idElegido" (opcional) salta a ese rompecabezas puntual en vez de
  // sortear: es el que se toca en la grilla del modal de niveles.
  const reiniciarRomp = useCallback((idx, idElegido) => {
    if (!temaRomp) return;
    const siguiente = idx ?? nivelIdxRomp;
    const nivel = temaRomp.niveles[siguiente];
    if (!nivel) return;
    setPiezaArrastrandoRomp(null);
    setMostrarPreviaRomp(false);
    const nuevoId = idElegido ?? elegirAlAzarPendiente(nivel.rompecabezas, rompIdRomp, idsCompletosRomp);
    if (siguiente === nivelIdxRomp && nuevoId === rompIdRomp) {
      setTableroRomp(estadoInicialRompecabezas(nivel.piezas, nuevoId));
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
  // Recortes de las piezas (una URL por pieza; null mientras se arman).
  const [recortesRomp, setRecortesRomp] = useState(null);
  const [celdaRomp, setCeldaRomp] = useState({
    anchoTablero: 0, altoTablero: 0, columnas: 1, filas: 1,
    celdaW: 0, celdaH: 0, trayAlto: null, trayAncho: null, bandeja: 'abajo',
  });

  // Recorta las piezas cuando hay foto y tamaño de pieza (y otra vez si el
  // tamaño cambia, p. ej. al girar la tablet). Las URLs viejas se liberan.
  useEffect(() => {
    const { columnas, filas, celdaW, celdaH } = celdaRomp;
    if (!imagenRomp?.src || !columnas || !filas || !celdaW || !celdaH) {
      setRecortesRomp(null);
      return undefined;
    }
    let vivo = true;
    let urls = null;
    recortarPiezasRomp(imagenRomp.src, columnas, filas, celdaW, celdaH)
      .then((lista) => {
        urls = lista;
        if (vivo) setRecortesRomp(lista);
        else lista.forEach((u) => URL.revokeObjectURL(u));
      })
      .catch(() => {});
    return () => {
      vivo = false;
      setRecortesRomp(null);
      urls?.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [imagenRomp?.src, celdaRomp.columnas, celdaRomp.filas, celdaRomp.celdaW, celdaRomp.celdaH]);

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
  // Igual que en Rompecabezas: mientras falte alguno del nivel se sigue
  // en el, aunque no sea el nivel mas alto desbloqueado.
  const seguirEnNivelDif = faltanDif > 0;

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

  // ===== Pintar por números: logica del drawer (misma que Diferencias) =====
  const temaPin = temaPinId ? TEMAS_PINTAR.find((t) => t.id === temaPinId) : null;
  const nivelActualPin = temaPin?.niveles[nivelIdxPin];
  const laminaActualPin = nivelActualPin?.laminas.find((l) => l.id === laminaIdPin) ?? null;

  const elegirTemaPin = useCallback((id) => {
    const t = TEMAS_PINTAR.find((x) => x.id === id);
    if (!t) return;
    const inicial = leerNivelGuardadoPintar(id, t.niveles.length);
    const completados = leerCompletadosPintar(id);
    setTemaPinId(id);
    setNivelIdxPin(inicial);
    setNivelMaximoPin(inicial);
    setCompletadosPin(completados);
    setLaminaIdPin(elegirAlAzarPendiente(t.niveles[inicial].laminas, null, completados));
    setPartidaPin((p) => p + 1);
    setGanoPin(false);
    setMostrarNivelesPin(false);
  }, []);

  const volverAlSelectorPin = useCallback(() => {
    setTemaPinId(null);
    setLaminaIdPin(null);
    setGanoPin(false);
    setMostrarNivelesPin(false);
  }, []);

  const marcarGanoPin = useCallback(() => setGanoPin(true), []);

  const siguienteNivelIdxPin = temaPin && nivelIdxPin + 1 < temaPin.niveles.length
    ? nivelIdxPin + 1
    : undefined;
  const numeroSiguienteNivelPin = siguienteNivelIdxPin !== undefined
    ? temaPin.niveles[siguienteNivelIdxPin].numero
    : null;
  const enFronteraPin = nivelIdxPin === nivelMaximoPin;
  const nivelesAlcanzadosPin = temaPin ? temaPin.niveles.slice(0, nivelMaximoPin + 1) : [];

  const idsCompletosPin = useMemo(
    () => (ganoPin && laminaActualPin && !completadosPin.includes(laminaActualPin.id)
      ? [...completadosPin, laminaActualPin.id]
      : completadosPin),
    [ganoPin, laminaActualPin, completadosPin]
  );
  const faltanPin = nivelActualPin
    ? nivelActualPin.laminas.filter((l) => !idsCompletosPin.includes(l.id)).length
    : 0;
  const seguirEnNivelPin = faltanPin > 0;

  useEffect(() => {
    if (!ganoPin || !temaPinId || !laminaActualPin) return;
    if (completadosPin.includes(laminaActualPin.id)) return;
    const siguiente = [...completadosPin, laminaActualPin.id];
    setCompletadosPin(siguiente);
    guardarCompletadosPintar(temaPinId, siguiente);
  }, [ganoPin, temaPinId, laminaActualPin, completadosPin]);

  const reiniciarPin = useCallback((idx) => {
    if (!temaPin) return;
    const siguiente = idx ?? nivelIdxPin;
    const nivel = temaPin.niveles[siguiente];
    if (!nivel) return;
    setNivelIdxPin(siguiente);
    setLaminaIdPin(elegirAlAzarPendiente(nivel.laminas, laminaIdPin, idsCompletosPin));
    setPartidaPin((p) => p + 1);
    setGanoPin(false);
    setMostrarNivelesPin(false);
  }, [temaPin, nivelIdxPin, laminaIdPin, idsCompletosPin]);

  useEffect(() => {
    if (nivelIdxPin > nivelMaximoPin) setNivelMaximoPin(nivelIdxPin);
  }, [nivelIdxPin, nivelMaximoPin]);

  useEffect(() => {
    if (!temaPinId) return;
    try {
      localStorage.setItem(nivelKeyPintar(temaPinId), String(nivelMaximoPin));
    } catch {
      // Sin localStorage el progreso dura lo que dure la sesion.
    }
  }, [temaPinId, nivelMaximoPin]);

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
    setTemaPinId(null);
    setLaminaIdPin(null);
    setGanoPin(false);
    setMostrarNivelesPin(false);
    setNivelIdxPin(0);
    setDevPin(false);
    setTemaPixId(null);
    setLaminaPixId(null);
    setGanoPix(false);
    setDevPix(false);
    setGrupoColorear(null);
    setLaminaColorear(null);
    setGrupoSimonId(null);
    setNivelSimon(null);
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
    } else if (vista === 'pintar') {
      if (devPin) setDevPin(false);
      else if (temaPinId) volverAlSelectorPin();
      else volverAlMenu();
    } else if (vista === 'simon') {
      if (grupoSimonId) {
        setGrupoSimonId(null);
        setNivelSimon(null);
      } else volverAlMenu();
    } else if (vista === 'pixel') {
      if (devPix) setDevPix(false);
      else if (temaPixId) {
        setTemaPixId(null);
        setLaminaPixId(null);
        setGanoPix(false);
      } else volverAlMenu();
    } else if (vista === 'rompecabezas') {
      if (catalogoRomp) setCatalogoRomp(false);
      else if (temaRompId) volverAlSelectorRomp();
      else volverAlMenu();
    } else if (vista === 'horaDormir') {
      volverAlMenu();
    }
  }, [vista, temaId, grupoImprimir, temaRompId, catalogoRomp, temaContarId, temaSecId, devDif, temaDifId, temaPinId, devPin, devPix, laminaPixId, temaPixId, grupoSimonId, volverAlSelector, volverAlMenu, volverAlSelectorRomp, volverAlSelectorContar, volverAlSelectorSec, volverAlSelectorDif, volverAlSelectorPin]);

  // ===== Pintar pixel art: lógica del drawer =====
  const temaPix = temaPixId ? TEMAS_PIXEL.find((t) => t.id === temaPixId) : null;
  const laminaPix = temaPix?.laminas.find((l) => l.id === laminaPixId) ?? null;

  // Igual que los demás juegos: al elegir el tema se parte DIRECTO con una
  // lámina al azar entre las que faltan (sin lista que deje ver la figura
  // antes de pintarla); "Otra lámina" sortea la siguiente.
  const elegirTemaPix = useCallback((id) => {
    const t = TEMAS_PIXEL.find((x) => x.id === id);
    if (!t || t.laminas.length === 0) return;
    const completadas = leerCompletadasPixel(id);
    // Lámina a medias de este tema (si todavía existe y no está terminada):
    // se retoma; si no, una al azar entre las que faltan.
    const guardado = leerProgresoPixel(id);
    const retomar = guardado && t.laminas.some((l) => l.id === guardado.lamina) && !completadas.includes(guardado.lamina)
      ? guardado
      : null;
    setTemaPixId(id);
    setCompletadasPix(completadas);
    setLaminaPixId(retomar ? retomar.lamina : elegirAlAzarPendiente(t.laminas, null, completadas));
    setProgresoPix(retomar);
    setEstadoPix(null);
    setPartidaPix((p) => p + 1);
    setGanoPix(false);
  }, []);

  const otraLaminaPix = useCallback(() => {
    if (!temaPix) return;
    const completadas = completadasPix.includes(laminaPixId) ? completadasPix : [...completadasPix, laminaPixId];
    setLaminaPixId(elegirAlAzarPendiente(temaPix.laminas, laminaPixId, completadas));
    setProgresoPix(null);
    setEstadoPix(null);
    setPartidaPix((p) => p + 1);
    setGanoPix(false);
  }, [temaPix, laminaPixId, completadasPix]);

  // Cada avance de la lámina en curso se guarda (para retomarla).
  const guardarAvancePix = useCallback((pintadas, total) => {
    if (!temaPixId || !laminaPixId) return;
    guardarProgresoPixel(temaPixId, { lamina: laminaPixId, total, pintadas });
  }, [temaPixId, laminaPixId]);

  // Láminas del tema que faltan por terminar (contando la recién ganada).
  const faltanPix = temaPix
    ? temaPix.laminas.filter((l) => !completadasPix.includes(l.id) && !(ganoPix && l.id === laminaPixId)).length
    : 0;

  const marcarGanoPix = useCallback(() => setGanoPix(true), []);

  // Guarda la lámina como terminada apenas se completa.
  useEffect(() => {
    if (!ganoPix || !temaPixId || !laminaPixId || completadasPix.includes(laminaPixId)) return;
    const siguiente = [...completadasPix, laminaPixId];
    setCompletadasPix(siguiente);
    guardarCompletadasPixel(temaPixId, siguiente);
    // Terminada: ya no hay nada que retomar.
    guardarProgresoPixel(temaPixId, null);
  }, [ganoPix, temaPixId, laminaPixId, completadasPix]);

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

  // Modal descartable abierto encima del juego (elegir nivel, ver la imagen
  // del rompecabezas). Mientras lo esta, el modal manda: el header del
  // drawer (Volver, Cerrar, Reiniciar) queda difuminado e inerte, porque
  // con dos "cerrar" a la vista el niño tocaba el de atras y se le cerraba
  // la partida entera. El modal de victoria NO entra aca: no tiene boton
  // propio de salida, asi que el Volver de arriba sigue siendo la salida.
  const subModalAbierto =
    (vista === 'memorice' && mostrarNiveles)
    || (vista === 'rompecabezas' && (mostrarNivelesRomp || mostrarPreviaRomp || mostrarPropuestaRomp))
    || (vista === 'contar' && mostrarNivelesContar)
    || (vista === 'secuencias' && mostrarNivelesSec)
    || (vista === 'diferencias' && mostrarNivelesDif)
    || (vista === 'pintar' && mostrarNivelesPin);

  const cerrarSubModales = useCallback(() => {
    setMostrarNiveles(false);
    setMostrarNivelesRomp(false);
    setMostrarPreviaRomp(false);
    setMostrarPropuestaRomp(false);
    setMostrarNivelesContar(false);
    setMostrarNivelesSec(false);
    setMostrarNivelesDif(false);
    setMostrarNivelesPin(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      // Con la vista previa de una foto abierta, el Escape lo maneja ella
      // (se cierra sola) y el drawer se queda como esta.
      if (previewGaleriaAbiertaRef.current || panelAfinarRompAbiertoRef.current || capaColorearAbiertaRef.current) return;
      // Igual con un modal del juego: Escape cierra solo ese modal, nunca
      // la partida que esta debajo.
      if (subModalAbierto) {
        cerrarSubModales();
        return;
      }
      setOpen(false);
    };
    // Fase de captura: corre ANTES que el cierre de la vista previa, asi
    // todavia ve el ref en true (si corriera despues, la vista previa ya se
    // habria cerrado y el mismo Escape cerraria tambien el drawer).
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, subModalAbierto, cerrarSubModales]);

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
  const grupoSimon = grupoSimonId ? GRUPOS_SIMON.find((g) => g.id === grupoSimonId) : null;
  const temaSimon = grupoSimon ? themes[grupoSimon.theme] : null;
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
  } else if (vista === 'pintar') {
    mostrarVolver = true;
    tituloHeader = devPin ? 'Modo desarrollador' : temaPinId ? temaPin.nombre : 'Pintar por números (descontinuado)';
    colorHeader = devPin ? undefined : temaPin?.header;
  } else if (vista === 'pixel') {
    mostrarVolver = true;
    tituloHeader = devPix ? 'Modo desarrollador' : temaPixId ? temaPix.nombre : 'Pintar por números';
    colorHeader = devPix ? undefined : temaPix?.header;
  } else if (vista === 'simon') {
    mostrarVolver = true;
    tituloHeader = grupoSimon ? grupoSimon.name : 'Simón dice';
    colorHeader = temaSimon?.headerStyle?.background;
  } else if (vista === 'horaDormir') {
    mostrarVolver = true;
    tituloHeader = 'Hora de dormir';
  }
  if (vista === 'colorear') {
    const grupoInfo = GRUPOS_IMPRIMIBLES.find((g) => g.id === grupoColorear);
    mostrarVolver = true;
    tituloHeader = grupoColorear === 'mios' ? 'Mis dibujos' : grupoInfo?.nombre ?? 'Colorear';
    colorHeader = grupoInfo?.header;
  }
  const esMenu = !colorHeader;
  const celebrando = (vista === 'memorice' && gano)
    || (vista === 'rompecabezas' && ganoRomp)
    || (vista === 'contar' && ganoNivelContar)
    || (vista === 'secuencias' && ganoSec)
    || (vista === 'diferencias' && ganoDif)
    || (vista === 'pintar' && ganoPin)
    || (vista === 'pixel' && ganoPix);

  let estiloDrawer;
  if (vista === 'memorice' && fotosTema) {
    estiloDrawer = fotosTema.fondo
      ? { backgroundImage: `url(${fotosTema.fondo})`, ...(tema.fondoPosicion && { backgroundPosition: tema.fondoPosicion }) }
      : { background: tema.fondoAlterno };
  } else if (vista === 'simon' && temaSimon) {
    // Mismo fondo que la página del grupo en el reproductor.
    estiloDrawer = { background: temaSimon.gradient, '--simon-header-texto': temaSimon.token.colorText };
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
            className={`memory-drawer${modoDev ? ' memory-dev' : ''}${vista === 'simon' && temaSimon ? ` simon-tema${temaSimon.listTextColor ? ' simon-fondo-oscuro' : ''}` : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={estiloDrawer}
          >
            <div
              className={`memory-drawer-header${subModalAbierto ? ' memory-drawer-header--bloqueado' : ''}`}
              inert={subModalAbierto}
              aria-hidden={subModalAbierto || undefined}
            >
              <div className="memory-drawer-title">
                {mostrarVolver ? (
                  <div className="memory-titulo-fila">
                    <button
                      type="button"
                      className="memory-volver-btn"
                      onClick={vista === 'colorear' ? volverColorear : manejarVolver}
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
                {vista === 'pixel' && !devPix && laminaPix && estadoPix && (
                  <StepperPintar actual={estadoPix.actual} total={estadoPix.total} />
                )}
                {vista === 'rompecabezas' && catalogoRomp && (
                  <button
                    type="button"
                    className={`romp-propuesta-btn${cantidadPropuestaRomp > 0 ? ' con-cambios' : ''}`}
                    onClick={() => setMostrarPropuestaRomp(true)}
                  >
                    Propuesta
                    <span>{cantidadPropuestaRomp}</span>
                  </button>
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
                {vista === 'pintar' && temaPinId && (
                  <span className="memory-nivel-badge">Nivel {nivelActualPin?.numero}</span>
                )}
                {vista === 'simon' && grupoSimon && nivelSimon && (
                  <span className="memory-nivel-badge">Nivel {nivelSimon}</span>
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
                    onClick={abrirNivelesRomp}
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
                {vista === 'simon' && grupoSimon && nivelSimon && (
                  <button
                    type="button"
                    className="memory-reiniciar-btn"
                    onClick={() => setPartidaSimon((p) => p + 1)}
                  >
                    <ReloadOutlined /> Reiniciar
                  </button>
                )}
                {vista === 'pintar' && temaPinId && !ganoPin && (
                  <button
                    type="button"
                    className="memory-reiniciar-btn"
                    onClick={() => setMostrarNivelesPin(true)}
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
                      className="memory-picker-tile"
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
                        className="memory-picker-tile"
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
                      className="memory-picker-tile"
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
                      className="memory-picker-tile memory-solo-dev"
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
                      className="memory-picker-tile"
                      onClick={irADiferencias}
                      aria-label="Encuentra las diferencias"
                    >
                      <span className="memory-picker-img-wrap">
                        <img src={imagenDiferencias} alt="" className="memory-picker-img" />
                      </span>
                      <span className="memory-picker-nombre">Encuentra las diferencias</span>
                    </button>
                    {/* Colorear: publicado el 2026-10-23 (antes solo modo desarrollador). */}
                    <button
                      type="button"
                      className="memory-picker-tile"
                      onClick={irAColorear}
                      aria-label="Colorear"
                    >
                      <span className="memory-picker-img-wrap">
                        <img src={imagenColorear} alt="" className="memory-picker-img" />
                      </span>
                      <span className="memory-picker-nombre">Colorear</span>
                    </button>
                    {/* Juego oficial de pintar desde 2026-10-21 (internamente
                        "pixel": láminas recreadas con cuadrícula). El anterior
                        queda descontinuado, solo con el modo desarrollador. */}
                    <button
                      type="button"
                      className="memory-picker-tile"
                      onClick={irAPixel}
                      aria-label="Pintar por números"
                    >
                      <span className="memory-picker-img-wrap">
                        <img src={imagenPintarNumeros} alt="" className="memory-picker-img" />
                      </span>
                      <span className="memory-picker-nombre">Pintar por números</span>
                    </button>
                    <button
                      type="button"
                      className="memory-picker-tile memory-solo-dev"
                      onClick={irAPintar}
                      aria-label="Pintar por números (descontinuado)"
                    >
                      <span className="memory-picker-img-wrap">
                        <img src={imagenPintar} alt="" className="memory-picker-img" />
                      </span>
                      <span className="memory-picker-nombre">Pintar por números (descontinuado)</span>
                    </button>
                    <button
                      type="button"
                      className="memory-picker-tile memory-solo-dev"
                      onClick={irASimon}
                      aria-label="Simón dice"
                    >
                      <span className="memory-picker-img-wrap">
                        <img src={imagenSimon} alt="" className="memory-picker-img" />
                      </span>
                      <span className="memory-picker-nombre">Simón dice</span>
                    </button>
                    {/* Hora de dormir: ajustes del adulto y pruebas (2026-10-23).
                        Lo que ve el niño (avisos y pantalla de buenas noches)
                        funciona sin modo desarrollador si se activa aquí. */}
                    <button
                      type="button"
                      className="memory-picker-tile memory-solo-dev"
                      onClick={irAHoraDormir}
                      aria-label="Hora de dormir"
                    >
                      <span className="memory-picker-img-wrap">
                        <span className="memory-picker-img hd-tarjeta-img">
                          <svg viewBox="0 0 40 40" aria-hidden="true">
                            <path d="M26 6a15 15 0 1 0 8 26A13 13 0 0 1 26 6z" fill="#FFD66B" />
                          </svg>
                        </span>
                      </span>
                      <span className="memory-picker-nombre">Hora de dormir</span>
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
                        className={`memory-picker-tile${t.soloDev ? ' memory-solo-dev' : ''}`}
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
                    <div className="memory-victoria-overlay victoria">
                      <div className="memory-victoria">
                        <GiPartyPopper className="memory-victoria-icono fiesta" aria-hidden="true" />
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
                  <EstadoDevTabs
                    estado={estadoCatalogoRomp}
                    cantidades={{
                      afinar: contarRompecabezas(TEMAS_ROMPECABEZAS, 'afinar'),
                      listos: contarRompecabezas(TEMAS_ROMPECABEZAS, 'listos'),
                    }}
                    onChange={setEstadoCatalogoRompElegido}
                  />
                  {temasCatalogoRomp.length === 0 && (
                    <p className="gallery-empty">No hay rompecabezas en preparación.</p>
                  )}
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
                    {temaActivoCatalogoRomp && (
                      <RompecabezasPropuesta
                        secciones={seccionesCatalogoRomp}
                        miniaturas={miniaturasRomp}
                        propuesta={propuestaRomp}
                        onCambiarPropuesta={cambiarPropuestaRomp}
                        opcionesPiezas={PIEZAS_ROMPECABEZAS}
                        calcularGrilla={grillaRompecabezas}
                        zIndex={Z_PREVIEW_GALERIA}
                        onPanelAbiertoChange={marcarPanelAfinarRomp}
                      />
                    )}
                  </div>

                  {mostrarPropuestaRomp && (
                    <div className="memory-victoria-overlay" onClick={() => setMostrarPropuestaRomp(false)}>
                      <div className="memory-niveles-modal romp-propuesta-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="memory-niveles-header">
                          <h3>
                            Propuesta de asignación
                            <span>{cantidadPropuestaRomp} {cantidadPropuestaRomp === 1 ? 'imagen' : 'imágenes'}</span>
                          </h3>
                          <button
                            type="button"
                            className="memory-cerrar-x memory-niveles-cerrar"
                            onClick={() => setMostrarPropuestaRomp(false)}
                            aria-label="Cerrar"
                          >
                            <CloseOutlined />
                          </button>
                        </div>
                        {textoPropuestaRomp ? (
                          <pre className="dif-dev-texto">{textoPropuestaRomp}</pre>
                        ) : (
                          <p className="dif-dev-vacio">
                            Todavía no hay nada. Toca una imagen, prueba el corte con cada cantidad de piezas y
                            aplica la que corresponda.
                          </p>
                        )}
                        {copiadoPropuestaRomp === 'error' && (
                          <p className="dif-dev-alerta">No se pudo copiar. Selecciona el texto y cópialo con Ctrl+C.</p>
                        )}
                        <div className="romp-propuesta-acciones">
                          <button
                            type="button"
                            className="dif-dev-boton dif-dev-boton--suave"
                            onClick={vaciarPropuestaRomp}
                            disabled={!textoPropuestaRomp}
                          >
                            Vaciar propuesta
                          </button>
                          <button
                            type="button"
                            className="dif-dev-boton"
                            onClick={copiarPropuestaRomp}
                            disabled={!textoPropuestaRomp}
                          >
                            {copiadoPropuestaRomp === 'ok' ? '¡Copiado!' : 'Copiar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {vista === 'rompecabezas' && !catalogoRomp && (!temaRompId ? (
                <div className="memory-picker">
                  <div className="memory-picker-grid">
                    {TEMAS_ROMPECABEZAS.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        className={`memory-picker-tile${t.soloDev ? ' memory-solo-dev' : ''}`}
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
                    <div className="memory-victoria-overlay victoria">
                      <div className="memory-victoria">
                        <GiPuzzle className="memory-victoria-icono rompecabezas" aria-hidden="true" />
                        <p>
                          {seguirEnNivelRomp
                            ? `¡Lo armaste! ${faltanRomp === 1 ? 'Te falta 1 rompecabezas' : `Te faltan ${faltanRomp} rompecabezas`} ${enFronteraRomp ? 'para el nivel siguiente' : 'de este nivel'}.`
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
                      {nivelVistoRomp === null ? (
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
                              onClick={() => setNivelVistoRomp(i)}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                      ) : (() => {
                        // Grilla del nivel elegido: los ya armados en
                        // color y se pueden volver a
                        // jugar tocandolos; los que faltan, en gris y sin
                        // accion. "Jugar uno que falta" sortea como antes.
                        const nivel = temaRomp.niveles[nivelVistoRomp];
                        const armados = nivel.rompecabezas.filter((r) => idsCompletosRomp.includes(r.id)).length;
                        const total = nivel.rompecabezas.length;
                        const faltan = total - armados;
                        const jugar = (id) => {
                          reiniciarRomp(nivelVistoRomp, id);
                          setMostrarNivelesRomp(false);
                        };
                        return (
                          <div className="memory-niveles-modal romp-nivel-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="memory-niveles-header">
                              <button
                                type="button"
                                className="memory-cerrar-x memory-niveles-cerrar"
                                onClick={() => setNivelVistoRomp(null)}
                                aria-label="Volver a los niveles"
                              >
                                <LeftOutlined />
                              </button>
                              <h3 className="romp-nivel-modal-titulo">
                                Nivel {nivelVistoRomp + 1}
                                <span>
                                  {faltan === 0
                                    ? `Armaste los ${total}`
                                    : `Armaste ${armados} de ${total} · ${faltan === 1 ? 'falta 1' : `faltan ${faltan}`}`}
                                </span>
                              </h3>
                              <button
                                type="button"
                                className="memory-cerrar-x memory-niveles-cerrar"
                                onClick={() => setMostrarNivelesRomp(false)}
                                aria-label="Cerrar"
                              >
                                <CloseOutlined />
                              </button>
                            </div>
                            <div className="romp-nivel-grilla">
                              {nivel.rompecabezas.map((romp) => {
                                const armado = idsCompletosRomp.includes(romp.id);
                                const actual = nivelVistoRomp === nivelIdxRomp && romp.id === rompIdRomp;
                                const imagen = miniaturasRomp[romp.id];
                                return (
                                  <button
                                    type="button"
                                    key={romp.id}
                                    className={`romp-nivel-mini${armado ? '' : ' falta'}${actual ? ' actual' : ''}`}
                                    disabled={!armado}
                                    onClick={() => jugar(romp.id)}
                                    aria-label={armado ? 'Volver a armar este rompecabezas' : 'Rompecabezas que falta'}
                                  >
                                    {imagen ? <img src={imagen.src} alt="" draggable={false} /> : <PictureOutlined aria-hidden="true" />}
                                  </button>
                                );
                              })}
                            </div>
                            <button
                              type="button"
                              className="memory-victoria-btn romp-nivel-modal-jugar"
                              onClick={() => jugar()}
                            >
                              {faltan > 0 ? 'Jugar uno que falta' : 'Jugar uno al azar'}
                            </button>
                          </div>
                        );
                      })()}
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
                                recorte={piezaId !== null ? recortesRomp?.[piezaId] : null}
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
                              recorte={recortesRomp?.[id]}
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
                              ...fondoPiezaRomp(piezaArrastrandoRomp, imagenRomp.src, recortesRomp?.[piezaArrastrandoRomp], celdaRomp.columnas, celdaRomp.filas),
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
                    <div className="memory-victoria-overlay victoria">
                      <div className="memory-victoria">
                        {siguienteNivelIdxContar === undefined ? (
                          <>
                            {/* Fin del juego: sin "jugar de nuevo" en bucle. */}
                            <GiTrophyCup className="memory-victoria-icono trofeo" aria-hidden="true" />
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
                            <GiAbacus className="memory-victoria-icono numeros" aria-hidden="true" />
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
                    <div className="memory-victoria-overlay victoria">
                      <div className="memory-victoria">
                        <GiPartyPopper className="memory-victoria-icono fiesta" aria-hidden="true" />
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
                    <div className="memory-victoria-overlay victoria">
                      <div className="memory-victoria">
                        <GiPartyPopper className="memory-victoria-icono fiesta" aria-hidden="true" />
                        <p>
                          {seguirEnNivelDif
                            ? `¡Encontraste todo! ${faltanDif === 1 ? 'Te falta 1 juego' : `Te faltan ${faltanDif} juegos`} ${enFronteraDif ? 'para el nivel siguiente' : 'de este nivel'}.`
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

              {vista === 'pintar' && devPin && (
                <PintarDev temas={TEMAS_PINTAR_DEV} niveles={NIVELES_PINTAR} />
              )}

              {vista === 'pintar' && !devPin && (!temaPinId ? (
                <div className="memory-picker">
                  {TEMAS_PINTAR.length === 0 ? (
                    <p className="gallery-empty">Muy pronto van a haber imágenes aquí.</p>
                  ) : (
                    <div className="memory-picker-grid">
                      {TEMAS_PINTAR.map((t) => (
                        <button
                          type="button"
                          key={t.id}
                          className="memory-picker-tile"
                          onClick={() => elegirTemaPin(t.id)}
                          aria-label={`Pintar con ${t.nombre}`}
                        >
                          <span className="memory-picker-img-wrap">
                            {dorsosSelector[t.id] ? (
                              <img src={dorsosSelector[t.id]} alt="" className="memory-picker-img" />
                            ) : (
                              <PictureOutlined className="memory-picker-placeholder" aria-hidden="true" />
                            )}
                          </span>
                          <span className="memory-picker-nombre">{t.nombre}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="dif-dev-btn"
                    onClick={() => setDevPin(true)}
                  >
                    <PictureOutlined /> Modo desarrollador
                  </button>
                </div>
              ) : (
                <>
                  {ganoPin && (
                    <div className="memory-victoria-overlay victoria">
                      <div className="memory-victoria">
                        <GiPartyPopper className="memory-victoria-icono fiesta" aria-hidden="true" />
                        <p>
                          {seguirEnNivelPin
                            ? `¡Lámina terminada! ${faltanPin === 1 ? 'Te falta 1' : `Te faltan ${faltanPin}`} ${enFronteraPin ? 'para el nivel siguiente' : 'de este nivel'}.`
                            : siguienteNivelIdxPin === undefined
                              ? '¡Completaste todos los niveles!'
                              : enFronteraPin
                                ? `¡Nivel ${numeroSiguienteNivelPin} desbloqueado!`
                                : '¡Lámina terminada de nuevo!'}
                        </p>
                        <button
                          type="button"
                          className="memory-victoria-btn"
                          onClick={() => reiniciarPin(seguirEnNivelPin ? nivelIdxPin : (siguienteNivelIdxPin ?? nivelIdxPin))}
                        >
                          {seguirEnNivelPin
                            ? 'Otra lámina'
                            : siguienteNivelIdxPin === undefined ? 'Jugar de nuevo' : 'Jugar el siguiente nivel'}
                        </button>
                      </div>
                    </div>
                  )}

                  {mostrarNivelesPin && (
                    <div
                      className="memory-victoria-overlay"
                      onClick={() => setMostrarNivelesPin(false)}
                    >
                      <div className="memory-niveles-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="memory-niveles-header">
                          <h3>Elige un nivel</h3>
                          <button
                            type="button"
                            className="memory-cerrar-x memory-niveles-cerrar"
                            onClick={() => setMostrarNivelesPin(false)}
                            aria-label="Cerrar"
                          >
                            <CloseOutlined />
                          </button>
                        </div>
                        <div className="memory-niveles-grid">
                          {nivelesAlcanzadosPin.map((n, i) => (
                            <button
                              type="button"
                              key={n.numero}
                              className={`memory-nivel-btn${i === nivelIdxPin ? ' activo' : ''}`}
                              onClick={() => reiniciarPin(i)}
                            >
                              {n.numero}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {laminaActualPin && (
                    <PintarJuego
                      key={`${temaPinId}-${nivelIdxPin}-${laminaIdPin}-${partidaPin}`}
                      imagen={laminaActualPin}
                      nivel={nivelActualPin}
                      onCompletado={marcarGanoPin}
                    />
                  )}
                </>
              ))}

              {vista === 'horaDormir' && <HoraDormirPanel />}

              {vista === 'simon' && !grupoSimon && (
                <div className="memory-picker">
                  <p className="memory-picker-intro">¿Con qué grupo juegas?</p>
                  <div className="memory-picker-grid">
                    {GRUPOS_SIMON.map((g) => (
                      <button
                        type="button"
                        key={g.id}
                        className="memory-picker-tile simon-grupo-tile"
                        onClick={() => {
                          setGrupoSimonId(g.id);
                          setPartidaSimon(0);
                        }}
                        aria-label={`Jugar con ${g.name}`}
                      >
                        <span className="memory-picker-img-wrap" style={{ background: themes[g.theme].gradient }}>
                          {g.fit === 'contain' && (
                            <img src={g.cover} alt="" className="simon-grupo-blur" aria-hidden="true" />
                          )}
                          <img
                            src={g.cover}
                            alt=""
                            className="memory-picker-img"
                            style={g.fit === 'contain' ? { objectFit: 'contain', position: 'relative' } : undefined}
                          />
                        </span>
                        <span className="memory-picker-nombre">{g.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {vista === 'simon' && grupoSimon && (
                <SimonJuego
                  key={`${grupoSimon.id}-${partidaSimon}`}
                  tema={temaSimon}
                  grupoId={grupoSimon.id}
                  portada={grupoSimon.cover}
                  autoIniciar={partidaSimon > 0}
                  onNivel={setNivelSimon}
                />
              )}

              {vista === 'colorear' && !laminaColorear && !grupoColorear && (
                <div className="memory-picker">
                  <div className="memory-picker-grid">
                    {dibujosColorear?.length > 0 && (
                      <button
                        type="button"
                        className="memory-picker-tile"
                        onClick={() => setGrupoColorear('mios')}
                        aria-label="Mis dibujos"
                      >
                        <span className="memory-picker-img-wrap colorear-portada">
                          <img src={miniaturasColorear[dibujosColorear[0].id]} alt="" className="memory-picker-img" />
                        </span>
                        <span className="memory-picker-nombre">Mis dibujos</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="memory-picker-tile"
                      onClick={() => abrirLaminaColorear(HOJA_EN_BLANCO)}
                      aria-label="Hoja en blanco"
                    >
                      <span className="memory-picker-img-wrap colorear-portada colorear-hoja-en-blanco">
                        <LuPencil aria-hidden="true" />
                      </span>
                      <span className="memory-picker-nombre">Hoja en blanco</span>
                    </button>
                    {GRUPOS_IMPRIMIBLES.map((g) => (
                      <button
                        type="button"
                        key={g.id}
                        className="memory-picker-tile"
                        onClick={() => setGrupoColorear(g.id)}
                        aria-label={`Colorear ${g.nombre}`}
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
              )}

              {vista === 'colorear' && !laminaColorear && grupoColorear === 'mios' && (
                <MisDibujos
                  dibujos={dibujosColorear}
                  miniaturas={miniaturasColorear}
                  onElegir={abrirLaminaColorear}
                  onImprimir={imprimirDibujoGuardado}
                  onGuardarImagen={guardarImagenDibujoGuardado}
                  onBorrar={borrarDibujoGuardado}
                  onCapaAbierta={marcarCapaColorear}
                />
              )}

              {vista === 'colorear' && !laminaColorear && grupoColorear && grupoColorear !== 'mios' && (
                <ColorearGaleria
                  laminas={laminasColorear}
                  miniaturas={miniaturasColorear}
                  onElegir={abrirLaminaColorear}
                />
              )}

              {vista === 'colorear' && laminaColorear && (
                <ColorearLienzo
                  key={laminaColorear.id}
                  id={laminaColorear.id}
                  src={laminaColorear.src}
                  onGuardado={avisarGuardadoColorear}
                  onImprimir={imprimirImagen}
                  onCapaAbierta={marcarCapaColorear}
                />
              )}

              {vista === 'pixel' && devPix && (
                <PintarPixelDev temas={TEMAS_PIXEL} cuadriculas={cuadriculasPintar} />
              )}

              {vista === 'pixel' && !devPix && !temaPixId && (
                <div className="memory-picker">
                  {TEMAS_PIXEL.filter((t) => t.laminas.length > 0).length === 0 ? (
                    <p className="gallery-empty">Muy pronto van a haber láminas aquí.</p>
                  ) : (
                    <div className="memory-picker-grid">
                      {TEMAS_PIXEL.filter((t) => t.laminas.length > 0).map((t) => (
                        <button
                          type="button"
                          key={t.id}
                          className="memory-picker-tile"
                          onClick={() => elegirTemaPix(t.id)}
                          aria-label={`Pintar con ${t.nombre}`}
                        >
                          <span className="memory-picker-img-wrap">
                            {t.portada || dorsosSelector[t.id] ? (
                              <img src={t.portada ?? dorsosSelector[t.id]} alt="" className="memory-picker-img" />
                            ) : (
                              <PictureOutlined className="memory-picker-placeholder" aria-hidden="true" />
                            )}
                          </span>
                          <span className="memory-picker-nombre">{t.nombre}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    className="dif-dev-btn"
                    onClick={() => setDevPix(true)}
                  >
                    <PictureOutlined /> Modo desarrollador
                  </button>
                </div>
              )}

              {vista === 'pixel' && !devPix && laminaPix && (
                <>
                  {ganoPix && (
                    <div className="memory-victoria-overlay victoria">
                      <div className="memory-victoria">
                        <GiPartyPopper className="memory-victoria-icono fiesta" aria-hidden="true" />
                        <p>
                          {faltanPix > 0
                            ? `¡Lámina terminada! ${faltanPix === 1 ? 'Te falta 1' : `Te faltan ${faltanPix}`}.`
                            : '¡Terminaste todas las láminas!'}
                        </p>
                        <button
                          type="button"
                          className="memory-victoria-btn"
                          onClick={otraLaminaPix}
                        >
                          Otra lámina
                        </button>
                      </div>
                    </div>
                  )}
                  <PintarJuego
                    key={`${temaPixId}-${laminaPixId}-${partidaPix}`}
                    imagen={laminaPix}
                    nivel={null}
                    calcular={laminaDePixelArt}
                    nitida
                    progreso={progresoPix}
                    onProgreso={guardarAvancePix}
                    onEstado={setEstadoPix}
                    onCompletado={marcarGanoPix}
                  />
                </>
              )}
            </div>

            {/* Destellos al completar cualquier juego (los de Simon dice al
                pasar de nivel, pedido explicito). Se montan al ganar. */}
            {celebrando && <ExplosionChispas key={vista} />}

            {avisoDev && <div className="memory-toast" role="status">{avisoDev}</div>}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

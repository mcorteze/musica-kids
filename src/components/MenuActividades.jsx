import { useState, useCallback, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
  ReloadOutlined,
} from '@ant-design/icons';
import themes from '../themes';
import imagenMemorice from '../assets/menu-general/memorice.avif';
import imagenImprimir from '../assets/menu-general/imprimir.avif';
import imagenRompecabezas from '../assets/menu-general/rompecabezas.avif';
import imagenContar from '../assets/menu-general/contar.avif';
// Portada PROVISIONAL de la card "Ordena la secuencia" (todavia no hay una
// imagen propia para el menu general, como si tienen las otras): el cuadro
// final del muñeco de nieve. Reemplazar por menu-general/secuencias.avif.
import imagenSecuencias from '../assets/secuencias/paw-patrol/muneco-de-nieve/04.avif';

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
    // Habilitado momentaneamente solo en laptop/desktop (pedido
    // explicito) — en movil y tablet no aparece esta tarjeta todavia.
    soloLaptop: true,
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
// A diferencia del Memorice, cada NIVEL usa una foto distinta (pedido
// explicito — "no vamos a reciclar imagenes"), no la misma foto cortada
// mas fina. Por eso la cantidad de piezas de cada nivel se define aqui
// mismo junto con el archivo que le corresponde, no se calcula sola.
// Cada nivel vive en src/assets/rompecabezas/<tema>/nivel-N.avif.
const TEMAS_ROMPECABEZAS_META = [
  {
    id: 'frozen',
    nombre: 'Frozen',
    header: 'linear-gradient(120deg, #47ACD8 0%, #1E5FA8 55%, #7C3AED 100%)',
    niveles: [
      { piezas: 12, archivo: 'nivel-1' },
      { piezas: 18, archivo: 'nivel-2' },
    ],
  },
  {
    id: 'toy-story',
    nombre: 'Toy Story',
    header: 'linear-gradient(120deg, #5AB0F5 0%, #1C6FB0 55%, #E00024 100%)',
    niveles: [
      { piezas: 12, archivo: 'nivel-1' },
      { piezas: 18, archivo: 'nivel-2' },
      { piezas: 24, archivo: 'nivel-3' },
    ],
  },
];

const ENTRADAS_ROMPECABEZAS = import.meta.glob('../assets/rompecabezas/*/*.{png,jpg,jpeg,webp,avif}');

function cargadorRompecabezas(temaId, archivo) {
  for (const [ruta, cargar] of Object.entries(ENTRADAS_ROMPECABEZAS)) {
    const m = ruta.match(/rompecabezas\/([^/]+)\/([^/.]+)\.[a-z0-9]+$/i);
    if (m && m[1] === temaId && m[2] === archivo) return cargar;
  }
  return null;
}

const TEMAS_ROMPECABEZAS = TEMAS_ROMPECABEZAS_META.map(({ id, nombre, header, niveles }) => {
  const nivelesConCarga = niveles
    .map((n) => ({ ...n, cargar: cargadorRompecabezas(id, n.archivo) }))
    .filter((n) => n.cargar);
  return {
    id,
    nombre,
    header,
    niveles: nivelesConCarga,
    // Listo con al menos el primer nivel disponible — los siguientes
    // pueden ir llegando despues sin que el tema deje de jugarse.
    listo: nivelesConCarga.length > 0,
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

// Carga la imagen y de paso mide sus proporciones reales (ancho/alto): el
// tablero necesita esto para no deformar la foto al armar la grilla.
function cargarImagenConAspecto(cargar) {
  return cargar().then((m) => {
    const src = m.default;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ src, aspecto: img.naturalWidth / img.naturalHeight || 16 / 9 });
      img.onerror = () => resolve({ src, aspecto: 16 / 9 });
      img.src = src;
    });
  });
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
// Disponible en todos los responsives (pedido explicito, igual que
// Imprimir). Reutiliza los MISMOS temas y fotos de personajes ya
// convertidas para el Memorice (TEMAS, arriba) — no hace falta ningun
// asset nuevo, solo la cantidad de fotos que ya tiene cada tema.
// Cada ronda: se elige una foto al azar del tema y se muestra repetida
// "objetivo" veces; hay que tocar el numero correcto entre 4 opciones
// (el objetivo + 3 distractores cercanos). Un nivel = 5 rondas seguidas
// bien contestadas; SIN selector manual, se avanza solo ganando (mismo
// criterio que el Memorice y el Rompecabezas).
const RONDAS_CONTAR = 5;
const NIVELES_CONTAR = [
  { max: 3 },
  { max: 5 },
  { max: 10 },
];

// Las fotos a contar deben verse grandes (pedido explicito, para una
// nina de 5 años) — GAP_CONTAR tiene que coincidir con el gap de
// .contar-area (App.css); CELDA_MAX_CONTAR evita que en un monitor
// gigante, con pocas fotos en la ronda, queden desproporcionadas.
const GAP_CONTAR = 14;
const CELDA_MAX_CONTAR = 220;

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
// misma clase .memory-solo-laptop que Rompecabezas). Cada NIVEL es
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

export default function MenuActividades({ onOpenChange }) {
  // 'menu' = las 2 tarjetas raiz. 'memorice'/'imprimir' = cada seccion.
  const [vista, setVista] = useState('menu');
  // Grupo cuya galeria se esta viendo dentro de "Imprimir" (null = todavia
  // en el selector de grupos).
  const [grupoImprimir, setGrupoImprimir] = useState(null);
  const [imagenesGaleria, setImagenesGaleria] = useState(null);
  const [open, setOpen] = useState(false);

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
  // cada nivel trae su propia foto (no se corta mas fina la misma). =====
  const [temaRompId, setTemaRompId] = useState(null);
  // null = imagen del nivel todavia no pedida/lista.
  const [imagenRomp, setImagenRomp] = useState(null);
  const [nivelIdxRomp, setNivelIdxRomp] = useState(0);
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

  const elegirTemaRomp = useCallback((id) => {
    setTemaRompId(id);
    setImagenRomp(null);
    setTableroRomp({ orden: [], posiciones: [] });
    setPiezaArrastrandoRomp(null);
    setMostrarNivelesRomp(false);
    setMostrarPreviaRomp(false);
  }, []);

  const volverAlSelectorRomp = useCallback(() => {
    setTemaRompId(null);
    setImagenRomp(null);
    setTableroRomp({ orden: [], posiciones: [] });
    setPiezaArrastrandoRomp(null);
    setMostrarNivelesRomp(false);
    setMostrarPreviaRomp(false);
  }, []);

  // Elegir un tema (o volver a elegirlo) retoma el nivel guardado de ESE
  // tema antes de pedir ninguna imagen — asi el efecto de carga de abajo
  // (que depende del nivel) pide la foto correcta desde el principio, no
  // la del nivel que se estaba jugando en el tema anterior.
  useEffect(() => {
    if (!temaRompId || !temaRomp) return;
    const inicial = leerNivelGuardadoRompecabezas(temaRompId, temaRomp.niveles.length);
    setNivelMaximoRomp(inicial);
    setNivelIdxRomp(inicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temaRompId]);

  // Carga la imagen de ESTE nivel (no de todo el tema: cada nivel trae su
  // propia foto) cada vez que cambia el tema o el nivel elegido.
  useEffect(() => {
    if (!nivelActualRomp) return;
    let vivo = true;
    setImagenRomp(null);
    cargarImagenConAspecto(nivelActualRomp.cargar).then((res) => {
      if (vivo) setImagenRomp(res);
    });
    return () => {
      vivo = false;
    };
  }, [nivelActualRomp]);

  // Arma (o rearma) el tablero apenas la imagen de este nivel esta lista:
  // cubre tanto la primera vez que se elige un tema como cada cambio de
  // nivel despues.
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

  // Reinicia el nivel actual (rebaraja nomas, la imagen ya esta lista) o
  // salta a otro nivel (elegido desde "Reiniciar" o al ganar): cambiar de
  // nivel dispara el efecto de carga de imagen de arriba, que a su vez
  // dispara el armado del tablero cuando esa foto este lista.
  const reiniciarRomp = useCallback((idx) => {
    const siguiente = idx ?? nivelIdxRomp;
    setPiezaArrastrandoRomp(null);
    setMostrarPreviaRomp(false);
    if (siguiente === nivelIdxRomp) {
      if (temaRomp) setTableroRomp(estadoInicialRompecabezas(temaRomp.niveles[siguiente].piezas));
    } else {
      setNivelIdxRomp(siguiente);
    }
  }, [nivelIdxRomp, temaRomp]);

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
  // alcanza, se resuelve el otro caso (el tablero es el que manda). La
  // orientacion se lee con matchMedia, la misma que decide el layout en
  // CSS (.romp-layout), para que ambos coincidan siempre.
  const areaRefRomp = useRef(null);
  const [celdaRomp, setCeldaRomp] = useState({
    anchoTablero: 0, altoTablero: 0, columnas: 1, filas: 1,
    celdaW: 0, celdaH: 0, trayAlto: null, trayAncho: null,
  });

  useLayoutEffect(() => {
    const el = areaRefRomp.current;
    if (!el || !imagenRomp || totalPiezasRomp === 0) return;
    const recalcular = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const { columnas, filas } = grillaRompecabezas(totalPiezasRomp, imagenRomp.aspecto);
      const aspecto = imagenRomp.aspecto;
      const horizontal = window.matchMedia('(orientation: landscape)').matches;

      let boardW;
      let boardH;
      if (!horizontal) {
        // Carrousel abajo: se reparte el ALTO entre tablero y carrousel.
        const boardHSiAnchoManda = width / aspecto;
        const trayPrueba = boardHSiAnchoManda / filas + PADDING_TRAY_ROMP;
        const altoLibre = height - trayPrueba - GAP_LAYOUT_ROMP;
        if (boardHSiAnchoManda <= altoLibre) {
          boardW = width;
          boardH = boardHSiAnchoManda;
        } else {
          boardH = Math.max(0, (height - PADDING_TRAY_ROMP - GAP_LAYOUT_ROMP) * filas / (filas + 1));
          boardW = boardH * aspecto;
        }
      } else {
        // Carrousel al lado: se reparte el ANCHO entre tablero y carrousel.
        const boardWSiAltoManda = height * aspecto;
        const trayPrueba = boardWSiAltoManda / columnas + PADDING_TRAY_ROMP;
        const anchoLibre = width - trayPrueba - GAP_LAYOUT_ROMP;
        if (boardWSiAltoManda <= anchoLibre) {
          boardH = height;
          boardW = boardWSiAltoManda;
        } else {
          boardW = Math.max(0, (width - PADDING_TRAY_ROMP - GAP_LAYOUT_ROMP) * columnas / (columnas + 1));
          boardH = boardW / aspecto;
        }
      }

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
        trayAlto: !horizontal ? celdaH + PADDING_TRAY_ROMP : null,
        trayAncho: horizontal ? celdaW + PADDING_TRAY_ROMP : null,
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
  // chico que se vea igual con 2 fotos que con 10. Mismo algoritmo que
  // ya usa el Memorice (paresDivisores + la forma que arma la celda mas
  // grande posible en el espacio real disponible), aplicado ahora a la
  // cantidad de fotos de ESTA ronda.
  const areaRefContar = useRef(null);
  const [celdaContar, setCeldaContar] = useState(0);

  useLayoutEffect(() => {
    const el = areaRefContar.current;
    if (!el || !rondaContar) return;
    const recalcular = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      let mejor = null;
      for (const par of paresDivisores(rondaContar.items.length)) {
        const porAncho = (width - (par.columnas - 1) * GAP_CONTAR) / par.columnas;
        const porAlto = (height - (par.filas - 1) * GAP_CONTAR) / par.filas;
        const tam = Math.min(porAncho, porAlto, CELDA_MAX_CONTAR);
        if (!mejor || tam > mejor) mejor = tam;
      }
      setCeldaContar(Math.max(0, Math.floor(mejor)));
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

  // Al cerrar el drawer se vuelve a foja cero: la proxima vez que se abre,
  // arranca en el menu general de nuevo (pedido explicito, extendido del
  // "siempre elegir tema de nuevo" que ya regia solo para Memorice).
  useEffect(() => {
    if (open) return;
    clearTimeout(timeoutRef.current);
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
    } else if (vista === 'rompecabezas') {
      if (temaRompId) volverAlSelectorRomp();
      else volverAlMenu();
    }
  }, [vista, temaId, grupoImprimir, temaRompId, temaContarId, temaSecId, volverAlSelector, volverAlMenu, volverAlSelectorRomp, volverAlSelectorContar, volverAlSelectorSec]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
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

  // Que muestra el header segun la vista (titulo, volver, color de fondo):
  // solo Memorice/Rompecabezas JUGANDO (con tema elegido) e Imprimir
  // VIENDO una galeria (con grupo elegido) pintan el header con su propio
  // color. Los "menu" (raiz, elegir tema, elegir grupo) no necesitan un
  // header aparte — header transparente y el mismo fondo pastel de la
  // pagina de Casa de Muñecas en el reproductor, pedido explicito.
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
    tituloHeader = temaRompId ? temaRomp.nombre : 'Rompecabezas';
    colorHeader = temaRomp?.header;
  } else if (vista === 'contar') {
    mostrarVolver = true;
    tituloHeader = temaContarId ? temaContar.nombre : 'Contar';
    colorHeader = temaContar?.header;
  } else if (vista === 'secuencias') {
    mostrarVolver = true;
    tituloHeader = temaSecId ? temaSec.nombre : 'Ordena la secuencia';
    colorHeader = temaSec?.header;
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
            className="memory-drawer"
            onClick={(e) => e.stopPropagation()}
            style={estiloDrawer}
          >
            <div
              className={`memory-drawer-header${esMenu ? ' memory-drawer-header--claro' : ''}`}
              style={{ background: colorHeader || 'transparent' }}
            >
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
                  <h2>{tituloHeader}</h2>
                )}
              </div>
              {/* Centrado real (no space-between): el bloque de la
                  izquierda cambia de ancho segun el titulo, asi que solo un
                  grid de 3 columnas deja esto siempre al medio del header
                  sin importar eso. */}
              <div className="memory-header-centro">
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
                        className="memory-picker-tile memory-solo-laptop"
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
                      className="memory-picker-tile memory-solo-laptop"
                      onClick={irASecuencias}
                      aria-label="Ordena la secuencia"
                    >
                      <span className="memory-picker-img-wrap">
                        <img src={imagenSecuencias} alt="" className="memory-picker-img" />
                      </span>
                      <span className="memory-picker-nombre">Ordena la secuencia</span>
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
                      imagenesGaleria.map((src) => (
                        <img key={src} src={src} alt="" className="gallery-img" loading="lazy" />
                      ))
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

              {vista === 'rompecabezas' && (!temaRompId ? (
                <div className="memory-picker">
                  <div className="memory-picker-grid">
                    {TEMAS_ROMPECABEZAS.map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        className="memory-picker-tile"
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
                </div>
              ) : (
                <>
                  {ganoRomp && (
                    <div className="memory-victoria-overlay">
                      <div className="memory-victoria">
                        <span className="memory-victoria-emoji">🧩</span>
                        <p>
                          {siguienteNivelIdxRomp === undefined
                            ? '¡Completaste todos los niveles!'
                            : enFronteraRomp
                              ? `¡Nivel ${nivelIdxRomp + 2} desbloqueado!`
                              : '¡Lo armaste de nuevo!'}
                        </p>
                        <button
                          type="button"
                          className="memory-victoria-btn"
                          onClick={() => reiniciarRomp(siguienteNivelIdxRomp ?? nivelIdxRomp)}
                        >
                          {siguienteNivelIdxRomp === undefined ? 'Armar de nuevo' : 'Jugar nivel siguiente'}
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
                      <div className="romp-layout" ref={areaRefRomp}>
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
                          className="romp-tray"
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
                        <span className="memory-victoria-emoji">🔢</span>
                        <p>
                          {siguienteNivelIdxContar === undefined
                            ? '¡Completaste todos los niveles!'
                            : enFronteraContar
                              ? `¡Nivel ${nivelIdxContar + 2} desbloqueado!`
                              : '¡Ganaste de nuevo!'}
                        </p>
                        <button
                          type="button"
                          className="memory-victoria-btn"
                          onClick={() => reiniciarContar(siguienteNivelIdxContar ?? nivelIdxContar)}
                        >
                          {siguienteNivelIdxContar === undefined ? 'Jugar de nuevo' : 'Jugar nivel siguiente'}
                        </button>
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
                          {rondaContar.items.map((item) => (
                            <img
                              key={item.id}
                              src={rondaContar.cara.src}
                              alt=""
                              className="contar-foto"
                              style={{
                                width: celdaContar || undefined,
                                height: celdaContar || undefined,
                                visibility: celdaContar ? 'visible' : 'hidden',
                                transform: `rotate(${item.rot}deg)`,
                              }}
                            />
                          ))}
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
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

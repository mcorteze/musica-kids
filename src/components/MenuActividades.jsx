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
    // Habilitado momentaneamente solo en laptop/desktop (pedido
    // explicito) — en movil y tablet no aparece esta tarjeta todavia.
    soloLaptop: true,
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
const GAP = 8;
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

    setTableroRomp((prev) => {
      const origenSlot = prev.posiciones.indexOf(piezaId);
      if (destinoSlot === origenSlot) return prev; // solto donde mismo estaba, o afuera viniendo del carrousel
      const posiciones = [...prev.posiciones];
      if (origenSlot !== -1) posiciones[origenSlot] = null;
      if (destinoSlot !== null) posiciones[destinoSlot] = piezaId;
      return { ...prev, posiciones };
    });
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
  }, [open]);

  // Volver desde donde sea: dentro de Memorice, si hay tema elegido vuelve
  // al selector de temas (como antes); si ya estaba en el selector, sube
  // al menu general. Dentro de Imprimir, misma logica con el grupo elegido.
  // Dentro de Rompecabezas, misma logica con el tema elegido.
  const manejarVolver = useCallback(() => {
    if (vista === 'memorice') {
      if (temaId) volverAlSelector();
      else volverAlMenu();
    } else if (vista === 'imprimir') {
      if (grupoImprimir) setGrupoImprimir(null);
      else volverAlMenu();
    } else if (vista === 'rompecabezas') {
      if (temaRompId) volverAlSelectorRomp();
      else volverAlMenu();
    }
  }, [vista, temaId, grupoImprimir, temaRompId, volverAlSelector, volverAlMenu, volverAlSelectorRomp]);

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
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

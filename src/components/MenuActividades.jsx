import { useState, useCallback, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
// abajo; elegir Imprimir entra al selector de grupos con galeria.
// Rompecabezas todavia no tiene juego implementado: la tarjeta queda
// oculta hasta que se habilite (pedido explicito, "los proximos dias").
const ROMPECABEZAS_HABILITADO = false;
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
    // Oculto por ahora: se habilita en los proximos dias (pedido explicito).
    oculto: true,
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
    // Oculto por ahora: se habilita en los proximos dias (pedido explicito).
    oculto: true,
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

const TEMAS = TEMAS_META.map(({ id, grupo, nombre: nombreFijo, header, oculto }) => {
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
  };
});

// ========== NIVELES ==========
// SIN selector manual: el unico modo de pasar a mas cartas es ganando el
// tablero actual (pedido explicito). Min 4, max 48 (24 parejas). Las
// columnas van creciendo con el total para que la grilla no quede
// desproporcionada (48 cartas en 4 columnas serian 12 filas altísimas).
const NIVELES = [
  { total: 4, cols: 2 },
  { total: 8, cols: 4 },
  { total: 12, cols: 4 },
  { total: 16, cols: 4 },
  { total: 20, cols: 5 },
  { total: 24, cols: 6 },
  { total: 30, cols: 6 },
  { total: 36, cols: 6 },
  { total: 42, cols: 7 },
  { total: 48, cols: 8 },
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
const GAP = 14;
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
  }, [open]);

  // Volver desde donde sea: dentro de Memorice, si hay tema elegido vuelve
  // al selector de temas (como antes); si ya estaba en el selector, sube
  // al menu general. Dentro de Imprimir, misma logica con el grupo elegido.
  const manejarVolver = useCallback(() => {
    if (vista === 'memorice') {
      if (temaId) volverAlSelector();
      else volverAlMenu();
    } else if (vista === 'imprimir') {
      if (grupoImprimir) setGrupoImprimir(null);
      else volverAlMenu();
    }
  }, [vista, temaId, grupoImprimir, volverAlSelector, volverAlMenu]);

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

  const nivelInfo = NIVELES.find((n) => n.total === tamano) ?? NIVELES[0];
  const columnas = nivelInfo.cols;
  const filas = tamano / columnas;

  // Mide el espacio real disponible (el area donde va el tablero, dentro
  // del drawer) y calcula la celda cuadrada mas grande que entra sin
  // scroll: el menor entre "lo que da el ancho" y "lo que da el alto".
  // ResizeObserver hace que esto se recalcule solo con cualquier cambio de
  // tamano de la ventana, incluida la rotacion de la tablet.
  const areaRef = useRef(null);
  const [celda, setCelda] = useState(0);

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const recalcular = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const porAncho = (width - (columnas - 1) * GAP) / columnas;
      const porAlto = (height - (filas - 1) * GAP) / filas;
      setCelda(Math.max(0, Math.floor(Math.min(porAncho, porAlto, CELDA_MAX))));
    };
    recalcular();
    const ro = new ResizeObserver(recalcular);
    ro.observe(el);
    return () => ro.disconnect();
  }, [columnas, filas, open, temaId]);

  // Que muestra el header segun la vista (titulo, volver, color de fondo):
  // solo Memorice JUGANDO (con tema elegido) e Imprimir VIENDO una galeria
  // (con grupo elegido) pintan el header con su propio color. Los 3 "menu"
  // (raiz, elegir tema, elegir grupo) no necesitan un header aparte —
  // header transparente y el mismo fondo pastel de la pagina de Casa de
  // Muñecas en el reproductor, pedido explicito.
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
                        disabled
                        aria-label="Rompecabezas (muy pronto)"
                      >
                        <span className="memory-picker-img-wrap">
                          <img src={imagenRompecabezas} alt="" className="memory-picker-img" />
                        </span>
                        <span className="memory-picker-nombre">Rompecabezas</span>
                        <span className="memory-picker-badge">Muy pronto</span>
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
                        className="memory-picker-tile"
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
                          <h3>Elegí un nivel</h3>
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
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DeleteOutlined, LeftOutlined, PrinterOutlined } from '@ant-design/icons';
// Flechas en gancho para deshacer/rehacer: la flecha circular de antd
// (UndoOutlined) se confundia con "recargar" (pedido explicito).
import {
  LuBrush,
  LuDownload,
  LuEllipsis,
  LuFastForward,
  LuFlipHorizontal2,
  LuHand,
  LuPencil,
  LuPlay,
  LuRedo2,
  LuShrink,
  LuType,
  LuUndo2,
  LuVolume2,
  LuVolumeX,
} from 'react-icons/lu';
import { borrarDibujo, guardarDibujo, leerDibujo, ultimoUso, VIGENCIA_MS } from '../utils/dibujosColorear';
import { FUENTE_POR_ID, FUENTES, bordeTexto, cargarFuentes, colorTexto, dibujarTextos, letrasArcoiris } from '../utils/textosColorear';
import {
  COLORES,
  ESPECTRO,
  FORMAS_SELLO,
  GRUPOS_SELLO,
  HERRAMIENTAS,
  VARIANTES_BRILLO,
  capaDe,
  css,
  empezarTrazo,
  fundirCapa,
  pintarTramo,
  prepararTexturas,
  recogerEfectos,
  titilanDe,
} from '../utils/pincelesColorear';
import { MARCOS, conMarco } from '../utils/marcosColorear';
import { prepararAudio, silenciar, sonidoClic, sonidoDeTrazo, sonidoPop } from '../utils/sonidosColorear';
import IconoHerramienta, { IconoSello, MuestraPolvo, PUNTAS } from './ColorearIconos';
import { esLiviano } from '../utils/rendimiento';
import './ColorearJuego.css';

// ========== COLOREAR (pintar a mano sobre las laminas de Imprimir) ==========
// Pedido explicito: trazo libre, sin balde ni cierre de bordes. Capas, de
// abajo hacia arriba: el <canvas> de color; un <canvas> de "trazo en curso"
// (acuarela, destacador y neon, que se funden al soltar); la lamina original
// con mix-blend-mode: multiply — el blanco deja ver el color y la linea negra
// queda SIEMPRE encima, nunca se tapa al pintar —; y encima, los efectos que
// no se pintan: brillos que titilan, estela de la varita y "pop" de sellos.
// Herramientas y colores: utils/pincelesColorear.js (figuras de sellos en
// utils/formasSello.js). Dibujos de herramientas: ColorearIconos.jsx.
// Sonidos: utils/sonidosColorear.js. Marcos: utils/marcosColorear.js.
// Lo pintado se guarda solo en el dispositivo (utils/dibujosColorear.js) y
// se borra a los 7 dias sin usarlo, con su historia de trazos para "Ver cómo
// lo pinté".
//
// Distribucion (pedido explicito, patron de las apps de dibujo): UNA barra
// compacta — herramientas (lapiz, sello, varita, goma, mano) y acciones (deshacer, rehacer y "Más": borrar, ver como se
// pinto, guardar imagen, imprimir; agrupadas para que la barra quepa en una
// fila en tablet, pedido explicito 2026-10-23). Color y tamaño no tienen
// boton propio: van dentro del menu de cada herramienta (lapiz: tipos,
// colores y tamaño; sello: figuras, colores y tamaño; varita: polvos,
// colores y tamaño; goma: tamaño), pedido explicito 2026-10-23.
// Texto (pedido explicito 2026-10-23): boton "Texto"; tocar la hoja
// escribe uno nuevo; tocar un texto lo selecciona (arrastrar = mover, dos
// toques o el lapiz = editar, papelero = borrar con confirmacion). Los
// textos son objetos aparte (utils/textosColorear.js), no pintura. Los selectores
// muestran lo elegido y despliegan su panel encima de la hoja, que se retrae
// al elegir, al tocar fuera o al tocar el mismo boton. Sobre la hoja: espejo
// y sonido (arriba a la derecha) y el porcentaje de zoom (abajo a la
// derecha). El boton "¡Terminé!" con festejo se quito (pedido explicito,
// 2026-10-22); "Ver cómo lo pinté" quedo en la barra, con confirmacion. Barra a la izquierda en
// horizontal, abajo en vertical. Lo destructivo siempre pide confirmacion.

// Tamaño en px de pantalla (cada herramienta lo ajusta con su escala).
const TAMANO_MIN = 6;
const TAMANO_MAX = 60;
const TAMANO_INICIAL = 22;

// Resolucion interna del lienzo: lado largo fijo, sin importar el tamaño de
// la lamina (las hay de 236 px y de 2048 px). Alcanza para imprimir y no
// pesa demasiado en tablets.
// 1800 (antes 1200): con zoom, 1200 se veia borroso. Deshacer guarda solo la
// zona que toco cada trazo, asi la resolucion mayor no se come la memoria.
const LADO_LARGO = 1800;
const MAX_DESHACER = 25;
const MINIATURA = 320;
const ESPERA_GUARDADO_MS = 800;
// Igual al gap de .colorear-centro en ColorearJuego.css.
const SEPARACION = 14;
// Tamaño del dibujo de la herramienta que hace de cursor (laptop).
const CURSOR = 44;
// 6x (antes 4x, pedido explicito: acercarse mas para los detalles). Desde
// ~4x el borde del trazo y de laminas chicas se ve algo blando.
const ZOOM_MAX = 6;
// Doble toque con la mano: acerca a esto (o vuelve a la hoja entera).
const ZOOM_TOQUE = 2.5;
// Colores elegidos en la paleta completa que quedan a mano en la paleta.
const MIS_COLORES = 5;
const VISTA_INICIAL = { x: 0, y: 0, s: 1 };
// Historia de trazos para "Ver cómo lo pinté": sobre este total de puntos se
// deja de anotar (la repeticion ya no estaria completa y se oculta).
const MAX_PUNTOS_HISTORIA = 200000;
// "Ver cómo lo pinté" dura ~8 s, sin importar cuanto se pinto.
const SEGUNDOS_REPETICION = 8;
// Brillos que titilan a la vez sobre la hoja (los ultimos). 60: con 120 la
// hoja quieta bajaba a ~37 cuadros/s en una tablet modesta simulada.
const MAX_TITILAN = 60;
// Estela de la varita: una particula cada tanto, y no mas de estas vivas.
const ESTELA_CADA_MS = 40;
const MAX_ESTELA = 36;
const SONIDO_KEY = 'musica-kids-colorear-sonido';

const ESCALA_HERRAMIENTA = Object.fromEntries(HERRAMIENTAS.map((h) => [h.id, h.escala]));
const NOMBRE_HERRAMIENTA = Object.fromEntries(HERRAMIENTAS.map((h) => [h.id, h.nombre]));
const GRUPO_HERRAMIENTA = Object.fromEntries(HERRAMIENTAS.map((h) => [h.id, h.grupo]));
// Panel de lapices: sin sello, varita ni goma (tienen boton propio).
const LAPICES = HERRAMIENTAS.filter((h) => h.grupo === 'lapiz');
const NOMBRE_FORMA = Object.fromEntries([
  ...GRUPOS_SELLO.map((g) => [`surtido:${g.id}`, 'Surtido']),
  ...FORMAS_SELLO.map((f) => [f.id, f.nombre]),
]);
const GRUPO_DE_FORMA = (forma) => (forma.startsWith('surtido') ? forma.split(':')[1] : FORMAS_SELLO.find((f) => f.id === forma)?.grupo) ?? 'cosas';
const PATH_DESTELLO = 'M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z';

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function aBlob(canvas, tipo, calidad) {
  return new Promise((resolve) => canvas.toBlob(resolve, tipo, calidad));
}

// Lamina + color en una sola imagen (para la miniatura, imprimir y guardar).
// textos: en px del lienzo (de ancho anchoLienzo); van encima de la lamina.
function componer(capa, lamina, ancho, alto, textos = [], anchoLienzo = ancho) {
  const c = document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(capa, 0, 0, ancho, alto);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(lamina, 0, 0, ancho, alto);
  ctx.globalCompositeOperation = 'source-over';
  dibujarTextos(ctx, textos, ancho / anchoLienzo);
  return c;
}

// Descarga una imagen ("Guardar imagen"): en la tablet queda en Descargas.
// Nombre del archivo descargado: grupo, numero de la lamina y fecha y hora
// (pedido explicito: que dos descargas no choquen de nombre). id es la ruta
// de la lamina ("paw-patrol-gallery/03-paw-patrol.jpg") o "hoja-en-blanco".
// Ej.: paw-patrol-03_2026-10-22_18-31-05.png
const dos = (n) => String(n).padStart(2, '0');
function nombreDescarga(id) {
  const [carpeta, archivo = ''] = String(id).split('/');
  const numero = archivo.match(/^\d+/)?.[0];
  const base = `${carpeta.replace(/-gallery$/, '')}${numero ? `-${numero}` : ''}`;
  const f = new Date();
  const fecha = `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}_${dos(f.getHours())}-${dos(f.getMinutes())}-${dos(f.getSeconds())}`;
  return `${base}_${fecha}.png`;
}

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const leerSonido = () => {
  try {
    return localStorage.getItem(SONIDO_KEY) !== '0';
  } catch {
    return true;
  }
};

// Texto para quien cuida al niño en "Mis dibujos": cuanto le queda si no
// se vuelve a abrir (abrirlo o pintarlo renueva los 7 dias).
function textoVence(registro) {
  const horas = Math.max(0, Math.ceil((ultimoUso(registro) + VIGENCIA_MS - Date.now()) / 3600000));
  if (horas <= 1) return 'Se borra en menos de 1 hora';
  if (horas < 24) return `Se borra en ${horas} horas`;
  const dias = Math.ceil(horas / 24);
  return dias === 1 ? 'Se borra mañana' : `Se borra en ${dias} días`;
}

// Dibujo guardado (capa + lamina) en una sola imagen, del tamaño del lienzo.
async function dibujoCompleto(capaBlob, src, textos = []) {
  const [lamina, capa] = await Promise.all([cargarImagen(src), capaBlob ? createImageBitmap(capaBlob) : null, cargarFuentes(textos)]);
  const escala = LADO_LARGO / Math.max(lamina.naturalWidth, lamina.naturalHeight);
  const ancho = Math.round(lamina.naturalWidth * escala);
  const alto = Math.round(lamina.naturalHeight * escala);
  return componer(capa ?? document.createElement('canvas'), lamina, ancho, alto, textos);
}

export function imprimirDibujo(capaBlob, src, imprimir, textos) {
  dibujoCompleto(capaBlob, src, textos).then((final) => final.toBlob((blob) => imprimir(URL.createObjectURL(blob)), 'image/png'));
}

export function guardarImagenDibujo(capaBlob, src, id, textos) {
  dibujoCompleto(capaBlob, src, textos).then((final) => final.toBlob((blob) => descargar(blob, nombreDescarga(id)), 'image/png'));
}

// ---------- Dialogo base: mismo overlay y tarjeta que "Elige un nivel" de
// los otros juegos; Escape y tocar fuera lo cierran ----------
function Dialogo({ etiqueta, onCerrar, rol = 'dialog', className = '', children }) {
  useEffect(() => {
    const escape = (e) => {
      if (e.key === 'Escape') onCerrar();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onCerrar]);
  // Tocar el fondo cierra solo si el toque EMPEZO en el fondo: el "clic"
  // que deja el mismo toque que abrio el dialogo (escribir un texto) caia
  // sobre el fondo recien aparecido y lo cerraba.
  const desdeFondoRef = useRef(false);
  return (
    <div
      className="memory-victoria-overlay colorear-dialogo-overlay"
      onPointerDown={(e) => {
        desdeFondoRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (desdeFondoRef.current && e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        className={`memory-niveles-modal colorear-dialogo ${className}`}
        role={rol}
        aria-modal="true"
        aria-label={etiqueta}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ConfirmarBorrado({ titulo, texto, miniatura, onConfirmar, onCancelar }) {
  return (
    <Dialogo etiqueta={titulo} onCerrar={onCancelar} rol="alertdialog">
      {miniatura ? (
        <img src={miniatura} alt="" className="colorear-dialogo-miniatura" />
      ) : (
        <span className="colorear-dialogo-icono" aria-hidden="true"><DeleteOutlined /></span>
      )}
      <h3>{titulo}</h3>
      <p>{texto}</p>
      <div className="colorear-dialogo-botones">
        <button type="button" className="colorear-dialogo-btn" onClick={onCancelar} autoFocus>
          No, volver
        </button>
        <button type="button" className="colorear-dialogo-btn colorear-dialogo-btn--peligro" onClick={onConfirmar}>
          Sí, borrar
        </button>
      </div>
    </Dialogo>
  );
}

// Escribir o editar un texto: un campo grande con "Listo" (en la tablet
// abre el teclado). Vacio al editar = se quita el texto.
function DialogoTexto({ inicial, editando, onListo, onCancelar }) {
  const [valor, setValor] = useState(inicial);
  return (
    <Dialogo etiqueta="Escribe tu texto" onCerrar={onCancelar} className="colorear-dialogo--texto">
      <h3>{editando ? 'Cambia tu texto' : 'Escribe tu texto'}</h3>
      <form
        className="colorear-texto-form"
        onSubmit={(e) => {
          e.preventDefault();
          onListo(valor);
        }}
      >
        <input
          className="colorear-texto-campo"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          maxLength={40}
          placeholder="Tu texto"
          aria-label="Texto"
          autoFocus
        />
        <div className="colorear-dialogo-botones">
          <button type="button" className="colorear-dialogo-btn" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="submit" className="colorear-dialogo-btn colorear-dialogo-btn--principal">
            Listo
          </button>
        </div>
      </form>
    </Dialogo>
  );
}

// ---------- Grilla de laminas de un grupo ----------
export function ColorearGaleria({ laminas, miniaturas, onElegir }) {
  if (laminas === null) return <p className="gallery-empty">Cargando dibujos...</p>;
  if (laminas.length === 0) return <p className="gallery-empty">Muy pronto van a haber dibujos acá.</p>;
  return (
    <div className="colorear-grilla">
      {laminas.map(({ id, src }) => (
        <button
          type="button"
          key={id}
          className="colorear-tarjeta"
          onClick={() => onElegir(id)}
          aria-label="Pintar este dibujo"
        >
          <img src={miniaturas[id] ?? src} alt="" loading="lazy" />
          {miniaturas[id] && (
            <span className="colorear-tarjeta-marca" aria-hidden="true"><LuBrush /></span>
          )}
        </button>
      ))}
    </div>
  );
}

// ---------- Mis dibujos: lo pintado en este dispositivo ----------
export function MisDibujos({ dibujos, miniaturas, onElegir, onImprimir, onGuardarImagen, onBorrar, onCapaAbierta }) {
  const [porBorrar, setPorBorrar] = useState(null);
  // Con el dialogo abierto, el Escape del drawer no debe cerrar todo.
  useEffect(() => {
    onCapaAbierta?.(Boolean(porBorrar));
    return () => onCapaAbierta?.(false);
  }, [porBorrar, onCapaAbierta]);
  if (dibujos === null) return <p className="gallery-empty">Cargando dibujos...</p>;
  if (dibujos.length === 0) return <p className="gallery-empty">Todavía no hay dibujos pintados.</p>;
  return (
    <>
      <div className="colorear-grilla">
        {dibujos.map((d) => (
          <div key={d.id} className="colorear-mio">
            <button
              type="button"
              className="colorear-tarjeta"
              onClick={() => onElegir(d.id)}
              aria-label="Seguir pintando"
            >
              <img src={miniaturas[d.id]} alt="" />
            </button>
            <span className="colorear-mio-vence">{textoVence(d)}</span>
            <div className="colorear-mio-acciones">
              <button type="button" className="colorear-accion" onClick={() => onImprimir(d)} aria-label="Imprimir" title="Imprimir">
                <PrinterOutlined />
              </button>
              <button type="button" className="colorear-accion" onClick={() => onGuardarImagen(d)} aria-label="Guardar imagen" title="Guardar imagen">
                <LuDownload />
              </button>
              <button type="button" className="colorear-accion" onClick={() => setPorBorrar(d.id)} aria-label="Borrar" title="Borrar">
                <DeleteOutlined />
              </button>
            </div>
          </div>
        ))}
      </div>
      {porBorrar && (
        <ConfirmarBorrado
          titulo="¿Borrar este dibujo?"
          texto="Se borra todo lo que pintaste en esta lámina."
          miniatura={miniaturas[porBorrar]}
          onCancelar={() => setPorBorrar(null)}
          onConfirmar={() => {
            onBorrar(porBorrar);
            setPorBorrar(null);
          }}
        />
      )}
    </>
  );
}

// Gota de color (paleta, selector y "Mi color").
function Gota({ rgb, activo, onClick, etiqueta, className = '' }) {
  return (
    <button
      type="button"
      className={`colorear-color${rgb ? '' : ' colorear-arcoiris'}${activo ? ' colorear-color--activo' : ''} ${className}`}
      style={rgb ? { '--gota': css(rgb) } : undefined}
      onClick={onClick}
      aria-label={etiqueta}
      aria-pressed={activo}
      title={etiqueta}
    />
  );
}

// Punto del puntero en px internos del lienzo, con un decimal: asi la
// historia guarda exactamente los puntos con que se pinto y "Ver cómo lo
// pinté" repite el mismo dibujo (mismo azar, mismos tramos).
const redondear = (v) => Math.round(v * 10) / 10;

// ---------- Lienzo ----------
export default function ColorearLienzo({ id, src, onGuardado, onImprimir, onCapaAbierta }) {
  const zonaRef = useRef(null);
  const barraRef = useRef(null);
  const cursorRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasTrazoRef = useRef(null);
  const repeticionRef = useRef(null);
  const efectosRef = useRef(null);
  // Copia propia del canvas: al desmontar, React suelta canvasRef ANTES de
  // la limpieza de los efectos, y ahi se guarda lo ultimo pintado.
  const capaRef = useRef(null);
  const laminaRef = useRef(null);
  const onGuardadoRef = useRef(onGuardado);
  onGuardadoRef.current = onGuardado;
  const trazoRef = useRef(null);
  const deshacerRef = useRef([]);
  // La hoja como estaba antes del trazo en curso (ver registrarCambio).
  const respaldoRef = useRef(null);
  // Lo deshecho, para rehacerlo. Se vacia con cualquier cambio nuevo.
  const rehacerRef = useRef([]);
  // Historia: trazos y borrados en orden (null = no se puede repetir: dibujo
  // anterior a la historia o demasiado largo). Ver registrarCambio.
  const historiaRef = useRef([]);
  const puntosHistoriaRef = useRef(0);
  const [versionHistoria, setVersionHistoria] = useState(0);
  const temporizadorRef = useRef(null);
  const pendienteRef = useRef(false);
  const sonidoTrazoRef = useRef(null);
  const [dimensiones, setDimensiones] = useState(null);
  const [caja, setCaja] = useState(null);
  const [herramienta, setHerramienta] = useState('crayon');
  // Ultimo lapiz elegido (lo muestra su boton aunque se este usando otra
  // herramienta), forma del sello y polvo de la varita.
  const [ultimoLapiz, setUltimoLapiz] = useState('crayon');
  const [formaSello, setFormaSello] = useState('surtido:cosas');
  const [grupoSello, setGrupoSello] = useState('cosas');
  const [varianteBrillo, setVarianteBrillo] = useState('magia');
  // colorId: uno de COLORES o 'propio:<r,g,b>' (elegido en la paleta
  // completa). coloresPropios: los ultimos MIS_COLORES elegidos ahi, el mas
  // reciente primero; quedan en la paleta para volver a usarlos.
  const [colorId, setColorId] = useState('rojo');
  const [coloresPropios, setColoresPropios] = useState([]);
  const [tamano, setTamano] = useState(TAMANO_INICIAL);
  const [puedeDeshacer, setPuedeDeshacer] = useState(false);
  const [puedeRehacer, setPuedeRehacer] = useState(false);
  // Panel desplegado de la barra: 'lapices' | 'sellos' | 'varita' | 'texto' | 'goma' | 'espectro' | 'mas' | null.
  const [menu, setMenu] = useState(null);
  // Toque en la hoja que solo retrajo un panel: no debe pintar. (React
  // puede re-renderizar entre el listener que cierra y el del canvas, asi
  // que no basta con mirar "menu").
  const ignorarToqueRef = useRef(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  // Dialogo abierto: 'repetir' | 'imprimir' | null.
  const [dialogo, setDialogo] = useState(null);
  const [miniaturaDialogo, setMiniaturaDialogo] = useState(null);
  const [marco, setMarco] = useState('ninguno');
  const [vistasMarcos, setVistasMarcos] = useState({});
  const [repitiendo, setRepitiendo] = useState(false);
  const repitiendoRef = useRef(false);
  const cuadroRepeticionRef = useRef(null);
  // Mano: con ella activa la hoja se acerca (pellizco) y se desplaza (arrastre).
  const [mano, setMano] = useState(false);
  // Textos sobre la hoja (ver utils/textosColorear.js). textosRef: la lista
  // al dia para leerla en handlers sin esperar el re-render.
  const [textos, setTextos] = useState([]);
  const textosRef = useRef([]);
  const ponerTextos = (lista) => {
    textosRef.current = lista;
    setTextos(lista);
  };
  const [fuente, setFuente] = useState('redonda');
  // Texto seleccionado (id), su caja medida en el SVG y el dialogo de
  // escribir: { id?: texto que se edita, x, y: donde va uno nuevo }.
  const [seleccionado, setSeleccionado] = useState(null);
  const [cajaSeleccion, setCajaSeleccion] = useState(null);
  const [escribiendo, setEscribiendo] = useState(null);
  const [borrarTexto, setBorrarTexto] = useState(false);
  const nodosTextoRef = useRef({});
  const arrastreTextoRef = useRef(null);
  const toqueTextoRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);
  // Ultimo paso de deshacer que se puede seguir fusionando (barra de tamaño).
  const fusionTextoRef = useRef(null);
  const ultimoToqueTextoRef = useRef({ id: null, t: 0 });
  // Textos de la repeticion ("Ver cómo lo pinté").
  const [textosRepeticion, setTextosRepeticion] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [espejo, setEspejo] = useState(false);
  const [sonido, setSonido] = useState(leerSonido);
  const marcoRef = useRef(null);
  const vistaRef = useRef(null);
  const ultimaEstelaRef = useRef(0);
  const ultimoPopRef = useRef(0);

  // Con un panel, un dialogo o la repeticion abiertos, el Escape del drawer
  // no cierra todo (lo cierra este componente).
  useEffect(() => {
    onCapaAbierta?.(Boolean(menu || confirmarBorrar || dialogo || repitiendo || escribiendo || borrarTexto || seleccionado));
    return () => onCapaAbierta?.(false);
  }, [menu, confirmarBorrar, dialogo, repitiendo, escribiendo, borrarTexto, seleccionado, onCapaAbierta]);

  // Escape suelta el texto seleccionado (si no hay un panel o dialogo encima).
  useEffect(() => {
    if (!seleccionado || menu || escribiendo || borrarTexto) return undefined;
    const escape = (e) => {
      if (e.key === 'Escape') setSeleccionado(null);
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [seleccionado, menu, escribiendo, borrarTexto]);

  useEffect(() => {
    silenciar(!sonido);
    try {
      localStorage.setItem(SONIDO_KEY, sonido ? '1' : '0');
    } catch {
      // Sin localStorage: el sonido igual se apaga en esta sesion.
    }
  }, [sonido]);

  const esGoma = herramienta === 'goma';
  const rgb = colorId.startsWith('propio:')
    ? colorId.slice(7).split(',').map(Number)
    : COLORES.find((c) => c.id === colorId).rgb;
  // Color con que se dibujan los iconos, la muestra y el cursor.
  const colorIcono = rgb ? css(rgb) : 'arcoiris';
  const variante = VARIANTES_BRILLO.find((v) => v.id === varianteBrillo) ?? VARIANTES_BRILLO[0];
  // La varita se dibuja con el color de su polvo (oro, plata...) o el elegido.
  const colorVarita = variante.paleta ? css(variante.paleta[1] ?? variante.paleta[0]) : colorIcono;

  // Lamina + lo guardado (si hay) al entrar.
  useEffect(() => {
    let vivo = true;
    Promise.all([cargarImagen(src), leerDibujo(id)]).then(async ([lamina, guardado]) => {
      if (!vivo) return;
      laminaRef.current = lamina;
      const escala = LADO_LARGO / Math.max(lamina.naturalWidth, lamina.naturalHeight);
      const ancho = Math.round(lamina.naturalWidth * escala);
      const alto = Math.round(lamina.naturalHeight * escala);
      for (const c of [canvasRef.current, canvasTrazoRef.current, repeticionRef.current]) {
        c.width = ancho;
        c.height = alto;
      }
      const canvas = canvasRef.current;
      capaRef.current = canvas;
      const respaldo = document.createElement('canvas');
      respaldo.width = ancho;
      respaldo.height = alto;
      // El respaldo se lee en cada trazo (deshacer, brillos): en memoria y no
      // en la GPU, asi leerlo no frena (antes: tiron al empezar a pintar).
      respaldo.getContext('2d', { willReadFrequently: true });
      respaldoRef.current = respaldo;
      // Granos de crayon, lapiz y tiza y el audio listos antes del primer
      // trazo (armarlos en el primer trazo lo trababa un momento).
      (window.requestIdleCallback ?? setTimeout)(() => {
        prepararTexturas();
        prepararAudio();
      });
      if (guardado?.capa) {
        const capa = await createImageBitmap(guardado.capa);
        if (!vivo) return;
        canvas.getContext('2d').drawImage(capa, 0, 0, ancho, alto);
      }
      // Dibujo con capa pero sin historia (anterior a "Ver cómo lo pinté"):
      // no se puede repetir.
      historiaRef.current = guardado?.capa ? guardado.historia ?? null : [];
      ponerTextos(guardado?.textos ?? []);
      puntosHistoriaRef.current = (historiaRef.current ?? []).reduce((t, e) => t + (e.p?.length ?? 0) / 2, 0);
      setVersionHistoria((v) => v + 1);
      sincronizarRespaldo();
      setDimensiones({ ancho, alto });
    });
    return () => {
      vivo = false;
    };
    // sincronizarRespaldo usa solo refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, src]);

  // La lamina ocupa el mayor tamaño posible sin deformarse, descontando
  // solo la barra (al costado o abajo, segun la pantalla: lo decide el CSS
  // con flex-direction de .colorear-centro). Los paneles flotan encima.
  useEffect(() => {
    const zona = zonaRef.current;
    const barra = barraRef.current;
    if (!zona || !barra || !dimensiones) return;
    const ajustar = () => {
      const { width, height } = zona.getBoundingClientRect();
      const enFila = getComputedStyle(zona.firstElementChild).flexDirection === 'row';
      const b = barra.getBoundingClientRect();
      const libreAncho = enFila ? width - b.width - SEPARACION : width;
      const libreAlto = enFila ? height : height - b.height - SEPARACION;
      const escala = Math.max(0, Math.min(libreAncho / dimensiones.ancho, libreAlto / dimensiones.alto));
      setCaja({ ancho: Math.floor(dimensiones.ancho * escala), alto: Math.floor(dimensiones.alto * escala) });
    };
    ajustar();
    const observador = new ResizeObserver(ajustar);
    observador.observe(zona);
    observador.observe(barra);
    return () => observador.disconnect();
  }, [dimensiones]);

  // El panel abierto se retrae al tocar fuera de la barra (incluida la hoja:
  // ese toque solo cierra, no pinta — ver alApoyar) o con Escape.
  useEffect(() => {
    if (!menu) return undefined;
    const fuera = (e) => {
      if (barraRef.current?.contains(e.target)) return;
      if (e.target === canvasRef.current) ignorarToqueRef.current = true;
      setMenu(null);
    };
    const escape = (e) => {
      if (e.key === 'Escape') setMenu(null);
    };
    document.addEventListener('pointerdown', fuera, true);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', fuera, true);
      document.removeEventListener('keydown', escape);
    };
  }, [menu]);

  const guardar = useCallback(async () => {
    clearTimeout(temporizadorRef.current);
    if (!pendienteRef.current) return;
    pendienteRef.current = false;
    const canvas = capaRef.current;
    const lamina = laminaRef.current;
    if (!canvas || !lamina) return;
    const escala = MINIATURA / Math.max(canvas.width, canvas.height);
    const lista = textosRef.current;
    await cargarFuentes(lista);
    const mini = componer(canvas, lamina, Math.round(canvas.width * escala), Math.round(canvas.height * escala), lista, canvas.width);
    const [capa, miniatura] = await Promise.all([aBlob(canvas, 'image/png'), aBlob(mini, 'image/jpeg', 0.82)]);
    await guardarDibujo(id, capa, miniatura, historiaRef.current, lista);
    onGuardadoRef.current?.();
  }, [id]);

  const programarGuardado = useCallback(() => {
    pendienteRef.current = true;
    clearTimeout(temporizadorRef.current);
    temporizadorRef.current = setTimeout(guardar, ESPERA_GUARDADO_MS);
  }, [guardar]);

  // Al salir de la lamina se guarda lo que falte.
  useEffect(() => () => {
    guardar();
  }, [guardar]);

  useEffect(() => () => {
    cancelAnimationFrame(cuadroRepeticionRef.current);
    clearTimeout(cuadroRepeticionRef.current);
    sonidoTrazoRef.current?.parar();
  }, []);

  // Miniatura de los dialogos de "Borrar todo" y "Ver cómo lo pinté".
  const conMiniatura = confirmarBorrar || dialogo === 'repetir';
  useEffect(() => {
    if (!conMiniatura || !laminaRef.current) return undefined;
    const canvas = canvasRef.current;
    const escala = MINIATURA / Math.max(canvas.width, canvas.height);
    let url = null;
    let vivo = true;
    cargarFuentes(textosRef.current).then(() => {
      if (!vivo) return;
      const mini = componer(canvas, laminaRef.current, Math.round(canvas.width * escala), Math.round(canvas.height * escala), textosRef.current, canvas.width);
      mini.toBlob((blob) => {
        url = URL.createObjectURL(blob);
        if (vivo) setMiniaturaDialogo(url);
      }, 'image/jpeg', 0.85);
    });
    return () => {
      vivo = false;
      if (url) URL.revokeObjectURL(url);
      setMiniaturaDialogo(null);
    };
  }, [conMiniatura]);

  // Vistas previas de cada marco en el dialogo de imprimir/guardar.
  useEffect(() => {
    if (dialogo !== 'imprimir' || !laminaRef.current) return undefined;
    const canvas = canvasRef.current;
    const escala = (MINIATURA * 0.7) / Math.max(canvas.width, canvas.height);
    const urls = {};
    let vivo = true;
    cargarFuentes(textosRef.current).then(() => {
      if (!vivo) return null;
      const base = componer(canvas, laminaRef.current, Math.round(canvas.width * escala), Math.round(canvas.height * escala), textosRef.current, canvas.width);
      return Promise.all(MARCOS.map((m) => aBlob(conMarco(base, m.id), 'image/jpeg', 0.85).then((blob) => {
        urls[m.id] = URL.createObjectURL(blob);
      })));
    }).then(() => {
      if (vivo) setVistasMarcos({ ...urls });
    });
    return () => {
      vivo = false;
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
      setVistasMarcos({});
    };
  }, [dialogo]);

  // ----- Deshacer / rehacer por zonas -----
  // respaldoRef es una copia de la hoja como estaba ANTES del trazo en curso;
  // al soltar se guarda solo el rectangulo que toco el trazo, sacado del
  // respaldo, y el respaldo se pone al dia en esa zona.
  // Paso = { x, y, datos, hist } (hist = su entrada en la historia).
  const sincronizarRespaldo = (zona) => {
    const respaldo = respaldoRef.current;
    const canvas = canvasRef.current;
    if (!respaldo || !canvas) return;
    const ctx = respaldo.getContext('2d');
    const { x, y, w, h } = zona ?? { x: 0, y: 0, w: canvas.width, h: canvas.height };
    ctx.clearRect(x, y, w, h);
    ctx.drawImage(canvas, x, y, w, h, x, y, w, h);
  };

  // Zona del trazo (minimo/maximo de sus puntos) + margen por el grosor, el
  // halo del neon/pincel y las chispas o sellos, ajustada a la hoja. Con
  // espejo suma la zona reflejada.
  const zonaDeTrazo = (caja, ancho, anchoEspejo) => {
    const canvas = canvasRef.current;
    const m = Math.ceil(ancho * 1.7 + 6);
    let [x0, x1] = [caja.x0, caja.x1];
    if (anchoEspejo) [x0, x1] = [Math.min(x0, anchoEspejo - caja.x1), Math.max(x1, anchoEspejo - caja.x0)];
    const x = Math.max(0, Math.floor(x0 - m));
    const y = Math.max(0, Math.floor(caja.y0 - m));
    const xf = Math.min(canvas.width, Math.ceil(x1 + m));
    const yf = Math.min(canvas.height, Math.ceil(caja.y1 + m));
    return { x, y, w: Math.max(1, xf - x), h: Math.max(1, yf - y) };
  };

  // Anota un cambio en la historia (si se puede repetir todavia).
  const anotarEnHistoria = (hist) => {
    if (!historiaRef.current) return;
    puntosHistoriaRef.current += (hist.p?.length ?? 0) / 2;
    if (puntosHistoriaRef.current > MAX_PUNTOS_HISTORIA) historiaRef.current = null;
    else historiaRef.current.push(hist);
    setVersionHistoria((v) => v + 1);
  };

  // Registra un cambio ya hecho en la hoja: la zona como estaba antes (del
  // respaldo) va a deshacer, se vacia rehacer, se anota en la historia y el
  // respaldo se pone al dia.
  const registrarCambio = (zona, hist, textosAntes) => {
    const respaldo = respaldoRef.current;
    if (!respaldo) return;
    const pila = deshacerRef.current;
    pila.push({ x: zona.x, y: zona.y, datos: respaldo.getContext('2d').getImageData(zona.x, zona.y, zona.w, zona.h), hist, ...(textosAntes && { textos: textosAntes }) });
    if (pila.length > MAX_DESHACER) pila.shift();
    rehacerRef.current = [];
    setPuedeDeshacer(true);
    setPuedeRehacer(false);
    anotarEnHistoria(hist);
    sincronizarRespaldo(zona);
  };

  const punto = (e) => {
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    return {
      x: redondear(((e.clientX - r.left) / r.width) * canvas.width),
      y: redondear(((e.clientY - r.top) / r.height) * canvas.height),
    };
  };

  // ----- Cursor de laptop: la herramienta dibujada con el color + un anillo
  // del ancho real del trazo. Solo con mouse (en tactil no hay cursor). Se
  // mueve por estilo directo, sin re-render en cada movimiento.
  const moverCursor = (e) => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    // Con la mano, el cursor es la mano del sistema (grab/grabbing en CSS).
    // Con Texto, el cursor de texto del sistema (CSS).
    if (e.pointerType !== 'mouse' || mano || repitiendoRef.current || herramienta === 'texto') {
      cursor.style.display = 'none';
      return;
    }
    const zona = zonaRef.current.getBoundingClientRect();
    cursor.style.display = 'block';
    cursor.style.transform = `translate(${e.clientX - zona.left}px, ${e.clientY - zona.top}px)`;
  };

  const ocultarCursor = () => {
    if (cursorRef.current) cursorRef.current.style.display = 'none';
  };

  // ----- Efectos que no se pintan (sobre la lamina, se mueven con el zoom).
  // Se agregan al DOM directo (sin re-render) y se quitan solos al terminar
  // su animacion. Posicion y tamaño en % de la hoja.
  const agregarEfecto = (clase, p, tam, estilo = {}) => {
    const cont = efectosRef.current;
    const canvas = canvasRef.current;
    if (!cont || !canvas) return null;
    const el = document.createElement('span');
    el.className = clase;
    el.style.left = `${(p.x / canvas.width) * 100}%`;
    el.style.top = `${(p.y / canvas.height) * 100}%`;
    el.style.width = `${(tam / canvas.width) * 100}%`;
    Object.assign(el.style, estilo);
    el.addEventListener('animationend', () => el.remove());
    cont.appendChild(el);
    return el;
  };

  // Estela de la varita: particulas que caen y se apagan detras del dedo.
  const lanzarEstela = (p, trazo) => {
    if (esLiviano()) return;
    const ahora = performance.now();
    if (ahora - ultimaEstelaRef.current < ESTELA_CADA_MS) return;
    if ((efectosRef.current?.querySelectorAll('.colorear-estela').length ?? 0) >= MAX_ESTELA) return;
    ultimaEstelaRef.current = ahora;
    const paleta = variante.paleta;
    const color = paleta ? css(paleta[Math.floor(Math.random() * paleta.length)]) : css(trazo.rgb ?? [255, 213, 79]);
    const tam = trazo.ancho * (0.12 + Math.random() * 0.12);
    agregarEfecto('colorear-estela', p, tam, {
      background: color,
      '--deriva': `${Math.round((Math.random() - 0.5) * 60)}%`,
    });
  };

  // "Pop" al estampar: un anillo que se abre y se apaga.
  const lanzarPop = (sello) => {
    const ahora = performance.now();
    if (ahora - ultimoPopRef.current < 70) return;
    ultimoPopRef.current = ahora;
    agregarEfecto('colorear-pop', sello, sello.tam * 1.25);
    sonidoPop();
  };

  // ----- Zoom y desplazamiento de la hoja -----
  // La vista se mueve con transform: translate(x, y) scale(s), origen
  // arriba-izquierda, por estilo directo y una vez por cuadro (rAF), sin
  // re-render: "zoom" (estado, el boton de porcentaje) se actualiza recien al
  // terminar el gesto. punto() usa el rectangulo ya transformado del canvas,
  // asi que pintar con zoom cae donde corresponde, y el grosor sigue igual
  // EN PANTALLA (mas fino sobre la lamina: sirve para los detalles).
  //
  // Gestos (patron de las apps de dibujo):
  // - Dos dedos pellizcan y arrastran SIEMPRE, con cualquier herramienta: si
  //   el primer dedo alcanzo a pintar, ese trazo se cancela.
  // - Con la mano: un dedo (o el mouse) arrastra; doble toque acerca a
  //   ZOOM_TOQUE en ese punto, o vuelve a la hoja entera si ya habia zoom.
  // - Rueda del mouse / pellizco del touchpad: acercan hacia el puntero.
  const vistaActualRef = useRef(VISTA_INICIAL);
  const gestosRef = useRef(new Map());
  const gestoInicioRef = useRef(null);
  // true desde que se apoya el segundo dedo hasta que se levantan todos.
  const pellizcoRef = useRef(false);
  const cuadroRef = useRef(null);
  const ultimoToqueRef = useRef(null);
  const ruedaFinRef = useRef(null);

  // La hoja siempre llena su marco: nada de bordes vacios al desplazar.
  const limitarVista = ({ x, y, s }) => {
    const ancho = caja?.ancho ?? 0;
    const alto = caja?.alto ?? 0;
    return {
      s,
      x: Math.min(0, Math.max(ancho - ancho * s, x)),
      y: Math.min(0, Math.max(alto - alto * s, y)),
    };
  };
  const limitarVistaRef = useRef(limitarVista);
  limitarVistaRef.current = limitarVista;

  const pintarVista = () => {
    cuadroRef.current = null;
    const v = vistaActualRef.current;
    if (vistaRef.current) {
      vistaRef.current.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.s})`;
      // La botonera del texto seleccionado se des-escala con esto (no crece con el zoom).
      vistaRef.current.style.setProperty('--escala-vista', v.s);
    }
  };

  // final: ademas actualiza el boton de porcentaje (re-render).
  const aplicarVista = useCallback((v, final = true) => {
    vistaActualRef.current = v;
    if (!cuadroRef.current) cuadroRef.current = requestAnimationFrame(pintarVista);
    if (final) setZoom(v.s);
  }, []);

  const reiniciarVista = useCallback(() => aplicarVista(VISTA_INICIAL), [aplicarVista]);

  // Si cambia el tamaño de la hoja (girar la tablet), vuelve a la hoja entera.
  useEffect(() => {
    reiniciarVista();
  }, [caja?.ancho, caja?.alto, reiniciarVista]);

  // Al cancelar el cuadro pendiente hay que soltar tambien la referencia:
  // en desarrollo (StrictMode) los efectos se montan, desmontan y vuelven a
  // montar, y con el id viejo guardado aplicarVista creia que ya habia un
  // cuadro en camino y no programaba nunca otro (el zoom no se movia).
  useEffect(() => () => {
    cancelAnimationFrame(cuadroRef.current);
    cuadroRef.current = null;
    clearTimeout(ruedaFinRef.current);
  }, []);

  // Acercar a "s" dejando quieto el punto m (coordenadas del marco).
  const acercarEn = (m, s, final = true) => {
    const v = vistaActualRef.current;
    const nuevo = Math.min(ZOOM_MAX, Math.max(1, s));
    const p = { x: (m.x - v.x) / v.s, y: (m.y - v.y) / v.s };
    aplicarVista(limitarVistaRef.current({ s: nuevo, x: m.x - p.x * nuevo, y: m.y - p.y * nuevo }), final);
  };

  const puntoMarco = (e) => {
    const r = marcoRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  // Foto del gesto al empezar (o al sumar/quitar un dedo): de ahi se mide.
  const reiniciarGesto = () => {
    const dedos = [...gestosRef.current.values()];
    if (!dedos.length) {
      gestoInicioRef.current = null;
      return;
    }
    const m = dedos.length >= 2
      ? { x: (dedos[0].x + dedos[1].x) / 2, y: (dedos[0].y + dedos[1].y) / 2 }
      : dedos[0];
    const d = dedos.length >= 2 ? Math.hypot(dedos[0].x - dedos[1].x, dedos[0].y - dedos[1].y) : 0;
    gestoInicioRef.current = { m, d, vista: vistaActualRef.current };
  };

  // El primer dedo empezo un trazo y llego el segundo: era un pellizco.
  const cancelarTrazo = () => {
    const actual = trazoRef.current;
    if (!actual) return;
    trazoRef.current = null;
    sonidoTrazoRef.current?.parar();
    if (actual.capa) {
      const capa = canvasTrazoRef.current;
      capa.getContext('2d').clearRect(0, 0, capa.width, capa.height);
    }
    // La hoja vuelve a como estaba antes del trazo (el respaldo).
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(respaldoRef.current, 0, 0);
  };

  // Doble toque con la mano: acerca a ZOOM_TOQUE ahi, o vuelve a la hoja entera.
  const dobleToque = (p) => {
    const antes = ultimoToqueRef.current;
    const ahora = performance.now();
    ultimoToqueRef.current = { ...p, t: ahora };
    if (!antes || ahora - antes.t > 320 || Math.hypot(p.x - antes.x, p.y - antes.y) > 30) return false;
    ultimoToqueRef.current = null;
    if (vistaActualRef.current.s > 1.05) reiniciarVista();
    else acercarEn(p, ZOOM_TOQUE);
    return true;
  };

  const gestoApoyar = (e) => {
    if (e.target.closest('button') || repitiendoRef.current) return;
    const tactil = e.pointerType === 'touch';
    if (!mano && !tactil) return;
    const p = puntoMarco(e);
    gestosRef.current.set(e.pointerId, p);
    if (mano) {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      if (gestosRef.current.size === 1 && dobleToque(p)) {
        gestosRef.current.delete(e.pointerId);
        return;
      }
      reiniciarGesto();
    } else if (gestosRef.current.size >= 2) {
      // Pintando: el segundo dedo convierte el toque en pellizco.
      cancelarTrazo();
      pellizcoRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      reiniciarGesto();
    }
  };

  const gestoMover = (e) => {
    if (!gestosRef.current.has(e.pointerId)) return;
    gestosRef.current.set(e.pointerId, puntoMarco(e));
    if (!(mano || pellizcoRef.current) || !gestoInicioRef.current) return;
    const dedos = [...gestosRef.current.values()];
    const { m: m0, d: d0, vista: v0 } = gestoInicioRef.current;
    if (dedos.length >= 2 && d0 > 0) {
      // Pellizco + arrastre a la vez: el punto de la lamina que estaba bajo
      // los dedos sigue bajo los dedos.
      const m = { x: (dedos[0].x + dedos[1].x) / 2, y: (dedos[0].y + dedos[1].y) / 2 };
      const d = Math.hypot(dedos[0].x - dedos[1].x, dedos[0].y - dedos[1].y);
      const s = Math.min(ZOOM_MAX, Math.max(1, v0.s * (d / d0)));
      const p = { x: (m0.x - v0.x) / v0.s, y: (m0.y - v0.y) / v0.s };
      aplicarVista(limitarVista({ s, x: m.x - p.x * s, y: m.y - p.y * s }), false);
    } else if (mano) {
      const m = dedos[0];
      aplicarVista(limitarVista({ s: v0.s, x: v0.x + (m.x - m0.x), y: v0.y + (m.y - m0.y) }), false);
    }
  };

  const gestoSoltar = (e) => {
    if (!gestosRef.current.delete(e.pointerId)) return;
    if (gestosRef.current.size === 0) {
      pellizcoRef.current = false;
      setZoom(vistaActualRef.current.s);
    }
    reiniciarGesto();
  };

  // Rueda del mouse y pellizco del touchpad (llega como rueda con ctrlKey,
  // en pasos chicos: por eso acerca mas por unidad). Listener propio: el de
  // React es pasivo y no deja frenar el scroll de la pagina.
  useEffect(() => {
    const marco = marcoRef.current;
    if (!marco) return undefined;
    const rueda = (e) => {
      e.preventDefault();
      if (repitiendoRef.current) return;
      const r = marco.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0028));
      acercarEn({ x: e.clientX - r.left, y: e.clientY - r.top }, vistaActualRef.current.s * factor, false);
      clearTimeout(ruedaFinRef.current);
      ruedaFinRef.current = setTimeout(() => setZoom(vistaActualRef.current.s), 150);
    };
    marco.addEventListener('wheel', rueda, { passive: false });
    return () => marco.removeEventListener('wheel', rueda);
    // acercarEn usa solo refs y aplicarVista (estable).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aplicarVista]);

  const alternarMano = () => {
    sonidoClic();
    setMenu(null);
    setMano((m) => !m);
    ocultarCursor();
  };

  // ----- Pintar -----
  const alApoyar = (e) => {
    // Con la mano, durante un pellizco o repitiendo el dibujo, no se pinta.
    if (mano || pellizcoRef.current || repitiendoRef.current) return;
    // Con un panel abierto, tocar la hoja solo lo retrae (lo cierra el
    // listener de "tocar fuera"); no se pinta.
    if (ignorarToqueRef.current) {
      ignorarToqueRef.current = false;
      return;
    }
    // Texto: el toque se resuelve al soltar (si no fue un pellizco): suelta
    // el texto seleccionado o abre el dialogo para escribir uno nuevo ahi.
    if (herramienta === 'texto') {
      e.preventDefault();
      if (dimensiones) toqueTextoRef.current = { pointerId: e.pointerId, p: punto(e) };
      return;
    }
    // Un solo dedo a la vez: un segundo dedo no mancha.
    if (trazoRef.current !== null || !dimensiones) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const canvas = canvasRef.current;
    const ancho = redondear((tamano * canvas.width) / canvas.getBoundingClientRect().width);
    const opciones = {
      forma: formaSello,
      variante: varianteBrillo,
      semilla: Math.floor(Math.random() * 2 ** 31),
      espejo: espejo ? canvas.width : 0,
    };
    const trazo = empezarTrazo(herramienta, rgb, ancho, opciones);
    const capa = capaDe(herramienta);
    const destino = capa ? canvasTrazoRef.current : canvas;
    if (capa) {
      // Vista previa fiel: la capa del trazo se ve con la misma
      // transparencia y modo con que se va a fundir al soltar.
      canvasTrazoRef.current.style.opacity = capa.alfa;
      canvasTrazoRef.current.style.mixBlendMode = capa.modo === 'multiply' ? 'multiply' : 'normal';
    }
    const p = punto(e);
    pintarTramo(destino.getContext('2d'), trazo, p, p);
    sonidoTrazoRef.current?.parar();
    sonidoTrazoRef.current = sonidoDeTrazo(herramienta);
    sonidoTrazoRef.current.mover();
    trazoRef.current = {
      pointerId: e.pointerId,
      ultimo: p,
      trazo,
      destino,
      capa,
      caja: { x0: p.x, y0: p.y, x1: p.x, y1: p.y },
      // Entrada de la historia: lo necesario para repetir este trazo.
      hist: { t: 'trazo', h: herramienta, c: rgb, a: ancho, f: opciones.forma, v: opciones.variante, s: opciones.semilla, e: opciones.espejo, p: [p.x, p.y] },
    };
    mostrarEfectos(trazoRef.current, p);
  };

  const mostrarEfectos = (actual, p) => {
    const { trazo } = actual;
    if (trazo.herramienta === 'brillos') lanzarEstela(p, trazo);
    recogerEfectos(trazo).sellos.forEach(lanzarPop);
  };

  const alMover = (e) => {
    moverCursor(e);
    const actual = trazoRef.current;
    if (!actual || actual.pointerId !== e.pointerId) return;
    const ctx = actual.destino.getContext('2d');
    const eventos = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const ev of eventos.length ? eventos : [e]) {
      const p = punto(ev);
      pintarTramo(ctx, actual.trazo, actual.ultimo, p);
      actual.ultimo = p;
      actual.hist.p.push(p.x, p.y);
      const { caja } = actual;
      caja.x0 = Math.min(caja.x0, p.x);
      caja.y0 = Math.min(caja.y0, p.y);
      caja.x1 = Math.max(caja.x1, p.x);
      caja.y1 = Math.max(caja.y1, p.y);
    }
    sonidoTrazoRef.current?.mover();
    mostrarEfectos(actual, actual.ultimo);
  };

  const alSoltar = (e) => {
    const toque = toqueTextoRef.current;
    if (toque && toque.pointerId === e.pointerId) {
      toqueTextoRef.current = null;
      if (pellizcoRef.current || e.type === 'pointercancel') return;
      if (seleccionado) setSeleccionado(null);
      else setEscribiendo({ x: toque.p.x, y: toque.p.y, texto: '' });
      return;
    }
    const actual = trazoRef.current;
    if (!actual || actual.pointerId !== e.pointerId) return;
    trazoRef.current = null;
    sonidoTrazoRef.current?.parar();
    if (actual.capa) fundirCapa(canvasRef.current.getContext('2d'), canvasTrazoRef.current, actual.trazo.herramienta);
    const titilan = titilanDe(actual.trazo);
    if (titilan.length) actual.hist.ti = titilan;
    registrarCambio(zonaDeTrazo(actual.caja, actual.trazo.ancho, actual.trazo.espejo), actual.hist);
    if (actual.trazo.herramienta === 'goma') apagarBrillosBorrados(actual.hist);
    programarGuardado();
  };

  // Mueve un paso entre las dos pilas: lo que sale de "desde" se pinta y el
  // estado actual pasa a "hacia". La historia sigue al paso: deshacer saca
  // su entrada, rehacer la vuelve a poner.
  // Un paso puede traer pintura (datos de una zona), textos (la lista como
  // estaba) o los dos ("Borrar todo").
  const moverPaso = (desde, hacia) => {
    const paso = desde.current.pop();
    if (!paso) return;
    const { x, y, datos, hist } = paso;
    const inverso = { hist };
    if (datos) {
      const ctx = canvasRef.current.getContext('2d');
      Object.assign(inverso, { x, y, datos: ctx.getImageData(x, y, datos.width, datos.height) });
      ctx.putImageData(datos, x, y);
      respaldoRef.current.getContext('2d').putImageData(datos, x, y);
    }
    if (paso.textos) {
      inverso.textos = textosRef.current;
      ponerTextos(paso.textos);
      setSeleccionado(null);
    }
    hacia.current.push(inverso);
    if (hacia.current.length > MAX_DESHACER) hacia.current.shift();
    if (historiaRef.current) {
      if (desde === deshacerRef) historiaRef.current.pop();
      else historiaRef.current.push(hist);
      setVersionHistoria((v) => v + 1);
    }
    setPuedeDeshacer(deshacerRef.current.length > 0);
    setPuedeRehacer(rehacerRef.current.length > 0);
    programarGuardado();
  };
  const deshacer = () => moverPaso(deshacerRef, rehacerRef);
  const rehacer = () => moverPaso(rehacerRef, deshacerRef);

  const borrarTodo = async () => {
    setConfirmarBorrar(false);
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    const textosAntes = textosRef.current;
    ponerTextos([]);
    setSeleccionado(null);
    registrarCambio({ x: 0, y: 0, w: canvas.width, h: canvas.height }, { t: 'borrar' }, textosAntes);
    clearTimeout(temporizadorRef.current);
    pendienteRef.current = false;
    await borrarDibujo(id);
    onGuardadoRef.current?.();
  };

  // Imprimir o guardar, con el marco elegido, a la resolucion del lienzo.
  const dibujoConMarco = async () => {
    const canvas = canvasRef.current;
    await cargarFuentes(textosRef.current);
    return conMarco(componer(canvas, laminaRef.current, canvas.width, canvas.height, textosRef.current), marco);
  };
  const imprimirConMarco = () => {
    if (!laminaRef.current) return;
    dibujoConMarco().then((final) => final.toBlob((blob) => onImprimir(URL.createObjectURL(blob)), 'image/png'));
    setDialogo(null);
  };
  const guardarImagen = () => {
    if (!laminaRef.current) return;
    dibujoConMarco().then((final) => final.toBlob((blob) => descargar(blob, nombreDescarga(id)), 'image/png'));
    setDialogo(null);
  };

  // ----- Ver cómo lo pinté: repite la historia en un canvas aparte (el de
  // pintar queda oculto), ~SEGUNDOS_REPETICION, con el mismo azar de cada
  // trazo. Tocar "Saltar" termina.
  const historia = historiaRef.current;
  const sePuedeRepetir = Boolean(historia?.some((h) => h.t === 'trazo'));

  const terminarRepeticion = useCallback(() => {
    cancelAnimationFrame(cuadroRepeticionRef.current);
    clearTimeout(cuadroRepeticionRef.current);
    repitiendoRef.current = false;
    setRepitiendo(false);
  }, []);

  const repetir = () => {
    const lista = historiaRef.current;
    if (!lista?.length) return;
    setDialogo(null);
    setMenu(null);
    repitiendoRef.current = true;
    setRepitiendo(true);
    reiniciarVista();
    const lienzo = repeticionRef.current;
    const ctx = lienzo.getContext('2d');
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    setTextosRepeticion([]);
    const capa = document.createElement('canvas');
    capa.width = lienzo.width;
    capa.height = lienzo.height;
    const total = lista.reduce((t, h) => t + (h.p?.length ?? 0) / 2, 0);
    // Un punto por cuadro como minimo: un dibujo corto igual se alcanza a ver.
    const porCuadro = Math.max(1, Math.ceil(total / (60 * SEGUNDOS_REPETICION)));
    let i = 0;
    let j = 0;
    let trazo = null;
    let destino = null;
    let previo = null;
    const avanzar = () => {
      let presupuesto = porCuadro;
      while (presupuesto > 0 && i < lista.length) {
        const h = lista[i];
        if (h.t === 'borrar') {
          ctx.clearRect(0, 0, lienzo.width, lienzo.height);
          setTextosRepeticion([]);
          i += 1;
          continue;
        }
        if (h.t === 'textos') {
          setTextosRepeticion(h.l);
          i += 1;
          presupuesto -= 20;
          continue;
        }
        const n = h.p.length / 2;
        if (j === 0) {
          trazo = empezarTrazo(h.h, h.c, h.a, { forma: h.f, variante: h.v, semilla: h.s, espejo: h.e });
          destino = (capaDe(h.h) ? capa : lienzo).getContext('2d');
          previo = { x: h.p[0], y: h.p[1] };
          pintarTramo(destino, trazo, previo, previo);
          j = 1;
          presupuesto -= 1;
        }
        while (j < n && presupuesto > 0) {
          const p = { x: h.p[j * 2], y: h.p[j * 2 + 1] };
          pintarTramo(destino, trazo, previo, p);
          previo = p;
          j += 1;
          presupuesto -= 1;
        }
        if (j >= n) {
          if (capaDe(h.h)) fundirCapa(ctx, capa, h.h);
          i += 1;
          j = 0;
        }
      }
      if (i < lista.length) cuadroRepeticionRef.current = requestAnimationFrame(avanzar);
      else cuadroRepeticionRef.current = setTimeout(terminarRepeticion, 1000);
    };
    cuadroRepeticionRef.current = requestAnimationFrame(avanzar);
  };

  // Brillos que titilan: los de los trazos de varita desde el ultimo "borrar
  // todo" (los ultimos MAX_TITILAN), sacados de la historia, menos los que
  // apago la goma (h.ap, ver apagarBrillosBorrados). Antes se mostraban los
  // que tenian pintura debajo: al pintar de nuevo donde la goma habia
  // borrado, el destello volvia a aparecer.
  const titilan = useMemo(() => {
    // Modo liviano: no se muestran (ni se calculan).
    if (esLiviano()) return [];
    let todos = [];
    for (const h of historiaRef.current ?? []) {
      if (h.t === 'borrar') todos = [];
      if (h.ap) {
        const apagados = new Set(h.ap);
        todos = todos.filter(([x, y]) => !apagados.has(`${x},${y}`));
      }
      if (h.ti) todos.push(...h.ti);
    }
    return todos.slice(-MAX_TITILAN);
    // versionHistoria avisa cada cambio de la historia (vive en un ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionHistoria]);

  // Al soltar la goma, los destellos que quedaron sin pintura debajo se
  // anotan en su entrada de la historia: se apagan para siempre (vuelven solo
  // si se deshace esa goma). Se mira el respaldo, ya al dia tras el cambio:
  // leer la hoja la volveria mas lenta al pintar.
  const apagarBrillosBorrados = (hist) => {
    const ctx = respaldoRef.current?.getContext('2d');
    if (!ctx || !titilan.length) return;
    const ap = titilan.filter(([x, y]) => ctx.getImageData(x, y, 1, 1).data[3] === 0).map(([x, y]) => `${x},${y}`);
    if (ap.length) hist.ap = ap;
  };

  // ----- Elegir herramientas, colores y opciones -----
  // La paleta completa ("espectro") se abre desde la seccion de colores de
  // un menu y al cerrarla vuelve a ese menu; mientras, el boton de esa
  // herramienta sigue marcado como abierto (menuBase).
  const volverEspectroRef = useRef(null);
  const menuBase = menu === 'espectro' ? volverEspectroRef.current : menu;
  const alternarMenu = (nombre) => setMenu((m) => (m === nombre || (m === 'espectro' && volverEspectroRef.current === nombre) ? null : nombre));
  const abrirEspectro = () => {
    volverEspectroRef.current = menu;
    setMenu('espectro');
  };

  // Elegir cualquier herramienta (o color) apaga la mano: es para pintar.
  const usarHerramienta = (h) => {
    setMano(false);
    if (h !== 'texto') setSeleccionado(null);
    if (GRUPO_HERRAMIENTA[h] === 'lapiz') setUltimoLapiz(h);
    setHerramienta(h);
  };
  // Elegir dentro de un menu no lo cierra: ahi mismo se elige tipo, color y
  // tamaño. Se cierra al tocar la hoja, fuera o el mismo boton.
  const elegirHerramienta = (h) => {
    sonidoClic();
    usarHerramienta(h);
  };
  // Botones de lapiz, sello y varita: se activan al tocarlos y despliegan su panel.
  const tocarLapiz = () => {
    usarHerramienta(ultimoLapiz);
    alternarMenu('lapices');
  };
  const tocarSello = () => {
    usarHerramienta('sellos');
    setGrupoSello(GRUPO_DE_FORMA(formaSello));
    alternarMenu('sellos');
  };
  const tocarVarita = () => {
    usarHerramienta('brillos');
    alternarMenu('varita');
  };
  const elegirForma = (forma) => {
    sonidoClic();
    setFormaSello(forma);
    usarHerramienta('sellos');
  };
  const elegirVariante = (v) => {
    sonidoClic();
    setVarianteBrillo(v);
    usarHerramienta('brillos');
  };
  const tocarGoma = () => {
    sonidoClic();
    usarHerramienta('goma');
    alternarMenu('goma');
  };
  const elegirColor = (cid) => {
    sonidoClic();
    setColorId(cid);
    setMano(false);
    // Con un texto seleccionado, tambien se lo cambia a el.
    if (herramienta === 'texto' && seleccionado) {
      const nuevo = cid.startsWith('propio:') ? cid.slice(7).split(',').map(Number) : COLORES.find((c) => c.id === cid).rgb;
      cambiarSeleccionado({ rgb: nuevo ? [...nuevo] : null });
    }
  };
  const elegirColorPropio = (valor) => {
    const clave = valor.join(',');
    setColoresPropios((lista) => [valor, ...lista.filter((c) => c.join(',') !== clave)].slice(0, MIS_COLORES));
    elegirColor(`propio:${clave}`);
    setMenu(volverEspectroRef.current);
  };

  const punta = PUNTAS[herramienta] ?? PUNTAS.crayon;
  const escalaCursor = CURSOR / 48;
  const anchoReal = Math.max(4, tamano * (ESCALA_HERRAMIENTA[herramienta] ?? 1));
  // ----- Textos -----
  const enTexto = herramienta === 'texto' && !mano;
  // Tamaño de letra en px del lienzo para un valor de la barra de tamaño
  // (en pantalla, ~2,4 veces el valor: con el valor inicial, ~50px).
  const escalaLienzo = () => {
    const canvas = canvasRef.current;
    return canvas.width / canvas.getBoundingClientRect().width;
  };
  const tamDeBarra = (v) => Math.round(v * 2.4 * escalaLienzo());
  const textoSeleccionado = textos.find((t) => t.id === seleccionado) ?? null;

  // Registra un cambio de textos: la lista anterior va a deshacer y la nueva
  // a la historia (para repetirla). Con "fusionar", los cambios seguidos con
  // la misma clave (mover la barra de tamaño) son un solo paso.
  const cambiarTextos = (nuevos, fusionar = null) => {
    const antes = textosRef.current;
    ponerTextos(nuevos);
    const pila = deshacerRef.current;
    const previo = fusionTextoRef.current;
    if (fusionar && previo?.clave === fusionar && pila[pila.length - 1] === previo.paso) {
      previo.paso.hist.l = nuevos;
    } else {
      const hist = { t: 'textos', l: nuevos };
      const paso = { textos: antes, hist };
      pila.push(paso);
      if (pila.length > MAX_DESHACER) pila.shift();
      rehacerRef.current = [];
      setPuedeDeshacer(true);
      setPuedeRehacer(false);
      anotarEnHistoria(hist);
      fusionTextoRef.current = fusionar ? { clave: fusionar, paso } : null;
    }
    programarGuardado();
  };
  const cambiarSeleccionado = (cambios, fusionar) => {
    if (!seleccionado) return;
    cambiarTextos(textosRef.current.map((t) => (t.id === seleccionado ? { ...t, ...cambios } : t)), fusionar);
  };

  const seleccionarTexto = (t) => {
    setSeleccionado(t.id);
    // El menu muestra la letra y el tamaño de ese texto.
    setFuente(t.fuente);
    setTamano(Math.min(TAMANO_MAX, Math.max(TAMANO_MIN, Math.round(t.tam / (2.4 * escalaLienzo())))));
  };
  const abrirEdicion = (tid) => {
    const t = textosRef.current.find((x) => x.id === tid);
    if (t) setEscribiendo({ id: tid, texto: t.texto });
  };
  const confirmarEscritura = (valor) => {
    const pedido = escribiendo;
    setEscribiendo(null);
    const limpio = valor.trim();
    if (pedido.id) {
      if (!limpio) {
        cambiarTextos(textosRef.current.filter((t) => t.id !== pedido.id));
        setSeleccionado(null);
      } else {
        cambiarTextos(textosRef.current.map((t) => (t.id === pedido.id ? { ...t, texto: limpio } : t)));
      }
      return;
    }
    if (!limpio) return;
    const nuevo = {
      id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      x: pedido.x,
      y: pedido.y,
      texto: limpio,
      rgb: rgb ? [...rgb] : null,
      tam: tamDeBarra(tamano),
      fuente,
    };
    cambiarTextos([...textosRef.current, nuevo]);
    setSeleccionado(nuevo.id);
  };
  const quitarTexto = () => {
    setBorrarTexto(false);
    cambiarTextos(textosRef.current.filter((t) => t.id !== seleccionado));
    setSeleccionado(null);
  };

  // Arrastrar un texto: se mueve el nodo del SVG directo (sin re-render en
  // cada movimiento) y al soltar se anota el cambio. Un toque sin mover lo
  // selecciona; dos toques seguidos lo editan.
  const apoyarTexto = (e, t) => {
    if (!enTexto || repitiendoRef.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastreTextoRef.current = { id: t.id, pointerId: e.pointerId, inicio: punto(e), x0: t.x, y0: t.y, x: t.x, y: t.y, movido: false, nodo: e.currentTarget };
    if (seleccionado !== t.id) seleccionarTexto(t);
  };
  const moverTexto = (e) => {
    const a = arrastreTextoRef.current;
    if (!a || a.pointerId !== e.pointerId) return;
    if (pellizcoRef.current) {
      a.nodo.setAttribute('transform', `translate(${a.x0} ${a.y0})`);
      arrastreTextoRef.current = null;
      setArrastrando(false);
      return;
    }
    const p = punto(e);
    const [dx, dy] = [p.x - a.inicio.x, p.y - a.inicio.y];
    if (!a.movido && Math.hypot(dx, dy) < 10 * escalaLienzo()) return;
    if (!a.movido) setArrastrando(true);
    a.movido = true;
    const canvas = canvasRef.current;
    a.x = redondear(Math.min(canvas.width, Math.max(0, a.x0 + dx)));
    a.y = redondear(Math.min(canvas.height, Math.max(0, a.y0 + dy)));
    a.nodo.setAttribute('transform', `translate(${a.x} ${a.y})`);
  };
  const soltarTexto = (e) => {
    const a = arrastreTextoRef.current;
    if (!a || a.pointerId !== e.pointerId) return;
    arrastreTextoRef.current = null;
    setArrastrando(false);
    if (a.movido) {
      cambiarTextos(textosRef.current.map((t) => (t.id === a.id ? { ...t, x: a.x, y: a.y } : t)));
      return;
    }
    const ahora = performance.now();
    const previo = ultimoToqueTextoRef.current;
    if (previo.id === a.id && ahora - previo.t < 450) {
      ultimoToqueTextoRef.current = { id: null, t: 0 };
      abrirEdicion(a.id);
    } else {
      ultimoToqueTextoRef.current = { id: a.id, t: ahora };
    }
  };

  // Caja del texto seleccionado (recuadro y botonera), medida en el SVG.
  useLayoutEffect(() => {
    const t = textos.find((x) => x.id === seleccionado);
    const nodo = t && nodosTextoRef.current[t.id];
    if (!nodo) {
      setCajaSeleccion(null);
      return;
    }
    const bb = nodo.getBBox();
    const m = t.tam * 0.18;
    setCajaSeleccion({ x: t.x + bb.x - m, y: t.y + bb.y - m, w: bb.width + m * 2, h: bb.height + m * 2 });
  }, [seleccionado, textos]);

  // Con Texto, levantar el dedo puede abrir un dialogo justo debajo: el
  // "clic" que el navegador genera despues del toque caeria sobre el (un
  // boton "Cancelar" lo cerraba al instante). Sin ese clic.
  const anularClicTactil = (e) => {
    if (enTexto) e.preventDefault();
  };

  const elegirFuente = (fid) => {
    sonidoClic();
    setFuente(fid);
    if (enTexto && seleccionado) cambiarSeleccionado({ fuente: fid });
  };
  const tocarTexto = () => {
    usarHerramienta('texto');
    alternarMenu('texto');
  };

  // Secciones que se repiten en los menus de las herramientas.
  const seccionColores = (
    <div className="colorear-seccion">
      <div className="colorear-colores">
        {COLORES.map((c) => (
          <Gota key={c.id} rgb={c.rgb} activo={colorId === c.id} onClick={() => elegirColor(c.id)} etiqueta={c.nombre} />
        ))}
        {coloresPropios.map((valor) => {
          const cid = `propio:${valor.join(',')}`;
          return <Gota key={cid} rgb={valor} activo={colorId === cid} onClick={() => elegirColor(cid)} etiqueta="Mi color" />;
        })}
        {/* La rueda abre la paleta completa (sin boton "+": se enredaba con
            la rueda, pedido explicito). */}
        <button
          type="button"
          className="colorear-color colorear-rueda"
          onClick={abrirEspectro}
          aria-label="Elegir otro color"
          title="Elegir otro color"
        />
      </div>
    </div>
  );
  // Tamaño: solo la barra (pedido explicito: la vista previa y los atajos
  // de tamaño sobraban).
  const seccionTamano = (
    <div className="colorear-seccion">
      <span className="colorear-tamano-pista">
        <input
          type="range"
          min={TAMANO_MIN}
          max={TAMANO_MAX}
          value={tamano}
          onChange={(e) => {
            const v = Number(e.target.value);
            setTamano(v);
            if (enTexto && seleccionado) cambiarSeleccionado({ tam: tamDeBarra(v) }, `tam:${seleccionado}`);
          }}
          aria-label="Tamaño"
        />
      </span>
    </div>
  );

  const enUso = (grupo) => (!mano && GRUPO_HERRAMIENTA[herramienta] === grupo ? ' colorear-selector--en-uso' : '');
  const abierto = (nombre) => (menuBase === nombre ? ' colorear-selector--abierto' : '');

  return (
    <div className={`colorear-lienzo${repitiendo ? ' colorear-lienzo--repitiendo' : ''}`} ref={zonaRef}>
      <div className="colorear-centro">
        <div
          ref={marcoRef}
          className={`colorear-hoja${mano ? ' colorear-hoja--mano' : ''}${enTexto ? ' colorear-hoja--texto' : ''}`}
          style={caja ? { width: caja.ancho, height: caja.alto } : { visibility: 'hidden' }}
          onPointerDown={gestoApoyar}
          onPointerMove={gestoMover}
          onPointerUp={gestoSoltar}
          onPointerCancel={gestoSoltar}
        >
          {/* La hoja es un marco fijo; adentro, la "vista" es lo que se
              acerca y desplaza con la mano (transform, ver aplicarVista). */}
          <div className={`colorear-vista${repitiendo ? ' colorear-vista--repitiendo' : ''}`} ref={vistaRef}>
            <canvas
              ref={canvasRef}
              className="colorear-canvas"
              onPointerDown={alApoyar}
              onPointerMove={alMover}
              onPointerUp={alSoltar}
              onTouchEnd={anularClicTactil}
              onPointerCancel={alSoltar}
              onPointerEnter={moverCursor}
              onPointerLeave={ocultarCursor}
            />
            <canvas ref={canvasTrazoRef} className="colorear-canvas-trazo" aria-hidden="true" />
            <canvas ref={repeticionRef} className="colorear-canvas-repeticion" aria-hidden="true" />
            <img src={src} alt="" className="colorear-lamina" draggable={false} />
            {dimensiones && (
              <svg
                className={`colorear-textos${enTexto && !repitiendo ? ' colorear-textos--activos' : ''}`}
                viewBox={`0 0 ${dimensiones.ancho} ${dimensiones.alto}`}
                aria-hidden="true"
              >
                {(repitiendo ? textosRepeticion : textos).map((t) => {
                  const f = FUENTE_POR_ID[t.fuente] ?? FUENTES[0];
                  return (
                    <g
                      key={t.id}
                      className="colorear-texto"
                      transform={`translate(${t.x} ${t.y})`}
                      onPointerDown={(e) => apoyarTexto(e, t)}
                      onPointerMove={moverTexto}
                      onPointerUp={soltarTexto}
                      onPointerCancel={soltarTexto}
                      onTouchEnd={anularClicTactil}
                    >
                      <text
                        ref={(n) => {
                          if (n) nodosTextoRef.current[t.id] = n;
                          else delete nodosTextoRef.current[t.id];
                        }}
                        textAnchor="middle"
                        dominantBaseline="central"
                        xmlSpace="preserve"
                        fontFamily={f.familia}
                        fontWeight={f.peso}
                        fontSize={t.tam}
                        fill={t.rgb ? colorTexto(t.rgb) : undefined}
                        stroke="#fff"
                        strokeWidth={bordeTexto(t.tam)}
                        strokeLinejoin="round"
                        paintOrder="stroke"
                      >
                        {t.rgb ? t.texto : letrasArcoiris(t.texto).map((l, i) => (
                          // eslint-disable-next-line react/no-array-index-key
                          <tspan key={i} fill={l.color ?? 'none'}>{l.letra}</tspan>
                        ))}
                      </text>
                    </g>
                  );
                })}
                {enTexto && cajaSeleccion && !arrastrando && !repitiendo && (
                  <rect
                    className="colorear-texto-seleccion"
                    x={cajaSeleccion.x}
                    y={cajaSeleccion.y}
                    width={cajaSeleccion.w}
                    height={cajaSeleccion.h}
                    rx={Math.min(cajaSeleccion.h * 0.2, 24)}
                  />
                )}
              </svg>
            )}
            {enTexto && cajaSeleccion && !arrastrando && !repitiendo && dimensiones && (
              <div
                className={`colorear-texto-acciones${cajaSeleccion.y / dimensiones.alto < 0.12 ? ' colorear-texto-acciones--abajo' : ''}`}
                style={{
                  left: `${((cajaSeleccion.x + cajaSeleccion.w / 2) / dimensiones.ancho) * 100}%`,
                  top: `${((cajaSeleccion.y / dimensiones.alto < 0.12 ? cajaSeleccion.y + cajaSeleccion.h : cajaSeleccion.y) / dimensiones.alto) * 100}%`,
                }}
              >
                <button type="button" onClick={() => abrirEdicion(seleccionado)} aria-label="Editar texto" title="Editar texto">
                  <LuPencil />
                </button>
                <button type="button" onClick={() => setBorrarTexto(true)} aria-label="Borrar texto" title="Borrar texto">
                  <DeleteOutlined />
                </button>
              </div>
            )}
            {espejo && <span className="colorear-eje" aria-hidden="true" />}
            {dimensiones && !repitiendo && (
              <div className="colorear-titilan" aria-hidden="true">
                <svg width="0" height="0" style={{ position: 'absolute' }}>
                  <defs>
                    <radialGradient id="colorear-halo-destello">
                      <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
                      <stop offset="1" stopColor="#fff" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                </svg>
                {titilan.map(([x, y, s, color], i) => (
                  <svg
                    key={`${x}-${y}-${i}`}
                    className="colorear-titila"
                    viewBox="-6 -6 36 36"
                    style={{
                      left: `${(x / dimensiones.ancho) * 100}%`,
                      top: `${(y / dimensiones.alto) * 100}%`,
                      // x1,5: la caja del SVG suma el halo alrededor del destello.
                      width: `${((s * 1.5) / dimensiones.ancho) * 100}%`,
                      animationDelay: `${((i * 0.37) % 2.4).toFixed(2)}s`,
                      animationDuration: `${(1.6 + ((i * 0.53) % 1.2)).toFixed(2)}s`,
                    }}
                  >
                    {/* Brillo ya dibujado (un halo blanco difuso): antes era
                        un drop-shadow que se recalculaba en cada cuadro de
                        la animacion, lo mas caro de la hoja. */}
                    <circle cx="12" cy="12" r="15" fill="url(#colorear-halo-destello)" />
                    <path d={PATH_DESTELLO} fill={color} />
                  </svg>
                ))}
              </div>
            )}
            <div className="colorear-efectos" ref={efectosRef} aria-hidden="true" />
          </div>

          {!repitiendo && (
            <>
              <div className="colorear-flotantes">
                <button
                  type="button"
                  className={`colorear-flotante${espejo ? ' colorear-flotante--activo' : ''}`}
                  onClick={() => {
                    sonidoClic();
                    setEspejo((v) => !v);
                  }}
                  aria-pressed={espejo}
                  aria-label="Espejo: pinta igual en los dos lados"
                  title="Espejo"
                >
                  <LuFlipHorizontal2 />
                </button>
                <button
                  type="button"
                  className={`colorear-flotante${sonido ? '' : ' colorear-flotante--apagado'}`}
                  onClick={() => setSonido((v) => !v)}
                  aria-pressed={sonido}
                  aria-label={sonido ? 'Silenciar sonidos' : 'Activar sonidos'}
                  title={sonido ? 'Silenciar sonidos' : 'Activar sonidos'}
                >
                  {sonido ? <LuVolume2 /> : <LuVolumeX />}
                </button>
              </div>
            </>
          )}
          {zoom > 1.01 && !repitiendo && (
            <button
              type="button"
              className="colorear-zoom"
              onClick={reiniciarVista}
              aria-label="Ver la hoja completa"
              title="Ver la hoja completa"
            >
              <LuShrink />
              <span>{Math.round(zoom * 100)}%</span>
            </button>
          )}
          {repitiendo && (
            <button type="button" className="colorear-saltar" onClick={terminarRepeticion} aria-label="Saltar">
              <LuFastForward />
              <span>Saltar</span>
            </button>
          )}
        </div>

        {/* Barra: herramientas (lapiz, sello, varita, goma, mano), estilo
            (color, tamaño) y acciones. Los selectores muestran lo elegido y
            despliegan su panel; los paneles cuelgan de la barra. --en-uso
            marca la herramienta que esta pintando. */}
        <div className="colorear-barra" ref={barraRef} inert={repitiendo || undefined}>
          <div className="colorear-barra-grupo colorear-barra-grupo--herramientas">
            <button
              type="button"
              className={`colorear-selector${enUso('lapiz')}${abierto('lapices')}`}
              onClick={tocarLapiz}
              aria-haspopup="true"
              aria-expanded={menuBase === 'lapices'}
              aria-label={`Lápiz: ${NOMBRE_HERRAMIENTA[ultimoLapiz]}`}
              title="Lápices"
            >
              <span className="colorear-icono-vivo" key={ultimoLapiz}>
                <IconoHerramienta herramienta={ultimoLapiz} color={colorIcono} size={44} />
              </span>
            </button>
            <button
              type="button"
              className={`colorear-selector${enUso('sello')}${abierto('sellos')}`}
              onClick={tocarSello}
              aria-haspopup="true"
              aria-expanded={menuBase === 'sellos'}
              aria-label={`Sello: ${NOMBRE_FORMA[formaSello]}`}
              title="Sellos"
            >
              <span className="colorear-icono-vivo" key={formaSello}>
                <IconoSello forma={formaSello} rgb={rgb} size={40} />
              </span>
            </button>
            <button
              type="button"
              className={`colorear-selector${enUso('varita')}${abierto('varita')}`}
              onClick={tocarVarita}
              aria-haspopup="true"
              aria-expanded={menuBase === 'varita'}
              aria-label={`Varita mágica: ${variante.nombre}`}
              title="Varita mágica"
            >
              <span className="colorear-icono-vivo" key={varianteBrillo}>
                <IconoHerramienta herramienta="brillos" color={colorVarita} size={44} />
              </span>
            </button>
            <button
              type="button"
              className={`colorear-selector${enTexto ? ' colorear-selector--en-uso' : ''}${abierto('texto')}`}
              onClick={tocarTexto}
              aria-haspopup="true"
              aria-expanded={menuBase === 'texto'}
              aria-label="Texto"
              title="Texto"
            >
              <span className={`colorear-selector-texto${rgb ? '' : ' colorear-selector-texto--arcoiris'}`} style={rgb ? { color: css(rgb) } : undefined}>
                {!rgb && (
                  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
                    <defs>
                      <linearGradient id="colorear-texto-arcoiris" x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0" stopColor="#E53935" />
                        <stop offset="0.35" stopColor="#FDD835" />
                        <stop offset="0.65" stopColor="#43A047" />
                        <stop offset="1" stopColor="#1E88E5" />
                      </linearGradient>
                    </defs>
                  </svg>
                )}
                <LuType />
              </span>
            </button>
            <button
              type="button"
              className={`colorear-selector${enUso('goma')}${abierto('goma')}`}
              onClick={tocarGoma}
              aria-haspopup="true"
              aria-expanded={menuBase === 'goma'}
              aria-label="Goma"
              title="Goma"
            >
              <IconoHerramienta herramienta="goma" color={colorIcono} size={44} />
            </button>
            <button
              type="button"
              className={`colorear-selector colorear-selector--simple colorear-selector--mano${mano ? ' colorear-selector--en-uso' : ''}`}
              onClick={alternarMano}
              aria-pressed={mano}
              aria-label="Mano: acercar y mover la hoja"
              title="Mano: acercar y mover la hoja"
            >
              <LuHand />
            </button>
          </div>

          <div className="colorear-barra-grupo colorear-barra-grupo--separado colorear-barra-grupo--acciones">
            <button type="button" className="colorear-accion" onClick={deshacer} disabled={!puedeDeshacer} aria-label="Deshacer" title="Deshacer">
              <LuUndo2 />
            </button>
            <button type="button" className="colorear-accion" onClick={rehacer} disabled={!puedeRehacer} aria-label="Rehacer" title="Rehacer">
              <LuRedo2 />
            </button>
            <button
              type="button"
              className={`colorear-accion${menu === 'mas' ? ' colorear-accion--abierta' : ''}`}
              onClick={() => alternarMenu('mas')}
              aria-haspopup="true"
              aria-expanded={menu === 'mas'}
              aria-label="Más opciones"
              title="Más opciones"
            >
              <LuEllipsis />
            </button>
          </div>

          {/* "Más": las acciones de menos uso, con su nombre (el niño no lee
              iconos sueltos). Guardar imagen usa el ultimo marco elegido. */}
          {menu === 'mas' && (
            <div className="colorear-desplegable colorear-desplegable--mas" role="menu" aria-label="Más opciones">
              <div className="colorear-mas">
                {[
                  ['Ver cómo lo pinté', <LuPlay key="i" />, () => setDialogo('repetir'), !sePuedeRepetir],
                  ['Guardar imagen', <LuDownload key="i" />, guardarImagen, false],
                  ['Imprimir o guardar', <PrinterOutlined key="i" />, () => setDialogo('imprimir'), false],
                  ['Borrar todo', <DeleteOutlined key="i" />, () => setConfirmarBorrar(true), false],
                ].map(([nombre, icono, accion, apagado]) => (
                  <button
                    type="button"
                    key={nombre}
                    role="menuitem"
                    className="colorear-util colorear-mas-opcion"
                    disabled={apagado}
                    onClick={() => {
                      setMenu(null);
                      accion();
                    }}
                    aria-label={nombre}
                  >
                    <span className="colorear-mas-icono">{icono}</span>
                    <span className="colorear-util-nombre">{nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {menu === 'lapices' && (
            <div className="colorear-desplegable colorear-desplegable--lapices" role="menu" aria-label="Lápices">
              <div className="colorear-lapices">
                {LAPICES.map((h) => (
                  <button
                    type="button"
                    key={h.id}
                    role="menuitemradio"
                    aria-checked={herramienta === h.id}
                    className={`colorear-util${herramienta === h.id ? ' colorear-util--activo' : ''}`}
                    onClick={() => elegirHerramienta(h.id)}
                  >
                    <IconoHerramienta herramienta={h.id} color={colorIcono} size={48} />
                    <span className="colorear-util-nombre">{h.nombre}</span>
                  </button>
                ))}
              </div>
              {seccionColores}
              {seccionTamano}
            </div>
          )}

          {menu === 'sellos' && (
            <div className="colorear-desplegable colorear-desplegable--sellos" role="menu" aria-label="Sellos">
              <div className="colorear-pestanas" role="tablist">
                {GRUPOS_SELLO.map((g) => (
                  <button
                    type="button"
                    key={g.id}
                    role="tab"
                    aria-selected={grupoSello === g.id}
                    className={`colorear-pestana${grupoSello === g.id ? ' colorear-pestana--activa' : ''}`}
                    onClick={() => setGrupoSello(g.id)}
                  >
                    {g.nombre}
                  </button>
                ))}
              </div>
              <div className="colorear-lapices">
                {[`surtido:${grupoSello}`, ...FORMAS_SELLO.filter((f) => f.grupo === grupoSello).map((f) => f.id)].map((forma) => (
                  <button
                    type="button"
                    key={forma}
                    role="menuitemradio"
                    aria-checked={formaSello === forma}
                    className={`colorear-util${formaSello === forma ? ' colorear-util--activo' : ''}`}
                    onClick={() => elegirForma(forma)}
                  >
                    <IconoSello forma={forma} rgb={rgb} size={44} />
                    <span className="colorear-util-nombre">{NOMBRE_FORMA[forma]}</span>
                  </button>
                ))}
              </div>
              {seccionColores}
              {seccionTamano}
            </div>
          )}

          {menu === 'varita' && (
            <div className="colorear-desplegable colorear-desplegable--varita" role="menu" aria-label="Varita mágica">
              <div className="colorear-lapices">
                {VARIANTES_BRILLO.map((v) => (
                  <button
                    type="button"
                    key={v.id}
                    role="menuitemradio"
                    aria-checked={varianteBrillo === v.id}
                    className={`colorear-util${varianteBrillo === v.id ? ' colorear-util--activo' : ''}`}
                    onClick={() => elegirVariante(v.id)}
                  >
                    <MuestraPolvo variante={v.id} rgb={rgb} size={46} />
                    <span className="colorear-util-nombre">{v.nombre}</span>
                  </button>
                ))}
              </div>
              {/* Mágico, Corazoncitos y Estrellitas usan el color elegido. */}
              {seccionColores}
              {seccionTamano}
            </div>
          )}

          {menu === 'texto' && (
            <div className="colorear-desplegable colorear-desplegable--texto" role="menu" aria-label="Texto">
              <div className="colorear-fuentes">
                {FUENTES.map((f) => {
                  const activa = (textoSeleccionado?.fuente ?? fuente) === f.id;
                  return (
                    <button
                      type="button"
                      key={f.id}
                      role="menuitemradio"
                      aria-checked={activa}
                      className={`colorear-util colorear-fuente${activa ? ' colorear-util--activo' : ''}`}
                      onClick={() => elegirFuente(f.id)}
                      aria-label={`Letra ${f.nombre}`}
                    >
                      <span className="colorear-fuente-muestra" style={{ fontFamily: f.familia, fontWeight: f.peso }}>Abc</span>
                      <span className="colorear-util-nombre">{f.nombre}</span>
                    </button>
                  );
                })}
              </div>
              {seccionColores}
              {seccionTamano}
            </div>
          )}

          {menu === 'goma' && (
            <div className="colorear-desplegable colorear-desplegable--goma" role="menu" aria-label="Goma">
              {seccionTamano}
            </div>
          )}

          {menu === 'espectro' && (
            <div className="colorear-desplegable colorear-desplegable--espectro" role="menu" aria-label="Más colores">
              <div className="colorear-desplegable-titulo">
                <button type="button" className="colorear-desplegable-volver" onClick={() => setMenu(volverEspectroRef.current)} aria-label="Volver a los colores">
                  <LeftOutlined />
                </button>
                <span>Elige un color</span>
              </div>
              <div className="colorear-espectro">
                {ESPECTRO.map((valor) => {
                  const clave = valor.join(',');
                  const activo = colorId === `propio:${clave}`;
                  return (
                    <button
                      type="button"
                      key={clave}
                      className={`colorear-espectro-celda${activo ? ' colorear-espectro-celda--activo' : ''}`}
                      style={{ background: css(valor) }}
                      onClick={() => elegirColorPropio(valor)}
                      aria-label="Elegir este color"
                    />
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="colorear-cursor" ref={cursorRef} aria-hidden="true">
        <span
          className={`colorear-cursor-anillo${esGoma ? ' colorear-cursor-anillo--goma' : ''}`}
          style={{ width: anchoReal, height: anchoReal }}
        />
        <span
          className="colorear-cursor-icono"
          style={{ left: -punta.x * escalaCursor, top: -punta.y * escalaCursor }}
        >
          {herramienta !== 'texto' && (
            <IconoHerramienta herramienta={herramienta} color={herramienta === 'brillos' ? colorVarita : colorIcono} size={CURSOR} />
          )}
        </span>
      </div>


      {escribiendo && (
        <DialogoTexto
          inicial={escribiendo.texto}
          editando={Boolean(escribiendo.id)}
          onListo={confirmarEscritura}
          onCancelar={() => setEscribiendo(null)}
        />
      )}

      {borrarTexto && (
        <ConfirmarBorrado
          titulo="¿Borrar este texto?"
          texto="Se quita el texto de la hoja."
          onCancelar={() => setBorrarTexto(false)}
          onConfirmar={quitarTexto}
        />
      )}

      {confirmarBorrar && (
        <ConfirmarBorrado
          titulo="¿Borrar todo el dibujo?"
          texto="Se borra todo lo que pintaste en esta lámina."
          miniatura={miniaturaDialogo}
          onCancelar={() => setConfirmarBorrar(false)}
          onConfirmar={borrarTodo}
        />
      )}

      {dialogo === 'repetir' && (
        <Dialogo etiqueta="¿Vemos cómo lo pintaste?" onCerrar={() => setDialogo(null)} className="colorear-dialogo--repetir">
          {miniaturaDialogo && <img src={miniaturaDialogo} alt="" className="colorear-dialogo-miniatura colorear-dialogo-miniatura--grande" />}
          <h3>¿Vemos cómo lo pintaste?</h3>
          <div className="colorear-dialogo-botones">
            <button type="button" className="colorear-dialogo-btn" onClick={() => setDialogo(null)} autoFocus>
              Ahora no
            </button>
            <button type="button" className="colorear-dialogo-btn colorear-dialogo-btn--principal" onClick={repetir}>
              <LuPlay /> Sí, ver
            </button>
          </div>
        </Dialogo>
      )}

      {dialogo === 'imprimir' && (
        <Dialogo etiqueta="Imprimir o guardar" onCerrar={() => setDialogo(null)} className="colorear-dialogo--imprimir">
          <h3>Elige un marco</h3>
          <div className="colorear-marcos" role="radiogroup" aria-label="Marco">
            {MARCOS.map((m) => (
              <button
                type="button"
                key={m.id}
                role="radio"
                aria-checked={marco === m.id}
                className={`colorear-marco${marco === m.id ? ' colorear-marco--activo' : ''}`}
                onClick={() => setMarco(m.id)}
              >
                <span className="colorear-marco-vista">
                  {vistasMarcos[m.id] && <img src={vistasMarcos[m.id]} alt="" />}
                </span>
                <span className="colorear-util-nombre">{m.nombre}</span>
              </button>
            ))}
          </div>
          <div className="colorear-dialogo-botones">
            <button type="button" className="colorear-dialogo-btn" onClick={guardarImagen}>
              <LuDownload /> Guardar imagen
            </button>
            <button type="button" className="colorear-dialogo-btn colorear-dialogo-btn--principal" onClick={imprimirConMarco}>
              <PrinterOutlined /> Imprimir
            </button>
          </div>
        </Dialogo>
      )}
    </div>
  );
}

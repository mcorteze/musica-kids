import { useCallback, useEffect, useRef, useState } from 'react';
import { DeleteOutlined, LeftOutlined, PrinterOutlined } from '@ant-design/icons';
// Flechas en gancho para deshacer/rehacer: la flecha circular de antd
// (UndoOutlined) se confundia con "recargar" (pedido explicito).
import { LuBrush, LuHand, LuRedo2, LuShrink, LuUndo2 } from 'react-icons/lu';
import { borrarDibujo, guardarDibujo, leerDibujo, VIGENCIA_MS } from '../utils/dibujosColorear';
import {
  COLORES,
  ESPECTRO,
  FORMAS_SELLO,
  HERRAMIENTAS,
  capaDe,
  css,
  empezarTrazo,
  fundirCapa,
  pintarTramo,
} from '../utils/pincelesColorear';
import IconoHerramienta, { IconoSello, PUNTAS } from './ColorearIconos';
import './ColorearJuego.css';

// ========== COLOREAR (pintar a mano sobre las laminas de Imprimir) ==========
// Pedido explicito: trazo libre, sin balde ni cierre de bordes. Capas, de
// abajo hacia arriba: el <canvas> de color; un <canvas> de "trazo en curso"
// (acuarela, destacador y neon, que se funden al soltar); y la lamina
// original con mix-blend-mode: multiply — el blanco deja ver el color y la
// linea negra queda SIEMPRE encima, nunca se tapa al pintar.
// Herramientas y colores: utils/pincelesColorear.js. Dibujos de las
// herramientas (barra, paneles y cursor): ColorearIconos.jsx.
// Lo pintado se guarda solo en el dispositivo (utils/dibujosColorear.js) y
// se borra a las 48 h de empezado.
//
// Distribucion (pedido explicito, patron de las apps de dibujo): UNA barra
// compacta con tres selectores que muestran lo elegido — lapiz, color y
// tamaño — mas deshacer/rehacer/borrar/imprimir. Cada selector despliega su
// panel encima de la hoja y se retrae al elegir, al tocar fuera o al tocar
// el mismo boton. Asi la hoja usa todo el resto de la pantalla. Barra a la
// izquierda en horizontal, abajo en vertical. Lo destructivo (borrar todo,
// borrar un dibujo guardado) siempre pide confirmacion en un dialogo.

// Tamaño en px de pantalla (cada herramienta lo ajusta con su escala).
const TAMANO_MIN = 6;
const TAMANO_MAX = 60;
const TAMANO_INICIAL = 22;
const TAMANOS_RAPIDOS = [8, 16, 26, 40, 56];

// Resolucion interna del lienzo: lado largo fijo, sin importar el tamaño de
// la lamina (las hay de 236 px y de 2048 px). Alcanza para imprimir y no
// pesa demasiado en tablets (cada paso de deshacer guarda el lienzo entero).
const LADO_LARGO = 1200;
const MAX_DESHACER = 12;
const MINIATURA = 320;
const ESPERA_GUARDADO_MS = 800;
// Igual al gap de .colorear-centro en ColorearJuego.css.
const SEPARACION = 14;
// Tamaño del dibujo de la herramienta que hace de cursor (laptop).
const CURSOR = 44;
// Zoom de la hoja (mano y rueda del mouse): de la hoja entera a 5x.
const ZOOM_MAX = 5;
// Doble toque con la mano: acerca a esto (o vuelve a la hoja entera).
const ZOOM_TOQUE = 2.5;
const VISTA_INICIAL = { x: 0, y: 0, s: 1 };

const ESCALA_HERRAMIENTA = Object.fromEntries(HERRAMIENTAS.map((h) => [h.id, h.escala]));
const NOMBRE_HERRAMIENTA = Object.fromEntries(HERRAMIENTAS.map((h) => [h.id, h.nombre]));
const GRUPO_HERRAMIENTA = Object.fromEntries(HERRAMIENTAS.map((h) => [h.id, h.grupo]));
// Panel de lapices: sin sello ni goma (tienen boton propio en la barra).
const LAPICES = HERRAMIENTAS.filter((h) => h.grupo === 'lapiz');
const NOMBRE_FORMA = { surtido: 'Surtido', ...Object.fromEntries(FORMAS_SELLO.map((f) => [f.id, f.nombre])) };

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

// Lamina + color en una sola imagen (para la miniatura y para imprimir).
function componer(capa, lamina, ancho, alto) {
  const c = document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(capa, 0, 0, ancho, alto);
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(lamina, 0, 0, ancho, alto);
  return c;
}

// Texto para quien cuida al niño en "Mis dibujos": cuanto le queda.
function textoVence(creado) {
  const horas = Math.max(0, Math.ceil((creado + VIGENCIA_MS - Date.now()) / 3600000));
  if (horas <= 1) return 'Se borra en menos de 1 hora';
  if (horas < 24) return `Se borra en ${horas} horas`;
  return horas < 48 ? 'Se borra mañana' : 'Se borra en 2 días';
}

export function imprimirDibujo(capaBlob, src, imprimir) {
  Promise.all([cargarImagen(src), capaBlob ? createImageBitmap(capaBlob) : null]).then(([lamina, capa]) => {
    const escala = LADO_LARGO / Math.max(lamina.naturalWidth, lamina.naturalHeight);
    const ancho = Math.round(lamina.naturalWidth * escala);
    const alto = Math.round(lamina.naturalHeight * escala);
    const vacio = document.createElement('canvas');
    const final = componer(capa ?? vacio, lamina, ancho, alto);
    final.toBlob((blob) => imprimir(URL.createObjectURL(blob)), 'image/png');
  });
}

// ---------- Dialogo de confirmacion (mismo overlay y tarjeta que "Elige un
// nivel" de los otros juegos) ----------
function ConfirmarBorrado({ titulo, texto, miniatura, onConfirmar, onCancelar }) {
  useEffect(() => {
    const escape = (e) => {
      if (e.key === 'Escape') onCancelar();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onCancelar]);
  return (
    <div className="memory-victoria-overlay colorear-dialogo-overlay" onClick={onCancelar}>
      <div
        className="memory-niveles-modal colorear-dialogo"
        role="alertdialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
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
      </div>
    </div>
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
export function MisDibujos({ dibujos, miniaturas, onElegir, onImprimir, onBorrar, onCapaAbierta }) {
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
            <span className="colorear-mio-vence">{textoVence(d.creado)}</span>
            <div className="colorear-mio-acciones">
              <button type="button" className="colorear-accion" onClick={() => onImprimir(d)} aria-label="Imprimir">
                <PrinterOutlined />
              </button>
              <button type="button" className="colorear-accion" onClick={() => setPorBorrar(d.id)} aria-label="Borrar">
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

// ---------- Lienzo ----------
export default function ColorearLienzo({ id, src, onGuardado, onImprimir, onCapaAbierta }) {
  const zonaRef = useRef(null);
  const barraRef = useRef(null);
  const cursorRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasTrazoRef = useRef(null);
  // Copia propia del canvas: al desmontar, React suelta canvasRef ANTES de
  // la limpieza de los efectos, y ahi se guarda lo ultimo pintado.
  const capaRef = useRef(null);
  const laminaRef = useRef(null);
  const onGuardadoRef = useRef(onGuardado);
  onGuardadoRef.current = onGuardado;
  const trazoRef = useRef(null);
  const deshacerRef = useRef([]);
  // Lo deshecho, para rehacerlo. Se vacia con cualquier cambio nuevo.
  const rehacerRef = useRef([]);
  const temporizadorRef = useRef(null);
  const pendienteRef = useRef(false);
  const [dimensiones, setDimensiones] = useState(null);
  const [caja, setCaja] = useState(null);
  const [herramienta, setHerramienta] = useState('crayon');
  // Ultimo lapiz elegido (lo muestra su boton aunque se este usando el
  // sello o la goma) y forma del sello ('surtido' = va alternando todas).
  const [ultimoLapiz, setUltimoLapiz] = useState('crayon');
  const [formaSello, setFormaSello] = useState('surtido');
  // colorId: uno de COLORES o 'propio' (elegido en "Mas colores").
  const [colorId, setColorId] = useState('rojo');
  const [colorPropio, setColorPropio] = useState(null);
  const [tamano, setTamano] = useState(TAMANO_INICIAL);
  const [puedeDeshacer, setPuedeDeshacer] = useState(false);
  const [puedeRehacer, setPuedeRehacer] = useState(false);
  // Panel desplegado de la barra: 'lapices' | 'sellos' | 'colores' | 'espectro' | 'tamano' | null.
  const [menu, setMenu] = useState(null);
  // Toque en la hoja que solo retrajo un panel: no debe pintar. (React
  // puede re-renderizar entre el listener que cierra y el del canvas, asi
  // que no basta con mirar "menu").
  const ignorarToqueRef = useRef(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [miniaturaBorrar, setMiniaturaBorrar] = useState(null);
  // Mano: con ella activa la hoja se acerca (pellizco) y se desplaza (arrastre).
  const [mano, setMano] = useState(false);
  const [zoom, setZoom] = useState(1);
  const marcoRef = useRef(null);
  const vistaRef = useRef(null);

  // Con un panel o el dialogo abierto, el Escape del drawer no cierra todo
  // (lo cierra este componente).
  useEffect(() => {
    onCapaAbierta?.(Boolean(menu || confirmarBorrar));
    return () => onCapaAbierta?.(false);
  }, [menu, confirmarBorrar, onCapaAbierta]);

  const esGoma = herramienta === 'goma';
  const rgb = colorId === 'propio' ? colorPropio : COLORES.find((c) => c.id === colorId).rgb;
  // Color con que se dibujan los iconos, la muestra y el cursor.
  const colorIcono = rgb ? css(rgb) : 'arcoiris';

  // Lamina + lo guardado (si hay) al entrar.
  useEffect(() => {
    let vivo = true;
    Promise.all([cargarImagen(src), leerDibujo(id)]).then(async ([lamina, guardado]) => {
      if (!vivo) return;
      laminaRef.current = lamina;
      const escala = LADO_LARGO / Math.max(lamina.naturalWidth, lamina.naturalHeight);
      const ancho = Math.round(lamina.naturalWidth * escala);
      const alto = Math.round(lamina.naturalHeight * escala);
      const canvas = canvasRef.current;
      canvas.width = ancho;
      canvas.height = alto;
      canvasTrazoRef.current.width = ancho;
      canvasTrazoRef.current.height = alto;
      capaRef.current = canvas;
      if (guardado?.capa) {
        const capa = await createImageBitmap(guardado.capa);
        if (!vivo) return;
        canvas.getContext('2d').drawImage(capa, 0, 0, ancho, alto);
      }
      setDimensiones({ ancho, alto });
    });
    return () => {
      vivo = false;
    };
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
    const mini = componer(canvas, lamina, Math.round(canvas.width * escala), Math.round(canvas.height * escala));
    const [capa, miniatura] = await Promise.all([aBlob(canvas, 'image/png'), aBlob(mini, 'image/jpeg', 0.82)]);
    await guardarDibujo(id, capa, miniatura);
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

  // Miniatura del dialogo de "Borrar todo": lo que se va a borrar.
  useEffect(() => {
    if (!confirmarBorrar || !laminaRef.current) return undefined;
    const canvas = canvasRef.current;
    const escala = MINIATURA / Math.max(canvas.width, canvas.height);
    const mini = componer(canvas, laminaRef.current, Math.round(canvas.width * escala), Math.round(canvas.height * escala));
    let url = null;
    mini.toBlob((blob) => {
      url = URL.createObjectURL(blob);
      setMiniaturaBorrar(url);
    }, 'image/jpeg', 0.85);
    return () => {
      if (url) URL.revokeObjectURL(url);
      setMiniaturaBorrar(null);
    };
  }, [confirmarBorrar]);

  const fotoLienzo = () => {
    const canvas = canvasRef.current;
    return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  };

  // Antes de cada cambio nuevo (trazo o borrar todo): guarda el estado para
  // deshacer y descarta lo que habia para rehacer.
  const recordarParaDeshacer = () => {
    const pila = deshacerRef.current;
    pila.push(fotoLienzo());
    if (pila.length > MAX_DESHACER) pila.shift();
    rehacerRef.current = [];
    setPuedeDeshacer(true);
    setPuedeRehacer(false);
  };

  const punto = (e) => {
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvas.width,
      y: ((e.clientY - r.top) / r.height) * canvas.height,
    };
  };

  // ----- Cursor de laptop: la herramienta dibujada con el color + un anillo
  // del ancho real del trazo. Solo con mouse (en tactil no hay cursor). Se
  // mueve por estilo directo, sin re-render en cada movimiento.
  const moverCursor = (e) => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    // Con la mano, el cursor es la mano del sistema (grab/grabbing en CSS).
    if (e.pointerType !== 'mouse' || mano) {
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

  // ----- Zoom y desplazamiento de la hoja -----
  // La vista se mueve con transform: translate(x, y) scale(s), origen
  // arriba-izquierda, por estilo directo y una vez por cuadro (rAF), sin
  // re-render: "zoom" (estado, el boton de porcentaje) se actualiza recien al
  // terminar el gesto. Con un re-render por movimiento el zoom se sentia
  // pesado (pedido explicito). punto() usa el rectangulo ya transformado del
  // canvas, asi que pintar con zoom cae donde corresponde, y el grosor sigue
  // igual EN PANTALLA (mas fino sobre la lamina: sirve para los detalles).
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
    if (vistaRef.current) vistaRef.current.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.s})`;
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

  useEffect(() => () => {
    cancelAnimationFrame(cuadroRef.current);
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
    if (actual.capa) {
      const capa = canvasTrazoRef.current;
      capa.getContext('2d').clearRect(0, 0, capa.width, capa.height);
    }
    const antes = deshacerRef.current.pop();
    if (antes) canvasRef.current.getContext('2d').putImageData(antes, 0, 0);
    setPuedeDeshacer(deshacerRef.current.length > 0);
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
    if (e.target.closest('button')) return;
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
    setMenu(null);
    setMano((m) => !m);
    ocultarCursor();
  };

  const alApoyar = (e) => {
    // Con la mano o durante un pellizco, la hoja se mueve (gestoApoyar en
    // el marco), no se pinta.
    if (mano || pellizcoRef.current) return;
    // Con un panel abierto, tocar la hoja solo lo retrae (lo cierra el
    // listener de "tocar fuera"); no se pinta.
    if (ignorarToqueRef.current) {
      ignorarToqueRef.current = false;
      return;
    }
    // Un solo dedo a la vez: un segundo dedo no mancha.
    if (trazoRef.current !== null || !dimensiones) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    recordarParaDeshacer();
    const canvas = canvasRef.current;
    const escala = canvas.width / canvas.getBoundingClientRect().width;
    const trazo = empezarTrazo(herramienta, rgb, tamano * escala, formaSello);
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
    trazoRef.current = { pointerId: e.pointerId, ultimo: p, trazo, destino, capa };
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
    }
  };

  const alSoltar = (e) => {
    const actual = trazoRef.current;
    if (!actual || actual.pointerId !== e.pointerId) return;
    trazoRef.current = null;
    if (actual.capa) fundirCapa(canvasRef.current.getContext('2d'), canvasTrazoRef.current, actual.trazo.herramienta);
    programarGuardado();
  };

  // Mueve un paso entre las dos pilas: lo que sale de "desde" se pinta y el
  // estado actual pasa a "hacia".
  const moverPaso = (desde, hacia) => {
    const estado = desde.current.pop();
    if (!estado) return;
    hacia.current.push(fotoLienzo());
    if (hacia.current.length > MAX_DESHACER) hacia.current.shift();
    canvasRef.current.getContext('2d').putImageData(estado, 0, 0);
    setPuedeDeshacer(deshacerRef.current.length > 0);
    setPuedeRehacer(rehacerRef.current.length > 0);
    programarGuardado();
  };
  const deshacer = () => moverPaso(deshacerRef, rehacerRef);
  const rehacer = () => moverPaso(rehacerRef, deshacerRef);

  const borrarTodo = async () => {
    setConfirmarBorrar(false);
    recordarParaDeshacer();
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    clearTimeout(temporizadorRef.current);
    pendienteRef.current = false;
    await borrarDibujo(id);
    onGuardadoRef.current?.();
  };

  const imprimir = () => {
    const canvas = canvasRef.current;
    const lamina = laminaRef.current;
    if (!lamina) return;
    componer(canvas, lamina, canvas.width, canvas.height)
      .toBlob((blob) => onImprimir(URL.createObjectURL(blob)), 'image/png');
  };

  const alternarMenu = (nombre) => setMenu((m) => (m === nombre || (nombre === 'colores' && m === 'espectro') ? null : nombre));

  // Ultima herramienta de pintar (lapiz o sello): a ella vuelve la goma al
  // tocarla de nuevo o al elegir un color (la goma no usa color).
  const ultimaPintarRef = useRef('crayon');
  // Elegir cualquier herramienta (o color) apaga la mano: es para pintar.
  const usarHerramienta = (h) => {
    setMano(false);
    if (h !== 'goma') ultimaPintarRef.current = h;
    if (GRUPO_HERRAMIENTA[h] === 'lapiz') setUltimoLapiz(h);
    setHerramienta(h);
  };
  const elegirHerramienta = (h) => {
    usarHerramienta(h);
    setMenu(null);
  };
  // Botones de lapiz y sello: se activan al tocarlos y despliegan su panel.
  const tocarLapiz = () => {
    usarHerramienta(ultimoLapiz);
    alternarMenu('lapices');
  };
  const tocarSello = () => {
    usarHerramienta('sellos');
    alternarMenu('sellos');
  };
  const elegirForma = (forma) => {
    setFormaSello(forma);
    usarHerramienta('sellos');
    setMenu(null);
  };
  const alternarGoma = () => {
    setMenu(null);
    usarHerramienta(esGoma ? ultimaPintarRef.current : 'goma');
  };
  const elegirColor = (cid) => {
    setColorId(cid);
    setMano(false);
    if (esGoma) usarHerramienta(ultimaPintarRef.current);
    setMenu(null);
  };
  const elegirColorPropio = (valor) => {
    setColorPropio(valor);
    elegirColor('propio');
  };

  const punta = PUNTAS[herramienta];
  const escalaCursor = CURSOR / 48;
  const anchoReal = Math.max(4, tamano * (ESCALA_HERRAMIENTA[herramienta] ?? 1));
  const colorMuestra = esGoma ? '#F48FB1' : rgb ? css(rgb) : null;
  // Trazo marcado en el icono del selector de tamaño: fino, medio o grueso.
  const nivelGrosor = tamano <= 16 ? 0 : tamano <= 34 ? 1 : 2;
  const muestra = (diametro) => (
    <span
      className={`colorear-muestra${colorMuestra ? '' : ' colorear-arcoiris'}`}
      style={{ width: diametro, height: diametro, ...(colorMuestra && { background: colorMuestra }) }}
    />
  );

  return (
    <div className="colorear-lienzo" ref={zonaRef}>
      <div className="colorear-centro">
        <div
          ref={marcoRef}
          className={`colorear-hoja${mano ? ' colorear-hoja--mano' : ''}`}
          style={caja ? { width: caja.ancho, height: caja.alto } : { visibility: 'hidden' }}
          onPointerDown={gestoApoyar}
          onPointerMove={gestoMover}
          onPointerUp={gestoSoltar}
          onPointerCancel={gestoSoltar}
        >
          {/* La hoja es un marco fijo; adentro, la "vista" es lo que se
              acerca y desplaza con la mano (transform, ver aplicarVista). */}
          <div className="colorear-vista" ref={vistaRef}>
            <canvas
              ref={canvasRef}
              className="colorear-canvas"
              onPointerDown={alApoyar}
              onPointerMove={alMover}
              onPointerUp={alSoltar}
              onPointerCancel={alSoltar}
              onPointerEnter={moverCursor}
              onPointerLeave={ocultarCursor}
            />
            <canvas ref={canvasTrazoRef} className="colorear-canvas-trazo" aria-hidden="true" />
            <img src={src} alt="" className="colorear-lamina" draggable={false} />
          </div>
          {zoom > 1.01 && (
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
        </div>

        {/* Barra: herramientas (lapiz, sello, goma), estilo (color,
            tamaño) y acciones. Lapiz, sello, color y tamaño muestran lo
            elegido y despliegan su panel; los paneles cuelgan de la barra.
            --en-uso marca cual de las tres herramientas esta pintando. */}
        <div className="colorear-barra" ref={barraRef}>
          <div className="colorear-barra-grupo">
            <button
              type="button"
              className={`colorear-selector${!mano && GRUPO_HERRAMIENTA[herramienta] === 'lapiz' ? ' colorear-selector--en-uso' : ''}${menu === 'lapices' ? ' colorear-selector--abierto' : ''}`}
              onClick={tocarLapiz}
              aria-haspopup="true"
              aria-expanded={menu === 'lapices'}
              aria-label={`Lápiz: ${NOMBRE_HERRAMIENTA[ultimoLapiz]}`}
              title="Lápices"
            >
              <IconoHerramienta herramienta={ultimoLapiz} color={colorIcono} size={44} />
            </button>
            <button
              type="button"
              className={`colorear-selector${!mano && herramienta === 'sellos' ? ' colorear-selector--en-uso' : ''}${menu === 'sellos' ? ' colorear-selector--abierto' : ''}`}
              onClick={tocarSello}
              aria-haspopup="true"
              aria-expanded={menu === 'sellos'}
              aria-label={`Sello: ${NOMBRE_FORMA[formaSello]}`}
              title="Sellos"
            >
              <IconoSello forma={formaSello} color={colorIcono} size={38} />
            </button>
            <button
              type="button"
              className={`colorear-selector colorear-selector--simple${!mano && esGoma ? ' colorear-selector--en-uso' : ''}`}
              onClick={alternarGoma}
              aria-pressed={!mano && esGoma}
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

          <div className="colorear-barra-grupo colorear-barra-grupo--separado">
            <button
              type="button"
              className={`colorear-selector${menu === 'colores' || menu === 'espectro' ? ' colorear-selector--abierto' : ''}`}
              onClick={() => alternarMenu('colores')}
              aria-haspopup="true"
              aria-expanded={menu === 'colores' || menu === 'espectro'}
              aria-label="Color"
              title="Elegir color"
            >
              <span
                className={`colorear-selector-gota${rgb ? '' : ' colorear-arcoiris'}`}
                style={rgb ? { '--gota': css(rgb) } : undefined}
              />
            </button>
            <button
              type="button"
              className={`colorear-selector${menu === 'tamano' ? ' colorear-selector--abierto' : ''}`}
              onClick={() => alternarMenu('tamano')}
              aria-haspopup="true"
              aria-expanded={menu === 'tamano'}
              aria-label="Tamaño"
              title="Elegir tamaño"
            >
              {/* Icono de grosor de linea (patron de las apps de dibujo):
                  tres trazos de fino a grueso; el del tamaño actual va en
                  el color elegido. Un circulo solo se confundia con el
                  selector de color (pedido explicito). */}
              <svg width="40" height="34" viewBox="0 0 40 34" aria-hidden="true" focusable="false">
                {(rgb || esGoma) ? null : (
                  <defs>
                    {/* userSpaceOnUse: en una linea horizontal la caja tiene
                        alto 0 y el degradado relativo no se pinta. */}
                    <linearGradient id="colorear-grosor-arcoiris" gradientUnits="userSpaceOnUse" x1="5" x2="35" y1="0" y2="0">
                      <stop offset="0" stopColor="#E53935" />
                      <stop offset="0.33" stopColor="#FDD835" />
                      <stop offset="0.66" stopColor="#43A047" />
                      <stop offset="1" stopColor="#1E88E5" />
                    </linearGradient>
                  </defs>
                )}
                {[[6, 2.5], [16, 5.5], [27, 9]].map(([y, grosor], i) => (
                  <line
                    key={y}
                    x1="5"
                    x2="35"
                    y1={y}
                    y2={y}
                    strokeWidth={grosor}
                    strokeLinecap="round"
                    stroke={i === nivelGrosor ? (colorMuestra ?? 'url(#colorear-grosor-arcoiris)') : '#B5C3D0'}
                  />
                ))}
              </svg>
            </button>
          </div>

          <div className="colorear-barra-grupo colorear-barra-grupo--separado colorear-barra-grupo--acciones">
            <button type="button" className="colorear-accion" onClick={deshacer} disabled={!puedeDeshacer} aria-label="Deshacer" title="Deshacer">
              <LuUndo2 />
            </button>
            <button type="button" className="colorear-accion" onClick={rehacer} disabled={!puedeRehacer} aria-label="Rehacer" title="Rehacer">
              <LuRedo2 />
            </button>
            <button type="button" className="colorear-accion" onClick={() => setConfirmarBorrar(true)} aria-label="Borrar todo" title="Borrar todo">
              <DeleteOutlined />
            </button>
            <button type="button" className="colorear-accion" onClick={imprimir} aria-label="Imprimir" title="Imprimir">
              <PrinterOutlined />
            </button>
          </div>

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
            </div>
          )}

          {menu === 'sellos' && (
            <div className="colorear-desplegable colorear-desplegable--sellos" role="menu" aria-label="Sellos">
              <div className="colorear-lapices">
                {['surtido', ...FORMAS_SELLO.map((f) => f.id)].map((forma) => (
                  <button
                    type="button"
                    key={forma}
                    role="menuitemradio"
                    aria-checked={formaSello === forma}
                    className={`colorear-util${formaSello === forma ? ' colorear-util--activo' : ''}`}
                    onClick={() => elegirForma(forma)}
                  >
                    <IconoSello forma={forma} color={colorIcono} size={42} />
                    <span className="colorear-util-nombre">{NOMBRE_FORMA[forma]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {menu === 'colores' && (
            <div className="colorear-desplegable colorear-desplegable--colores" role="menu" aria-label="Colores">
              <div className="colorear-colores">
                {COLORES.map((c) => (
                  <Gota
                    key={c.id}
                    rgb={c.rgb}
                    activo={!esGoma && colorId === c.id}
                    onClick={() => elegirColor(c.id)}
                    etiqueta={c.nombre}
                  />
                ))}
                {colorPropio && (
                  <Gota
                    rgb={colorPropio}
                    activo={!esGoma && colorId === 'propio'}
                    onClick={() => elegirColor('propio')}
                    etiqueta="Mi color"
                  />
                )}
                {/* Selector de color: la rueda abre la paleta completa (sin
                    boton "+": se enredaba con la rueda, pedido explicito). */}
                <button
                  type="button"
                  className="colorear-color colorear-rueda"
                  onClick={() => setMenu('espectro')}
                  aria-label="Elegir otro color"
                  title="Elegir otro color"
                />
              </div>
            </div>
          )}

          {menu === 'espectro' && (
            <div className="colorear-desplegable colorear-desplegable--espectro" role="menu" aria-label="Más colores">
              <div className="colorear-desplegable-titulo">
                <button type="button" className="colorear-desplegable-volver" onClick={() => setMenu('colores')} aria-label="Volver a los colores">
                  <LeftOutlined />
                </button>
                <span>Elige un color</span>
              </div>
              <div className="colorear-espectro">
                {ESPECTRO.map((valor) => {
                  const clave = valor.join(',');
                  const activo = colorId === 'propio' && colorPropio?.join(',') === clave;
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

          {menu === 'tamano' && (
            <div className="colorear-desplegable colorear-desplegable--tamano" role="menu" aria-label="Tamaño">
              <div className="colorear-tamano-vista">{muestra(Math.min(anchoReal, 60))}</div>
              <span className="colorear-tamano-pista">
                <input
                  type="range"
                  min={TAMANO_MIN}
                  max={TAMANO_MAX}
                  value={tamano}
                  onChange={(e) => setTamano(Number(e.target.value))}
                  aria-label="Tamaño"
                />
              </span>
              <div className="colorear-tamanos-rapidos">
                {TAMANOS_RAPIDOS.map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={`colorear-tamano-rapido${tamano === t ? ' colorear-tamano-rapido--activo' : ''}`}
                    onClick={() => setTamano(t)}
                    aria-label={`Tamaño ${t}`}
                  >
                    {muestra(Math.max(6, t * 0.55))}
                  </button>
                ))}
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
          <IconoHerramienta herramienta={herramienta} color={colorIcono} size={CURSOR} />
        </span>
      </div>

      {confirmarBorrar && (
        <ConfirmarBorrado
          titulo="¿Borrar todo el dibujo?"
          texto="Se borra todo lo que pintaste en esta lámina."
          miniatura={miniaturaBorrar}
          onCancelar={() => setConfirmarBorrar(false)}
          onConfirmar={borrarTodo}
        />
      )}
    </div>
  );
}

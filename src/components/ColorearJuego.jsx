import { useCallback, useEffect, useRef, useState } from 'react';
import { CloseOutlined, DeleteOutlined, PlusOutlined, PrinterOutlined } from '@ant-design/icons';
// Flechas en gancho para deshacer/rehacer: la flecha circular de antd
// (UndoOutlined) se confundia con "recargar" (pedido explicito).
import { LuBrush, LuRedo2, LuUndo2 } from 'react-icons/lu';
import { borrarDibujo, guardarDibujo, leerDibujo, VIGENCIA_MS } from '../utils/dibujosColorear';
import {
  COLORES,
  ESPECTRO,
  HERRAMIENTAS,
  capaDe,
  css,
  empezarTrazo,
  fundirCapa,
  pintarTramo,
} from '../utils/pincelesColorear';
import IconoHerramienta, { PUNTAS } from './ColorearIconos';
import './ColorearJuego.css';

// ========== COLOREAR (pintar a mano sobre las laminas de Imprimir) ==========
// Pedido explicito: trazo libre, sin balde ni cierre de bordes. Capas, de
// abajo hacia arriba: el <canvas> de color; un <canvas> de "trazo en curso"
// (solo acuarela y destacador, que se funden con transparencia al soltar);
// y la lamina original con mix-blend-mode: multiply — el blanco deja ver el
// color y la linea negra queda SIEMPRE encima, nunca se tapa al pintar.
// Herramientas y colores: utils/pincelesColorear.js. Dibujos de las
// herramientas (bandeja y cursor): ColorearIconos.jsx.
// Lo pintado se guarda solo en el dispositivo (utils/dibujosColorear.js) y
// se borra a las 48 h de empezado.
//
// Distribucion (patron de las apps de pintar infantiles): a un lado la
// bandeja de herramientas, con deshacer/rehacer/borrar/imprimir aparte; al
// otro, el tamaño (uno para todas las herramientas) y los colores, con
// "Mas colores" para elegir cualquier tono. En pantallas verticales las dos
// bandejas pasan abajo de la hoja. Lo destructivo (borrar todo, borrar un
// dibujo guardado) siempre pide confirmacion en un dialogo.

// Tamaño en px de pantalla (cada herramienta lo ajusta con su escala).
const TAMANO_MIN = 6;
const TAMANO_MAX = 60;
const TAMANO_INICIAL = 22;

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

const ESCALA_HERRAMIENTA = Object.fromEntries(HERRAMIENTAS.map((h) => [h.id, h.escala]));

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
export function MisDibujos({ dibujos, miniaturas, onElegir, onImprimir, onBorrar }) {
  const [porBorrar, setPorBorrar] = useState(null);
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

// ---------- Lienzo ----------
export default function ColorearLienzo({ id, src, onGuardado, onImprimir }) {
  const zonaRef = useRef(null);
  const panelHerramientasRef = useRef(null);
  const panelColoresRef = useRef(null);
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
  // colorId: uno de COLORES o 'propio' (elegido en "Mas colores").
  const [colorId, setColorId] = useState('rojo');
  const [colorPropio, setColorPropio] = useState(null);
  const [tamano, setTamano] = useState(TAMANO_INICIAL);
  const [puedeDeshacer, setPuedeDeshacer] = useState(false);
  const [puedeRehacer, setPuedeRehacer] = useState(false);
  const [dialogo, setDialogo] = useState(null);
  const [miniaturaBorrar, setMiniaturaBorrar] = useState(null);

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

  // La lamina ocupa el mayor tamaño posible sin deformarse, descontando lo
  // que usan las dos bandejas (al costado o abajo, segun la pantalla: lo
  // decide el CSS con flex-direction de .colorear-centro).
  useEffect(() => {
    const zona = zonaRef.current;
    const paneles = [panelHerramientasRef.current, panelColoresRef.current];
    if (!zona || paneles.some((p) => !p) || !dimensiones) return;
    const ajustar = () => {
      const { width, height } = zona.getBoundingClientRect();
      const enFila = getComputedStyle(zona.firstElementChild).flexDirection === 'row';
      const medidas = paneles.map((p) => p.getBoundingClientRect());
      const libreAncho = enFila ? width - medidas.reduce((s, m) => s + m.width + SEPARACION, 0) : width;
      const libreAlto = enFila ? height : height - medidas.reduce((s, m) => s + m.height + SEPARACION, 0);
      const escala = Math.max(0, Math.min(libreAncho / dimensiones.ancho, libreAlto / dimensiones.alto));
      setCaja({ ancho: Math.floor(dimensiones.ancho * escala), alto: Math.floor(dimensiones.alto * escala) });
    };
    ajustar();
    const observador = new ResizeObserver(ajustar);
    observador.observe(zona);
    paneles.forEach((p) => observador.observe(p));
    return () => observador.disconnect();
  }, [dimensiones]);

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
    if (dialogo !== 'borrar' || !laminaRef.current) return undefined;
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
  }, [dialogo]);

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
    if (e.pointerType !== 'mouse') {
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

  const alApoyar = (e) => {
    // Un solo dedo a la vez: un segundo dedo no mancha.
    if (trazoRef.current !== null || !dimensiones) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    recordarParaDeshacer();
    const canvas = canvasRef.current;
    const escala = canvas.width / canvas.getBoundingClientRect().width;
    const trazo = empezarTrazo(herramienta, rgb, tamano * escala);
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
    setDialogo(null);
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

  // Elegir un color con la goma en la mano vuelve a la ultima herramienta
  // de pintar (la goma no usa color).
  const ultimaPintarRef = useRef('crayon');
  const elegirHerramienta = (h) => {
    if (h !== 'goma') ultimaPintarRef.current = h;
    setHerramienta(h);
  };
  const elegirColor = (id) => {
    setColorId(id);
    if (esGoma) setHerramienta(ultimaPintarRef.current);
  };
  const elegirColorPropio = (valor) => {
    setColorPropio(valor);
    elegirColor('propio');
    setDialogo(null);
  };

  const punta = PUNTAS[herramienta];
  const escalaCursor = CURSOR / 48;
  const anchoReal = Math.max(4, tamano * (ESCALA_HERRAMIENTA[herramienta] ?? 1));
  const muestra = Math.min(anchoReal, 52);

  return (
    <div className="colorear-lienzo" ref={zonaRef}>
      <div className="colorear-centro">
        <div
          className="colorear-hoja"
          style={caja ? { width: caja.ancho, height: caja.alto } : { visibility: 'hidden' }}
        >
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

        {/* Bandeja de herramientas (+ acciones, separadas) */}
        <div className="colorear-panel colorear-panel--herramientas" ref={panelHerramientasRef}>
          <div className="colorear-utiles">
            {HERRAMIENTAS.map((h) => (
              <button
                type="button"
                key={h.id}
                className={`colorear-util${herramienta === h.id ? ' colorear-util--activo' : ''}`}
                onClick={() => elegirHerramienta(h.id)}
                aria-label={h.nombre}
                aria-pressed={herramienta === h.id}
                title={h.nombre}
              >
                <IconoHerramienta herramienta={h.id} color={colorIcono} size={46} />
              </button>
            ))}
          </div>
          <div className="colorear-acciones">
            <button type="button" className="colorear-accion" onClick={deshacer} disabled={!puedeDeshacer} aria-label="Deshacer" title="Deshacer">
              <LuUndo2 />
            </button>
            <button type="button" className="colorear-accion" onClick={rehacer} disabled={!puedeRehacer} aria-label="Rehacer" title="Rehacer">
              <LuRedo2 />
            </button>
            <button type="button" className="colorear-accion" onClick={() => setDialogo('borrar')} aria-label="Borrar todo" title="Borrar todo">
              <DeleteOutlined />
            </button>
            <button type="button" className="colorear-accion" onClick={imprimir} aria-label="Imprimir" title="Imprimir">
              <PrinterOutlined />
            </button>
          </div>
        </div>

        {/* Bandeja de tamaño y colores */}
        <div className="colorear-panel colorear-panel--colores" ref={panelColoresRef}>
          <div className="colorear-tamano">
            <span className="colorear-tamano-muestra" aria-hidden="true">
              <span
                className={`colorear-tamano-punto${!rgb && !esGoma ? ' colorear-arcoiris' : ''}`}
                style={{
                  width: muestra,
                  height: muestra,
                  ...((rgb || esGoma) && { background: esGoma ? '#F48FB1' : css(rgb) }),
                }}
              />
            </span>
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
          </div>
          <div className="colorear-colores">
            {COLORES.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`colorear-color${c.rgb ? '' : ' colorear-arcoiris'}${!esGoma && colorId === c.id ? ' colorear-color--activo' : ''}`}
                style={c.rgb ? { '--gota': css(c.rgb) } : undefined}
                onClick={() => elegirColor(c.id)}
                aria-label={c.nombre}
                aria-pressed={!esGoma && colorId === c.id}
                title={c.nombre}
              />
            ))}
            {colorPropio && (
              <button
                type="button"
                className={`colorear-color${!esGoma && colorId === 'propio' ? ' colorear-color--activo' : ''}`}
                style={{ '--gota': css(colorPropio) }}
                onClick={() => elegirColor('propio')}
                aria-label="Mi color"
                aria-pressed={!esGoma && colorId === 'propio'}
                title="Mi color"
              />
            )}
            <button
              type="button"
              className="colorear-color colorear-mas"
              onClick={() => setDialogo('colores')}
              aria-label="Más colores"
              title="Más colores"
            >
              <PlusOutlined />
            </button>
          </div>
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

      {dialogo === 'borrar' && (
        <ConfirmarBorrado
          titulo="¿Borrar todo el dibujo?"
          texto="Se borra todo lo que pintaste en esta lámina."
          miniatura={miniaturaBorrar}
          onCancelar={() => setDialogo(null)}
          onConfirmar={borrarTodo}
        />
      )}

      {dialogo === 'colores' && (
        <div className="memory-victoria-overlay colorear-dialogo-overlay" onClick={() => setDialogo(null)}>
          <div
            className="memory-niveles-modal colorear-espectro-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Más colores"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="memory-niveles-header">
              <h3>Más colores</h3>
              <button
                type="button"
                className="memory-cerrar-x memory-niveles-cerrar"
                onClick={() => setDialogo(null)}
                aria-label="Cerrar"
              >
                <CloseOutlined />
              </button>
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
        </div>
      )}
    </div>
  );
}

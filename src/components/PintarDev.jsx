import { useEffect, useRef, useState } from 'react';
import { Checkbox } from 'antd';
import EstadoDevTabs from './EstadoDevTabs';
import { elegirEstadoDev } from '../utils/estadoDev';
import { cuadricularImagen } from '../utils/pintarNumeros';
import {
  DESCARTAR,
  contarPropuestaPintar,
  guardarPropuestaPintar,
  leerPropuestaPintar,
  textoPropuestaPintar,
} from '../utils/propuestaPintar';

// Ancho máximo (px) de cada vista previa pixelada.
const VISTA_MAX = 240;

function cargarElemento(cargar) {
  return cargar().then((m) => new Promise((resolve) => {
    const img = document.createElement('img');
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = m.default;
  }));
}

// Una lámina ya pintada entera en un nivel: el mismo cálculo que hace el
// juego (cuadricularImagen), dibujado en un canvas.
function VistaNivel({ img, nivel, asignado, elegido, onElegir }) {
  const canvasRef = useRef(null);
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    const l = cuadricularImagen(img, nivel.lado, nivel.colores);
    const celda = Math.max(1, Math.floor(VISTA_MAX / Math.max(l.columnas, l.filas)));
    const cv = canvasRef.current;
    cv.width = l.columnas * celda;
    cv.height = l.filas * celda;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    l.celdas.forEach((n, i) => {
      if (n === null) return;
      ctx.fillStyle = l.paleta[n - 1];
      ctx.fillRect((i % l.columnas) * celda, Math.floor(i / l.columnas) * celda, celda, celda);
    });
    const conNumero = l.celdas.filter((n) => n !== null).length;
    const mayor = l.celdas.filter((n) => n === 1).length;
    setDatos({
      columnas: l.columnas,
      filas: l.filas,
      colores: l.paleta.length,
      celdas: conNumero,
      mayorPct: conNumero ? Math.round((mayor / conNumero) * 100) : 0,
      mayorColor: l.paleta[0],
    });
  }, [img, nivel]);

  return (
    <figure className={`pintar-dev-vista${asignado ? ' asignado' : ''}${elegido ? ' elegido' : ''}`}>
      <figcaption>
        <Checkbox checked={elegido} onChange={onElegir}>Nivel {nivel.numero}</Checkbox>
        {asignado && <span className="pintar-dev-asignado">Asignado</span>}
      </figcaption>
      <canvas ref={canvasRef} className="pintar-dev-canvas" />
      {datos && (
        <div className="pintar-dev-datos">
          <span>{datos.columnas}×{datos.filas} · {datos.colores} colores · {datos.celdas} celdas</span>
          <span>
            <i style={{ background: datos.mayorColor }} aria-hidden="true" />
            01 ocupa el {datos.mayorPct}%
          </span>
        </div>
      )}
    </figure>
  );
}

// eleccion: nivel elegido (número), DESCARTAR o undefined. onElegir(valor)
// alterna: elegir lo que ya estaba elegido lo quita.
function FilaLamina({ lamina, niveles, eleccion, onElegir }) {
  const [img, setImg] = useState(null);

  useEffect(() => {
    let vivo = true;
    cargarElemento(lamina.cargar).then((el) => {
      if (vivo) setImg(el);
    });
    return () => {
      vivo = false;
    };
  }, [lamina]);

  return (
    <section className={`pintar-dev-fila${eleccion === DESCARTAR ? ' descartada' : ''}`}>
      <div className="pintar-dev-fila-header">
        <h3>{lamina.nombre}</h3>
        <Checkbox checked={eleccion === DESCARTAR} onChange={() => onElegir(DESCARTAR)}>
          Descartar
        </Checkbox>
      </div>
      {!img ? (
        <p className="gallery-empty">Cargando...</p>
      ) : (
        <div className="pintar-dev-vistas">
          <figure className="pintar-dev-vista">
            <figcaption>Original</figcaption>
            <img src={img.src} alt="" className="pintar-dev-original" />
          </figure>
          {niveles.map((n) => (
            <VistaNivel
              key={n.numero}
              img={img}
              nivel={n}
              asignado={lamina.nivel === n.numero}
              elegido={eleccion === n.numero}
              onElegir={() => onElegir(n.numero)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// MODO DESARROLLADOR de "Pintar por números" (solo para preparar láminas,
// no es parte del juego): muestra cada imagen ya pintada entera en todos
// los niveles (NIVELES_PINTAR), con el mismo cálculo del juego, para decidir su nivel sin
// adivinar. "En preparación" = imágenes en <tema>/por-asignar/ (todavía no
// se juegan); "Procesados" = las que ya están en una carpeta nivel-<n> (se
// marca la vista de su nivel). Cada lámina lleva un checkbox por nivel y
// uno de "Descartar" (una sola elección por lámina); la barra de arriba
// copia la propuesta como texto para pegársela a Claude, que mueve los
// archivos (utils/propuestaPintar.js, skills/agregar-pintar.md).
export default function PintarDev({ temas: todosLosTemas, niveles }) {
  const [estadoElegido, setEstadoElegido] = useState(null);
  const [tabId, setTabId] = useState(null);
  const [propuesta, setPropuesta] = useState(leerPropuestaPintar);
  // false | 'ok' | 'error'
  const [copiado, setCopiado] = useState(false);
  const copiadoTimeoutRef = useRef(null);

  useEffect(() => {
    guardarPropuestaPintar(propuesta);
  }, [propuesta]);
  useEffect(() => () => clearTimeout(copiadoTimeoutRef.current), []);

  const elegir = (clave, valor) => {
    setPropuesta((prev) => {
      const copia = { ...prev };
      if (copia[clave] === valor) delete copia[clave];
      else copia[clave] = valor;
      return copia;
    });
  };

  const cantidad = contarPropuestaPintar(todosLosTemas, propuesta);

  const copiar = () => {
    const avisar = (valor) => {
      setCopiado(valor);
      clearTimeout(copiadoTimeoutRef.current);
      copiadoTimeoutRef.current = setTimeout(() => setCopiado(false), valor === 'error' ? 4000 : 1600);
    };
    if (!navigator.clipboard) {
      avisar('error');
      return;
    }
    navigator.clipboard
      .writeText(textoPropuestaPintar(todosLosTemas, propuesta))
      .then(() => avisar('ok'))
      .catch(() => avisar('error'));
  };

  const temasPorEstado = (est) => todosLosTemas
    .map((t) => ({ ...t, laminas: t.laminas.filter((l) => (l.nivel === null) === (est === 'afinar')) }))
    .filter((t) => t.laminas.length > 0);
  const temasAfinar = temasPorEstado('afinar');
  const temasListos = temasPorEstado('listos');
  const estado = elegirEstadoDev(estadoElegido, temasAfinar.length > 0);
  const temas = estado === 'afinar' ? temasAfinar : temasListos;
  const contar = (lista) => lista.reduce((s, t) => s + t.laminas.length, 0);
  const tema = temas.find((t) => t.id === tabId) ?? temas[0];

  return (
    <div className="dif-dev">
      <div className="pintar-dev-arriba">
        <EstadoDevTabs
          estado={estado}
          cantidades={{ afinar: contar(temasAfinar), listos: contar(temasListos) }}
          onChange={(e) => {
            setEstadoElegido(e);
            setTabId(null);
          }}
        />
        <div className="dif-dev-barra pintar-dev-propuesta">
          <span>
            Propuesta: <strong>{cantidad}</strong> {cantidad === 1 ? 'lámina' : 'láminas'}
          </span>
          <button type="button" className="dif-dev-boton" onClick={copiar} disabled={cantidad === 0}>
            {copiado === 'ok' ? '¡Copiado!' : 'Copiar'}
          </button>
          <button
            type="button"
            className="dif-dev-boton dif-dev-boton--suave"
            onClick={() => setPropuesta({})}
            disabled={Object.keys(propuesta).length === 0}
          >
            Vaciar
          </button>
          {copiado === 'error' && <span className="pintar-dev-error">No se pudo copiar</span>}
        </div>
      </div>
      {!tema ? (
        <p className="gallery-empty">No hay láminas aquí.</p>
      ) : (
        <>
          <div className="romp-tabs" role="tablist" aria-label="Temas">
            {temas.map((t) => (
              <button
                type="button"
                key={t.id}
                role="tab"
                aria-selected={t.id === tema.id}
                className={`romp-tab${t.id === tema.id ? ' activo' : ''}`}
                style={t.id === tema.id ? { background: t.header } : undefined}
                onClick={() => setTabId(t.id)}
              >
                {t.nombre}
              </button>
            ))}
          </div>
          {tema.laminas.map((l) => (
            <FilaLamina
              key={l.id}
              lamina={l}
              niveles={niveles}
              eleccion={propuesta[`${tema.id}/${l.id}`]}
              onElegir={(valor) => elegir(`${tema.id}/${l.id}`, valor)}
            />
          ))}
        </>
      )}
    </div>
  );
}

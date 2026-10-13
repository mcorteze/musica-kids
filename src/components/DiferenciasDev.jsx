import { useEffect, useState } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { cargarImagenConAspecto } from '../utils/cargarImagen';
import EstadoDevTabs from './EstadoDevTabs';
import { elegirEstadoDev } from '../utils/estadoDev';
import { centroDe, esZona } from '../utils/zonasDiferencias';

const LINEAS = Array.from({ length: 21 }, (_, i) => i * 5); // 0, 5, 10 ... 100
const ETIQUETAS = Array.from({ length: 11 }, (_, i) => i * 10); // 0, 10 ... 100

// Tocar a esta distancia (en px de pantalla) del primer vertice cierra la
// zona libre que se esta dibujando.
const CIERRE_PX = 12;
// Un click a esta distancia (px) o menos del ultimo vertice se ignora.
const REPETIDO_PX = 3;
// Un rectangulo mas chico que esto (en %) se toma como click suelto y se
// descarta.
const RECT_MINIMO = 0.8;

// Las marcas se guardan por par en este navegador para no perderlas al
// cambiar de par o al cerrar el menu: { "<tema>/<par>": [marca, ...] }, donde
// cada marca es una zona { zona: [[x, y], ...] } o un punto viejo { x, y }.
const MARCAS_KEY = 'musica-kids-diferencias-marcas';

const redondear = (n) => Math.round(n * 10) / 10;

function marcaValida(m) {
  if (esZona(m)) return m.zona.every((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  return Boolean(m) && Number.isFinite(m.x) && Number.isFinite(m.y);
}

function leerMarcasGuardadas() {
  try {
    const guardado = JSON.parse(localStorage.getItem(MARCAS_KEY));
    if (!guardado || typeof guardado !== 'object' || Array.isArray(guardado)) return {};
    const limpio = {};
    for (const [clave, lista] of Object.entries(guardado)) {
      if (!Array.isArray(lista)) continue;
      const validas = lista.filter(marcaValida)
        .map((m) => (esZona(m) ? { zona: m.zona.map(([x, y]) => [x, y]) } : { x: m.x, y: m.y }));
      if (validas.length > 0) limpio[clave] = validas;
    }
    return limpio;
  } catch {
    return {};
  }
}

// Coordenada relativa (0-100, con un decimal) de un evento de mouse sobre el
// panel: es lo que hay que anotar en src/data/diferencias.js.
function posicionRelativa(e) {
  const r = e.currentTarget.getBoundingClientRect();
  const limitar = (n) => Math.min(100, Math.max(0, n));
  return {
    x: redondear(limitar(((e.clientX - r.left) / r.width) * 100)),
    y: redondear(limitar(((e.clientY - r.top) / r.height) * 100)),
  };
}

function lineaDeMarca(m) {
  if (esZona(m)) return `    { zona: [${m.zona.map(([x, y]) => `[${x}, ${y}]`).join(', ')}] },`;
  return `    { x: ${m.x}, y: ${m.y} },`;
}

// Texto listo para pegar en src/data/diferencias.js.
function textoParaPegar(clave, marcas) {
  return `  '${clave}': [\n${marcas.map(lineaDeMarca).join('\n')}\n  ],`;
}

function rectanguloComoZona(a, b) {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  return { zona: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] };
}

const puntosSvg = (zona) => zona.map(([x, y]) => `${x},${y}`).join(' ');

// MODO DESARROLLADOR del juego "Encuentra las diferencias" (solo para
// preparar los pares, no es parte del juego). Muestra el par de imagenes
// lado a lado; sobre la segunda (la que tiene las diferencias) hay una
// cuadricula y, al pasar el cursor, se leen sus coordenadas relativas (en %
// de la imagen) y se ve la misma posicion marcada en la primera.
// Cada diferencia se marca como una ZONA (pedido explicito: un punto exacto
// era dificil de acertar cuando la diferencia es amplia o irregular), con
// dos herramientas: "Zona libre" (cada click agrega un vertice; se cierra
// tocando el primero o con "Cerrar zona") y "Rectangulo" (arrastrar de una
// esquina a la otra). En el juego se acierta clickeando dentro de la zona y
// el check aparece en su centro (ver utils/zonasDiferencias.js).
// El panel de la derecha (siempre a la vista) lista las marcas y arma el
// texto para pegar en src/data/diferencias.js: "Copiar este par" o "Copiar
// todos". Las marcas persisten por par. En verde punteado se ven las
// diferencias ya anotadas, para comprobar que caen bien.
// Arriba de todo se elige el estado: "En preparacion" = pares SIN
// diferencias anotadas (todavia no se juegan) y "Procesados" = los que ya
// estan en el juego. Los tabs de tema y la lista de pares muestran solo los
// de ese estado.
export default function DiferenciasDev({ temas: todosLosTemas, radio, coordenadas }) {
  const [estadoElegido, setEstadoElegido] = useState(null);
  const listo = (temaId, parId) => (coordenadas[`${temaId}/${parId}`] ?? []).length > 0;
  const temasPorEstado = (est) => todosLosTemas
    .map((t) => ({ ...t, pares: t.pares.filter((p) => listo(t.id, p.id) === (est === 'listos')) }))
    .filter((t) => t.pares.length > 0);
  const temasAfinar = temasPorEstado('afinar');
  const temasListos = temasPorEstado('listos');
  const estado = elegirEstadoDev(estadoElegido, temasAfinar.length > 0);
  const temas = estado === 'afinar' ? temasAfinar : temasListos;
  const contar = (lista) => lista.reduce((s, t) => s + t.pares.length, 0);

  const [tabId, setTabId] = useState(null);
  const [parId, setParId] = useState(null);
  const [imagenes, setImagenes] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [marcasPorPar, setMarcasPorPar] = useState(leerMarcasGuardadas);
  const [verCuadricula, setVerCuadricula] = useState(true);
  // 'zona' (poligono libre) | 'rect' (rectangulo arrastrando).
  const [herramienta, setHerramienta] = useState('zona');
  // Vertices de la zona libre que se esta dibujando ([{ x, y }]).
  const [enCurso, setEnCurso] = useState([]);
  // Rectangulo que se esta arrastrando: { desde, hasta } en %.
  const [arrastre, setArrastre] = useState(null);
  // false | 'par' | 'todos' | 'error': que se acaba de copiar (o si fallo).
  const [copiado, setCopiado] = useState(false);

  const tema = temas.find((t) => t.id === tabId) ?? temas[0];
  const par = tema?.pares.find((p) => p.id === parId) ?? tema?.pares[0];
  const clave = tema && par ? `${tema.id}/${par.id}` : '';
  const registradas = clave ? (coordenadas[clave] ?? []) : [];
  const marcas = clave ? (marcasPorPar[clave] ?? []) : [];

  // Solo cuentan las marcas de pares que siguen existiendo.
  const clavesValidas = new Set(todosLosTemas.flatMap((t) => t.pares.map((p) => `${t.id}/${p.id}`)));
  const clavesConMarcas = Object.keys(marcasPorPar)
    .filter((k) => clavesValidas.has(k) && marcasPorPar[k].length > 0)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  useEffect(() => {
    if (!par) return;
    let vivo = true;
    setImagenes(null);
    Promise.all([
      cargarImagenConAspecto(par.cargarOriginal),
      cargarImagenConAspecto(par.cargarModificada),
    ]).then(([a, b]) => {
      if (vivo) setImagenes({ a, b });
    });
    return () => {
      vivo = false;
    };
  }, [par]);

  useEffect(() => {
    try {
      localStorage.setItem(MARCAS_KEY, JSON.stringify(marcasPorPar));
    } catch {
      // Sin localStorage las marcas duran lo que dure la pagina.
    }
  }, [marcasPorPar]);

  // Cambia las marcas del par abierto (acepta un valor o una funcion, como
  // el setter de useState); un par sin marcas no deja rastro en el mapa.
  const setMarcas = (cambio) => {
    setMarcasPorPar((prev) => {
      const actual = prev[clave] ?? [];
      const siguiente = typeof cambio === 'function' ? cambio(actual) : cambio;
      const copia = { ...prev };
      if (siguiente.length > 0) copia[clave] = siguiente;
      else delete copia[clave];
      return copia;
    });
  };

  const limpiarTrabajo = () => {
    setCursor(null);
    setCopiado(false);
    setEnCurso([]);
    setArrastre(null);
  };

  const elegirTab = (id) => {
    setTabId(id);
    setParId(null);
    limpiarTrabajo();
  };

  const elegirPar = (id) => {
    setParId(id);
    limpiarTrabajo();
  };

  const elegirHerramienta = (h) => {
    setHerramienta(h);
    setEnCurso([]);
    setArrastre(null);
  };

  const cerrarZona = () => {
    if (enCurso.length < 3) return;
    setMarcas((prev) => [...prev, { zona: enCurso.map((p) => [p.x, p.y]) }]);
    setEnCurso([]);
  };

  // Zona libre: cada click agrega un vertice; tocar cerca del primero (con
  // 3 o mas vertices) la cierra.
  const alClickearImagen = (e) => {
    if (herramienta !== 'zona') return;
    const p = posicionRelativa(e);
    const r = e.currentTarget.getBoundingClientRect();
    const distPx = (q) => Math.hypot(((p.x - q.x) * r.width) / 100, ((p.y - q.y) * r.height) / 100);
    if (enCurso.length >= 3 && distPx(enCurso[0]) <= CIERRE_PX) {
      cerrarZona();
      return;
    }
    // Un doble click (o un click sobre el ultimo vertice) no repite el punto.
    if (enCurso.length > 0 && distPx(enCurso[enCurso.length - 1]) <= REPETIDO_PX) return;
    setEnCurso((prev) => [...prev, p]);
  };

  // Rectangulo: se arrastra con el boton apretado; al soltar queda la zona.
  const alApretar = (e) => {
    if (herramienta !== 'rect' || e.button !== 0) return;
    const p = posicionRelativa(e);
    setArrastre({ desde: p, hasta: p });
  };

  const alMover = (e) => {
    const p = posicionRelativa(e);
    setCursor(p);
    if (arrastre) setArrastre((prev) => (prev ? { ...prev, hasta: p } : prev));
  };

  const alSoltar = () => {
    if (!arrastre) return;
    const { desde, hasta } = arrastre;
    setArrastre(null);
    if (Math.abs(hasta.x - desde.x) < RECT_MINIMO || Math.abs(hasta.y - desde.y) < RECT_MINIMO) return;
    setMarcas((prev) => [...prev, rectanguloComoZona(desde, hasta)]);
  };

  const copiarTexto = (texto, cual) => {
    const avisar = (valor) => {
      setCopiado(valor);
      setTimeout(() => setCopiado(false), valor === 'error' ? 4000 : 1600);
    };
    if (!navigator.clipboard) {
      avisar('error');
      return;
    }
    navigator.clipboard.writeText(texto).then(() => avisar(cual)).catch(() => avisar('error'));
  };

  const copiarPar = () => copiarTexto(textoParaPegar(clave, marcas), 'par');

  const copiarTodos = () => copiarTexto(
    clavesConMarcas.map((k) => textoParaPegar(k, marcasPorPar[k])).join('\n'),
    'todos'
  );

  const elegirEstado = (est) => {
    setEstadoElegido(est);
    limpiarTrabajo();
  };

  const selectorEstado = (
    <EstadoDevTabs
      estado={estado}
      cantidades={{ afinar: contar(temasAfinar), listos: contar(temasListos) }}
      onChange={elegirEstado}
    />
  );

  if (todosLosTemas.length === 0) {
    return (
      <div className="dif-dev">
        <p className="gallery-empty">
          Todavía no hay pares de imágenes. Deja <b>original.avif</b> y <b>modificada.avif</b> en
          {' '}<b>src/assets/diferencias/&lt;tema&gt;/&lt;par&gt;/</b> y vuelve a abrir esta página.
        </p>
      </div>
    );
  }

  if (temas.length === 0) {
    return (
      <div className="dif-dev">
        {selectorEstado}
        <p className="gallery-empty">
          {estado === 'afinar' ? 'No hay pares en preparación.' : 'Todavía no hay pares procesados.'}
        </p>
      </div>
    );
  }

  const proporcionDistinta = imagenes
    && Math.abs(imagenes.a.aspecto - imagenes.b.aspecto) / imagenes.b.aspecto > 0.01;

  // Capas comunes a los dos paneles: diferencias ya anotadas (verde
  // punteado) y marcas nuevas (naranja), con su numero en el centro. Las
  // zonas van en un SVG estirado a la imagen (viewBox 0-100 sin preservar
  // proporcion = coordenadas en %); los puntos viejos, como circulo.
  const dibujarLista = (lista, clase, prefijo) => (
    <>
      <svg className="dif-zonas" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {lista.map((d, i) => (esZona(d) ? (
          <polygon key={`${prefijo}${i}`} points={puntosSvg(d.zona)} className={`dif-zona ${clase}`} />
        ) : null))}
      </svg>
      {lista.map((d, i) => {
        const c = centroDe(d);
        return esZona(d) ? (
          <span key={`${prefijo}n${i}`} className={`dif-zona-numero ${clase}`} style={{ left: `${c.x}%`, top: `${c.y}%` }}>
            {i + 1}
          </span>
        ) : (
          <span
            key={`${prefijo}p${i}`}
            className={prefijo === 'r' ? 'dif-registrada' : 'dif-marca'}
            style={{ left: `${d.x}%`, top: `${d.y}%`, width: `${(d.r ?? radio) * 2}%` }}
          >
            {i + 1}
          </span>
        );
      })}
    </>
  );

  // Lo que se esta dibujando ahora: la zona libre abierta (con una linea
  // hasta el cursor) o el rectangulo que se arrastra.
  const enProceso = (
    <svg className="dif-zonas" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {enCurso.length > 0 && (
        <polyline
          points={puntosSvg([...enCurso, ...(cursor ? [cursor] : [])].map((p) => [p.x, p.y]))}
          className="dif-zona dif-zona--curso"
        />
      )}
      {arrastre && (
        <polygon points={puntosSvg(rectanguloComoZona(arrastre.desde, arrastre.hasta).zona)} className="dif-zona dif-zona--curso" />
      )}
    </svg>
  );
  const vertices = enCurso.map((p, i) => (
    <span
      key={`v${i}`}
      className={`dif-vertice${i === 0 && enCurso.length >= 3 ? ' cierre' : ''}`}
      style={{ left: `${p.x}%`, top: `${p.y}%` }}
    />
  ));

  const capas = (
    <>
      {dibujarLista(registradas, 'dif-zona--registrada', 'r')}
      {dibujarLista(marcas, 'dif-zona--marca', 'm')}
      {enProceso}
      {vertices}
    </>
  );

  return (
    <div className="dif-dev">
      {selectorEstado}
      <div className="romp-tabs" role="tablist" aria-label="Temas">
        {temas.map((t) => (
          <button
            type="button"
            key={t.id}
            role="tab"
            aria-selected={t.id === tema.id}
            className={`romp-tab${t.id === tema.id ? ' activo' : ''}`}
            style={t.id === tema.id ? { background: t.header } : undefined}
            onClick={() => elegirTab(t.id)}
          >
            {t.nombre}
          </button>
        ))}
      </div>

      <div className="dif-dev-niveles">
        {tema.pares.map((p) => {
          const pendientes = (marcasPorPar[`${tema.id}/${p.id}`] ?? []).length;
          return (
            <button
              type="button"
              key={p.id}
              className={`dif-dev-nivel${p.id === par.id ? ' activo' : ''}`}
              onClick={() => elegirPar(p.id)}
            >
              {p.id}
              <span>
                {(coordenadas[`${tema.id}/${p.id}`] ?? []).length} registradas
                {pendientes > 0 && ` · ${pendientes} marcas`}
              </span>
            </button>
          );
        })}
      </div>

      <div className="dif-dev-barra">
        <div className="dev-estado" role="group" aria-label="Herramienta">
          <button
            type="button"
            className={`dev-estado-btn${herramienta === 'zona' ? ' activo' : ''}`}
            onClick={() => elegirHerramienta('zona')}
          >
            Zona libre
          </button>
          <button
            type="button"
            className={`dev-estado-btn${herramienta === 'rect' ? ' activo' : ''}`}
            onClick={() => elegirHerramienta('rect')}
          >
            Rectángulo
          </button>
        </div>
        {/* Siempre en pantalla (deshabilitados si no hay zona en curso):
            si aparecieran recien con el primer vertice, la barra crece,
            empuja las imagenes hacia abajo y el segundo click cae en otro
            lugar. El texto de los botones tampoco cambia de largo. */}
        <div className="dif-dev-acciones dif-dev-acciones--fila">
          <button type="button" className="dif-dev-boton" onClick={cerrarZona} disabled={enCurso.length < 3}>
            Cerrar zona
          </button>
          <button
            type="button"
            className="dif-dev-boton dif-dev-boton--suave"
            onClick={() => setEnCurso((prev) => prev.slice(0, -1))}
            disabled={enCurso.length === 0}
          >
            Deshacer punto
          </button>
          <button
            type="button"
            className="dif-dev-boton dif-dev-boton--suave"
            onClick={() => setEnCurso([])}
            disabled={enCurso.length === 0}
          >
            Cancelar
          </button>
        </div>
        <div className="dif-dev-lectura">
          {cursor ? (
            <>x <b>{cursor.x}</b> % · y <b>{cursor.y}</b> %</>
          ) : (
            <>x <b>–</b> · y <b>–</b></>
          )}
        </div>
        <label className="dif-dev-check">
          <input
            type="checkbox"
            checked={verCuadricula}
            onChange={(e) => setVerCuadricula(e.target.checked)}
          />
          Cuadrícula
        </label>
        {imagenes && (
          <div className="dif-dev-medidas">
            {imagenes.a.ancho}×{imagenes.a.alto} · {imagenes.b.ancho}×{imagenes.b.alto}
          </div>
        )}
      </div>

      {proporcionDistinta && (
        <p className="dif-dev-alerta">
          Las dos imágenes no tienen la misma proporción: las coordenadas no van a coincidir en
          las dos. Conviene que tengan exactamente el mismo tamaño.
        </p>
      )}

      <div className="dif-dev-cuerpo">
        <div className="dif-dev-principal">
          {!imagenes ? (
            <p className="memory-cargando">Cargando el par...</p>
          ) : (
            <div className="dif-dev-par" style={{ '--dif-ar': imagenes.b.aspecto }}>
              <figure className="dif-dev-panel">
                <figcaption>Original (imagen a)</figcaption>
                <div className="dif-dev-imagen">
                  <img src={imagenes.a.src} alt="" draggable={false} />
                  {capas}
                  {cursor && (
                    <span
                      className="dif-espejo"
                      style={{ left: `${cursor.x}%`, top: `${cursor.y}%` }}
                    />
                  )}
                </div>
              </figure>

              <figure className="dif-dev-panel">
                <figcaption>Con diferencias (imagen b, aquí se marca)</figcaption>
                <div
                  className="dif-dev-imagen dif-dev-imagen--marcar"
                  onMouseMove={alMover}
                  onMouseLeave={() => {
                    setCursor(null);
                    alSoltar();
                  }}
                  onMouseDown={alApretar}
                  onMouseUp={alSoltar}
                  onClick={alClickearImagen}
                >
                  <img src={imagenes.b.src} alt="" draggable={false} />
                  {verCuadricula && (
                    <>
                      <svg className="dif-grid" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                        {LINEAS.map((v) => (
                          <g key={v}>
                            <line x1={v} y1="0" x2={v} y2="100" className={v % 10 === 0 ? 'mayor' : 'menor'} />
                            <line x1="0" y1={v} x2="100" y2={v} className={v % 10 === 0 ? 'mayor' : 'menor'} />
                          </g>
                        ))}
                      </svg>
                      {ETIQUETAS.map((v) => (
                        <span
                          key={`x${v}`}
                          className="dif-etiqueta dif-etiqueta--x"
                          style={{
                            left: `${v}%`,
                            transform: v === 0 ? 'none' : v === 100 ? 'translateX(-100%)' : 'translateX(-50%)',
                          }}
                        >
                          {v}
                        </span>
                      ))}
                      {ETIQUETAS.filter((v) => v > 0).map((v) => (
                        <span
                          key={`y${v}`}
                          className="dif-etiqueta dif-etiqueta--y"
                          style={{
                            top: `${v}%`,
                            transform: v === 100 ? 'translateY(-100%)' : 'translateY(-50%)',
                          }}
                        >
                          {v}
                        </span>
                      ))}
                    </>
                  )}
                  {capas}
                  {cursor && (
                    <>
                      <span className="dif-cruz dif-cruz--h" style={{ top: `${cursor.y}%` }} />
                      <span className="dif-cruz dif-cruz--v" style={{ left: `${cursor.x}%` }} />
                      <span
                        className="dif-tooltip"
                        style={{
                          left: `${cursor.x}%`,
                          top: `${cursor.y}%`,
                          transform: `translate(${cursor.x > 65 ? 'calc(-100% - 14px)' : '14px'}, ${cursor.y > 85 ? 'calc(-100% - 14px)' : '14px'})`,
                        }}
                      >
                        x {cursor.x} · y {cursor.y}
                      </span>
                    </>
                  )}
                </div>
              </figure>
            </div>
          )}
        </div>

        <aside className="dif-dev-marcas" aria-label="Marcas del par">
          <h3>Marcas de {par.id} ({marcas.length})</h3>
          <div className="dif-dev-acciones">
            <button type="button" className="dif-dev-boton" onClick={copiarPar} disabled={marcas.length === 0}>
              {copiado === 'par' ? '¡Copiado!' : 'Copiar este par'}
            </button>
            <button
              type="button"
              className="dif-dev-boton"
              onClick={copiarTodos}
              disabled={clavesConMarcas.length === 0}
            >
              {copiado === 'todos' ? '¡Copiado!' : `Copiar todos (${clavesConMarcas.length})`}
            </button>
            <button
              type="button"
              className="dif-dev-boton dif-dev-boton--suave"
              onClick={() => setMarcas([])}
              disabled={marcas.length === 0}
            >
              Limpiar este par
            </button>
          </div>
          {copiado === 'error' && (
            <p className="dif-dev-alerta">
              No se pudo copiar. Selecciona el texto de abajo y cópialo con Ctrl+C.
            </p>
          )}
          {marcas.length === 0 ? (
            <p className="dif-dev-vacio">
              {herramienta === 'zona'
                ? 'Marca cada diferencia en la imagen b: un click por vértice y toca el primero para cerrar la zona.'
                : 'Marca cada diferencia en la imagen b arrastrando un rectángulo sobre ella.'}
              {' '}En verde punteado se ven las {registradas.length} ya registradas para {clave}.
            </p>
          ) : (
            <>
              <ol className="dif-dev-lista">
                {marcas.map((m, i) => {
                  const c = centroDe(m);
                  return (
                    <li key={i}>
                      <span>
                        <b>{i + 1}.</b>{' '}
                        {esZona(m) ? `zona de ${m.zona.length} puntos · centro x ${c.x} · y ${c.y}` : `punto x ${m.x} % · y ${m.y} %`}
                      </span>
                      <button
                        type="button"
                        className="dif-dev-quitar"
                        onClick={() => setMarcas((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={`Quitar la marca ${i + 1}`}
                      >
                        <CloseOutlined />
                      </button>
                    </li>
                  );
                })}
              </ol>
              <pre className="dif-dev-texto">{textoParaPegar(clave, marcas)}</pre>
            </>
          )}
          <p className="dif-dev-nota">Las marcas se guardan solas en este navegador, por par.</p>
        </aside>
      </div>
    </div>
  );
}

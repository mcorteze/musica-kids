import { useEffect, useState } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { cargarImagenConAspecto } from '../utils/cargarImagen';

const LINEAS = Array.from({ length: 21 }, (_, i) => i * 5); // 0, 5, 10 ... 100
const ETIQUETAS = Array.from({ length: 11 }, (_, i) => i * 10); // 0, 10 ... 100

// Coordenada relativa (0-100, con un decimal) de un evento de mouse sobre el
// panel: es lo que hay que anotar en src/data/diferencias.js.
function posicionRelativa(e) {
  const r = e.currentTarget.getBoundingClientRect();
  const limitar = (n) => Math.min(100, Math.max(0, n));
  return {
    x: Math.round(limitar(((e.clientX - r.left) / r.width) * 100) * 10) / 10,
    y: Math.round(limitar(((e.clientY - r.top) / r.height) * 100) * 10) / 10,
  };
}

// Texto listo para pegar en src/data/diferencias.js.
function textoParaPegar(clave, marcas) {
  const filas = marcas.map((m) => `    { x: ${m.x}, y: ${m.y} },`).join('\n');
  return `  '${clave}': [\n${filas}\n  ],`;
}

// MODO DESARROLLADOR del juego "Encuentra las diferencias" (solo para
// preparar los niveles, no es parte del juego). Muestra el par de imagenes
// lado a lado; sobre la segunda (la que tiene las diferencias) hay una
// cuadricula y, al pasar el cursor, se leen sus coordenadas relativas (en %
// de la imagen) y se ve la misma posicion marcada en la primera. Con click se
// dejan marcas numeradas y "Copiar" arma el texto para pegar en
// src/data/diferencias.js. En verde punteado se ven las diferencias que ya
// estan anotadas, con su radio de acierto, para comprobar que caen bien.
export default function DiferenciasDev({ temas, radio, coordenadas }) {
  const [tabId, setTabId] = useState(null);
  const [nivelId, setNivelId] = useState(null);
  const [imagenes, setImagenes] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [marcas, setMarcas] = useState([]);
  const [verCuadricula, setVerCuadricula] = useState(true);
  const [copiado, setCopiado] = useState(false);

  const tema = temas.find((t) => t.id === tabId) ?? temas[0];
  const nivel = tema?.niveles.find((n) => n.id === nivelId) ?? tema?.niveles[0];
  const clave = tema && nivel ? `${tema.id}/${nivel.id}` : '';
  const registradas = clave ? (coordenadas[clave] ?? []) : [];

  useEffect(() => {
    if (!nivel) return;
    let vivo = true;
    setImagenes(null);
    Promise.all([
      cargarImagenConAspecto(nivel.cargarOriginal),
      cargarImagenConAspecto(nivel.cargarModificada),
    ]).then(([a, b]) => {
      if (vivo) setImagenes({ a, b });
    });
    return () => {
      vivo = false;
    };
  }, [nivel]);

  const limpiarTrabajo = () => {
    setMarcas([]);
    setCursor(null);
    setCopiado(false);
  };

  const elegirTab = (id) => {
    setTabId(id);
    setNivelId(null);
    limpiarTrabajo();
  };

  const elegirNivel = (id) => {
    setNivelId(id);
    limpiarTrabajo();
  };

  const copiar = () => {
    const texto = textoParaPegar(clave, marcas);
    navigator.clipboard?.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    }).catch(() => {});
  };

  if (temas.length === 0) {
    return (
      <div className="dif-dev">
        <p className="gallery-empty">
          Todavía no hay pares de imágenes. Deja <b>original.avif</b> y <b>modificada.avif</b> en
          {' '}<b>src/assets/diferencias/&lt;tema&gt;/&lt;nivel&gt;/</b> y vuelve a abrir esta página.
        </p>
      </div>
    );
  }

  const proporcionDistinta = imagenes
    && Math.abs(imagenes.a.aspecto - imagenes.b.aspecto) / imagenes.b.aspecto > 0.01;

  // Capas comunes a los dos paneles: diferencias ya anotadas (verde
  // punteado) y marcas nuevas (naranja, numeradas). Ancho en % del ancho de
  // la imagen + aspect-ratio 1 = circulo perfecto.
  const capas = (
    <>
      {registradas.map((d, i) => (
        <span
          key={`r${i}`}
          className="dif-registrada"
          style={{ left: `${d.x}%`, top: `${d.y}%`, width: `${(d.r ?? radio) * 2}%` }}
        >
          {i + 1}
        </span>
      ))}
      {marcas.map((m, i) => (
        <span
          key={`m${i}`}
          className="dif-marca"
          style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${radio * 2}%` }}
        >
          {i + 1}
        </span>
      ))}
    </>
  );

  return (
    <div className="dif-dev">
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
        {tema.niveles.map((n) => (
          <button
            type="button"
            key={n.id}
            className={`dif-dev-nivel${n.id === nivel.id ? ' activo' : ''}`}
            onClick={() => elegirNivel(n.id)}
          >
            {n.id}
            <span>{(coordenadas[`${tema.id}/${n.id}`] ?? []).length} registradas</span>
          </button>
        ))}
      </div>

      <div className="dif-dev-barra">
        <div className="dif-dev-lectura">
          {cursor ? (
            <>x <b>{cursor.x}</b> % · y <b>{cursor.y}</b> %</>
          ) : (
            'Pasa el cursor sobre la segunda imagen'
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

      {!imagenes ? (
        <p className="memory-cargando">Cargando el par...</p>
      ) : (
        <div className="dif-dev-par" style={{ '--dif-ar': imagenes.b.aspecto }}>
          <figure className="dif-dev-panel">
            <figcaption>Original</figcaption>
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
            <figcaption>Con diferencias (aquí se marca)</figcaption>
            <div
              className="dif-dev-imagen dif-dev-imagen--marcar"
              onMouseMove={(e) => setCursor(posicionRelativa(e))}
              onMouseLeave={() => setCursor(null)}
              onClick={(e) => setMarcas((prev) => [...prev, posicionRelativa(e)])}
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

      <div className="dif-dev-marcas">
        <div className="dif-dev-marcas-cabecera">
          <h3>Marcas nuevas ({marcas.length})</h3>
          <div className="dif-dev-acciones">
            <button type="button" className="dif-dev-boton" onClick={copiar} disabled={marcas.length === 0}>
              {copiado ? '¡Copiado!' : 'Copiar'}
            </button>
            <button
              type="button"
              className="dif-dev-boton dif-dev-boton--suave"
              onClick={() => setMarcas([])}
              disabled={marcas.length === 0}
            >
              Limpiar
            </button>
          </div>
        </div>
        {marcas.length === 0 ? (
          <p className="dif-dev-vacio">
            Haz click sobre cada diferencia en la segunda imagen para dejar una marca.
            En verde punteado se ven las {registradas.length} ya registradas para {clave}.
          </p>
        ) : (
          <>
            <ol className="dif-dev-lista">
              {marcas.map((m, i) => (
                <li key={i}>
                  <span>
                    <b>{i + 1}.</b> x {m.x} % · y {m.y} %
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
              ))}
            </ol>
            <pre className="dif-dev-texto">{textoParaPegar(clave, marcas)}</pre>
          </>
        )}
      </div>
    </div>
  );
}

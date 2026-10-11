import { useEffect, useState } from 'react';
import { Drawer } from 'antd';
import { CloseOutlined, LeftOutlined, PictureOutlined, RightOutlined } from '@ant-design/icons';

// Contenido de un tab de la pagina "Todos los rompecabezas" (herramienta de
// trabajo, solo laptop), igual en "Por afinar" y en "Listos": bloques de
// miniaturas tocables. Cada una abre un panel lateral donde se prueba el
// corte con cada cantidad de piezas y se APLICA una: eso la suma a la
// propuesta de asignacion (estado de MenuActividades, ver
// utils/propuestaRompecabezas.js), que se copia desde el boton del header.
// Las que estan en la propuesta llevan borde y etiqueta violeta.
// "secciones": [{ clave, titulo, subtitulo, rompecabezas: [{ id,
// orientacion, piezasActuales }] }] — piezasActuales es null en los por
// afinar (todavia sin nivel).

// Corte dibujado encima de una imagen (mismo calculo de grilla que el juego).
function Corte({ grilla, piezas }) {
  return (
    <div
      className="romp-miniatura-cortes"
      style={{
        gridTemplateColumns: `repeat(${grilla.columnas}, 1fr)`,
        gridTemplateRows: `repeat(${grilla.filas}, 1fr)`,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: piezas }, (_, p) => (
        <span key={p} className="romp-miniatura-pieza" />
      ))}
    </div>
  );
}

export default function RompecabezasPropuesta({
  secciones,
  miniaturas,
  propuesta,
  onCambiarPropuesta,
  opcionesPiezas,
  calcularGrilla,
  zIndex,
  onPanelAbiertoChange,
}) {
  const [abiertoId, setAbiertoId] = useState(null);
  // Piezas que se estan probando en el panel (todavia sin aplicar).
  const [prueba, setPrueba] = useState(null);

  useEffect(() => {
    onPanelAbiertoChange?.(abiertoId !== null);
  }, [abiertoId, onPanelAbiertoChange]);

  useEffect(() => () => onPanelAbiertoChange?.(false), [onPanelAbiertoChange]);

  // Lo que propone para un rompecabezas: las piezas elegidas, salvo que
  // coincidan con su nivel actual (eso no es un cambio).
  const propuestaDe = (romp) => {
    const p = propuesta[romp.id];
    return p && p !== romp.piezasActuales ? p : null;
  };

  // Anterior/siguiente recorren todo el tab, de bloque en bloque.
  const lista = secciones.flatMap((s) => s.rompecabezas);
  const idx = lista.findIndex((r) => r.id === abiertoId);
  const abierto = idx >= 0 ? lista[idx] : null;
  const imagenAbierta = abierto ? miniaturas[abierto.id] : null;
  const propuestaAbierto = abierto ? propuestaDe(abierto) : null;
  const piezasPanel = prueba ?? propuestaAbierto ?? abierto?.piezasActuales ?? opcionesPiezas[0];
  const grillaPanel = imagenAbierta ? calcularGrilla(piezasPanel, imagenAbierta.aspecto) : null;
  const esActual = abierto && piezasPanel === abierto.piezasActuales;

  const abrir = (id) => {
    setAbiertoId(id);
    setPrueba(null);
  };

  // Aplicar su nivel actual equivale a sacarlo de la propuesta.
  const aplicar = () => onCambiarPropuesta(abierto.id, esActual ? null : piezasPanel);
  const quitar = () => {
    onCambiarPropuesta(abierto.id, null);
    setPrueba(null);
  };

  let textoAplicar;
  if (esActual) {
    textoAplicar = propuestaAbierto ? `Dejar en su nivel (${piezasPanel} piezas)` : `Su nivel actual: ${piezasPanel} piezas`;
  } else {
    textoAplicar = propuestaAbierto === piezasPanel ? `Aplicado: ${piezasPanel} piezas` : `Aplicar ${piezasPanel} piezas`;
  }
  const aplicarDeshabilitado = esActual ? !propuestaAbierto : propuestaAbierto === piezasPanel;

  return (
    <>
      {secciones.map((seccion) => (
        <section key={seccion.clave} className="romp-nivel-seccion">
          <h3 className="romp-nivel-titulo">
            {seccion.titulo}
            <span>{seccion.subtitulo}</span>
          </h3>
          <div className="romp-miniaturas">
            {seccion.rompecabezas.map((romp) => {
              const imagen = miniaturas[romp.id];
              const propuestas = propuestaDe(romp);
              // Se dibuja el corte propuesto o, si no hay, el de su nivel.
              const piezas = propuestas ?? romp.piezasActuales;
              const grilla = imagen && piezas ? calcularGrilla(piezas, imagen.aspecto) : null;
              let etiqueta = null;
              if (propuestas) {
                etiqueta = romp.piezasActuales ? `${romp.piezasActuales} → ${propuestas} piezas` : `${propuestas} piezas`;
              } else if (!romp.piezasActuales) {
                etiqueta = 'Sin elegir';
              }
              return (
                <figure key={romp.id} className="romp-miniatura-item">
                  <button
                    type="button"
                    className={`romp-afinar-mini${propuestas ? ' en-propuesta' : ''}`}
                    onClick={() => abrir(romp.id)}
                    aria-label={`Elegir piezas de ${romp.id}`}
                  >
                    {imagen ? (
                      <div className="romp-miniatura-marco">
                        <img src={imagen.src} alt="" className={`romp-miniatura romp-miniatura--${romp.orientacion}`} />
                        {grilla && <Corte grilla={grilla} piezas={piezas} />}
                      </div>
                    ) : (
                      <div className={`romp-miniatura romp-miniatura--${romp.orientacion} romp-miniatura--cargando`} />
                    )}
                  </button>
                  <figcaption>
                    <span className="romp-nivel-codigo">{romp.id}</span>
                    {etiqueta && (
                      <span className={`romp-afinar-etiqueta${propuestas ? ' elegida' : ''}`}>{etiqueta}</span>
                    )}
                    {grilla && !propuestas && (
                      <span className="romp-miniatura-orientacion">{grilla.columnas} × {grilla.filas}</span>
                    )}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      ))}

      <Drawer
        open={abierto !== null}
        onClose={() => setAbiertoId(null)}
        placement="right"
        size="min(560px, 92vw)"
        zIndex={zIndex}
        closable={false}
        destroyOnHidden
        rootClassName="romp-afinar-drawer"
        title={abierto && (
          <div className="romp-afinar-drawer-titulo">
            <button
              type="button"
              className="memory-cerrar-x memory-niveles-cerrar"
              onClick={() => abrir(lista[idx - 1].id)}
              disabled={idx <= 0}
              aria-label="Anterior"
            >
              <LeftOutlined />
            </button>
            <span>
              {abierto.id}
              <small>
                {idx + 1} de {lista.length}
                {abierto.piezasActuales ? ` · hoy en ${abierto.piezasActuales} piezas` : ' · sin nivel'}
              </small>
            </span>
            <button
              type="button"
              className="memory-cerrar-x memory-niveles-cerrar"
              onClick={() => abrir(lista[idx + 1].id)}
              disabled={idx >= lista.length - 1}
              aria-label="Siguiente"
            >
              <RightOutlined />
            </button>
            <button
              type="button"
              className="memory-cerrar-x memory-niveles-cerrar"
              onClick={() => setAbiertoId(null)}
              aria-label="Cerrar"
            >
              <CloseOutlined />
            </button>
          </div>
        )}
      >
        {abierto && (
          <div className="romp-afinar-panel">
            <div className="romp-afinar-imagen">
              {imagenAbierta ? (
                <div className="romp-miniatura-marco">
                  <img src={imagenAbierta.src} alt="" />
                  <Corte grilla={grillaPanel} piezas={piezasPanel} />
                </div>
              ) : (
                <PictureOutlined className="memory-picker-placeholder" aria-hidden="true" />
              )}
            </div>

            <div className="romp-afinar-opciones" role="group" aria-label="Cantidad de piezas">
              {opcionesPiezas.map((p) => (
                <button
                  type="button"
                  key={p}
                  className={`dif-dev-nivel${p === piezasPanel ? ' activo' : ''}${p === abierto.piezasActuales ? ' actual' : ''}`}
                  onClick={() => setPrueba(p)}
                >
                  {p}
                  <span>{p === abierto.piezasActuales ? 'piezas · actual' : 'piezas'}</span>
                </button>
              ))}
            </div>

            {grillaPanel && (
              <p className="romp-afinar-medidas">
                {grillaPanel.columnas} × {grillaPanel.filas}
                {imagenAbierta.ancho > 0
                  && ` · pieza de ${Math.round(imagenAbierta.ancho / grillaPanel.columnas)}×${Math.round(imagenAbierta.alto / grillaPanel.filas)} px`}
                {` · ${abierto.orientacion}`}
              </p>
            )}

            <div className="dif-dev-acciones">
              <button type="button" className="dif-dev-boton" onClick={aplicar} disabled={aplicarDeshabilitado}>
                {textoAplicar}
              </button>
              {propuestaAbierto && !esActual && (
                <button type="button" className="dif-dev-boton dif-dev-boton--suave" onClick={quitar}>
                  Quitar de la propuesta
                </button>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}

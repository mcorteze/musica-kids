import { useEffect, useRef, useState } from 'react';
import PintarCuadriculaEditor from './PintarCuadriculaEditor';
import { guardarBorradoresCuadricula, leerBorradoresCuadricula, textoCuadriculas } from '../utils/cuadriculasPintar';

function cargarElemento(cargar) {
  return cargar().then((m) => new Promise((resolve) => {
    const img = document.createElement('img');
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = m.default;
  }));
}

// Una imagen original: miniatura que abre el editor.
function TarjetaOriginal({ original, estado, onAbrir }) {
  const [img, setImg] = useState(null);
  useEffect(() => {
    let vivo = true;
    cargarElemento(original.cargar).then((el) => {
      if (vivo) setImg(el);
    });
    return () => {
      vivo = false;
    };
  }, [original]);
  return (
    <button type="button" className="pintar-grilla-tarjeta" onClick={() => img && onAbrir(img)} disabled={!img}>
      {img ? <img src={img.src} alt="" /> : <span className="gallery-empty">Cargando...</span>}
      <span className="pintar-grilla-tarjeta-nombre">{original.nombre}</span>
      {estado && <span className="pintar-dev-asignado">{estado}</span>}
    </button>
  );
}

// MODO DESARROLLADOR de "Pintar pixel art" (experimental, solo laptop):
// página "Establecer cuadrícula". Flujo:
// 1. Claude agrega la imagen que trae el usuario en
//    src/assets/pintar-pixel/<tema>/originales/<nombre>.avif.
// 2. El usuario la elige aquí y establece su cuadrícula (PintarCuadriculaEditor).
//    "Guardar" la deja en este navegador hasta "Copiar cuadrículas"
//    (al copiar se limpian: quedan entregadas).
// 3. El usuario se la pega a Claude, que la anota en src/data/pintarCuadriculas.js
//    y RECREA la lámina con herramientas/pintar_desde_cuadricula.py en
//    src/assets/pintar-pixel/<tema>/laminas/<nombre>.avif (1 pixel = 1 celda,
//    máx. 15 colores). La cuadrícula manda: no hay niveles.
export default function PintarPixelDev({ temas, cuadriculas }) {
  const [tabId, setTabId] = useState(null);
  const [borradores, setBorradores] = useState(leerBorradoresCuadricula);
  // { clave, img } de la imagen abierta en el editor.
  const [editando, setEditando] = useState(null);
  // false | 'ok' | 'error'
  const [copiado, setCopiado] = useState(false);
  const copiadoTimeoutRef = useRef(null);

  useEffect(() => {
    guardarBorradoresCuadricula(borradores);
  }, [borradores]);
  useEffect(() => () => clearTimeout(copiadoTimeoutRef.current), []);

  // Borradores que todavía no están (o difieren de lo) anotado en el código.
  const igual = (a, b) => a && b && ['x', 'y', 'ancho', 'alto', 'columnas', 'filas'].every((k) => Math.abs(a[k] - b[k]) < 0.005);
  const sinCopiar = Object.fromEntries(Object.entries(borradores).filter(([k, g]) => !igual(g, cuadriculas[k])));
  const cantidad = Object.keys(sinCopiar).length;

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
    const copiadas = Object.keys(sinCopiar);
    navigator.clipboard.writeText(textoCuadriculas(sinCopiar))
      .then(() => {
        avisar('ok');
        setBorradores((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !copiadas.includes(k))));
      })
      .catch(() => avisar('error'));
  };

  if (editando) {
    return (
      <PintarCuadriculaEditor
        img={editando.img}
        nombre={editando.clave}
        grillaGuardada={borradores[editando.clave] ?? cuadriculas[editando.clave] ?? null}
        onGuardar={(g) => {
          setBorradores((prev) => ({ ...prev, [editando.clave]: g }));
          setEditando(null);
        }}
        onQuitar={() => {
          setBorradores((prev) => {
            const copia = { ...prev };
            delete copia[editando.clave];
            return copia;
          });
          setEditando(null);
        }}
        onVolver={() => setEditando(null)}
      />
    );
  }

  const conOriginales = temas.filter((t) => t.originales.length > 0);
  const tema = conOriginales.find((t) => t.id === tabId) ?? conOriginales[0];
  return (
    <div className="dif-dev">
      <div className="pintar-dev-arriba">
        <h3 className="pintar-grilla-titulo">Establecer cuadrícula</h3>
        <div className="dif-dev-barra pintar-dev-propuesta">
          <span>
            Cuadrículas sin copiar: <strong>{cantidad}</strong>
          </span>
          <button type="button" className="dif-dev-boton" onClick={copiar} disabled={cantidad === 0}>
            {copiado === 'ok' ? '¡Copiado!' : 'Copiar cuadrículas'}
          </button>
          {copiado === 'error' && <span className="pintar-dev-error">No se pudo copiar</span>}
        </div>
      </div>
      {!tema ? (
        <p className="gallery-empty">No hay imágenes todavía.</p>
      ) : (
        <>
          <div className="romp-tabs" role="tablist" aria-label="Temas">
            {conOriginales.map((t) => (
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
          <div className="pintar-grilla-lista">
            {tema.originales.map((o) => {
              const clave = `${tema.id}/${o.nombre}`;
              const estado = sinCopiar[clave]
                ? 'Cuadrícula sin copiar'
                : tema.laminas.some((l) => l.nombre === o.nombre)
                  ? 'Lámina creada'
                  : cuadriculas[clave] ? 'Cuadrícula establecida' : null;
              return (
                <TarjetaOriginal
                  key={o.nombre}
                  original={o}
                  estado={estado}
                  onAbrir={(img) => setEditando({ clave, img })}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

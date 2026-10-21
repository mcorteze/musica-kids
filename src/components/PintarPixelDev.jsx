import { useEffect, useRef, useState } from 'react';
import { Checkbox } from 'antd';
import EstadoDevTabs from './EstadoDevTabs';
import PintarCuadriculaEditor from './PintarCuadriculaEditor';
import { elegirEstadoDev } from '../utils/estadoDev';
import {
  guardarBorradoresCuadricula,
  guardarDescartesPixel,
  guardarLimpiezasPixel,
  leerBorradoresCuadricula,
  leerDescartesPixel,
  leerLimpiezasPixel,
  textoCuadriculas,
} from '../utils/cuadriculasPintar';

function cargarElemento(cargar) {
  return cargar().then((m) => new Promise((resolve) => {
    const img = document.createElement('img');
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = m.default;
  }));
}

// Una imagen: miniatura que abre el editor sobre su ORIGINAL. En "Procesados"
// la miniatura es la lámina ya recreada (nítida, 1 pixel = 1 celda); en "En
// preparación" es el original. Ambas llevan su casilla "Descartar"; las de
// "Procesados" además "Requiere limpieza" (líneas o manchas raras en la lámina).
function TarjetaOriginal({ original, lamina, estado, descartada, onDescartar, limpiar, onLimpiar, onAbrir }) {
  const [img, setImg] = useState(null);
  const [vista, setVista] = useState(null);
  useEffect(() => {
    let vivo = true;
    cargarElemento(original.cargar).then((el) => {
      if (vivo) setImg(el);
    });
    if (lamina) {
      cargarElemento(lamina.cargar).then((el) => {
        if (vivo) setVista(el);
      });
    }
    return () => {
      vivo = false;
    };
  }, [original, lamina]);
  const miniatura = lamina ? vista : img;
  return (
    <div className={`pintar-grilla-tarjeta${descartada ? ' descartada' : ''}`}>
      <button type="button" className="pintar-grilla-abrir" onClick={() => img && onAbrir(img)} disabled={!img}>
        {miniatura
          ? <img src={miniatura.src} alt="" className={lamina ? 'pixel-nitida' : undefined} />
          : <span className="gallery-empty">Cargando...</span>}
        <span className="pintar-grilla-tarjeta-nombre">{original.nombre}</span>
      </button>
      {estado && <span className="pintar-dev-asignado">{estado}</span>}
      {onDescartar && (
        <Checkbox checked={descartada} onChange={onDescartar}>
          Descartar
        </Checkbox>
      )}
      {onLimpiar && (
        <Checkbox checked={limpiar} onChange={onLimpiar}>
          Requiere limpieza
        </Checkbox>
      )}
    </div>
  );
}

// MODO DESARROLLADOR de "Pintar pixel art" (juego oficial "Pintar por números"):
// página "Establecer cuadrícula". Flujo:
// 1. Claude agrega la imagen que trae el usuario en
//    src/assets/pintar-pixel/<tema>/originales/<nombre>.avif.
// 2. El usuario la elige aquí y establece su cuadrícula (PintarCuadriculaEditor).
//    "Guardar" la deja en este navegador hasta "Copiar"
//    (al copiar se limpian: quedan entregadas).
// 3. El usuario se la pega a Claude, que la anota en src/data/pintarCuadriculas.js
//    y RECREA la lámina con herramientas/pintar_desde_cuadricula.py en
//    src/assets/pintar-pixel/<tema>/laminas/<nombre>.avif (1 pixel = 1 celda,
//    máx. 15 colores). La cuadrícula manda: no hay niveles.
// Tabs "En preparación" (originales sin lámina; cada uno con "Descartar") /
// "Procesados" (ya tienen lámina: se ve la lámina para revisarla). En los dos
// se puede marcar "Descartar" y en "Procesados" también "Requiere limpieza":
// viajan en el mismo texto de "Copiar"; Claude borra el original (y la
// lámina, si ya la tenía) o limpia la lámina.
export default function PintarPixelDev({ temas: todosLosTemas, cuadriculas }) {
  const [estadoElegido, setEstadoElegido] = useState(null);
  const [tabId, setTabId] = useState(null);
  const [borradores, setBorradores] = useState(leerBorradoresCuadricula);
  const [descartes, setDescartes] = useState(leerDescartesPixel);
  const [limpiezas, setLimpiezas] = useState(leerLimpiezasPixel);
  // { clave, img } de la imagen abierta en el editor.
  const [editando, setEditando] = useState(null);
  // false | 'ok' | 'error'
  const [copiado, setCopiado] = useState(false);
  const copiadoTimeoutRef = useRef(null);

  useEffect(() => {
    guardarBorradoresCuadricula(borradores);
  }, [borradores]);
  useEffect(() => {
    guardarDescartesPixel(descartes);
  }, [descartes]);
  useEffect(() => {
    guardarLimpiezasPixel(limpiezas);
  }, [limpiezas]);
  useEffect(() => () => clearTimeout(copiadoTimeoutRef.current), []);

  // Borradores que todavía no están (o difieren de lo) anotado en el código.
  const igual = (a, b) => a && b && ['x', 'y', 'ancho', 'alto', 'columnas', 'filas'].every((k) => Math.abs(a[k] - b[k]) < 0.005);
  const sinCopiar = Object.fromEntries(Object.entries(borradores).filter(([k, g]) => !igual(g, cuadriculas[k])));
  const cantidad = Object.keys(sinCopiar).length + descartes.length + limpiezas.length;
  const alternar = (setLista) => (clave) => setLista((prev) => (prev.includes(clave) ? prev.filter((c) => c !== clave) : [...prev, clave]));
  const alternarDescarte = alternar(setDescartes);
  const alternarLimpieza = alternar(setLimpiezas);

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
    navigator.clipboard.writeText(textoCuadriculas(sinCopiar, descartes, limpiezas))
      .then(() => {
        avisar('ok');
        setBorradores((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !copiadas.includes(k))));
        setDescartes([]);
        setLimpiezas([]);
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

  const laminaDe = (t, o) => t.laminas.find((l) => l.nombre === o.nombre) ?? null;
  const temasPorEstado = (est) => todosLosTemas
    .map((t) => ({ ...t, originales: t.originales.filter((o) => !laminaDe(t, o) === (est === 'afinar')) }))
    .filter((t) => t.originales.length > 0);
  const temasAfinar = temasPorEstado('afinar');
  const temasListos = temasPorEstado('listos');
  const estado = elegirEstadoDev(estadoElegido, temasAfinar.length > 0);
  const temas = estado === 'afinar' ? temasAfinar : temasListos;
  const contar = (lista) => lista.reduce((t, x) => t + x.originales.length, 0);
  const tema = temas.find((t) => t.id === tabId) ?? temas[0];
  return (
    <div className="dif-dev">
      <div className="pintar-dev-arriba">
        <div className="pintar-grilla-encabezado">
          <h3 className="pintar-grilla-titulo">Establecer cuadrícula</h3>
          <EstadoDevTabs
            estado={estado}
            cantidades={{ afinar: contar(temasAfinar), listos: contar(temasListos) }}
            onChange={setEstadoElegido}
          />
        </div>
        <div className="dif-dev-barra pintar-dev-propuesta">
          <span>
            Cuadrículas sin copiar: <strong>{Object.keys(sinCopiar).length}</strong> · Descartes: <strong>{descartes.length}</strong> · Limpiezas: <strong>{limpiezas.length}</strong>
          </span>
          <button type="button" className="dif-dev-boton" onClick={copiar} disabled={cantidad === 0}>
            {copiado === 'ok' ? '¡Copiado!' : 'Copiar'}
          </button>
          {copiado === 'error' && <span className="pintar-dev-error">No se pudo copiar</span>}
        </div>
      </div>
      {!tema ? (
        <p className="gallery-empty">{estado === 'afinar' ? 'No hay imágenes por procesar.' : 'Todavía no hay láminas listas.'}</p>
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
          <div className="pintar-grilla-lista">
            {tema.originales.map((o) => {
              const clave = `${tema.id}/${o.nombre}`;
              const lamina = laminaDe(tema, o);
              const marca = sinCopiar[clave]
                ? 'Cuadrícula sin copiar'
                : !lamina && cuadriculas[clave] ? 'Cuadrícula establecida' : null;
              return (
                <TarjetaOriginal
                  key={`${estado}-${o.nombre}`}
                  original={o}
                  lamina={lamina}
                  estado={marca}
                  descartada={descartes.includes(clave)}
                  onDescartar={() => alternarDescarte(clave)}
                  limpiar={limpiezas.includes(clave)}
                  onLimpiar={lamina ? () => alternarLimpieza(clave) : null}
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

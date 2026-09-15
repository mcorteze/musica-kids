import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseOutlined } from '@ant-design/icons';

// Sin "eager": cada foto queda como su propio chunk (dynamic import), no se
// pide nada hasta que loader() se llama de verdad — eso pasa recien cuando
// se abre el drawer de esa galeria puntual (ver useEffect mas abajo), asi
// ninguna galeria de ningun grupo carga imagenes al abrir la app.
const loadersPorCarpeta = {};
for (const [path, loader] of Object.entries(
  import.meta.glob('../assets/*-gallery/*.{png,jpg,jpeg,webp,avif}')
)) {
  const match = path.match(/assets\/([a-z0-9-]+-gallery)\//);
  if (!match) continue;
  const carpeta = match[1];
  (loadersPorCarpeta[carpeta] ??= []).push([path, loader]);
}
for (const carpeta in loadersPorCarpeta) {
  loadersPorCarpeta[carpeta].sort(([a], [b]) => a.localeCompare(b));
}

// Boton + drawer lateral para la galeria de un grupo (Paw Patrol, Toy
// Story, Disney, el que sea): self-contenido como ToyChat. App.jsx solo
// decide para que grupo mostrarlo y con que folder/titulo/icono/color.
export default function GroupGallery({ folder, title, icon, headerGradient }) {
  const [open, setOpen] = useState(false);
  // null = todavia no se pidieron las imagenes de esta carpeta.
  const [imagenes, setImagenes] = useState(null);

  useEffect(() => {
    if (!open || imagenes !== null) return;
    let vivo = true;
    const entradas = loadersPorCarpeta[folder] ?? [];
    Promise.all(entradas.map(([, loader]) => loader().then((m) => m.default))).then(
      (urls) => {
        if (vivo) setImagenes(urls);
      }
    );
    return () => {
      vivo = false;
    };
  }, [open, imagenes, folder]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="theme-trigger-btn gallery-trigger-btn"
        aria-label={`Galeria de ${title}`}
      >
        <span className="gallery-trigger-icon" aria-hidden="true">{icon}</span>
      </button>

      {open && createPortal(
        <div className="gallery-overlay" onClick={() => setOpen(false)}>
          <div className="gallery-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="gallery-drawer-header" style={{ background: headerGradient }}>
              <h2>{title}</h2>
              <button
                type="button"
                className="gallery-cerrar-x"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                <CloseOutlined />
              </button>
            </div>

            <div className="gallery-body">
              {imagenes === null ? (
                <p className="gallery-empty">Cargando fotos...</p>
              ) : imagenes.length === 0 ? (
                <p className="gallery-empty">Muy pronto van a haber fotos aca.</p>
              ) : (
                imagenes.map((src) => (
                  <img key={src} src={src} alt="" className="gallery-img" loading="lazy" />
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

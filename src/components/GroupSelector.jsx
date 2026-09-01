import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  AppstoreOutlined,
  CheckCircleFilled,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import groups, { ALL_GROUPS } from '../data/groups';
import songs from '../data/songs';

// songs y groups son estaticos: el conteo se calcula una sola vez.
const counts = groups.reduce((acc, g) => {
  acc[g.id] = g.id === ALL_GROUPS
    ? songs.length
    : songs.filter((s) => s.groups?.includes(g.id)).length;
  return acc;
}, {});

export default function GroupSelector({ activeGroup, onChange }) {
  const [open, setOpen] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const trackRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  // Al abrir, dejar la tarjeta activa a la vista. scrollIntoView funciona
  // igual de bien centrando en el carrusel horizontal (desktop) que
  // ubicando la fila correcta en la grilla vertical de movil/tablet.
  useEffect(() => {
    if (!open) return;
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('.group-card.active');
    if (card) {
      card.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    updateEdges();
  }, [open, updateEdges]);

  const scrollByPage = useCallback((dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
  }, []);

  const handlePick = useCallback((id) => {
    onChange(id);
    setOpen(false);
  }, [onChange]);

  const filtering = activeGroup !== ALL_GROUPS;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`theme-trigger-btn ${filtering ? 'filtering' : ''}`}
        aria-label="Elegir musica"
      >
        <AppstoreOutlined />
      </button>

      {/* Portal a body: dentro del header el overlay no tomaba el viewport como
          bloque contenedor y el carrusel se salia de la pantalla en vertical. */}
      {open && createPortal(
        <div className="theme-modal-overlay" onClick={() => setOpen(false)}>
          <div className="theme-modal" onClick={(e) => e.stopPropagation()}>
            <div className="theme-modal-header">
              <h2>Elige tu musica</h2>
              <button
                type="button"
                className="theme-modal-close"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                <CloseOutlined />
              </button>
            </div>

            <div className="group-carousel">
              <button
                type="button"
                className="group-nav prev"
                onClick={() => scrollByPage(-1)}
                disabled={atStart}
                aria-label="Anterior"
              >
                <LeftOutlined />
              </button>

              <div className="group-track" ref={trackRef} onScroll={updateEdges}>
                {groups.map((g) => {
                  const isActive = g.id === activeGroup;
                  const count = counts[g.id];
                  return (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => handlePick(g.id)}
                      className={`group-card ${isActive ? 'active' : ''}`}
                      aria-label={g.name}
                      aria-pressed={isActive}
                    >
                      <span className="group-card-media">
                        {g.cover ? (
                          <>
                            {g.fit === 'contain' && (
                              <img className="group-card-blur" src={g.cover} alt="" aria-hidden="true" />
                            )}
                            <img
                              className={`group-card-img ${g.fit === 'contain' ? 'contain' : ''}`}
                              src={g.cover}
                              alt=""
                            />
                          </>
                        ) : (
                          <span className="group-card-all">
                            <AppstoreOutlined />
                          </span>
                        )}
                        {isActive && <CheckCircleFilled className="group-card-check" />}
                      </span>
                      <span className="group-card-label">
                        <span className="group-card-name">{g.name}</span>
                        <span className="group-card-count">
                          {count} {count === 1 ? 'cancion' : 'canciones'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="group-nav next"
                onClick={() => scrollByPage(1)}
                disabled={atEnd}
                aria-label="Siguiente"
              >
                <RightOutlined />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

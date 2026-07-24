import { useState, useEffect } from 'react';
import { BgColorsOutlined, CheckCircleFilled, CloseOutlined } from '@ant-design/icons';
import themes from '../themes';

const themeKeys = Object.keys(themes);

export default function ThemeSelector({ currentTheme, onChange, disabled }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (disabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="theme-trigger-btn"
        aria-label="Elegir tema"
      >
        <BgColorsOutlined />
      </button>

      {open && (
        <div className="theme-modal-overlay" onClick={() => setOpen(false)}>
          <div className="theme-modal" onClick={(e) => e.stopPropagation()}>
            <div className="theme-modal-header">
              <h2>Elige un tema</h2>
              <button
                type="button"
                className="theme-modal-close"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                <CloseOutlined />
              </button>
            </div>

            <div className="theme-grid">
              {themeKeys.map((key) => {
                const t = themes[key];
                const isActive = key === currentTheme;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => { onChange(key); setOpen(false); }}
                    className={`theme-card ${isActive ? 'active' : ''}`}
                    aria-label={t.name}
                  >
                    <img className="theme-card-img" src={t.cover} alt={t.name} />
                    {isActive && <CheckCircleFilled className="theme-card-check" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  CaretRightOutlined,
  PauseOutlined,
  StepForwardOutlined,
  StepBackwardOutlined,
  SwapOutlined,
  RedoOutlined,
  CloseOutlined,
  CustomerServiceOutlined,
  AppstoreOutlined,
  CheckCircleFilled,
  CarOutlined,
} from '@ant-design/icons';
import ScrubBar from './ScrubBar';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function DrivingMode({
  stage,
  song,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  shuffle,
  onShuffleToggle,
  repeat,
  onRepeatToggle,
  currentTime,
  duration,
  onSeek,
  groups,
  activeGroup,
  onPickGroup,
  onConfirm,
  onCancel,
  onExit,
}) {
  const pickerRef = useRef(null);

  // Al entrar, dejar el grupo activo a la vista sin que haya que buscarlo.
  // Calculado a mano (no scrollIntoView): .driving-screen tiene overflow
  // hidden para recortar el fondo, lo que lo vuelve "scrolleable" aunque no
  // se vea scrollbar, y scrollIntoView terminaba corriendolo tambien a el
  // (ademas del picker), desplazando todo el fondo unos pixeles.
  useEffect(() => {
    if (stage !== 'active') return;
    const el = pickerRef.current;
    if (!el) return;
    const card = el.querySelector('.driving-group-card.active');
    if (card) {
      el.scrollLeft = card.offsetLeft - (el.clientWidth - card.clientWidth) / 2;
    }
  }, [stage, activeGroup]);

  if (stage === 'confirm') {
    return createPortal(
      <div className="driving-confirm-overlay" onClick={onCancel}>
        <div className="driving-confirm-modal" onClick={(e) => e.stopPropagation()}>
          <CarOutlined className="driving-confirm-icon" aria-hidden="true" />
          <h2>¿Activar modo conducción?</h2>
          <div className="driving-confirm-actions">
            <button type="button" className="driving-confirm-btn ghost" onClick={onCancel}>
              Cancelar
            </button>
            <button type="button" className="driving-confirm-btn solid" onClick={onConfirm}>
              Activar
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="driving-screen">
      {song?.cover && (
        <>
          <img src={song.cover} className="driving-bg-img" alt="" aria-hidden="true" />
          <div className="driving-bg-gradient" />
        </>
      )}

      <div className="driving-content">
        <div className="driving-info">
          {song ? (
            <>
              <span className="driving-kicker">Reproduciendo</span>
              <h1 className="driving-title" title={song.title}>{song.title}</h1>
              <p className="driving-artist">{song.artist}</p>
            </>
          ) : (
            <>
              <div className="driving-empty-icon"><CustomerServiceOutlined /></div>
              <p className="driving-title">Elige un grupo para comenzar</p>
            </>
          )}
        </div>

        <div className="driving-middle">
          <div className="driving-controls">
            <button
              type="button"
              onClick={onPrev}
              className="driving-nav-btn"
              aria-label="Anterior"
              disabled={!song}
            >
              <StepBackwardOutlined />
            </button>

            <button
              type="button"
              onClick={onPlayPause}
              className="driving-play-btn"
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              disabled={!song}
            >
              {isPlaying ? <PauseOutlined /> : <CaretRightOutlined />}
            </button>

            <button
              type="button"
              onClick={onNext}
              className="driving-nav-btn"
              aria-label="Siguiente"
              disabled={!song}
            >
              <StepForwardOutlined />
            </button>
          </div>

          <div className="driving-progress">
            <span className="driving-time-label">{formatTime(currentTime)}</span>
            <ScrubBar
              value={currentTime}
              max={duration || 100}
              onChange={onSeek}
              ariaLabel="Progreso de la canción"
            />
            <span className="driving-time-label">{formatTime(duration)}</span>
          </div>

          <div className="driving-toggles">
            <button
              type="button"
              onClick={onShuffleToggle}
              className={`driving-toggle-btn ${shuffle ? 'active' : ''}`}
              aria-label="Aleatorio"
              aria-pressed={shuffle}
            >
              <SwapOutlined />
            </button>

            <button
              type="button"
              onClick={onRepeatToggle}
              className={`driving-toggle-btn ${repeat !== 'off' ? 'active' : ''}`}
              aria-label="Repetir"
              aria-pressed={repeat !== 'off'}
            >
              <RedoOutlined />
              {repeat === 'one' && <span className="repeat-one-badge">1</span>}
            </button>
          </div>
        </div>

        <div className="driving-group-picker" ref={pickerRef}>
          {groups.map((g) => {
            const isActive = g.id === activeGroup;
            return (
              <button
                type="button"
                key={g.id}
                onClick={() => onPickGroup(g.id)}
                className={`driving-group-card ${isActive ? 'active' : ''}`}
                aria-label={g.name}
                aria-pressed={isActive}
              >
                <span className="driving-group-card-media">
                  {g.cover ? (
                    <>
                      {g.fit === 'contain' && (
                        <img className="driving-group-card-blur" src={g.cover} alt="" aria-hidden="true" />
                      )}
                      <img
                        className={`driving-group-card-img ${g.fit === 'contain' ? 'contain' : ''}`}
                        src={g.cover}
                        alt=""
                      />
                    </>
                  ) : (
                    <span className="driving-group-card-all">
                      <AppstoreOutlined />
                    </span>
                  )}
                  {isActive && <CheckCircleFilled className="driving-group-card-check" />}
                </span>
                <span className="driving-group-card-name">{g.name}</span>
              </button>
            );
          })}
        </div>

        <button type="button" className="driving-exit-btn" onClick={onExit}>
          <CloseOutlined /> Salir de modo conducción
        </button>
      </div>
    </div>,
    document.body
  );
}

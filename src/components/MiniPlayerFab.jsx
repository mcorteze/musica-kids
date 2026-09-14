import {
  CaretRightOutlined,
  PauseOutlined,
  StepForwardOutlined,
  StepBackwardOutlined,
} from '@ant-design/icons';

// Reemplaza a PlayerBar mientras se ve el menu de grupos: la barra completa
// (info + progreso + volumen) le comia demasiado alto a la grilla, sobre
// todo en pantallas anchas y bajas (laptop/desktop). Este cluster flotante
// deja seguir controlando la reproduccion sin reservar ese espacio.
export default function MiniPlayerFab({ isPlaying, onPlayPause, onNext, onPrev }) {
  return (
    <div className="mini-player-fab">
      <button type="button" onClick={onPrev} className="control-btn" aria-label="Anterior">
        <StepBackwardOutlined />
      </button>
      <button
        type="button"
        onClick={onPlayPause}
        className="play-btn"
        aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
      >
        {isPlaying ? <PauseOutlined /> : <CaretRightOutlined />}
      </button>
      <button type="button" onClick={onNext} className="control-btn" aria-label="Siguiente">
        <StepForwardOutlined />
      </button>
    </div>
  );
}

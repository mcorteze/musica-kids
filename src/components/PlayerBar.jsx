import {
  CaretRightOutlined,
  PauseOutlined,
  StepForwardOutlined,
  StepBackwardOutlined,
  SoundOutlined,
  SoundFilled,
  CustomerServiceOutlined,
} from '@ant-design/icons';
import ScrubBar from './ScrubBar';

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerBar({
  song,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  currentTime,
  duration,
  onSeek,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}) {
  return (
    <div className="player-bar">
      <div className="player-bar-now">
        {song ? (
          <>
            <div className="player-bar-art">
              {song.cover ? (
                <img src={song.cover} alt="" />
              ) : (
                <CustomerServiceOutlined />
              )}
            </div>
            <div className="player-bar-info">
              <span className="player-bar-title" title={song.title}>{song.title}</span>
              <span className="player-bar-artist">{song.artist}</span>
            </div>
          </>
        ) : (
          <span className="player-bar-placeholder">Nada sonando</span>
        )}
      </div>

      <div className="player-bar-center">
        <div className="player-bar-controls">
          <button type="button" onClick={onPrev} className="control-btn" aria-label="Anterior" disabled={!song}>
            <StepBackwardOutlined />
          </button>

          <button type="button" onClick={onPlayPause} className="play-btn" aria-label={isPlaying ? 'Pausar' : 'Reproducir'} disabled={!song}>
            {isPlaying ? <PauseOutlined /> : <CaretRightOutlined />}
          </button>

          <button type="button" onClick={onNext} className="control-btn" aria-label="Siguiente" disabled={!song}>
            <StepForwardOutlined />
          </button>
        </div>

        <div className="player-bar-progress">
          <span className="time-label">{formatTime(currentTime)}</span>
          <ScrubBar
            value={currentTime}
            max={duration || 100}
            onChange={onSeek}
            ariaLabel="Progreso de la cancion"
          />
          <span className="time-label">{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-bar-volume">
        <button
          type="button"
          onClick={onToggleMute}
          className="volume-btn"
          aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
        >
          {isMuted || volume === 0 ? <SoundOutlined /> : <SoundFilled />}
        </button>
        <ScrubBar
          value={isMuted ? 0 : volume}
          max={100}
          onChange={onVolumeChange}
          ariaLabel="Volumen"
        />
      </div>
    </div>
  );
}

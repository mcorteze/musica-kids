import {
  CaretRightOutlined,
  PauseOutlined,
  SwapOutlined,
  RedoOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';

export default function AlbumHeader({
  song,
  isPlaying,
  onPlayPause,
  shuffle,
  onShuffleToggle,
  repeat,
  onRepeatToggle,
  songCount,
}) {
  if (!song) {
    return (
      <div className="album-header empty">
        <div className="empty-player-icon">
          <CustomerServiceOutlined />
        </div>
        <p className="empty-player-title">Selecciona una cancion</p>
        <p className="empty-player-subtitle">Elige algo de la lista para comenzar</p>
      </div>
    );
  }

  return (
    <div className="album-header">
      {song.cover && (
        <>
          <img src={song.cover} className="album-header-bg-img" alt="" aria-hidden="true" />
          <div className="album-header-bg-gradient" />
        </>
      )}

      <div className="album-header-top">
        <div className="album-cover">
          {song.cover ? (
            <img src={song.cover} alt="" />
          ) : (
            <CustomerServiceOutlined className="album-cover-fallback" />
          )}
        </div>

        <div className="album-meta">
          <span className="album-kicker">Reproduciendo</span>
          <h1 className="album-title" title={song.title}>{song.title}</h1>
          <div className="album-sub">
            <span className="album-artist">{song.artist}</span>
            <span className="album-dot">•</span>
            <span>{songCount} {songCount === 1 ? 'cancion' : 'canciones'}</span>
          </div>
        </div>
      </div>

      <div className="album-actions">
        <button
          type="button"
          onClick={onPlayPause}
          className="album-play-btn"
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? <PauseOutlined /> : <CaretRightOutlined />}
        </button>

        <button
          type="button"
          onClick={onShuffleToggle}
          className={`album-action-btn ${shuffle ? 'active' : ''}`}
          aria-label="Aleatorio"
          aria-pressed={shuffle}
        >
          <SwapOutlined />
        </button>

        <button
          type="button"
          onClick={onRepeatToggle}
          className={`album-action-btn ${repeat !== 'off' ? 'active' : ''}`}
          aria-label="Repetir"
          aria-pressed={repeat !== 'off'}
        >
          <RedoOutlined />
          {repeat === 'one' && <span className="repeat-one-badge">1</span>}
        </button>
      </div>
    </div>
  );
}

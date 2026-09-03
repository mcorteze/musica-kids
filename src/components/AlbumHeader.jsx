import { Tooltip } from 'antd';
import {
  CaretRightOutlined,
  PauseOutlined,
  SwapOutlined,
  RedoOutlined,
  CustomerServiceOutlined,
  LikeFilled,
  LikeOutlined,
  HeartFilled,
  HeartOutlined,
} from '@ant-design/icons';
import { GiUnicorn } from 'react-icons/gi';

export default function AlbumHeader({
  song,
  isPlaying,
  onPlayPause,
  shuffle,
  onShuffleToggle,
  repeat,
  onRepeatToggle,
  songCount,
  liked,
  onToggleLike,
  loved,
  onToggleLove,
  unicorned,
  onToggleUnicorn,
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

      <div className="album-header-content">
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
          <Tooltip title={isPlaying ? 'Pausar' : 'Reproducir'}>
            <button
              type="button"
              onClick={onPlayPause}
              className="album-play-btn"
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? <PauseOutlined /> : <CaretRightOutlined />}
            </button>
          </Tooltip>

          <Tooltip title="Aleatorio">
            <button
              type="button"
              onClick={onShuffleToggle}
              className={`album-action-btn ${shuffle ? 'active' : ''}`}
              aria-label="Aleatorio"
              aria-pressed={shuffle}
            >
              <SwapOutlined />
            </button>
          </Tooltip>

          <Tooltip title="Repetir">
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
          </Tooltip>

          <Tooltip title={liked ? '' : 'Me gusta'}>
            <button
              type="button"
              onClick={onToggleLike}
              className={`album-action-btn like-btn ${liked ? 'active liked' : ''}`}
              aria-label="Me gusta"
              aria-pressed={liked}
            >
              {liked ? <LikeFilled /> : <LikeOutlined />}
            </button>
          </Tooltip>

          <Tooltip title={loved ? '' : 'Me encanta'}>
            <button
              type="button"
              onClick={onToggleLove}
              className={`album-action-btn heart-btn ${loved ? 'active loved' : ''}`}
              aria-label="Me encanta"
              aria-pressed={loved}
            >
              {loved ? <HeartFilled /> : <HeartOutlined />}
            </button>
          </Tooltip>

          <Tooltip title={unicorned ? '' : '¡Es mágica!'}>
            <button
              type="button"
              onClick={onToggleUnicorn}
              className={`album-action-btn unicorn-btn ${unicorned ? 'active unicorned' : ''}`}
              aria-label="¡Es mágica!"
              aria-pressed={unicorned}
            >
              <GiUnicorn />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

import { PlayCircleFilled, PauseCircleFilled, CustomerServiceOutlined } from '@ant-design/icons';

export default function Playlist({ songs, currentSong, isPlaying, onSelect }) {
  if (songs.length === 0) {
    return (
      <div className="playlist-empty">
        <p>Aun no hay canciones aqui.</p>
      </div>
    );
  }

  return (
    <div className="playlist-list">
      {songs.map((song, index) => {
        const isActive = currentSong?.id === song.id;
        return (
          <button
            type="button"
            key={song.id}
            onClick={() => onSelect(song)}
            className={`song-row ${isActive ? 'active' : ''}`}
          >
            <span className="song-row-index">
              {isActive ? (
                isPlaying ? <PauseCircleFilled /> : <PlayCircleFilled />
              ) : (
                index + 1
              )}
            </span>

            <span className="song-row-art">
              {song.cover ? (
                <img src={song.cover} alt="" />
              ) : (
                <CustomerServiceOutlined className="song-row-art-fallback" />
              )}
            </span>

            <span className="song-row-info">
              <span className="song-row-title">{song.title}</span>
              <span className="song-row-artist">{song.artist}</span>
            </span>

            {isActive && (
              <span className="song-row-live" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

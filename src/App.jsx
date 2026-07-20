import { useState, useCallback, useMemo, useEffect } from 'react';
import { ConfigProvider } from 'antd';
import { CustomerServiceOutlined } from '@ant-design/icons';
import AlbumHeader from './components/AlbumHeader';
import PlayerBar from './components/PlayerBar';
import Playlist from './components/Playlist';
import ThemeSelector from './components/ThemeSelector';
import ChildLock from './components/ChildLock';
import useAudioPlayer from './hooks/useAudioPlayer';
import themes from './themes';
import songs from './data/songs';
import 'antd/dist/reset.css';
import './App.css';

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function App() {
  const [currentTheme, setCurrentTheme] = useState('sky');
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off');
  const [childMode, setChildMode] = useState(false);

  const theme = themes[currentTheme];

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent-color', theme.accentColor);
    root.style.setProperty('--accent-rgb', theme.accentRgb);
    root.style.setProperty('--player-bg', theme.playerBg);
    root.style.setProperty('--player-overlay-rgb', theme.playerOverlayRgb);
    root.style.setProperty('--ant-color-text', theme.token.colorText);
    root.style.setProperty('--ant-color-text-secondary', theme.token.colorTextSecondary);
    root.style.setProperty('--ant-color-border', theme.token.colorBorder);
    root.style.setProperty('--ant-color-bg-container', theme.token.colorBgContainer);
    root.style.setProperty('--ant-color-primary', theme.token.colorPrimary);
  }, [theme]);

  const shuffledOrder = useMemo(() => {
    if (shuffle) return shuffleArray(songs.map((s) => s.id));
    return songs.map((s) => s.id);
  }, [shuffle]);

  const currentIndex = useMemo(() => {
    if (!currentSong) return -1;
    return shuffledOrder.indexOf(currentSong.id);
  }, [currentSong, shuffledOrder]);

  const handleSelectSong = useCallback((song) => {
    setCurrentSong(song);
    setIsPlaying(true);
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => (currentSong ? !prev : prev));
  }, [currentSong]);

  const handleNext = useCallback(() => {
    if (songs.length === 0) return;
    if (repeat === 'off' && currentIndex === songs.length - 1 && !shuffle) {
      setIsPlaying(false);
      return;
    }
    const nextIndex = (currentIndex + 1) % songs.length;
    const nextId = shuffledOrder[nextIndex];
    const nextSong = songs.find((s) => s.id === nextId);
    if (nextSong) {
      setCurrentSong(nextSong);
      setIsPlaying(true);
    }
  }, [currentIndex, shuffledOrder, repeat]);

  const handlePrev = useCallback(() => {
    if (songs.length === 0) return;
    const prevIndex = currentIndex <= 0 ? songs.length - 1 : currentIndex - 1;
    const prevId = shuffledOrder[prevIndex];
    const prevSong = songs.find((s) => s.id === prevId);
    if (prevSong) {
      setCurrentSong(prevSong);
      setIsPlaying(true);
    }
  }, [currentIndex, shuffledOrder]);

  const handleShuffleToggle = useCallback(() => {
    setShuffle((prev) => !prev);
  }, []);

  const handleRepeatToggle = useCallback(() => {
    setRepeat((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const handleThemeChange = useCallback((value) => {
    setCurrentTheme(value);
  }, []);

  const handleChildModeChange = useCallback((isChild) => {
    setChildMode(isChild);
  }, []);

  const {
    audioRef,
    currentTime,
    duration,
    volume,
    isMuted,
    handleSeek,
    handleVolumeChange,
    toggleMute,
  } = useAudioPlayer({ song: currentSong, isPlaying, onNext: handleNext, repeat });

  return (
    <ConfigProvider
      theme={{
        token: theme.token,
      }}
    >
      <div className="app-shell" style={{ background: theme.gradient }}>
        {currentSong && <audio ref={audioRef} src={currentSong.file} preload="metadata" />}

        <header className="app-header" style={theme.headerStyle}>
          <div className="app-brand">
            <CustomerServiceOutlined className="app-brand-icon" />
            <span className="app-brand-name">Musica de Sofia</span>
          </div>
          <div className="header-actions">
            <ThemeSelector
              currentTheme={currentTheme}
              onChange={handleThemeChange}
              disabled={childMode}
            />
            <ChildLock onChildModeChange={handleChildModeChange} />
          </div>
        </header>

        <main className="app-content">
          <div className="album-surface" style={{ background: theme.playerBg }}>
            <AlbumHeader
              song={currentSong}
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              shuffle={shuffle}
              onShuffleToggle={handleShuffleToggle}
              repeat={repeat}
              onRepeatToggle={handleRepeatToggle}
              songCount={songs.length}
            />
          </div>

          <section className="playlist-surface">
            <div className="playlist-columns">
              <span className="playlist-col-index">#</span>
              <span className="playlist-col-title">Titulo</span>
            </div>
            <Playlist
              songs={songs}
              currentSong={currentSong}
              isPlaying={isPlaying}
              onSelect={handleSelectSong}
            />
          </section>
        </main>

        <PlayerBar
          song={currentSong}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onNext={handleNext}
          onPrev={handlePrev}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={handleVolumeChange}
          onToggleMute={toggleMute}
        />
      </div>
    </ConfigProvider>
  );
}

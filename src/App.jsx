import { useState, useCallback, useMemo, useEffect } from 'react';
import { ConfigProvider } from 'antd';
import { CustomerServiceOutlined, CarOutlined } from '@ant-design/icons';
import AlbumHeader from './components/AlbumHeader';
import PlayerBar from './components/PlayerBar';
import Playlist from './components/Playlist';
import GroupSelector from './components/GroupSelector';
import ToyChat from './components/ToyChat';
import DrivingMode from './components/DrivingMode';
import useAudioPlayer from './hooks/useAudioPlayer';
import useLikedSongs from './hooks/useLikedSongs';
import useLovedSongs from './hooks/useLovedSongs';
import useWakeLock from './hooks/useWakeLock';
import themes from './themes';
import songs from './data/songs';
import groups, { ALL_GROUPS } from './data/groups';
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
  const [activeGroup, setActiveGroup] = useState(ALL_GROUPS);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off');
  const [drivingStage, setDrivingStage] = useState('off'); // 'off' | 'confirm' | 'active'

  // El grupo manda: define tanto el filtro de la lista como la paleta de colores.
  const group = useMemo(
    () => groups.find((g) => g.id === activeGroup) ?? groups[0],
    [activeGroup]
  );
  const theme = themes[group.theme];

  const getGroupSongs = useCallback((groupId) => {
    const visible = groupId === ALL_GROUPS
      ? songs
      : songs.filter((s) => s.groups?.includes(groupId));
    return [...visible].sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
  }, []);

  const sortedSongs = useMemo(() => getGroupSongs(activeGroup), [activeGroup, getGroupSongs]);

  // Precarga silenciosa: sin esto, cada carátula recién se pedía al
  // navegador cuando el usuario la veía por primera vez (menu de grupos o
  // reproductor), y se notaba un parpadeo de carga al navegar. Al pedirlas
  // todas de una vez apenas abre la app, el navegador ya las tiene en
  // cache cuando el usuario llega a verlas.
  useEffect(() => {
    const urls = new Set();
    songs.forEach((s) => { if (s.cover) urls.add(s.cover); });
    groups.forEach((g) => { if (g.cover) urls.add(g.cover); });
    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent-color', theme.accentColor);
    root.style.setProperty('--accent-rgb', theme.accentRgb);
    root.style.setProperty('--accent-ink', theme.accentInk);
    root.style.setProperty('--scrollbar-rgb', theme.scrollbarRgb);
    root.style.setProperty('--player-bg', theme.playerBg);
    root.style.setProperty('--player-overlay-rgb', theme.playerOverlayRgb);
    root.style.setProperty('--ant-color-text', theme.token.colorText);
    root.style.setProperty('--ant-color-text-secondary', theme.token.colorTextSecondary);
    root.style.setProperty('--ant-color-border', theme.token.colorBorder);
    root.style.setProperty('--ant-color-bg-container', theme.token.colorBgContainer);
    root.style.setProperty('--ant-color-primary', theme.token.colorPrimary);
    root.style.setProperty('--list-text-color', theme.listTextColor || theme.token.colorText);
    root.style.setProperty('--list-text-secondary', theme.listTextSecondary || theme.token.colorTextSecondary);
    root.style.setProperty('--list-text-shadow', theme.listTextShadow || 'none');
  }, [theme]);

  const shuffledOrder = useMemo(() => {
    if (shuffle) return shuffleArray(sortedSongs.map((s) => s.id));
    return sortedSongs.map((s) => s.id);
  }, [shuffle, sortedSongs]);

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
    if (sortedSongs.length === 0) return;
    if (repeat === 'off' && currentIndex === sortedSongs.length - 1 && !shuffle) {
      setIsPlaying(false);
      return;
    }
    const nextIndex = (currentIndex + 1) % sortedSongs.length;
    const nextId = shuffledOrder[nextIndex];
    const nextSong = sortedSongs.find((s) => s.id === nextId);
    if (nextSong) {
      setCurrentSong(nextSong);
      setIsPlaying(true);
    }
  }, [currentIndex, shuffledOrder, repeat, sortedSongs]);

  const handlePrev = useCallback(() => {
    if (sortedSongs.length === 0) return;
    const prevIndex = currentIndex <= 0 ? sortedSongs.length - 1 : currentIndex - 1;
    const prevId = shuffledOrder[prevIndex];
    const prevSong = sortedSongs.find((s) => s.id === prevId);
    if (prevSong) {
      setCurrentSong(prevSong);
      setIsPlaying(true);
    }
  }, [currentIndex, shuffledOrder, sortedSongs]);

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

  const handleOpenDrivingConfirm = useCallback(() => setDrivingStage('confirm'), []);
  const handleCancelDriving = useCallback(() => setDrivingStage('off'), []);
  const handleConfirmDriving = useCallback(() => setDrivingStage('active'), []);
  const handleExitDriving = useCallback(() => setDrivingStage('off'), []);

  // Desde el modo conduccion no hay lista para elegir una cancion puntual:
  // se elige un grupo (carrusel de caratulas) y arranca directo en la
  // primera cancion de ese grupo.
  const handleDrivingPickGroup = useCallback((groupId) => {
    setActiveGroup(groupId);
    const firstSong = getGroupSongs(groupId)[0];
    if (firstSong) {
      setCurrentSong(firstSong);
      setIsPlaying(true);
    }
  }, [getGroupSongs]);

  useWakeLock(drivingStage === 'active');

  // Cambiar de grupo no interrumpe lo que suena: la cancion actual sigue hasta
  // el final y recien ahi (o al tocar "siguiente") pasa a la primera del filtro.
  const handleGroupChange = useCallback((value) => {
    setActiveGroup(value);
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

  const { isLiked, toggleLike } = useLikedSongs();
  const { isLoved, toggleLove } = useLovedSongs();

  const handleToggleLike = useCallback(() => {
    if (currentSong) toggleLike(currentSong.id);
  }, [currentSong, toggleLike]);

  const handleToggleLove = useCallback(() => {
    if (currentSong) toggleLove(currentSong.id);
  }, [currentSong, toggleLove]);

  return (
    <ConfigProvider
      theme={{
        token: theme.token,
      }}
    >
      <div className="app-shell" style={{ background: theme.gradient }} inert={drivingStage !== 'off'}>
        {currentSong && <audio ref={audioRef} src={currentSong.file} preload="metadata" />}

        <header className="app-header" style={theme.headerStyle}>
          <div className="app-brand">
            <CustomerServiceOutlined className="app-brand-icon" />
            <span className="app-brand-name">Musica de Sofia</span>
          </div>
          <div className="header-actions">
            {/* ChildLock (pantalla completa + candado) sacado por ahora.
                El componente sigue en src/components/ para retomarlo despues. */}
            <ToyChat />
            <button
              type="button"
              onClick={handleOpenDrivingConfirm}
              className="theme-trigger-btn driving-trigger-btn"
              aria-label="Modo conducción"
            >
              <CarOutlined />
            </button>
            <GroupSelector
              activeGroup={activeGroup}
              onChange={handleGroupChange}
            />
          </div>
        </header>

        <main className="app-content">
          <div className="main-columns">
            <div className="album-surface" style={{ background: theme.playerBg }}>
              <AlbumHeader
                song={currentSong}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                shuffle={shuffle}
                onShuffleToggle={handleShuffleToggle}
                repeat={repeat}
                onRepeatToggle={handleRepeatToggle}
                songCount={sortedSongs.length}
                liked={currentSong ? isLiked(currentSong.id) : false}
                onToggleLike={handleToggleLike}
                loved={currentSong ? isLoved(currentSong.id) : false}
                onToggleLove={handleToggleLove}
              />
            </div>

            <section className="playlist-surface">
              <Playlist
                songs={sortedSongs}
                currentSong={currentSong}
                isPlaying={isPlaying}
                onSelect={handleSelectSong}
              />
            </section>
          </div>
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

        {drivingStage !== 'off' && (
          <DrivingMode
            stage={drivingStage}
            song={currentSong}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onNext={handleNext}
            onPrev={handlePrev}
            shuffle={shuffle}
            onShuffleToggle={handleShuffleToggle}
            repeat={repeat}
            onRepeatToggle={handleRepeatToggle}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            groups={groups}
            activeGroup={activeGroup}
            onPickGroup={handleDrivingPickGroup}
            onConfirm={handleConfirmDriving}
            onCancel={handleCancelDriving}
            onExit={handleExitDriving}
          />
        )}
      </div>
    </ConfigProvider>
  );
}

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ConfigProvider } from 'antd';
import { CustomerServiceOutlined, CarOutlined, LeftOutlined } from '@ant-design/icons';
import AlbumHeader from './components/AlbumHeader';
import PlayerBar from './components/PlayerBar';
import MiniPlayerFab from './components/MiniPlayerFab';
import Playlist from './components/Playlist';
import GroupMenuPage from './components/GroupMenuPage';
import ToyChat from './components/ToyChat';
import GroupGallery from './components/GroupGallery';
import DrivingMode from './components/DrivingMode';
import MemoryGame from './components/MemoryGame';
import useAudioPlayer from './hooks/useAudioPlayer';
import useLikedSongs from './hooks/useLikedSongs';
import useLovedSongs from './hooks/useLovedSongs';
import useUnicornSongs from './hooks/useUnicornSongs';
import useStarredSongs from './hooks/useStarredSongs';
import useWakeLock from './hooks/useWakeLock';
import themes from './themes';
import songs from './data/songs';
import groups, { ALL_GROUPS } from './data/groups';
import 'antd/dist/reset.css';
import './App.css';

// Que grupos tienen galeria de fotos y en que carpeta de src/assets/ estan
// (ver skills/agregar-imagen-galeria.md). Titulo/icono/color de cada una
// salen del propio grupo/tema activo, no hace falta repetirlos aca.
const GALLERY_FOLDERS = {
  'paw-patrol': 'paw-patrol-gallery',
  'toy-story': 'toy-story-gallery',
  disney: 'disney-gallery',
  '31-minutos': '31-minutos-gallery',
  bluey: 'bluey-gallery',
  munecas: 'munecas-gallery',
  gimnasia: 'gimnasia-gallery',
  'efecto-n': 'efecto-n-gallery',
  'perro-chocolo': 'perro-chocolo-gallery',
  varias: 'varias-gallery',
};

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
  // Pagina de entrada en todos los responsives: al cargar se ve la grilla de
  // grupos en vez del reproductor.
  const [showGroupMenu, setShowGroupMenu] = useState(true);

  // El grupo manda: define tanto el filtro de la lista como la paleta de colores.
  const group = useMemo(
    () => groups.find((g) => g.id === activeGroup) ?? groups[0],
    [activeGroup]
  );
  const theme = themes[group.theme];
  // La pantalla de inicio (menu de grupos) no debe heredar el color del
  // ultimo grupo elegido — eso la hacia verse distinta cada vez que se
  // volvia a ella. Queda fija con look "princesa"/Skye (rosa), sea cual sea
  // activeGroup — se reusa el tema 'sky' completo (no solo el gradiente)
  // porque su colorText ya esta pensado para fondo claro: el tema Disney
  // real (fondo oscuro) sigue intacto para cuando se elige ese grupo.
  const menuTheme = themes.sky;

  const getGroupSongs = useCallback((groupId) => {
    const visible = groupId === ALL_GROUPS
      ? songs
      : songs.filter((s) => s.groups?.includes(groupId));
    return [...visible].sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
  }, []);

  const sortedSongs = useMemo(() => getGroupSongs(activeGroup), [activeGroup, getGroupSongs]);

  // Precarga silenciosa de las caratulas del grupo activo: evita el
  // parpadeo de carga al entrar a esa lista de canciones. Las portadas del
  // menu de grupos no necesitan este truco (esas ya se piden solas al
  // pintar GroupMenuPage). Antes se precargaba TODA la app de una (todas
  // las canciones de todos los grupos, se hayan abierto o no) — ahora es
  // solo el grupo que realmente se eligio.
  useEffect(() => {
    const urls = new Set();
    sortedSongs.forEach((s) => { if (s.cover) urls.add(s.cover); });
    urls.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, [sortedSongs]);

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

  // El boton "siguiente" (toque manual) siempre da la vuelta al llegar al
  // final del grupo activo, sin importar el modo de repetir — igual que
  // "anterior". El modo repetir solo decide que pasa cuando una cancion
  // termina sola (ver handleSongEnded), no cuando el usuario navega.
  const handleNext = useCallback(() => {
    if (sortedSongs.length === 0) return;
    const nextIndex = (currentIndex + 1) % sortedSongs.length;
    const nextId = shuffledOrder[nextIndex];
    const nextSong = sortedSongs.find((s) => s.id === nextId);
    if (nextSong) {
      setCurrentSong(nextSong);
      setIsPlaying(true);
    }
  }, [currentIndex, shuffledOrder, sortedSongs]);

  // Cuando la cancion termina sola (no por toque del usuario): si "repetir"
  // esta apagado y ya estabamos en la ultima del grupo, se detiene en vez
  // de reiniciar el ciclo solo.
  const handleSongEnded = useCallback(() => {
    if (sortedSongs.length === 0) return;
    if (repeat === 'off' && currentIndex === sortedSongs.length - 1 && !shuffle) {
      setIsPlaying(false);
      return;
    }
    handleNext();
  }, [currentIndex, sortedSongs, repeat, shuffle, handleNext]);

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

  // Elegir un grupo en la pagina de menu la cierra y pasa al reproductor
  // (cambiar de grupo no interrumpe lo que suena: la cancion actual sigue
  // hasta el final y recien ahi, o al tocar "siguiente", pasa a la primera
  // del filtro). El boton de volver del header la vuelve a abrir.
  const handleMenuPickGroup = useCallback((value) => {
    setActiveGroup(value);
    setShowGroupMenu(false);
  }, []);

  const handleOpenGroupMenu = useCallback(() => setShowGroupMenu(true), []);

  const {
    audioRef,
    currentTime,
    duration,
    volume,
    isMuted,
    handleSeek,
    handleVolumeChange,
    toggleMute,
  } = useAudioPlayer({ song: currentSong, isPlaying, onNext: handleSongEnded, repeat });

  const { isLiked, toggleLike } = useLikedSongs();
  const { isLoved, toggleLove } = useLovedSongs();
  const { isUnicorned, toggleUnicorn } = useUnicornSongs();
  const { isStarred, toggleStar } = useStarredSongs();

  const handleToggleLike = useCallback(() => {
    if (currentSong) toggleLike(currentSong.id);
  }, [currentSong, toggleLike]);

  const handleToggleLove = useCallback(() => {
    if (currentSong) toggleLove(currentSong.id);
  }, [currentSong, toggleLove]);

  const handleToggleUnicorn = useCallback(() => {
    if (currentSong) toggleUnicorn(currentSong.id);
  }, [currentSong, toggleUnicorn]);

  const handleToggleStar = useCallback(() => {
    if (currentSong) toggleStar(currentSong.id);
  }, [currentSong, toggleStar]);

  return (
    <ConfigProvider
      theme={{
        token: theme.token,
      }}
    >
      <div
        className={`app-shell${showGroupMenu ? ' menu-open' : ''}`}
        style={{ background: showGroupMenu ? menuTheme.gradient : theme.gradient }}
        inert={drivingStage !== 'off'}
      >
        {currentSong && <audio ref={audioRef} src={currentSong.file} preload="metadata" />}

        {/* Sin fondo propio en la pantalla de inicio: se deja ver el
            gradiente Disney del app-shell de atras en vez de un color de
            header aparte. */}
        <header className="app-header" style={showGroupMenu ? { background: 'transparent' } : theme.headerStyle}>
          <div className="app-header-left">
            {/* Un icono de volver es mas comprensible que tocar el logo para
                quien todavia no lee. Solo aparece cuando hay algo a que
                volver, es decir cuando el menu esta cerrado. */}
            {!showGroupMenu && (
              <button
                type="button"
                className="theme-trigger-btn header-back-btn"
                onClick={handleOpenGroupMenu}
                aria-label="Volver al menu"
              >
                <LeftOutlined />
              </button>
            )}
            <div className="app-brand">
              <CustomerServiceOutlined className="app-brand-icon" />
              <span className="app-brand-name">Musica de Sofia</span>
            </div>
          </div>
          <div className="header-actions">
            {/* Solo dentro del reproductor de un grupo con galeria (no en el
                menu de grupos), a la izquierda del boton de chat. */}
            {GALLERY_FOLDERS[activeGroup] && !showGroupMenu && (
              <GroupGallery
                folder={GALLERY_FOLDERS[activeGroup]}
                title={group.name}
                icon={theme.icon}
                headerGradient={theme.headerStyle.background}
              />
            )}
            {/* ChildLock (pantalla completa + candado) sacado por ahora.
                El componente sigue en src/components/ para retomarlo despues. */}
            <ToyChat />
            <MemoryGame />
            <button
              type="button"
              onClick={handleOpenDrivingConfirm}
              className="theme-trigger-btn driving-trigger-btn"
              aria-label="Modo conducción"
            >
              <CarOutlined />
            </button>
          </div>
        </header>

        <GroupMenuPage activeGroup={activeGroup} onPick={handleMenuPickGroup} />

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
                unicorned={currentSong ? isUnicorned(currentSong.id) : false}
                onToggleUnicorn={handleToggleUnicorn}
                starred={currentSong ? isStarred(currentSong.id) : false}
                onToggleStar={handleToggleStar}
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

        {showGroupMenu ? (
          // La barra completa le resta demasiado alto a la grilla en el
          // menu (sobre todo en pantallas anchas y bajas): mientras se ve
          // el menu, un cluster flotante compacto basta para seguir
          // controlando la reproduccion. Sin cancion todavia no hay nada
          // que controlar, no se muestra nada.
          currentSong && (
            <MiniPlayerFab
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          )
        ) : (
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
        )}

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

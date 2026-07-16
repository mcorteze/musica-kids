import { useState, useCallback, useMemo, useEffect } from 'react';
import { ConfigProvider, Card, Layout, Typography } from 'antd';
import MusicPlayer from './components/MusicPlayer';
import Playlist from './components/Playlist';
import ThemeSelector from './components/ThemeSelector';
import themes from './themes';
import songs from './data/songs';
import 'antd/dist/reset.css';
import './App.css';

const { Header, Content } = Layout;
const { Title } = Typography;

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

  const theme = themes[currentTheme];

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent-color', theme.accentColor);
    root.style.setProperty('--accent-rgb', theme.accentRgb);
    root.style.setProperty('--player-bg', theme.playerBg);
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
    setIsPlaying((prev) => !prev);
  }, []);

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

  return (
    <ConfigProvider
      theme={{
        token: theme.token,
        components: {
          Button: { algorithm: true },
          Slider: { algorithm: true },
        },
      }}
    >
      <Layout
        className="app-layout"
        style={{ background: theme.gradient, minHeight: '100vh' }}
      >
        <Header
          className="app-header"
          style={{ ...theme.headerStyle, justifyContent: 'space-between' }}
        >
          <Title level={2} style={{ margin: 0, color: '#fff', fontSize: 'inherit' }}>
            {theme.icon} Mi Musica
          </Title>
          <ThemeSelector
            currentTheme={currentTheme}
            onChange={handleThemeChange}
          />
        </Header>

        <Content className="app-content">
          <div className="main-layout">
            <Card
              className="player-card"
              style={{
                background: theme.playerBg,
                borderColor: 'transparent',
                borderWidth: 0,
                borderStyle: 'solid',
              }}
              bodyStyle={{ padding: 20 }}
            >
              <MusicPlayer
                song={currentSong}
                isPlaying={isPlaying}
                onPlayPause={handlePlayPause}
                onNext={handleNext}
                onPrev={handlePrev}
                shuffle={shuffle}
                onShuffleToggle={handleShuffleToggle}
                repeat={repeat}
                onRepeatToggle={handleRepeatToggle}
                theme={theme}
              />
            </Card>

            <Card
              className="playlist-card"
              title={
                <span style={{ fontSize: 16, color: theme.token.colorText }}>
                  Canciones ({songs.length})
                </span>
              }
              style={{
                background: theme.cardBg,
                borderColor: theme.cardStyle.borderColor,
                borderWidth: theme.cardStyle.borderWidth,
                borderStyle: 'solid',
              }}
              bodyStyle={{ padding: '4px 8px' }}
            >
              <Playlist
                songs={songs}
                currentSong={currentSong}
                isPlaying={isPlaying}
                onSelect={handleSelectSong}
              />
            </Card>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

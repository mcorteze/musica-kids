import { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Slider, Typography, Avatar } from 'antd';
import {
  CaretRightOutlined,
  PauseOutlined,
  StepForwardOutlined,
  StepBackwardOutlined,
  SwapOutlined,
  RedoOutlined,
  SoundOutlined,
  HeartOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MusicPlayer({
  song,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  shuffle,
  onShuffleToggle,
  repeat,
  onRepeatToggle,
  theme,
}) {
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoaded = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        onNext();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [repeat, onNext]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, song]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  const handleSeek = useCallback((value) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
    }
  }, []);

  const handleVolumeChange = useCallback((value) => {
    setVolume(value);
    if (value > 0) setIsMuted(false);
  }, []);

  if (!song) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <HeartOutlined style={{ fontSize: 64, opacity: 0.3 }} />
        <Title level={4} style={{ opacity: 0.5, marginTop: 16 }}>
          Selecciona una cancion
        </Title>
      </div>
    );
  }

  return (
    <div className="music-player-container">
      <audio ref={audioRef} src={song.file} preload="metadata" />

      {/* Cover Art */}
      <div className="cover-art-container">
        <Avatar
          shape="square"
          size={200}
          src={song.cover || undefined}
          style={{
            borderRadius: 24,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}
          className={`cover-art ${isPlaying ? 'spinning' : ''}`}
        >
          <HeartOutlined style={{ fontSize: 64 }} />
        </Avatar>
      </div>

      {/* Song Info */}
      <div className="song-info">
        <Title level={3} style={{ margin: 0, color: '#fff' }}>
          {song.title}
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>
          {song.artist}
        </Text>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <Text className="time-label">{formatTime(currentTime)}</Text>
        <Slider
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          tooltip={{ formatter: (v) => formatTime(v) }}
          className="progress-slider"
        />
        <Text className="time-label">{formatTime(duration)}</Text>
      </div>

      {/* Main Controls */}
      <div className="main-controls">
        <Button
          type="text"
          icon={<SwapOutlined />}
          onClick={onShuffleToggle}
          className={`control-btn-secondary ${shuffle ? 'active' : ''}`}
          style={{
            color: shuffle ? '#fff' : 'rgba(255,255,255,0.6)',
          }}
        />

        <Button
          type="text"
          icon={<StepBackwardOutlined />}
          onClick={onPrev}
          className="control-btn"
        />

        <Button
          type="primary"
          shape="circle"
          size={72}
          icon={isPlaying ? <PauseOutlined /> : <CaretRightOutlined />}
          onClick={onPlayPause}
          className="play-btn"
        />

        <Button
          type="text"
          icon={<StepForwardOutlined />}
          onClick={onNext}
          className="control-btn"
        />

        <Button
          type="text"
          icon={repeat === 'one' ? <RedoOutlined style={{ fontSize: 14, position: 'absolute', bottom: 4, right: 4 }} /> : <RedoOutlined />}
          onClick={onRepeatToggle}
          className={`control-btn-secondary ${repeat !== 'off' ? 'active' : ''}`}
          style={{
            color: repeat !== 'off' ? '#fff' : 'rgba(255,255,255,0.6)',
          }}
        />
      </div>

      {/* Volume */}
      <div className="volume-container">
        <Button
          type="text"
          icon={isMuted ? <SoundOutlined style={{ opacity: 0.5 }} /> : <SoundOutlined />}
          onClick={() => setIsMuted(!isMuted)}
          style={{ color: 'rgba(255,255,255,0.8)', fontSize: 20 }}
        />
        <Slider
          min={0}
          max={100}
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          className="volume-slider"
        />
      </div>
    </div>
  );
}

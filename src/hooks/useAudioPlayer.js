import { useState, useRef, useEffect, useCallback } from 'react';

export default function useAudioPlayer({ song, isPlaying, onNext, repeat, onPlayStateChange }) {
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

    // El sistema tambien puede pausar o reanudar el audio por su cuenta
    // (se desconecta el audifono Bluetooth, entra una llamada, etc.): el
    // estado de la app tiene que seguirlo o el boton de play queda al reves.
    // La pausa que acompana al fin de la cancion no cuenta: de eso se
    // encarga 'ended'.
    const handlePause = () => {
      if (!audio.ended) onPlayStateChange?.(false);
    };
    const handlePlay = () => onPlayStateChange?.(true);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, [repeat, onNext, onPlayStateChange, song]);

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
    setCurrentTime(value);
  }, []);

  const handleVolumeChange = useCallback((value) => {
    setVolume(value);
    setIsMuted(value === 0);
  }, []);

  const toggleMute = useCallback(() => setIsMuted((prev) => !prev), []);

  return {
    audioRef,
    currentTime,
    duration,
    volume,
    isMuted,
    handleSeek,
    handleVolumeChange,
    toggleMute,
  };
}

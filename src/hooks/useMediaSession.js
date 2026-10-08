import { useEffect, useRef } from 'react';

// Conecta el reproductor con los controles del sistema: botones del
// audifono, palanca/volante del auto (Bluetooth), pantalla de bloqueo y
// notificacion de medios. Sin esto el navegador no sabe a quien mandarle
// "siguiente"/"anterior" y esos botones no hacen nada.
export default function useMediaSession({
  audioRef,
  song,
  isPlaying,
  duration,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onSeek,
}) {
  const supported = typeof navigator !== 'undefined' && 'mediaSession' in navigator;

  // Los handlers se registran una sola vez y leen siempre la version mas
  // reciente de cada callback desde aca.
  const handlersRef = useRef({});
  handlersRef.current = { onPlay, onPause, onNext, onPrev, onSeek };

  useEffect(() => {
    if (!supported) return undefined;
    const ms = navigator.mediaSession;
    const actions = {
      play: () => handlersRef.current.onPlay(),
      pause: () => handlersRef.current.onPause(),
      nexttrack: () => handlersRef.current.onNext(),
      previoustrack: () => handlersRef.current.onPrev(),
      seekto: (details) => {
        if (typeof details.seekTime === 'number') handlersRef.current.onSeek(details.seekTime);
      },
    };
    Object.entries(actions).forEach(([action, handler]) => {
      try { ms.setActionHandler(action, handler); } catch { /* accion no soportada */ }
    });
    return () => {
      Object.keys(actions).forEach((action) => {
        try { ms.setActionHandler(action, null); } catch { /* idem */ }
      });
    };
  }, [supported]);

  // Titulo, artista y caratula: lo que muestra la pantalla del auto, la
  // pantalla de bloqueo y la notificacion.
  useEffect(() => {
    if (!supported) return;
    if (!song) {
      navigator.mediaSession.metadata = null;
      return;
    }
    const artwork = song.cover
      ? [{ src: new URL(song.cover, document.baseURI).href, sizes: '512x512' }]
      : [];
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist ?? '',
      artwork,
    });
  }, [supported, song]);

  useEffect(() => {
    if (!supported) return;
    navigator.mediaSession.playbackState = song ? (isPlaying ? 'playing' : 'paused') : 'none';
  }, [supported, song, isPlaying]);

  // Posicion para la barra de progreso del sistema. El navegador la avanza
  // solo mientras suena; basta con avisarle al cambiar de cancion, de
  // estado o de duracion.
  useEffect(() => {
    if (!supported || !navigator.mediaSession.setPositionState) return undefined;
    const audio = audioRef.current;
    if (!audio || !duration || !isFinite(duration)) return undefined;
    const update = () => {
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: audio.playbackRate || 1,
          position: Math.min(audio.currentTime, duration),
        });
      } catch { /* posicion invalida durante la carga */ }
    };
    update();
    // Tras un salto (barra de la app o del sistema) la posicion ya no es
    // la que el navegador venia extrapolando.
    audio.addEventListener('seeked', update);
    return () => audio.removeEventListener('seeked', update);
  }, [supported, audioRef, song, isPlaying, duration]);
}

import { useEffect, useRef } from 'react';

// El sistema operativo libera el wake lock solo cuando la pestaña se oculta
// (llamada entrante, cambiar de app), por eso hay que volver a pedirlo al
// recuperar visibilidad si el modo sigue activo.
export default function useWakeLock(active) {
  const lockRef = useRef(null);

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return undefined;

    let cancelado = false;

    const pedir = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelado) {
          lock.release();
          return;
        }
        lockRef.current = lock;
      } catch {
        // Sin permiso o sin soporte: la app sigue funcionando igual.
      }
    };

    pedir();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !lockRef.current) {
        pedir();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      lockRef.current?.release();
      lockRef.current = null;
    };
  }, [active]);
}

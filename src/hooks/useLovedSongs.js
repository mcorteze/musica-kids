import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'musica-kids-loved-songs';

function readStoredLoves() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

// Independiente de useLikedSongs (manito) a proposito: son dos reacciones
// separadas, cada boton con su propio estado, no dos vistas del mismo "me
// gusta".
export default function useLovedSongs() {
  const [lovedIds, setLovedIds] = useState(readStoredLoves);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...lovedIds]));
  }, [lovedIds]);

  const isLoved = useCallback((songId) => lovedIds.has(songId), [lovedIds]);

  const toggleLove = useCallback((songId) => {
    setLovedIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      return next;
    });
  }, []);

  return { isLoved, toggleLove };
}

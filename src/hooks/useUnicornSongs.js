import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'musica-kids-unicorn-songs';

function readStoredUnicorns() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

// Tercera reaccion, independiente de like/love: su propio estado y storage.
export default function useUnicornSongs() {
  const [unicornIds, setUnicornIds] = useState(readStoredUnicorns);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...unicornIds]));
  }, [unicornIds]);

  const isUnicorned = useCallback((songId) => unicornIds.has(songId), [unicornIds]);

  const toggleUnicorn = useCallback((songId) => {
    setUnicornIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      return next;
    });
  }, []);

  return { isUnicorned, toggleUnicorn };
}

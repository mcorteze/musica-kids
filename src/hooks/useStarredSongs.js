import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'musica-kids-starred-songs';

function readStoredStars() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

// Cuarta reaccion, independiente de like/love/unicornio: su propio estado y storage.
export default function useStarredSongs() {
  const [starredIds, setStarredIds] = useState(readStoredStars);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...starredIds]));
  }, [starredIds]);

  const isStarred = useCallback((songId) => starredIds.has(songId), [starredIds]);

  const toggleStar = useCallback((songId) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      return next;
    });
  }, []);

  return { isStarred, toggleStar };
}

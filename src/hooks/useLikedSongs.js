import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'musica-kids-liked-songs';

function readStoredLikes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export default function useLikedSongs() {
  const [likedIds, setLikedIds] = useState(readStoredLikes);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...likedIds]));
  }, [likedIds]);

  const isLiked = useCallback((songId) => likedIds.has(songId), [likedIds]);

  const toggleLike = useCallback((songId) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      return next;
    });
  }, []);

  return { isLiked, toggleLike };
}

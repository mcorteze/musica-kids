import { useState, useRef, useEffect, useCallback } from 'react';

export default function ScrubBar({ value, max, onChange, ariaLabel }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [hoverPct, setHoverPct] = useState(null);
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  const pctFromEvent = useCallback((clientX) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * 100;
  }, []);

  const commit = useCallback((clientX) => {
    const p = pctFromEvent(clientX);
    onChange((p / 100) * max);
  }, [pctFromEvent, onChange, max]);

  useEffect(() => {
    if (!dragging) return;
    const move = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      commit(clientX);
    };
    const up = () => setDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [dragging, commit]);

  return (
    <div
      ref={trackRef}
      className="scrub-track"
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      tabIndex={0}
      onMouseDown={(e) => { setDragging(true); commit(e.clientX); }}
      onTouchStart={(e) => { setDragging(true); commit(e.touches[0].clientX); }}
      onMouseMove={(e) => setHoverPct(pctFromEvent(e.clientX))}
      onMouseLeave={() => setHoverPct(null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') onChange(Math.min(max, value + 5));
        if (e.key === 'ArrowLeft') onChange(Math.max(0, value - 5));
      }}
    >
      <div className="scrub-rail" />
      <div className="scrub-fill" style={{ width: `${pct}%` }} />
      {hoverPct !== null && !dragging && (
        <div className="scrub-hover" style={{ width: `${hoverPct}%` }} />
      )}
      <div className="scrub-handle" style={{ left: `${pct}%` }} />
    </div>
  );
}

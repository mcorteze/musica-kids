import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Typography } from 'antd';

const { Text } = Typography;
const PIN_CODE = '0000';
const BLOCKED_KEYS = new Set([
  'F5', 'F12',
  'r', 't', 'n', 'w', 'p', 's', 'u',
]);

function LockClosedSVG({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="11" width="18" height="11" rx="4" fill="currentColor" opacity="0.25" />
      <rect x="3" y="11" width="18" height="11" rx="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

function FullscreenSVG({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UnlockSVG({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="11" width="18" height="11" rx="4" fill="currentColor" opacity="0.25" />
      <rect x="3" y="11" width="18" height="11" rx="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 16l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PinDots({ length, error }) {
  return (
    <div className="pin-dots">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={`pin-dot ${i < length ? 'filled' : ''} ${error ? 'error' : ''}`}
        />
      ))}
    </div>
  );
}

export default function ChildLock({ onChildModeChange }) {
  const [childMode, setChildMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [shake, setShake] = useState(false);
  const wakeLockRef = useRef(null);
  const inputRef = useRef(null);

  const activateChildMode = useCallback(() => {
    setChildMode(true);
    onChildModeChange?.(true);
  }, [onChildModeChange]);

  const deactivateChildMode = useCallback(() => {
    setChildMode(false);
    setIsLocked(false);
    onChildModeChange?.(false);
  }, [onChildModeChange]);

  const openUnlockModal = useCallback(() => {
    setPin('');
    setPinError(false);
    setShowUnlockModal(true);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  }, []);

  const closeUnlockModal = useCallback(() => {
    setShowUnlockModal(false);
    setPin('');
    setPinError(false);
  }, []);

  const handleUnlock = useCallback(() => {
    if (pin === PIN_CODE) {
      deactivateChildMode();
      setShowUnlockModal(false);
      setPin('');
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } else {
      setPinError(true);
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setPinError(false);
        setPin('');
        if (inputRef.current) inputRef.current.focus();
      }, 600);
    }
  }, [pin, deactivateChildMode]);

  const handlePinInput = useCallback((e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    setPinError(false);
    if (val.length === 4) {
      setTimeout(() => {
        if (val === PIN_CODE) {
          deactivateChildMode();
          setShowUnlockModal(false);
          setPin('');
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        } else {
          setPinError(true);
          setShake(true);
          setTimeout(() => {
            setShake(false);
            setPinError(false);
            setPin('');
            if (inputRef.current) inputRef.current.focus();
          }, 600);
        }
      }, 150);
    }
  }, [deactivateChildMode]);

  const lockFullscreen = useCallback(() => {
    setIsLocked(true);
  }, []);

  const enterFullscreen = useCallback(() => {
    const el = document.documentElement;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (rfs) rfs.call(el).catch(() => {});
  }, []);

  // Fullscreen listener
  useEffect(() => {
    const handler = () => {
      const fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(fs);
      if (!fs) {
        setIsLocked(false);
        deactivateChildMode();
      }
    };
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, [deactivateChildMode]);

  // Block fullscreen exit when locked
  useEffect(() => {
    if (!isLocked) return;

    const blockExit = (e) => {
      if (document.fullscreenElement) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener('fullscreenchange', blockExit, true);
    document.addEventListener('webkitfullscreenchange', blockExit, true);

    const blockKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', blockKey, true);

    return () => {
      document.removeEventListener('fullscreenchange', blockExit, true);
      document.removeEventListener('webkitfullscreenchange', blockExit, true);
      document.removeEventListener('keydown', blockKey, true);
    };
  }, [isLocked]);

  // Child mode effects
  useEffect(() => {
    if (!childMode) {
      document.body.classList.remove('child-mode');
      return;
    }

    document.body.classList.add('child-mode');

    const blockContext = (e) => e.preventDefault();
    const blockBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    const blockKey = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (BLOCKED_KEYS.has(e.key) || (ctrl && BLOCKED_KEYS.has(e.key.toLowerCase()))) {
        e.preventDefault();
      }
    };
    const blockLink = (e) => {
      const tag = e.target.closest('a');
      if (tag && tag.target === '_blank') e.preventDefault();
    };

    document.addEventListener('contextmenu', blockContext);
    document.addEventListener('beforeunload', blockBeforeUnload);
    document.addEventListener('keydown', blockKey);
    document.addEventListener('click', blockLink, true);

    let wakeLock = null;
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then((lock) => {
        wakeLock = lock;
        wakeLockRef.current = lock;
      }).catch(() => {});
    }

    return () => {
      document.removeEventListener('contextmenu', blockContext);
      document.removeEventListener('beforeunload', blockBeforeUnload);
      document.removeEventListener('keydown', blockKey);
      document.removeEventListener('click', blockLink, true);
      if (wakeLock) wakeLock.release();
    };
  }, [childMode]);

  return (
    <>
      <div className="child-lock-actions">
        {!isFullscreen && (
          <Button
            type="text"
            icon={<FullscreenSVG />}
            onClick={enterFullscreen}
            className="child-lock-btn"
            title="Pantalla completa"
          />
        )}
        {isFullscreen && !childMode && (
          <Button
            type="text"
            icon={<UnlockSVG />}
            onClick={activateChildMode}
            className="child-lock-btn inactive"
            title="Activar modo nino"
          />
        )}
        {isFullscreen && childMode && !isLocked && (
          <Button
            type="text"
            icon={<LockClosedSVG />}
            onClick={lockFullscreen}
            className="child-lock-btn ready"
            title="Bloquear pantalla"
          />
        )}
        {isFullscreen && childMode && isLocked && (
          <Button
            type="text"
            icon={<LockClosedSVG />}
            onClick={openUnlockModal}
            className="child-lock-btn locked"
            title="Desbloquear"
          />
        )}
      </div>

      {showUnlockModal && (
        <div className="unlock-overlay" onClick={closeUnlockModal}>
          <div
            className={`unlock-modal ${shake ? 'shake' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="unlock-icon">
              <UnlockSVG size={36} />
            </div>
            <Text className="unlock-title">Modo Parental</Text>
            <Text className="unlock-subtitle">Ingresa el codigo para salir</Text>

            <div className="pin-single-input-wrapper">
              <PinDots length={pin.length} error={pinError} />
              <input
                ref={inputRef}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={handlePinInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pin.length === 4) {
                    e.preventDefault();
                    handleUnlock();
                  }
                }}
                className="pin-single-input"
                autoComplete="off"
              />
            </div>

            {pinError && (
              <Text className="pin-error">Codigo incorrecto</Text>
            )}

            <Button
              type="primary"
              block
              onClick={handleUnlock}
              disabled={pin.length !== 4}
              className="unlock-btn"
            >
              Desbloquear
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

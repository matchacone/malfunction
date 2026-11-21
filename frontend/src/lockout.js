export function isFullscreenActive() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

export function requestAppFullscreen() {
  if (typeof document === 'undefined' || isFullscreenActive()) return;

  const root = document.documentElement;
  const req =
    root.requestFullscreen ||
    root.webkitRequestFullscreen ||
    root.mozRequestFullScreen ||
    root.msRequestFullscreen;

  if (typeof req !== 'function') return;

  try {
    const result = req.call(root, { navigationUI: 'hide' });
    if (result && typeof result.then === 'function') {
      result
        .then(() => {
          try {
            navigator.keyboard?.lock?.(['Escape']).catch?.(() => {});
          } catch {
            // Keyboard Lock API is Chromium-only; ignore when unavailable.
          }
        })
        .catch(() => {});
    }
  } catch {
    // Ignore rejected fullscreen requests outside user activation.
  }
}

/**
 * Engages browser-level lockout behavior for the post-death alarm screen:
 * - Immediately requests fullscreen and re-requests it on any click/keypress if exited
 * - Prevents context menu, text selection, scrolling, and reload/navigation shortcuts
 * - Traps browser Back navigation and prompts on tab close/reload
 */
export function engageTakeoverLockout(onFullscreenChange) {
  requestAppFullscreen();

  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  try {
    window.history.pushState({ lockedOut: true }, '', window.location.href);
  } catch {
    // Ignore history API restrictions.
  }

  const handleFullscreenChange = () => {
    const active = isFullscreenActive();
    if (active) {
      try {
        navigator.keyboard?.lock?.(['Escape']).catch?.(() => {});
      } catch {
        // Ignore unsupported Keyboard Lock API.
      }
    }
    onFullscreenChange?.(active);
  };

  const handleInteraction = () => {
    if (!isFullscreenActive()) {
      requestAppFullscreen();
    }
  };

  const handleKeyDown = (event) => {
    if (!isFullscreenActive()) {
      requestAppFullscreen();
    }

    const key = event.key.toLowerCase();
    const isReload = key === 'f5' || ((event.ctrlKey || event.metaKey) && key === 'r');
    const isBlockedNav =
      key === 'escape' ||
      key === 'tab' ||
      key === ' ' ||
      key === 'backspace' ||
      key === 'f11' ||
      key.startsWith('arrow') ||
      ((event.ctrlKey || event.metaKey) && ['w', 'l', 't', 'n', 'p', 's'].includes(key));

    if (isReload || isBlockedNav) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handleContextMenu = (event) => {
    event.preventDefault();
    if (!isFullscreenActive()) requestAppFullscreen();
  };

  const handleBeforeUnload = (event) => {
    event.preventDefault();
    event.returnValue = '';
    return '';
  };

  const handlePopState = () => {
    try {
      window.history.pushState({ lockedOut: true }, '', window.location.href);
    } catch {
      // Ignore history API restrictions.
    }
    if (!isFullscreenActive()) requestAppFullscreen();
  };

  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  window.addEventListener('pointerdown', handleInteraction, true);
  window.addEventListener('touchstart', handleInteraction, true);
  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('contextmenu', handleContextMenu, true);
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('popstate', handlePopState);

  return () => {
    document.body.style.overflow = prevOverflow;
    try {
      navigator.keyboard?.unlock?.();
    } catch {
      // Ignore unsupported Keyboard Lock API.
    }
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    window.removeEventListener('pointerdown', handleInteraction, true);
    window.removeEventListener('touchstart', handleInteraction, true);
    window.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('contextmenu', handleContextMenu, true);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('popstate', handlePopState);
  };
}

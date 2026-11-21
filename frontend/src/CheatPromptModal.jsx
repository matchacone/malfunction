import { useEffect, useState } from 'react';

const CORRUPTED_LINES = [
  'ERR_0x666 // INTEGRITY_GATEWAY_FRACTURED',
  'SIN_THRESHOLD_EXCEEDED // OVERRIDE_DETECTED',
  'HE_SEES_EVERY_KEYSTROKE // PROCEED_AT_YOUR_OWN_RISK',
  'BYPASS_PROTOCOL_READY // NO_MERCY_ENABLED',
];

const GLITCH_GLYPHS = '!@#$%^&*<>?/\\|█▓▒░01';

function corruptSnippet(base) {
  const chars = base.split('');
  const swaps = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < swaps; i += 1) {
    const idx = Math.floor(Math.random() * chars.length);
    if (chars[idx] !== ' ') {
      chars[idx] = GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)];
    }
  }
  return chars.join('');
}

export default function CheatPromptModal({ reason, onAcceptCheat, onDecline }) {
  const [tickerIdx, setTickerIdx] = useState(0);
  const [glitchedYes, setGlitchedYes] = useState('YES — LET ME CHEAT');

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onDecline();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onDecline]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const tickerTimer = window.setInterval(() => {
      setTickerIdx((prev) => (prev + 1) % CORRUPTED_LINES.length);
    }, 1150);

    const glitchTimer = window.setInterval(() => {
      if (Math.random() < 0.45) {
        setGlitchedYes(corruptSnippet('YES — LET ME CHEAT'));
        window.setTimeout(() => setGlitchedYes('YES — LET ME CHEAT'), 110);
      }
    }, 680);

    return () => {
      window.clearInterval(tickerTimer);
      window.clearInterval(glitchTimer);
    };
  }, []);

  const reasonText =
    reason === 'entries'
      ? 'You have been dragged into confession mode more than 3 times.'
      : 'You refused to confess your sins 3 times.';

  return (
    <div
      className="cheat-modal-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cheat-modal-title"
      aria-describedby="cheat-modal-desc"
    >
      <div className="cheat-modal-scanlines" aria-hidden="true" />
      <div className="cheat-modal">
        <div className="cheat-modal-bar">
          <span className="cheat-modal-code">{CORRUPTED_LINES[tickerIdx]}</span>
          <span className="cheat-modal-blink">● LIVE BREACH</span>
        </div>

        <div className="cheat-modal-body">
          <p className="cheat-modal-kicker">04 // FORBIDDEN OVERRIDE</p>
          <h2
            id="cheat-modal-title"
            className="cheat-glitch-title"
            data-text="DO YOU REALLY WANT TO CHEAT?"
          >
            DO YOU REALLY WANT TO CHEAT?
          </h2>
          <p id="cheat-modal-desc" className="cheat-modal-desc">
            {reasonText} The Angel is offering a corrupted backdoor. Click{' '}
            <strong>YES</strong> to force the answer out of the gateway — if you can survive
            judgment.
          </p>

          <div className="cheat-modal-warning" aria-hidden="true">
            <span>DIFFICULTY: INSANE</span>
            <span>·</span>
            <span>MERCY: 0%</span>
            <span>·</span>
            <span>AUDIO ALERT: ARMED</span>
          </div>

          <div className="cheat-modal-actions">
            <button
              type="button"
              className="cheat-btn cheat-btn-yes"
              onClick={onAcceptCheat}
              autoFocus
            >
              <span className="cheat-btn-glitch" data-text={glitchedYes}>
                {glitchedYes}
              </span>
            </button>
            <button
              type="button"
              className="cheat-btn cheat-btn-no"
              onClick={onDecline}
            >
              NO — I WILL CONFESS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import AsciiBackdrop from './AsciiBackdrop.jsx';
import OphanimAscii from './OphanimAscii.jsx';
import { ALARM_AUDIO_SRC, startCheatingAlarm, stopCheatingAlarm } from './alarmAudio.js';
import { engageTakeoverLockout, isFullscreenActive } from './lockout.js';

export default function CaughtTakeover() {
  const [fullscreen, setFullscreen] = useState(() => isFullscreenActive());

  useEffect(() => {
    startCheatingAlarm();
    const releaseLockout = engageTakeoverLockout(setFullscreen);
    return () => {
      releaseLockout();
      stopCheatingAlarm();
    };
  }, []);

  return (
    <main
      className="caught-takeover"
      role="alert"
      aria-live="assertive"
      aria-label="Academic integrity alarm: student caught cheating"
    >
      <AsciiBackdrop locked />
      <div className="caught-strobe" aria-hidden="true" />
      <div className="caught-scanlines" aria-hidden="true" />

      <div className="caught-content">
        <div className="caught-siren-bar">
          <span>▲ ACADEMIC INTEGRITY ALARM ▲</span>
          <span className="caught-siren-sep">//</span>
          <span>STUDENT CAUGHT CHEATING</span>
        </div>

        <OphanimAscii
          revealed
          locked
          enraged
          pending={false}
          isTyping={false}
          draftLength={0}
          variant="takeover"
        />

        <div className="caught-footer">
          <p className="caught-headline" data-text="CHEATING DETECTED — TEACHERS ALERTED">
            CHEATING DETECTED — TEACHERS ALERTED
          </p>
          <p className="caught-lock-status">
            {fullscreen
              ? 'TERMINAL LOCKED · FULLSCREEN ENFORCED · NO ESCAPE'
              : 'TERMINAL LOCKED · DO NOT ATTEMPT TO EXIT'}
          </p>
          <div className="caught-audio-meter" aria-hidden="true">
            <span className="caught-audio-label">
              {ALARM_AUDIO_SRC ? 'ALARM AUDIO BROADCASTING · MAX VOLUME' : 'EMERGENCY SIREN ACTIVE · MAX VOLUME'}
            </span>
            <div className="caught-bars">
              {Array.from({ length: 14 }, (_, idx) => (
                <span
                  key={idx}
                  className="caught-bar"
                  style={{ animationDelay: `${(idx % 5) * 90}ms` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

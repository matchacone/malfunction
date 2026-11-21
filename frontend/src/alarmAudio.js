// Drop-in alarm audio loader:
// When the final loud teacher-alert audio file arrives, save it as:
//   frontend/src/assets/cheating-alarm.mp3  (or .wav / .ogg / .m4a / .webm)
// Vite will automatically bundle and loop it at maximum volume when the student dies.
const customAlarmModules = import.meta.glob('./assets/cheating-alarm.{mp3,wav,ogg,m4a,webm}', {
  eager: true,
  import: 'default',
});

export const ALARM_AUDIO_SRC = Object.values(customAlarmModules)[0] ?? null;

let sharedAudioCtx = null;
let alarmElement = null;
let alarmLoopTimer = null;
let alarmActive = false;
let activeNodes = [];
let resumeHandler = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  return sharedAudioCtx;
}

function getAlarmElement() {
  if (!ALARM_AUDIO_SRC || typeof Audio === 'undefined') return null;
  if (!alarmElement) {
    alarmElement = new Audio(ALARM_AUDIO_SRC);
    alarmElement.loop = true;
    alarmElement.preload = 'auto';
    alarmElement.volume = 1.0;
  }
  return alarmElement;
}

/**
 * Call inside a user click/gesture (e.g., clicking "YES" to cheat) so browsers
 * authorize both Web Audio and HTMLAudioElement playback when the player dies.
 */
export function primeAlarmAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const audio = getAlarmElement();
  if (audio) {
    const prevMuted = audio.muted;
    audio.muted = true;
    audio.play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = prevMuted;
      })
      .catch(() => {
        audio.muted = prevMuted;
      });
  }
}

function triggerFallbackKlaxonBurst(ctx) {
  if (!alarmActive || !ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.001, now);
  master.gain.exponentialRampToValueAtTime(0.55, now + 0.03);
  master.gain.setValueAtTime(0.55, now + 0.56);
  master.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
  master.connect(ctx.destination);

  // Dual-tone school emergency siren (sawtooth + square)
  const osc1 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc1.frequency.setValueAtTime(880, now);
  osc1.frequency.linearRampToValueAtTime(1320, now + 0.28);
  osc1.frequency.linearRampToValueAtTime(880, now + 0.62);

  const osc2 = ctx.createOscillator();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(660, now);
  osc2.frequency.setValueAtTime(990, now + 0.3);

  const subGain = ctx.createGain();
  subGain.gain.value = 0.4;

  osc1.connect(master);
  osc2.connect(subGain);
  subGain.connect(master);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.7);
  osc2.stop(now + 0.7);

  activeNodes.push(osc1, osc2, master, subGain);
  osc1.onended = () => {
    activeNodes = activeNodes.filter((n) => n !== osc1 && n !== osc2 && n !== master && n !== subGain);
  };
}

/**
 * Starts the loud looping alarm that alerts teachers the student is cheating.
 * Uses the custom audio file if present in src/assets/cheating-alarm.*, otherwise
 * runs a loud synthesized emergency klaxon placeholder until the file is added.
 */
export function startCheatingAlarm() {
  stopCheatingAlarm();
  alarmActive = true;

  const tryStart = () => {
    if (!alarmActive) return;

    const audio = getAlarmElement();
    if (audio) {
      audio.loop = true;
      audio.volume = 1.0;
      audio.muted = false;
      if (audio.paused) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
      return;
    }

    // Fallback loud siren until cheating-alarm.* audio file is added
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        if (alarmActive) triggerFallbackKlaxonBurst(ctx);
      }).catch(() => {});
    } else {
      triggerFallbackKlaxonBurst(ctx);
    }

    if (alarmLoopTimer === null) {
      alarmLoopTimer = window.setInterval(() => {
        if (!alarmActive) return;
        const c = getAudioContext();
        if (c && c.state === 'running') {
          triggerFallbackKlaxonBurst(c);
        }
      }, 760);
    }
  };

  tryStart();

  // If browser autoplay blocked playback, resume immediately on any click or keypress.
  resumeHandler = () => tryStart();
  window.addEventListener('pointerdown', resumeHandler);
  window.addEventListener('keydown', resumeHandler);
}

export function stopCheatingAlarm() {
  alarmActive = false;

  if (resumeHandler) {
    window.removeEventListener('pointerdown', resumeHandler);
    window.removeEventListener('keydown', resumeHandler);
    resumeHandler = null;
  }

  if (alarmLoopTimer !== null) {
    window.clearInterval(alarmLoopTimer);
    alarmLoopTimer = null;
  }

  if (alarmElement) {
    alarmElement.pause();
    alarmElement.currentTime = 0;
  }

  for (const node of activeNodes) {
    try {
      if (typeof node.stop === 'function') node.stop();
      if (typeof node.disconnect === 'function') node.disconnect();
    } catch {
      // Ignore already-stopped nodes.
    }
  }
  activeNodes = [];
}

/**
 * Lightweight synthesized arcade SFX for the bullet hell encounter.
 */
export function playBulletSfx(type) {
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return;

  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.connect(gain);

  if (type === 'graze') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1450, now);
    osc.frequency.exponentialRampToValueAtTime(2100, now + 0.045);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.055);
  } else if (type === 'hit') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.24);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.start(now);
    osc.stop(now + 0.27);
  } else if (type === 'laser') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.22);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.start(now);
    osc.stop(now + 0.25);
  } else if (type === 'phase2') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(640, now + 0.35);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.95);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.98);
    osc.start(now);
    osc.stop(now + 1.0);
  } else if (type === 'death') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.65);
    gain.gain.setValueAtTime(0.38, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
    osc.start(now);
    osc.stop(now + 0.7);
  } else {
    osc.disconnect();
    gain.disconnect();
  }
}

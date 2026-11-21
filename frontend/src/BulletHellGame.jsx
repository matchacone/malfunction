import { useEffect, useRef, useState } from 'react';
import AsciiBackdrop from './AsciiBackdrop.jsx';
import OphanimAscii from './OphanimAscii.jsx';
import bossMusic from './assets/boss-music.mp3';
import { playBulletSfx } from './alarmAudio.js';
import { requestAppFullscreen } from './lockout.js';

const PHASE1_DURATION = 20.0; // Insane survival challenge duration in seconds
const PHASE2_INTRO_DURATION = 1.15;
const MAX_HP = 3;
const PLAYER_HITBOX_R = 4.5;
const PLAYER_GRAZE_R = 24;
const PLAYER_SPEED = 340;
const PLAYER_FOCUS_SPEED = 160;
const GLYPH_POOL = ['†', '✦', '◈', '×', '◉', 'Ψ', '‡', '▲'];
const PHASE2_WORDS = ['SIN', 'CHEAT', 'CAUGHT', 'JUDGED', 'REPENT', '†', '@', '#'];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function pointToSegmentDistSq(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return (px - x1) ** 2 + (py - y1) ** 2;
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return (px - cx) ** 2 + (py - cy) ** 2;
}

export default function BulletHellGame({ onPlayerDeath }) {
  const canvasRef = useRef(null);
  const bossWrapRef = useRef(null);
  const bossAudioRef = useRef(null);
  const gazeTargetRef = useRef({ x: 0, y: 0, active: true });
  const deathCalledRef = useRef(false);

  const [hud, setHud] = useState({
    phase: 1, // 1 = Insane, 1.5 = Phase 2 intro glitch, 2 = Impossible, 3 = Dying
    hp: MAX_HP,
    timeLeft: PHASE1_DURATION,
    graze: 0,
    banner: 'PHASE 01 // JUDGMENT: INSANE',
    subBanner: 'SURVIVE 20 SECONDS TO FORCE-UNLOCK THE ANSWER',
  });

  // Loop boss music intensely during the bullet hell fight
  useEffect(() => {
    const audio = bossAudioRef.current;
    if (!audio) return;
    audio.volume = 0.85;
    audio.loop = true;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Input state
    const keys = new Set();
    const pointer = { down: false, x: width * 0.5, y: height * 0.78 };

    const onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'shift', ' '].includes(k)) {
        e.preventDefault();
      }
      keys.add(k);
    };
    const onKeyUp = (e) => {
      keys.delete(e.key.toLowerCase());
    };
    const onPointerDown = (e) => {
      pointer.down = true;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };
    const onPointerMove = (e) => {
      if (pointer.down) {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
      }
    };
    const onPointerUp = () => {
      pointer.down = false;
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    // Game simulation state
    const player = {
      x: width * 0.5,
      y: height * 0.78,
      hp: MAX_HP,
      invuln: 0.7, // tiny spawn protection while Phase 1 banner flashes
      graze: 0,
      focus: false,
      trail: [],
    };

    const bullets = [];
    const lasers = [];
    const particles = [];

    let phase = 1; // 1 -> 1.5 -> 2 -> 3
    let elapsed = 0;
    let phase2IntroElapsed = 0;
    let phase2Elapsed = 0;
    let deathElapsed = 0;
    let screenShake = 6;
    let flashAlpha = 0.45;
    let hudTick = 0;
    let spiralAngle = 0;
    let spiralAngle2 = Math.PI;

    // Pattern timers
    const timers = {
      spiral: 0,
      aimed: 0.35,
      ring: 1.2,
      laser: 1.8,
      rain: 0.9,
      homing: 2.6,
      p2Ring: 0,
      p2Wall: 0,
      p2Laser: 0,
      p2Nova: 0,
    };

    const bossOrigin = () => {
      const eyeEl = bossWrapRef.current?.querySelector('.ophanim-eye-host');
      if (eyeEl) {
        const rect = eyeEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return {
            x: rect.left + rect.width * 0.5,
            y: rect.top + rect.height * 0.5,
          };
        }
      }
      return {
        x: width * 0.5,
        y: Math.min(200, Math.max(125, height * 0.21)),
      };
    };

    const spawnBullet = (b) => {
      if (bullets.length > 2600) return;
      bullets.push({
        x: b.x,
        y: b.y,
        vx: b.vx,
        vy: b.vy,
        r: b.r ?? 6,
        color: b.color ?? '#ff4d42',
        core: b.core ?? '#ffffff',
        glyph: b.glyph ?? null,
        kind: b.kind ?? 'orb', // 'orb' | 'diamond' | 'glyph' | 'homing' | 'wall'
        age: 0,
        maxAge: b.maxAge ?? 12,
        grazed: false,
        turnRate: b.turnRate ?? 0,
        burstAt: b.burstAt ?? 0,
      });
    };

    const spawnParticles = (x, y, color, count, speed = 220) => {
      for (let i = 0; i < count; i += 1) {
        const ang = Math.random() * Math.PI * 2;
        const spd = (0.3 + Math.random() * 0.9) * speed;
        particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 0.28 + Math.random() * 0.35,
          maxLife: 0.63,
          size: 2 + Math.random() * 3.5,
          color,
        });
      }
    };

    const spawnLaser = (x1, y1, x2, y2, warnTime = 0.58, activeTime = 0.45, beamWidth = 22) => {
      lasers.push({
        x1,
        y1,
        x2,
        y2,
        age: 0,
        warnTime,
        activeTime,
        beamWidth,
        firedSfx: false,
      });
    };

    const triggerHit = () => {
      if (phase === 3) return;
      if (player.invuln > 0) return;

      player.hp -= 1;
      screenShake = Math.max(screenShake, 18);
      flashAlpha = 0.6;
      spawnParticles(player.x, player.y, '#ff4d42', 26, 320);

      if (player.hp <= 0) {
        phase = 3;
        deathElapsed = 0;
        screenShake = 30;
        flashAlpha = 0.92;
        spawnParticles(player.x, player.y, '#dbffad', 48, 420);
        spawnParticles(player.x, player.y, '#ff4d42', 64, 520);
        playBulletSfx('death');
        // Snap into fullscreen immediately while the player's last dodge input still grants user activation
        requestAppFullscreen();
        setHud((h) => ({
          ...h,
          phase: 3,
          hp: 0,
          banner: 'JUDGMENT DELIVERED // CAUGHT CHEATING',
          subBanner: 'LOCKING TERMINAL & ALERTING FACULTY…',
        }));
      } else {
        playBulletSfx('hit');
        // Phase 1 grants brief recovery i-frames + small shockwave pushback; Phase 2 gives near-zero mercy
        player.invuln = phase === 2 ? 0.14 : 0.85;
        if (phase === 1) {
          for (let i = bullets.length - 1; i >= 0; i -= 1) {
            const b = bullets[i];
            const dx = b.x - player.x;
            const dy = b.y - player.y;
            if (dx * dx + dy * dy < 110 * 110) {
              bullets.splice(i, 1);
            }
          }
        }
        setHud((h) => ({ ...h, hp: player.hp }));
      }
    };

    let lastNow = performance.now();
    let rafId = 0;

    const step = (now) => {
      const dt = Math.min((now - lastNow) / 1000, 0.04);
      lastNow = now;

      const boss = bossOrigin();

      // Update player movement (disabled once dead)
      if (phase !== 3) {
        player.focus = keys.has('shift');
        let mx = 0;
        let my = 0;
        if (keys.has('arrowleft') || keys.has('a')) mx -= 1;
        if (keys.has('arrowright') || keys.has('d')) mx += 1;
        if (keys.has('arrowup') || keys.has('w')) my -= 1;
        if (keys.has('arrowdown') || keys.has('s')) my += 1;

        const speed = player.focus ? PLAYER_FOCUS_SPEED : PLAYER_SPEED;
        if (mx !== 0 || my !== 0) {
          const inv = 1 / Math.hypot(mx, my);
          player.x += mx * inv * speed * dt;
          player.y += my * inv * speed * dt;
        } else if (pointer.down) {
          const dx = pointer.x - player.x;
          const dy = pointer.y - player.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 3) {
            const maxStep = (PLAYER_SPEED * 1.15) * dt;
            const move = Math.min(dist, maxStep);
            player.x += (dx / dist) * move;
            player.y += (dy / dist) * move;
          }
        }

        player.x = clamp(player.x, 18, width - 18);
        player.y = clamp(player.y, 76, height - 24);

        if (player.invuln > 0) player.invuln = Math.max(0, player.invuln - dt);

        player.trail.push({ x: player.x, y: player.y, alpha: 0.7 });
        if (player.trail.length > 10) player.trail.shift();
        for (const t of player.trail) t.alpha *= 0.86;
      }

      // Update Ophanim gaze target to lock directly onto the player!
      gazeTargetRef.current.x = player.x;
      gazeTargetRef.current.y = player.y;
      gazeTargetRef.current.active = true;

      // Phase state machine & bullet emitters
      if (phase === 1) {
        elapsed += dt;
        const progress = elapsed / PHASE1_DURATION;

        // 1. Continuous intense counter-rotating spiral vortex from the Ophanim's eye
        timers.spiral -= dt;
        if (timers.spiral <= 0) {
          timers.spiral = elapsed > 12 ? 0.085 : 0.105;
          const arms = elapsed > 10 ? 7 : 6;
          spiralAngle += 0.24 + progress * 0.14;
          spiralAngle2 -= 0.19 + progress * 0.11;
          const spd = 245 + progress * 95;

          for (let i = 0; i < arms; i += 1) {
            const a1 = spiralAngle + (i * Math.PI * 2) / arms;
            spawnBullet({
              x: boss.x,
              y: boss.y,
              vx: Math.cos(a1) * spd,
              vy: Math.sin(a1) * spd,
              r: 5.5,
              color: '#ff4d42',
              core: '#ffd7d4',
              kind: 'diamond',
            });
          }
          if (elapsed > 3.5) {
            for (let i = 0; i < 4; i += 1) {
              const a2 = spiralAngle2 + (i * Math.PI * 2) / 4;
              spawnBullet({
                x: boss.x,
                y: boss.y,
                vx: Math.cos(a2) * (spd * 0.78),
                vy: Math.sin(a2) * (spd * 0.78),
                r: 5,
                color: '#ffa22e',
                core: '#fff5d6',
                kind: 'orb',
              });
            }
          }
        }

        // 2. Aimed fan spreads targeting the player directly
        timers.aimed -= dt;
        if (timers.aimed <= 0) {
          timers.aimed = elapsed > 12 ? 0.85 : 1.15;
          const aim = Math.atan2(player.y - boss.y, player.x - boss.x);
          const count = elapsed > 10 ? 9 : 7;
          const spread = 0.78;
          const spd = 335 + progress * 85;
          for (let i = 0; i < count; i += 1) {
            const offset = ((i / (count - 1)) - 0.5) * spread;
            const ang = aim + offset;
            spawnBullet({
              x: boss.x,
              y: boss.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              r: 6,
              color: '#ff2b20',
              core: '#ffffff',
              kind: 'diamond',
            });
          }
        }

        // 3. Expanding sacred glyph nova rings
        timers.ring -= dt;
        if (timers.ring <= 0) {
          timers.ring = elapsed > 13 ? 1.55 : 2.1;
          const count = elapsed > 11 ? 26 : 20;
          const baseAng = Math.random() * Math.PI * 2;
          const spd = 210 + progress * 65;
          for (let i = 0; i < count; i += 1) {
            const ang = baseAng + (i * Math.PI * 2) / count;
            spawnBullet({
              x: boss.x,
              y: boss.y,
              vx: Math.cos(ang) * spd,
              vy: Math.sin(ang) * spd,
              r: 7,
              color: '#ff665c',
              core: '#ffffff',
              glyph: GLYPH_POOL[i % GLYPH_POOL.length],
              kind: 'glyph',
            });
          }
        }

        // 4. Sweeping telegraphed Judgment Lasers
        timers.laser -= dt;
        if (timers.laser <= 0 && elapsed > 2.2) {
          timers.laser = elapsed > 12 ? 1.65 : 2.35;
          const angToPlayer = Math.atan2(player.y - boss.y, player.x - boss.x);
          const len = Math.hypot(width, height) * 1.2;
          // Aimed twin beams flanking or directly targeting player
          const offsets = elapsed > 11 ? [-0.26, 0, 0.26] : [-0.14, 0.14];
          for (const off of offsets) {
            const a = angToPlayer + off;
            spawnLaser(
              boss.x,
              boss.y,
              boss.x + Math.cos(a) * len,
              boss.y + Math.sin(a) * len,
              0.62,
              0.42,
              20,
            );
          }
          // Occasional horizontal cross-laser in second half of Phase 1
          if (elapsed > 8) {
            const ly = clamp(player.y + (Math.random() - 0.5) * 90, 140, height - 60);
            spawnLaser(0, ly, width, ly, 0.65, 0.4, 18);
          }
        }

        // 5. Edge-spawning cross-rain curtains with narrow weaving lanes
        timers.rain -= dt;
        if (timers.rain <= 0 && elapsed > 5.0) {
          timers.rain = elapsed > 14 ? 0.65 : 0.92;
          const fromLeft = Math.random() < 0.5;
          const sy = 140 + Math.random() * (height - 200);
          const spd = 250 + progress * 80;
          for (let k = -1; k <= 1; k += 1) {
            spawnBullet({
              x: fromLeft ? -10 : width + 10,
              y: sy + k * 42,
              vx: fromLeft ? spd : -spd,
              vy: (Math.random() - 0.5) * 45,
              r: 5.5,
              color: '#ffb047',
              core: '#ffffff',
              kind: 'orb',
            });
          }
        }

        // 6. Detonating homing orbs
        timers.homing -= dt;
        if (timers.homing <= 0 && elapsed > 6.5) {
          timers.homing = 2.5;
          for (const side of [-1, 1]) {
            spawnBullet({
              x: boss.x + side * 120,
              y: boss.y + 18,
              vx: side * 110,
              vy: 140,
              r: 10,
              color: '#dbffad',
              core: '#ff2b20',
              kind: 'homing',
              turnRate: 2.3,
              burstAt: 1.45,
            });
          }
        }

        // Transition to Phase 2 if the player somehow survives all 20 seconds!
        if (elapsed >= PHASE1_DURATION) {
          phase = 1.5;
          phase2IntroElapsed = 0;
          bullets.length = 0;
          lasers.length = 0;
          screenShake = 22;
          flashAlpha = 0.85;
          playBulletSfx('phase2');
          setHud((h) => ({
            ...h,
            phase: 1.5,
            timeLeft: 0,
            banner: 'ACCESS DENIED // PHASE 02: ABSOLUTE WRATH',
            subBanner: 'YOU REALLY THOUGHT YOU COULD CHEAT GOD?',
          }));
        }
      } else if (phase === 1.5) {
        phase2IntroElapsed += dt;
        screenShake = Math.max(screenShake, 8);
        if (phase2IntroElapsed >= PHASE2_INTRO_DURATION) {
          phase = 2;
          phase2Elapsed = 0;
          player.invuln = 0;
          screenShake = 24;
          flashAlpha = 0.7;
          setHud((h) => ({
            ...h,
            phase: 2,
            timeLeft: 0,
            banner: 'PHASE 02 // IMPOSSIBLE — ZERO ESCAPE',
            subBanner: 'SURVIVAL PROBABILITY: 0.000%',
          }));
        }
      } else if (phase === 2) {
        // LITERALLY IMPOSSIBLE PHASE 2:
        // Zero-gap solid rings + converging 4-wall iron maiden + full-arena laser cage + inescapable nova
        phase2Elapsed += dt;
        screenShake = Math.max(screenShake, 7 + phase2Elapsed * 3);

        // 1. Solid zero-gap expanding rings from boss AND all 4 corners
        timers.p2Ring -= dt;
        if (timers.p2Ring <= 0) {
          timers.p2Ring = 0.16;
          const origins = [
            boss,
            { x: 0, y: 0 },
            { x: width, y: 0 },
            { x: 0, y: height },
            { x: width, y: height },
          ];
          const count = 48; // Overlapping solid wall — smaller gap than hitbox
          for (const org of origins) {
            for (let i = 0; i < count; i += 1) {
              const ang = (i * Math.PI * 2) / count + phase2Elapsed * 0.7;
              spawnBullet({
                x: org.x,
                y: org.y,
                vx: Math.cos(ang) * 380,
                vy: Math.sin(ang) * 380,
                r: 9,
                color: '#ff1f14',
                core: '#ffffff',
                kind: 'orb',
                maxAge: 6,
              });
            }
          }
        }

        // 2. Converging 4-wall Iron Maiden of solid crimson words & glyphs straight onto the player
        timers.p2Wall -= dt;
        if (timers.p2Wall <= 0) {
          timers.p2Wall = 0.24;
          const stepPx = 16;
          const spd = 330;
          let idx = 0;
          for (let x = 0; x <= width; x += stepPx) {
            spawnBullet({
              x,
              y: -8,
              vx: 0,
              vy: spd,
              r: 10,
              color: '#ff2b20',
              core: '#ffffff',
              glyph: PHASE2_WORDS[idx++ % PHASE2_WORDS.length],
              kind: 'wall',
              maxAge: 6,
            });
            spawnBullet({
              x,
              y: height + 8,
              vx: 0,
              vy: -spd,
              r: 10,
              color: '#ff2b20',
              core: '#ffffff',
              glyph: PHASE2_WORDS[idx++ % PHASE2_WORDS.length],
              kind: 'wall',
              maxAge: 6,
            });
          }
          for (let y = 0; y <= height; y += stepPx) {
            spawnBullet({
              x: -8,
              y,
              vx: spd,
              vy: 0,
              r: 10,
              color: '#ff4d42',
              core: '#ffffff',
              glyph: PHASE2_WORDS[idx++ % PHASE2_WORDS.length],
              kind: 'wall',
              maxAge: 6,
            });
            spawnBullet({
              x: width + 8,
              y,
              vx: -spd,
              vy: 0,
              r: 10,
              color: '#ff4d42',
              core: '#ffffff',
              glyph: PHASE2_WORDS[idx++ % PHASE2_WORDS.length],
              kind: 'wall',
              maxAge: 6,
            });
          }
        }

        // 3. Full-screen intersecting Judgment Laser grid locked onto player's coordinates
        timers.p2Laser -= dt;
        if (timers.p2Laser <= 0) {
          timers.p2Laser = 0.38;
          // Pin the player with vertical, horizontal, and diagonal beams
          spawnLaser(player.x, 0, player.x, height, 0.22, 0.55, 52);
          spawnLaser(0, player.y, width, player.y, 0.22, 0.55, 52);
          spawnLaser(player.x - 600, player.y - 600, player.x + 600, player.y + 600, 0.22, 0.55, 44);
          spawnLaser(player.x + 600, player.y - 600, player.x - 600, player.y + 600, 0.22, 0.55, 44);
        }

        // 4. Absolute guarantee: after 2.6s of Phase 2, flood the entire screen with undodgeable divine wrath
        if (phase2Elapsed > 2.6) {
          timers.p2Nova -= dt;
          if (timers.p2Nova <= 0) {
            timers.p2Nova = 0.16;
            player.invuln = 0;
            triggerHit();
          }
        }
      } else if (phase === 3) {
        deathElapsed += dt;
        if (deathElapsed >= 0.72 && !deathCalledRef.current) {
          deathCalledRef.current = true;
          onPlayerDeath();
          return;
        }
      }

      // Update bullets & collision
      for (let i = bullets.length - 1; i >= 0; i -= 1) {
        const b = bullets[i];
        b.age += dt;

        if (b.kind === 'homing' && b.age < b.burstAt) {
          const desired = Math.atan2(player.y - b.y, player.x - b.x);
          const current = Math.atan2(b.vy, b.vx);
          let diff = desired - current;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const nextAng = current + clamp(diff, -b.turnRate * dt, b.turnRate * dt);
          const spd = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(nextAng) * spd;
          b.vy = Math.sin(nextAng) * spd;
        }

        if (b.burstAt > 0 && b.age >= b.burstAt) {
          // Detonate homing orb into radial crimson shrapnel
          const count = 14;
          for (let k = 0; k < count; k += 1) {
            const ang = (k * Math.PI * 2) / count;
            spawnBullet({
              x: b.x,
              y: b.y,
              vx: Math.cos(ang) * 265,
              vy: Math.sin(ang) * 265,
              r: 5,
              color: '#ff4d42',
              core: '#ffffff',
              kind: 'diamond',
            });
          }
          spawnParticles(b.x, b.y, '#ff4d42', 10, 180);
          bullets.splice(i, 1);
          continue;
        }

        b.x += b.vx * dt;
        b.y += b.vy * dt;

        if (
          b.age > b.maxAge ||
          b.x < -80 ||
          b.x > width + 80 ||
          b.y < -80 ||
          b.y > height + 80
        ) {
          bullets.splice(i, 1);
          continue;
        }

        if (phase === 1 || phase === 2) {
          const dx = b.x - player.x;
          const dy = b.y - player.y;
          const distSq = dx * dx + dy * dy;
          const hitR = b.r * 0.72 + PLAYER_HITBOX_R;

          if (distSq < hitR * hitR) {
            bullets.splice(i, 1);
            triggerHit();
            continue;
          }

          if (!b.grazed && distSq < (b.r + PLAYER_GRAZE_R) ** 2) {
            b.grazed = true;
            player.graze += 1;
            spawnParticles(player.x, player.y, '#dbffad', 3, 140);
            if (player.graze % 3 === 0) playBulletSfx('graze');
          }
        }
      }

      // Update lasers & collision
      for (let i = lasers.length - 1; i >= 0; i -= 1) {
        const l = lasers[i];
        l.age += dt;
        if (l.age >= l.warnTime && !l.firedSfx) {
          l.firedSfx = true;
          screenShake = Math.max(screenShake, 7);
          playBulletSfx('laser');
        }
        if (l.age >= l.warnTime + l.activeTime) {
          lasers.splice(i, 1);
          continue;
        }

        if ((phase === 1 || phase === 2) && l.age >= l.warnTime) {
          const distSq = pointToSegmentDistSq(player.x, player.y, l.x1, l.y1, l.x2, l.y2);
          const threshold = l.beamWidth * 0.42 + PLAYER_HITBOX_R;
          if (distSq < threshold * threshold) {
            triggerHit();
          }
        }
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.age = (p.age ?? 0) + dt;
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Decay screen shake & flash
      screenShake *= Math.pow(0.05, dt);
      flashAlpha = Math.max(0, flashAlpha - dt * 1.9);

      // Update React HUD at ~15Hz to keep canvas rendering silky smooth
      hudTick += dt;
      if (hudTick >= 0.065) {
        hudTick = 0;
        if (phase === 1) {
          setHud((h) => ({
            ...h,
            hp: player.hp,
            graze: player.graze,
            timeLeft: Math.max(0, PHASE1_DURATION - elapsed),
          }));
        } else if (phase === 2) {
          setHud((h) => ({
            ...h,
            hp: player.hp,
            graze: player.graze,
          }));
        }
      }

      // === RENDER ===
      ctx.clearRect(0, 0, width, height);
      ctx.save();

      if (screenShake > 0.3) {
        const sx = (Math.random() - 0.5) * screenShake * 2;
        const sy = (Math.random() - 0.5) * screenShake * 2;
        ctx.translate(sx, sy);
      }

      // Subtle dark-crimson danger vignette in Phase 2
      if (phase === 2 || phase === 1.5) {
        const pulse = 0.14 + Math.sin(now * 0.015) * 0.07;
        ctx.fillStyle = `rgba(255, 25, 20, ${pulse.toFixed(3)})`;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw lasers
      for (const l of lasers) {
        if (l.age < l.warnTime) {
          const warnRatio = l.age / l.warnTime;
          ctx.save();
          ctx.strokeStyle = `rgba(255, 77, 66, ${(0.25 + warnRatio * 0.55).toFixed(2)})`;
          ctx.lineWidth = 1.5 + warnRatio * 2;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(l.x1, l.y1);
          ctx.lineTo(l.x2, l.y2);
          ctx.stroke();
          ctx.restore();
        } else {
          const fade = 1 - (l.age - l.warnTime) / l.activeTime;
          const w = l.beamWidth * (0.7 + fade * 0.45);
          ctx.save();
          ctx.lineCap = 'round';
          // Outer crimson glow
          ctx.strokeStyle = `rgba(255, 45, 36, ${(0.55 * fade).toFixed(2)})`;
          ctx.lineWidth = w * 1.9;
          ctx.beginPath();
          ctx.moveTo(l.x1, l.y1);
          ctx.lineTo(l.x2, l.y2);
          ctx.stroke();
          // Blazing white core
          ctx.strokeStyle = `rgba(255, 245, 240, ${(0.95 * fade).toFixed(2)})`;
          ctx.lineWidth = w * 0.55;
          ctx.beginPath();
          ctx.moveTo(l.x1, l.y1);
          ctx.lineTo(l.x2, l.y2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Draw bullets
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (const b of bullets) {
        if (b.kind === 'glyph' || b.kind === 'wall') {
          ctx.fillStyle = b.color;
          ctx.font = b.kind === 'wall'
            ? '700 13px "IBM Plex Mono", monospace'
            : '700 16px "IBM Plex Mono", monospace';
          ctx.fillText(b.glyph || '†', b.x, b.y);
          ctx.fillStyle = b.core;
          ctx.beginPath();
          ctx.arc(b.x, b.y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (b.kind === 'diamond') {
          const ang = Math.atan2(b.vy, b.vx);
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(ang);
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.moveTo(b.r * 1.65, 0);
          ctx.lineTo(0, b.r * 0.85);
          ctx.lineTo(-b.r * 1.3, 0);
          ctx.lineTo(0, -b.r * 0.85);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = b.core;
          ctx.beginPath();
          ctx.arc(0, 0, b.r * 0.36, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (b.kind === 'homing') {
          const pulse = 1 + Math.sin(now * 0.025) * 0.18;
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = b.core;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = b.core;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw particles
      for (const p of particles) {
        const a = clamp(p.life / p.maxLife, 0, 1);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = a;
        ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
      }
      ctx.globalAlpha = 1;

      // Draw player ship & hitbox
      if (phase !== 3) {
        // Afterimage trail
        for (const t of player.trail) {
          ctx.fillStyle = `rgba(219, 255, 173, ${(t.alpha * 0.25).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        const blinkHide = player.invuln > 0 && Math.floor(now / 55) % 2 === 0;
        if (!blinkHide) {
          // Outer soul chevron
          ctx.save();
          ctx.translate(player.x, player.y);
          ctx.strokeStyle = '#dbffad';
          ctx.fillStyle = 'rgba(219, 255, 173, 0.22)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, -14);
          ctx.lineTo(11, 10);
          ctx.lineTo(0, 5);
          ctx.lineTo(-11, 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Focus ring when holding Shift
          if (player.focus) {
            ctx.strokeStyle = 'rgba(219, 255, 173, 0.72)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(0, 0, PLAYER_GRAZE_R, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Exact crisp core hitbox
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, PLAYER_HITBOX_R, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ff4d42';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }
      }

      // White/crimson impact flash
      if (flashAlpha > 0.01) {
        ctx.fillStyle = phase === 3
          ? `rgba(255, 36, 28, ${flashAlpha.toFixed(2)})`
          : `rgba(255, 255, 255, ${(flashAlpha * 0.45).toFixed(2)})`;
        ctx.fillRect(-40, -40, width + 80, height + 80);
      }

      ctx.restore();
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [onPlayerDeath]);

  const progressPct =
    hud.phase === 1
      ? clamp(((PHASE1_DURATION - hud.timeLeft) / PHASE1_DURATION) * 100, 0, 100)
      : 100;

  return (
    <div
      className={`bullet-hell-arena${hud.phase >= 1.5 ? ' is-phase2' : ''}`}
      role="application"
      aria-label="Academic Integrity Judgment Bullet Hell"
    >
      <AsciiBackdrop locked />

      {/* Live Angry ASCII Ophanim Boss tracking the player */}
      <div className="bullet-hell-boss" ref={bossWrapRef} aria-hidden="true">
        <OphanimAscii
          revealed
          locked
          enraged={hud.phase >= 1.5}
          pending={false}
          isTyping={false}
          draftLength={0}
          variant="boss"
          gazeTargetRef={gazeTargetRef}
        />
      </div>

      {/* 60fps Bullet Hell Canvas */}
      <canvas ref={canvasRef} className="bullet-hell-canvas" />

      {/* Top Battle HUD */}
      <header className="bh-hud">
        <div className="bh-hud-group">
          <span className="bh-phase-tag">{hud.banner}</span>
          <div className="bh-stats">
            <span className="bh-hp" aria-label={`Integrity shields: ${hud.hp} of ${MAX_HP}`}>
              SHIELD{' '}
              {Array.from({ length: MAX_HP }, (_, i) => (
                <span key={i} className={`bh-pip${i < hud.hp ? ' is-full' : ''}`} />
              ))}
            </span>
            <span className="bh-graze">GRAZE {String(hud.graze).padStart(3, '0')}</span>
          </div>
        </div>

        <div className="bh-timer-box">
          <div className="bh-timer-row">
            <span className="bh-timer-label">
              {hud.phase === 1 ? 'SURVIVE TO CHEAT' : 'PHASE 02 // NO ESCAPE'}
            </span>
            <span className="bh-timer-value">
              {hud.phase === 1 ? `${hud.timeLeft.toFixed(1)}s` : '∞:∞∞'}
            </span>
          </div>
          <div className="bh-progress-track">
            <div className="bh-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </header>

      {/* Center glitch callout during Phase 2 fake-out */}
      {hud.phase === 1.5 && (
        <div className="bh-phase2-overlay" role="status">
          <p className="bh-phase2-eyebrow">ANSWER UNLOCK — [OVERRIDDEN]</p>
          <h2 className="cheat-glitch-title" data-text="PHASE 2: ABSOLUTE WRATH">
            PHASE 2: ABSOLUTE WRATH
          </h2>
          <p className="bh-phase2-sub">{hud.subBanner}</p>
        </div>
      )}

      <div className="bh-controls-hint" aria-hidden="true">
        WASD / ARROWS TO DODGE · SHIFT FOR PRECISION FOCUS · CLICK &amp; DRAG TO STEER
      </div>

      <audio
        ref={bossAudioRef}
        src={bossMusic}
        loop
        preload="auto"
        hidden
        aria-hidden="true"
      />
    </div>
  );
}

import { useEffect, useRef } from 'react';

const MATRIX_CHARS =
  '01234567890123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+-=<>/?|~';

function nextChar(prev) {
  let ch = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
  if (ch === prev) {
    ch = MATRIX_CHARS[(MATRIX_CHARS.indexOf(prev) + 1) % MATRIX_CHARS.length];
  }
  return ch;
}

export default function AsciiBackdrop({ locked }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cellW = 14;
    const cellH = 18;
    const fontSpec = '700 13px "IBM Plex Mono", ui-monospace, monospace';

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let grid = [];
    let flash = new Float32Array(0);
    let activeCells = new Set();
    let streams = [];

    const warpPoint = (px, py) => {
      const nx = (px / Math.max(1, width)) * 2 - 1;
      const ny = (py / Math.max(1, height)) * 2 - 1;
      const r2 = nx * nx + ny * ny;
      const factor = 1 + 0.055 * r2;
      return {
        x: (nx * factor * 0.5 + 0.5) * width,
        y: (ny * factor * 0.5 + 0.5) * height,
        r2,
      };
    };

    const drawCell = (c, r, clearFirst = false) => {
      const idx = r * cols + c;
      const baseX = c * cellW + cellW * 0.5;
      const baseY = r * cellH + cellH * 0.5;
      const warped = warpPoint(baseX, baseY);

      if (clearFirst) {
        ctx.clearRect(warped.x - cellW * 0.5, warped.y - cellH * 0.5, cellW, cellH);
      }

      const wave1 = Math.sin(c * 0.11 + Math.cos(r * 0.16)) * 0.5 + 0.5;
      const wave2 = Math.cos(c * 0.06 - r * 0.12) * 0.5 + 0.5;
      const cluster = wave1 * 0.62 + wave2 * 0.38;
      const seed = Math.abs(Math.sin(r * 127.1 + c * 311.7) * 43758.5453) % 1;

      const ch = grid[idx] || MATRIX_CHARS[Math.floor(seed * MATRIX_CHARS.length)];
      const f = flash[idx] || 0;
      const edgeFade = Math.max(0.52, 1 - warped.r2 * 0.18);
      const isHot = cluster > 0.68 && seed > 0.48;
      const baseAlpha = (isHot ? 0.42 : 0.18 + cluster * 0.18) * edgeFade;
      const alpha = Math.min(0.58, baseAlpha + f * 0.24);

      if (locked) {
        if (f > 0.45) {
          ctx.fillStyle = `rgba(255, 186, 174, ${alpha.toFixed(3)})`;
        } else if (f > 0.08 || isHot) {
          ctx.fillStyle = `rgba(244, 112, 96, ${alpha.toFixed(3)})`;
        } else if (cluster > 0.48) {
          ctx.fillStyle = `rgba(220, 64, 52, ${alpha.toFixed(3)})`;
        } else {
          ctx.fillStyle = `rgba(168, 38, 32, ${alpha.toFixed(3)})`;
        }
      } else if (f > 0.45) {
        ctx.fillStyle = `rgba(255, 224, 160, ${alpha.toFixed(3)})`;
      } else if (f > 0.08 || isHot) {
        ctx.fillStyle = `rgba(245, 178, 84, ${alpha.toFixed(3)})`;
      } else if (cluster > 0.48) {
        ctx.fillStyle = `rgba(228, 126, 36, ${alpha.toFixed(3)})`;
      } else {
        ctx.fillStyle = `rgba(184, 82, 20, ${alpha.toFixed(3)})`;
      }

      ctx.fillText(ch, warped.x, warped.y);
    };

    const initStreams = () => {
      const count = Math.max(6, Math.floor(cols / 12));
      streams = Array.from({ length: count }, () => ({
        c: Math.floor(Math.random() * cols),
        r: Math.floor(Math.random() * rows),
        speed: 1,
      }));
    };

    const renderAll = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      cols = Math.ceil(width / cellW) + 2;
      rows = Math.ceil(height / cellH) + 2;
      const total = cols * rows;

      grid = Array.from({ length: total }, (_, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        const h = Math.abs(Math.sin(r * 127.1 + c * 311.7) * 43758.5453) % 1;
        return MATRIX_CHARS[Math.floor(h * MATRIX_CHARS.length)];
      });
      flash = new Float32Array(total);
      activeCells = new Set();
      initStreams();

      ctx.clearRect(0, 0, width, height);
      ctx.font = fontSpec;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          drawCell(c, r, false);
        }
      }
    };

    renderAll();
    window.addEventListener('resize', renderAll);

    const tickMs = reducedMotion ? 420 : 260;
    const timer = window.setInterval(() => {
      if (cols === 0 || rows === 0) return;
      ctx.font = fontSpec;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const toRedraw = new Set();

      // Decay previously flashed cells so they smoothly fade back to resting amber
      for (const idx of activeCells) {
        flash[idx] *= 0.68;
        if (flash[idx] < 0.05) {
          flash[idx] = 0;
          activeCells.delete(idx);
        }
        toRedraw.add(idx);
      }

      // Advance cascading vertical streams so changes sweep visibly across the backdrop
      for (let i = 0; i < streams.length; i += 1) {
        const stream = streams[i];
        for (let step = 0; step < stream.speed; step += 1) {
          stream.r += 1;
          if (stream.r >= rows) {
            stream.r = 0;
            stream.c = Math.floor(Math.random() * cols);
          }
          const idx = stream.r * cols + stream.c;
          grid[idx] = nextChar(grid[idx]);
          flash[idx] = 1;
          activeCells.add(idx);
          toRedraw.add(idx);
        }
      }

      // Mutate a gentle scatter of cells across the screen
      const batchSize = Math.max(24, Math.floor(cols * rows * (reducedMotion ? 0.004 : 0.008)));
      for (let i = 0; i < batchSize; i += 1) {
        const c = Math.floor(Math.random() * cols);
        const r = Math.floor(Math.random() * rows);
        const idx = r * cols + c;
        grid[idx] = nextChar(grid[idx]);
        flash[idx] = 1;
        activeCells.add(idx);
        toRedraw.add(idx);
      }

      for (const idx of toRedraw) {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        if (c < cols && r < rows) {
          drawCell(c, r, true);
        }
      }
    }, tickMs);

    return () => {
      window.removeEventListener('resize', renderAll);
      window.clearInterval(timer);
    };
  }, [locked]);

  return (
    <div className={`ascii-backdrop${locked ? ' is-locked' : ''}`} aria-hidden="true">
      <canvas ref={canvasRef} className="ascii-backdrop-canvas" />
      <div className="ascii-backdrop-vignette" />
    </div>
  );
}

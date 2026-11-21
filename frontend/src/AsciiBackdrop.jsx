import { useEffect, useRef } from 'react';

const MATRIX_CHARS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()-_=+[]{};:,.<>/?\\|~';

export default function AsciiBackdrop({ locked }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cellW = 12;
    const cellH = 16;
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let grid = [];

    const warpPoint = (px, py) => {
      const nx = (px / Math.max(1, width)) * 2 - 1;
      const ny = (py / Math.max(1, height)) * 2 - 1;
      const r2 = nx * nx + ny * ny;
      const factor = 1 + 0.065 * r2;
      return {
        x: (nx * factor * 0.5 + 0.5) * width,
        y: (ny * factor * 0.5 + 0.5) * height,
        r2,
      };
    };

    const drawCell = (c, r, clearFirst = false) => {
      const baseX = c * cellW + cellW * 0.5;
      const baseY = r * cellH + cellH * 0.5;
      const warped = warpPoint(baseX, baseY);

      if (clearFirst) {
        ctx.clearRect(warped.x - 7, warped.y - 8, 14, 16);
      }

      const wave1 = Math.sin(c * 0.11 + Math.cos(r * 0.16)) * 0.5 + 0.5;
      const wave2 = Math.cos(c * 0.06 - r * 0.12) * 0.5 + 0.5;
      const cluster = wave1 * 0.62 + wave2 * 0.38;
      const seed = Math.abs(Math.sin(r * 127.1 + c * 311.7) * 43758.5453) % 1;

      if (cluster < 0.18 && seed < 0.45) return;

      const ch = grid[r * cols + c] || MATRIX_CHARS[Math.floor(seed * MATRIX_CHARS.length)];
      const edgeFade = Math.max(0.45, 1 - warped.r2 * 0.2);
      const isHot = cluster > 0.72 && seed > 0.52;
      // Atmospheric opacity—clearly legible without overpowering foreground UI
      const alpha = Math.min(0.44, (isHot ? 0.42 : 0.18 + cluster * 0.2) * edgeFade);

      if (locked) {
        if (isHot) {
          ctx.fillStyle = `rgba(255, 92, 76, ${alpha.toFixed(3)})`;
        } else if (cluster > 0.5) {
          ctx.fillStyle = `rgba(214, 52, 42, ${alpha.toFixed(3)})`;
        } else {
          ctx.fillStyle = `rgba(156, 34, 28, ${alpha.toFixed(3)})`;
        }
      } else if (isHot) {
        ctx.fillStyle = `rgba(255, 168, 58, ${alpha.toFixed(3)})`;
      } else if (cluster > 0.5) {
        ctx.fillStyle = `rgba(232, 108, 22, ${alpha.toFixed(3)})`;
      } else {
        ctx.fillStyle = `rgba(176, 68, 16, ${alpha.toFixed(3)})`;
      }

      ctx.fillText(ch, warped.x, warped.y);
    };

    const renderAll = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      cols = Math.ceil(width / cellW) + 2;
      rows = Math.ceil(height / cellH) + 2;
      grid = Array.from({ length: cols * rows }, (_, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        const h = Math.abs(Math.sin(r * 127.1 + c * 311.7) * 43758.5453) % 1;
        return MATRIX_CHARS[Math.floor(h * MATRIX_CHARS.length)];
      });

      ctx.clearRect(0, 0, width, height);
      ctx.font = '600 11.5px "IBM Plex Mono", ui-monospace, monospace';
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

    let timer = null;
    if (!reducedMotion) {
      timer = window.setInterval(() => {
        if (cols === 0 || rows === 0) return;
        ctx.font = '600 11.5px "IBM Plex Mono", ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < 14; i += 1) {
          const c = Math.floor(Math.random() * cols);
          const r = Math.floor(Math.random() * rows);
          grid[r * cols + c] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
          drawCell(c, r, true);
        }
      }, 120);
    }

    return () => {
      window.removeEventListener('resize', renderAll);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [locked]);

  return (
    <div className="ascii-backdrop" aria-hidden="true">
      <canvas ref={canvasRef} className="ascii-backdrop-canvas" />
      <div className="ascii-backdrop-vignette" />
    </div>
  );
}

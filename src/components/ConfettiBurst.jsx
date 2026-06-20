import { useEffect, useRef } from "react";

const COLORS = ["#7c3aed", "#06b6d4", "#f43f5e", "#f59e0b", "#22c55e", "#a78bfa", "#fcd34d"];

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

export default function ConfettiBurst({ duration = 3200, particleCount = 120 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    let frameId;
    let running = true;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: particleCount }, () => ({
      x: randomBetween(0, canvas.width),
      y: randomBetween(-canvas.height * 0.2, -20),
      w: randomBetween(6, 11),
      h: randomBetween(10, 18),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: randomBetween(0, 360),
      spin: randomBetween(-8, 8),
      vx: randomBetween(-2.5, 2.5),
      vy: randomBetween(2.5, 6.5),
      opacity: 1,
    }));

    const start = performance.now();

    function draw(now) {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const elapsed = now - start;
      const fadeStart = duration * 0.65;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.rotation += p.spin;

        if (elapsed > fadeStart) {
          p.opacity = Math.max(0, 1 - (elapsed - fadeStart) / (duration - fadeStart));
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (elapsed < duration) {
        frameId = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        running = false;
      }
    }

    frameId = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, [duration, particleCount]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 1300,
      }}
    />
  );
}

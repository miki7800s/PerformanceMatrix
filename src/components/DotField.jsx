import { useEffect, useRef } from "react";

export function DotField({
  dotRadius = 3,
  dotSpacing = 21,
  cursorRadius = 500,
  cursorForce = 0.1,
  bulgeOnly = true,
  bulgeStrength = 67,
  glowRadius = 160,
  sparkle = false,
  waveAmplitude = 0,
}) {
  const canvasRef = useRef(null);
  const pointerRef = useRef({ x: -9999, y: -9999, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext("2d");
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let deviceRatio = 1;
    let dots = [];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      deviceRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(Math.floor(rect.width), 1);
      height = Math.max(Math.floor(rect.height), 1);
      canvas.width = Math.floor(width * deviceRatio);
      canvas.height = Math.floor(height * deviceRatio);
      context.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);
      dots = buildDots(width, height, dotSpacing);
    }

    function draw(time = 0) {
      context.clearRect(0, 0, width, height);
      const pointer = pointerRef.current;

      if (pointer.active && glowRadius > 0) {
        const gradient = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, glowRadius);
        gradient.addColorStop(0, "rgba(101, 255, 225, 0.22)");
        gradient.addColorStop(0.52, "rgba(91, 113, 255, 0.10)");
        gradient.addColorStop(1, "rgba(91, 113, 255, 0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      }

      context.fillStyle = "rgba(12, 52, 73, 0.26)";

      for (const dot of dots) {
        const dx = dot.x - pointer.x;
        const dy = dot.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        const influence = pointer.active ? Math.max(0, 1 - distance / cursorRadius) : 0;
        const wave = waveAmplitude ? Math.sin(time / 900 + dot.x * 0.02 + dot.y * 0.015) * waveAmplitude : 0;
        const push = bulgeOnly ? influence * bulgeStrength : influence * cursorForce * cursorRadius;
        const angle = distance > 0 ? Math.atan2(dy, dx) : 0;
        const x = dot.x + Math.cos(angle) * push;
        const y = dot.y + Math.sin(angle) * push + wave;
        const radius = dotRadius + influence * dotRadius * 1.25 + (sparkle ? Math.sin(time / 420 + dot.seed) * 0.45 : 0);

        context.beginPath();
        context.arc(x, y, Math.max(radius, 0.8), 0, Math.PI * 2);
        context.fill();
      }

      if (!media.matches) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    }

    function updatePointer(event) {
      const rect = canvas.getBoundingClientRect();
      pointerRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        active: true,
      };
    }

    function clearPointer() {
      pointerRef.current.active = false;
    }

    resize();
    draw();

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", updatePointer, { passive: true });
    window.addEventListener("blur", clearPointer);
    document.addEventListener("mouseleave", clearPointer);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", updatePointer);
      window.removeEventListener("blur", clearPointer);
      document.removeEventListener("mouseleave", clearPointer);
    };
  }, [bulgeOnly, bulgeStrength, cursorForce, cursorRadius, dotRadius, dotSpacing, glowRadius, sparkle, waveAmplitude]);

  return <canvas ref={canvasRef} className="dot-field" aria-hidden="true" />;
}

function buildDots(width, height, dotSpacing) {
  const dots = [];
  const cols = Math.ceil(width / dotSpacing) + 2;
  const rows = Math.ceil(height / dotSpacing) + 2;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      dots.push({
        x: col * dotSpacing - dotSpacing,
        y: row * dotSpacing - dotSpacing,
        seed: row * 31 + col * 17,
      });
    }
  }

  return dots;
}

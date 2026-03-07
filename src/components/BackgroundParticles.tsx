import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
}

interface BackgroundParticlesProps {
  count?: number;
}

export const BackgroundParticles: React.FC<BackgroundParticlesProps> = ({ count = 40 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let glowOrbs: Particle[] = [];
    let stars: (Particle & { rotation: number, twinkleSpeed: number })[] = [];
    let triangles: (Particle & { rotation: number, rotSpeed: number })[] = [];
    const particleCount = count;
    const orbCount = Math.ceil(count * 0.375);
    const starCount = Math.ceil(count * 0.5);
    const triangleCount = Math.ceil(count * 0.375);

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      glowOrbs = [];
      stars = [];
      triangles = [];

      // Standard sharp particles
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          speedX: (Math.random() - 0.5) * 0.5,
          speedY: (Math.random() - 0.5) * 0.5,
          opacity: Math.random() * 0.5 + 0.1,
        });
      }

      // Large glow orbs
      for (let i = 0; i < orbCount; i++) {
        glowOrbs.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 100 + 50,
          speedX: (Math.random() - 0.5) * 0.1,
          speedY: (Math.random() - 0.5) * 0.1,
          opacity: Math.random() * 0.05 + 0.02,
        });
      }

      // Twinkling Stars (Cross shape)
      for (let i = 0; i < starCount; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 3 + 2,
          speedX: (Math.random() - 0.5) * 0.05,
          speedY: (Math.random() - 0.5) * 0.05,
          opacity: Math.random() * 0.8 + 0.2,
          rotation: Math.random() * Math.PI,
          twinkleSpeed: Math.random() * 0.05 + 0.01
        });
      }

      // Geometric Triangles
      for (let i = 0; i < triangleCount; i++) {
        triangles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 8 + 4,
          speedX: (Math.random() - 0.5) * 0.15,
          speedY: (Math.random() - 0.5) * 0.15,
          opacity: Math.random() * 0.2 + 0.05,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.02
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Glow Orbs (farthest)
      glowOrbs.forEach((orb) => {
        orb.x += orb.speedX;
        orb.y += orb.speedY;

        if (orb.x < -orb.size) orb.x = canvas.width + orb.size;
        if (orb.x > canvas.width + orb.size) orb.x = -orb.size;
        if (orb.y < -orb.size) orb.y = canvas.height + orb.size;
        if (orb.y > canvas.height + orb.size) orb.y = -orb.size;

        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.size);
        gradient.addColorStop(0, `rgba(148, 163, 184, ${orb.opacity})`);
        gradient.addColorStop(1, 'rgba(148, 163, 184, 0)');

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      // 2. Draw Twinkling Stars
      stars.forEach((s) => {
        s.x += s.speedX;
        s.y += s.speedY;
        s.rotation += 0.01;
        s.opacity += Math.sin(Date.now() * s.twinkleSpeed) * 0.02;
        if (s.opacity < 0.1) s.opacity = 0.1;
        if (s.opacity > 1) s.opacity = 1;

        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width) s.x = 0;
        if (s.y < 0) s.y = canvas.height;
        if (s.y > canvas.height) s.y = 0;

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 255, 255, ${s.opacity * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.moveTo(-s.size, 0);
        ctx.lineTo(s.size, 0);
        ctx.moveTo(0, -s.size);
        ctx.lineTo(0, s.size);
        ctx.stroke();
        ctx.restore();
      });

      // 3. Draw Geometric Triangles
      triangles.forEach((t) => {
        t.x += t.speedX;
        t.y += t.speedY;
        t.rotation += t.rotSpeed;

        if (t.x < -t.size) t.x = canvas.width + t.size;
        if (t.x > canvas.width + t.size) t.x = -t.size;
        if (t.y < -t.size) t.y = canvas.height + t.size;
        if (t.y > canvas.height + t.size) t.y = -t.size;

        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.rotation);
        ctx.beginPath();
        ctx.moveTo(0, -t.size);
        ctx.lineTo(t.size, t.size);
        ctx.lineTo(-t.size, t.size);
        ctx.closePath();
        ctx.strokeStyle = `rgba(148, 163, 184, ${t.opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      });

      // 4. Draw standard particles (closest)
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 116, 139, ${p.opacity})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: 'multiply' }}
    />
  );
};

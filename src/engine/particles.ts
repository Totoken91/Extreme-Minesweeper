const PARTICLE_COLORS = ["#ff3b3b", "#ff6d00", "#ffd600", "#ff8800", "#ff4444"];

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface ParticleSystem {
  particles: Particle[];
}

export function createParticleSystem(): ParticleSystem {
  return { particles: [] };
}

export function spawnExplosion(
  system: ParticleSystem,
  x: number,
  y: number,
  count = 20
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 120;
    system.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      life: 600 + Math.random() * 300,
      maxLife: 600 + Math.random() * 300,
      size: 1.5 + Math.random() * 3,
    });
  }
}

export function updateParticles(system: ParticleSystem, dt: number): void {
  const dtSec = dt / 1000;

  for (let i = system.particles.length - 1; i >= 0; i--) {
    const p = system.particles[i];
    p.x += p.vx * dtSec;
    p.y += p.vy * dtSec;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.vy += 80 * dtSec; // slight gravity
    p.life -= dt;

    if (p.life <= 0) {
      system.particles.splice(i, 1);
    }
  }
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  system: ParticleSystem
): void {
  for (const p of system.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

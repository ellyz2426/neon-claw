// effects.ts — Particle effects, claw trail, screen shake
import {
  Mesh, Group, SphereGeometry, MeshBasicMaterial, AdditiveBlending, Color, Vector3,
} from '@iwsdk/core';

// ─── Particle System ─────────────────────────────────────
interface Particle {
  mesh: Mesh;
  vel: Vector3;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private pool: Particle[] = [];
  private parent: Group;
  private maxParticles = 100;

  constructor(parent: Group) {
    this.parent = parent;
    for (let i = 0; i < this.maxParticles; i++) {
      const mesh = new Mesh(
        new SphereGeometry(0.008, 4, 3),
        new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: AdditiveBlending }),
      );
      mesh.visible = false;
      parent.add(mesh);
      this.pool.push({ mesh, vel: new Vector3(), life: 0, maxLife: 0 });
    }
  }

  burst(pos: Vector3, color: string, count: number, speed: number = 1.5, life: number = 0.8): void {
    const c = new Color(color);
    for (let i = 0; i < count; i++) {
      const p = this.pool.pop();
      if (!p) break;
      p.mesh.position.copy(pos);
      (p.mesh.material as MeshBasicMaterial).color.copy(c);
      (p.mesh.material as MeshBasicMaterial).opacity = 0.8;
      p.mesh.visible = true;
      p.vel.set(
        (Math.random() - 0.5) * speed,
        Math.random() * speed * 0.8 + speed * 0.3,
        (Math.random() - 0.5) * speed,
      );
      p.life = life;
      p.maxLife = life;
      this.particles.push(p);
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.visible = false;
        this.pool.push(p);
        this.particles.splice(i, 1);
        continue;
      }
      p.vel.y -= 2.5 * dt; // gravity
      p.mesh.position.addScaledVector(p.vel, dt);
      const frac = p.life / p.maxLife;
      (p.mesh.material as MeshBasicMaterial).opacity = frac * 0.8;
      p.mesh.scale.setScalar(0.5 + frac * 0.5);
    }
  }
}

// ─── Claw Position Indicator ─────────────────────────────
export function createClawShadow(): Mesh {
  const geo = new SphereGeometry(0.03, 8, 4);
  geo.scale(1, 0.1, 1);
  const mat = new MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3, blending: AdditiveBlending });
  const shadow = new Mesh(geo, mat);
  shadow.visible = false;
  return shadow;
}

export function updateClawShadow(shadow: Mesh, clawX: number, clawZ: number, floorY: number, active: boolean, time: number): void {
  shadow.visible = active;
  if (!active) return;
  shadow.position.set(clawX, floorY + 0.01, clawZ);
  const pulse = 0.8 + 0.2 * Math.sin(time * 4);
  shadow.scale.set(pulse, 0.1, pulse);
  (shadow.material as MeshBasicMaterial).opacity = 0.2 + 0.1 * Math.sin(time * 3);
}

// ─── Screen Shake (Browser only) ─────────────────────────
export class ScreenShake {
  intensity = 0;
  duration = 0;
  elapsed = 0;
  offset = new Vector3();

  trigger(intensity: number, duration: number): void {
    this.intensity = intensity;
    this.duration = duration;
    this.elapsed = 0;
  }

  update(dt: number): Vector3 {
    if (this.elapsed >= this.duration) {
      this.offset.set(0, 0, 0);
      return this.offset;
    }
    this.elapsed += dt;
    const decay = 1 - this.elapsed / this.duration;
    const i = this.intensity * decay;
    this.offset.set(
      (Math.random() - 0.5) * i * 2,
      (Math.random() - 0.5) * i * 2,
      (Math.random() - 0.5) * i * 0.5,
    );
    return this.offset;
  }
}

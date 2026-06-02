// powerups.ts — Power-up system for Neon Claw VR
import {
  Mesh, Group, SphereGeometry, TorusGeometry, OctahedronGeometry, ConeGeometry,
  MeshBasicMaterial, MeshStandardMaterial, AdditiveBlending, Color,
} from '@iwsdk/core';

// ─── Power-Up Types ──────────────────────────────────────
export interface PowerUpDef {
  id: string;
  name: string;
  desc: string;
  duration: number;  // seconds, 0 = instant
  color: string;
  icon: string;      // text label
}

export const POWERUP_DEFS: PowerUpDef[] = [
  { id: 'strong_grip', name: 'Strong Grip', desc: 'Max claw strength for 15s', duration: 15, color: '#ff4444', icon: 'GRIP' },
  { id: 'slow_mo', name: 'Slow Motion', desc: 'Claw drops slowly for precision', duration: 12, color: '#4488ff', icon: 'SLOW' },
  { id: 'magnet', name: 'Magnet Pull', desc: 'Attract nearest prize on grab', duration: 10, color: '#ff00ff', icon: 'MAG' },
  { id: 'double_tickets', name: 'Double Tickets', desc: '2x tickets for 20s', duration: 20, color: '#ffdd00', icon: '2xT' },
  { id: 'x_ray', name: 'X-Ray Vision', desc: 'See prize rarities through glass', duration: 15, color: '#00ff88', icon: 'XRAY' },
];

// ─── Active Power-Up State ───────────────────────────────
export interface ActivePowerUp {
  def: PowerUpDef;
  remaining: number;
}

export class PowerUpManager {
  active: ActivePowerUp[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 25; // seconds between spawns
  orbs: PowerUpOrb[] = [];
  totalCollected: number = 0;

  update(dt: number): void {
    // Decay active power-ups
    for (let i = this.active.length - 1; i >= 0; i--) {
      this.active[i].remaining -= dt;
      if (this.active[i].remaining <= 0) {
        this.active.splice(i, 1);
      }
    }

    // Spawn timer
    this.spawnTimer += dt;

    // Update orb animations
    for (const orb of this.orbs) {
      if (!orb.alive) continue;
      orb.age += dt;
      orb.mesh.rotation.y += dt * 2;
      const bob = Math.sin(orb.age * 3) * 0.01;
      orb.mesh.position.y = orb.baseY + bob;
      const pulse = 0.8 + 0.2 * Math.sin(orb.age * 5);
      if (orb.glowMesh) {
        (orb.glowMesh.material as MeshBasicMaterial).opacity = 0.15 * pulse;
      }
      // Expire after 12 seconds
      if (orb.age > 12) {
        orb.alive = false;
        orb.mesh.visible = false;
      }
    }
  }

  shouldSpawn(): boolean {
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      return true;
    }
    return false;
  }

  activate(def: PowerUpDef): void {
    // Remove existing of same type
    this.active = this.active.filter(a => a.def.id !== def.id);
    this.active.push({ def, remaining: def.duration });
    this.totalCollected++;
  }

  has(id: string): boolean {
    return this.active.some(a => a.def.id === id);
  }

  getRemaining(id: string): number {
    const a = this.active.find(x => x.def.id === id);
    return a ? a.remaining : 0;
  }

  reset(): void {
    this.active = [];
    this.spawnTimer = 0;
  }
}

// ─── Power-Up Orb Mesh ──────────────────────────────────
export interface PowerUpOrb {
  mesh: Group;
  glowMesh: Mesh | null;
  def: PowerUpDef;
  baseY: number;
  age: number;
  alive: boolean;
}

export function createPowerUpOrb(def: PowerUpDef, x: number, y: number, z: number): PowerUpOrb {
  const group = new Group();
  const color = new Color(def.color);

  // Core shape varies by type
  let coreGeo: any;
  switch (def.id) {
    case 'strong_grip': coreGeo = new OctahedronGeometry(0.04, 0); break;
    case 'slow_mo': coreGeo = new TorusGeometry(0.03, 0.01, 6, 12); break;
    case 'magnet': coreGeo = new ConeGeometry(0.03, 0.06, 6); break;
    case 'double_tickets': coreGeo = new SphereGeometry(0.035, 8, 6); break;
    case 'x_ray': coreGeo = new SphereGeometry(0.03, 6, 4); break;
    default: coreGeo = new SphereGeometry(0.03, 8, 6);
  }

  const mat = new MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.8, metalness: 0.6, roughness: 0.2,
  });
  const core = new Mesh(coreGeo, mat);
  group.add(core);

  // Orbiting ring
  const ringGeo = new TorusGeometry(0.05, 0.003, 4, 16);
  const ringMat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.4, blending: AdditiveBlending });
  const ring = new Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 3;
  group.add(ring);

  // Glow
  const glowMat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.15, blending: AdditiveBlending });
  const glow = new Mesh(new SphereGeometry(0.06, 6, 4), glowMat);
  group.add(glow);

  group.position.set(x, y, z);

  return { mesh: group, glowMesh: glow, def, baseY: y, age: 0, alive: true };
}

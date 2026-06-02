// environment.ts — Holodeck environment, lighting, particles, decorations
import {
  Mesh, Group, BoxGeometry, SphereGeometry, TorusGeometry, ConeGeometry,
  MeshBasicMaterial, MeshStandardMaterial, LineBasicMaterial,
  EdgesGeometry, LineSegments, AdditiveBlending,
  Color, Vector3, AmbientLight, PointLight, Fog,
} from '@iwsdk/core';
import { ArenaTheme } from './types';

export interface EnvironmentObjects {
  group: Group;
  decorations: Mesh[];
  particles: Mesh[];
  lights: PointLight[];
}

export function createEnvironment(theme: ArenaTheme): EnvironmentObjects {
  const group = new Group();
  const decorations: Mesh[] = [];
  const particles: Mesh[] = [];
  const lights: PointLight[] = [];
  const gridColor = new Color(theme.grid);
  const accentColor = new Color(theme.accent);

  // ─── Neon Grid Floor ─────────────────────────────────
  const gridSize = 20;
  const gridMat = new LineBasicMaterial({ color: gridColor, transparent: true, opacity: 0.2 });
  for (let i = -gridSize; i <= gridSize; i++) {
    // X lines
    const xGeo = new BoxGeometry(gridSize * 2, 0.001, 0.001);
    const xLine = new LineSegments(new EdgesGeometry(xGeo), gridMat);
    xLine.position.set(0, 0, i);
    group.add(xLine);
    // Z lines
    const zGeo = new BoxGeometry(0.001, 0.001, gridSize * 2);
    const zLine = new LineSegments(new EdgesGeometry(zGeo), gridMat);
    zLine.position.set(i, 0, 0);
    group.add(zLine);
  }

  // Ceiling grid
  const ceilY = 5;
  const ceilMat = new LineBasicMaterial({ color: gridColor, transparent: true, opacity: 0.08 });
  for (let i = -gridSize; i <= gridSize; i += 2) {
    const xLine = new LineSegments(new EdgesGeometry(new BoxGeometry(gridSize * 2, 0.001, 0.001)), ceilMat);
    xLine.position.set(0, ceilY, i);
    group.add(xLine);
    const zLine = new LineSegments(new EdgesGeometry(new BoxGeometry(0.001, 0.001, gridSize * 2)), ceilMat);
    zLine.position.set(i, ceilY, 0);
    group.add(zLine);
  }

  // ─── Floating Wireframe Decorations ──────────────────
  const decoShapes = [
    () => new TorusGeometry(0.3, 0.08, 8, 16),
    () => new BoxGeometry(0.4, 0.4, 0.4),
    () => new SphereGeometry(0.25, 8, 6),
    () => new ConeGeometry(0.2, 0.5, 6),
  ];

  for (let i = 0; i < 14; i++) {
    const geo = decoShapes[i % decoShapes.length]();
    const edgesGeo = new EdgesGeometry(geo);
    const color = i % 2 === 0 ? gridColor : accentColor;
    const lineMat = new LineBasicMaterial({ color, transparent: true, opacity: 0.15 });
    const deco = new LineSegments(edgesGeo, lineMat) as any;
    const angle = (i / 14) * Math.PI * 2;
    const radius = 4 + Math.random() * 4;
    deco.position.set(
      Math.cos(angle) * radius,
      1.5 + Math.random() * 2.5,
      Math.sin(angle) * radius,
    );
    deco._baseY = deco.position.y;
    deco._rotSpeed = 0.2 + Math.random() * 0.4;
    deco._bobSpeed = 0.3 + Math.random() * 0.3;
    deco._bobAmp = 0.1 + Math.random() * 0.15;
    group.add(deco);
    decorations.push(deco);
  }

  // ─── Ambient Particles ───────────────────────────────
  const particleMat = new MeshBasicMaterial({ color: gridColor, transparent: true, opacity: 0.3, blending: AdditiveBlending });
  for (let i = 0; i < 40; i++) {
    const p = new Mesh(new SphereGeometry(0.01, 4, 3), particleMat) as any;
    p.position.set(
      (Math.random() - 0.5) * 16,
      0.5 + Math.random() * 4,
      (Math.random() - 0.5) * 16,
    );
    p._baseY = p.position.y;
    p._driftX = (Math.random() - 0.5) * 0.02;
    p._driftZ = (Math.random() - 0.5) * 0.02;
    p._pulseSpeed = 1 + Math.random() * 2;
    p._pulsePhase = Math.random() * Math.PI * 2;
    group.add(p);
    particles.push(p);
  }

  // ─── Lighting ────────────────────────────────────────
  const ambient = new AmbientLight(0x111122, 0.4);
  group.add(ambient as any);

  const accent1 = new PointLight(new Color(theme.grid) as any, 1.5, 8);
  accent1.position.set(-2, 3, -2);
  group.add(accent1 as any);
  lights.push(accent1);

  const accent2 = new PointLight(new Color(theme.accent) as any, 1.2, 8);
  accent2.position.set(2, 3, 2);
  group.add(accent2 as any);
  lights.push(accent2);

  const machineLight = new PointLight(new Color(theme.claw) as any, 2.0, 5);
  machineLight.position.set(0, 2, 0);
  group.add(machineLight as any);
  lights.push(machineLight);

  return { group, decorations, particles, lights };
}

export function updateEnvironment(env: EnvironmentObjects, time: number): void {
  // Decorations rotate and bob
  for (const d of env.decorations) {
    const data = d as any;
    d.rotation.x += data._rotSpeed * 0.005;
    d.rotation.y += data._rotSpeed * 0.008;
    d.position.y = data._baseY + Math.sin(time * data._bobSpeed) * data._bobAmp;
  }

  // Particles drift and pulse
  for (const p of env.particles) {
    const data = p as any;
    p.position.x += data._driftX;
    p.position.z += data._driftZ;
    const opacity = 0.15 + 0.2 * Math.sin(time * data._pulseSpeed + data._pulsePhase);
    (p.material as MeshBasicMaterial).opacity = Math.max(0.05, opacity);

    // Wrap around
    if (Math.abs(p.position.x) > 8) data._driftX *= -1;
    if (Math.abs(p.position.z) > 8) data._driftZ *= -1;
  }
}

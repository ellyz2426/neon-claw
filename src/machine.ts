// machine.ts — Claw machine geometry, prizes, claw mechanics
import {
  Mesh, Group, BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry,
  OctahedronGeometry, TorusGeometry, CapsuleGeometry,
  MeshStandardMaterial, MeshBasicMaterial, LineBasicMaterial,
  EdgesGeometry, LineSegments, AdditiveBlending,
  Color, Vector3,
} from '@iwsdk/core';
import { MachineConfig, PrizeType, PRIZE_TYPES, RARITY_COLORS, ArenaTheme } from './types';

// ─── Prize Mesh Creation ─────────────────────────────────
export function createPrizeMesh(prize: PrizeType): Group {
  const group = new Group();
  const color = new Color(prize.baseColor);
  const emissive = new Color(prize.emissiveColor);
  const s = prize.size * 0.06;
  let geom: any;
  switch (prize.shape) {
    case 'cube': geom = new BoxGeometry(s, s, s); break;
    case 'sphere': geom = new SphereGeometry(s * 0.55, 12, 8); break;
    case 'cylinder': geom = new CylinderGeometry(s * 0.35, s * 0.35, s * 0.9, 10); break;
    case 'diamond': geom = new OctahedronGeometry(s * 0.5, 0); break;
    case 'star': geom = createStarGeometry(s * 0.5); break;
    case 'capsule': geom = new CapsuleGeometry(s * 0.3, s * 0.5, 6, 10); break;
  }
  const mat = new MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.6, metalness: 0.4, roughness: 0.3 });
  const mesh = new Mesh(geom, mat);
  group.add(mesh);

  // Wireframe edges
  const edges = new EdgesGeometry(geom);
  const lineMat = new LineBasicMaterial({ color: prize.baseColor, transparent: true, opacity: 0.4 });
  group.add(new LineSegments(edges, lineMat));

  // Glow sphere
  const glowMat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.15, blending: AdditiveBlending });
  const glowMesh = new Mesh(new SphereGeometry(s * 0.8, 8, 6), glowMat);
  group.add(glowMesh);

  (group as any)._prizeData = prize;
  (group as any)._velocity = new Vector3(0, 0, 0);
  (group as any)._grounded = false;
  return group;
}

function createStarGeometry(r: number): ConeGeometry {
  // Use a cone as star stand-in with more points
  return new ConeGeometry(r, r * 1.5, 5);
}

// ─── Claw Mesh ───────────────────────────────────────────
export function createClawGroup(theme: ArenaTheme): Group {
  const claw = new Group();
  const clawColor = new Color(theme.claw);

  // Central hub
  const hubGeo = new CylinderGeometry(0.03, 0.03, 0.06, 8);
  const hubMat = new MeshStandardMaterial({ color: clawColor, emissive: clawColor, emissiveIntensity: 0.5, metalness: 0.8 });
  const hub = new Mesh(hubGeo, hubMat);
  claw.add(hub);

  // Cable (extends upward)
  const cableGeo = new CylinderGeometry(0.005, 0.005, 0.5, 4);
  const cableMat = new MeshStandardMaterial({ color: clawColor, emissive: clawColor, emissiveIntensity: 0.3 });
  const cable = new Mesh(cableGeo, cableMat);
  cable.position.y = 0.28;
  claw.add(cable);

  // 3 prongs
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const prong = createClawProng(clawColor);
    prong.position.set(Math.cos(angle) * 0.025, -0.03, Math.sin(angle) * 0.025);
    prong.rotation.z = -0.4; // partially open
    prong.rotation.y = -angle;
    prong.name = `prong_${i}`;
    claw.add(prong);
  }

  // Glow ring around hub
  const ringGeo = new TorusGeometry(0.04, 0.005, 6, 16);
  const ringMat = new MeshBasicMaterial({ color: clawColor, transparent: true, opacity: 0.4, blending: AdditiveBlending });
  const ring = new Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.005;
  ring.name = 'glow_ring';
  claw.add(ring);

  return claw;
}

function createClawProng(color: Color): Group {
  const prong = new Group();
  const mat = new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, metalness: 0.7 });

  // Upper arm
  const upper = new Mesh(new BoxGeometry(0.008, 0.06, 0.008), mat);
  upper.position.y = -0.03;
  prong.add(upper);

  // Lower arm (curved inward tip)
  const lower = new Mesh(new BoxGeometry(0.008, 0.04, 0.008), mat);
  lower.position.set(0.01, -0.075, 0);
  lower.rotation.z = 0.3;
  prong.add(lower);

  // Tip
  const tip = new Mesh(new SphereGeometry(0.006, 6, 4), mat);
  tip.position.set(0.015, -0.092, 0);
  prong.add(tip);

  return prong;
}

// ─── Machine Glass Box ───────────────────────────────────
export function createMachineBox(config: MachineConfig, theme: ArenaTheme): Group {
  const box = new Group();
  const w = config.pitWidth;
  const d = config.pitDepth;
  const h = config.pitHeight;
  const glassColor = new Color(theme.glass);
  const machineColor = new Color(theme.machine);

  // Floor
  const floorGeo = new BoxGeometry(w, 0.02, d);
  const floorMat = new MeshStandardMaterial({ color: machineColor, emissive: new Color(theme.glow), emissiveIntensity: 0.2, metalness: 0.5 });
  const floor = new Mesh(floorGeo, floorMat);
  floor.position.y = -h / 2;
  box.add(floor);

  // Floor grid lines
  const gridMat = new LineBasicMaterial({ color: theme.grid, transparent: true, opacity: 0.25 });
  for (let i = -5; i <= 5; i++) {
    const frac = i / 5;
    // X lines
    const xPts = [new Vector3(frac * w / 2, -h / 2 + 0.011, -d / 2), new Vector3(frac * w / 2, -h / 2 + 0.011, d / 2)];
    const xLine = new LineSegments(new EdgesGeometry(new BoxGeometry(0.001, 0.001, d)), gridMat);
    xLine.position.set(frac * w / 2, -h / 2 + 0.011, 0);
    box.add(xLine);
    // Z lines
    const zLine = new LineSegments(new EdgesGeometry(new BoxGeometry(w, 0.001, 0.001)), gridMat);
    zLine.position.set(0, -h / 2 + 0.011, frac * d / 2);
    box.add(zLine);
  }

  // Glass walls (transparent)
  const glassMat = new MeshStandardMaterial({
    color: glassColor, transparent: true, opacity: 0.08, metalness: 0.1, roughness: 0.1,
  });
  const glassEdgeMat = new LineBasicMaterial({ color: theme.glass, transparent: true, opacity: 0.3 });

  // Front wall
  const frontGeo = new BoxGeometry(w, h, 0.005);
  const front = new Mesh(frontGeo, glassMat);
  front.position.set(0, 0, d / 2);
  box.add(front);
  box.add(createEdges(frontGeo, glassEdgeMat, 0, 0, d / 2));

  // Back wall
  const back = new Mesh(frontGeo, glassMat);
  back.position.set(0, 0, -d / 2);
  box.add(back);
  box.add(createEdges(frontGeo, glassEdgeMat, 0, 0, -d / 2));

  // Left wall
  const sideGeo = new BoxGeometry(0.005, h, d);
  const left = new Mesh(sideGeo, glassMat);
  left.position.set(-w / 2, 0, 0);
  box.add(left);
  box.add(createEdges(sideGeo, glassEdgeMat, -w / 2, 0, 0));

  // Right wall
  const right = new Mesh(sideGeo, glassMat);
  right.position.set(w / 2, 0, 0);
  box.add(right);
  box.add(createEdges(sideGeo, glassEdgeMat, w / 2, 0, 0));

  // Top rail frame
  const railThickness = 0.02;
  const railMat = new MeshStandardMaterial({ color: glassColor, emissive: glassColor, emissiveIntensity: 0.3, metalness: 0.6 });
  // Front rail
  box.add(createRail(w + railThickness * 2, railThickness, railThickness, 0, h / 2, d / 2, railMat));
  // Back rail
  box.add(createRail(w + railThickness * 2, railThickness, railThickness, 0, h / 2, -d / 2, railMat));
  // Left rail
  box.add(createRail(railThickness, railThickness, d, -w / 2, h / 2, 0, railMat));
  // Right rail
  box.add(createRail(railThickness, railThickness, d, w / 2, h / 2, 0, railMat));

  // Drop chute (front-right corner)
  const chuteW = 0.15;
  const chuteD = 0.15;
  const chuteMat = new MeshStandardMaterial({ color: new Color(theme.accent), emissive: new Color(theme.accent), emissiveIntensity: 0.4, metalness: 0.5 });
  const chute = new Mesh(new BoxGeometry(chuteW, h * 0.6, chuteD), new MeshStandardMaterial({ color: new Color(theme.accent), transparent: true, opacity: 0.15 }));
  chute.position.set(w / 2 + chuteW / 2 + 0.02, -h * 0.2, d / 2 - chuteD / 2);
  box.add(chute);

  // Chute label ring
  const chuteRing = new Mesh(new TorusGeometry(0.06, 0.005, 6, 12), new MeshBasicMaterial({ color: theme.accent, transparent: true, opacity: 0.5, blending: AdditiveBlending }));
  chuteRing.position.set(w / 2 + chuteW / 2 + 0.02, h * 0.1, d / 2 - chuteD / 2);
  chuteRing.rotation.x = Math.PI / 2;
  chuteRing.name = 'chute_ring';
  box.add(chuteRing);

  // Corner accent lights
  const accentPositions = [
    [-w / 2, h / 2, d / 2], [w / 2, h / 2, d / 2],
    [-w / 2, h / 2, -d / 2], [w / 2, h / 2, -d / 2],
  ];
  accentPositions.forEach(([x, y, z]) => {
    const light = new Mesh(new SphereGeometry(0.01, 6, 4), new MeshBasicMaterial({ color: theme.accent, blending: AdditiveBlending }));
    light.position.set(x, y, z);
    box.add(light);
  });

  return box;
}

function createEdges(geo: any, mat: LineBasicMaterial, x: number, y: number, z: number): LineSegments {
  const edges = new LineSegments(new EdgesGeometry(geo), mat);
  edges.position.set(x, y, z);
  return edges;
}

function createRail(w: number, h: number, d: number, x: number, y: number, z: number, mat: MeshStandardMaterial): Mesh {
  const rail = new Mesh(new BoxGeometry(w, h, d), mat);
  rail.position.set(x, y, z);
  return rail;
}

// ─── Prize Spawning ──────────────────────────────────────
export function spawnPrizes(config: MachineConfig, rng?: () => number): { group: Group; prizes: Group[] } {
  const parent = new Group();
  const prizes: Group[] = [];
  const rand = rng || Math.random;
  const w = config.pitWidth * 0.8;
  const d = config.pitDepth * 0.8;

  for (let i = 0; i < config.prizeCount; i++) {
    const typeId = config.prizePool[Math.floor(rand() * config.prizePool.length)];
    const prizeType = PRIZE_TYPES.find(p => p.id === typeId)!;
    const mesh = createPrizeMesh(prizeType);

    // Random position within pit
    mesh.position.set(
      (rand() - 0.5) * w,
      -config.pitHeight / 2 + 0.04 + rand() * 0.02,
      (rand() - 0.5) * d,
    );
    mesh.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);

    parent.add(mesh);
    prizes.push(mesh);
  }

  return { group: parent, prizes };
}

// ─── Claw Rail System ────────────────────────────────────
export function createClawRail(config: MachineConfig, theme: ArenaTheme): Group {
  const rail = new Group();
  const railColor = new Color(theme.claw);
  const mat = new MeshStandardMaterial({ color: railColor, emissive: railColor, emissiveIntensity: 0.3, metalness: 0.7 });
  const w = config.pitWidth;
  const d = config.pitDepth;
  const topY = config.pitHeight / 2 + 0.12;

  // X-axis rails (front and back)
  const xRailGeo = new CylinderGeometry(0.008, 0.008, w + 0.1, 6);
  xRailGeo.rotateZ(Math.PI / 2);
  const xFront = new Mesh(xRailGeo, mat);
  xFront.position.set(0, topY, d / 2 + 0.03);
  rail.add(xFront);
  const xBack = new Mesh(xRailGeo, mat);
  xBack.position.set(0, topY, -d / 2 - 0.03);
  rail.add(xBack);

  // Z-axis rail (movable carriage rail)
  const zRailGeo = new CylinderGeometry(0.008, 0.008, d + 0.1, 6);
  const zRail = new Mesh(zRailGeo, mat);
  zRail.rotation.x = Math.PI / 2;
  zRail.position.y = topY;
  zRail.name = 'z_rail';
  rail.add(zRail);

  // Carriage block
  const carriage = new Mesh(new BoxGeometry(0.04, 0.02, 0.04), mat);
  carriage.position.y = topY - 0.01;
  carriage.name = 'carriage';
  rail.add(carriage);

  return rail;
}

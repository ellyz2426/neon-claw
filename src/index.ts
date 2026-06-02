// index.ts — Main entry point for Neon Claw VR (Round 2: Power-ups, Music, Tutorial, Polish)
import {
  World, PanelUI, PanelDocument, Follower, FollowBehavior, ScreenSpace,
  Vector3, Color, Group, Mesh, SphereGeometry, MeshBasicMaterial, AdditiveBlending,
} from '@iwsdk/core';
import type { UIKitDocument } from '@iwsdk/core';
import {
  GameStateManager, MACHINES, THEMES, PRIZE_TYPES, RARITY_COLORS,
  GameState, GameMode, ClawPhase, seededRandom, getDailySeed,
} from './types';
import { AudioManager } from './audio';
import { createMachineBox, createClawGroup, spawnPrizes, createClawRail } from './machine';
import { createEnvironment, updateEnvironment, EnvironmentObjects } from './environment';
import { ParticleSystem, createClawShadow, updateClawShadow, ScreenShake } from './effects';
import { PowerUpManager, POWERUP_DEFS, createPowerUpOrb, PowerUpOrb } from './powerups';
import { SynthwaveMusic } from './music';

// ─── Globals ─────────────────────────────────────────────
const gsm = new GameStateManager();
const audio = new AudioManager();
const shake = new ScreenShake();
const powerups = new PowerUpManager();
const music = new SynthwaveMusic();
let world: World;
let env: EnvironmentObjects;
let particles: ParticleSystem;
let clawGroup: Group;
let machineBox: Group;
let prizeGroup: Group;
let prizeMeshes: Group[] = [];
let railGroup: Group;
let clawShadow: Mesh;
let sceneGroup: Group;
let machineBaseY = 1.0;

// Trail system
const clawTrail: { pos: Vector3; age: number; mesh: Mesh }[] = [];
const trailPool: Mesh[] = [];
const MAX_TRAIL = 20;

// Score popup system
interface ScorePopup { mesh: Group; vel: Vector3; life: number; }
const scorePopups: ScorePopup[] = [];

// Tutorial state
let tutorialShown = false;
let tutorialDismissed = false;

// UI entity references
const panels: Record<string, any> = {};
let toastTimer = 0;
let countdownTimer = 0;
let countdownValue = 3;
let gameStarted = false;
let musicStarted = false;

// ─── UI Helper ───────────────────────────────────────────
function setText(doc: UIKitDocument | undefined, id: string, text: string): void {
  if (!doc) return;
  const el = doc.getElementById(id);
  if (el && (el as any).text) (el as any).text.value = text;
}

function setVisible(panelName: string, visible: boolean): void {
  const p = panels[panelName];
  if (p?.entity?.object3D) p.entity.object3D.visible = visible;
}

function getDoc(panelName: string): UIKitDocument | undefined {
  const p = panels[panelName];
  if (!p?.entity) return undefined;
  return p.entity.getValue(PanelDocument, 'document') as UIKitDocument | undefined;
}

// ─── Panel Setup ─────────────────────────────────────────
function setupPanel(name: string, config: string, opts: {
  maxWidth: number; maxHeight: number;
  follower?: boolean; screenSpace?: boolean;
  pos?: [number, number, number];
  followOffset?: [number, number, number];
}): void {
  const entity = world.createTransformEntity(undefined, { persistent: true });

  entity.addComponent(PanelUI, {
    config,
    maxWidth: opts.maxWidth,
    maxHeight: opts.maxHeight,
  });

  if (opts.follower) {
    entity.addComponent(Follower, {
      target: (world as any).player?.head || (world as any).playerHeadEntity,
      offsetPosition: opts.followOffset || [0, -0.1, -0.5],
      behavior: FollowBehavior.PivotY,
      speed: 5,
      tolerance: 0.3,
    });
  } else if (opts.pos) {
    entity.object3D!.position.set(opts.pos[0], opts.pos[1], opts.pos[2]);
  }

  entity.object3D!.visible = false;
  panels[name] = { entity };
}

function initPanels(): void {
  const menuZ = -1.8;
  const menuY = machineBaseY + 0.6;

  setupPanel('title', '/ui/title.json', { maxWidth: 1.0, maxHeight: 0.8, pos: [0, menuY, menuZ] });
  setupPanel('modeselect', '/ui/modeselect.json', { maxWidth: 1.0, maxHeight: 0.9, pos: [0, menuY, menuZ] });
  setupPanel('difficulty', '/ui/difficulty.json', { maxWidth: 0.8, maxHeight: 0.6, pos: [0, menuY, menuZ] });
  setupPanel('machines', '/ui/machines.json', { maxWidth: 1.0, maxHeight: 0.7, pos: [0, menuY, menuZ] });
  setupPanel('hud', '/ui/hud.json', { maxWidth: 0.4, maxHeight: 0.15, follower: true, followOffset: [0.25, -0.15, -0.5] });
  setupPanel('pause', '/ui/pause.json', { maxWidth: 0.7, maxHeight: 0.5, pos: [0, menuY, menuZ] });
  setupPanel('gameover', '/ui/gameover.json', { maxWidth: 0.8, maxHeight: 0.7, pos: [0, menuY, menuZ] });
  setupPanel('leaderboard', '/ui/leaderboard.json', { maxWidth: 0.9, maxHeight: 0.8, pos: [0, menuY, menuZ] });
  setupPanel('achievements', '/ui/achievements.json', { maxWidth: 1.0, maxHeight: 1.0, pos: [0, menuY, menuZ] });
  setupPanel('settings', '/ui/settings.json', { maxWidth: 0.8, maxHeight: 0.7, pos: [0, menuY, menuZ] });
  setupPanel('help', '/ui/help.json', { maxWidth: 1.0, maxHeight: 0.9, pos: [0, menuY, menuZ] });
  setupPanel('collection', '/ui/collection.json', { maxWidth: 1.0, maxHeight: 0.9, pos: [0, menuY, menuZ] });
  setupPanel('stats', '/ui/stats.json', { maxWidth: 0.8, maxHeight: 0.7, pos: [0, menuY, menuZ] });
  setupPanel('toast', '/ui/toast.json', { maxWidth: 0.3, maxHeight: 0.08, follower: true, followOffset: [0, 0.1, -0.5] });
  setupPanel('countdown', '/ui/countdown.json', { maxWidth: 0.2, maxHeight: 0.15, follower: true, followOffset: [0, 0, -0.5] });
  setupPanel('powerbar', '/ui/powerbar.json', { maxWidth: 0.25, maxHeight: 0.06, follower: true, followOffset: [-0.25, -0.15, -0.5] });
  // Round 2 panels
  setupPanel('tutorial', '/ui/tutorial.json', { maxWidth: 0.6, maxHeight: 0.4, pos: [0, menuY, menuZ] });
  setupPanel('poweruphud', '/ui/powerups.json', { maxWidth: 0.35, maxHeight: 0.12, follower: true, followOffset: [-0.3, 0.08, -0.5] });
  setupPanel('showcase', '/ui/showcase.json', { maxWidth: 1.2, maxHeight: 1.0, pos: [0, menuY, menuZ] });
}

// ─── Show/Hide State Panels ──────────────────────────────
function showState(state: GameState): void {
  gsm.state = state;
  const allPanels = ['title', 'modeselect', 'difficulty', 'machines', 'hud', 'pause',
    'gameover', 'leaderboard', 'achievements', 'settings', 'help', 'collection', 'stats',
    'toast', 'countdown', 'powerbar', 'tutorial', 'poweruphud', 'showcase'];

  const stateMap: Record<string, string[]> = {
    title: ['title'],
    modeselect: ['modeselect'],
    difficulty: ['difficulty'],
    machines: ['machines'],
    playing: ['hud', 'powerbar', 'poweruphud'],
    grabbing: ['hud', 'powerbar', 'poweruphud'],
    dropping: ['hud', 'poweruphud'],
    result: ['hud'],
    paused: ['pause'],
    gameover: ['gameover'],
    leaderboard: ['leaderboard'],
    achievements: ['achievements'],
    settings: ['settings'],
    help: ['help'],
    collection: ['collection'],
    stats: ['stats'],
    showcase: ['showcase'],
  };

  const visible = stateMap[state] || [];
  for (const p of allPanels) {
    setVisible(p, visible.includes(p));
  }
}

// ─── Toast Notification ──────────────────────────────────
function showToast(msg: string, dur: number = 2): void {
  const doc = getDoc('toast');
  setText(doc, 'toast-msg', msg);
  setVisible('toast', true);
  toastTimer = dur;
}

// ─── Claw Trail System ───────────────────────────────────
function initTrailPool(): void {
  for (let i = 0; i < MAX_TRAIL; i++) {
    const mesh = new Mesh(
      new SphereGeometry(0.006, 4, 3),
      new MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0, blending: AdditiveBlending }),
    );
    mesh.visible = false;
    world.scene.add(mesh);
    trailPool.push(mesh);
  }
}

function updateClawTrail(dt: number, time: number): void {
  if (gsm.state !== 'playing' || gsm.clawPhase === 'idle') return;

  // Spawn trail point
  if (clawGroup && (gsm.clawPhase === 'positioning' || gsm.clawPhase === 'descending' || gsm.clawPhase === 'ascending')) {
    const mesh = trailPool.pop();
    if (mesh) {
      const worldPos = new Vector3();
      clawGroup.getWorldPosition(worldPos);
      mesh.position.copy(worldPos);
      mesh.visible = true;
      (mesh.material as MeshBasicMaterial).opacity = 0.5;
      const themeColor = new Color(gsm.theme.claw);
      (mesh.material as MeshBasicMaterial).color.copy(themeColor);
      clawTrail.push({ pos: worldPos.clone(), age: 0, mesh });
    }
  }

  // Update existing trail
  for (let i = clawTrail.length - 1; i >= 0; i--) {
    const t = clawTrail[i];
    t.age += dt;
    if (t.age > 0.6) {
      t.mesh.visible = false;
      trailPool.push(t.mesh);
      clawTrail.splice(i, 1);
      continue;
    }
    const frac = 1 - t.age / 0.6;
    (t.mesh.material as MeshBasicMaterial).opacity = frac * 0.5;
    t.mesh.scale.setScalar(frac * 0.8 + 0.2);
  }
}

// ─── Score Popup System ──────────────────────────────────
function spawnScorePopup(text: string, color: string, pos: Vector3): void {
  // Create a simple glowing sphere as score indicator (visual feedback)
  const group = new Group();
  const sphere = new Mesh(
    new SphereGeometry(0.02, 6, 4),
    new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: 0.8, blending: AdditiveBlending }),
  );
  group.add(sphere);

  // Ring burst
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const dot = new Mesh(
      new SphereGeometry(0.005, 4, 3),
      new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: 0.6, blending: AdditiveBlending }),
    );
    dot.position.set(Math.cos(angle) * 0.03, 0, Math.sin(angle) * 0.03);
    group.add(dot);
  }

  group.position.copy(pos);
  world.scene.add(group);

  scorePopups.push({
    mesh: group,
    vel: new Vector3(0, 0.5, 0),
    life: 1.2,
  });
}

function updateScorePopups(dt: number): void {
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    const p = scorePopups[i];
    p.life -= dt;
    if (p.life <= 0) {
      world.scene.remove(p.mesh);
      scorePopups.splice(i, 1);
      continue;
    }
    p.vel.y -= 0.3 * dt;
    p.mesh.position.addScaledVector(p.vel, dt);
    const frac = p.life / 1.2;
    p.mesh.scale.setScalar(0.5 + frac * 0.5);
    // Fade children
    p.mesh.children.forEach(c => {
      if ((c as Mesh).material) {
        ((c as Mesh).material as MeshBasicMaterial).opacity = frac * 0.8;
      }
    });
  }
}

// ─── Power-Up Orb Spawning ───────────────────────────────
function spawnPowerUpOrb(): void {
  const config = gsm.machine;
  const def = POWERUP_DEFS[Math.floor(Math.random() * POWERUP_DEFS.length)];
  const x = (Math.random() - 0.5) * config.pitWidth * 0.6;
  const z = (Math.random() - 0.5) * config.pitDepth * 0.6;
  const y = machineBaseY + 0.15;
  const orb = createPowerUpOrb(def, x, y, z);
  sceneGroup.add(orb.mesh);
  powerups.orbs.push(orb);
}

function checkPowerUpCollection(): void {
  if (!clawGroup) return;
  const clawWorldPos = new Vector3();
  clawGroup.getWorldPosition(clawWorldPos);

  for (const orb of powerups.orbs) {
    if (!orb.alive) continue;
    const orbWorldPos = new Vector3();
    orb.mesh.getWorldPosition(orbWorldPos);
    const dist = clawWorldPos.distanceTo(orbWorldPos);
    if (dist < 0.12) {
      // Collect!
      orb.alive = false;
      orb.mesh.visible = false;
      powerups.activate(orb.def);
      audio.powerUpCollect();
      showToast('POWER-UP: ' + orb.def.name);
      particles.burst(orbWorldPos, orb.def.color, 12, 1.5);
      shake.trigger(0.008, 0.15);
      checkAchievement('first_powerup', true);
      checkAchievement('powerup_5', powerups.totalCollected >= 5);
      checkAchievement('powerup_collector', powerups.totalCollected >= 15);
    }
  }
}

// ─── Build/Rebuild Machine Scene ─────────────────────────
function buildMachine(): void {
  if (sceneGroup) {
    world.scene.remove(sceneGroup);
  }
  sceneGroup = new Group();
  sceneGroup.position.y = machineBaseY;

  const config = gsm.machine;
  const theme = gsm.theme;

  machineBox = createMachineBox(config, theme);
  sceneGroup.add(machineBox);

  const rng = gsm.mode === 'daily' ? seededRandom(getDailySeed()) : undefined;
  const { group, prizes } = spawnPrizes(config, rng);
  prizeGroup = group;
  prizeMeshes = prizes;
  sceneGroup.add(prizeGroup);

  clawGroup = createClawGroup(theme);
  clawGroup.position.y = config.pitHeight / 2 + 0.1;
  gsm.clawX = 0;
  gsm.clawZ = 0;
  gsm.clawY = config.pitHeight / 2 + 0.1;
  gsm.clawPhase = 'idle';
  sceneGroup.add(clawGroup);

  railGroup = createClawRail(config, theme);
  sceneGroup.add(railGroup);

  clawShadow = createClawShadow();
  sceneGroup.add(clawShadow);

  if (gsm.mode === 'target') {
    pickTargetPrize();
  }

  // Clean up old power-up orbs
  powerups.orbs = [];

  world.scene.add(sceneGroup);
}

function pickTargetPrize(): void {
  if (prizeMeshes.length === 0) return;
  const idx = Math.floor(Math.random() * prizeMeshes.length);
  const target = prizeMeshes[idx];
  const data = (target as any)._prizeData;
  gsm.targetPrizeId = data.id;
  const ring = new Mesh(
    new SphereGeometry(0.05, 8, 6),
    new MeshBasicMaterial({ color: 0xffdd00, transparent: true, opacity: 0.4, blending: AdditiveBlending }),
  );
  ring.name = 'target_highlight';
  target.add(ring);
}

// ─── Wire UI Buttons ─────────────────────────────────────
function wireButtons(): void {
  setTimeout(() => {
    wirePanel('title', {
      'btn-play': () => { audio.buttonClick(); showState('modeselect'); },
      'btn-machines': () => { audio.buttonClick(); updateMachinesPanel(); showState('machines'); },
      'btn-collection': () => { audio.buttonClick(); updateCollectionPanel(); showState('collection'); },
      'btn-scores': () => { audio.buttonClick(); updateLeaderboard(); showState('leaderboard'); },
      'btn-achievements': () => { audio.buttonClick(); updateAchievements(); showState('achievements'); },
      'btn-stats': () => { audio.buttonClick(); updateStats(); showState('stats'); },
      'btn-settings': () => { audio.buttonClick(); updateSettings(); showState('settings'); },
      'btn-help': () => { audio.buttonClick(); showState('help'); },
    });

    wirePanel('modeselect', {
      'btn-classic': () => startMode('classic'),
      'btn-timeattack': () => startMode('timeattack'),
      'btn-target': () => startMode('target'),
      'btn-progressive': () => startMode('progressive'),
      'btn-daily': () => startMode('daily'),
      'btn-marathon': () => startMode('marathon'),
      'btn-precision': () => startMode('precision'),
      'btn-practice': () => startMode('practice'),
      'btn-back-mode': () => { audio.buttonClick(); showState('title'); },
    });

    wirePanel('difficulty', {
      'btn-easy': () => startWithDifficulty('easy'),
      'btn-medium': () => startWithDifficulty('medium'),
      'btn-hard': () => startWithDifficulty('hard'),
      'btn-back-diff': () => { audio.buttonClick(); showState('modeselect'); },
    });

    wirePanel('machines', {
      'btn-machine-prev': () => { gsm.machineIndex = (gsm.machineIndex - 1 + MACHINES.length) % MACHINES.length; updateMachinesPanel(); audio.buttonClick(); },
      'btn-machine-next': () => { gsm.machineIndex = (gsm.machineIndex + 1) % MACHINES.length; updateMachinesPanel(); audio.buttonClick(); },
      'btn-machine-select': () => { audio.buttonClick(); buildMachine(); showState('title'); },
      'btn-back-machines': () => { audio.buttonClick(); showState('title'); },
    });

    wirePanel('pause', {
      'btn-resume': () => { audio.buttonClick(); showState('playing'); },
      'btn-quit': () => { audio.buttonClick(); music.stop(); showState('title'); },
    });

    wirePanel('gameover', {
      'btn-rematch': () => { audio.buttonClick(); startGame(); },
      'btn-title': () => { audio.buttonClick(); music.stop(); showState('title'); },
    });

    wirePanel('leaderboard', {
      'btn-back-lb': () => { audio.buttonClick(); showState('title'); },
    });

    wirePanel('achievements', {
      'btn-back-ach': () => { audio.buttonClick(); showState('title'); },
    });

    wirePanel('settings', {
      'btn-theme-prev': () => { gsm.themeIndex = (gsm.themeIndex - 1 + THEMES.length) % THEMES.length; rebuildTheme(); updateSettings(); audio.buttonClick(); },
      'btn-theme-next': () => { gsm.themeIndex = (gsm.themeIndex + 1) % THEMES.length; rebuildTheme(); updateSettings(); audio.buttonClick(); },
      'btn-master-up': () => { audio.setMasterVolume(Math.min(1, audio.getMasterVolume() + 0.1)); updateSettings(); audio.buttonClick(); },
      'btn-master-down': () => { audio.setMasterVolume(Math.max(0, audio.getMasterVolume() - 0.1)); updateSettings(); audio.buttonClick(); },
      'btn-sfx-up': () => { audio.setSfxVolume(Math.min(1, audio.getSfxVolume() + 0.1)); updateSettings(); audio.buttonClick(); },
      'btn-sfx-down': () => { audio.setSfxVolume(Math.max(0, audio.getSfxVolume() - 0.1)); updateSettings(); audio.buttonClick(); },
      'btn-music-up': () => { audio.setMusicVolume(Math.min(1, audio.getMusicVolume() + 0.1)); music.setVolume(audio.getMusicVolume()); updateSettings(); audio.buttonClick(); },
      'btn-music-down': () => { audio.setMusicVolume(Math.max(0, audio.getMusicVolume() - 0.1)); music.setVolume(audio.getMusicVolume()); updateSettings(); audio.buttonClick(); },
      'btn-back-settings': () => { audio.buttonClick(); showState('title'); },
    });

    wirePanel('help', {
      'btn-back-help': () => { audio.buttonClick(); showState('title'); },
    });

    wirePanel('collection', {
      'btn-back-col': () => { audio.buttonClick(); showState('title'); },
    });

    wirePanel('stats', {
      'btn-back-stats': () => { audio.buttonClick(); showState('title'); },
    });

    wirePanel('tutorial', {
      'tut-dismiss': () => { audio.buttonClick(); tutorialDismissed = true; setVisible('tutorial', false); showState('title'); try { localStorage.setItem('neon-claw-tutorial', '1'); } catch {} },
    });

    wirePanel('showcase', {
      'btn-back-showcase': () => { audio.buttonClick(); showState('title'); },
    });
  }, 1500);
}

function wirePanel(name: string, buttons: Record<string, () => void>): void {
  const doc = getDoc(name);
  if (!doc) return;
  for (const [id, handler] of Object.entries(buttons)) {
    const el = doc.getElementById(id);
    if (el) el.addEventListener('click', handler);
  }
}

// ─── Game Flow ───────────────────────────────────────────
function startMode(mode: GameMode): void {
  audio.buttonClick();
  gsm.mode = mode;
  if (mode === 'practice' || mode === 'daily') {
    gsm.difficulty = 'medium';
    startGame();
  } else {
    showState('difficulty');
  }
}

function startWithDifficulty(diff: 'easy' | 'medium' | 'hard'): void {
  audio.buttonClick();
  gsm.difficulty = diff;
  startGame();
}

function startGame(): void {
  gsm.resetSession();
  gsm.machinesUsed.add(gsm.machine.id);
  gsm.themesUsed.add(gsm.theme.id);
  powerups.reset();

  switch (gsm.mode) {
    case 'classic': gsm.maxAttempts = gsm.difficulty === 'easy' ? 7 : gsm.difficulty === 'medium' ? 5 : 3; break;
    case 'timeattack': gsm.timeRemaining = gsm.difficulty === 'easy' ? 90 : gsm.difficulty === 'medium' ? 60 : 45; gsm.maxAttempts = 999; break;
    case 'target': gsm.maxAttempts = gsm.difficulty === 'easy' ? 8 : gsm.difficulty === 'medium' ? 6 : 4; gsm.targetTotal = 3; break;
    case 'progressive': gsm.maxAttempts = 3; gsm.progressiveRound = 1; break;
    case 'daily': gsm.maxAttempts = 5; break;
    case 'marathon': gsm.maxAttempts = 999; gsm.timeRemaining = 0; break;
    case 'precision': gsm.maxAttempts = 3; break;
    case 'practice': gsm.maxAttempts = 999; break;
  }

  buildMachine();
  audio.init();
  audio.gameStart();
  gameStarted = true;

  // Start synthwave music
  if (!musicStarted) {
    try {
      const ctx = (audio as any).ctx;
      const musicNode = (audio as any).musicGain;
      if (ctx && musicNode) {
        music.start(ctx, musicNode);
        musicStarted = true;
      }
    } catch {}
  }

  countdownValue = 3;
  countdownTimer = 3;
  setVisible('countdown', true);
  const doc = getDoc('countdown');
  setText(doc, 'cd-text', '3');
  showState('playing');
}

// ─── Claw Mechanics ──────────────────────────────────────
function moveClaw(dx: number, dz: number, dt: number): void {
  if (gsm.clawPhase !== 'idle' && gsm.clawPhase !== 'positioning') return;
  gsm.clawPhase = 'positioning';
  const config = gsm.machine;
  const speed = config.clawSpeed * 0.8 * dt;
  const halfW = config.pitWidth * 0.4;
  const halfD = config.pitDepth * 0.4;

  gsm.clawX = Math.max(-halfW, Math.min(halfW, gsm.clawX + dx * speed));
  gsm.clawZ = Math.max(-halfD, Math.min(halfD, gsm.clawZ + dz * speed));
}

function dropClaw(): void {
  if (gsm.clawPhase !== 'idle' && gsm.clawPhase !== 'positioning') return;
  gsm.clawPhase = 'descending';
  gsm.clawTargetY = -gsm.machine.pitHeight / 2 + 0.08;
  gsm.grabStartTime = performance.now();
  audio.clawDrop();

  // Slow-mo power-up: reduce drop speed (handled in physics)
}

function updateClawPhysics(dt: number): void {
  const config = gsm.machine;
  let dropSpeed = config.dropSpeed * 0.6;
  const liftSpeed = 0.4;
  const returnSpeed = 0.5;
  const topY = config.pitHeight / 2 + 0.1;

  // Slow-mo power-up halves drop speed
  if (powerups.has('slow_mo')) {
    dropSpeed *= 0.45;
  }

  switch (gsm.clawPhase) {
    case 'descending': {
      gsm.clawY -= dropSpeed * dt;
      if (gsm.clawY <= gsm.clawTargetY) {
        gsm.clawY = gsm.clawTargetY;
        gsm.clawPhase = 'closing';
        audio.clawClose();
        gsm.clawGripping = true;
        attemptGrab();
      }
      break;
    }
    case 'closing': {
      gsm.clawPhase = 'ascending';
      audio.clawAscend();
      break;
    }
    case 'ascending': {
      gsm.clawY += liftSpeed * dt;
      if (gsm.grabbedPrize) {
        const prize = (gsm.grabbedPrize as any)._prizeData;
        const grip = getGripStrength();
        if (Math.random() * dt > grip * 2) {
          dropPrize();
        }
      }
      if (gsm.clawY >= topY) {
        gsm.clawY = topY;
        if (gsm.grabbedPrize) {
          gsm.clawPhase = 'returning';
        } else {
          completeMiss();
        }
      }
      break;
    }
    case 'returning': {
      const chuteX = config.pitWidth / 2 + 0.1;
      const chuteZ = config.pitDepth / 2 - 0.075;
      const dx = chuteX - gsm.clawX;
      const dz = chuteZ - gsm.clawZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.05) {
        gsm.clawPhase = 'releasing';
        releasePrize();
      } else {
        const speed = returnSpeed * dt / dist;
        gsm.clawX += dx * speed;
        gsm.clawZ += dz * speed;
      }
      break;
    }
    case 'releasing': {
      gsm.clawPhase = 'idle';
      gsm.clawGripping = false;
      gsm.clawX = 0;
      gsm.clawZ = 0;
      checkGameEnd();
      break;
    }
  }

  if (clawGroup) {
    clawGroup.position.set(gsm.clawX, gsm.clawY, gsm.clawZ);
    animateClawProngs(gsm.clawGripping);
  }

  if (railGroup) {
    const zRail = railGroup.getObjectByName('z_rail');
    const carriage = railGroup.getObjectByName('carriage');
    if (zRail) zRail.position.x = gsm.clawX;
    if (carriage) {
      carriage.position.x = gsm.clawX;
      carriage.position.z = gsm.clawZ;
    }
  }
}

function animateClawProngs(closed: boolean): void {
  if (!clawGroup) return;
  const targetAngle = closed ? -0.1 : -0.4;
  for (let i = 0; i < 3; i++) {
    const prong = clawGroup.getObjectByName(`prong_${i}`);
    if (prong) {
      prong.rotation.z += (targetAngle - prong.rotation.z) * 0.15;
    }
  }
}

function getGripStrength(): number {
  let grip = gsm.machine.clawStrength;
  switch (gsm.difficulty) {
    case 'easy': grip *= 1.3; break;
    case 'hard': grip *= 0.7; break;
  }
  if (gsm.mode === 'progressive') {
    grip *= Math.max(0.3, 1 - gsm.progressiveRound * 0.08);
  }
  // Strong Grip power-up
  if (powerups.has('strong_grip')) {
    grip = 1.0;
  }
  return Math.min(1, grip);
}

function attemptGrab(): void {
  const clawPos = new Vector3(gsm.clawX, gsm.clawY, gsm.clawZ);
  let closest: Group | null = null;
  let closestDist = Infinity;

  // Magnet power-up extends grab range
  const grabRange = powerups.has('magnet') ? 0.2 : 0.1;

  for (const p of prizeMeshes) {
    if ((p as any)._active === false) continue;
    const dist = clawPos.distanceTo(p.position);
    if (dist < grabRange && dist < closestDist) {
      closest = p;
      closestDist = dist;
    }
  }

  // Magnet: pull closest prize toward claw if in extended range
  if (!closest && powerups.has('magnet')) {
    let nearestInRange: Group | null = null;
    let nearestDist = 0.35;
    for (const p of prizeMeshes) {
      if ((p as any)._active === false) continue;
      const dist = clawPos.distanceTo(p.position);
      if (dist < nearestDist) {
        nearestInRange = p;
        nearestDist = dist;
      }
    }
    if (nearestInRange) {
      // Snap prize closer to claw
      nearestInRange.position.lerp(clawPos, 0.6);
      closest = nearestInRange;
    }
  }

  if (closest) {
    const prize = (closest as any)._prizeData;
    const grip = getGripStrength();
    const grabChance = grip * (1 - prize.weight * 0.6);

    if (Math.random() < grabChance) {
      gsm.grabbedPrize = closest;
      (closest as any)._active = false;
      closest.position.set(0, -0.1, 0);
      clawGroup.add(closest);

      // Wobble nearby prizes (visual polish)
      wobbleNearbyPrizes(gsm.clawX, gsm.clawZ);
    }
  }
}

function wobbleNearbyPrizes(cx: number, cz: number): void {
  for (const p of prizeMeshes) {
    if ((p as any)._active === false) continue;
    const dx = p.position.x - cx;
    const dz = p.position.z - cz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 0.2) {
      // Apply a small wobble offset
      const wobbleStrength = (0.2 - dist) * 0.5;
      (p as any)._wobbleTimer = 0.5;
      (p as any)._wobbleStrength = wobbleStrength;
    }
  }
}

function dropPrize(): void {
  if (!gsm.grabbedPrize) return;
  const prize = gsm.grabbedPrize;
  clawGroup.remove(prize);
  const worldPos = new Vector3();
  clawGroup.getWorldPosition(worldPos);
  prize.position.set(
    gsm.clawX + (Math.random() - 0.5) * 0.1,
    -gsm.machine.pitHeight / 2 + 0.04,
    gsm.clawZ + (Math.random() - 0.5) * 0.1,
  );
  prizeGroup.add(prize);
  (prize as any)._active = true;
  gsm.grabbedPrize = null;
  audio.clawMiss();
  showToast('Slipped!');
}

function releasePrize(): void {
  if (!gsm.grabbedPrize) return;
  const prize = gsm.grabbedPrize;
  const prizeData = (prize as any)._prizeData;

  clawGroup.remove(prize);
  prizeMeshes = prizeMeshes.filter(p => p !== prize);

  let points = prizeData.points;
  points *= gsm.combo;
  gsm.score += points;
  gsm.grabs++;
  gsm.streak++;
  gsm.totalGrabs++;

  let ticketMult = gsm.combo;
  if (powerups.has('double_tickets')) ticketMult *= 2;
  gsm.ticketsEarned += prizeData.tickets * ticketMult;

  gsm.comboTimer = 5;
  if (gsm.streak > 1 && gsm.streak % 2 === 0) {
    gsm.combo = Math.min(5, gsm.combo + 1);
    audio.comboUp();
    checkAchievement('combo_x3', gsm.combo >= 3);
    checkAchievement('combo_x5', gsm.combo >= 5);
  }

  if (gsm.streak > gsm.bestStreak) gsm.bestStreak = gsm.streak;

  gsm.collection.add(prizeData.id);

  const grabTime = (performance.now() - gsm.grabStartTime) / 1000;
  checkAchievement('speed_grab', grabTime < 3);

  if (gsm.mode === 'target' && prizeData.id === gsm.targetPrizeId) {
    gsm.targetHits++;
    showToast('TARGET HIT! +' + points);
    if (gsm.targetHits >= gsm.targetTotal) {
      checkAchievement('target_perfect', true);
    }
  } else {
    showToast('+' + points + ' ' + prizeData.name);
  }

  // Score popup effect
  const popPos = new Vector3(
    gsm.machine.pitWidth / 2 + 0.1,
    machineBaseY + 0.1,
    gsm.machine.pitDepth / 2 - 0.075,
  );
  const rarityColor = RARITY_COLORS[prizeData.rarity] || '#ffffff';
  spawnScorePopup('+' + points, rarityColor, popPos);

  particles.burst(popPos.clone(), prizeData.baseColor, 15, 1.2);
  audio.prizeCollect();
  shake.trigger(0.01, 0.2);

  // Rarity achievements
  checkAchievement('rare_grab', prizeData.rarity === 'rare' || prizeData.rarity === 'epic' || prizeData.rarity === 'legendary');
  checkAchievement('epic_grab', prizeData.rarity === 'epic' || prizeData.rarity === 'legendary');
  checkAchievement('legendary_grab', prizeData.rarity === 'legendary');
  checkAchievement('first_grab', true);
  checkAchievement('ten_grabs', gsm.totalGrabs >= 10);
  checkAchievement('fifty_grabs', gsm.totalGrabs >= 50);
  checkAchievement('hundred_grabs', gsm.totalGrabs >= 100);
  checkAchievement('streak_3', gsm.streak >= 3);
  checkAchievement('streak_5', gsm.streak >= 5);
  checkAchievement('collection_10', gsm.collection.size >= 10);
  checkAchievement('collection_all', gsm.collection.size >= PRIZE_TYPES.length);

  gsm.grabbedPrize = null;
  gsm.attempts++;
  audio.prizeRelease();

  updateHUD();
}

function completeMiss(): void {
  gsm.misses++;
  gsm.streak = 0;
  gsm.combo = 1;
  gsm.comboTimer = 0;
  gsm.totalMisses++;
  gsm.attempts++;
  gsm.clawPhase = 'idle';
  gsm.clawGripping = false;
  audio.clawMiss();
  showToast('Miss!');
  shake.trigger(0.005, 0.15);
  checkGameEnd();
  updateHUD();
}

function checkGameEnd(): void {
  let ended = false;

  switch (gsm.mode) {
    case 'classic':
    case 'target':
    case 'precision':
    case 'daily':
      if (gsm.attempts >= gsm.maxAttempts) ended = true;
      break;
    case 'timeattack':
      if (gsm.timeRemaining <= 0) ended = true;
      break;
    case 'progressive':
      if (gsm.attempts >= gsm.maxAttempts) {
        if (gsm.grabs > 0) {
          gsm.progressiveRound++;
          gsm.attempts = 0;
          buildMachine();
          showToast('Round ' + gsm.progressiveRound + '!');
          checkAchievement('progressive_5', gsm.progressiveRound >= 5);
          return;
        } else {
          ended = true;
        }
      }
      break;
    case 'marathon':
      if (gsm.misses >= 3) ended = true;
      break;
    case 'practice':
      break;
  }

  if (ended) {
    endGame();
  }
}

function endGame(): void {
  gsm.totalScore += gsm.score;
  gsm.totalTickets += gsm.ticketsEarned;
  gsm.totalGames++;
  if (gsm.score > gsm.bestScore) gsm.bestScore = gsm.score;
  if (gsm.bestStreak > gsm.bestStreak_career) gsm.bestStreak_career = gsm.bestStreak;

  checkAchievement('score_1k', gsm.score >= 1000);
  checkAchievement('score_5k', gsm.score >= 5000);
  checkAchievement('score_10k', gsm.score >= 10000);
  checkAchievement('no_miss', gsm.misses === 0 && gsm.grabs > 0);
  checkAchievement('perfect_round', gsm.misses === 0 && gsm.grabs > 0);
  checkAchievement('daily_done', gsm.mode === 'daily');
  checkAchievement('marathon_10', gsm.mode === 'marathon' && gsm.grabs >= 10);
  checkAchievement('time_attack_5', gsm.mode === 'timeattack' && gsm.grabs >= 5);
  checkAchievement('tickets_100', gsm.totalTickets >= 100);
  checkAchievement('tickets_500', gsm.totalTickets >= 500);
  checkAchievement('theme_explorer', gsm.themesUsed.size >= THEMES.length);
  checkAchievement('machine_all', gsm.machinesUsed.size >= MACHINES.length);
  checkAchievement('games_25', gsm.totalGames >= 25);
  // Round 2 achievement checks
  checkAchievement('score_25k', gsm.score >= 25000);
  checkAchievement('streak_10', gsm.bestStreak >= 10);
  checkAchievement('games_50', gsm.totalGames >= 50);
  checkAchievement('marathon_master', gsm.mode === 'marathon' && gsm.grabs >= 25);
  checkAchievement('precision_ace', gsm.mode === 'precision' && gsm.misses === 0 && gsm.grabs === 3);

  const accuracy = gsm.attempts > 0 ? Math.round((gsm.grabs / gsm.attempts) * 100) : 0;
  gsm.addToLeaderboard({
    score: gsm.score, mode: gsm.mode, difficulty: gsm.difficulty,
    grabs: gsm.grabs, accuracy, tickets: gsm.ticketsEarned,
    date: new Date().toLocaleDateString(),
  });

  gsm.save();
  music.stop();
  musicStarted = false;
  audio.gameOver();
  updateGameOver();
  showState('gameover');
}

function checkAchievement(id: string, condition: boolean): void {
  if (condition && gsm.unlockAchievement(id)) {
    const ach = gsm.achievements.find(a => a.id === id);
    if (ach) {
      showToast('ACHIEVEMENT: ' + ach.name);
      audio.achievementUnlock();
    }
  }
}

// ─── UI Update Methods ───────────────────────────────────
function updateHUD(): void {
  const doc = getDoc('hud');
  if (!doc) return;
  setText(doc, 'hud-score', String(gsm.score));
  setText(doc, 'hud-grabs', String(gsm.grabs));
  const attemptsLeft = gsm.maxAttempts === 999 ? 'INF' : String(gsm.maxAttempts - gsm.attempts);
  setText(doc, 'hud-attempts', attemptsLeft);
  setText(doc, 'hud-combo', gsm.combo > 1 ? 'x' + gsm.combo : '');
  const timeStr = gsm.mode === 'timeattack' ? Math.ceil(gsm.timeRemaining) + 's' : '';
  setText(doc, 'hud-time', timeStr);
  const modeLabel = gsm.mode === 'progressive' ? 'R' + gsm.progressiveRound : '';
  setText(doc, 'hud-mode', modeLabel);
}

function updatePowerUpHUD(): void {
  const doc = getDoc('poweruphud');
  if (!doc) return;
  for (let i = 0; i < 3; i++) {
    if (i < powerups.active.length) {
      const pu = powerups.active[i];
      setText(doc, `pu-name-${i}`, pu.def.icon + ' ' + pu.def.name);
      setText(doc, `pu-time-${i}`, Math.ceil(pu.remaining) + 's');
    } else {
      setText(doc, `pu-name-${i}`, '---');
      setText(doc, `pu-time-${i}`, '');
    }
  }
}

function updateGameOver(): void {
  const doc = getDoc('gameover');
  if (!doc) return;
  setText(doc, 'go-score', String(gsm.score));
  setText(doc, 'go-grabs', String(gsm.grabs));
  setText(doc, 'go-misses', String(gsm.misses));
  const accuracy = gsm.attempts > 0 ? Math.round((gsm.grabs / gsm.attempts) * 100) : 0;
  setText(doc, 'go-accuracy', accuracy + '%');
  setText(doc, 'go-streak', String(gsm.bestStreak));
  setText(doc, 'go-combo', 'x' + gsm.combo);
  setText(doc, 'go-tickets', String(gsm.ticketsEarned));
}

function updateLeaderboard(): void {
  const doc = getDoc('leaderboard');
  if (!doc) return;
  for (let i = 0; i < 10; i++) {
    const entry = gsm.leaderboard[i];
    if (entry) {
      setText(doc, `lb-rank-${i}`, String(i + 1));
      setText(doc, `lb-score-${i}`, String(entry.score));
      setText(doc, `lb-mode-${i}`, entry.mode.toUpperCase());
      setText(doc, `lb-date-${i}`, entry.date);
    } else {
      setText(doc, `lb-rank-${i}`, '');
      setText(doc, `lb-score-${i}`, '---');
      setText(doc, `lb-mode-${i}`, '');
      setText(doc, `lb-date-${i}`, '');
    }
  }
}

function updateAchievements(): void {
  const doc = getDoc('achievements');
  if (!doc) return;
  for (let i = 0; i < gsm.achievements.length; i++) {
    const a = gsm.achievements[i];
    setText(doc, `ach-name-${i}`, a.name);
    setText(doc, `ach-desc-${i}`, a.desc);
    setText(doc, `ach-status-${i}`, a.unlocked ? '[X]' : '[ ]');
  }
}

function updateSettings(): void {
  const doc = getDoc('settings');
  if (!doc) return;
  setText(doc, 'settings-theme', gsm.theme.name);
  setText(doc, 'settings-master', Math.round(audio.getMasterVolume() * 100) + '%');
  setText(doc, 'settings-sfx', Math.round(audio.getSfxVolume() * 100) + '%');
  setText(doc, 'settings-music', Math.round(audio.getMusicVolume() * 100) + '%');
}

function updateMachinesPanel(): void {
  const doc = getDoc('machines');
  if (!doc) return;
  const m = gsm.machine;
  setText(doc, 'machine-name', m.name);
  setText(doc, 'machine-desc', `${m.prizeCount} prizes | Grip: ${Math.round(m.clawStrength * 100)}%`);
}

function updateCollectionPanel(): void {
  const doc = getDoc('collection');
  if (!doc) return;
  setText(doc, 'col-count', gsm.collection.size + ' / ' + PRIZE_TYPES.length);
  for (let i = 0; i < PRIZE_TYPES.length; i++) {
    const p = PRIZE_TYPES[i];
    const owned = gsm.collection.has(p.id);
    setText(doc, `col-name-${i}`, owned ? p.name : '???');
    setText(doc, `col-rarity-${i}`, owned ? p.rarity.toUpperCase() : '');
  }
}

function updateStats(): void {
  const doc = getDoc('stats');
  if (!doc) return;
  setText(doc, 'stat-games', String(gsm.totalGames));
  setText(doc, 'stat-grabs', String(gsm.totalGrabs));
  setText(doc, 'stat-misses', String(gsm.totalMisses));
  const rate = (gsm.totalGrabs + gsm.totalMisses) > 0
    ? Math.round((gsm.totalGrabs / (gsm.totalGrabs + gsm.totalMisses)) * 100) : 0;
  setText(doc, 'stat-rate', rate + '%');
  setText(doc, 'stat-best', String(gsm.bestScore));
  setText(doc, 'stat-streak', String(gsm.bestStreak_career));
  setText(doc, 'stat-tickets', String(gsm.totalTickets));
  setText(doc, 'stat-collection', gsm.collection.size + ' / ' + PRIZE_TYPES.length);
}

function updateShowcase(): void {
  const doc = getDoc('showcase');
  if (!doc) return;
  for (let i = 0; i < PRIZE_TYPES.length; i++) {
    const p = PRIZE_TYPES[i];
    const owned = gsm.collection.has(p.id);
    setText(doc, `sc-name-${i}`, owned ? p.name : '???');
    setText(doc, `sc-rarity-${i}`, owned ? p.rarity.toUpperCase() : '');
    setText(doc, `sc-pts-${i}`, owned ? p.points + ' pts | ' + p.tickets + ' tix' : '');
  }
  setText(doc, 'sc-total', gsm.collection.size + ' / ' + PRIZE_TYPES.length + ' Discovered');
}

function rebuildTheme(): void {
  if (env) {
    world.scene.remove(env.group);
  }
  env = createEnvironment(gsm.theme);
  world.scene.add(env.group);
  buildMachine();
  gsm.save();
}

// ─── Input Handling ──────────────────────────────────────
function handleInput(dt: number): void {
  if (gsm.state !== 'playing' || countdownTimer > 0) return;

  const kb = (world.input as any).keyboard;

  let dx = 0, dz = 0;
  if (kb.getKeyPressed('KeyW') || kb.getKeyPressed('ArrowUp')) dz = -1;
  if (kb.getKeyPressed('KeyS') || kb.getKeyPressed('ArrowDown')) dz = 1;
  if (kb.getKeyPressed('KeyA') || kb.getKeyPressed('ArrowLeft')) dx = -1;
  if (kb.getKeyPressed('KeyD') || kb.getKeyPressed('ArrowRight')) dx = 1;

  if (dx !== 0 || dz !== 0) {
    moveClaw(dx, dz, dt);
  } else if (gsm.clawPhase === 'positioning') {
    gsm.clawPhase = 'idle';
  }

  if (kb.getKeyDown('Space')) {
    dropClaw();
  }

  if (kb.getKeyDown('Escape')) {
    if (gsm.state === 'playing') {
      showState('paused');
    }
  }

  // XR controller input
  try {
    const xr = (world.input as any).xr;
    if (xr) {
      const rightPad = xr.getController?.('right');
      if (rightPad?.gamepad) {
        const axes = rightPad.gamepad.axes;
        if (axes && axes.length >= 4) {
          const tx = axes[2] || 0;
          const tz = axes[3] || 0;
          if (Math.abs(tx) > 0.15 || Math.abs(tz) > 0.15) {
            moveClaw(tx, tz, dt);
          }
        }
      }
      if (rightPad?.gamepad?.buttons?.[0]?.pressed) {
        dropClaw();
      }
      if (rightPad?.gamepad?.buttons?.[4]?.pressed) {
        showState('paused');
      }
    }
  } catch {}
}

// ─── Main Loop ───────────────────────────────────────────
function gameLoop(dt: number, time: number): void {
  // Countdown
  if (countdownTimer > 0 && gsm.state === 'playing') {
    countdownTimer -= dt;
    const newVal = Math.ceil(countdownTimer);
    if (newVal !== countdownValue && newVal > 0) {
      countdownValue = newVal;
      const doc = getDoc('countdown');
      setText(doc, 'cd-text', String(countdownValue));
      audio.countdownTick();
    }
    if (countdownTimer <= 0) {
      setVisible('countdown', false);
      audio.countdownGo();
      countdownTimer = 0;
    }
    return;
  }

  // Input
  handleInput(dt);

  // Claw physics
  if (gsm.state === 'playing' || gsm.state === 'grabbing' || gsm.state === 'dropping') {
    updateClawPhysics(dt);
  }

  // Time attack timer
  if (gsm.mode === 'timeattack' && gsm.state === 'playing' && gsm.clawPhase === 'idle') {
    gsm.timeRemaining -= dt;
    if (gsm.timeRemaining <= 0) {
      gsm.timeRemaining = 0;
      checkGameEnd();
    }
    updateHUD();
  }

  // Combo decay
  if (gsm.comboTimer > 0) {
    gsm.comboTimer -= dt;
    if (gsm.comboTimer <= 0) {
      gsm.combo = 1;
      gsm.comboTimer = 0;
    }
  }

  // Toast timer
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) {
      setVisible('toast', false);
    }
  }

  // Claw shadow
  if (clawShadow) {
    const floorY = -gsm.machine.pitHeight / 2 + 0.01;
    updateClawShadow(clawShadow, gsm.clawX, gsm.clawZ, floorY, gsm.state === 'playing' && gsm.clawPhase !== 'returning', time);
  }

  // Glow ring pulse
  if (clawGroup) {
    const ring = clawGroup.getObjectByName('glow_ring');
    if (ring) {
      const pulse = 0.8 + 0.2 * Math.sin(time * 3);
      ring.scale.setScalar(pulse);
    }
  }

  // Chute ring animation
  if (machineBox) {
    const chuteRing = machineBox.getObjectByName('chute_ring') as Mesh;
    if (chuteRing) {
      chuteRing.rotation.z += dt * 2;
      const s = 0.9 + 0.15 * Math.sin(time * 4);
      chuteRing.scale.setScalar(s);
    }
  }

  // Prize animations (floating/rotating + wobble)
  for (const p of prizeMeshes) {
    p.rotation.y += dt * 0.3;
    const data = p as any;
    if (!data._bobOffset) data._bobOffset = Math.random() * Math.PI * 2;
    const bobBase = -gsm.machine.pitHeight / 2 + 0.04;
    p.position.y = bobBase + Math.sin(time * 1.5 + data._bobOffset) * 0.003;

    // Wobble effect from nearby grabs
    if (data._wobbleTimer && data._wobbleTimer > 0) {
      data._wobbleTimer -= dt;
      const wobble = Math.sin(time * 25) * data._wobbleStrength * (data._wobbleTimer / 0.5);
      p.rotation.x = wobble;
      p.rotation.z = wobble * 0.7;
    } else {
      p.rotation.x *= 0.95;
      p.rotation.z *= 0.95;
    }

    // X-Ray power-up: show rarity glow halo on prizes
    if (powerups.has('x_ray') && data._prizeData) {
      if (!data._xrayRing) {
        const rarityColor = RARITY_COLORS[data._prizeData.rarity] || '#ffffff';
        const xring = new Mesh(
          new SphereGeometry(0.05, 6, 4),
          new MeshBasicMaterial({ color: new Color(rarityColor), transparent: true, opacity: 0.25, blending: AdditiveBlending }),
        );
        xring.name = 'xray_ring';
        p.add(xring);
        data._xrayRing = xring;
      }
    } else if (data._xrayRing) {
      p.remove(data._xrayRing);
      data._xrayRing = null;
    }
  }

  // Update environment
  if (env) updateEnvironment(env, time);

  // Particles
  particles.update(dt);

  // Claw trail
  updateClawTrail(dt, time);

  // Score popups
  updateScorePopups(dt);

  // Power-ups update
  if (gsm.state === 'playing') {
    powerups.update(dt);
    updatePowerUpHUD();

    // Check power-up collection
    checkPowerUpCollection();

    // Spawn new power-up orbs periodically
    if (powerups.shouldSpawn() && gsm.clawPhase === 'idle') {
      spawnPowerUpOrb();
    }
  }

  // Power bar update
  if (gsm.state === 'playing') {
    const doc = getDoc('powerbar');
    if (doc) {
      const barLen = 10;
      const filled = gsm.clawPhase === 'idle' || gsm.clawPhase === 'positioning'
        ? barLen : Math.round(barLen * (gsm.clawY - gsm.clawTargetY) / (gsm.machine.pitHeight * 0.5 + 0.1));
      const bar = '#'.repeat(Math.max(0, Math.min(barLen, filled))) + '-'.repeat(Math.max(0, barLen - filled));
      setText(doc, 'power-bar', '[' + bar + ']');
      const phaseLabel = gsm.clawPhase === 'descending' ? 'DROPPING'
        : gsm.clawPhase === 'ascending' ? 'LIFTING'
        : gsm.clawPhase === 'returning' ? 'RETURNING'
        : powerups.has('slow_mo') ? 'READY [SLOW]'
        : powerups.has('strong_grip') ? 'READY [GRIP+]'
        : 'READY';
      setText(doc, 'power-label', phaseLabel);
    }
  }

  // Screen shake
  shake.update(dt);
}

// ─── Init ────────────────────────────────────────────────
async function main(): Promise<void> {
  const container = document.getElementById('app') as HTMLDivElement;

  world = await World.create(container, {
    xr: { offer: 'once' as any },
    features: {
      grabbing: true,
      physics: false,
      spatialUI: true,
    },
  } as any);

  // Fog
  world.scene.fog = new (await import('@iwsdk/core')).Fog(0x000811, 5, 25);

  // Environment
  env = createEnvironment(gsm.theme);
  world.scene.add(env.group);

  // Particles
  const particleGroup = new Group();
  world.scene.add(particleGroup);
  particles = new ParticleSystem(particleGroup);

  // Trail pool
  initTrailPool();

  // Build initial machine
  buildMachine();

  // Init panels
  initPanels();

  // Wire buttons after panels load
  wireButtons();

  // Check tutorial
  try {
    tutorialShown = localStorage.getItem('neon-claw-tutorial') === '1';
  } catch {}

  // Show title (or tutorial for first-time)
  setTimeout(() => {
    if (!tutorialShown) {
      setVisible('tutorial', true);
    } else {
      showState('title');
    }
  }, 2000);

  // Game loop
  let lastTime = 0;
  const update = (timeMs: number) => {
    const time = timeMs * 0.001;
    const dt = Math.min(0.05, lastTime > 0 ? time - lastTime : 0.016);
    lastTime = time;
    gameLoop(dt, time);
    requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

main().catch(console.error);

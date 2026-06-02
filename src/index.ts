// index.ts — Main entry point for Neon Claw VR (Round 4: Progression, Skins, Modifiers, Daily Rewards)
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
import { CampaignManager, SEASONS } from './campaign';
import { FusionManager, FUSION_RECIPES } from './fusion';
import {
  ProgressionManager, CLAW_SKINS, CHALLENGE_MODIFIERS, RARITY_XP,
  getLevelRewards, DAILY_REWARDS,
} from './progression';
import { ShopManager, SHOP_ITEMS } from './shop';
import { WheelManager, WHEEL_SEGMENTS, WHEEL_COST } from './wheel';
import { PrestigeManager, PRESTIGE_STARS } from './prestige';
import { FrenzyManager, FRENZY_CONFIG } from './frenzy';
import { MachineSkinManager, MACHINE_SKINS } from './machineskins';
import { ModeStatsManager } from './modestats';
import { TournamentManager, TOURNAMENT_BRACKETS } from './tournament';
import { CustomChallengeManager, PRESET_CHALLENGES } from './customchallenge';

// ─── Globals ─────────────────────────────────────────────
const gsm = new GameStateManager();
const audio = new AudioManager();
const shake = new ScreenShake();
const powerups = new PowerUpManager();
const music = new SynthwaveMusic();
const campaign = new CampaignManager();
const fusion = new FusionManager();
const progression = new ProgressionManager();
const shop = new ShopManager();
const wheel = new WheelManager();
const prestige = new PrestigeManager();
const frenzy = new FrenzyManager();
const machineSkins = new MachineSkinManager();
const modeStats = new ModeStatsManager();
const tournament = new TournamentManager();
const customChallenge = new CustomChallengeManager();
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

// Campaign state
let campaignSeasonView = 0;
let inCampaignGame = false;
let legendaryGrabCelebration = 0; // timer for legendary celebration VFX
const confettiParticles: { mesh: Mesh; vel: Vector3; life: number; spin: number }[] = [];
let frenzyPending = false; // true when a frenzy was triggered and will start after gameover
let inTournamentGame = false; // true during tournament rounds
let inCustomGame = false; // true during custom challenge games

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
  // Round 3 panels
  setupPanel('campaign', '/ui/campaign.json', { maxWidth: 1.0, maxHeight: 1.0, pos: [0, menuY, menuZ] });
  setupPanel('campaignstage', '/ui/campaignstage.json', { maxWidth: 1.0, maxHeight: 1.0, pos: [0, menuY, menuZ] });
  setupPanel('fusion', '/ui/fusion.json', { maxWidth: 1.0, maxHeight: 1.0, pos: [0, menuY, menuZ] });
  setupPanel('campaignresult', '/ui/campaignresult.json', { maxWidth: 0.8, maxHeight: 0.7, pos: [0, menuY, menuZ] });
  // Round 4 panels
  setupPanel('profile', '/ui/profile.json', { maxWidth: 0.9, maxHeight: 0.9, pos: [0, menuY, menuZ] });
  setupPanel('clawskins', '/ui/clawskins.json', { maxWidth: 0.9, maxHeight: 1.1, pos: [0, menuY, menuZ] });
  setupPanel('modifiers', '/ui/modifiers.json', { maxWidth: 0.9, maxHeight: 0.9, pos: [0, menuY, menuZ] });
  setupPanel('levelup', '/ui/levelup.json', { maxWidth: 0.7, maxHeight: 0.5, pos: [0, menuY, menuZ] });
  // Round 5 panels
  setupPanel('shop', '/ui/shop.json', { maxWidth: 1.0, maxHeight: 1.2, pos: [0, menuY, menuZ] });
  setupPanel('wheel', '/ui/wheel.json', { maxWidth: 0.9, maxHeight: 1.1, pos: [0, menuY, menuZ] });
  setupPanel('prestige', '/ui/prestige.json', { maxWidth: 0.9, maxHeight: 1.2, pos: [0, menuY, menuZ] });
  // Round 6 panels
  setupPanel('frenzy', '/ui/frenzy.json', { maxWidth: 0.35, maxHeight: 0.2, follower: true, followOffset: [0, 0.12, -0.5] });
  setupPanel('frenzyresult', '/ui/frenzyresult.json', { maxWidth: 0.7, maxHeight: 0.5, pos: [0, menuY, menuZ] });
  setupPanel('machineskins', '/ui/machineskins.json', { maxWidth: 1.0, maxHeight: 1.2, pos: [0, menuY, menuZ] });
  setupPanel('detailedstats', '/ui/detailedstats.json', { maxWidth: 1.1, maxHeight: 1.2, pos: [0, menuY, menuZ] });
  // Round 7 panels
  setupPanel('tournament', '/ui/tournament.json', { maxWidth: 1.0, maxHeight: 1.2, pos: [0, menuY, menuZ] });
  setupPanel('tournamentround', '/ui/tournamentround.json', { maxWidth: 1.0, maxHeight: 1.2, pos: [0, menuY, menuZ] });
  setupPanel('tournamentresult', '/ui/tournamentresult.json', { maxWidth: 0.8, maxHeight: 0.7, pos: [0, menuY, menuZ] });
  setupPanel('customchallenge', '/ui/customchallenge.json', { maxWidth: 1.0, maxHeight: 1.4, pos: [0, menuY, menuZ] });
}

// ─── Show/Hide State Panels ──────────────────────────────
function showState(state: GameState): void {
  gsm.state = state;
  const allPanels = ['title', 'modeselect', 'difficulty', 'machines', 'hud', 'pause',
    'gameover', 'leaderboard', 'achievements', 'settings', 'help', 'collection', 'stats',
    'toast', 'countdown', 'powerbar', 'tutorial', 'poweruphud', 'showcase',
    'campaign', 'campaignstage', 'fusion', 'campaignresult',
    'profile', 'clawskins', 'modifiers', 'levelup',
    'shop', 'wheel', 'prestige',
    'frenzy', 'frenzyresult', 'machineskins', 'detailedstats',
    'tournament', 'tournamentround', 'tournamentresult', 'customchallenge'];

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
    campaign: ['campaign'],
    campaign_stage: ['campaignstage'],
    fusion: ['fusion'],
    campaign_result: ['campaignresult'],
    profile: ['profile'],
    clawskins: ['clawskins'],
    modifiers: ['modifiers'],
    levelup: ['levelup'],
    shop: ['shop'],
    wheel: ['wheel'],
    prestige: ['prestige'],
    frenzy: ['frenzy', 'hud', 'powerbar'],
    frenzy_result: ['frenzyresult'],
    machineskins: ['machineskins'],
    detailedstats: ['detailedstats'],
    tournament: ['tournament'],
    tournament_round: ['tournamentround'],
    tournament_result: ['tournamentresult'],
    customchallenge: ['customchallenge'],
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
  if (gsm.state !== 'playing' && gsm.state !== ('frenzy' as any) || gsm.clawPhase === 'idle') return;

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
      'btn-campaign': () => { audio.buttonClick(); updateCampaignPanel(); showState('campaign'); },
      'btn-machines': () => { audio.buttonClick(); updateMachinesPanel(); showState('machines'); },
      'btn-collection': () => { audio.buttonClick(); updateCollectionPanel(); showState('collection'); },
      'btn-fusion': () => { audio.buttonClick(); updateFusionPanel(); showState('fusion'); },
      'btn-scores': () => { audio.buttonClick(); updateLeaderboard(); showState('leaderboard'); },
      'btn-achievements': () => { audio.buttonClick(); updateAchievements(); showState('achievements'); },
      'btn-stats': () => { audio.buttonClick(); updateStats(); showState('stats'); },
      'btn-settings': () => { audio.buttonClick(); updateSettings(); showState('settings'); },
      'btn-help': () => { audio.buttonClick(); showState('help'); },
      'btn-profile': () => { audio.buttonClick(); updateProfilePanel(); showState('profile'); },
      'btn-skins': () => { audio.buttonClick(); updateClawSkinsPanel(); showState('clawskins'); },
      'btn-modifiers': () => { audio.buttonClick(); updateModifiersPanel(); showState('modifiers'); },
      'btn-shop': () => { audio.buttonClick(); updateShopPanel(); showState('shop'); },
      'btn-wheel': () => { audio.buttonClick(); updateWheelPanel(); showState('wheel'); },
      'btn-prestige': () => { audio.buttonClick(); updatePrestigePanel(); showState('prestige'); },
      'btn-machskins': () => { audio.buttonClick(); updateMachineSkinsPanel(); showState('machineskins'); },
      'btn-detailedstats': () => { audio.buttonClick(); updateDetailedStatsPanel(); showState('detailedstats'); },
      'btn-tournament': () => { audio.buttonClick(); updateTournamentPanel(); showState('tournament'); },
      'btn-custom': () => { audio.buttonClick(); updateCustomChallengePanel(); showState('customchallenge'); },
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

    // Round 3 panel wiring
    wirePanel('campaign', {
      'btn-season-0': () => { audio.buttonClick(); campaignSeasonView = 0; updateCampaignStagePanel(); showState('campaign_stage'); },
      'btn-season-1': () => { if (campaign.isSeasonUnlocked(1)) { audio.buttonClick(); campaignSeasonView = 1; updateCampaignStagePanel(); showState('campaign_stage'); } else { showToast('Complete previous season first'); } },
      'btn-season-2': () => { if (campaign.isSeasonUnlocked(2)) { audio.buttonClick(); campaignSeasonView = 2; updateCampaignStagePanel(); showState('campaign_stage'); } else { showToast('Complete previous season first'); } },
      'btn-back-campaign': () => { audio.buttonClick(); showState('title'); },
    });

    wirePanel('campaignstage', {
      'btn-stage-0': () => startCampaignStage(campaignSeasonView, 0),
      'btn-stage-1': () => startCampaignStage(campaignSeasonView, 1),
      'btn-stage-2': () => startCampaignStage(campaignSeasonView, 2),
      'btn-stage-3': () => startCampaignStage(campaignSeasonView, 3),
      'btn-back-stages': () => { audio.buttonClick(); updateCampaignPanel(); showState('campaign'); },
    });

    wirePanel('fusion', {
      'btn-fuse-common': () => performFusion(0),
      'btn-fuse-uncommon': () => performFusion(1),
      'btn-fuse-rare': () => performFusion(2),
      'btn-fuse-epic': () => performFusion(3),
      'btn-back-fusion': () => { audio.buttonClick(); showState('title'); },
    });

    wirePanel('campaignresult', {
      'btn-cr-continue': () => { audio.buttonClick(); updateCampaignStagePanel(); showState('campaign_stage'); },
    });

    // Round 4 panel wiring
    wirePanel('profile', {
      'btn-daily-claim': () => claimDailyReward(),
      'btn-back-profile': () => { audio.buttonClick(); showState('title'); },
    });

    wirePanel('clawskins', {
      'btn-skin-0': () => selectClawSkin(0),
      'btn-skin-1': () => selectClawSkin(1),
      'btn-skin-2': () => selectClawSkin(2),
      'btn-skin-3': () => selectClawSkin(3),
      'btn-skin-4': () => selectClawSkin(4),
      'btn-skin-5': () => selectClawSkin(5),
      'btn-skin-6': () => selectClawSkin(6),
      'btn-skin-7': () => selectClawSkin(7),
      'btn-back-skins': () => { audio.buttonClick(); showState('title'); },
    });

    wirePanel('modifiers', {
      'btn-mod-0': () => toggleModifier(0),
      'btn-mod-1': () => toggleModifier(1),
      'btn-mod-2': () => toggleModifier(2),
      'btn-mod-3': () => toggleModifier(3),
      'btn-mod-4': () => toggleModifier(4),
      'btn-back-mods': () => { audio.buttonClick(); showState('title'); },
    });

    wirePanel('levelup', {
      'btn-lvl-ok': () => { audio.buttonClick(); showState('gameover'); },
    });

    // Round 5 panel wiring
    wirePanel('shop', {
      'btn-shop-0': () => buyShopItem(0),
      'btn-shop-1': () => buyShopItem(1),
      'btn-shop-2': () => buyShopItem(2),
      'btn-shop-3': () => buyShopItem(3),
      'btn-shop-4': () => buyShopItem(4),
      'btn-shop-5': () => buyShopItem(5),
      'btn-shop-6': () => buyShopItem(6),
      'btn-shop-7': () => buyShopItem(7),
      'btn-back-shop': () => { audio.buttonClick(); showState('title'); },
    });

    wirePanel('wheel', {
      'btn-spin': () => spinWheel(),
      'btn-back-wheel': () => { audio.buttonClick(); showState('title'); },
    });

    wirePanel('prestige', {
      'btn-prestige': () => performPrestige(),
      'btn-back-prestige': () => { audio.buttonClick(); showState('title'); },
    });

    // Round 6 panel wiring
    wirePanel('frenzyresult', {
      'btn-fr-continue': () => { audio.buttonClick(); updateGameOver(); showState('gameover'); },
    });

    wirePanel('machineskins', {
      'btn-ms-0': () => handleMachineSkinClick(0),
      'btn-ms-1': () => handleMachineSkinClick(1),
      'btn-ms-2': () => handleMachineSkinClick(2),
      'btn-ms-3': () => handleMachineSkinClick(3),
      'btn-ms-4': () => handleMachineSkinClick(4),
      'btn-ms-5': () => handleMachineSkinClick(5),
      'btn-ms-back': () => { audio.buttonClick(); showState('title'); },
    });

    wirePanel('detailedstats', {
      'btn-ds-back': () => { audio.buttonClick(); showState('title'); },
    });

    // Round 7 panel wiring
    wirePanel('tournament', {
      'btn-tb-0': () => startTournamentBracket(0),
      'btn-tb-1': () => startTournamentBracket(1),
      'btn-tb-2': () => startTournamentBracket(2),
      'btn-tourn-back': () => { audio.buttonClick(); showState('title'); },
    });

    wirePanel('tournamentround', {
      'btn-tr-play': () => playTournamentRound(),
      'btn-tr-abandon': () => { audio.buttonClick(); tournament.abandonTournament(); showToast('Tournament abandoned'); updateTournamentPanel(); showState('tournament'); },
      'btn-tr-back': () => { audio.buttonClick(); updateTournamentPanel(); showState('tournament'); },
    });

    wirePanel('tournamentresult', {
      'btn-tres-continue': () => handleTournamentResultContinue(),
    });

    wirePanel('customchallenge', {
      'btn-cc-preset-0': () => startPresetChallenge(0),
      'btn-cc-preset-1': () => startPresetChallenge(1),
      'btn-cc-preset-2': () => startPresetChallenge(2),
      'btn-cc-preset-3': () => startPresetChallenge(3),
      'btn-cc-mach-prev': () => { audio.buttonClick(); customChallenge.builderMachineIdx = (customChallenge.builderMachineIdx - 1 + MACHINES.length) % MACHINES.length; updateCustomChallengePanel(); },
      'btn-cc-mach-next': () => { audio.buttonClick(); customChallenge.builderMachineIdx = (customChallenge.builderMachineIdx + 1) % MACHINES.length; updateCustomChallengePanel(); },
      'btn-cc-mode-prev': () => { audio.buttonClick(); customChallenge.builderModeIdx = (customChallenge.builderModeIdx - 1 + customChallenge.getModes().length) % customChallenge.getModes().length; updateCustomChallengePanel(); },
      'btn-cc-mode-next': () => { audio.buttonClick(); customChallenge.builderModeIdx = (customChallenge.builderModeIdx + 1) % customChallenge.getModes().length; updateCustomChallengePanel(); },
      'btn-cc-diff-prev': () => { audio.buttonClick(); customChallenge.builderDiffIdx = (customChallenge.builderDiffIdx - 1 + 3) % 3; updateCustomChallengePanel(); },
      'btn-cc-diff-next': () => { audio.buttonClick(); customChallenge.builderDiffIdx = (customChallenge.builderDiffIdx + 1) % 3; updateCustomChallengePanel(); },
      'btn-cc-target-down': () => { audio.buttonClick(); customChallenge.builderTargetScore = Math.max(0, customChallenge.builderTargetScore - 500); updateCustomChallengePanel(); },
      'btn-cc-target-up': () => { audio.buttonClick(); customChallenge.builderTargetScore = Math.min(10000, customChallenge.builderTargetScore + 500); updateCustomChallengePanel(); },
      'btn-cc-create': () => startBuiltCustomChallenge(),
      'btn-cc-back': () => { audio.buttonClick(); showState('title'); },
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
  (gsm as any)._luckyCharmActive = false;
  (gsm as any)._xpBoostActive = false;

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

  // Apply shop consumables
  if (shop.useConsumable('extra_attempt')) {
    gsm.maxAttempts += 1;
    showToast('🎟️ Extra Attempt activated!');
  }
  if (shop.useConsumable('lucky_charm')) {
    (gsm as any)._luckyCharmActive = true;
    showToast('🍀 Lucky Charm active!');
  }
  if (shop.useConsumable('xp_boost')) {
    (gsm as any)._xpBoostActive = true;
    showToast('⚡ 2x XP Boost active!');
  }

  buildMachine();
  audio.init();
  audio.gameStart();
  gameStarted = true;

  // Apply starter power-up consumables
  if (shop.useConsumable('starter_grip')) {
    const gripDef = POWERUP_DEFS.find(d => d.id === 'strong_grip');
    if (gripDef) { powerups.activate(gripDef); showToast('💪 Starter Grip+ active!'); }
  }
  if (shop.useConsumable('starter_magnet')) {
    const magnetDef = POWERUP_DEFS.find(d => d.id === 'magnet');
    if (magnetDef) { powerups.activate(magnetDef); showToast('🧲 Starter Magnet active!'); }
  }

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
  let speed = config.clawSpeed * 0.8 * dt;

  // Turbo modifier: 50% faster movement
  if (progression.hasModifier('turbo')) speed *= 1.5;

  // Mirror modifier: invert controls
  let mdx = dx, mdz = dz;
  if (progression.hasModifier('mirror')) {
    mdx = -dx;
    mdz = -dz;
  }

  const halfW = config.pitWidth * 0.4;
  const halfD = config.pitDepth * 0.4;

  gsm.clawX = Math.max(-halfW, Math.min(halfW, gsm.clawX + mdx * speed));
  gsm.clawZ = Math.max(-halfD, Math.min(halfD, gsm.clawZ + mdz * speed));
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
  const liftSpeed = progression.hasModifier('turbo') ? 0.6 : 0.4;
  const returnSpeed = progression.hasModifier('turbo') ? 0.75 : 0.5;

  // Turbo modifier: 50% faster drop
  if (progression.hasModifier('turbo')) {
    dropSpeed *= 1.5;
  }
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
  // Weak Grip modifier: reduce by 40%
  if (progression.hasModifier('weak_grip')) {
    grip *= 0.6;
  }
  // Strong Grip power-up
  if (powerups.has('strong_grip')) {
    grip = 1.0;
  }
  // Lucky Charm consumable: +15% grip
  if ((gsm as any)._luckyCharmActive) {
    grip *= 1.15;
  }
  // Prestige grab bonus
  grip += prestige.getGrabBonus();
  // Prize Scanner boost: slight bonus from better targeting
  if (shop.hasBoost('prize_scanner')) {
    grip *= 1.05;
  }
  // Frenzy mode: boosted grip
  if (frenzy.state.active) {
    grip *= FRENZY_CONFIG.gripBoost;
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

  // Round 6: Frenzy mode uses special grab handling
  if (gsm.state === ('frenzy' as any) && frenzy.state.active) {
    handleFrenzyGrab(prizeData);
    gsm.grabbedPrize = null;
    gsm.attempts++;
    gsm.clawPhase = 'idle';
    gsm.clawGripping = false;
    gsm.clawX = 0;
    gsm.clawZ = 0;
    audio.prizeRelease();
    return;
  }

  let points = prizeData.points;
  points *= gsm.combo;
  gsm.score += points;
  gsm.grabs++;
  gsm.streak++;
  gsm.totalGrabs++;

  let ticketMult = gsm.combo;
  if (powerups.has('double_tickets')) ticketMult *= 2;
  // Apply modifier ticket multiplier
  ticketMult *= progression.getTicketMultiplier();
  // Double points modifier: 2x points
  if (progression.hasModifier('double_pts')) {
    points *= 2;
  }
  // Prestige ticket bonus
  ticketMult *= (1 + prestige.getTicketBonus());
  // Shop ticket magnet bonus
  ticketMult *= (1 + shop.getTicketBonusPercent() / 100);
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
  // Add to fusion inventory
  fusion.addPrize(prizeData.id);

  const grabTime = (performance.now() - gsm.grabStartTime) / 1000;
  checkAchievement('speed_grab', grabTime < 3);

  // Campaign objective tracking
  if (inCampaignGame) {
    campaign.onGrab(prizeData.rarity, prizeData.id, grabTime);
    campaign.onScoreUpdate(gsm.score);
    campaign.onComboUpdate(gsm.combo);
  }
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

  // Legendary grab celebration
  if (prizeData.rarity === 'legendary') {
    legendaryGrabCelebration = 2.5;
    spawnConfetti(popPos.clone(), 30);
    shake.trigger(0.03, 0.5);
    showToast('★ LEGENDARY GRAB! ★');
  } else if (prizeData.rarity === 'epic') {
    spawnConfetti(popPos.clone(), 15);
    shake.trigger(0.02, 0.3);
  }

  // Rarity achievements
  checkAchievement('rare_grab', prizeData.rarity === 'rare' || prizeData.rarity === 'epic' || prizeData.rarity === 'legendary');
  checkAchievement('epic_grab', prizeData.rarity === 'epic' || prizeData.rarity === 'legendary');
  checkAchievement('legendary_grab', prizeData.rarity === 'legendary');
  checkAchievement('first_grab', true);
  checkAchievement('ten_grabs', gsm.totalGrabs >= 10);
  checkAchievement('fifty_grabs', gsm.totalGrabs >= 50);
  checkAchievement('hundred_grabs', gsm.totalGrabs >= 100);
  checkAchievement('grabs_250', gsm.totalGrabs >= 250);
  checkAchievement('grabs_500', gsm.totalGrabs >= 500);
  checkAchievement('streak_3', gsm.streak >= 3);
  checkAchievement('streak_5', gsm.streak >= 5);
  checkAchievement('collection_10', gsm.collection.size >= 10);
  checkAchievement('collection_all', gsm.collection.size >= PRIZE_TYPES.length);
  checkAchievement('collection_15', gsm.collection.size >= 15);
  checkAchievement('collection_20', gsm.collection.size >= 20);
  // New machine achievements
  checkAchievement('tower_clear', gsm.machine.id === 'tower' && gsm.grabs >= 5);
  checkAchievement('void_grab', gsm.machine.id === 'void');

  // Round 4: XP + progression achievements
  let xpAmount = RARITY_XP[prizeData.rarity] || 10;
  // Prestige XP bonus
  xpAmount = Math.floor(xpAmount * (1 + prestige.getXpBonus()));
  // XP Boost consumable: 2x
  if ((gsm as any)._xpBoostActive) xpAmount *= 2;
  const xpEarned = progression.addXp(xpAmount);
  checkAchievement('xp_1k', progression.totalXp >= 1000);
  checkAchievement('xp_10k', progression.totalXp >= 10000);
  checkAchievement('level_5', progression.level >= 5);
  checkAchievement('level_10', progression.level >= 10);
  checkAchievement('level_25', progression.level >= 25);
  checkAchievement('level_50', progression.level >= 50);
  checkAchievement('first_skin', progression.unlockedSkins.size > 1);
  checkAchievement('all_skins', progression.unlockedSkins.size >= CLAW_SKINS.length);
  // Modifier achievements
  if (progression.activeModifiers.size > 0) {
    checkAchievement('modifier_1', true);
    checkAchievement('turbo_grab', progression.hasModifier('turbo'));
    checkAchievement('mirror_grab', progression.hasModifier('mirror'));
    checkAchievement('weak_legendary', progression.hasModifier('weak_grip') && prizeData.rarity === 'legendary');
  }

  gsm.grabbedPrize = null;
  gsm.attempts++;
  audio.prizeRelease();

  updateHUD();
}

function completeMiss(): void {
  // In frenzy mode, misses don't count — just reset claw
  if (gsm.state === ('frenzy' as any) && frenzy.state.active) {
    gsm.clawPhase = 'idle';
    gsm.clawGripping = false;
    gsm.clawX = 0;
    gsm.clawZ = 0;
    audio.clawMiss();
    return;
  }
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

  // Round 6: track per-mode stats
  const machineName = gsm.machine.name;
  modeStats.recordGame(gsm.mode, gsm.difficulty, machineName, gsm.score, gsm.grabs, gsm.misses, gsm.ticketsEarned, gsm.combo);

  // Round 6: count perfect games for achievement
  if (gsm.misses === 0 && gsm.grabs > 0) {
    const classicPerfects = Object.values(modeStats.modeStats).reduce((sum, m) => sum + m.perfectGames, 0);
    checkAchievement('perfect_3', classicPerfects >= 3);
  }

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
  // Round 4 achievement checks
  checkAchievement('modifier_3', progression.activeModifiers.size >= 3 && gsm.grabs > 0);
  checkAchievement('modifier_all', progression.activeModifiers.size >= 5 && gsm.grabs > 0);
  checkAchievement('tickets_2k', gsm.totalTickets >= 2000);
  checkAchievement('tickets_5k', gsm.totalTickets >= 5000);
  checkAchievement('games_100', gsm.totalGames >= 100);
  checkAchievement('score_50k', gsm.score >= 50000);
  checkAchievement('total_score_100k', gsm.totalScore >= 100000);
  checkAchievement('daily_3', progression.dailyStreak >= 3);
  checkAchievement('daily_7', progression.dailyStreak >= 7);

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

  // Campaign game end
  if (inCampaignGame) {
    campaign.onGameEnd(gsm.misses);
    inCampaignGame = false;
    showCampaignResult();
    showState('campaign_result');
    return;
  }

  // Tournament game end
  if (inTournamentGame) {
    inTournamentGame = false;
    showTournamentResult(gsm.score);
    return;
  }

  // Custom challenge game end
  if (inCustomGame) {
    endCustomChallenge(gsm.score);
    // Fall through to normal gameover screen
  }

  // Check for level-up display
  if (progression.pendingLevelUp) {
    showLevelUpPanel();
    showState('levelup');
    return;
  }

  // Round 6: Check for Claw Frenzy bonus round trigger
  if (!inCampaignGame && gsm.mode !== 'practice' && frenzy.shouldTrigger(gsm.grabs)) {
    frenzyPending = true;
    startFrenzy();
    return;
  }

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

// ─── Campaign UI Updates ─────────────────────────────────
function updateCampaignPanel(): void {
  const doc = getDoc('campaign');
  if (!doc) return;
  setText(doc, 'camp-progress', campaign.getTotalStagesCompleted() + ' / ' + campaign.getTotalStages() + ' Stages Complete');
  for (let i = 0; i < SEASONS.length; i++) {
    const s = SEASONS[i];
    setText(doc, `s${i}-name`, s.name);
    setText(doc, `s${i}-desc`, s.description);
    const completed = s.stages.filter(st => campaign.progress.completedStages.has(st.id)).length;
    if (campaign.isSeasonUnlocked(i)) {
      setText(doc, `s${i}-progress`, completed + ' / ' + s.stages.length + (completed === s.stages.length ? ' ★' : ''));
    } else {
      setText(doc, `s${i}-progress`, '🔒 LOCKED');
    }
  }
}

function updateCampaignStagePanel(): void {
  const doc = getDoc('campaignstage');
  if (!doc) return;
  const season = SEASONS[campaignSeasonView];
  setText(doc, 'cs-season', season.name);
  setText(doc, 'cs-title', '⚔️ Stages');
  for (let i = 0; i < season.stages.length; i++) {
    const stage = season.stages[i];
    const unlocked = campaign.isStageUnlocked(campaignSeasonView, i);
    const completed = campaign.progress.completedStages.has(stage.id);
    setText(doc, `st-name-${i}`, stage.name);
    const machineInfo = MACHINES.find(m => m.id === stage.machineId);
    setText(doc, `st-info-${i}`, (machineInfo?.name || stage.machineId) + ' | ' + stage.mode + ' | ' + stage.difficulty);
    setText(doc, `st-reward-${i}`, '🎫 ' + stage.ticketReward + ' tickets' + (stage.bonusPrizeId ? ' + Bonus Prize!' : ''));
    setText(doc, `st-status-${i}`, completed ? '✅ COMPLETE' : unlocked ? '▶ AVAILABLE' : '🔒 LOCKED');
  }
}

function startCampaignStage(seasonIdx: number, stageIdx: number): void {
  const stage = campaign.startStage(seasonIdx, stageIdx);
  if (!stage) {
    showToast('Stage locked — complete previous stages first');
    return;
  }
  audio.buttonClick();
  inCampaignGame = true;
  // Set machine and theme for this stage
  const machineIdx = MACHINES.findIndex(m => m.id === stage.machineId);
  if (machineIdx >= 0) gsm.machineIndex = machineIdx;
  const season = SEASONS[seasonIdx];
  const themeIdx = THEMES.findIndex(t => t.id === season.themeId);
  if (themeIdx >= 0) {
    gsm.themeIndex = themeIdx;
    rebuildTheme();
  }
  gsm.mode = stage.mode as GameMode;
  gsm.difficulty = stage.difficulty as any;
  startGame();
}

function showCampaignResult(): void {
  const doc = getDoc('campaignresult');
  if (!doc) return;
  const status = campaign.getObjectiveStatus();
  const allMet = campaign.checkAllObjectivesMet();

  setText(doc, 'cr-title', allMet ? '✅ STAGE COMPLETE!' : '❌ STAGE FAILED');
  setText(doc, 'cr-stage', campaign.activeStage?.name || '');

  for (let i = 0; i < 3; i++) {
    if (i < status.length) {
      const s = status[i];
      const icon = s.met ? '✅' : '❌';
      setText(doc, `cr-obj-${i}`, icon + ' ' + s.description + ' (' + s.progress + '/' + s.target + ')');
    } else {
      setText(doc, `cr-obj-${i}`, '');
    }
  }

  if (allMet) {
    const reward = campaign.completeStage();
    if (reward) {
      gsm.totalTickets += reward.ticketReward;
      setText(doc, 'cr-reward', '🎫 +' + reward.ticketReward + ' Tickets!');
      if (reward.bonusPrizeId) {
        const prize = PRIZE_TYPES.find(p => p.id === reward.bonusPrizeId);
        gsm.collection.add(reward.bonusPrizeId);
        fusion.addPrize(reward.bonusPrizeId);
        setText(doc, 'cr-bonus', '🏆 Bonus: ' + (prize?.name || reward.bonusPrizeId));
      } else {
        setText(doc, 'cr-bonus', '');
      }
      if (reward.seasonCompleted) {
        const seasonName = SEASONS[campaignSeasonView]?.name || 'Season';
        showToast('🏆 ' + seasonName + ' COMPLETED!');
        // Season achievements
        checkAchievement('season_1', campaignSeasonView === 0);
        checkAchievement('season_2', campaignSeasonView === 1);
        checkAchievement('season_3', campaignSeasonView === 2);
      }
      checkAchievement('campaign_start', true);
      checkAchievement('campaign_all', campaign.getTotalStagesCompleted() >= campaign.getTotalStages());
      gsm.save();
    }
  } else {
    setText(doc, 'cr-reward', 'Try again!');
    setText(doc, 'cr-bonus', '');
    // Reset the active stage so it can be retried
    campaign.activeStage = null;
    campaign.activeSeason = null;
  }
}

// ─── Fusion UI Updates ───────────────────────────────────
function updateFusionPanel(): void {
  const doc = getDoc('fusion');
  if (!doc) return;
  setText(doc, 'fuse-tickets', '🎫 Tickets: ' + gsm.totalTickets);
  setText(doc, 'fuse-total', 'Total Fusions: ' + fusion.inventory.totalFusions);
  const rarities = ['common', 'uncommon', 'rare', 'epic'];
  for (let i = 0; i < rarities.length; i++) {
    const count = fusion.getRarityCount(rarities[i], PRIZE_TYPES);
    setText(doc, `fuse-${rarities[i]}-count`, 'Available: ' + count);
  }
  setText(doc, 'fuse-result', '');
}

function performFusion(recipeIndex: number): void {
  const recipe = FUSION_RECIPES[recipeIndex];
  if (!recipe) return;
  if (!fusion.canFuse(recipe, PRIZE_TYPES, gsm.totalTickets)) {
    showToast('Not enough materials or tickets!');
    return;
  }
  const result = fusion.performFusion(recipe, PRIZE_TYPES);
  if (result) {
    gsm.totalTickets -= result.ticketCost;
    const produced = PRIZE_TYPES.find(p => p.id === result.produced);
    gsm.collection.add(result.produced);
    gsm.save();
    audio.achievementUnlock();
    particles.burst(new Vector3(0, machineBaseY + 0.5, -1.8), produced?.baseColor || '#aa44ff', 20, 2);
    shake.trigger(0.015, 0.3);
    const doc = getDoc('fusion');
    setText(doc, 'fuse-result', '✨ Created: ' + (produced?.name || '???') + '!');
    checkAchievement('first_fusion', true);
    checkAchievement('fusion_5', fusion.inventory.totalFusions >= 5);
    checkAchievement('collection_15', gsm.collection.size >= 15);
    checkAchievement('collection_20', gsm.collection.size >= 20);
    updateFusionPanel();
  }
}

// ─── Round 4 UI Update Methods ───────────────────────────
function updateProfilePanel(): void {
  const doc = getDoc('profile');
  if (!doc) return;
  const prog = progression.getXpProgress();
  setText(doc, 'profile-level', '⚡ Level ' + progression.level);
  setText(doc, 'profile-xp', 'XP: ' + prog.current + ' / ' + prog.needed);
  const barLen = 10;
  const filled = Math.round(barLen * prog.percent / 100);
  setText(doc, 'profile-bar', '[' + '█'.repeat(filled) + '░'.repeat(barLen - filled) + '] ' + prog.percent + '%');
  setText(doc, 'profile-total-xp', 'Total XP: ' + progression.totalXp);
  const skin = progression.getSkin();
  setText(doc, 'profile-skin', '🎨 Claw: ' + skin.name);
  setText(doc, 'profile-streak', '🔥 Daily Streak: ' + progression.dailyStreak + '/7');
  const modCount = progression.activeModifiers.size;
  setText(doc, 'profile-mods', modCount > 0 ? 'Active Modifiers: ' + modCount : 'No Modifiers Active');
  // Next reward
  const rewards = getLevelRewards();
  const next = rewards.find(r => r.level > progression.level);
  setText(doc, 'profile-next', next ? 'Next: Lv.' + next.level + ' — ' + next.description : 'MAX LEVEL');
}

function updateClawSkinsPanel(): void {
  const doc = getDoc('clawskins');
  if (!doc) return;
  const currentSkin = progression.getSkin();
  setText(doc, 'skins-current', 'Equipped: ' + currentSkin.name);
  for (let i = 0; i < CLAW_SKINS.length; i++) {
    const skin = CLAW_SKINS[i];
    const unlocked = progression.isSkinUnlocked(skin.id);
    const equipped = progression.selectedSkin === skin.id;
    setText(doc, `skin-name-${i}`, skin.name);
    if (equipped) {
      setText(doc, `skin-status-${i}`, '✅ EQUIPPED');
    } else if (unlocked) {
      setText(doc, `skin-status-${i}`, '▶ SELECT');
    } else {
      setText(doc, `skin-status-${i}`, '🔒 Level ' + skin.unlockLevel);
    }
  }
}

function selectClawSkin(index: number): void {
  const skin = CLAW_SKINS[index];
  if (!skin) return;
  if (progression.selectSkin(skin.id)) {
    audio.buttonClick();
    showToast('Equipped: ' + skin.name);
    updateClawSkinsPanel();
    // Rebuild claw with new skin colors
    buildMachine();
  } else {
    showToast('Unlock at Level ' + skin.unlockLevel);
  }
}

function updateModifiersPanel(): void {
  const doc = getDoc('modifiers');
  if (!doc) return;
  for (let i = 0; i < CHALLENGE_MODIFIERS.length; i++) {
    const mod = CHALLENGE_MODIFIERS[i];
    const active = progression.hasModifier(mod.id);
    setText(doc, `mod-label-${i}`, mod.icon + ' ' + mod.name + ' — ' + mod.ticketMultiplier + 'x tickets');
    setText(doc, `mod-status-${i}`, active ? '✅ ON' : '○ OFF');
  }
  const totalMult = progression.getTicketMultiplier();
  setText(doc, 'mods-total', 'Total Ticket Multiplier: ' + totalMult.toFixed(1) + 'x');
}

function toggleModifier(index: number): void {
  const mod = CHALLENGE_MODIFIERS[index];
  if (!mod) return;
  audio.buttonClick();
  const now = progression.toggleModifier(mod.id);
  showToast(mod.name + ': ' + (now ? 'ON' : 'OFF'));
  updateModifiersPanel();
}

function showLevelUpPanel(): void {
  const doc = getDoc('levelup');
  if (!doc) return;
  setText(doc, 'lvl-number', 'Level ' + progression.level);
  const rewards = progression.pendingLevelRewards;
  for (let i = 0; i < 3; i++) {
    if (i < rewards.length) {
      setText(doc, `lvl-reward-${i + 1}`, rewards[i].description);
      // Grant ticket rewards
      if (rewards[i].type === 'tickets') {
        gsm.totalTickets += rewards[i].value as number;
        gsm.save();
      }
    } else {
      setText(doc, `lvl-reward-${i + 1}`, '');
    }
  }
  if (rewards.length === 0) {
    setText(doc, 'lvl-reward-1', 'Keep climbing!');
  }
  progression.pendingLevelUp = false;
  progression.pendingLevelRewards = [];
  progression.save();

  // Celebration VFX
  spawnConfetti(new Vector3(0, machineBaseY + 0.6, -1.8), 25);
  shake.trigger(0.02, 0.4);
  audio.achievementUnlock();
}

function claimDailyReward(): void {
  const reward = progression.claimDailyReward();
  if (!reward) {
    showToast('Already claimed today!');
    return;
  }
  audio.achievementUnlock();
  gsm.totalTickets += reward.tickets;
  if (reward.xpBonus > 0) {
    progression.addXp(reward.xpBonus);
  }
  gsm.save();
  particles.burst(new Vector3(0, machineBaseY + 0.5, -1.8), '#ffdd00', 15, 1.5);
  shake.trigger(0.01, 0.2);
  showToast(reward.description);
  updateProfilePanel();
}

// ─── Round 5: Shop Functions ─────────────────────────────
function updateShopPanel(): void {
  const doc = getDoc('shop');
  if (!doc) return;
  setText(doc, 'shop-tickets', '🎫 Tickets: ' + gsm.totalTickets);
  for (let i = 0; i < SHOP_ITEMS.length; i++) {
    const item = SHOP_ITEMS[i];
    const count = shop.getCount(item.id);
    const canBuy = shop.canBuy(item, gsm.totalTickets);
    const label = item.icon + ' ' + item.name + (item.stackable ? ' (' + count + '/' + item.maxStack + ')' : (count > 0 ? ' ✅' : ''));
    setText(doc, `shop-item-${i}`, label);
    setText(doc, `shop-cost-${i}`, canBuy ? item.cost + ' 🎫' : (count >= item.maxStack ? 'MAX' : '---'));
  }
  setText(doc, 'shop-result', '');
}

function buyShopItem(index: number): void {
  const item = SHOP_ITEMS[index];
  if (!item) return;
  if (!shop.canBuy(item, gsm.totalTickets)) {
    if ((shop.getCount(item.id) || 0) >= item.maxStack) {
      showToast('Already at max!');
    } else {
      showToast('Not enough tickets!');
    }
    return;
  }
  gsm.totalTickets -= item.cost;
  shop.buy(item);
  gsm.save();
  audio.buttonClick();
  particles.burst(new Vector3(0, machineBaseY + 0.5, -1.8), '#ffdd00', 10, 1);
  showToast('Purchased: ' + item.name);
  updateShopPanel();
  // Shop achievements
  checkAchievement('first_purchase', true);
  checkAchievement('shop_5', shop.totalPurchases >= 5);
}

// ─── Round 5: Lucky Wheel Functions ──────────────────────
function updateWheelPanel(): void {
  const doc = getDoc('wheel');
  if (!doc) return;
  setText(doc, 'wheel-tickets', '🎫 Tickets: ' + gsm.totalTickets);
  setText(doc, 'spin-label', wheel.canSpin(gsm.totalTickets) ? '🎰 SPIN! (10 🎫)' : '🎰 Need 10 🎫');
  setText(doc, 'wheel-spins', 'Spins: ' + wheel.state.totalSpins);
  setText(doc, 'wheel-won', 'Won: ' + wheel.state.totalTicketsWon + ' 🎫');
  setText(doc, 'wheel-jackpots', 'Jackpots: ' + wheel.state.jackpotCount);
  if (wheel.state.lastSpinResult && !wheel.isSpinning) {
    setText(doc, 'wheel-result', wheel.state.lastSpinResult);
  } else {
    setText(doc, 'wheel-result', '');
  }
  setText(doc, 'wheel-result-desc', '');
}

function spinWheel(): void {
  if (!wheel.canSpin(gsm.totalTickets)) {
    showToast('Need ' + WHEEL_COST + ' tickets!');
    return;
  }
  gsm.totalTickets -= WHEEL_COST;
  gsm.save();
  audio.buttonClick();

  const result = wheel.startSpin();
  setText(getDoc('wheel'), 'spin-label', '🎰 Spinning...');
  setText(getDoc('wheel'), 'wheel-result', '');
  setText(getDoc('wheel'), 'wheel-result-desc', '');

  // Simulate spin result after a brief delay
  setTimeout(() => {
    wheel.isSpinning = false;
    wheel.applyReward(result.reward);

    // Apply rewards
    switch (result.reward.type) {
      case 'tickets':
      case 'jackpot':
        gsm.totalTickets += result.reward.amount || 0;
        break;
      case 'xp':
        progression.addXp(result.reward.amount || 0);
        break;
      case 'prize': {
        // Random rare+ prize
        const rarePrizes = PRIZE_TYPES.filter(p => p.rarity === 'rare' || p.rarity === 'epic');
        const won = rarePrizes[Math.floor(Math.random() * rarePrizes.length)];
        if (won) {
          gsm.collection.add(won.id);
          fusion.addPrize(won.id);
        }
        break;
      }
      case 'powerup_token':
        // Give a free consumable power-up token
        shop.inventory.owned['starter_grip'] = (shop.inventory.owned['starter_grip'] || 0) + 1;
        shop.save();
        break;
    }
    gsm.save();

    // VFX
    if (result.reward.type === 'jackpot') {
      spawnConfetti(new Vector3(0, machineBaseY + 0.6, -1.8), 30);
      shake.trigger(0.03, 0.5);
      audio.achievementUnlock();
    } else {
      particles.burst(new Vector3(0, machineBaseY + 0.5, -1.8), result.color, 15, 1.2);
      shake.trigger(0.01, 0.2);
    }

    const doc = getDoc('wheel');
    setText(doc, 'wheel-result', result.icon + ' ' + result.label);
    setText(doc, 'wheel-result-desc', result.reward.description);
    setText(doc, 'spin-label', wheel.canSpin(gsm.totalTickets) ? '🎰 SPIN! (10 🎫)' : '🎰 Need 10 🎫');
    setText(doc, 'wheel-tickets', '🎫 Tickets: ' + gsm.totalTickets);
    setText(doc, 'wheel-spins', 'Spins: ' + wheel.state.totalSpins);
    setText(doc, 'wheel-won', 'Won: ' + wheel.state.totalTicketsWon + ' 🎫');
    setText(doc, 'wheel-jackpots', 'Jackpots: ' + wheel.state.jackpotCount);

    // Wheel achievements
    checkAchievement('first_spin', true);
    checkAchievement('spin_10', wheel.state.totalSpins >= 10);
    checkAchievement('jackpot_hit', wheel.state.jackpotCount > 0);
  }, 1500);
}

// ─── Round 5: Prestige Functions ─────────────────────────
function updatePrestigePanel(): void {
  const doc = getDoc('prestige');
  if (!doc) return;
  const star = prestige.getStar();
  const nextStar = prestige.getNextStar();

  if (star) {
    setText(doc, 'pres-current', star.icon + ' ' + star.name + ' (Prestige ' + prestige.state.level + ')');
    setText(doc, 'pres-star', star.icon);
  } else {
    setText(doc, 'pres-current', 'No Prestige Yet');
    setText(doc, 'pres-star', '');
  }

  setText(doc, 'pres-grab', 'Grab Bonus: +' + Math.round(prestige.getGrabBonus() * 100) + '%');
  setText(doc, 'pres-xp', 'XP Bonus: +' + Math.round(prestige.getXpBonus() * 100) + '%');
  setText(doc, 'pres-ticket', 'Ticket Bonus: +' + Math.round(prestige.getTicketBonus() * 100) + '%');

  if (nextStar) {
    setText(doc, 'pres-next-name', nextStar.icon + ' ' + nextStar.name);
    setText(doc, 'pres-next-bonus', '+' + Math.round(nextStar.grabBonus * 100) + '% grab, +' + Math.round(nextStar.xpBonus * 100) + '% XP, +' + Math.round(nextStar.ticketBonus * 100) + '% tickets');
  } else {
    setText(doc, 'pres-next-name', 'MAX PRESTIGE REACHED');
    setText(doc, 'pres-next-bonus', '');
  }

  const canDo = prestige.canPrestige(progression.level);
  if (canDo) {
    setText(doc, 'pres-btn-label', '⭐ PRESTIGE NOW!');
    setText(doc, 'pres-level-req', 'Level 50 reached — ready to prestige!');
  } else if (prestige.state.level >= 10) {
    setText(doc, 'pres-btn-label', '✨ MAX PRESTIGE');
    setText(doc, 'pres-level-req', 'Maximum prestige achieved!');
  } else {
    setText(doc, 'pres-btn-label', '⭐ PRESTIGE (Requires Lv.50)');
    setText(doc, 'pres-level-req', 'Current Level: ' + progression.level + ' / 50');
  }

  setText(doc, 'pres-stats', 'Total Prestiges: ' + prestige.state.totalPrestiges + ' | Highest Level: ' + prestige.state.highestLevel);
}

function performPrestige(): void {
  if (!prestige.canPrestige(progression.level)) {
    if (prestige.state.level >= 10) {
      showToast('Max prestige reached!');
    } else {
      showToast('Reach Level 50 first! (Lv.' + progression.level + ')');
    }
    return;
  }

  const star = prestige.prestige(progression.level);
  if (!star) return;

  // Reset progression (keep tickets, collection, achievements)
  progression.level = 1;
  progression.xp = 0;
  progression.selectedSkin = 'default';
  progression.unlockedSkins = new Set(['default']);
  progression.save();

  audio.achievementUnlock();
  spawnConfetti(new Vector3(0, machineBaseY + 0.6, -1.8), 40);
  shake.trigger(0.04, 0.6);
  showToast('✨ PRESTIGE: ' + star.name + '!');

  checkAchievement('first_prestige', true);
  checkAchievement('prestige_5', prestige.state.level >= 5);
  checkAchievement('prestige_max', prestige.state.level >= 10);

  updatePrestigePanel();
}

// ─── Round 6: Claw Frenzy Bonus Round ────────────────────
function startFrenzy(): void {
  frenzy.start();
  frenzyPending = false;
  // Rebuild machine with boosted prizes (only rare+ during frenzy)
  buildMachine();
  audio.achievementUnlock();
  spawnConfetti(new Vector3(0, machineBaseY + 0.6, -1.8), 20);
  shake.trigger(0.02, 0.4);
  showToast('⚡ CLAW FRENZY! ⚡');
  checkAchievement('first_frenzy', true);

  // Reset claw for frenzy
  gsm.clawPhase = 'idle';
  gsm.clawX = 0;
  gsm.clawZ = 0;
  gsm.clawY = gsm.machine.pitHeight / 2 + 0.1;
  gsm.clawGripping = false;
  gsm.grabbedPrize = null;
  gameStarted = true;

  // Start music for frenzy
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

  showState('frenzy');
  updateFrenzyHUD();
}

function updateFrenzyHUD(): void {
  const doc = getDoc('frenzy');
  if (!doc) return;
  setText(doc, 'frenzy-time', String(Math.ceil(frenzy.state.timeRemaining)));
  setText(doc, 'frenzy-grabs', String(frenzy.state.grabs));
  setText(doc, 'frenzy-tickets', String(frenzy.state.ticketsEarned));
}

function handleFrenzyGrab(prizeData: any): void {
  const tickets = frenzy.onGrab(prizeData.tickets);
  gsm.totalTickets += tickets;
  gsm.totalGrabs++;
  gsm.grabs++;
  gsm.score += prizeData.points * 2; // 2x score in frenzy

  const popPos = new Vector3(
    gsm.machine.pitWidth / 2 + 0.1,
    machineBaseY + 0.1,
    gsm.machine.pitDepth / 2 - 0.075,
  );
  const rarityColor = RARITY_COLORS[prizeData.rarity] || '#ffffff';
  spawnScorePopup('+' + (prizeData.points * 2), rarityColor, popPos);
  particles.burst(popPos.clone(), prizeData.baseColor, 15, 1.5);
  audio.prizeCollect();
  shake.trigger(0.015, 0.2);

  gsm.collection.add(prizeData.id);
  fusion.addPrize(prizeData.id);

  // XP during frenzy
  let xpAmount = (RARITY_XP[prizeData.rarity] || 10) * 2;
  xpAmount = Math.floor(xpAmount * (1 + prestige.getXpBonus()));
  progression.addXp(xpAmount);

  updateFrenzyHUD();
  updateHUD();
}

function endFrenzy(): void {
  const result = frenzy.end();
  music.stop();
  musicStarted = false;
  audio.gameOver();

  checkAchievement('frenzy_5_grabs', result.grabs >= 5);
  checkAchievement('frenzy_legend', result.grabs >= 8);
  checkAchievement('frenzy_master', frenzy.state.totalFrenzies >= 10);

  // Show frenzy result
  const doc = getDoc('frenzyresult');
  if (doc) {
    setText(doc, 'fr-grabs', String(result.grabs));
    setText(doc, 'fr-tickets', String(result.tickets));
    setText(doc, 'fr-best', 'Best: ' + frenzy.state.bestFrenzyGrabs + ' grabs');
    setText(doc, 'fr-total', 'Total frenzies: ' + frenzy.state.totalFrenzies);
  }

  gsm.save();
  showState('frenzy_result');
}

// ─── Round 6: Machine Skins Functions ────────────────────
function handleMachineSkinClick(index: number): void {
  const skin = MACHINE_SKINS[index];
  if (!skin) return;

  if (machineSkins.isUnlocked(skin.id)) {
    // Already unlocked — equip it
    machineSkins.equip(skin.id);
    audio.buttonClick();
    showToast('Equipped: ' + skin.name);
    buildMachine(); // Rebuild with new skin colors
    updateMachineSkinsPanel();
  } else {
    // Try to purchase
    const result = machineSkins.purchase(skin.id, gsm.totalTickets);
    if (result.success) {
      gsm.totalTickets -= result.cost;
      gsm.save();
      machineSkins.equip(skin.id);
      audio.achievementUnlock();
      particles.burst(new Vector3(0, machineBaseY + 0.5, -1.8), skin.glowColor, 20, 1.5);
      shake.trigger(0.015, 0.3);
      showToast('Unlocked: ' + skin.name + '!');
      checkAchievement('first_machine_skin', true);
      checkAchievement('all_machine_skins', machineSkins.unlockedSkins.size >= MACHINE_SKINS.length);
      checkAchievement('gold_machine', skin.id === 'gold');
      buildMachine();
      updateMachineSkinsPanel();
    } else {
      showToast('Need ' + skin.cost + ' tickets!');
    }
  }
}

function updateMachineSkinsPanel(): void {
  const doc = getDoc('machineskins');
  if (!doc) return;
  setText(doc, 'ms-tickets', '🎫 ' + gsm.totalTickets + ' tickets');
  for (let i = 0; i < MACHINE_SKINS.length; i++) {
    const skin = MACHINE_SKINS[i];
    const unlocked = machineSkins.isUnlocked(skin.id);
    const equipped = machineSkins.equippedSkin === skin.id;
    setText(doc, `ms-icon-${i}`, skin.icon);
    setText(doc, `ms-name-${i}`, skin.name);
    setText(doc, `ms-desc-${i}`, skin.desc);
    if (equipped) {
      setText(doc, `ms-status-${i}`, 'EQUIPPED');
    } else if (unlocked) {
      setText(doc, `ms-status-${i}`, '▶ SELECT');
    } else {
      setText(doc, `ms-status-${i}`, skin.cost + ' 🎫');
    }
  }
}

// ─── Round 6: Detailed Stats Functions ───────────────────
function updateDetailedStatsPanel(): void {
  const doc = getDoc('detailedstats');
  if (!doc) return;
  const modes = ['classic', 'timeattack', 'target', 'progressive', 'daily', 'marathon', 'precision', 'practice'];
  const modeNames = ['Classic', 'Time Attack', 'Target', 'Progressive', 'Daily', 'Marathon', 'Precision', 'Practice'];
  for (let i = 0; i < modes.length; i++) {
    const stat = modeStats.getModeStat(modes[i]);
    const acc = modeStats.getModeAccuracy(modes[i]);
    setText(doc, `ds-row-${i}-name`, modeNames[i]);
    setText(doc, `ds-row-${i}-games`, stat.gamesPlayed + ' gms');
    setText(doc, `ds-row-${i}-best`, 'Best: ' + stat.bestScore);
    setText(doc, `ds-row-${i}-acc`, acc + '%');
  }
  const topMode = modeStats.getTopMode();
  const topModeIdx = modes.indexOf(topMode);
  setText(doc, 'ds-top-mode', '⭐ Best mode: ' + (modeNames[topModeIdx] || 'Classic'));

  // Session history
  for (let i = 0; i < 5; i++) {
    const s = modeStats.sessionHistory[i];
    if (s) {
      setText(doc, `ds-h${i}`, s.mode.toUpperCase() + ' | ' + s.score + 'pts | ' + s.grabs + '/' + (s.grabs + s.misses) + ' (' + s.accuracy + '%) | ' + s.tickets + '🎫');
    } else {
      setText(doc, `ds-h${i}`, '—');
    }
  }
}

// ─── Round 7: Tournament Functions ───────────────────────
function updateTournamentPanel(): void {
  const doc = getDoc('tournament');
  if (!doc) return;

  const active = tournament.getActiveBracket();
  if (active) {
    setText(doc, 'tourn-status', 'Active: ' + active.icon + ' ' + active.name + ' — Round ' + (tournament.progress.currentRound + 1));
  } else {
    setText(doc, 'tourn-status', 'Choose a bracket to compete in');
  }

  for (let i = 0; i < TOURNAMENT_BRACKETS.length; i++) {
    const b = TOURNAMENT_BRACKETS[i];
    const unlocked = tournament.isBracketUnlocked(b.id);
    const completed = tournament.isBracketCompleted(b.id);
    setText(doc, `tb-${i}-name`, b.icon + ' ' + b.name);
    setText(doc, `tb-${i}-desc`, b.description);
    if (completed) {
      setText(doc, `tb-${i}-status`, '✅ COMPLETED — Replay?');
    } else if (unlocked) {
      setText(doc, `tb-${i}-status`, '▶ AVAILABLE — ' + b.rounds.length + ' rounds, ' + b.grandPrizeTickets + ' 🎫 grand prize');
    } else {
      setText(doc, `tb-${i}-status`, '🔒 Complete previous bracket first');
    }
  }

  setText(doc, 'tourn-wins', 'Tournament Wins: ' + tournament.progress.totalTournamentWins);
}

function startTournamentBracket(index: number): void {
  const bracket = TOURNAMENT_BRACKETS[index];
  if (!bracket) return;

  if (!tournament.isBracketUnlocked(bracket.id)) {
    showToast('Complete the previous bracket first!');
    return;
  }

  // If there's already an active tournament, check if it's the same one
  if (tournament.progress.activeBracketId && tournament.progress.activeBracketId !== bracket.id) {
    showToast('Abandon current tournament first');
    return;
  }

  audio.buttonClick();

  if (!tournament.progress.activeBracketId) {
    tournament.startBracket(bracket.id);
    checkAchievement('first_tournament', true);
  }

  updateTournamentRoundPanel();
  showState('tournament_round');
}

function updateTournamentRoundPanel(): void {
  const doc = getDoc('tournamentround');
  if (!doc) return;

  const bracket = tournament.getActiveBracket();
  const round = tournament.getCurrentRound();
  if (!bracket || !round) return;

  setText(doc, 'tr-bracket', bracket.icon + ' ' + bracket.name);
  setText(doc, 'tr-round', 'Round ' + (tournament.progress.currentRound + 1) + ' / ' + bracket.rounds.length);
  setText(doc, 'tr-name', round.name);

  const machine = MACHINES.find(m => m.id === round.machineId);
  setText(doc, 'tr-machine', 'Machine: ' + (machine?.name || round.machineId));
  setText(doc, 'tr-mode', 'Mode: ' + round.mode.toUpperCase() + ' | ' + round.difficulty.toUpperCase());
  setText(doc, 'tr-target', '🎯 Target: ' + round.targetScore + ' pts');
  setText(doc, 'tr-mods', round.modifiers.length > 0 ? '⚠️ Modifiers: ' + round.modifiers.join(', ') : 'No forced modifiers');
  setText(doc, 'tr-reward', 'Reward: ' + round.bonusTickets + ' 🎫');

  // Bracket visualization
  for (let i = 0; i < bracket.rounds.length; i++) {
    const r = bracket.rounds[i];
    let status = '';
    if (i < tournament.progress.currentRound) {
      const passed = tournament.progress.roundPassed[i];
      const score = tournament.progress.roundScores[i];
      status = passed ? '✅ ' + score + ' pts' : '❌ ' + score + ' pts';
    } else if (i === tournament.progress.currentRound) {
      status = '▶ CURRENT';
    } else {
      status = '○ Upcoming';
    }
    setText(doc, `tr-r${i}`, r.name + ': ' + status);
  }
}

function playTournamentRound(): void {
  const round = tournament.getCurrentRound();
  if (!round) return;

  audio.buttonClick();
  inTournamentGame = true;

  // Set machine, theme, mode, difficulty from tournament round
  const machineIdx = MACHINES.findIndex(m => m.id === round.machineId);
  if (machineIdx >= 0) gsm.machineIndex = machineIdx;
  const themeIdx = THEMES.findIndex(t => t.id === round.themeId);
  if (themeIdx >= 0) {
    gsm.themeIndex = themeIdx;
    rebuildTheme();
  }
  gsm.mode = round.mode;
  gsm.difficulty = round.difficulty;

  // Apply forced modifiers
  progression.activeModifiers.clear();
  for (const mod of round.modifiers) {
    progression.activeModifiers.add(mod);
  }

  startGame();
}

function showTournamentResult(score: number): void {
  const result = tournament.recordRoundResult(score);
  const round = tournament.progress.activeBracketId
    ? TOURNAMENT_BRACKETS.find(b => b.id === tournament.progress.activeBracketId)?.rounds[tournament.progress.currentRound - 1]
    : null;

  const doc = getDoc('tournamentresult');
  if (!doc) return;

  setText(doc, 'tres-score', 'Score: ' + score);

  if (result.tournamentComplete) {
    setText(doc, 'tres-title', '👑 TOURNAMENT WON!');
    setText(doc, 'tres-round', tournament.getActiveBracket()?.name || 'Tournament');
    setText(doc, 'tres-target', 'All rounds cleared!');
    setText(doc, 'tres-verdict', '🏆 CHAMPION!');
    setText(doc, 'tres-tickets', '+' + result.ticketsEarned + ' 🎫 (includes grand prize!)');
    setText(doc, 'tres-next', 'Congratulations!');
    spawnConfetti(new Vector3(0, machineBaseY + 0.6, -1.8), 40);
    shake.trigger(0.04, 0.6);
    audio.achievementUnlock();

    // Tournament completion achievements
    const bracket = TOURNAMENT_BRACKETS.find(b => tournament.progress.completedBrackets.includes(b.id) && b.id === tournament.progress.bestBracketId);
    if (bracket) {
      checkAchievement('rookie_champ', bracket.id === 'rookie' || tournament.progress.completedBrackets.includes('rookie'));
      checkAchievement('pro_champ', bracket.id === 'pro' || tournament.progress.completedBrackets.includes('pro'));
      checkAchievement('legend_champ', bracket.id === 'legend' || tournament.progress.completedBrackets.includes('legend'));
    }
    checkAchievement('tournament_3', tournament.progress.totalTournamentWins >= 3);
    checkAchievement('tournament_sweep', tournament.progress.completedBrackets.length >= 3);
  } else if (result.eliminated) {
    const lastRound = TOURNAMENT_BRACKETS.find(b =>
      b.rounds.some(r => r === round)
    )?.rounds[tournament.progress.roundScores.length - 1];
    setText(doc, 'tres-title', '❌ ELIMINATED');
    setText(doc, 'tres-round', lastRound?.name || 'Round');
    setText(doc, 'tres-target', 'Target: ' + (lastRound?.targetScore || '???'));
    setText(doc, 'tres-verdict', 'ELIMINATED');
    setText(doc, 'tres-tickets', 'Total earned: ' + result.ticketsEarned + ' 🎫');
    setText(doc, 'tres-next', 'Better luck next time!');
    shake.trigger(0.02, 0.3);
  } else {
    setText(doc, 'tres-title', '✅ ROUND CLEARED!');
    const prevRound = TOURNAMENT_BRACKETS.find(b => b.id === tournament.progress.activeBracketId)?.rounds[tournament.progress.currentRound - 1];
    setText(doc, 'tres-round', prevRound?.name || 'Round');
    setText(doc, 'tres-target', 'Target: ' + (prevRound?.targetScore || '???'));
    setText(doc, 'tres-verdict', 'PASSED!');
    setText(doc, 'tres-tickets', '+' + result.ticketsEarned + ' 🎫');
    const nextRound = tournament.getCurrentRound();
    setText(doc, 'tres-next', nextRound ? 'Next: ' + nextRound.name : '');
    particles.burst(new Vector3(0, machineBaseY + 0.5, -1.8), '#00ffcc', 20, 1.5);
    shake.trigger(0.015, 0.3);
  }

  gsm.totalTickets += result.ticketsEarned;
  gsm.save();
  showState('tournament_result');
}

function handleTournamentResultContinue(): void {
  audio.buttonClick();
  if (tournament.progress.activeBracketId) {
    // Continue to next round
    updateTournamentRoundPanel();
    showState('tournament_round');
  } else {
    // Tournament over (won or eliminated)
    updateTournamentPanel();
    showState('tournament');
  }
}

// ─── Round 7: Custom Challenge Functions ─────────────────
function updateCustomChallengePanel(): void {
  const doc = getDoc('customchallenge');
  if (!doc) return;

  // Update presets
  for (let i = 0; i < PRESET_CHALLENGES.length; i++) {
    const p = PRESET_CHALLENGES[i];
    const completed = customChallenge.history.completedCodes.includes(p.code);
    setText(doc, `cc-pre-${i}`, (completed ? '✅ ' : '') + p.name + ' — ' + p.description);
  }

  // Update builder
  const modes = customChallenge.getModes();
  const diffs = customChallenge.getDiffs();
  const machine = MACHINES[customChallenge.builderMachineIdx % MACHINES.length];
  setText(doc, 'cc-machine', machine.name);
  setText(doc, 'cc-mode', modes[customChallenge.builderModeIdx % modes.length].toUpperCase());
  setText(doc, 'cc-diff', diffs[customChallenge.builderDiffIdx % diffs.length].toUpperCase());
  setText(doc, 'cc-target', String(customChallenge.builderTargetScore));

  // Generate code preview
  const preview = customChallenge.buildChallenge();
  setText(doc, 'cc-code', 'Code: ' + preview.code);

  setText(doc, 'cc-stats', 'Games: ' + customChallenge.history.totalCustomGames + ' | Wins: ' + customChallenge.history.totalCustomWins);
}

function startPresetChallenge(index: number): void {
  const challenge = customChallenge.startPreset(index);
  if (!challenge) return;
  audio.buttonClick();
  launchCustomChallenge(challenge);
}

function startBuiltCustomChallenge(): void {
  audio.buttonClick();
  const challenge = customChallenge.startBuiltChallenge();
  checkAchievement('custom_creator', true);
  launchCustomChallenge(challenge);
}

function launchCustomChallenge(challenge: import('./customchallenge').CustomChallenge): void {
  inCustomGame = true;

  // Set up game from challenge config
  const machineIdx = MACHINES.findIndex(m => m.id === challenge.machineId);
  if (machineIdx >= 0) gsm.machineIndex = machineIdx;
  const themeIdx = THEMES.findIndex(t => t.id === challenge.themeId);
  if (themeIdx >= 0) {
    gsm.themeIndex = themeIdx;
    rebuildTheme();
  }
  gsm.mode = challenge.mode;
  gsm.difficulty = challenge.difficulty;

  // Apply forced modifiers
  progression.activeModifiers.clear();
  for (const mod of challenge.modifiers) {
    progression.activeModifiers.add(mod);
  }

  // Override attempts if specified
  if (challenge.attempts > 0) {
    gsm.maxAttempts = challenge.attempts;
  }

  // Override time limit if specified
  if (challenge.timeLimit > 0 && challenge.mode === 'timeattack') {
    gsm.timeRemaining = challenge.timeLimit;
  }

  startGame();

  // Show challenge info toast
  showToast('Challenge: ' + challenge.name);
}

function endCustomChallenge(score: number): void {
  const result = customChallenge.recordResult(score);
  inCustomGame = false;

  if (result.won) {
    showToast('✅ Challenge Complete! Target met!');
    checkAchievement('first_custom', true);
    checkAchievement('custom_5', customChallenge.history.totalCustomWins >= 5);
    // Check if all presets are done
    const allPresetsComplete = PRESET_CHALLENGES.every(p =>
      customChallenge.history.completedCodes.includes(p.code)
    );
    checkAchievement('preset_all', allPresetsComplete);
    particles.burst(new Vector3(0, machineBaseY + 0.5, -1.8), '#ff44ff', 20, 1.5);
  } else {
    showToast('❌ Challenge target not met');
  }
}

// ─── Legendary Celebration VFX ───────────────────────────
function spawnConfetti(pos: Vector3, count: number): void {
  const colors = ['#ff4444', '#ffdd00', '#00ff88', '#4488ff', '#ff00ff', '#00ffff', '#ffaa00'];
  for (let i = 0; i < count; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const mesh = new Mesh(
      new SphereGeometry(0.008, 4, 3),
      new MeshBasicMaterial({ color: new Color(color), transparent: true, opacity: 0.9, blending: AdditiveBlending }),
    );
    mesh.position.copy(pos);
    mesh.scale.set(1 + Math.random(), 0.3, 1 + Math.random());
    world.scene.add(mesh);
    confettiParticles.push({
      mesh,
      vel: new Vector3(
        (Math.random() - 0.5) * 2,
        1.5 + Math.random() * 2,
        (Math.random() - 0.5) * 2,
      ),
      life: 2 + Math.random(),
      spin: (Math.random() - 0.5) * 10,
    });
  }
}

function updateConfetti(dt: number): void {
  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const c = confettiParticles[i];
    c.life -= dt;
    if (c.life <= 0) {
      world.scene.remove(c.mesh);
      confettiParticles.splice(i, 1);
      continue;
    }
    c.vel.y -= 2.5 * dt; // gravity
    c.mesh.position.addScaledVector(c.vel, dt);
    c.mesh.rotation.z += c.spin * dt;
    const frac = Math.min(1, c.life / 0.5);
    (c.mesh.material as MeshBasicMaterial).opacity = frac * 0.9;
  }
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
function handleFrenzyInput(dt: number): void {
  if (!frenzy.state.active) return;

  const kb = (world.input as any).keyboard;
  let dx = 0, dz = 0;
  if (kb.getKeyPressed('KeyW') || kb.getKeyPressed('ArrowUp')) dz = -1;
  if (kb.getKeyPressed('KeyS') || kb.getKeyPressed('ArrowDown')) dz = 1;
  if (kb.getKeyPressed('KeyA') || kb.getKeyPressed('ArrowLeft')) dx = -1;
  if (kb.getKeyPressed('KeyD') || kb.getKeyPressed('ArrowRight')) dx = 1;

  if (dx !== 0 || dz !== 0) moveClaw(dx, dz, dt);
  else if (gsm.clawPhase === 'positioning') gsm.clawPhase = 'idle';

  if (kb.getKeyDown('Space')) dropClaw();

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
          if (Math.abs(tx) > 0.15 || Math.abs(tz) > 0.15) moveClaw(tx, tz, dt);
        }
      }
      if (rightPad?.gamepad?.buttons?.[0]?.pressed) dropClaw();
    }
  } catch {}
}

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

  // Frenzy input (same as regular, but during frenzy state)
  if (gsm.state === 'frenzy' as any) {
    handleFrenzyInput(dt);
  }

  // Claw physics
  if (gsm.state === 'playing' || gsm.state === 'grabbing' || gsm.state === 'dropping' || gsm.state === ('frenzy' as any)) {
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

  // Frenzy timer update
  if (gsm.state === ('frenzy' as any) && frenzy.state.active) {
    const ended = frenzy.update(dt);
    updateFrenzyHUD();

    // Respawn prizes during frenzy
    if (frenzy.shouldRespawnPrizes()) {
      // Add more prizes to the pit
      const activePrizes = prizeMeshes.filter(p => (p as any)._active !== false);
      if (activePrizes.length < 8) {
        buildMachine();
      }
    }

    if (ended) {
      endFrenzy();
    }
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
    updateClawShadow(clawShadow, gsm.clawX, gsm.clawZ, floorY, (gsm.state === 'playing' || gsm.state === ('frenzy' as any)) && gsm.clawPhase !== 'returning', time);
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

    // X-Ray power-up OR Prize Scanner boost: show rarity glow halo on prizes
    if ((powerups.has('x_ray') || shop.hasBoost('prize_scanner')) && data._prizeData) {
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
  if (gsm.state === 'playing' || gsm.state === ('frenzy' as any)) {
    powerups.update(dt);
    updatePowerUpHUD();

    // Check power-up collection
    checkPowerUpCollection();

    // Spawn new power-up orbs periodically
    if (!progression.hasModifier('no_powerups') && powerups.shouldSpawn() && gsm.clawPhase === 'idle') {
      spawnPowerUpOrb();
    }
  }

  // Power bar update
  if (gsm.state === 'playing' || gsm.state === ('frenzy' as any)) {
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

  // Confetti particles
  updateConfetti(dt);

  // Legendary celebration timer
  if (legendaryGrabCelebration > 0) {
    legendaryGrabCelebration -= dt;
  }
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

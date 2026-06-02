// types.ts — Core types, constants, themes, prizes, achievements, state management

// ─── Game States ─────────────────────────────────────────
export type GameState = 'title' | 'modeselect' | 'difficulty' | 'playing' | 'grabbing' | 'dropping' |
  'result' | 'gameover' | 'paused' | 'leaderboard' | 'achievements' | 'settings' | 'help' |
  'collection' | 'stats' | 'machines';

export type GameMode = 'classic' | 'timeattack' | 'target' | 'progressive' | 'daily' | 'practice' | 'marathon' | 'precision';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ClawPhase = 'idle' | 'positioning' | 'descending' | 'closing' | 'ascending' | 'returning' | 'releasing';

// ─── Prize Types ─────────────────────────────────────────
export interface PrizeType {
  id: string;
  name: string;
  shape: 'cube' | 'sphere' | 'cylinder' | 'diamond' | 'star' | 'capsule';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  weight: number;      // 0-1, affects grab difficulty
  size: number;        // scale multiplier
  baseColor: string;
  emissiveColor: string;
  points: number;
  tickets: number;
}

export const PRIZE_TYPES: PrizeType[] = [
  { id: 'cube_cyan', name: 'Neon Cube', shape: 'cube', rarity: 'common', weight: 0.3, size: 1.0, baseColor: '#00ffff', emissiveColor: '#004444', points: 100, tickets: 1 },
  { id: 'sphere_pink', name: 'Plasma Orb', shape: 'sphere', rarity: 'common', weight: 0.2, size: 0.9, baseColor: '#ff00ff', emissiveColor: '#440044', points: 100, tickets: 1 },
  { id: 'cylinder_green', name: 'Energy Cell', shape: 'cylinder', rarity: 'common', weight: 0.35, size: 1.0, baseColor: '#00ff88', emissiveColor: '#004422', points: 100, tickets: 1 },
  { id: 'cube_orange', name: 'Solar Block', shape: 'cube', rarity: 'uncommon', weight: 0.4, size: 1.1, baseColor: '#ff8800', emissiveColor: '#442200', points: 200, tickets: 2 },
  { id: 'sphere_blue', name: 'Void Pearl', shape: 'sphere', rarity: 'uncommon', weight: 0.25, size: 0.85, baseColor: '#4488ff', emissiveColor: '#112244', points: 200, tickets: 2 },
  { id: 'diamond_purple', name: 'Prism Gem', shape: 'diamond', rarity: 'uncommon', weight: 0.45, size: 1.0, baseColor: '#aa44ff', emissiveColor: '#220044', points: 250, tickets: 3 },
  { id: 'star_gold', name: 'Lucky Star', shape: 'star', rarity: 'rare', weight: 0.5, size: 1.2, baseColor: '#ffdd00', emissiveColor: '#443300', points: 500, tickets: 5 },
  { id: 'capsule_red', name: 'Inferno Pod', shape: 'capsule', rarity: 'rare', weight: 0.55, size: 1.0, baseColor: '#ff2244', emissiveColor: '#440011', points: 500, tickets: 5 },
  { id: 'diamond_white', name: 'Cryo Diamond', shape: 'diamond', rarity: 'rare', weight: 0.6, size: 1.1, baseColor: '#ccddff', emissiveColor: '#334466', points: 500, tickets: 5 },
  { id: 'star_rainbow', name: 'Prismatic Star', shape: 'star', rarity: 'epic', weight: 0.7, size: 1.3, baseColor: '#ff44ff', emissiveColor: '#442244', points: 1000, tickets: 10 },
  { id: 'sphere_black', name: 'Singularity', shape: 'sphere', rarity: 'epic', weight: 0.75, size: 1.0, baseColor: '#222233', emissiveColor: '#8800ff', points: 1000, tickets: 10 },
  { id: 'cube_holo', name: 'Hologram Cube', shape: 'cube', rarity: 'epic', weight: 0.65, size: 1.2, baseColor: '#44ffdd', emissiveColor: '#114433', points: 1000, tickets: 10 },
  { id: 'diamond_legendary', name: 'Quantum Core', shape: 'diamond', rarity: 'legendary', weight: 0.85, size: 1.4, baseColor: '#ffffff', emissiveColor: '#ff8800', points: 2500, tickets: 25 },
  { id: 'star_legendary', name: 'Supernova', shape: 'star', rarity: 'legendary', weight: 0.9, size: 1.5, baseColor: '#ffaa00', emissiveColor: '#ff4400', points: 2500, tickets: 25 },
];

export const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa', uncommon: '#00ff88', rare: '#4488ff', epic: '#aa44ff', legendary: '#ffaa00',
};

// ─── Machine Types ───────────────────────────────────────
export interface MachineConfig {
  id: string;
  name: string;
  pitWidth: number;
  pitDepth: number;
  pitHeight: number;
  prizeCount: number;
  clawStrength: number;   // 0-1 base grip
  clawSpeed: number;      // movement speed multiplier
  dropSpeed: number;      // descent speed
  prizePool: string[];    // prize type IDs available
}

export const MACHINES: MachineConfig[] = [
  {
    id: 'starter', name: 'Neon Starter', pitWidth: 1.2, pitDepth: 1.2, pitHeight: 0.8,
    prizeCount: 12, clawStrength: 0.7, clawSpeed: 1.0, dropSpeed: 1.0,
    prizePool: ['cube_cyan', 'sphere_pink', 'cylinder_green', 'cube_orange', 'sphere_blue'],
  },
  {
    id: 'deluxe', name: 'Deluxe Grabber', pitWidth: 1.5, pitDepth: 1.5, pitHeight: 1.0,
    prizeCount: 18, clawStrength: 0.6, clawSpeed: 0.9, dropSpeed: 1.1,
    prizePool: ['cube_orange', 'sphere_blue', 'diamond_purple', 'star_gold', 'capsule_red'],
  },
  {
    id: 'premium', name: 'Premium Vault', pitWidth: 1.8, pitDepth: 1.8, pitHeight: 1.2,
    prizeCount: 24, clawStrength: 0.5, clawSpeed: 0.8, dropSpeed: 1.2,
    prizePool: ['star_gold', 'capsule_red', 'diamond_white', 'star_rainbow', 'sphere_black', 'cube_holo'],
  },
  {
    id: 'legendary', name: 'Quantum Chamber', pitWidth: 2.0, pitDepth: 2.0, pitHeight: 1.4,
    prizeCount: 30, clawStrength: 0.4, clawSpeed: 0.7, dropSpeed: 1.3,
    prizePool: ['star_rainbow', 'sphere_black', 'cube_holo', 'diamond_legendary', 'star_legendary'],
  },
];

// ─── Arena Themes ────────────────────────────────────────
export interface ArenaTheme {
  id: string;
  name: string;
  grid: string;
  accent: string;
  machine: string;
  claw: string;
  glass: string;
  glow: string;
  fog: string;
  bg: string;
}

export const THEMES: ArenaTheme[] = [
  { id: 'holodeck', name: 'Neon Holodeck', grid: '#00ffff', accent: '#ff00ff', machine: '#003344', claw: '#00ffff', glass: '#00ffff', glow: '#00aacc', fog: '#001122', bg: '#000811' },
  { id: 'crimson', name: 'Crimson Arcade', grid: '#ff4444', accent: '#ffaa00', machine: '#440000', claw: '#ff4444', glass: '#ff4444', glow: '#cc2222', fog: '#110000', bg: '#0a0000' },
  { id: 'toxic', name: 'Toxic Neon', grid: '#00ff44', accent: '#88ff00', machine: '#003300', claw: '#00ff44', glass: '#00ff44', glow: '#00cc22', fog: '#001100', bg: '#000a00' },
  { id: 'ultraviolet', name: 'Ultra Violet', grid: '#8844ff', accent: '#ff44aa', machine: '#220044', claw: '#8844ff', glass: '#8844ff', glow: '#6622cc', fog: '#0a0022', bg: '#050011' },
  { id: 'solar', name: 'Solar Blaze', grid: '#ff8800', accent: '#ffdd00', machine: '#442200', claw: '#ff8800', glass: '#ff8800', glow: '#cc6600', fog: '#110800', bg: '#0a0400' },
];

// ─── Achievements ────────────────────────────────────────
export interface Achievement {
  id: string;
  name: string;
  desc: string;
  unlocked: boolean;
}

export function getDefaultAchievements(): Achievement[] {
  return [
    { id: 'first_grab', name: 'First Catch', desc: 'Grab your first prize', unlocked: false },
    { id: 'ten_grabs', name: 'Getting Good', desc: 'Grab 10 prizes total', unlocked: false },
    { id: 'fifty_grabs', name: 'Claw Master', desc: 'Grab 50 prizes total', unlocked: false },
    { id: 'hundred_grabs', name: 'Prize Hoarder', desc: 'Grab 100 prizes total', unlocked: false },
    { id: 'perfect_round', name: 'Perfect Round', desc: 'Grab every attempt in a game', unlocked: false },
    { id: 'score_1k', name: 'Thousand Club', desc: 'Score 1,000+ in a single game', unlocked: false },
    { id: 'score_5k', name: 'High Roller', desc: 'Score 5,000+ in a single game', unlocked: false },
    { id: 'score_10k', name: 'Grand Master', desc: 'Score 10,000+ in a single game', unlocked: false },
    { id: 'rare_grab', name: 'Rare Find', desc: 'Grab a rare prize', unlocked: false },
    { id: 'epic_grab', name: 'Epic Catch', desc: 'Grab an epic prize', unlocked: false },
    { id: 'legendary_grab', name: 'Legendary Pull', desc: 'Grab a legendary prize', unlocked: false },
    { id: 'streak_3', name: 'Hot Streak', desc: '3 grabs in a row', unlocked: false },
    { id: 'streak_5', name: 'On Fire', desc: '5 grabs in a row', unlocked: false },
    { id: 'combo_x3', name: 'Triple Combo', desc: 'Reach x3 combo multiplier', unlocked: false },
    { id: 'combo_x5', name: 'Mega Combo', desc: 'Reach x5 combo multiplier', unlocked: false },
    { id: 'target_perfect', name: 'Bullseye', desc: 'Hit all targets in Target mode', unlocked: false },
    { id: 'daily_done', name: 'Daily Player', desc: 'Complete a Daily Challenge', unlocked: false },
    { id: 'marathon_10', name: 'Marathon Runner', desc: 'Grab 10+ in Marathon mode', unlocked: false },
    { id: 'collection_10', name: 'Collector', desc: 'Collect 10 different prize types', unlocked: false },
    { id: 'collection_all', name: 'Completionist', desc: 'Collect all prize types', unlocked: false },
    { id: 'precision_3', name: 'Sharpshooter', desc: '3 precision grabs in a row', unlocked: false },
    { id: 'theme_explorer', name: 'Theme Explorer', desc: 'Try all arena themes', unlocked: false },
    { id: 'machine_all', name: 'Machine Master', desc: 'Play all machine types', unlocked: false },
    { id: 'tickets_100', name: 'Ticket Hoarder', desc: 'Earn 100 tickets total', unlocked: false },
    { id: 'tickets_500', name: 'Ticket Baron', desc: 'Earn 500 tickets total', unlocked: false },
    { id: 'speed_grab', name: 'Speed Demon', desc: 'Grab a prize in under 3 seconds', unlocked: false },
    { id: 'time_attack_5', name: 'Rapid Grabber', desc: '5+ grabs in Time Attack', unlocked: false },
    { id: 'progressive_5', name: 'Survivor', desc: 'Reach round 5 in Progressive', unlocked: false },
    { id: 'no_miss', name: 'No Whiff', desc: 'Complete a full game with no misses', unlocked: false },
    { id: 'games_25', name: 'Regular', desc: 'Play 25 games', unlocked: false },
  ];
}

// ─── State Manager ───────────────────────────────────────
export class GameStateManager {
  state: GameState = 'title';
  mode: GameMode = 'classic';
  difficulty: Difficulty = 'medium';
  machineIndex: number = 0;
  themeIndex: number = 0;

  // Game session
  score: number = 0;
  grabs: number = 0;
  misses: number = 0;
  attempts: number = 0;
  maxAttempts: number = 5;
  streak: number = 0;
  bestStreak: number = 0;
  combo: number = 1;
  comboTimer: number = 0;
  timeRemaining: number = 0;
  progressiveRound: number = 1;
  targetPrizeId: string = '';
  targetHits: number = 0;
  targetTotal: number = 3;
  ticketsEarned: number = 0;
  grabStartTime: number = 0;

  // Claw
  clawPhase: ClawPhase = 'idle';
  clawX: number = 0;
  clawZ: number = 0;
  clawY: number = 0;
  clawTargetY: number = 0;
  clawGripping: boolean = false;
  grabbedPrize: any = null;

  // Persistence
  achievements: Achievement[] = getDefaultAchievements();
  leaderboard: any[] = [];
  collection: Set<string> = new Set();
  totalGrabs: number = 0;
  totalMisses: number = 0;
  totalScore: number = 0;
  totalTickets: number = 0;
  totalGames: number = 0;
  bestScore: number = 0;
  bestStreak_career: number = 0;
  themesUsed: Set<string> = new Set();
  machinesUsed: Set<string> = new Set();

  constructor() { this.load(); }

  get machine(): MachineConfig { return MACHINES[this.machineIndex]; }
  get theme(): ArenaTheme { return THEMES[this.themeIndex]; }

  save(): void {
    try {
      localStorage.setItem('neon-claw-achievements', JSON.stringify(this.achievements));
      localStorage.setItem('neon-claw-leaderboard', JSON.stringify(this.leaderboard));
      localStorage.setItem('neon-claw-collection', JSON.stringify([...this.collection]));
      localStorage.setItem('neon-claw-stats', JSON.stringify({
        totalGrabs: this.totalGrabs, totalMisses: this.totalMisses, totalScore: this.totalScore,
        totalTickets: this.totalTickets, totalGames: this.totalGames, bestScore: this.bestScore,
        bestStreak: this.bestStreak_career, themeIndex: this.themeIndex,
        themesUsed: [...this.themesUsed], machinesUsed: [...this.machinesUsed],
      }));
    } catch {}
  }

  load(): void {
    try {
      const a = localStorage.getItem('neon-claw-achievements');
      if (a) {
        const saved = JSON.parse(a) as Achievement[];
        const defaults = getDefaultAchievements();
        this.achievements = defaults.map(d => {
          const s = saved.find(x => x.id === d.id);
          return s ? { ...d, unlocked: s.unlocked } : d;
        });
      }
      const lb = localStorage.getItem('neon-claw-leaderboard');
      if (lb) this.leaderboard = JSON.parse(lb);
      const c = localStorage.getItem('neon-claw-collection');
      if (c) this.collection = new Set(JSON.parse(c));
      const st = localStorage.getItem('neon-claw-stats');
      if (st) {
        const s = JSON.parse(st);
        this.totalGrabs = s.totalGrabs || 0;
        this.totalMisses = s.totalMisses || 0;
        this.totalScore = s.totalScore || 0;
        this.totalTickets = s.totalTickets || 0;
        this.totalGames = s.totalGames || 0;
        this.bestScore = s.bestScore || 0;
        this.bestStreak_career = s.bestStreak || 0;
        this.themeIndex = s.themeIndex || 0;
        this.themesUsed = new Set(s.themesUsed || []);
        this.machinesUsed = new Set(s.machinesUsed || []);
      }
    } catch {}
  }

  resetSession(): void {
    this.score = 0; this.grabs = 0; this.misses = 0; this.attempts = 0;
    this.streak = 0; this.bestStreak = 0; this.combo = 1; this.comboTimer = 0;
    this.ticketsEarned = 0; this.progressiveRound = 1;
    this.targetHits = 0; this.clawPhase = 'idle'; this.grabbedPrize = null;
  }

  addToLeaderboard(entry: any): void {
    this.leaderboard.push(entry);
    this.leaderboard.sort((a: any, b: any) => b.score - a.score);
    if (this.leaderboard.length > 20) this.leaderboard = this.leaderboard.slice(0, 20);
    this.save();
  }

  unlockAchievement(id: string): boolean {
    const a = this.achievements.find(x => x.id === id);
    if (a && !a.unlocked) { a.unlocked = true; this.save(); return true; }
    return false;
  }
}

// ─── Seeded RNG for Daily Challenges ─────────────────────
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

export function getDailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

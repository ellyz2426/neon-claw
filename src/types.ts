// types.ts — Core types, constants, themes, prizes, achievements, state management

// ─── Game States ─────────────────────────────────────────
export type GameState = 'title' | 'modeselect' | 'difficulty' | 'playing' | 'grabbing' | 'dropping' |
  'result' | 'gameover' | 'paused' | 'leaderboard' | 'achievements' | 'settings' | 'help' |
  'collection' | 'stats' | 'machines' | 'showcase' | 'campaign' | 'campaign_stage' | 'fusion' | 'campaign_result' |
  'profile' | 'clawskins' | 'modifiers' | 'levelup' | 'shop' | 'wheel' | 'prestige' |
  'frenzy' | 'frenzy_result' | 'machineskins' | 'detailedstats' |
  'tournament' | 'tournament_round' | 'tournament_result' | 'customchallenge';

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
  // Round 3 prizes
  { id: 'capsule_frost', name: 'Frost Capsule', shape: 'capsule', rarity: 'uncommon', weight: 0.35, size: 1.0, baseColor: '#88ddff', emissiveColor: '#224466', points: 200, tickets: 2 },
  { id: 'cube_shadow', name: 'Shadow Cube', shape: 'cube', rarity: 'rare', weight: 0.55, size: 1.1, baseColor: '#334455', emissiveColor: '#6622aa', points: 500, tickets: 5 },
  { id: 'sphere_nova', name: 'Nova Sphere', shape: 'sphere', rarity: 'rare', weight: 0.5, size: 1.0, baseColor: '#ff6644', emissiveColor: '#cc3311', points: 500, tickets: 5 },
  { id: 'diamond_aurora', name: 'Aurora Gem', shape: 'diamond', rarity: 'epic', weight: 0.7, size: 1.2, baseColor: '#44ffaa', emissiveColor: '#118844', points: 1000, tickets: 10 },
  { id: 'star_cosmic', name: 'Cosmic Star', shape: 'star', rarity: 'epic', weight: 0.72, size: 1.25, baseColor: '#6688ff', emissiveColor: '#2244aa', points: 1000, tickets: 10 },
  { id: 'cylinder_titan', name: 'Titan Core', shape: 'cylinder', rarity: 'legendary', weight: 0.88, size: 1.4, baseColor: '#ff4488', emissiveColor: '#aa1144', points: 2500, tickets: 25 },
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
  {
    id: 'tower', name: 'Neon Tower', pitWidth: 1.0, pitDepth: 1.0, pitHeight: 1.8,
    prizeCount: 15, clawStrength: 0.55, clawSpeed: 1.1, dropSpeed: 0.9,
    prizePool: ['capsule_frost', 'cube_shadow', 'sphere_nova', 'diamond_aurora', 'star_cosmic'],
  },
  {
    id: 'void', name: 'Void Arena', pitWidth: 2.2, pitDepth: 2.2, pitHeight: 1.0,
    prizeCount: 35, clawStrength: 0.45, clawSpeed: 0.65, dropSpeed: 1.4,
    prizePool: ['diamond_aurora', 'star_cosmic', 'cylinder_titan', 'diamond_legendary', 'star_legendary'],
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
    // Round 2 achievements
    { id: 'first_powerup', name: 'Powered Up', desc: 'Collect your first power-up', unlocked: false },
    { id: 'powerup_5', name: 'Power Hoarder', desc: 'Collect 5 power-ups total', unlocked: false },
    { id: 'powerup_collector', name: 'Power Maniac', desc: 'Collect 15 power-ups total', unlocked: false },
    { id: 'score_25k', name: 'Score Legend', desc: 'Score 25,000+ in a single game', unlocked: false },
    { id: 'streak_10', name: 'Unstoppable', desc: '10 grabs in a row', unlocked: false },
    { id: 'games_50', name: 'Dedicated', desc: 'Play 50 games', unlocked: false },
    { id: 'marathon_master', name: 'Marathon Master', desc: '25+ grabs in Marathon mode', unlocked: false },
    { id: 'precision_ace', name: 'Precision Ace', desc: 'Perfect 3/3 in Precision mode', unlocked: false },
    { id: 'tickets_1000', name: 'Ticket Mogul', desc: 'Earn 1,000 tickets total', unlocked: false },
    { id: 'legendary_5', name: 'Legendary Hunter', desc: 'Grab 5 legendary prizes total', unlocked: false },
    // Round 3 achievements
    { id: 'campaign_start', name: 'Adventurer', desc: 'Complete your first campaign stage', unlocked: false },
    { id: 'season_1', name: 'Neon Graduate', desc: 'Complete Neon Origins season', unlocked: false },
    { id: 'season_2', name: 'Crimson Victor', desc: 'Complete Crimson Gauntlet season', unlocked: false },
    { id: 'season_3', name: 'Quantum Ascended', desc: 'Complete Quantum Ascent season', unlocked: false },
    { id: 'campaign_all', name: 'Campaign Legend', desc: 'Complete all campaign stages', unlocked: false },
    { id: 'first_fusion', name: 'Alchemist', desc: 'Perform your first prize fusion', unlocked: false },
    { id: 'fusion_5', name: 'Fusion Master', desc: 'Perform 5 prize fusions', unlocked: false },
    { id: 'collection_15', name: 'Curator', desc: 'Collect 15 different prize types', unlocked: false },
    { id: 'collection_20', name: 'Grand Curator', desc: 'Collect all 20 prize types', unlocked: false },
    { id: 'tower_clear', name: 'Tower Climber', desc: 'Clear Neon Tower machine', unlocked: false },
    { id: 'void_grab', name: 'Void Walker', desc: 'Grab a prize from Void Arena', unlocked: false },
    // Round 4 achievements — Progression
    { id: 'level_5', name: 'Rising Star', desc: 'Reach Level 5', unlocked: false },
    { id: 'level_10', name: 'Seasoned Pro', desc: 'Reach Level 10', unlocked: false },
    { id: 'level_25', name: 'Elite Operator', desc: 'Reach Level 25', unlocked: false },
    { id: 'level_50', name: 'Grandmaster', desc: 'Reach Level 50', unlocked: false },
    { id: 'first_skin', name: 'Fashion Forward', desc: 'Unlock your first claw skin', unlocked: false },
    { id: 'all_skins', name: 'Skin Collector', desc: 'Unlock all claw skins', unlocked: false },
    { id: 'xp_1k', name: 'XP Hunter', desc: 'Earn 1,000 total XP', unlocked: false },
    { id: 'xp_10k', name: 'XP Legend', desc: 'Earn 10,000 total XP', unlocked: false },
    { id: 'daily_3', name: 'Hat Trick', desc: '3-day login streak', unlocked: false },
    { id: 'daily_7', name: 'Weekly Warrior', desc: '7-day login streak', unlocked: false },
    { id: 'modifier_1', name: 'Challenger', desc: 'Complete a game with a modifier active', unlocked: false },
    { id: 'modifier_3', name: 'Daredevil', desc: 'Complete a game with 3+ modifiers active', unlocked: false },
    { id: 'modifier_all', name: 'Masochist', desc: 'Complete a game with all 5 modifiers active', unlocked: false },
    { id: 'turbo_grab', name: 'Lightning Grab', desc: 'Grab a prize with Turbo Speed active', unlocked: false },
    { id: 'mirror_grab', name: 'Mirror Master', desc: 'Grab a prize with Mirror Controls active', unlocked: false },
    { id: 'weak_legendary', name: 'Against All Odds', desc: 'Grab a legendary prize with Weak Grip active', unlocked: false },
    { id: 'tickets_2k', name: 'Ticket Tycoon', desc: 'Earn 2,000 tickets total', unlocked: false },
    { id: 'games_100', name: 'Arcade Veteran', desc: 'Play 100 games', unlocked: false },
    { id: 'score_50k', name: 'Score Titan', desc: 'Score 50,000+ in a single game', unlocked: false },
    { id: 'total_score_100k', name: 'Lifetime Legend', desc: 'Earn 100,000 total score', unlocked: false },
    // Round 5 achievements — Shop, Wheel, Prestige
    { id: 'first_purchase', name: 'Shopkeeper', desc: 'Buy your first shop item', unlocked: false },
    { id: 'shop_5', name: 'Big Spender', desc: 'Make 5 shop purchases', unlocked: false },
    { id: 'first_spin', name: 'Lucky Spinner', desc: 'Spin the Lucky Wheel', unlocked: false },
    { id: 'spin_10', name: 'Wheel Addict', desc: 'Spin the wheel 10 times', unlocked: false },
    { id: 'jackpot_hit', name: 'Jackpot!', desc: 'Hit the Lucky Wheel jackpot', unlocked: false },
    { id: 'first_prestige', name: 'Ascended', desc: 'Prestige for the first time', unlocked: false },
    { id: 'prestige_5', name: 'Diamond Ascension', desc: 'Reach Prestige 5', unlocked: false },
    { id: 'prestige_max', name: 'Cosmic Ascension', desc: 'Reach maximum Prestige', unlocked: false },
    // Round 6 achievements — Frenzy, Machine Skins, Milestones
    { id: 'first_frenzy', name: 'Frenzy Time!', desc: 'Trigger your first Claw Frenzy', unlocked: false },
    { id: 'frenzy_5_grabs', name: 'Frenzy Fiend', desc: 'Grab 5+ prizes in a single Frenzy', unlocked: false },
    { id: 'frenzy_master', name: 'Frenzy Master', desc: 'Complete 10 Claw Frenzies', unlocked: false },
    { id: 'frenzy_legend', name: 'Frenzy Legend', desc: 'Grab 8+ prizes in a single Frenzy', unlocked: false },
    { id: 'first_machine_skin', name: 'Decorator', desc: 'Unlock a machine skin', unlocked: false },
    { id: 'all_machine_skins', name: 'Machine Collector', desc: 'Unlock all machine skins', unlocked: false },
    { id: 'gold_machine', name: 'Gold Digger', desc: 'Equip the Gold Plated machine skin', unlocked: false },
    { id: 'grabs_250', name: 'Claw Veteran', desc: 'Grab 250 prizes total', unlocked: false },
    { id: 'grabs_500', name: 'Claw Legend', desc: 'Grab 500 prizes total', unlocked: false },
    { id: 'tickets_5k', name: 'Ticket Magnate', desc: 'Earn 5,000 tickets total', unlocked: false },
    { id: 'perfect_3', name: 'Triple Perfect', desc: 'Get 3 perfect (no miss) games', unlocked: false },
    // Round 7 achievements — Tournament + Custom Challenges
    { id: 'first_tournament', name: 'Contender', desc: 'Enter your first tournament', unlocked: false },
    { id: 'rookie_champ', name: 'Rookie Champion', desc: 'Win the Rookie Cup', unlocked: false },
    { id: 'pro_champ', name: 'Pro Champion', desc: 'Win the Pro Circuit', unlocked: false },
    { id: 'legend_champ', name: 'Legendary Champion', desc: 'Win the Legend\'s Gauntlet', unlocked: false },
    { id: 'tournament_3', name: 'Tournament Veteran', desc: 'Win 3 tournaments', unlocked: false },
    { id: 'tournament_sweep', name: 'Clean Sweep', desc: 'Win all 3 tournament brackets', unlocked: false },
    { id: 'first_custom', name: 'Challenger', desc: 'Complete a custom challenge', unlocked: false },
    { id: 'custom_creator', name: 'Challenge Creator', desc: 'Create a custom challenge', unlocked: false },
    { id: 'custom_5', name: 'Custom Conqueror', desc: 'Win 5 custom challenges', unlocked: false },
    { id: 'preset_all', name: 'Preset Master', desc: 'Complete all 4 preset challenges', unlocked: false },
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

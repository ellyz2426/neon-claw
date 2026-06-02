// progression.ts — XP/Level system, Claw Skins, Daily Rewards

// ─── XP & Levels ─────────────────────────────────────────
export const MAX_LEVEL = 50;

// XP required for each level (exponential curve)
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(1.15, level - 2));
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 2; i <= level; i++) total += xpForLevel(i);
  return total;
}

// XP earned per grab by rarity
export const RARITY_XP: Record<string, number> = {
  common: 10,
  uncommon: 20,
  rare: 50,
  epic: 100,
  legendary: 250,
};

// ─── Claw Skins ──────────────────────────────────────────
export interface ClawSkin {
  id: string;
  name: string;
  clawColor: string;
  trailColor: string;
  glowColor: string;
  prongColor: string;
  unlockLevel: number;
}

export const CLAW_SKINS: ClawSkin[] = [
  { id: 'default', name: 'Standard', clawColor: '#00ffff', trailColor: '#00ffff', glowColor: '#00aacc', prongColor: '#00dddd', unlockLevel: 1 },
  { id: 'crimson', name: 'Crimson Claw', clawColor: '#ff2244', trailColor: '#ff4466', glowColor: '#cc1133', prongColor: '#ff3355', unlockLevel: 3 },
  { id: 'toxic', name: 'Toxic Grip', clawColor: '#00ff44', trailColor: '#44ff88', glowColor: '#00cc22', prongColor: '#22ff66', unlockLevel: 7 },
  { id: 'royal', name: 'Royal Purple', clawColor: '#aa44ff', trailColor: '#cc66ff', glowColor: '#8822dd', prongColor: '#bb55ff', unlockLevel: 12 },
  { id: 'solar', name: 'Solar Flare', clawColor: '#ff8800', trailColor: '#ffaa44', glowColor: '#cc6600', prongColor: '#ff9922', unlockLevel: 18 },
  { id: 'phantom', name: 'Phantom', clawColor: '#ffffff', trailColor: '#aabbcc', glowColor: '#8899aa', prongColor: '#ddeeff', unlockLevel: 25 },
  { id: 'void', name: 'Void Claw', clawColor: '#222244', trailColor: '#6644ff', glowColor: '#4422cc', prongColor: '#443366', unlockLevel: 35 },
  { id: 'prismatic', name: 'Prismatic', clawColor: '#ff44ff', trailColor: '#ffaa00', glowColor: '#ff6600', prongColor: '#44ffdd', unlockLevel: 50 },
];

// ─── Level-Up Rewards ────────────────────────────────────
export interface LevelReward {
  level: number;
  type: 'tickets' | 'skin' | 'title';
  value: string | number;
  description: string;
}

export function getLevelRewards(): LevelReward[] {
  const rewards: LevelReward[] = [];
  for (const skin of CLAW_SKINS) {
    if (skin.unlockLevel > 1) {
      rewards.push({ level: skin.unlockLevel, type: 'skin', value: skin.id, description: `Unlock: ${skin.name} claw skin` });
    }
  }
  // Ticket rewards at milestone levels
  const ticketLevels = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
  const ticketAmounts = [25, 50, 75, 100, 150, 200, 250, 300, 400, 500];
  for (let i = 0; i < ticketLevels.length; i++) {
    rewards.push({ level: ticketLevels[i], type: 'tickets', value: ticketAmounts[i], description: `+${ticketAmounts[i]} bonus tickets` });
  }
  return rewards.sort((a, b) => a.level - b.level);
}

// ─── Challenge Modifiers ─────────────────────────────────
export interface ChallengeModifier {
  id: string;
  name: string;
  icon: string;
  description: string;
  xpMultiplier: number;  // bonus XP multiplier for using modifier
  ticketMultiplier: number;
}

export const CHALLENGE_MODIFIERS: ChallengeModifier[] = [
  { id: 'turbo', name: 'Turbo Speed', icon: '⚡', description: 'Claw moves & drops 50% faster', xpMultiplier: 1.3, ticketMultiplier: 1.5 },
  { id: 'weak_grip', name: 'Weak Grip', icon: '🤏', description: 'Claw grip reduced by 40%', xpMultiplier: 1.5, ticketMultiplier: 1.5 },
  { id: 'double_pts', name: 'Double Points', icon: '✖️', description: '2x points but 2x harder', xpMultiplier: 1.2, ticketMultiplier: 2.0 },
  { id: 'no_powerups', name: 'No Power-ups', icon: '🚫', description: 'Power-up orbs disabled', xpMultiplier: 1.4, ticketMultiplier: 1.3 },
  { id: 'mirror', name: 'Mirror Controls', icon: '🪞', description: 'Movement controls are inverted', xpMultiplier: 1.6, ticketMultiplier: 1.8 },
];

// ─── Daily Rewards ───────────────────────────────────────
export interface DailyRewardTier {
  day: number;
  tickets: number;
  xpBonus: number;
  description: string;
}

export const DAILY_REWARDS: DailyRewardTier[] = [
  { day: 1, tickets: 5, xpBonus: 0, description: 'Day 1: 5 tickets' },
  { day: 2, tickets: 10, xpBonus: 0, description: 'Day 2: 10 tickets' },
  { day: 3, tickets: 15, xpBonus: 50, description: 'Day 3: 15 tickets + 50 XP' },
  { day: 4, tickets: 20, xpBonus: 0, description: 'Day 4: 20 tickets' },
  { day: 5, tickets: 30, xpBonus: 100, description: 'Day 5: 30 tickets + 100 XP' },
  { day: 6, tickets: 40, xpBonus: 0, description: 'Day 6: 40 tickets' },
  { day: 7, tickets: 75, xpBonus: 250, description: 'Day 7: 75 tickets + 250 XP!' },
];

// ─── Progression Manager ─────────────────────────────────
export class ProgressionManager {
  level: number = 1;
  xp: number = 0;
  totalXp: number = 0;
  selectedSkin: string = 'default';
  unlockedSkins: Set<string> = new Set(['default']);
  activeModifiers: Set<string> = new Set();
  dailyStreak: number = 0;
  lastLoginDate: string = '';
  dailyClaimed: boolean = false;
  pendingLevelUp: boolean = false;
  pendingLevelRewards: LevelReward[] = [];

  constructor() {
    this.load();
    this.checkDailyLogin();
  }

  // ─── XP Handling ─────────────────────────────────────
  addXp(amount: number): number {
    // Apply modifier XP multiplier
    let mult = 1.0;
    for (const modId of this.activeModifiers) {
      const mod = CHALLENGE_MODIFIERS.find(m => m.id === modId);
      if (mod) mult *= mod.xpMultiplier;
    }
    const earned = Math.floor(amount * mult);
    this.xp += earned;
    this.totalXp += earned;

    // Check level ups
    while (this.level < MAX_LEVEL) {
      const needed = xpForLevel(this.level + 1);
      if (this.xp >= needed) {
        this.xp -= needed;
        this.level++;
        this.pendingLevelUp = true;

        // Check skin unlocks
        for (const skin of CLAW_SKINS) {
          if (skin.unlockLevel <= this.level && !this.unlockedSkins.has(skin.id)) {
            this.unlockedSkins.add(skin.id);
          }
        }

        // Gather level rewards
        const rewards = getLevelRewards().filter(r => r.level === this.level);
        this.pendingLevelRewards.push(...rewards);
      } else {
        break;
      }
    }

    this.save();
    return earned;
  }

  getXpProgress(): { current: number; needed: number; percent: number } {
    if (this.level >= MAX_LEVEL) return { current: this.xp, needed: 0, percent: 100 };
    const needed = xpForLevel(this.level + 1);
    return { current: this.xp, needed, percent: Math.min(100, Math.floor((this.xp / needed) * 100)) };
  }

  // ─── Claw Skins ──────────────────────────────────────
  getSkin(): ClawSkin {
    return CLAW_SKINS.find(s => s.id === this.selectedSkin) || CLAW_SKINS[0];
  }

  selectSkin(skinId: string): boolean {
    if (this.unlockedSkins.has(skinId)) {
      this.selectedSkin = skinId;
      this.save();
      return true;
    }
    return false;
  }

  isSkinUnlocked(skinId: string): boolean {
    return this.unlockedSkins.has(skinId);
  }

  // ─── Modifiers ───────────────────────────────────────
  toggleModifier(id: string): boolean {
    if (this.activeModifiers.has(id)) {
      this.activeModifiers.delete(id);
    } else {
      this.activeModifiers.add(id);
    }
    this.save();
    return this.activeModifiers.has(id);
  }

  getTicketMultiplier(): number {
    let mult = 1.0;
    for (const modId of this.activeModifiers) {
      const mod = CHALLENGE_MODIFIERS.find(m => m.id === modId);
      if (mod) mult *= mod.ticketMultiplier;
    }
    return mult;
  }

  hasModifier(id: string): boolean {
    return this.activeModifiers.has(id);
  }

  // ─── Daily Rewards ───────────────────────────────────
  checkDailyLogin(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.lastLoginDate === today) return; // already checked today

    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (this.lastLoginDate === yesterday) {
      // Consecutive day
      this.dailyStreak = Math.min(7, this.dailyStreak + 1);
    } else if (this.lastLoginDate !== today) {
      // Streak broken or first login
      this.dailyStreak = 1;
    }

    this.lastLoginDate = today;
    this.dailyClaimed = false;
    this.save();
  }

  claimDailyReward(): DailyRewardTier | null {
    if (this.dailyClaimed) return null;
    const tier = DAILY_REWARDS[Math.min(this.dailyStreak - 1, DAILY_REWARDS.length - 1)];
    this.dailyClaimed = true;
    this.save();
    return tier;
  }

  // ─── Persistence ─────────────────────────────────────
  save(): void {
    try {
      localStorage.setItem('neon-claw-progression', JSON.stringify({
        level: this.level,
        xp: this.xp,
        totalXp: this.totalXp,
        selectedSkin: this.selectedSkin,
        unlockedSkins: [...this.unlockedSkins],
        activeModifiers: [...this.activeModifiers],
        dailyStreak: this.dailyStreak,
        lastLoginDate: this.lastLoginDate,
        dailyClaimed: this.dailyClaimed,
      }));
    } catch {}
  }

  load(): void {
    try {
      const d = localStorage.getItem('neon-claw-progression');
      if (d) {
        const p = JSON.parse(d);
        this.level = p.level || 1;
        this.xp = p.xp || 0;
        this.totalXp = p.totalXp || 0;
        this.selectedSkin = p.selectedSkin || 'default';
        this.unlockedSkins = new Set(p.unlockedSkins || ['default']);
        this.activeModifiers = new Set(p.activeModifiers || []);
        this.dailyStreak = p.dailyStreak || 0;
        this.lastLoginDate = p.lastLoginDate || '';
        this.dailyClaimed = p.dailyClaimed || false;
      }
    } catch {}
  }
}

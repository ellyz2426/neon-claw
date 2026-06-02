// prestige.ts — Prestige System: endgame reset with permanent bonuses

export const MAX_PRESTIGE = 10;
export const PRESTIGE_GRAB_BONUS = 0.05; // +5% grab chance per prestige level
export const PRESTIGE_XP_BONUS = 0.10;   // +10% XP per prestige level
export const PRESTIGE_TICKET_BONUS = 0.05; // +5% tickets per prestige level

export interface PrestigeStar {
  level: number;
  name: string;
  color: string;
  icon: string;
  grabBonus: number;
  xpBonus: number;
  ticketBonus: number;
}

export const PRESTIGE_STARS: PrestigeStar[] = [
  { level: 1, name: 'Bronze Star', color: '#cd7f32', icon: '⭐', grabBonus: 0.05, xpBonus: 0.10, ticketBonus: 0.05 },
  { level: 2, name: 'Silver Star', color: '#c0c0c0', icon: '⭐⭐', grabBonus: 0.10, xpBonus: 0.20, ticketBonus: 0.10 },
  { level: 3, name: 'Gold Star', color: '#ffd700', icon: '⭐⭐⭐', grabBonus: 0.15, xpBonus: 0.30, ticketBonus: 0.15 },
  { level: 4, name: 'Platinum Star', color: '#e5e4e2', icon: '🌟', grabBonus: 0.20, xpBonus: 0.40, ticketBonus: 0.20 },
  { level: 5, name: 'Diamond Star', color: '#b9f2ff', icon: '🌟🌟', grabBonus: 0.25, xpBonus: 0.50, ticketBonus: 0.25 },
  { level: 6, name: 'Emerald Star', color: '#50c878', icon: '🌟🌟🌟', grabBonus: 0.30, xpBonus: 0.60, ticketBonus: 0.30 },
  { level: 7, name: 'Ruby Star', color: '#e0115f', icon: '💫', grabBonus: 0.35, xpBonus: 0.70, ticketBonus: 0.35 },
  { level: 8, name: 'Sapphire Star', color: '#0f52ba', icon: '💫💫', grabBonus: 0.40, xpBonus: 0.80, ticketBonus: 0.40 },
  { level: 9, name: 'Obsidian Star', color: '#3d3635', icon: '💫💫💫', grabBonus: 0.45, xpBonus: 0.90, ticketBonus: 0.45 },
  { level: 10, name: 'Cosmic Star', color: '#ff00ff', icon: '✨', grabBonus: 0.50, xpBonus: 1.00, ticketBonus: 0.50 },
];

export interface PrestigeState {
  level: number;
  totalPrestiges: number;
  highestLevel: number; // highest level reached before any prestige
}

export class PrestigeManager {
  state: PrestigeState = { level: 0, totalPrestiges: 0, highestLevel: 0 };

  constructor() {
    this.load();
  }

  canPrestige(playerLevel: number): boolean {
    return playerLevel >= 50 && this.state.level < MAX_PRESTIGE;
  }

  getStar(): PrestigeStar | null {
    if (this.state.level <= 0) return null;
    return PRESTIGE_STARS[Math.min(this.state.level - 1, PRESTIGE_STARS.length - 1)];
  }

  getGrabBonus(): number {
    return this.state.level * PRESTIGE_GRAB_BONUS;
  }

  getXpBonus(): number {
    return this.state.level * PRESTIGE_XP_BONUS;
  }

  getTicketBonus(): number {
    return this.state.level * PRESTIGE_TICKET_BONUS;
  }

  prestige(currentLevel: number): PrestigeStar | null {
    if (!this.canPrestige(currentLevel)) return null;
    if (currentLevel > this.state.highestLevel) {
      this.state.highestLevel = currentLevel;
    }
    this.state.level++;
    this.state.totalPrestiges++;
    this.save();
    return this.getStar();
  }

  getNextStar(): PrestigeStar | null {
    if (this.state.level >= MAX_PRESTIGE) return null;
    return PRESTIGE_STARS[this.state.level]; // next = current index (0-based for next)
  }

  save(): void {
    try {
      localStorage.setItem('neon-claw-prestige', JSON.stringify(this.state));
    } catch {}
  }

  load(): void {
    try {
      const d = localStorage.getItem('neon-claw-prestige');
      if (d) {
        const parsed = JSON.parse(d);
        this.state = { ...this.state, ...parsed };
      }
    } catch {}
  }
}

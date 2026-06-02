// modestats.ts — Per-mode statistics tracking + session history

export interface ModeStatEntry {
  gamesPlayed: number;
  totalScore: number;
  bestScore: number;
  totalGrabs: number;
  totalMisses: number;
  perfectGames: number; // no misses, at least 1 grab
}

export interface SessionRecord {
  mode: string;
  difficulty: string;
  machine: string;
  score: number;
  grabs: number;
  misses: number;
  accuracy: number; // 0-100
  tickets: number;
  date: string;
  combo: number;
}

const ALL_MODES = ['classic', 'timeattack', 'target', 'progressive', 'daily', 'marathon', 'precision', 'practice'];

export class ModeStatsManager {
  modeStats: Record<string, ModeStatEntry> = {};
  sessionHistory: SessionRecord[] = [];
  private maxHistory = 20;

  constructor() {
    for (const m of ALL_MODES) {
      this.modeStats[m] = { gamesPlayed: 0, totalScore: 0, bestScore: 0, totalGrabs: 0, totalMisses: 0, perfectGames: 0 };
    }
    this.load();
  }

  recordGame(mode: string, difficulty: string, machine: string, score: number, grabs: number, misses: number, tickets: number, combo: number): void {
    const entry = this.modeStats[mode];
    if (entry) {
      entry.gamesPlayed++;
      entry.totalScore += score;
      if (score > entry.bestScore) entry.bestScore = score;
      entry.totalGrabs += grabs;
      entry.totalMisses += misses;
      if (misses === 0 && grabs > 0) entry.perfectGames++;
    }

    const accuracy = (grabs + misses) > 0 ? Math.round((grabs / (grabs + misses)) * 100) : 0;
    this.sessionHistory.unshift({
      mode, difficulty, machine, score, grabs, misses, accuracy, tickets,
      date: new Date().toLocaleString(), combo,
    });
    if (this.sessionHistory.length > this.maxHistory) {
      this.sessionHistory = this.sessionHistory.slice(0, this.maxHistory);
    }
    this.save();
  }

  getModeStat(mode: string): ModeStatEntry {
    return this.modeStats[mode] || { gamesPlayed: 0, totalScore: 0, bestScore: 0, totalGrabs: 0, totalMisses: 0, perfectGames: 0 };
  }

  getModeAccuracy(mode: string): number {
    const entry = this.modeStats[mode];
    if (!entry || (entry.totalGrabs + entry.totalMisses) === 0) return 0;
    return Math.round((entry.totalGrabs / (entry.totalGrabs + entry.totalMisses)) * 100);
  }

  getTopMode(): string {
    let best = '';
    let bestScore = 0;
    for (const [mode, entry] of Object.entries(this.modeStats)) {
      if (entry.bestScore > bestScore) { bestScore = entry.bestScore; best = mode; }
    }
    return best || 'classic';
  }

  save(): void {
    try {
      localStorage.setItem('neon-claw-modestats', JSON.stringify({
        modeStats: this.modeStats,
        sessionHistory: this.sessionHistory,
      }));
    } catch {}
  }

  load(): void {
    try {
      const raw = localStorage.getItem('neon-claw-modestats');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.modeStats) {
          for (const mode of ALL_MODES) {
            if (data.modeStats[mode]) {
              this.modeStats[mode] = { ...this.modeStats[mode], ...data.modeStats[mode] };
            }
          }
        }
        if (data.sessionHistory) this.sessionHistory = data.sessionHistory;
      }
    } catch {}
  }
}

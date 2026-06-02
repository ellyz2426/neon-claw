// tournament.ts — Tournament bracket system with escalating difficulty

import { MACHINES, THEMES, type GameMode, type Difficulty } from './types';

// ─── Tournament Config ───────────────────────────────────
export interface TournamentRound {
  round: number;
  name: string;
  machineId: string;
  themeId: string;
  mode: GameMode;
  difficulty: Difficulty;
  targetScore: number;        // minimum score to advance
  modifiers: string[];        // forced modifiers for this round
  bonusTickets: number;       // reward for clearing this round
}

export interface TournamentBracket {
  id: string;
  name: string;
  description: string;
  icon: string;
  rounds: TournamentRound[];
  grandPrizeTickets: number;
}

export const TOURNAMENT_BRACKETS: TournamentBracket[] = [
  {
    id: 'rookie',
    name: 'Rookie Cup',
    description: 'Prove yourself in the beginner bracket',
    icon: '🏆',
    grandPrizeTickets: 200,
    rounds: [
      { round: 1, name: 'Qualifier', machineId: 'starter', themeId: 'holodeck', mode: 'classic', difficulty: 'easy', targetScore: 300, modifiers: [], bonusTickets: 20 },
      { round: 2, name: 'Round of 8', machineId: 'deluxe', themeId: 'crimson', mode: 'classic', difficulty: 'easy', targetScore: 500, modifiers: [], bonusTickets: 30 },
      { round: 3, name: 'Semifinals', machineId: 'premium', themeId: 'toxic', mode: 'classic', difficulty: 'medium', targetScore: 800, modifiers: [], bonusTickets: 50 },
      { round: 4, name: 'FINALS', machineId: 'legendary', themeId: 'ultraviolet', mode: 'classic', difficulty: 'medium', targetScore: 1200, modifiers: [], bonusTickets: 100 },
    ],
  },
  {
    id: 'pro',
    name: 'Pro Circuit',
    description: 'The pro-level gauntlet — harder machines, tighter scores',
    icon: '⚡',
    grandPrizeTickets: 500,
    rounds: [
      { round: 1, name: 'Open Qualifier', machineId: 'deluxe', themeId: 'solar', mode: 'timeattack', difficulty: 'medium', targetScore: 600, modifiers: [], bonusTickets: 40 },
      { round: 2, name: 'Quarterfinals', machineId: 'tower', themeId: 'toxic', mode: 'precision', difficulty: 'medium', targetScore: 800, modifiers: ['turbo'], bonusTickets: 60 },
      { round: 3, name: 'Semifinals', machineId: 'premium', themeId: 'crimson', mode: 'classic', difficulty: 'hard', targetScore: 1500, modifiers: ['turbo'], bonusTickets: 100 },
      { round: 4, name: 'GRAND FINALS', machineId: 'void', themeId: 'ultraviolet', mode: 'marathon', difficulty: 'hard', targetScore: 2500, modifiers: ['turbo', 'weak_grip'], bonusTickets: 200 },
    ],
  },
  {
    id: 'legend',
    name: 'Legend\'s Gauntlet',
    description: 'Only the best survive — every modifier, every challenge',
    icon: '👑',
    grandPrizeTickets: 1000,
    rounds: [
      { round: 1, name: 'Initiation', machineId: 'tower', themeId: 'crimson', mode: 'precision', difficulty: 'hard', targetScore: 500, modifiers: ['mirror'], bonusTickets: 80 },
      { round: 2, name: 'The Crucible', machineId: 'void', themeId: 'toxic', mode: 'timeattack', difficulty: 'hard', targetScore: 1000, modifiers: ['turbo', 'mirror'], bonusTickets: 120 },
      { round: 3, name: 'Death Match', machineId: 'legendary', themeId: 'solar', mode: 'marathon', difficulty: 'hard', targetScore: 3000, modifiers: ['turbo', 'weak_grip', 'mirror'], bonusTickets: 200 },
      { round: 4, name: 'LEGEND\'S TRIAL', machineId: 'void', themeId: 'ultraviolet', mode: 'classic', difficulty: 'hard', targetScore: 5000, modifiers: ['turbo', 'weak_grip', 'mirror', 'no_powerups'], bonusTickets: 500 },
    ],
  },
];

// ─── Tournament State ────────────────────────────────────
export interface TournamentProgress {
  activeBracketId: string | null;
  currentRound: number;
  roundScores: number[];       // scores achieved per round
  roundPassed: boolean[];      // whether each round was passed
  completedBrackets: string[]; // IDs of fully completed brackets
  totalTournamentWins: number;
  bestBracketId: string | null;
}

const STORAGE_KEY = 'neon-claw-tournament';

export class TournamentManager {
  progress: TournamentProgress;

  constructor() {
    this.progress = this.loadProgress();
  }

  private loadProgress(): TournamentProgress {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      activeBracketId: null,
      currentRound: 0,
      roundScores: [],
      roundPassed: [],
      completedBrackets: [],
      totalTournamentWins: 0,
      bestBracketId: null,
    };
  }

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch {}
  }

  isBracketUnlocked(bracketId: string): boolean {
    const idx = TOURNAMENT_BRACKETS.findIndex(b => b.id === bracketId);
    if (idx === 0) return true;
    // Each bracket requires completing the previous one
    const prev = TOURNAMENT_BRACKETS[idx - 1];
    return prev ? this.progress.completedBrackets.includes(prev.id) : false;
  }

  isBracketCompleted(bracketId: string): boolean {
    return this.progress.completedBrackets.includes(bracketId);
  }

  startBracket(bracketId: string): TournamentRound | null {
    const bracket = TOURNAMENT_BRACKETS.find(b => b.id === bracketId);
    if (!bracket || !this.isBracketUnlocked(bracketId)) return null;

    this.progress.activeBracketId = bracketId;
    this.progress.currentRound = 0;
    this.progress.roundScores = [];
    this.progress.roundPassed = [];
    this.save();

    return bracket.rounds[0];
  }

  getActiveBracket(): TournamentBracket | null {
    if (!this.progress.activeBracketId) return null;
    return TOURNAMENT_BRACKETS.find(b => b.id === this.progress.activeBracketId) || null;
  }

  getCurrentRound(): TournamentRound | null {
    const bracket = this.getActiveBracket();
    if (!bracket) return null;
    return bracket.rounds[this.progress.currentRound] || null;
  }

  recordRoundResult(score: number): {
    passed: boolean;
    ticketsEarned: number;
    tournamentComplete: boolean;
    grandPrize: number;
    eliminated: boolean;
  } {
    const bracket = this.getActiveBracket();
    const round = this.getCurrentRound();
    if (!bracket || !round) {
      return { passed: false, ticketsEarned: 0, tournamentComplete: false, grandPrize: 0, eliminated: true };
    }

    const passed = score >= round.targetScore;
    this.progress.roundScores.push(score);
    this.progress.roundPassed.push(passed);

    let ticketsEarned = 0;
    let tournamentComplete = false;
    let grandPrize = 0;
    let eliminated = false;

    if (passed) {
      ticketsEarned = round.bonusTickets;
      this.progress.currentRound++;

      // Check if tournament is complete
      if (this.progress.currentRound >= bracket.rounds.length) {
        tournamentComplete = true;
        grandPrize = bracket.grandPrizeTickets;
        ticketsEarned += grandPrize;
        this.progress.totalTournamentWins++;
        if (!this.progress.completedBrackets.includes(bracket.id)) {
          this.progress.completedBrackets.push(bracket.id);
        }
        this.progress.bestBracketId = bracket.id;
        this.progress.activeBracketId = null;
      }
    } else {
      eliminated = true;
      // Tournament failed — reset
      this.progress.activeBracketId = null;
    }

    this.save();
    return { passed, ticketsEarned, tournamentComplete, grandPrize, eliminated };
  }

  getTournamentStatus(): string {
    if (!this.progress.activeBracketId) return 'No active tournament';
    const bracket = this.getActiveBracket();
    if (!bracket) return 'No active tournament';
    return `${bracket.icon} ${bracket.name} — Round ${this.progress.currentRound + 1}/${bracket.rounds.length}`;
  }

  abandonTournament(): void {
    this.progress.activeBracketId = null;
    this.progress.currentRound = 0;
    this.progress.roundScores = [];
    this.progress.roundPassed = [];
    this.save();
  }
}

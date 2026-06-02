// customchallenge.ts — Custom Challenge Creator with shareable codes

import { MACHINES, THEMES, type GameMode, type Difficulty } from './types';

// ─── Custom Challenge Definition ─────────────────────────
export interface CustomChallenge {
  code: string;            // shareable 8-char code
  name: string;
  machineId: string;
  themeId: string;
  mode: GameMode;
  difficulty: Difficulty;
  attempts: number;        // max attempts (0 = unlimited)
  timeLimit: number;       // seconds (0 = no limit)
  modifiers: string[];     // active challenge modifiers
  targetScore: number;     // score goal (0 = no goal, just play)
  powerUpsEnabled: boolean;
  description: string;
}

// ─── Preset Challenges ───────────────────────────────────
export const PRESET_CHALLENGES: CustomChallenge[] = [
  {
    code: 'NEON0001',
    name: 'Speed Demon',
    machineId: 'starter',
    themeId: 'crimson',
    mode: 'timeattack',
    difficulty: 'hard',
    attempts: 0,
    timeLimit: 30,
    modifiers: ['turbo'],
    targetScore: 1000,
    powerUpsEnabled: true,
    description: '30 seconds, turbo speed, 1000 point target!',
  },
  {
    code: 'NEON0002',
    name: 'Impossible Grab',
    machineId: 'void',
    themeId: 'ultraviolet',
    mode: 'classic',
    difficulty: 'hard',
    attempts: 3,
    timeLimit: 0,
    modifiers: ['weak_grip', 'mirror'],
    targetScore: 500,
    powerUpsEnabled: false,
    description: '3 attempts, weak grip, mirrored controls, no power-ups',
  },
  {
    code: 'NEON0003',
    name: 'Legendary Hunt',
    machineId: 'legendary',
    themeId: 'solar',
    mode: 'marathon',
    difficulty: 'medium',
    attempts: 0,
    timeLimit: 120,
    modifiers: [],
    targetScore: 5000,
    powerUpsEnabled: true,
    description: 'Find legendaries in the Quantum Chamber — 2 min limit',
  },
  {
    code: 'NEON0004',
    name: 'Tower Rush',
    machineId: 'tower',
    themeId: 'toxic',
    mode: 'timeattack',
    difficulty: 'easy',
    attempts: 0,
    timeLimit: 45,
    modifiers: ['turbo', 'double_pts'],
    targetScore: 2000,
    powerUpsEnabled: true,
    description: 'Double points in the Tower — race to 2000!',
  },
];

// ─── Code Encoding/Decoding ──────────────────────────────
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for clarity

function encodeChallenge(c: CustomChallenge): string {
  // Pack challenge data into a compact code
  const machineIdx = MACHINES.findIndex(m => m.id === c.machineId);
  const themeIdx = THEMES.findIndex(t => t.id === c.themeId);
  const modes: GameMode[] = ['classic', 'timeattack', 'target', 'progressive', 'daily', 'marathon', 'precision', 'practice'];
  const modeIdx = modes.indexOf(c.mode);
  const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
  const diffIdx = diffs.indexOf(c.difficulty);
  const allMods = ['turbo', 'weak_grip', 'double_pts', 'no_powerups', 'mirror'];
  let modBits = 0;
  for (const mod of c.modifiers) {
    const idx = allMods.indexOf(mod);
    if (idx >= 0) modBits |= (1 << idx);
  }

  // Encode into 8 characters
  const values = [
    machineIdx & 0x1F,
    ((themeIdx & 0x07) << 3) | (modeIdx & 0x07),
    ((diffIdx & 0x03) << 5) | (modBits & 0x1F),
    Math.min(31, Math.floor(c.attempts / 2)),
    Math.min(31, Math.floor(c.timeLimit / 15)),
    Math.min(31, Math.floor(c.targetScore / 500)),
    c.powerUpsEnabled ? 16 : 0,
    0, // checksum placeholder
  ];
  // Simple checksum
  values[7] = values.slice(0, 7).reduce((a, b) => (a + b) % 32, 0);

  return values.map(v => CHARS[v % CHARS.length]).join('');
}

function decodeChallenge(code: string): CustomChallenge | null {
  if (code.length !== 8) return null;
  const values = [];
  for (const ch of code.toUpperCase()) {
    const idx = CHARS.indexOf(ch);
    if (idx < 0) return null;
    values.push(idx);
  }

  // Verify checksum
  const checksum = values.slice(0, 7).reduce((a, b) => (a + b) % 32, 0);
  if (checksum !== values[7]) return null;

  const modes: GameMode[] = ['classic', 'timeattack', 'target', 'progressive', 'daily', 'marathon', 'precision', 'practice'];
  const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
  const allMods = ['turbo', 'weak_grip', 'double_pts', 'no_powerups', 'mirror'];

  const machineIdx = values[0] & 0x1F;
  const themeIdx = (values[1] >> 3) & 0x07;
  const modeIdx = values[1] & 0x07;
  const diffIdx = (values[2] >> 5) & 0x03;
  const modBits = values[2] & 0x1F;
  const attempts = values[3] * 2;
  const timeLimit = values[4] * 15;
  const targetScore = values[5] * 500;
  const powerUpsEnabled = (values[6] & 16) !== 0;

  const modifiers: string[] = [];
  for (let i = 0; i < allMods.length; i++) {
    if (modBits & (1 << i)) modifiers.push(allMods[i]);
  }

  const machine = MACHINES[machineIdx % MACHINES.length];
  const theme = THEMES[themeIdx % THEMES.length];

  return {
    code,
    name: 'Custom Challenge',
    machineId: machine?.id || 'starter',
    themeId: theme?.id || 'holodeck',
    mode: modes[modeIdx % modes.length] || 'classic',
    difficulty: diffs[diffIdx % diffs.length] || 'medium',
    attempts,
    timeLimit,
    modifiers,
    targetScore,
    powerUpsEnabled,
    description: 'Custom challenge from code: ' + code,
  };
}

// ─── Custom Challenge State ──────────────────────────────
export interface CustomChallengeHistory {
  completedCodes: string[];
  createdChallenges: CustomChallenge[];
  totalCustomGames: number;
  totalCustomWins: number;
}

const STORAGE_KEY = 'neon-claw-custom';

export class CustomChallengeManager {
  history: CustomChallengeHistory;
  activeChallenge: CustomChallenge | null = null;

  // Builder state (for creating custom challenges)
  builderMachineIdx: number = 0;
  builderThemeIdx: number = 0;
  builderModeIdx: number = 0;
  builderDiffIdx: number = 0;
  builderAttempts: number = 5;
  builderTimeLimit: number = 0;
  builderTargetScore: number = 1000;
  builderModifiers: Set<string> = new Set();
  builderPowerUps: boolean = true;

  constructor() {
    this.history = this.loadHistory();
  }

  private loadHistory(): CustomChallengeHistory {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      completedCodes: [],
      createdChallenges: [],
      totalCustomGames: 0,
      totalCustomWins: 0,
    };
  }

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
    } catch {}
  }

  // Builder methods
  getModes(): GameMode[] {
    return ['classic', 'timeattack', 'target', 'progressive', 'marathon', 'precision'];
  }

  getDiffs(): Difficulty[] {
    return ['easy', 'medium', 'hard'];
  }

  buildChallenge(): CustomChallenge {
    const modes = this.getModes();
    const diffs = this.getDiffs();
    const challenge: CustomChallenge = {
      code: '',
      name: 'My Challenge',
      machineId: MACHINES[this.builderMachineIdx % MACHINES.length].id,
      themeId: THEMES[this.builderThemeIdx % THEMES.length].id,
      mode: modes[this.builderModeIdx % modes.length],
      difficulty: diffs[this.builderDiffIdx % diffs.length],
      attempts: this.builderAttempts,
      timeLimit: this.builderTimeLimit,
      modifiers: [...this.builderModifiers],
      targetScore: this.builderTargetScore,
      powerUpsEnabled: this.builderPowerUps,
      description: '',
    };
    challenge.code = encodeChallenge(challenge);
    return challenge;
  }

  startPreset(index: number): CustomChallenge | null {
    if (index < 0 || index >= PRESET_CHALLENGES.length) return null;
    this.activeChallenge = { ...PRESET_CHALLENGES[index] };
    return this.activeChallenge;
  }

  startFromCode(code: string): CustomChallenge | null {
    const challenge = decodeChallenge(code);
    if (!challenge) return null;
    this.activeChallenge = challenge;
    return challenge;
  }

  startBuiltChallenge(): CustomChallenge {
    const challenge = this.buildChallenge();
    this.activeChallenge = challenge;

    // Save to created challenges if not already there
    if (!this.history.createdChallenges.find(c => c.code === challenge.code)) {
      this.history.createdChallenges.push(challenge);
      this.save();
    }

    return challenge;
  }

  recordResult(score: number): { won: boolean; metTarget: boolean } {
    this.history.totalCustomGames++;
    const metTarget = this.activeChallenge ? (this.activeChallenge.targetScore === 0 || score >= this.activeChallenge.targetScore) : false;
    const won = metTarget;
    if (won) {
      this.history.totalCustomWins++;
      if (this.activeChallenge && !this.history.completedCodes.includes(this.activeChallenge.code)) {
        this.history.completedCodes.push(this.activeChallenge.code);
      }
    }
    this.save();
    return { won, metTarget };
  }

  getBuilderSummary(): string {
    const modes = this.getModes();
    const diffs = this.getDiffs();
    const machine = MACHINES[this.builderMachineIdx % MACHINES.length];
    const mode = modes[this.builderModeIdx % modes.length];
    const diff = diffs[this.builderDiffIdx % diffs.length];
    return `${machine.name} | ${mode} | ${diff}`;
  }
}

export { encodeChallenge, decodeChallenge };

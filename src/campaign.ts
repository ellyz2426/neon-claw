// campaign.ts — Season/Campaign Mode with progressive objectives and rewards

export interface CampaignObjective {
  type: 'grab_count' | 'score_target' | 'rarity_grab' | 'combo_reach' | 'no_miss' | 'speed_grab' | 'collect_types';
  target: number;
  description: string;
}

export interface CampaignStage {
  id: string;
  name: string;
  machineId: string;
  mode: string;
  difficulty: string;
  objectives: CampaignObjective[];
  ticketReward: number;
  bonusPrizeId?: string;
}

export interface Season {
  id: string;
  name: string;
  description: string;
  themeId: string;
  accentColor: string;
  stages: CampaignStage[];
}

export const SEASONS: Season[] = [
  {
    id: 'neon_origins',
    name: 'Neon Origins',
    description: 'Learn the basics and master the Starter machine',
    themeId: 'holodeck',
    accentColor: '#00ffff',
    stages: [
      {
        id: 's1_stage1', name: 'First Steps', machineId: 'starter', mode: 'classic', difficulty: 'easy',
        objectives: [
          { type: 'grab_count', target: 3, description: 'Grab 3 prizes' },
        ],
        ticketReward: 10,
      },
      {
        id: 's1_stage2', name: 'Building Momentum', machineId: 'starter', mode: 'classic', difficulty: 'medium',
        objectives: [
          { type: 'score_target', target: 500, description: 'Score 500+ points' },
          { type: 'combo_reach', target: 2, description: 'Reach x2 combo' },
        ],
        ticketReward: 20,
      },
      {
        id: 's1_stage3', name: 'Speed Trial', machineId: 'starter', mode: 'timeattack', difficulty: 'medium',
        objectives: [
          { type: 'grab_count', target: 4, description: 'Grab 4 in Time Attack' },
          { type: 'speed_grab', target: 1, description: 'Grab a prize in under 3s' },
        ],
        ticketReward: 30,
      },
      {
        id: 's1_stage4', name: 'Starter Mastery', machineId: 'starter', mode: 'classic', difficulty: 'hard',
        objectives: [
          { type: 'no_miss', target: 1, description: 'Complete with zero misses' },
          { type: 'score_target', target: 1000, description: 'Score 1,000+ points' },
        ],
        ticketReward: 50, bonusPrizeId: 'star_gold',
      },
    ],
  },
  {
    id: 'crimson_gauntlet',
    name: 'Crimson Gauntlet',
    description: 'Push your skills on the Deluxe machine',
    themeId: 'crimson',
    accentColor: '#ff4444',
    stages: [
      {
        id: 's2_stage1', name: 'Red Alert', machineId: 'deluxe', mode: 'classic', difficulty: 'medium',
        objectives: [
          { type: 'grab_count', target: 3, description: 'Grab 3 prizes' },
          { type: 'rarity_grab', target: 1, description: 'Grab a rare or better prize' },
        ],
        ticketReward: 25,
      },
      {
        id: 's2_stage2', name: 'Target Practice', machineId: 'deluxe', mode: 'target', difficulty: 'medium',
        objectives: [
          { type: 'grab_count', target: 2, description: 'Hit 2 targets' },
          { type: 'score_target', target: 1000, description: 'Score 1,000+ points' },
        ],
        ticketReward: 35,
      },
      {
        id: 's2_stage3', name: 'Combo Frenzy', machineId: 'deluxe', mode: 'marathon', difficulty: 'medium',
        objectives: [
          { type: 'combo_reach', target: 3, description: 'Reach x3 combo' },
          { type: 'grab_count', target: 6, description: 'Grab 6 prizes in Marathon' },
        ],
        ticketReward: 45,
      },
      {
        id: 's2_stage4', name: 'Crimson Crown', machineId: 'deluxe', mode: 'progressive', difficulty: 'hard',
        objectives: [
          { type: 'score_target', target: 3000, description: 'Score 3,000+ points' },
          { type: 'collect_types', target: 3, description: 'Collect 3 different prize types' },
        ],
        ticketReward: 75, bonusPrizeId: 'star_rainbow',
      },
    ],
  },
  {
    id: 'quantum_ascent',
    name: 'Quantum Ascent',
    description: 'The ultimate challenge — conquer the legendary machines',
    themeId: 'ultraviolet',
    accentColor: '#aa44ff',
    stages: [
      {
        id: 's3_stage1', name: 'Vault Raider', machineId: 'premium', mode: 'classic', difficulty: 'hard',
        objectives: [
          { type: 'grab_count', target: 2, description: 'Grab 2 prizes from the Vault' },
          { type: 'rarity_grab', target: 1, description: 'Grab an epic or better prize' },
        ],
        ticketReward: 40,
      },
      {
        id: 's3_stage2', name: 'Precision Elite', machineId: 'premium', mode: 'precision', difficulty: 'hard',
        objectives: [
          { type: 'no_miss', target: 1, description: 'Perfect precision round (no misses)' },
          { type: 'score_target', target: 2000, description: 'Score 2,000+ points' },
        ],
        ticketReward: 60,
      },
      {
        id: 's3_stage3', name: 'Quantum Storm', machineId: 'legendary', mode: 'timeattack', difficulty: 'hard',
        objectives: [
          { type: 'grab_count', target: 3, description: 'Grab 3 from Quantum Chamber' },
          { type: 'combo_reach', target: 3, description: 'Reach x3 combo' },
        ],
        ticketReward: 80,
      },
      {
        id: 's3_stage4', name: 'Ascension', machineId: 'legendary', mode: 'classic', difficulty: 'hard',
        objectives: [
          { type: 'score_target', target: 5000, description: 'Score 5,000+ points' },
          { type: 'rarity_grab', target: 1, description: 'Grab a LEGENDARY prize' },
          { type: 'no_miss', target: 1, description: 'Zero misses' },
        ],
        ticketReward: 150, bonusPrizeId: 'diamond_legendary',
      },
    ],
  },
];

export interface CampaignProgress {
  completedStages: Set<string>;
  currentSeasonIndex: number;
  currentStageIndex: number;
  stageAttempts: number;
}

export class CampaignManager {
  progress: CampaignProgress;
  activeSeason: Season | null = null;
  activeStage: CampaignStage | null = null;
  stageObjectiveProgress: Map<string, number> = new Map();
  typesCollectedThisStage: Set<string> = new Set();

  constructor() {
    this.progress = {
      completedStages: new Set(),
      currentSeasonIndex: 0,
      currentStageIndex: 0,
      stageAttempts: 0,
    };
    this.load();
  }

  get currentSeason(): Season { return SEASONS[this.progress.currentSeasonIndex] || SEASONS[0]; }

  isSeasonUnlocked(index: number): boolean {
    if (index === 0) return true;
    // Previous season must have all stages completed
    const prev = SEASONS[index - 1];
    return prev.stages.every(s => this.progress.completedStages.has(s.id));
  }

  isStageUnlocked(seasonIndex: number, stageIndex: number): boolean {
    if (!this.isSeasonUnlocked(seasonIndex)) return false;
    if (stageIndex === 0) return true;
    const prevStage = SEASONS[seasonIndex].stages[stageIndex - 1];
    return this.progress.completedStages.has(prevStage.id);
  }

  startStage(seasonIndex: number, stageIndex: number): CampaignStage | null {
    if (!this.isStageUnlocked(seasonIndex, stageIndex)) return null;
    const season = SEASONS[seasonIndex];
    const stage = season.stages[stageIndex];
    this.activeSeason = season;
    this.activeStage = stage;
    this.progress.currentSeasonIndex = seasonIndex;
    this.progress.currentStageIndex = stageIndex;
    this.progress.stageAttempts++;
    this.stageObjectiveProgress.clear();
    this.typesCollectedThisStage.clear();
    for (const obj of stage.objectives) {
      this.stageObjectiveProgress.set(obj.description, 0);
    }
    this.save();
    return stage;
  }

  // Called during gameplay to track progress
  onGrab(prizeRarity: string, prizeId: string, grabTime: number): void {
    if (!this.activeStage) return;
    this.typesCollectedThisStage.add(prizeId);
    for (const obj of this.activeStage.objectives) {
      switch (obj.type) {
        case 'grab_count': {
          const cur = (this.stageObjectiveProgress.get(obj.description) || 0) + 1;
          this.stageObjectiveProgress.set(obj.description, cur);
          break;
        }
        case 'rarity_grab': {
          const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
          const reqIdx = obj.description.toLowerCase().includes('legendary') ? 4
            : obj.description.toLowerCase().includes('epic') ? 3 : 2;
          const prizeIdx = rarityOrder.indexOf(prizeRarity);
          if (prizeIdx >= reqIdx) {
            this.stageObjectiveProgress.set(obj.description, 1);
          }
          break;
        }
        case 'speed_grab': {
          if (grabTime < 3) {
            this.stageObjectiveProgress.set(obj.description, 1);
          }
          break;
        }
        case 'collect_types': {
          this.stageObjectiveProgress.set(obj.description, this.typesCollectedThisStage.size);
          break;
        }
      }
    }
  }

  onScoreUpdate(score: number): void {
    if (!this.activeStage) return;
    for (const obj of this.activeStage.objectives) {
      if (obj.type === 'score_target') {
        this.stageObjectiveProgress.set(obj.description, score);
      }
    }
  }

  onComboUpdate(combo: number): void {
    if (!this.activeStage) return;
    for (const obj of this.activeStage.objectives) {
      if (obj.type === 'combo_reach') {
        const cur = this.stageObjectiveProgress.get(obj.description) || 0;
        if (combo > cur) this.stageObjectiveProgress.set(obj.description, combo);
      }
    }
  }

  onGameEnd(misses: number): void {
    if (!this.activeStage) return;
    for (const obj of this.activeStage.objectives) {
      if (obj.type === 'no_miss') {
        this.stageObjectiveProgress.set(obj.description, misses === 0 ? 1 : 0);
      }
    }
  }

  checkAllObjectivesMet(): boolean {
    if (!this.activeStage) return false;
    for (const obj of this.activeStage.objectives) {
      const progress = this.stageObjectiveProgress.get(obj.description) || 0;
      if (progress < obj.target) return false;
    }
    return true;
  }

  completeStage(): { ticketReward: number; bonusPrizeId?: string; seasonCompleted: boolean } | null {
    if (!this.activeStage || !this.activeSeason) return null;
    const stageId = this.activeStage.id;
    const reward = {
      ticketReward: this.activeStage.ticketReward,
      bonusPrizeId: this.activeStage.bonusPrizeId,
      seasonCompleted: false,
    };
    this.progress.completedStages.add(stageId);

    // Check if season is completed
    reward.seasonCompleted = this.activeSeason.stages.every(s => this.progress.completedStages.has(s.id));

    this.activeStage = null;
    this.activeSeason = null;
    this.save();
    return reward;
  }

  getObjectiveStatus(): { description: string; progress: number; target: number; met: boolean }[] {
    if (!this.activeStage) return [];
    return this.activeStage.objectives.map(obj => ({
      description: obj.description,
      progress: this.stageObjectiveProgress.get(obj.description) || 0,
      target: obj.target,
      met: (this.stageObjectiveProgress.get(obj.description) || 0) >= obj.target,
    }));
  }

  getTotalStagesCompleted(): number { return this.progress.completedStages.size; }
  getTotalStages(): number { return SEASONS.reduce((sum, s) => sum + s.stages.length, 0); }

  save(): void {
    try {
      localStorage.setItem('neon-claw-campaign', JSON.stringify({
        completedStages: [...this.progress.completedStages],
        currentSeasonIndex: this.progress.currentSeasonIndex,
        currentStageIndex: this.progress.currentStageIndex,
        stageAttempts: this.progress.stageAttempts,
      }));
    } catch {}
  }

  load(): void {
    try {
      const data = localStorage.getItem('neon-claw-campaign');
      if (data) {
        const parsed = JSON.parse(data);
        this.progress.completedStages = new Set(parsed.completedStages || []);
        this.progress.currentSeasonIndex = parsed.currentSeasonIndex || 0;
        this.progress.currentStageIndex = parsed.currentStageIndex || 0;
        this.progress.stageAttempts = parsed.stageAttempts || 0;
      }
    } catch {}
  }
}

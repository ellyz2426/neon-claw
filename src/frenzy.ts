// frenzy.ts — Claw Frenzy bonus round mini-game

export interface FrenzyConfig {
  duration: number;        // seconds
  gripBoost: number;       // multiplier on grip strength
  ticketMultiplier: number; // multiplier on tickets earned
  spawnInterval: number;   // seconds between prize respawns
  minGrabsToTrigger: number; // min grabs in previous game to qualify
  triggerChance: number;   // probability [0-1] of triggering
}

export const FRENZY_CONFIG: FrenzyConfig = {
  duration: 12,
  gripBoost: 1.6,
  ticketMultiplier: 3,
  spawnInterval: 2.5,
  minGrabsToTrigger: 3,
  triggerChance: 0.3,
};

export interface FrenzyState {
  active: boolean;
  timeRemaining: number;
  grabs: number;
  ticketsEarned: number;
  spawnTimer: number;
  pulsePhase: number;
  totalFrenzies: number;
  bestFrenzyGrabs: number;
  totalFrenzyGrabs: number;
}

export class FrenzyManager {
  state: FrenzyState = {
    active: false,
    timeRemaining: 0,
    grabs: 0,
    ticketsEarned: 0,
    spawnTimer: 0,
    pulsePhase: 0,
    totalFrenzies: 0,
    bestFrenzyGrabs: 0,
    totalFrenzyGrabs: 0,
  };

  constructor() { this.load(); }

  shouldTrigger(gameGrabs: number): boolean {
    if (gameGrabs < FRENZY_CONFIG.minGrabsToTrigger) return false;
    // Higher grab count increases chance slightly
    const bonusChance = Math.min(0.15, (gameGrabs - FRENZY_CONFIG.minGrabsToTrigger) * 0.03);
    return Math.random() < (FRENZY_CONFIG.triggerChance + bonusChance);
  }

  start(): void {
    this.state.active = true;
    this.state.timeRemaining = FRENZY_CONFIG.duration;
    this.state.grabs = 0;
    this.state.ticketsEarned = 0;
    this.state.spawnTimer = 0;
    this.state.pulsePhase = 0;
    this.state.totalFrenzies++;
    this.save();
  }

  onGrab(baseTickets: number): number {
    const tickets = Math.floor(baseTickets * FRENZY_CONFIG.ticketMultiplier);
    this.state.grabs++;
    this.state.ticketsEarned += tickets;
    this.state.totalFrenzyGrabs++;
    if (this.state.grabs > this.state.bestFrenzyGrabs) {
      this.state.bestFrenzyGrabs = this.state.grabs;
    }
    this.save();
    return tickets;
  }

  update(dt: number): boolean {
    if (!this.state.active) return false;
    this.state.timeRemaining -= dt;
    this.state.spawnTimer += dt;
    this.state.pulsePhase += dt * 6; // fast pulsing
    if (this.state.timeRemaining <= 0) {
      this.state.active = false;
      return true; // frenzy ended
    }
    return false;
  }

  shouldRespawnPrizes(): boolean {
    if (this.state.spawnTimer >= FRENZY_CONFIG.spawnInterval) {
      this.state.spawnTimer = 0;
      return true;
    }
    return false;
  }

  end(): { grabs: number; tickets: number } {
    this.state.active = false;
    const result = { grabs: this.state.grabs, tickets: this.state.ticketsEarned };
    this.save();
    return result;
  }

  save(): void {
    try {
      localStorage.setItem('neon-claw-frenzy', JSON.stringify({
        totalFrenzies: this.state.totalFrenzies,
        bestFrenzyGrabs: this.state.bestFrenzyGrabs,
        totalFrenzyGrabs: this.state.totalFrenzyGrabs,
      }));
    } catch {}
  }

  load(): void {
    try {
      const raw = localStorage.getItem('neon-claw-frenzy');
      if (raw) {
        const data = JSON.parse(raw);
        this.state.totalFrenzies = data.totalFrenzies || 0;
        this.state.bestFrenzyGrabs = data.bestFrenzyGrabs || 0;
        this.state.totalFrenzyGrabs = data.totalFrenzyGrabs || 0;
      }
    } catch {}
  }
}

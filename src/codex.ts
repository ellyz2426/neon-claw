// codex.ts — Prize Codex with lore entries and discovery tracking

import { PRIZE_TYPES, RARITY_COLORS, type PrizeType } from './types';

// ─── Lore Entries ────────────────────────────────────────
export interface CodexEntry {
  prizeId: string;
  lore: string;
  origin: string;      // where the prize came from
  funFact: string;     // fun detail
}

export const CODEX_ENTRIES: CodexEntry[] = [
  { prizeId: 'cube_cyan', lore: 'A crystallized fragment of pure neon energy, humming at exactly 440Hz.', origin: 'Holodeck Core', funFact: 'Cubes are the most common prizes but power the entire arcade grid.' },
  { prizeId: 'sphere_pink', lore: 'A sphere of compressed plasma, perpetually swirling with magenta storms.', origin: 'Plasma Forge', funFact: 'Each orb contains a tiny lightning storm visible under UV light.' },
  { prizeId: 'cylinder_green', lore: 'A fully charged energy cell from a decommissioned defense grid.', origin: 'Grid Sector 7', funFact: 'One cell can power a neon sign for approximately 10,000 years.' },
  { prizeId: 'cube_orange', lore: 'A block of solidified solar wind, harvested from a dying star.', origin: 'Solar Array', funFact: 'Warm to the touch. Always warm. Even in absolute zero.' },
  { prizeId: 'sphere_blue', lore: 'A pearl formed in the void between dimensions, impossibly light.', origin: 'Void Rift', funFact: 'Legend says it whispers coordinates to places that don\'t exist yet.' },
  { prizeId: 'diamond_purple', lore: 'A prism that splits light into colors not found in any spectrum.', origin: 'Spectrum Labs', funFact: 'Looking through it lets you see one second into the future. Maybe.' },
  { prizeId: 'star_gold', lore: 'A star that collapsed into a palm-sized golden token of pure luck.', origin: 'Fortune Nebula', funFact: 'Statistically, people who own one win 7% more claw games.' },
  { prizeId: 'capsule_red', lore: 'A containment pod housing a micro-inferno — handle with insulated gloves.', origin: 'Thermal Core', funFact: 'The inferno inside has been burning for 3 billion cycles.' },
  { prizeId: 'diamond_white', lore: 'A diamond frozen at absolute zero, perpetually covered in frost crystals.', origin: 'Cryo Vault', funFact: 'It can freeze an entire swimming pool in 0.3 seconds.' },
  { prizeId: 'star_rainbow', lore: 'A star that exists simultaneously in all wavelengths of light.', origin: 'Prismatic Rift', funFact: 'Looking at it too long causes temporary synesthesia.' },
  { prizeId: 'sphere_black', lore: 'A micro-singularity trapped in a containment field. Don\'t drop it.', origin: 'Event Horizon', funFact: 'Has measurable gravitational pull. Attracted 3 arcade tokens last week.' },
  { prizeId: 'cube_holo', lore: 'A holographic cube projecting impossible geometries from its six faces.', origin: 'Data Nexus', funFact: 'Contains exactly 1 exabyte of compressed holographic data.' },
  { prizeId: 'diamond_legendary', lore: 'The legendary Quantum Core — a diamond that exists in all quantum states.', origin: 'Quantum Chamber', funFact: 'It\'s both the rarest prize and the most common. Simultaneously.' },
  { prizeId: 'star_legendary', lore: 'A supernova compressed to the size of a star pendant, blazing eternal.', origin: 'Stellar Forge', funFact: 'Emits as much light as a small sun. The containment field costs a fortune.' },
  { prizeId: 'capsule_frost', lore: 'A capsule of crystallized permafrost from the coldest moon in the system.', origin: 'Cryo Moon', funFact: 'The frost patterns are never the same twice. Scientists are baffled.' },
  { prizeId: 'cube_shadow', lore: 'A cube that absorbs all light, visible only by its absence.', origin: 'Shadow Realm', funFact: 'Photos of it always come out as dark rectangles.' },
  { prizeId: 'sphere_nova', lore: 'A sphere containing the first millisecond of a nova explosion, frozen in time.', origin: 'Nova Point', funFact: 'Temperature at its center: 100 million degrees. Surface: room temp.' },
  { prizeId: 'diamond_aurora', lore: 'A gem that projects miniature aurora borealis when exposed to any energy.', origin: 'Aurora Belt', funFact: 'Popular as nightlights. Very expensive nightlights.' },
  { prizeId: 'star_cosmic', lore: 'A star fragment from beyond the observable universe, pulsing with unknown energy.', origin: 'Cosmic Edge', funFact: 'Radio telescopes occasionally detect morse code from it. So far: "HELLO."' },
  { prizeId: 'cylinder_titan', lore: 'The core of a fallen titan-class machine, still vibrating with dormant power.', origin: 'Titan Graveyard', funFact: 'Weighs 50x more than it looks. The grip strength required is legendary.' },
];

// ─── Codex Manager ───────────────────────────────────────
const STORAGE_KEY = 'neon-claw-codex';

export interface CodexProgress {
  viewedEntries: string[];    // prize IDs the player has read the lore for
  favoritePrizeId: string | null;
  discoveryOrder: string[];   // order prizes were first collected
}

export class CodexManager {
  progress: CodexProgress;

  constructor() {
    this.progress = this.loadProgress();
  }

  private loadProgress(): CodexProgress {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      viewedEntries: [],
      favoritePrizeId: null,
      discoveryOrder: [],
    };
  }

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch {}
  }

  getEntry(prizeId: string): CodexEntry | null {
    return CODEX_ENTRIES.find(e => e.prizeId === prizeId) || null;
  }

  markViewed(prizeId: string): void {
    if (!this.progress.viewedEntries.includes(prizeId)) {
      this.progress.viewedEntries.push(prizeId);
      this.save();
    }
  }

  recordDiscovery(prizeId: string): void {
    if (!this.progress.discoveryOrder.includes(prizeId)) {
      this.progress.discoveryOrder.push(prizeId);
      this.save();
    }
  }

  setFavorite(prizeId: string): void {
    this.progress.favoritePrizeId = prizeId;
    this.save();
  }

  getViewedCount(): number {
    return this.progress.viewedEntries.length;
  }

  getTotalEntries(): number {
    return CODEX_ENTRIES.length;
  }

  isFullyRead(): boolean {
    return this.progress.viewedEntries.length >= CODEX_ENTRIES.length;
  }
}

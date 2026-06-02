// fusion.ts — Prize Fusion Workshop: combine prizes to create upgraded versions

export interface FusionRecipe {
  inputRarity: string;
  inputCount: number;
  outputRarity: string;
  ticketCost: number;
}

export const FUSION_RECIPES: FusionRecipe[] = [
  { inputRarity: 'common', inputCount: 3, outputRarity: 'uncommon', ticketCost: 5 },
  { inputRarity: 'uncommon', inputCount: 3, outputRarity: 'rare', ticketCost: 15 },
  { inputRarity: 'rare', inputCount: 3, outputRarity: 'epic', ticketCost: 40 },
  { inputRarity: 'epic', inputCount: 3, outputRarity: 'legendary', ticketCost: 100 },
];

export interface FusionInventory {
  // prizeId -> count owned (beyond collection tracking)
  counts: Map<string, number>;
  totalFusions: number;
}

export class FusionManager {
  inventory: FusionInventory;

  constructor() {
    this.inventory = { counts: new Map(), totalFusions: 0 };
    this.load();
  }

  addPrize(prizeId: string): void {
    const cur = this.inventory.counts.get(prizeId) || 0;
    this.inventory.counts.set(prizeId, cur + 1);
    this.save();
  }

  getCount(prizeId: string): number {
    return this.inventory.counts.get(prizeId) || 0;
  }

  getRarityCount(rarity: string, prizeTypes: { id: string; rarity: string }[]): number {
    let total = 0;
    for (const pt of prizeTypes) {
      if (pt.rarity === rarity) {
        total += this.getCount(pt.id);
      }
    }
    return total;
  }

  canFuse(recipe: FusionRecipe, prizeTypes: { id: string; rarity: string }[], tickets: number): boolean {
    return this.getRarityCount(recipe.inputRarity, prizeTypes) >= recipe.inputCount
      && tickets >= recipe.ticketCost;
  }

  performFusion(recipe: FusionRecipe, prizeTypes: { id: string; rarity: string }[]): {
    consumed: string[];
    produced: string;
    ticketCost: number;
  } | null {
    // Find prizes to consume (take from highest-count first)
    const candidates = prizeTypes
      .filter(pt => pt.rarity === recipe.inputRarity && this.getCount(pt.id) > 0)
      .sort((a, b) => this.getCount(b.id) - this.getCount(a.id));

    const consumed: string[] = [];
    let remaining = recipe.inputCount;

    for (const pt of candidates) {
      if (remaining <= 0) break;
      const available = this.getCount(pt.id);
      const take = Math.min(available, remaining);
      for (let i = 0; i < take; i++) {
        consumed.push(pt.id);
        this.inventory.counts.set(pt.id, this.getCount(pt.id) - 1);
      }
      remaining -= take;
    }

    if (remaining > 0) {
      // Undo — shouldn't happen if canFuse was checked
      for (const id of consumed) {
        this.inventory.counts.set(id, this.getCount(id) + 1);
      }
      return null;
    }

    // Produce a random prize of the output rarity
    const outputs = prizeTypes.filter(pt => pt.rarity === recipe.outputRarity);
    const produced = outputs[Math.floor(Math.random() * outputs.length)];

    this.addPrize(produced.id);
    this.inventory.totalFusions++;
    this.save();

    return { consumed, produced: produced.id, ticketCost: recipe.ticketCost };
  }

  getTotalPrizes(): number {
    let total = 0;
    for (const count of this.inventory.counts.values()) total += count;
    return total;
  }

  save(): void {
    try {
      const obj: Record<string, number> = {};
      for (const [k, v] of this.inventory.counts) { if (v > 0) obj[k] = v; }
      localStorage.setItem('neon-claw-fusion', JSON.stringify({
        counts: obj,
        totalFusions: this.inventory.totalFusions,
      }));
    } catch {}
  }

  load(): void {
    try {
      const data = localStorage.getItem('neon-claw-fusion');
      if (data) {
        const parsed = JSON.parse(data);
        this.inventory.counts = new Map(Object.entries(parsed.counts || {}));
        this.inventory.totalFusions = parsed.totalFusions || 0;
      }
    } catch {}
  }
}

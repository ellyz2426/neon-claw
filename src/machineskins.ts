// machineskins.ts — Machine cosmetic skins system

export interface MachineSkin {
  id: string;
  name: string;
  icon: string;
  glassColor: string;
  frameColor: string;
  accentColor: string;
  glowColor: string;
  floorGridColor: string;
  cost: number; // ticket cost to unlock
  desc: string;
}

export const MACHINE_SKINS: MachineSkin[] = [
  { id: 'default', name: 'Standard', icon: '🎰', glassColor: '#00ffff', frameColor: '#003344', accentColor: '#00aacc', glowColor: '#00ffff', floorGridColor: '#004466', cost: 0, desc: 'Classic neon look' },
  { id: 'chrome', name: 'Chrome', icon: '🪞', glassColor: '#bbccdd', frameColor: '#556677', accentColor: '#99aabb', glowColor: '#ddeeff', floorGridColor: '#778899', cost: 200, desc: 'Sleek chrome finish' },
  { id: 'gold', name: 'Gold Plated', icon: '🥇', glassColor: '#ffcc44', frameColor: '#665500', accentColor: '#ffaa00', glowColor: '#ffdd66', floorGridColor: '#aa8800', cost: 500, desc: 'Luxurious gold plating' },
  { id: 'holographic', name: 'Holographic', icon: '🌈', glassColor: '#ff88ff', frameColor: '#440066', accentColor: '#88ffff', glowColor: '#ff44ff', floorGridColor: '#6644aa', cost: 750, desc: 'Shifting rainbow holo' },
  { id: 'obsidian', name: 'Obsidian', icon: '🖤', glassColor: '#334455', frameColor: '#111122', accentColor: '#ff2244', glowColor: '#661122', floorGridColor: '#222233', cost: 1000, desc: 'Dark volcanic glass' },
  { id: 'prismatic', name: 'Prismatic', icon: '💎', glassColor: '#ffffff', frameColor: '#224488', accentColor: '#44ffaa', glowColor: '#aaffee', floorGridColor: '#3366aa', cost: 1500, desc: 'Ultra-rare prismatic' },
];

export class MachineSkinManager {
  equippedSkin: string = 'default';
  unlockedSkins: Set<string> = new Set(['default']);

  constructor() { this.load(); }

  get current(): MachineSkin {
    return MACHINE_SKINS.find(s => s.id === this.equippedSkin) || MACHINE_SKINS[0];
  }

  isUnlocked(id: string): boolean {
    return this.unlockedSkins.has(id);
  }

  canAfford(id: string, tickets: number): boolean {
    const skin = MACHINE_SKINS.find(s => s.id === id);
    if (!skin) return false;
    return tickets >= skin.cost;
  }

  purchase(id: string, tickets: number): { success: boolean; cost: number } {
    const skin = MACHINE_SKINS.find(s => s.id === id);
    if (!skin || this.unlockedSkins.has(id) || tickets < skin.cost) {
      return { success: false, cost: 0 };
    }
    this.unlockedSkins.add(id);
    this.save();
    return { success: true, cost: skin.cost };
  }

  equip(id: string): boolean {
    if (!this.unlockedSkins.has(id)) return false;
    this.equippedSkin = id;
    this.save();
    return true;
  }

  save(): void {
    try {
      localStorage.setItem('neon-claw-machine-skins', JSON.stringify({
        equipped: this.equippedSkin,
        unlocked: [...this.unlockedSkins],
      }));
    } catch {}
  }

  load(): void {
    try {
      const raw = localStorage.getItem('neon-claw-machine-skins');
      if (raw) {
        const data = JSON.parse(raw);
        this.equippedSkin = data.equipped || 'default';
        this.unlockedSkins = new Set(data.unlocked || ['default']);
      }
    } catch {}
  }
}

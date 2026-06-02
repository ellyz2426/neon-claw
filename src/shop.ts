// shop.ts — Ticket Shop: purchasable consumables, boosts, and utilities

export interface ShopItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: number;
  category: 'consumable' | 'boost' | 'utility';
  stackable: boolean;
  maxStack: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  // Consumables — single-use per game
  {
    id: 'extra_attempt', name: 'Extra Attempt', icon: '🎟️',
    description: '+1 attempt in your next game',
    cost: 8, category: 'consumable', stackable: true, maxStack: 5,
  },
  {
    id: 'starter_grip', name: 'Starter Grip+', icon: '💪',
    description: 'Start next game with Strong Grip active (15s)',
    cost: 12, category: 'consumable', stackable: true, maxStack: 3,
  },
  {
    id: 'starter_magnet', name: 'Starter Magnet', icon: '🧲',
    description: 'Start next game with Magnet Pull active (15s)',
    cost: 12, category: 'consumable', stackable: true, maxStack: 3,
  },
  {
    id: 'lucky_charm', name: 'Lucky Charm', icon: '🍀',
    description: '+15% grab chance for next game',
    cost: 15, category: 'consumable', stackable: true, maxStack: 3,
  },
  {
    id: 'xp_boost', name: 'XP Boost', icon: '⚡',
    description: '2x XP for your next game',
    cost: 20, category: 'consumable', stackable: true, maxStack: 3,
  },
  // Boosts — persistent bonuses
  {
    id: 'ticket_magnet', name: 'Ticket Magnet', icon: '🎫',
    description: '+10% tickets permanently (stacks 3x)',
    cost: 100, category: 'boost', stackable: true, maxStack: 3,
  },
  {
    id: 'prize_scanner', name: 'Prize Scanner', icon: '🔍',
    description: 'Always see prize rarity glow in machines',
    cost: 75, category: 'boost', stackable: false, maxStack: 1,
  },
  // Utility
  {
    id: 'reroll_daily', name: 'Reroll Daily', icon: '🔄',
    description: 'Reroll the Daily Challenge seed',
    cost: 25, category: 'utility', stackable: true, maxStack: 5,
  },
];

export interface ShopInventory {
  owned: Record<string, number>; // item_id -> count
  boostsActive: string[];         // permanent boost IDs
}

export class ShopManager {
  inventory: ShopInventory = { owned: {}, boostsActive: [] };
  totalPurchases: number = 0;

  constructor() {
    this.load();
  }

  canAfford(item: ShopItem, tickets: number): boolean {
    return tickets >= item.cost;
  }

  canBuy(item: ShopItem, tickets: number): boolean {
    if (!this.canAfford(item, tickets)) return false;
    const count = this.inventory.owned[item.id] || 0;
    if (!item.stackable && count > 0) return false;
    if (count >= item.maxStack) return false;
    // Permanent boosts: check if already activated
    if (item.category === 'boost' && !item.stackable && this.inventory.boostsActive.includes(item.id)) {
      return false;
    }
    return true;
  }

  buy(item: ShopItem): boolean {
    const count = this.inventory.owned[item.id] || 0;
    if (count >= item.maxStack) return false;
    this.inventory.owned[item.id] = count + 1;
    this.totalPurchases++;

    // Auto-activate permanent boosts
    if (item.category === 'boost') {
      if (!this.inventory.boostsActive.includes(item.id)) {
        this.inventory.boostsActive.push(item.id);
      }
    }

    this.save();
    return true;
  }

  useConsumable(itemId: string): boolean {
    const count = this.inventory.owned[itemId] || 0;
    if (count <= 0) return false;
    this.inventory.owned[itemId] = count - 1;
    if (this.inventory.owned[itemId] === 0) {
      delete this.inventory.owned[itemId];
    }
    this.save();
    return true;
  }

  getCount(itemId: string): number {
    return this.inventory.owned[itemId] || 0;
  }

  hasBoost(boostId: string): boolean {
    return this.inventory.boostsActive.includes(boostId);
  }

  getBoostLevel(boostId: string): number {
    // For stackable boosts, count = level
    return this.inventory.owned[boostId] || 0;
  }

  getTicketBonusPercent(): number {
    const level = this.getBoostLevel('ticket_magnet');
    return level * 10; // +10% per stack
  }

  save(): void {
    try {
      localStorage.setItem('neon-claw-shop', JSON.stringify({
        ...this.inventory,
        totalPurchases: this.totalPurchases,
      }));
    } catch {}
  }

  load(): void {
    try {
      const d = localStorage.getItem('neon-claw-shop');
      if (d) {
        const parsed = JSON.parse(d);
        this.inventory = {
          owned: parsed.owned || {},
          boostsActive: parsed.boostsActive || [],
        };
        this.totalPurchases = parsed.totalPurchases || 0;
      }
    } catch {}
  }
}

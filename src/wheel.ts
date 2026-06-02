// wheel.ts — Lucky Wheel: gacha-style spinning wheel for prize rewards

export interface WheelSegment {
  id: string;
  label: string;
  icon: string;
  color: string;
  weight: number; // probability weight
  reward: WheelReward;
}

export interface WheelReward {
  type: 'tickets' | 'xp' | 'prize' | 'powerup_token' | 'jackpot';
  amount?: number;
  prizeId?: string;
  description: string;
}

export const WHEEL_COST = 10; // tickets per spin

export const WHEEL_SEGMENTS: WheelSegment[] = [
  {
    id: 'tix_5', label: '5 Tickets', icon: '🎫', color: '#4488ff',
    weight: 25, reward: { type: 'tickets', amount: 5, description: '+5 Tickets' },
  },
  {
    id: 'xp_50', label: '50 XP', icon: '⚡', color: '#00ff88',
    weight: 20, reward: { type: 'xp', amount: 50, description: '+50 XP' },
  },
  {
    id: 'tix_15', label: '15 Tickets', icon: '🎫', color: '#00ffff',
    weight: 15, reward: { type: 'tickets', amount: 15, description: '+15 Tickets' },
  },
  {
    id: 'powerup', label: 'Power Token', icon: '💎', color: '#aa44ff',
    weight: 12, reward: { type: 'powerup_token', amount: 1, description: 'Free Power-Up Start!' },
  },
  {
    id: 'xp_150', label: '150 XP', icon: '⚡', color: '#88ff00',
    weight: 10, reward: { type: 'xp', amount: 150, description: '+150 XP' },
  },
  {
    id: 'tix_30', label: '30 Tickets', icon: '🎫', color: '#ff8800',
    weight: 8, reward: { type: 'tickets', amount: 30, description: '+30 Tickets!' },
  },
  {
    id: 'prize_rare', label: 'Rare Prize', icon: '🏆', color: '#ffdd00',
    weight: 5, reward: { type: 'prize', prizeId: 'random_rare', description: 'Random Rare Prize!' },
  },
  {
    id: 'jackpot', label: 'JACKPOT!', icon: '💰', color: '#ff4444',
    weight: 3, reward: { type: 'jackpot', amount: 100, description: '🎉 JACKPOT: 100 Tickets!' },
  },
  {
    id: 'xp_500', label: '500 XP', icon: '🌟', color: '#ff44ff',
    weight: 2, reward: { type: 'xp', amount: 500, description: '+500 XP!' },
  },
];

export interface WheelState {
  totalSpins: number;
  totalTicketsWon: number;
  totalXpWon: number;
  jackpotCount: number;
  prizesWon: string[];
  lastSpinResult: string | null;
}

export class WheelManager {
  state: WheelState = {
    totalSpins: 0, totalTicketsWon: 0, totalXpWon: 0,
    jackpotCount: 0, prizesWon: [], lastSpinResult: null,
  };
  isSpinning: boolean = false;
  spinResult: WheelSegment | null = null;
  spinAngle: number = 0;
  spinTargetAngle: number = 0;
  spinSpeed: number = 0;

  constructor() {
    this.load();
  }

  canSpin(tickets: number): boolean {
    return tickets >= WHEEL_COST && !this.isSpinning;
  }

  startSpin(): WheelSegment {
    // Weighted random selection
    const totalWeight = WHEEL_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
    let roll = Math.random() * totalWeight;
    let selected = WHEEL_SEGMENTS[0];
    for (const seg of WHEEL_SEGMENTS) {
      roll -= seg.weight;
      if (roll <= 0) { selected = seg; break; }
    }

    this.isSpinning = true;
    this.spinResult = selected;
    this.state.totalSpins++;

    // Calculate target angle for the selected segment
    const segIndex = WHEEL_SEGMENTS.indexOf(selected);
    const segAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;
    // Spin several full rotations + land on segment
    const targetSegAngle = segIndex * segAngle + segAngle / 2;
    this.spinTargetAngle = this.spinAngle + Math.PI * 8 + (2 * Math.PI - targetSegAngle);
    this.spinSpeed = 12; // initial speed (radians/sec)

    this.save();
    return selected;
  }

  updateSpin(dt: number): boolean {
    if (!this.isSpinning) return false;

    const remaining = this.spinTargetAngle - this.spinAngle;
    if (remaining < 0.01) {
      this.spinAngle = this.spinTargetAngle;
      this.isSpinning = false;
      return true; // spin complete
    }

    // Ease-out deceleration
    const progress = 1 - (remaining / (Math.PI * 8 + Math.PI * 2));
    const easedSpeed = this.spinSpeed * Math.max(0.05, 1 - progress * progress);
    this.spinAngle += easedSpeed * dt;

    if (this.spinAngle > this.spinTargetAngle) {
      this.spinAngle = this.spinTargetAngle;
    }

    return false;
  }

  applyReward(reward: WheelReward): void {
    switch (reward.type) {
      case 'tickets':
      case 'jackpot':
        this.state.totalTicketsWon += reward.amount || 0;
        if (reward.type === 'jackpot') this.state.jackpotCount++;
        break;
      case 'xp':
        this.state.totalXpWon += reward.amount || 0;
        break;
      case 'prize':
        if (reward.prizeId) this.state.prizesWon.push(reward.prizeId);
        break;
    }
    this.state.lastSpinResult = reward.description;
    this.save();
  }

  save(): void {
    try {
      localStorage.setItem('neon-claw-wheel', JSON.stringify(this.state));
    } catch {}
  }

  load(): void {
    try {
      const d = localStorage.getItem('neon-claw-wheel');
      if (d) {
        const parsed = JSON.parse(d);
        this.state = { ...this.state, ...parsed };
      }
    } catch {}
  }
}

// audio.ts — Procedural Web Audio for Neon Claw VR

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneLFO: OscillatorNode | null = null;

  private masterVol = 0.7;
  private sfxVol = 0.8;
  private musicVol = 0.3;

  init(): void {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.masterVol;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVol;
    this.sfxGain.connect(this.masterGain);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVol;
    this.musicGain.connect(this.masterGain);

    this.startDrone();
  }

  private startDrone(): void {
    if (!this.ctx || !this.musicGain) return;
    const t = this.ctx.currentTime;

    // Sub bass drone
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sine';
    this.droneOsc1.frequency.value = 55;
    const g1 = this.ctx.createGain();
    g1.gain.value = 0.15;
    this.droneOsc1.connect(g1);
    g1.connect(this.musicGain);
    this.droneOsc1.start(t);

    // Pad layer
    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'triangle';
    this.droneOsc2.frequency.value = 82.5;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.08;
    this.droneOsc2.connect(lp);
    lp.connect(g2);
    g2.connect(this.musicGain);
    this.droneOsc2.start(t);

    // LFO modulation
    this.droneLFO = this.ctx.createOscillator();
    this.droneLFO.type = 'sine';
    this.droneLFO.frequency.value = 0.15;
    const lfoG = this.ctx.createGain();
    lfoG.gain.value = 3;
    this.droneLFO.connect(lfoG);
    lfoG.connect(this.droneOsc1.frequency);
    this.droneLFO.start(t);
  }

  private playTone(freq: number, type: OscillatorType, dur: number, vol: number, node?: GainNode): void {
    if (!this.ctx) return;
    const dest = node || this.sfxGain;
    if (!dest) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur);
  }

  private playNoise(dur: number, vol: number, filterFreq?: number): void {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const bufSize = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    if (filterFreq) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filterFreq;
      src.connect(f);
      f.connect(g);
    } else {
      src.connect(g);
    }
    g.connect(this.sfxGain);
    src.start(t);
  }

  // ─── SFX Methods ─────────────────────────────────────
  clawMove(): void {
    this.playTone(220, 'square', 0.05, 0.06);
  }

  clawDrop(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(800, t);
    o.frequency.exponentialRampToValueAtTime(200, t + 0.4);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g);
    g.connect(this.sfxGain!);
    o.start(t);
    o.stop(t + 0.4);
  }

  clawClose(): void {
    this.playTone(440, 'square', 0.15, 0.1);
    this.playNoise(0.1, 0.08, 2000);
  }

  clawGrab(): void {
    // Success: ascending arpeggio
    if (!this.ctx) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.2, 0.12), i * 80);
    });
  }

  clawMiss(): void {
    // Failure: descending tones
    if (!this.ctx) return;
    this.playTone(400, 'sawtooth', 0.3, 0.08);
    setTimeout(() => this.playTone(300, 'sawtooth', 0.3, 0.06), 100);
    setTimeout(() => this.playTone(200, 'sawtooth', 0.4, 0.04), 200);
  }

  prizeCollect(): void {
    if (!this.ctx) return;
    const notes = [659, 784, 988, 1175, 1319];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.15, 0.1), i * 60);
    });
    this.playNoise(0.2, 0.05, 3000);
  }

  buttonClick(): void {
    this.playTone(880, 'sine', 0.05, 0.1);
    this.playTone(1100, 'sine', 0.04, 0.06);
  }

  gameStart(): void {
    if (!this.ctx) return;
    [440, 554, 659, 880].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.2, 0.1), i * 100);
    });
  }

  gameOver(): void {
    if (!this.ctx) return;
    [660, 554, 440, 330].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.3, 0.08), i * 150);
    });
  }

  achievementUnlock(): void {
    if (!this.ctx) return;
    [523, 659, 784, 988, 1175].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.25, 0.1), i * 80);
    });
  }

  countdownTick(): void {
    this.playTone(660, 'sine', 0.08, 0.12);
  }

  countdownGo(): void {
    this.playTone(1320, 'sine', 0.3, 0.15);
  }

  comboUp(): void {
    this.playTone(880, 'triangle', 0.15, 0.1);
    this.playTone(1100, 'triangle', 0.1, 0.08);
  }

  clawAscend(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(600, t + 0.3);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g);
    g.connect(this.sfxGain!);
    o.start(t);
    o.stop(t + 0.3);
  }

  prizeRelease(): void {
    this.playTone(400, 'triangle', 0.2, 0.08);
    this.playNoise(0.15, 0.06, 1500);
  }

  powerUpCollect(): void {
    if (!this.ctx) return;
    [660, 880, 1100].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.15, 0.12), i * 60);
    });
    this.playNoise(0.1, 0.04, 4000);
  }

  setMasterVolume(v: number): void { this.masterVol = v; if (this.masterGain) this.masterGain.gain.value = v; }
  setSfxVolume(v: number): void { this.sfxVol = v; if (this.sfxGain) this.sfxGain.gain.value = v; }
  setMusicVolume(v: number): void { this.musicVol = v; if (this.musicGain) this.musicGain.gain.value = v; }
  getMasterVolume(): number { return this.masterVol; }
  getSfxVolume(): number { return this.sfxVol; }
  getMusicVolume(): number { return this.musicVol; }
}

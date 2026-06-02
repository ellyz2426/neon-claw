// music.ts — Procedural synthwave background music for Neon Claw VR

export class SynthwaveMusic {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bassOsc: OscillatorNode | null = null;
  private bassGain: GainNode | null = null;
  private padOsc1: OscillatorNode | null = null;
  private padOsc2: OscillatorNode | null = null;
  private padGain: GainNode | null = null;
  private arpInterval: ReturnType<typeof setInterval> | null = null;
  private playing = false;

  // Am - F - C - G progression
  private chords = [
    { bass: 55, notes: [220, 261.63, 329.63] },    // Am
    { bass: 43.65, notes: [174.61, 220, 261.63] },  // F
    { bass: 65.41, notes: [261.63, 329.63, 392] },  // C
    { bass: 49, notes: [196, 246.94, 293.66] },      // G
  ];

  private bpm = 110;
  private beatDur: number;
  private currentChord = 0;
  private beatCount = 0;

  constructor() {
    this.beatDur = 60 / this.bpm;
  }

  start(ctx: AudioContext, destination: GainNode): void {
    if (this.playing) return;
    this.ctx = ctx;
    this.playing = true;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.25;
    this.masterGain.connect(destination);

    // Bass synth (sawtooth through lowpass)
    this.bassOsc = ctx.createOscillator();
    this.bassOsc.type = 'sawtooth';
    this.bassOsc.frequency.value = this.chords[0].bass;
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 350;
    bassFilter.Q.value = 2;
    this.bassGain = ctx.createGain();
    this.bassGain.gain.value = 0.3;
    this.bassOsc.connect(bassFilter);
    bassFilter.connect(this.bassGain);
    this.bassGain.connect(this.masterGain);
    this.bassOsc.start();

    // Pad layer (two detuned saws through lowpass)
    this.padOsc1 = ctx.createOscillator();
    this.padOsc1.type = 'sawtooth';
    this.padOsc1.frequency.value = 220;
    this.padOsc2 = ctx.createOscillator();
    this.padOsc2.type = 'sawtooth';
    this.padOsc2.frequency.value = 220.5; // slight detune for width
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 600;
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.06;
    this.padOsc1.connect(padFilter);
    this.padOsc2.connect(padFilter);
    padFilter.connect(this.padGain);
    this.padGain.connect(this.masterGain);
    this.padOsc1.start();
    this.padOsc2.start();

    // Arpeggiator (triggered via interval)
    this.currentChord = 0;
    this.beatCount = 0;
    this.arpInterval = setInterval(() => this.tick(), this.beatDur * 250); // 16th notes
  }

  private tick(): void {
    if (!this.ctx || !this.masterGain) return;
    this.beatCount++;

    // Change chord every 4 beats (16 ticks)
    if (this.beatCount % 16 === 0) {
      this.currentChord = (this.currentChord + 1) % this.chords.length;
      const chord = this.chords[this.currentChord];
      const t = this.ctx.currentTime;
      if (this.bassOsc) {
        this.bassOsc.frequency.setTargetAtTime(chord.bass, t, 0.05);
      }
      if (this.padOsc1 && this.padOsc2) {
        this.padOsc1.frequency.setTargetAtTime(chord.notes[0], t, 0.08);
        this.padOsc2.frequency.setTargetAtTime(chord.notes[0] + 0.5, t, 0.08);
      }
    }

    // Arp note on every 4th tick (quarter-note arps)
    if (this.beatCount % 4 === 0) {
      const chord = this.chords[this.currentChord];
      const noteIdx = Math.floor((this.beatCount / 4) % 3);
      const freq = chord.notes[noteIdx] * 2; // octave up for shimmer
      this.playArpNote(freq);
    }

    // Hi-hat pattern (on every 4th tick, accent every 16th)
    if (this.beatCount % 4 === 0) {
      const accent = this.beatCount % 16 === 0;
      this.playHiHat(accent);
    }
  }

  private playArpNote(freq: number): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g);
    g.connect(this.masterGain);
    o.start(t);
    o.stop(t + 0.15);
  }

  private playHiHat(accent: boolean): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const bufSize = Math.floor(this.ctx.sampleRate * 0.04);
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(accent ? 0.06 : 0.03, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.masterGain);
    src.start(t);
  }

  stop(): void {
    if (!this.playing) return;
    this.playing = false;
    if (this.arpInterval) { clearInterval(this.arpInterval); this.arpInterval = null; }
    try { this.bassOsc?.stop(); } catch {}
    try { this.padOsc1?.stop(); } catch {}
    try { this.padOsc2?.stop(); } catch {}
    this.bassOsc = null;
    this.padOsc1 = null;
    this.padOsc2 = null;
  }

  setVolume(v: number): void {
    if (this.masterGain) this.masterGain.gain.value = v * 0.25;
  }
}

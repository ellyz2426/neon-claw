// replay.ts — Instant Replay system for prize grabs

import { Vector3 } from '@iwsdk/core';

// ─── Replay Recording ────────────────────────────────────
export interface ReplayFrame {
  time: number;
  clawX: number;
  clawZ: number;
  clawY: number;
  phase: string;
  gripping: boolean;
}

export interface ReplayClip {
  frames: ReplayFrame[];
  prizeId: string;
  prizeName: string;
  prizeRarity: string;
  score: number;
  wasGrab: boolean;          // true if prize was grabbed, false if miss
  startTime: number;
  endTime: number;
  duration: number;
}

const MAX_FRAMES = 300;      // ~5 seconds at 60fps
const MAX_REPLAYS = 5;       // keep last 5 replays

export class ReplayManager {
  recording: boolean = false;
  currentFrames: ReplayFrame[] = [];
  clips: ReplayClip[] = [];
  isPlaying: boolean = false;
  playbackFrame: number = 0;
  playbackSpeed: number = 0.5;    // half speed for dramatic effect
  playbackClip: ReplayClip | null = null;
  autoPlayTimer: number = 0;      // auto-play after legendary grabs

  // Stats
  totalReplays: number = 0;
  bestGrabReplay: ReplayClip | null = null;

  startRecording(): void {
    this.recording = true;
    this.currentFrames = [];
  }

  recordFrame(time: number, clawX: number, clawZ: number, clawY: number, phase: string, gripping: boolean): void {
    if (!this.recording) return;
    this.currentFrames.push({ time, clawX, clawZ, clawY, phase, gripping });
    // Rolling buffer
    if (this.currentFrames.length > MAX_FRAMES) {
      this.currentFrames.shift();
    }
  }

  finishClip(prizeId: string, prizeName: string, prizeRarity: string, score: number, wasGrab: boolean): ReplayClip | null {
    this.recording = false;
    if (this.currentFrames.length < 10) return null; // too short

    const clip: ReplayClip = {
      frames: [...this.currentFrames],
      prizeId,
      prizeName,
      prizeRarity,
      score,
      wasGrab,
      startTime: this.currentFrames[0].time,
      endTime: this.currentFrames[this.currentFrames.length - 1].time,
      duration: this.currentFrames[this.currentFrames.length - 1].time - this.currentFrames[0].time,
    };

    this.clips.push(clip);
    if (this.clips.length > MAX_REPLAYS) {
      this.clips.shift();
    }

    // Track best grab replay
    if (wasGrab && (!this.bestGrabReplay || score > this.bestGrabReplay.score)) {
      this.bestGrabReplay = clip;
    }

    this.currentFrames = [];
    return clip;
  }

  playReplay(clipIndex?: number): boolean {
    const clip = clipIndex !== undefined ? this.clips[clipIndex] : this.clips[this.clips.length - 1];
    if (!clip) return false;

    this.isPlaying = true;
    this.playbackFrame = 0;
    this.playbackClip = clip;
    this.totalReplays++;
    return true;
  }

  getPlaybackPosition(): { x: number; z: number; y: number; phase: string; gripping: boolean; progress: number } | null {
    if (!this.isPlaying || !this.playbackClip) return null;

    const frame = this.playbackClip.frames[this.playbackFrame];
    if (!frame) {
      this.stopReplay();
      return null;
    }

    return {
      x: frame.clawX,
      z: frame.clawZ,
      y: frame.clawY,
      phase: frame.phase,
      gripping: frame.gripping,
      progress: this.playbackFrame / this.playbackClip.frames.length,
    };
  }

  advancePlayback(dt: number): boolean {
    if (!this.isPlaying || !this.playbackClip) return false;

    // Advance by speed-adjusted frame count
    const framesPerSecond = 60 * this.playbackSpeed;
    this.playbackFrame += Math.max(1, Math.round(framesPerSecond * dt));

    if (this.playbackFrame >= this.playbackClip.frames.length) {
      this.stopReplay();
      return true; // replay finished
    }
    return false;
  }

  stopReplay(): void {
    this.isPlaying = false;
    this.playbackFrame = 0;
    this.playbackClip = null;
  }

  getLastClip(): ReplayClip | null {
    return this.clips.length > 0 ? this.clips[this.clips.length - 1] : null;
  }

  hasClips(): boolean {
    return this.clips.length > 0;
  }

  getClipCount(): number {
    return this.clips.length;
  }
}

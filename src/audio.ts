/**
 * Pure synthesized sound effects using Web Audio API.
 * No external audio files — every sound is generated on the fly.
 */

export type SoundName =
  | "hit"
  | "golden"
  | "bomb"
  | "flower"
  | "combo"
  | "fever"
  | "stage_clear"
  | "game_over"
  | "miss"
  | "click";

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private resumed = false;

  init(): void {
    if (this.ctx) return;
    try {
      const Ctor =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (_e) {
      this.ctx = null;
    }
  }

  /** Must be called from a user gesture handler to unlock audio on iOS/Safari. */
  resume(): void {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => undefined);
    }
    this.resumed = true;
  }

  setMuted(m: boolean): void {
    this.muted = m;
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  play(name: SoundName): void {
    if (this.muted) return;
    if (!this.ctx || !this.master) return;
    if (!this.resumed) return;
    try {
      switch (name) {
        case "hit":
          this.beep([{ f: 600, t: 0.0, d: 0.04 }, { f: 320, t: 0.04, d: 0.05 }], "square", 0.18);
          break;
        case "golden":
          this.beep(
            [
              { f: 880, t: 0.0, d: 0.05 },
              { f: 1320, t: 0.05, d: 0.05 },
              { f: 1760, t: 0.1, d: 0.08 },
            ],
            "triangle",
            0.22,
          );
          break;
        case "bomb":
          this.noise(0.25, 0.32, 800, 80);
          break;
        case "flower":
          // sharp warning "삐-"
          this.beep([{ f: 1200, t: 0.0, d: 0.25 }], "sawtooth", 0.18);
          break;
        case "combo":
          this.beep(
            [
              { f: 740, t: 0.0, d: 0.04 },
              { f: 988, t: 0.04, d: 0.05 },
            ],
            "triangle",
            0.16,
          );
          break;
        case "fever":
          this.beep(
            [
              { f: 523, t: 0.0, d: 0.08 },
              { f: 659, t: 0.08, d: 0.08 },
              { f: 784, t: 0.16, d: 0.08 },
              { f: 1047, t: 0.24, d: 0.16 },
            ],
            "square",
            0.2,
          );
          break;
        case "stage_clear":
          this.beep(
            [
              { f: 523, t: 0.0, d: 0.12 },
              { f: 659, t: 0.12, d: 0.12 },
              { f: 784, t: 0.24, d: 0.12 },
              { f: 1047, t: 0.36, d: 0.24 },
            ],
            "triangle",
            0.22,
          );
          break;
        case "game_over":
          this.beep(
            [
              { f: 440, t: 0.0, d: 0.15 },
              { f: 349, t: 0.15, d: 0.15 },
              { f: 262, t: 0.3, d: 0.3 },
            ],
            "sawtooth",
            0.18,
          );
          break;
        case "miss":
          this.beep([{ f: 220, t: 0.0, d: 0.08 }], "sine", 0.12);
          break;
        case "click":
          this.beep([{ f: 880, t: 0.0, d: 0.03 }], "square", 0.1);
          break;
      }
    } catch (_e) {
      /* swallow */
    }
  }

  private beep(
    notes: { f: number; t: number; d: number }[],
    type: OscillatorType,
    peakGain: number,
  ): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(n.f, now + n.t);
      gain.gain.setValueAtTime(0, now + n.t);
      gain.gain.linearRampToValueAtTime(peakGain, now + n.t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.02);
    }
  }

  private noise(duration: number, peakGain: number, startHz: number, endHz: number): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const sampleCount = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      // exponentially decaying noise burst
      const env = Math.exp(-3 * (i / sampleCount));
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    const now = ctx.currentTime;
    filter.frequency.setValueAtTime(startHz, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, endHz), now + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(peakGain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(now);
    src.stop(now + duration + 0.02);
  }
}

export const audio = new AudioEngine();

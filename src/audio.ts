export type SoundType =
  | "shot"
  | "hit"
  | "kill"
  | "hurt"
  | "cannon"
  | "wave"
  | "upgrade"
  | "defeat"
  | "victory"
  | "click";

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** All sound is synthesized locally; no audio downloads, autoplay, or unlicensed assets. */
export class AudioManager {
  sound = true;
  music = true;

  private context?: AudioContext;
  private master?: GainNode;
  private effects?: GainNode;
  private ambient?: GainNode;
  private noise?: AudioBuffer;
  private active = true;
  private focused = true;
  private unlocked = false;
  private stateQueue: Promise<void> = Promise.resolve();
  private nextBeat = 0;
  private beat = 0;
  private intensity = 0;
  private voices = 0;
  private lastShot = -10;
  private lastHit = -10;

  constructor() {
    document.addEventListener("visibilitychange", () => this.synchronize());
    window.addEventListener("blur", () => {
      this.focused = false;
      this.synchronize();
    });
    window.addEventListener("focus", () => {
      this.focused = true;
      this.synchronize();
    });
  }

  /** Call from the first pointer/key gesture. Browser autoplay restrictions are respected. */
  async unlock(): Promise<void> {
    try {
      if (!this.context) {
        const Context =
          window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
        if (!Context) return;
        const context = new Context();
        this.context = context;
        this.master = context.createGain();
        this.master.gain.value = 0.62;
        this.master.connect(context.destination);
        this.effects = context.createGain();
        this.effects.gain.value = this.sound ? 0.75 : 0;
        this.effects.connect(this.master);
        this.ambient = context.createGain();
        this.ambient.gain.value = this.music ? 0.23 : 0;
        this.ambient.connect(this.master);
        this.noise = context.createBuffer(
          1,
          context.sampleRate,
          context.sampleRate,
        );
        const samples = this.noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++)
          samples[i] = Math.random() * 2 - 1;
      }
      this.unlocked = true;
      if (this.shouldPlay && this.context.state !== "running")
        await this.context.resume();
      this.synchronize();
    } catch {
      // Some browsers or devices have no usable audio output; the whole game still works.
    }
  }

  setSettings(sound: boolean, music: boolean): void {
    this.sound = sound;
    this.music = music;
    if (this.context) {
      this.effects?.gain.setTargetAtTime(
        sound ? 0.75 : 0,
        this.context.currentTime,
        0.025,
      );
      this.ambient?.gain.setTargetAtTime(
        music ? 0.23 : 0,
        this.context.currentTime,
        0.09,
      );
    }
    this.synchronize();
  }

  setActive(active: boolean): void {
    if (this.active === active) return;
    this.active = active;
    this.synchronize();
  }

  private get shouldPlay(): boolean {
    return (
      this.unlocked &&
      this.active &&
      this.focused &&
      !document.hidden &&
      (this.sound || this.music)
    );
  }

  private synchronize(): void {
    const context = this.context;
    if (!context || !this.master) return;
    try {
      const time = context.currentTime;
      this.master.gain.cancelScheduledValues(time);
      this.master.gain.setValueAtTime(this.shouldPlay ? 0.62 : 0, time);
    } catch {
      /* A closed audio context is harmless. */
    }
    // Serialize asynchronous suspend/resume so a quick tab switch cannot leave audio running.
    this.stateQueue = this.stateQueue
      .then(async () => {
        if (context.state === "closed") return;
        if (this.shouldPlay) {
          if (context.state !== "running") await context.resume();
          this.nextBeat = Math.max(this.nextBeat, context.currentTime + 0.06);
        } else if (context.state === "running") await context.suspend();
      })
      .catch(() => {});
  }

  play(type: SoundType): void {
    const context = this.context;
    if (
      !context ||
      context.state !== "running" ||
      !this.shouldPlay ||
      !this.sound ||
      !this.effects
    )
      return;
    const now = context.currentTime;
    try {
      switch (type) {
        case "shot":
          if (now - this.lastShot < 0.055) return;
          this.lastShot = now;
          this.tone(
            410 + Math.random() * 40,
            105,
            0.065,
            0.07,
            "triangle",
            now,
          );
          this.hiss(0.045, 0.038, 1800, "highpass", now);
          break;
        case "hit":
          if (now - this.lastHit < 0.065) return;
          this.lastHit = now;
          this.tone(165, 70, 0.07, 0.045, "triangle", now);
          break;
        case "kill":
          this.tone(420, 220, 0.1, 0.045, "sine", now);
          break;
        case "hurt":
          this.tone(115, 48, 0.23, 0.16, "sawtooth", now);
          this.hiss(0.14, 0.1, 550, "lowpass", now);
          break;
        case "cannon":
          this.tone(100, 28, 0.55, 0.25, "sine", now);
          this.hiss(0.32, 0.2, 1000, "lowpass", now);
          this.tone(160, 45, 0.19, 0.09, "triangle", now);
          break;
        case "wave":
          this.chime([220, 293.66, 440], 0.16, 0.075, now);
          break;
        case "upgrade":
          this.chime([293.66, 349.23, 440, 587.33], 0.075, 0.09, now);
          break;
        case "victory":
          this.chime(
            [293.66, 349.23, 440, 587.33, 698.46, 880],
            0.14,
            0.1,
            now,
          );
          break;
        case "defeat":
          this.chime([293.66, 261.63, 220, 146.83], 0.2, 0.085, now);
          break;
        case "click":
          this.tone(620, 530, 0.045, 0.035, "sine", now);
          break;
      }
    } catch {
      /* Sound should never interrupt an input action. */
    }
  }

  update(dt: number, intensity: number): void {
    this.intensity +=
      (Math.max(0, Math.min(1, intensity)) - this.intensity) *
      Math.min(1, Math.max(0, dt) * 2);
    const context = this.context;
    if (
      !context ||
      context.state !== "running" ||
      !this.shouldPlay ||
      !this.music ||
      !this.ambient
    )
      return;
    try {
      const now = context.currentTime;
      if (this.nextBeat < now - 0.2) this.nextBeat = now + 0.04;
      // D minor, quiet enough for the effects and with generous space between notes.
      const notes = [146.83, 220, 293.66, 349.23, 329.63, 261.63, 220, 174.61];
      let scheduled = 0;
      while (this.nextBeat < now + 0.13 && scheduled++ < 3) {
        const note = notes[this.beat % notes.length];
        this.tone(
          note,
          note * 0.999,
          1.15,
          this.beat % 2 === 0 ? 0.11 : 0.065,
          "sine",
          this.nextBeat,
          this.ambient,
        );
        if (this.beat % 4 === 0) {
          const bass = this.beat % 8 === 0 ? 73.416 : 65.406;
          this.tone(bass, bass, 2.5, 0.15, "sine", this.nextBeat, this.ambient);
        }
        if (this.intensity > 0.25 && this.beat % 2 === 0) {
          this.hiss(
            0.08,
            0.025 * this.intensity,
            700,
            "lowpass",
            this.nextBeat,
            this.ambient,
          );
        }
        this.beat += 1;
        this.nextBeat += 0.43;
      }
    } catch {
      /* Ambient audio is optional. */
    }
  }

  private chime(
    notes: number[],
    spacing: number,
    volume: number,
    when: number,
  ): void {
    notes.forEach((note, index) =>
      this.tone(note, note, 0.38, volume, "sine", when + index * spacing),
    );
  }

  private tone(
    from: number,
    to: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    when: number,
    output = this.effects,
  ): void {
    const context = this.context;
    if (!context || !output || this.voices > 28) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, when);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, to),
      when + duration,
    );
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(
      volume,
      when + Math.min(0.008, duration / 4),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain);
    gain.connect(output);
    this.voices += 1;
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      this.voices -= 1;
    };
    oscillator.start(when);
    oscillator.stop(when + duration + 0.02);
  }

  private hiss(
    duration: number,
    volume: number,
    frequency: number,
    type: BiquadFilterType,
    when: number,
    output = this.effects,
  ): void {
    const context = this.context;
    if (!context || !output || !this.noise || this.voices > 28) return;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = this.noise;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = 0.8;
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    this.voices += 1;
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      this.voices -= 1;
    };
    source.start(when, Math.random() * 0.4);
    source.stop(when + duration + 0.02);
  }
}

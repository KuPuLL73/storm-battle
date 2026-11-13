export class StormAudio {
  enabled = true;
  private ctx?: AudioContext;
  private active = true;
  unlock() {
    try {
      this.ctx ??= new AudioContext();
      if (this.active) void this.ctx.resume();
    } catch {}
  }
  setActive(active: boolean) {
    this.active = active;
    try {
      if (active) void this.ctx?.resume();
      else void this.ctx?.suspend();
    } catch {}
  }
  private tone(
    freq: number,
    duration: number,
    volume = 0.04,
    delay = 0,
    type: OscillatorType = "sine",
  ) {
    const c = this.ctx;
    if (!c || !this.enabled || !this.active) return;
    const t = c.currentTime + delay,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + duration + 0.01);
  }
  click() {
    this.tone(650, 0.035, 0.025, 0, "triangle");
  }
  tick() {
    this.tone(1100, 0.035, 0.035, 0, "triangle");
  }
  win() {
    [523, 659, 784, 1046].forEach((f, i) =>
      this.tone(f, 0.32, 0.055, i * 0.09, "triangle"),
    );
  }
  lose() {
    this.tone(220, 0.3, 0.055, 0, "triangle");
    this.tone(164, 0.4, 0.04, 0.12, "triangle");
  }
  coin() {
    this.tone(1047, 0.1, 0.035);
    this.tone(1568, 0.13, 0.025, 0.04);
  }
}

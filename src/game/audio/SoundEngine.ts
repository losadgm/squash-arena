export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noiseBuf: AudioBuffer | null = null;

  private ensure(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.45;
      this.master.connect(this.ctx.destination);

      const len = this.ctx.sampleRate * 0.1;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private osc(type: OscillatorType, freq: number, dur: number, vol: number, dest: AudioNode) {
    const c = this.ensure();
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur);
    o.addEventListener('ended', () => g.disconnect(), { once: true });
  }

  private noise(dur: number, vol: number, dest: AudioNode) {
    const c = this.ensure();
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf!;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(g).connect(dest);
    src.start(t);
    src.stop(t + dur);
    src.addEventListener('ended', () => {
      g.disconnect();
      if (dest !== this.master) (dest as AudioNode).disconnect();
    }, { once: true });
  }

  private bp(freq: number, q: number): BiquadFilterNode {
    const f = this.ensure().createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    f.connect(this.master);
    return f;
  }

  paddleHit(isPlayer: boolean, speed: number) {
    const c = this.ensure();
    const t = c.currentTime;
    const base = isPlayer ? 440 : 280;
    const freq = base + speed * 200;
    const gain = 0.25 + speed * 0.2;

    this.noise(0.06, gain * 0.8, this.bp(freq * 2, 5));
    this.osc('triangle', freq, 0.12, gain * 0.5, this.master);
    this.osc('sine', freq * 1.5, 0.08, gain * 0.25, this.master);

    const sub = c.createOscillator();
    const sg = c.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(isPlayer ? 120 : 80, t);
    sub.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    sg.gain.setValueAtTime(gain * 0.6, t);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    sub.connect(sg).connect(this.master);
    sub.start(t);
    sub.stop(t + 0.12);
    sub.addEventListener('ended', () => sg.disconnect(), { once: true });
  }

  wallBounce(speed: number) {
    const freq = 600 + speed * 400 + Math.random() * 100;
    const gain = 0.12 + speed * 0.1;
    this.noise(0.04, gain, this.bp(freq, 8));
    this.osc('square', freq, 0.05, gain * 0.3, this.master);
  }

  goal(byPlayer: boolean) {
    const c = this.ensure();
    const t = c.currentTime;

    if (byPlayer) {
      [523, 659, 784, 1047].forEach((f, i) => {
        this.osc('triangle', f, 0.35 - i * 0.04, 0.3, this.master);
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        const start = t + i * 0.08;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.2, start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        o.connect(g).connect(this.master);
        o.start(start);
        o.stop(start + 0.35);
        o.addEventListener('ended', () => g.disconnect(), { once: true });
      });
    } else {
      [440, 349, 294, 220].forEach((f, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sawtooth';
        o.frequency.value = f;
        const start = t + i * 0.1;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.18, start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        o.connect(g).connect(this.master);
        o.start(start);
        o.stop(start + 0.4);
        o.addEventListener('ended', () => g.disconnect(), { once: true });
      });
    }
  }

  gameStart() {
    const c = this.ensure();
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(800, t + 0.25);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.4);
    o.addEventListener('ended', () => g.disconnect(), { once: true });
    this.osc('triangle', 1200, 0.2, 0.1, this.master);
  }

  gameOver(won: boolean) {
    const c = this.ensure();
    const t = c.currentTime;

    if (won) {
      [523, 659, 784, 1047, 1319].forEach((f, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        const start = t + i * 0.12;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.25, start + 0.02);
        g.gain.setValueAtTime(0.25, start + 0.3);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.8);
        o.connect(g).connect(this.master);
        o.start(start);
        o.stop(start + 0.85);
        o.addEventListener('ended', () => g.disconnect(), { once: true });
      });
    } else {
      [440, 370, 311, 262, 220].forEach((f, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'sawtooth';
        o.frequency.value = f;
        const start = t + i * 0.15;
        o.frequency.exponentialRampToValueAtTime(f * 0.9, start + 0.6);
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.18, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.7);
        o.connect(g).connect(this.master);
        o.start(start);
        o.stop(start + 0.75);
        o.addEventListener('ended', () => g.disconnect(), { once: true });
      });
    }
  }

  destroy() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
      this.noiseBuf = null;
    }
  }
}

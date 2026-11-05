// Procedural WebAudio: engine synth, turbo, blow-off, nitrous, UI sounds and a synth music loop.
export class EngineSound {
  private ctx: AudioContext;
  private out: GainNode;
  private o1: OscillatorNode;
  private o2: OscillatorNode;
  private o3: OscillatorNode;
  private g1: GainNode;
  private g2: GainNode;
  private g3: GainNode;
  private lp: BiquadFilterNode;
  private noiseBp: BiquadFilterNode;
  private noiseG: GainNode;
  private whistle: OscillatorNode;
  private whistleG: GainNode;
  private nitroG: GainNode;
  private lfo: OscillatorNode;
  private lfoG: GainNode;
  private shaper: WaveShaperNode;
  private cyl: number;
  private sfx: AudioNode;
  private noiseBuf: AudioBuffer;
  private pan: StereoPannerNode;
  private lastBlow = 0;

  constructor(ctx: AudioContext, dest: AudioNode, noiseBuf: AudioBuffer, cylinders: number, volume = 1, pan = 0) {
    this.ctx = ctx;
    this.cyl = cylinders;
    this.sfx = dest;
    this.noiseBuf = noiseBuf;
    this.pan = ctx.createStereoPanner();
    this.pan.pan.value = pan;
    this.out = ctx.createGain();
    this.out.gain.value = 0.0001;
    this.out.connect(this.pan).connect(dest);
    this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.Q.value = 2.5;
    this.shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(x * 2.6); }
    this.shaper.curve = curve;
    this.shaper.connect(this.lp).connect(this.out);
    const mk = (type: OscillatorType, g: number): [OscillatorNode, GainNode] => {
      const o = ctx.createOscillator();
      o.type = type;
      const gn = ctx.createGain();
      gn.gain.value = g;
      o.connect(gn).connect(this.shaper);
      o.start();
      return [o, gn];
    };
    [this.o1, this.g1] = mk('sawtooth', 0.35);
    [this.o2, this.g2] = mk('square', cylinders >= 8 ? 0.32 : 0.18);
    [this.o3, this.g3] = mk('sawtooth', 0.12);
    // V8 burble: amplitude LFO on the sub oscillator
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfoG = ctx.createGain();
    this.lfoG.gain.value = cylinders >= 8 ? 0.18 : 0.05;
    this.lfo.connect(this.lfoG).connect(this.g2.gain);
    this.lfo.start();
    // intake/exhaust noise
    const ns = ctx.createBufferSource();
    ns.buffer = noiseBuf;
    ns.loop = true;
    this.noiseBp = ctx.createBiquadFilter();
    this.noiseBp.type = 'bandpass';
    this.noiseBp.Q.value = 0.9;
    this.noiseG = ctx.createGain();
    this.noiseG.gain.value = 0.0;
    ns.connect(this.noiseBp).connect(this.noiseG).connect(this.out);
    ns.start();
    // turbo whistle
    this.whistle = ctx.createOscillator();
    this.whistle.type = 'sine';
    this.whistleG = ctx.createGain();
    this.whistleG.gain.value = 0;
    this.whistle.connect(this.whistleG).connect(this.pan);
    this.whistle.start();
    // nitrous hiss
    const nn = ctx.createBufferSource();
    nn.buffer = noiseBuf;
    nn.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3000;
    this.nitroG = ctx.createGain();
    this.nitroG.gain.value = 0;
    nn.connect(hp).connect(this.nitroG).connect(this.pan);
    nn.start();
    this.out.gain.setTargetAtTime(0.22 * volume, ctx.currentTime, 0.3);
    this.volume = volume;
  }
  private volume: number;

  update(rpm: number, load: number, boost: number, nitro: boolean, limiter: boolean) {
    const t = this.ctx.currentTime;
    const f = Math.max(20, (rpm / 60) * (this.cyl / 2));
    const k = 0.04;
    this.o1.frequency.setTargetAtTime(f, t, k);
    this.o2.frequency.setTargetAtTime(f / 2, t, k);
    this.o3.frequency.setTargetAtTime(f * 2.01, t, k);
    this.lfo.frequency.setTargetAtTime(Math.max(3, f / 8), t, k);
    this.lp.frequency.setTargetAtTime(300 + rpm * 0.35 + load * 2200, t, 0.05);
    const l = limiter ? 0.35 : 1;
    this.g1.gain.setTargetAtTime((0.22 + load * 0.3) * l, t, 0.05);
    this.g3.gain.setTargetAtTime((0.05 + load * 0.14) * l, t, 0.05);
    this.noiseBp.frequency.setTargetAtTime(f * 3.5 + 200, t, 0.05);
    this.noiseG.gain.setTargetAtTime(0.03 + load * 0.12, t, 0.05);
    this.whistle.frequency.setTargetAtTime(2400 + boost * 3800 + rpm * 0.15, t, 0.08);
    this.whistleG.gain.setTargetAtTime(Math.max(0, boost) * 0.012 * this.volume, t, 0.1);
    this.nitroG.gain.setTargetAtTime(nitro ? 0.05 * this.volume : 0, t, 0.05);
    this.out.gain.setTargetAtTime((0.15 + load * 0.12) * this.volume, t, 0.08);
  }

  blowOff(boost: number) {
    const t = this.ctx.currentTime;
    if (boost < 0.3 || t - this.lastBlow < 0.3) return;
    this.lastBlow = t;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2600, t);
    bp.frequency.exponentialRampToValueAtTime(900, t + 0.4);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16 * Math.min(1.5, boost) * this.volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    s.connect(bp).connect(g).connect(this.pan);
    s.start(t, Math.random());
    s.stop(t + 0.5);
  }

  backfire() {
    const t = this.ctx.currentTime;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5 * this.volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    s.connect(lp).connect(g).connect(this.pan);
    s.start(t, Math.random());
    s.stop(t + 0.15);
  }

  stop() {
    const t = this.ctx.currentTime;
    this.out.gain.setTargetAtTime(0.0001, t, 0.15);
    this.whistleG.gain.setTargetAtTime(0, t, 0.1);
    this.nitroG.gain.setTargetAtTime(0, t, 0.1);
    setTimeout(() => {
      for (const o of [this.o1, this.o2, this.o3, this.whistle, this.lfo]) { try { o.stop(); } catch { /* */ } }
      this.pan.disconnect();
    }, 800);
  }
}

class Music {
  private ctx: AudioContext;
  private dest: GainNode;
  private timer: number | null = null;
  private step = 0;
  private next = 0;
  private noise: AudioBuffer;
  private mode: 'menu' | 'off' = 'off';
  constructor(ctx: AudioContext, dest: GainNode, noise: AudioBuffer) { this.ctx = ctx; this.dest = dest; this.noise = noise; }

  start() {
    if (this.mode === 'menu') return;
    this.mode = 'menu';
    this.next = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 50);
  }
  stop() {
    this.mode = 'off';
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
  }
  private schedule() {
    const spb = 60 / 112 / 4; // 16th notes at 112 bpm
    while (this.next < this.ctx.currentTime + 0.2) {
      this.play(this.step, this.next);
      this.step = (this.step + 1) % 64;
      this.next += spb;
    }
  }
  private tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, cutoff = 2000) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(this.dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  private hit(t: number, dur: number, freq: number, vol: number, type: BiquadFilterType) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.dest);
    s.start(t, Math.random());
    s.stop(t + dur + 0.02);
  }
  private play(step: number, t: number) {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const roots = [41.2, 36.71, 32.7, 36.71]; // E1 D1 C1 D1
    const root = roots[bar];
    // kick
    if (s === 0 || s === 8 || (s === 11 && bar % 2)) {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g).connect(this.dest);
      o.start(t);
      o.stop(t + 0.3);
    }
    if (s === 4 || s === 12) this.hit(t, 0.18, 1800, 0.25, 'bandpass');
    if (s % 2 === 0) this.hit(t, 0.04, 8000, 0.06, 'highpass');
    // bass
    const pattern = [0, 0, 12, 0, 7, 0, 12, 10, 0, 0, 12, 0, 7, 12, 10, 7];
    if (s % 2 === 0 || s === 15) this.tone(root * 2 * Math.pow(2, pattern[s] / 12), t, 0.16, 'sawtooth', 0.09, 600);
    // pad chord every bar
    if (s === 0) for (const iv of [0, 3, 7, 10]) this.tone(root * 8 * Math.pow(2, iv / 12), t, 1.9, 'triangle', 0.02, 1400);
    // arp
    if (s % 4 === 2) this.tone(root * 16 * Math.pow(2, [0, 7, 3, 10][(s / 4) | 0] / 12), t, 0.12, 'square', 0.015, 2500);
  }
}

export class AudioSys {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxG!: GainNode;
  private musicG!: GainNode;
  private noise!: AudioBuffer;
  private music: Music | null = null;
  volumes = { master: 0.8, music: 0.5, sfx: 0.9 };

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    try {
      this.ctx = new AudioContext();
    } catch {
      return;
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.connect(c.destination);
    this.sfxG = c.createGain();
    this.sfxG.connect(this.master);
    this.musicG = c.createGain();
    this.musicG.connect(this.master);
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.music = new Music(c, this.musicG, this.noise);
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.volumes.master;
    this.sfxG.gain.value = this.volumes.sfx;
    this.musicG.gain.value = this.volumes.music * 0.6;
  }

  engine(cylinders: number, volume = 1, pan = 0): EngineSound | null {
    if (!this.ctx) return null;
    return new EngineSound(this.ctx, this.sfxG, this.noise, cylinders, volume, pan);
  }

  musicOn(on: boolean) {
    if (!this.music) return;
    if (on) this.music.start(); else this.music.stop();
  }

  beep(freq: number, dur = 0.12, vol = 0.15, type: OscillatorType = 'square') {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxG);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  click() { this.beep(1400, 0.04, 0.06, 'triangle'); }
  hover() { this.beep(2200, 0.025, 0.025, 'sine'); }
  cash() { this.beep(1320, 0.08, 0.08, 'triangle'); setTimeout(() => this.beep(1760, 0.14, 0.08, 'triangle'), 70); }
  error() { this.beep(180, 0.2, 0.12, 'sawtooth'); }
  shift() {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 600;
    const g = c.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    s.connect(f).connect(g).connect(this.sfxG);
    s.start(t, Math.random());
    s.stop(t + 0.1);
  }
  crowd(on: boolean) {
    if (!this.ctx) return;
    if (on && !this.crowdNode) {
      const c = this.ctx;
      const s = c.createBufferSource();
      s.buffer = this.noise;
      s.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 900;
      f.Q.value = 0.4;
      const g = c.createGain();
      g.gain.value = 0.035;
      s.connect(f).connect(g).connect(this.sfxG);
      s.start();
      this.crowdNode = { s, g };
    } else if (!on && this.crowdNode) {
      const n = this.crowdNode;
      n.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
      setTimeout(() => { try { n.s.stop(); } catch { /* */ } }, 1200);
      this.crowdNode = null;
    }
  }
  cheer() {
    if (!this.ctx || !this.crowdNode) return;
    const g = this.crowdNode.g.gain, t = this.ctx.currentTime;
    g.setTargetAtTime(0.12, t, 0.1);
    g.setTargetAtTime(0.035, t + 1.5, 0.8);
  }
  private crowdNode: { s: AudioBufferSourceNode; g: GainNode } | null = null;
}

export const audio = new AudioSys();

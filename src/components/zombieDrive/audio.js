// Procedural sound for Zombie Drive: everything is synthesised with the Web Audio API,
// no audio files. Engine and tyres follow the car, weapons have their own voices,
// zombies groan around the player, and a small sequencer plays level music.

const SOUND_KEY = 'zombie-drive-sound';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Music per level: tempo, root note (midi), chord progression (semitone offsets of the
// chord root within the minor key), bass pattern (8th notes, semitones or null), drums.
const MUSIC = [
  {bpm: 96, root: 50, chords: [0, 8, 10, 7], bass: [0, null, 0, 0, null, 7, null, 10], hats: 2, arpDensity: 0.45, cutoff: 700},
  {bpm: 106, root: 52, chords: [0, 10, 8, 7], bass: [0, 0, null, 0, 12, null, 10, null], hats: 1, arpDensity: 0.6, cutoff: 900},
  {bpm: 116, root: 45, chords: [0, 8, 7, 5], bass: [0, 0, 7, 0, 0, 12, 10, 7], hats: 1, arpDensity: 0.75, cutoff: 1100},
];

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    try {
      this.enabled = window.localStorage.getItem(SOUND_KEY) !== '0';
    } catch (e) {
      /* ignore */
    }
    this.playing = false;
    this.music = null;
    this.lastHit = 0;
    this.groanT = 1.5;
  }

  // ------------------------------------------------------------------ setup
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.comp = ctx.createDynamicsCompressor();
      this.comp.threshold.value = -14;
      this.comp.ratio.value = 4;
      this.master.connect(this.comp).connect(ctx.destination);
      this.sfx = ctx.createGain();
      this.sfx.gain.value = 0.85;
      this.sfx.connect(this.master);
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = 0.32;
      this.musicGain.connect(this.master);
      this.noise = this.makeNoise();
      this.buildEngine();
      this.buildLaser();
      this.applyEnabled();
      this.onVisibility = () => {
        if (!this.ctx) return;
        if (document.hidden) this.ctx.suspend();
        else if (this.playing) this.ctx.resume();
      };
      document.addEventListener('visibilitychange', this.onVisibility);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  dispose() {
    if (this.onVisibility) document.removeEventListener('visibilitychange', this.onVisibility);
    this.stopMusic();
    if (this.ctx) this.ctx.close();
    this.ctx = null;
  }

  applyEnabled() {
    if (!this.master) return;
    this.master.gain.setTargetAtTime(this.enabled ? 0.72 : 0, this.ctx.currentTime, 0.05);
  }

  toggle() {
    this.enabled = !this.enabled;
    try {
      window.localStorage.setItem(SOUND_KEY, this.enabled ? '1' : '0');
    } catch (e) {
      /* ignore */
    }
    if (this.ctx) this.applyEnabled();
    return this.enabled;
  }

  makeNoise() {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  noiseSource() {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.loopStart = Math.random();
    return s;
  }

  // One-shot helper: gain envelope (attack, hold, release) around a chain of nodes.
  env(t, peak, attack, hold, release, dest) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    g.connect(dest || this.sfx);
    return g;
  }

  panner(pan) {
    if (!this.ctx.createStereoPanner) return null;
    const p = this.ctx.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    p.connect(this.sfx);
    return p;
  }

  // ------------------------------------------------------------------ engine & tyres
  buildEngine() {
    const ctx = this.ctx;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 500;
    this.engineFilter = lp;
    lp.connect(this.engineGain).connect(this.sfx);
    this.eng1 = ctx.createOscillator();
    this.eng1.type = 'sawtooth';
    this.eng2 = ctx.createOscillator();
    this.eng2.type = 'square';
    const g1 = ctx.createGain();
    g1.gain.value = 0.5;
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    this.eng1.connect(g1).connect(lp);
    this.eng2.connect(g2).connect(lp);
    // exhaust rasp
    const rasp = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 1.5;
    this.raspGain = ctx.createGain();
    this.raspGain.gain.value = 0;
    rasp.connect(bp).connect(this.raspGain).connect(lp);
    rasp.start();
    this.eng1.start();
    this.eng2.start();
    // tyres: rolling noise + skid
    const roll = this.noiseSource();
    const rbp = ctx.createBiquadFilter();
    rbp.type = 'bandpass';
    rbp.frequency.value = 260;
    rbp.Q.value = 0.8;
    this.rollGain = ctx.createGain();
    this.rollGain.gain.value = 0;
    roll.connect(rbp).connect(this.rollGain).connect(this.sfx);
    roll.start();
    const skid = this.noiseSource();
    const sbp = ctx.createBiquadFilter();
    sbp.type = 'bandpass';
    sbp.frequency.value = 1700;
    sbp.Q.value = 3;
    this.skidGain = ctx.createGain();
    this.skidGain.gain.value = 0;
    skid.connect(sbp).connect(this.skidGain).connect(this.sfx);
    skid.start();
  }

  /** Called every frame with the car state. */
  updateCar(dt, {speed, maxSpeed, throttle, steer, idle}) {
    if (!this.ctx || !this.playing) return;
    const t = this.ctx.currentTime;
    const s = Math.abs(speed) / maxSpeed;
    const rpm = idle ? 0.12 : clamp(0.18 + Math.abs(throttle) * 0.25 + s * 0.65, 0.1, 1.1);
    const f = 38 + rpm * 120;
    this.eng1.frequency.setTargetAtTime(f, t, 0.08);
    this.eng2.frequency.setTargetAtTime(f / 2, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(350 + rpm * 1600, t, 0.1);
    this.engineGain.gain.setTargetAtTime(idle ? 0.05 : 0.09 + rpm * 0.14, t, 0.1);
    this.raspGain.gain.setTargetAtTime(rpm * 0.35, t, 0.1);
    this.rollGain.gain.setTargetAtTime(idle ? 0 : clamp(s, 0, 1) * 0.16, t, 0.1);
    const skidding = !idle && Math.abs(steer) > 0 && Math.abs(speed) > 11;
    this.skidGain.gain.setTargetAtTime(skidding ? 0.12 * s : 0, t, skidding ? 0.05 : 0.15);
  }

  setPlaying(on) {
    this.playing = on;
    if (!this.ctx) return;
    if (!on) {
      const t = this.ctx.currentTime;
      this.engineGain.gain.setTargetAtTime(0, t, 0.2);
      this.raspGain.gain.setTargetAtTime(0, t, 0.2);
      this.rollGain.gain.setTargetAtTime(0, t, 0.2);
      this.skidGain.gain.setTargetAtTime(0, t, 0.1);
      this.laserGain.gain.setTargetAtTime(0, t, 0.05);
      if (this.whine) this.whine.gain.setTargetAtTime(0, t, 0.1);
    }
  }

  // ------------------------------------------------------------------ weapons
  shot(stage) {
    if (!this.ctx || !this.playing) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const mini = stage === 2;
    // crack: filtered noise burst
    const n = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = mini ? rand(2200, 2800) : rand(1000, 1400);
    bp.Q.value = 0.7;
    n.connect(bp).connect(this.env(t, mini ? 0.35 : 0.55, 0.003, 0.01, mini ? 0.06 : 0.11));
    n.start(t, Math.random() * 1.5);
    n.stop(t + 0.2);
    // thump: pitched sine drop
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(mini ? 240 : 190, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.1);
    o.connect(this.env(t, mini ? 0.3 : 0.6, 0.002, 0.02, 0.12));
    o.start(t);
    o.stop(t + 0.2);
  }

  minigunSpin(heat) {
    if (!this.ctx || !this.playing) return;
    const ctx = this.ctx;
    if (!this.whine) {
      this.whineOsc = ctx.createOscillator();
      this.whineOsc.type = 'triangle';
      this.whine = ctx.createGain();
      this.whine.gain.value = 0;
      this.whineOsc.connect(this.whine).connect(this.sfx);
      this.whineOsc.start();
    }
    const t = ctx.currentTime;
    this.whineOsc.frequency.setTargetAtTime(180 + heat * 900, t, 0.08);
    this.whine.gain.setTargetAtTime(heat * 0.07, t, 0.08);
  }

  buildLaser() {
    const ctx = this.ctx;
    this.laserGain = ctx.createGain();
    this.laserGain.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    lp.connect(this.laserGain).connect(this.sfx);
    const o1 = ctx.createOscillator();
    o1.type = 'sawtooth';
    o1.frequency.value = 110;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = 660;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 9;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 35;
    lfo.connect(lfoG).connect(o2.frequency);
    const g2 = ctx.createGain();
    g2.gain.value = 0.4;
    o1.connect(lp);
    o2.connect(g2).connect(lp);
    o1.start();
    o2.start();
    lfo.start();
  }

  laser(on) {
    if (!this.ctx || !this.playing) return;
    this.laserGain.gain.setTargetAtTime(on ? 0.16 : 0, this.ctx.currentTime, on ? 0.04 : 0.08);
  }

  // ------------------------------------------------------------------ impacts
  hit() {
    if (!this.ctx || !this.playing) return;
    const t = this.ctx.currentTime;
    if (t - this.lastHit < 0.05) return;
    this.lastHit = t;
    const n = this.noiseSource();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    n.connect(lp).connect(this.env(t, 0.45, 0.003, 0.02, 0.08));
    n.start(t, Math.random() * 1.5);
    n.stop(t + 0.15);
  }

  zombieDie(pan) {
    if (!this.ctx || !this.playing) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dest = this.panner(pan) || this.sfx;
    const n = this.noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1200, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    n.connect(lp).connect(this.env(t, 0.4, 0.005, 0.05, 0.3, dest));
    n.start(t, Math.random() * 1.5);
    n.stop(t + 0.4);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(rand(160, 220), t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.35);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    o.connect(f).connect(this.env(t, 0.3, 0.01, 0.1, 0.3, dest));
    o.start(t);
    o.stop(t + 0.45);
  }

  groan(pan, vol, kind) {
    if (!this.ctx || !this.playing) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dest = this.panner(pan) || this.sfx;
    const big = kind === 'brute' || kind === 'bloater';
    const fast = kind === 'runner' || kind === 'crawler';
    const f0 = big ? rand(55, 80) : fast ? rand(150, 220) : rand(85, 140);
    const dur = big ? rand(1.2, 1.8) : fast ? rand(0.3, 0.5) : rand(0.6, 1.1);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0 * (fast ? 0.8 : 1.15), t);
    o.frequency.exponentialRampToValueAtTime(f0, t + dur * 0.3);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.7, t + dur);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = fast ? 11 : rand(4, 7);
    const lfoG = ctx.createGain();
    lfoG.gain.value = f0 * 0.06;
    lfo.connect(lfoG).connect(o.frequency);
    // two formants give it a throaty vowel
    const mix = ctx.createGain();
    for (const [freq, q, g] of [
      [big ? 320 : 480, 4, 1],
      [big ? 900 : 1300, 6, 0.5],
    ]) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = q;
      const bg = ctx.createGain();
      bg.gain.value = g;
      o.connect(bp).connect(bg).connect(mix);
    }
    mix.connect(this.env(t, vol * (big ? 1.5 : 1.3), dur * 0.25, dur * 0.4, dur * 0.35, dest));
    o.start(t);
    lfo.start(t);
    o.stop(t + dur + 0.1);
    lfo.stop(t + dur + 0.1);
  }

  thud(strength = 1) {
    if (!this.ctx || !this.playing) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.25);
    o.connect(this.env(t, 0.7 * strength, 0.005, 0.05, 0.25));
    o.start(t);
    o.stop(t + 0.35);
    const n = this.noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    n.connect(lp).connect(this.env(t, 0.35 * strength, 0.005, 0.03, 0.15));
    n.start(t, Math.random() * 1.5);
    n.stop(t + 0.25);
  }

  crunch() {
    if (!this.ctx || !this.playing) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const n = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 500;
    bp.Q.value = 0.6;
    n.connect(bp).connect(this.env(t, 0.5, 0.005, 0.08, 0.25));
    n.start(t, Math.random() * 1.5);
    n.stop(t + 0.4);
    this.thud(0.8);
  }

  whoosh() {
    if (!this.ctx || !this.playing) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const n = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 2;
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(2200, t + 0.5);
    n.connect(bp).connect(this.env(t, 0.8, 0.15, 0.1, 0.3));
    n.start(t, Math.random() * 1.5);
    n.stop(t + 0.7);
  }

  // ------------------------------------------------------------------ jingles
  notes(seq, type = 'square', vol = 0.18, step = 0.13) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    seq.forEach((n, i) => {
      if (n == null) return;
      const t = t0 + i * step;
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = midi(n);
      o.connect(this.env(t, vol, 0.01, step * 0.6, 0.25));
      o.start(t);
      o.stop(t + step + 0.4);
    });
  }

  upgrade() {
    this.notes([72, 76, 79, 84, null, 84, 88], 'square', 0.26, 0.11);
  }

  levelComplete() {
    this.notes([67, 71, 74, 79, 78, 79, null, 83], 'triangle', 0.4, 0.16);
  }

  gameOver() {
    this.notes([62, 61, 59, 57, null, 50], 'sawtooth', 0.28, 0.26);
  }

  // ------------------------------------------------------------------ music sequencer
  startMusic(levelIndex) {
    if (!this.ctx) return;
    this.stopMusic();
    const cfg = MUSIC[Math.min(levelIndex, MUSIC.length - 1)];
    const m = {cfg, step: 0, next: this.ctx.currentTime + 0.1, secPerStep: 60 / cfg.bpm / 4};
    // pad voice: three detuned saws through a slow filter
    const ctx = this.ctx;
    m.padGain = ctx.createGain();
    m.padGain.gain.value = 0;
    m.padFilter = ctx.createBiquadFilter();
    m.padFilter.type = 'lowpass';
    m.padFilter.frequency.value = cfg.cutoff;
    m.padFilter.Q.value = 2;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoG = ctx.createGain();
    lfoG.gain.value = cfg.cutoff * 0.5;
    lfo.connect(lfoG).connect(m.padFilter.frequency);
    lfo.start();
    m.padFilter.connect(m.padGain).connect(this.musicGain);
    m.padOscs = [-7, 0, 7].map((cents) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.detune.value = cents;
      const g = ctx.createGain();
      g.gain.value = 0.11;
      o.connect(g).connect(m.padFilter);
      o.start();
      return o;
    });
    m.lfo = lfo;
    m.timer = setInterval(() => this.schedule(m), 90);
    this.music = m;
    this.musicGain.gain.setTargetAtTime(0.32, ctx.currentTime, 0.5);
  }

  stopMusic() {
    const m = this.music;
    if (!m) return;
    clearInterval(m.timer);
    const t = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(0, t, 0.4);
    setTimeout(() => {
      try {
        m.padOscs.forEach((o) => o.stop());
        m.lfo.stop();
      } catch (e) {
        /* already stopped */
      }
    }, 1500);
    this.music = null;
  }

  schedule(m) {
    const ctx = this.ctx;
    const ahead = 0.35;
    while (m.next < ctx.currentTime + ahead) {
      this.playStep(m, m.step, m.next);
      m.next += m.secPerStep;
      m.step += 1;
    }
  }

  playStep(m, step, t) {
    const {cfg} = m;
    const bar = Math.floor(step / 16);
    const s16 = step % 16;
    const chordRoot = cfg.root + cfg.chords[Math.floor(bar / 2) % cfg.chords.length];
    const minorThird = chordRoot + 3;
    const fifth = chordRoot + 7;
    // pad chord changes every two bars
    if (step % 32 === 0) {
      m.padOscs[0].frequency.setTargetAtTime(midi(chordRoot - 12), t, 0.3);
      m.padOscs[1].frequency.setTargetAtTime(midi(minorThird - 12), t, 0.3);
      m.padOscs[2].frequency.setTargetAtTime(midi(fifth - 12), t, 0.3);
      m.padGain.gain.setTargetAtTime(0.5, t, 1.2);
    }
    // drums
    if (s16 === 0 || s16 === 8 || (s16 === 10 && bar % 2 === 1)) this.kick(t);
    if (s16 === 4 || s16 === 12) this.snare(t);
    if (s16 % cfg.hats === 0) this.hat(t, s16 === 14);
    // bass, 8th notes
    if (s16 % 2 === 0) {
      const n = cfg.bass[(s16 / 2) % cfg.bass.length];
      if (n != null) this.bass(midi(chordRoot - 24 + n), t, m.secPerStep * 1.8);
    }
    // arpeggio
    if (Math.random() < cfg.arpDensity && s16 % 2 === 1) {
      const pool = [chordRoot, minorThird, fifth, chordRoot + 12, minorThird + 12];
      this.arp(midi(pool[Math.floor(Math.random() * pool.length)]), t, m.secPerStep * 0.9);
    }
  }

  kick(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    o.connect(this.env(t, 0.9, 0.003, 0.05, 0.22, this.musicGain));
    o.start(t);
    o.stop(t + 0.35);
  }

  snare(t) {
    const ctx = this.ctx;
    const n = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 0.9;
    n.connect(bp).connect(this.env(t, 0.35, 0.003, 0.03, 0.14, this.musicGain));
    n.start(t, Math.random() * 1.5);
    n.stop(t + 0.25);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
    o.connect(this.env(t, 0.3, 0.003, 0.02, 0.1, this.musicGain));
    o.start(t);
    o.stop(t + 0.2);
  }

  hat(t, open) {
    const ctx = this.ctx;
    const n = this.noiseSource();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    n.connect(hp).connect(this.env(t, open ? 0.14 : 0.1, 0.002, 0.01, open ? 0.22 : 0.04, this.musicGain));
    n.start(t, Math.random() * 1.5);
    n.stop(t + 0.3);
  }

  bass(freq, t, len) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(220, t + len);
    o.connect(lp).connect(this.env(t, 0.42, 0.01, len * 0.6, len * 0.4, this.musicGain));
    o.start(t);
    o.stop(t + len + 0.2);
  }

  arp(freq, t, len) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    o.connect(this.env(t, 0.12, 0.005, len * 0.3, len, this.musicGain));
    o.start(t);
    o.stop(t + len * 1.5 + 0.1);
  }
}

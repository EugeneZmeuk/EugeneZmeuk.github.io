import * as THREE from 'three';
import {BEST_KEY, CAR_STAGES, LEVELS, THROWABLES, WEAPONS, ZOMBIES} from './config';
import {bakeGeometry, bakedMaterial, loadAll, loadJson, prepareScene} from './assets';
import {City} from './city';
import {GameAudio} from './audio';
import {Diagnostics} from './diagnostics';

const ZOMBIE_KINDS = Object.keys(ZOMBIES);
const TURRET_PARTS = ['mg', 'minigun', 'laser', 'crossbar', 'shield', 'capacitor', 'cap_light', 'cradle', 'pintle'];
const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  fire: ['Space'],
  brake: ['ShiftLeft', 'ShiftRight'],
};

const readBest = () => {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch (e) {
    return 0;
  }
};
const writeBest = (v) => {
  try {
    window.localStorage.setItem(BEST_KEY, String(v));
  } catch (e) {
    /* ignore */
  }
};

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (weights) => {
  const total = weights.reduce((s, w) => s + w[1], 0);
  let r = Math.random() * total;
  for (const [k, w] of weights) {
    r -= w;
    if (r <= 0) return k;
  }
  return weights[weights.length - 1][0];
};

/** Small pooled particle system for blood, sparks and dust. */
class Particles {
  constructor(scene, max = 600) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.next = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const sprite = new THREE.CanvasTexture(c);
    this.points = new THREE.Points(
      g,
      new THREE.PointsMaterial({size: 0.26, map: sprite, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false}),
    );
    this.points.frustumCulled = false;
    scene.add(this.points);
    for (let i = 0; i < max; i++) this.pos[i * 3 + 1] = -100;
  }
  burst(p, color, n, speed, up = 2) {
    for (let k = 0; k < n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.max;
      this.pos.set([p.x, p.y, p.z], i * 3);
      this.col.set([color.r * rand(0.6, 1.1), color.g * rand(0.6, 1.1), color.b * rand(0.6, 1.1)], i * 3);
      this.vel.set([rand(-speed, speed), rand(0.5, speed) + up, rand(-speed, speed)], i * 3);
      this.life[i] = rand(0.3, 0.8);
    }
  }
  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      this.vel[i * 3 + 1] -= 14 * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.life[i] <= 0 || this.pos[i * 3 + 1] < 0) {
        this.life[i] = 0;
        this.pos[i * 3 + 1] = -100;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

export class Game {
  constructor({container, base, onHud, onState, onSound}) {
    this.container = container;
    this.audio = new GameAudio();
    this.diag = new Diagnostics();
    this.onSound = onSound;
    this.groanT = 1.5;
    this.base = base;
    this.onHud = onHud;
    this.onState = onState;
    this.phase = 'loading';
    this.keys = {};
    this.mouse = new THREE.Vector2();
    this.mouseDown = false;
    this.best = readBest();
    this.levelIndex = 0;
    this.score = 0;
    this.lastHud = 0;
    this.shotCount = 0;
    this.disposed = false;
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
  }

  // ---------------------------------------------------------------- setup
  async init() {
    const el = this.container;
    this.renderer = new THREE.WebGLRenderer({antialias: true, powerPreference: 'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    el.appendChild(this.renderer.domElement);
    this.diag.attach(this.renderer);
    this.diag.onFatal = (message) => this.fail(message);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.5, 900);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -95;
    sc.right = sc.top = 95;
    sc.near = 1;
    sc.far = 400;
    this.sun.shadow.bias = -0.0008;
    this.ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.hemi, this.ambient, this.sun, this.sun.target);
    this.levelGroup = new THREE.Group();
    this.scene.add(this.levelGroup);
    this.particles = new Particles(this.scene);
    this.resize();
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.bindInput();

    const names = ['pickup0', 'pickup1', 'pickup2', 'pickup3', 'lamp_post']
      .concat(ZOMBIE_KINDS.map((k) => `zombie_${k}`))
      .concat(THROWABLES.map((t) => `obj${t.id}`));
    this.setState({phase: 'loading', progress: 0});
    this.assets = await loadAll(this.base, names, (p) => this.setState({phase: 'loading', progress: p}));
    if (this.disposed) return;
    this.zombieGeo = {};
    for (const k of ZOMBIE_KINDS) this.zombieGeo[k] = bakeGeometry(this.assets[`zombie_${k}`]);
    this.objGeo = THROWABLES.map((t) => bakeGeometry(this.assets[`obj${t.id}`]));
    this.lampGeo = bakeGeometry(this.assets.lamp_post);
    this.bakedMat = bakedMaterial();
    this.tracerGeo = new THREE.BoxGeometry(0.07, 0.07, 1);
    this.tracers = [];
    this.setState({phase: 'menu', best: this.best});
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  resize() {
    const w = this.container.clientWidth || 960;
    const h = this.container.clientHeight || 540;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  bindInput() {
    this.onKeyDown = (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.code === 'KeyM' && !e.repeat) this.toggleSound();
      this.keys[e.code] = true;
    };
    this.onKeyUp = (e) => {
      this.keys[e.code] = false;
    };
    this.onMouseMove = (e) => {
      const r = this.renderer.domElement.getBoundingClientRect();
      this.mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    this.onMouseDown = (e) => {
      if (e.button === 0) this.mouseDown = true;
    };
    this.onMouseUp = () => {
      this.mouseDown = false;
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    const c = this.renderer.domElement;
    c.addEventListener('mousemove', this.onMouseMove);
    c.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  toggleSound() {
    const on = this.audio.toggle();
    this.onSound && this.onSound(on);
    return on;
  }

  dispose() {
    this.disposed = true;
    this.diag.detach();
    this.audio.dispose();
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mouseup', this.onMouseUp);
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }

  setState(s) {
    const prev = this.phase;
    this.phase = s.phase;
    if (prev !== s.phase) {
      this.diag.log('phase', {phase: s.phase, level: this.level && this.level.id, score: this.score});
      this.onPhaseChange(prev, s.phase);
    }
    this.onState && this.onState(s);
  }

  onPhaseChange(prev, phase) {
    const a = this.audio;
    a.setPlaying(phase === 'playing');
    if (phase === 'playing') a.startMusic(this.levelIndex);
    else if (prev === 'playing') a.stopMusic();
    if (phase === 'dead') a.gameOver();
    if (phase === 'levelComplete' || phase === 'won') a.levelComplete();
  }

  /** Stereo position of a world point relative to the car, -1 (left) to 1 (right). */
  panOf(pos) {
    const dx = pos.x - this.car.pos.x;
    const dz = pos.z - this.car.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    return ((dx * Math.cos(this.car.heading) - dz * Math.sin(this.car.heading)) / d) * 0.8;
  }

  updateGroans(dt) {
    this.groanT -= dt;
    if (this.groanT > 0) return;
    this.groanT = rand(0.5, 1.6);
    const near = this.zombies.filter((z) => !z.dead && z.pos.distanceTo(this.car.pos) < 45);
    if (!near.length) return;
    const z = near[Math.floor(Math.random() * near.length)];
    const vol = Math.max(0.15, 1 - z.pos.distanceTo(this.car.pos) / 45);
    this.audio.groan(this.panOf(z.pos), vol, z.kind);
  }

  key(name) {
    return KEYS[name].some((k) => this.keys[k]);
  }

  // ---------------------------------------------------------------- levels
  async startLevel(index, keepScore = true) {
    this.audio.ensure();
    this.levelIndex = index;
    const lvl = LEVELS[index];
    this.diag.log('level', {level: lvl.id});
    this.level = lvl;
    if (!keepScore) this.score = 0;
    this.levelScore = this.score;
    this.kills = 0;
    this.setState({phase: 'loading', progress: 0.9, level: lvl});
    let data;
    try {
      data = await loadJson(`${this.base}data/zombie-drive/${lvl.id}.json`);
    } catch (e) {
      this.diag.crash('level-load', e, {level: lvl.id});
      this.fail(`Could not load ${lvl.title}. Check your connection and reload.`);
      return;
    }
    if (this.disposed) return;
    // clear previous level
    while (this.levelGroup.children.length) this.levelGroup.remove(this.levelGroup.children[0]);
    if (this.city) this.city.dispose();
    this.zombies = [];
    this.projectiles = [];
    this.debris = [];
    for (const t of this.tracers) this.scene.remove(t.mesh);
    this.tracers = [];
    this.hideLasers();
    this.city = new City(data, lvl);
    this.levelGroup.add(this.city.group);
    this.city.placeLamps(this.lampGeo, this.bakedMat);
    // lighting
    this.setSky(lvl.sky);
    this.scene.fog = new THREE.Fog(lvl.fog[0], lvl.fog[1], lvl.fog[2]);
    this.hemi.color.set(lvl.hemi[0]);
    this.hemi.groundColor.set(lvl.hemi[1]);
    this.hemi.intensity = lvl.hemi[2];
    this.ambient.intensity = lvl.ambient;
    this.sun.color.set(lvl.sun[0]);
    this.sun.intensity = lvl.sun[1];
    this.sunOffset = new THREE.Vector3(...lvl.sun[2]);
    this.renderer.toneMappingExposure = lvl.exposure || 1.05;
    // car
    this.stage = lvl.startStage;
    this.setCarModel(this.stage, true);
    this.car.pos.copy(this.city.start);
    const toFinish = this.city.finish.clone().sub(this.city.start);
    this.car.heading = this.city.openHeading(this.city.start, Math.atan2(-toFinish.x, -toFinish.z));
    this.car.speed = 0;
    this.car.hp = CAR_STAGES[this.stage].hp;
    this.weaponHeat = 0;
    this.fireCooldown = 0;
    this.spawnTimer = 0;
    this.elapsed = 0;
    this.msg = null;
    this.setState({phase: 'intro', level: lvl, index, best: this.best});
    this.pushHud(true);
  }

  /** Vertical gradient sky, wrapped round the scene so it stays put as the camera turns. */
  setSky([top, bottom]) {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    const hi = `#${new THREE.Color(top).getHexString()}`;
    const lo = `#${new THREE.Color(bottom).getHexString()}`;
    g.addColorStop(0, hi);
    g.addColorStop(0.46, lo);
    g.addColorStop(1, lo);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    if (this.scene.background && this.scene.background.isTexture) this.scene.background.dispose();
    this.scene.background = tex;
  }

  play() {
    if (this.phase === 'intro' || this.phase === 'dead') {
      if (this.phase === 'dead') {
        this.startLevel(this.levelIndex).then(() => this.play());
        return;
      }
      this.setState({phase: 'playing', level: this.level});
    }
  }

  setCarModel(stage, fresh) {
    const old = this.car;
    const model = prepareScene(this.assets[`pickup${stage}`].clone());
    // turret pivot: gather the gun assembly and parent it to a yaw pivot in the cargo bed
    const pivot = new THREE.Object3D();
    const gunY = stage >= 2 ? 1.26 : 1.14;
    pivot.position.set(0, gunY, 1.2);
    const parts = [];
    model.traverse((o) => {
      if (TURRET_PARTS.some((p) => o.name === p || o.name.startsWith(p + '.') || o.name.startsWith(p + '_'))) {
        if (!o.name.startsWith('pintle') && !o.name.startsWith('cradle')) parts.push(o);
      }
    });
    model.add(pivot);
    for (const p of parts) if (!parts.includes(p.parent)) pivot.attach(p);
    const wheels = [];
    model.traverse((o) => {
      if (o.name.startsWith('tire') || o.name.startsWith('rim')) wheels.push(o);
    });
    const car = old && !fresh ? old : {pos: new THREE.Vector3(), heading: 0, speed: 0, hp: 100, turret: 0};
    if (old && old.model) this.scene.remove(old.model);
    car.model = model;
    car.pivot = pivot;
    car.wheels = wheels;
    car.wheelRot = car.wheelRot || 0;
    if (!car.lights) {
      const mk = (x) => {
        const s = new THREE.SpotLight(0xfff1d0, 0, 60, 0.45, 0.5, 1);
        s.position.set(x, 0.8, -2.5);
        s.target.position.set(x, 0.2, -30);
        return s;
      };
      car.lights = [mk(-0.6), mk(0.6)];
      car.fill = new THREE.PointLight(0xdfe6ff, 0, 22, 1.4);
      car.fill.position.set(0, 4.5, 1);
    }
    const night = this.level && this.level.night;
    for (const l of car.lights) {
      model.add(l, l.target);
      l.intensity = night ? 150 : 0;
    }
    model.add(car.fill);
    car.fill.intensity = night ? 34 : 0;
    this.scene.add(model);
    this.car = car;
    this.maxHp = CAR_STAGES[stage].hp;
  }

  upgrade() {
    if (this.stage >= 3) return;
    const hpFrac = this.car.hp / this.maxHp;
    this.stage += 1;
    this.setCarModel(this.stage, false);
    this.car.hp = Math.min(this.maxHp, this.maxHp * Math.max(hpFrac, 0.6));
    this.msg = {text: `UPGRADE: ${WEAPONS[this.stage].name} · ${CAR_STAGES[this.stage].name}`, t: 4};
    this.audio.upgrade();
    this.diag.log('upgrade', {stage: this.stage, score: this.score});
    this.particles.burst(this.car.pos.clone().setY(1.5), new THREE.Color(0xffd27a), 80, 6, 4);
  }

  // ---------------------------------------------------------------- loop
  loop(t) {
    if (this.disposed || this.phase === 'crashed') return;
    this.raf = requestAnimationFrame((tt) => this.loop(tt));
    const ms = t - this.lastTime;
    const dt = Math.min(0.05, ms / 1000);
    this.lastTime = t;
    this.diag.frame(ms, this.phase === 'playing' && !this.paused);
    if (this.city && this.car) {
      // Without this catch an error here would leave a frozen picture and no explanation.
      try {
        if (this.phase !== 'playing') this.idleCamera(dt);
        else if (!this.paused) this.update(dt);
        this.particles.update(dt);
        this.updateTracers(dt);
        this.updateSun();
        this.city.update(this.car.pos, t / 1000);
        this.renderer.render(this.scene, this.camera);
      } catch (e) {
        this.diag.crash('loop', e, this.snapshot());
        this.fail(e.message);
      }
    }
  }

  /** State worth having in a report. */
  snapshot() {
    const c = this.car;
    return {
      level: this.level && this.level.id,
      phase: this.phase,
      stage: this.stage,
      score: this.score,
      kills: this.kills,
      car: c ? {x: Math.round(c.pos.x), z: Math.round(c.pos.z), heading: +c.heading.toFixed(2), speed: +c.speed.toFixed(1), hp: Math.round(c.hp)} : null,
      zombies: this.zombies ? this.zombies.length : 0,
    };
  }

  /** Stop the game and tell the player, instead of carrying on broken. */
  fail(message) {
    this.diag.save();
    try {
      this.audio.setPlaying(false);
      this.audio.stopMusic();
    } catch (e) {
      /* audio is the least of our problems here */
    }
    this.setState({phase: 'crashed', error: message});
  }

  setPaused(on) {
    if (this.phase !== 'playing') return;
    this.paused = on;
    this.keys = {};
    this.mouseDown = false;
    this.audio.setPlaying(!on);
  }

  idleCamera(dt) {
    this.elapsed += dt;
    const c = this.car.pos;
    const a = this.elapsed * 0.25;
    this.camera.position.set(c.x + Math.sin(a) * 14, 6, c.z + Math.cos(a) * 14);
    this.camera.lookAt(c.x, 1, c.z);
  }

  updateSun() {
    const c = this.car.pos;
    this.sun.position.copy(c).add(this.sunOffset);
    this.sun.target.position.copy(c);
    this.sun.target.updateMatrixWorld();
  }

  update(dt) {
    this.elapsed += dt;
    this.updateCar(dt);
    this.updateTurret(dt);
    this.updateZombies(dt);
    this.updateGroans(dt);
    this.updateProjectiles(dt);
    this.updateDebris(dt);
    this.spawn(dt);
    this.updateCamera(dt);
    if (this.msg) {
      this.msg.t -= dt;
      if (this.msg.t <= 0) this.msg = null;
    }
    // upgrade threshold
    if (this.stage === this.level.startStage && this.score - this.levelScore >= this.level.upgradeAt) this.upgrade();
    // level end conditions
    if (this.car.hp <= 0) {
      this.car.hp = 0;
      this.setState({phase: 'dead', level: this.level, score: this.score, best: this.best});
    } else if (this.kills >= this.level.goalKills && this.car.pos.distanceTo(this.city.finish) < 8) {
      if (this.levelIndex >= LEVELS.length - 1) this.setState({phase: 'won', score: this.score, best: this.best});
      else this.setState({phase: 'levelComplete', level: this.level, index: this.levelIndex, score: this.score, best: this.best});
    }
    this.pushHud();
  }

  // ---------------------------------------------------------------- car
  updateCar(dt) {
    const car = this.car;
    const st = CAR_STAGES[this.stage];
    const throttle = (this.key('up') ? 1 : 0) - (this.key('down') ? 1 : 0);
    const steer = (this.key('left') ? 1 : 0) - (this.key('right') ? 1 : 0);
    if (throttle > 0) car.speed += st.accel * dt;
    else if (throttle < 0) car.speed -= (car.speed > 0 ? st.accel * 1.6 : st.accel * 0.6) * dt;
    if (this.key('brake')) car.speed *= Math.max(0, 1 - 3 * dt);
    car.speed -= car.speed * 0.45 * dt;
    car.speed = THREE.MathUtils.clamp(car.speed, -st.maxSpeed * 0.4, st.maxSpeed);
    // A little steering is kept at a crawl, otherwise a car pressed against a wall cannot turn away.
    const grip = Math.max(Math.abs(car.speed) / 8, throttle ? 0.3 : 0);
    const direction = Math.abs(car.speed) > 0.5 ? Math.sign(car.speed) : throttle;
    const turned = car.heading + steer * st.turn * Math.min(grip, 1) * direction * dt;
    if (this.canTake(car.pos.x, car.pos.z, turned)) car.heading = turned;
    const fx = -Math.sin(car.heading);
    const fz = -Math.cos(car.heading);
    const nx = car.pos.x + fx * car.speed * dt;
    const nz = car.pos.z + fz * car.speed * dt;
    const scrape = Math.max(0, 1 - 4 * dt);
    const was = {x: car.pos.x, z: car.pos.z};
    if (this.canTake(nx, nz, car.heading)) {
      car.pos.x = nx;
      car.pos.z = nz;
    } else if (this.canTake(nx, car.pos.z, car.heading)) {
      car.pos.x = nx;
      car.speed *= scrape;
    } else if (this.canTake(car.pos.x, nz, car.heading)) {
      car.pos.z = nz;
      car.speed *= scrape;
    } else {
      const impact = Math.abs(car.speed);
      if (impact > 7) {
        this.audio.crunch();
        car.hp -= (impact - 7) * 1.2;
        this.particles.burst(car.pos.clone().add(new THREE.Vector3(fx * 2.5, 0.8, fz * 2.5)), new THREE.Color(0xffc060), 20, 4, 2);
      }
      // bounce off real hits only: a car leaning on a wall must stay free to pull away
      car.speed = impact > 3 ? car.speed * -0.3 : 0;
    }
    const moved = Math.hypot(car.pos.x - was.x, car.pos.z - was.z);
    car.pinned = throttle && moved < 0.2 * dt ? (car.pinned || 0) + dt : 0;
    if (car.pinned > 4 && !car.reported) {
      car.reported = true;
      this.diag.log('stuck', {
        ...this.snapshot().car,
        level: this.level.id,
        overlap: this.carOverlap(car.pos.x, car.pos.z, car.heading),
        canLeave: this.canDriveOut(),
      });
      this.diag.save();
    } else if (!car.pinned) {
      car.reported = false;
    }
    if (car.pinned > 1.2 && this.isWedged()) this.unstick();
    if (throttle) this.watchForPocket(dt);
    car.wheelRot += (car.speed * dt) / 0.4;
    for (const w of car.wheels) w.rotation.x = car.wheelRot;
    car.model.position.copy(car.pos);
    car.model.rotation.set(0, car.heading, 0);
    car.model.rotation.z = -steer * Math.min(1, Math.abs(car.speed) / 15) * 0.04;
    car.model.rotation.x = -throttle * 0.02;
    this.audio.updateCar(dt, {speed: car.speed, maxSpeed: st.maxSpeed, throttle, steer, idle: false});
  }

  /** How many points of the car's outline are inside something solid. */
  carOverlap(x, z, heading) {
    const fx = -Math.sin(heading);
    const fz = -Math.cos(heading);
    const rx = Math.cos(heading);
    const rz = -Math.sin(heading);
    let hits = 0;
    for (const [a, b] of [
      [2.4, 0.9],
      [2.4, -0.9],
      [-2.4, 0.9],
      [-2.4, -0.9],
      [0, 0.9],
      [0, -0.9],
    ]) {
      if (this.city.blocked(x + fx * a + rx * b, z + fz * a + rz * b)) hits += 1;
    }
    return hits;
  }

  carFits(x, z, heading) {
    return this.carOverlap(x, z, heading) === 0;
  }

  /** A move is fine if it is clear, or at least no worse when the car already overlaps something. */
  canTake(x, z, heading) {
    const next = this.carOverlap(x, z, heading);
    if (next === 0) return true;
    const now = this.carOverlap(this.car.pos.x, this.car.pos.z, this.car.heading);
    return now > 0 && next <= now;
  }

  /** No way out by driving: neither forward, nor back, nor by turning. */
  isWedged() {
    const {pos, heading} = this.car;
    if (!this.carFits(pos.x, pos.z, heading)) return true;
    const fx = -Math.sin(heading);
    const fz = -Math.cos(heading);
    for (const d of [0.4, -0.4]) {
      if (this.carFits(pos.x + fx * d, pos.z + fz * d, heading)) return false;
    }
    return !this.carFits(pos.x, pos.z, heading + 0.15) && !this.carFits(pos.x, pos.z, heading - 0.15);
  }

  /**
   * Catches a car shut in a pocket, say between trunks. Trying hard and going nowhere is not
   * proof, since it may just be a tight corner, so ask canDriveOut before moving anything.
   */
  watchForPocket(dt) {
    const car = this.car;
    const a = car.anchor;
    if (!a || Math.hypot(car.pos.x - a.x, car.pos.z - a.z) > 3) {
      car.anchor = {x: car.pos.x, z: car.pos.z, t: 0};
      return;
    }
    a.t += dt;
    if (a.t > 5) {
      car.anchor = null;
      if (!this.canDriveOut()) {
        this.diag.log('trapped', {...this.snapshot().car, level: this.level.id});
        this.unstick(3);
      }
    }
  }

  /** Search the moves the car can really make, and see if any sequence gets it clear. */
  canDriveOut(reach = 9, limit = 5000) {
    const {pos, heading} = this.car;
    const STEP = 0.8;
    const TURN = 0.26;
    const key = (x, z, h) => `${Math.round(x / STEP)},${Math.round(z / STEP)},${Math.round(h / TURN)}`;
    const seen = new Set([key(pos.x, pos.z, heading)]);
    const queue = [[pos.x, pos.z, heading]];
    for (let i = 0; i < queue.length && i < limit; i++) {
      const [x, z, h] = queue[i];
      if (Math.hypot(x - pos.x, z - pos.z) >= reach) return true;
      for (const d of [STEP, -STEP]) {
        for (const t of [0, TURN, -TURN]) {
          const nh = h + t;
          const nx = x - Math.sin(nh) * d;
          const nz = z - Math.cos(nh) * d;
          const k = key(nx, nz, nh);
          if (!seen.has(k) && this.carFits(nx, nz, nh)) {
            seen.add(k);
            queue.push([nx, nz, nh]);
          }
        }
      }
    }
    // running out of budget means the space is large, which is not a pocket
    return queue.length >= limit;
  }

  /** Move a stuck car to the nearest clear spot at least `from` metres off, keeping its heading if possible. */
  unstick(from = 0.5) {
    const car = this.car;
    this.diag.log('unstick', {...this.snapshot().car, level: this.level.id, from});
    for (let r = from; r <= 18; r += 0.5) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const x = car.pos.x + Math.cos(a) * r;
        const z = car.pos.z + Math.sin(a) * r;
        for (const h of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) {
          if (this.carFits(x, z, car.heading + h) && (from < 1 || this.city.clear(x, z, 4))) {
            car.pos.x = x;
            car.pos.z = z;
            car.heading += h;
            car.speed = 0;
            car.pinned = 0;
            return true;
          }
        }
      }
    }
    return false;
  }

  // ---------------------------------------------------------------- turret & weapons
  updateTurret(dt) {
    const car = this.car;
    // aim at the mouse on the gun plane
    const ray = new THREE.Raycaster();
    ray.setFromCamera(this.mouse, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.2);
    const target = new THREE.Vector3();
    if (ray.ray.intersectPlane(plane, target)) {
      car.pivot.getWorldPosition(this.tmp);
      const dx = target.x - this.tmp.x;
      const dz = target.z - this.tmp.z;
      const worldYaw = Math.atan2(-dx, -dz);
      car.turret = worldYaw - car.heading;
      car.pivot.rotation.y = car.turret;
      this.aimDir = new THREE.Vector3(dx, 0, dz).normalize();
    }
    const weapon = WEAPONS[this.stage];
    const firing = this.mouseDown || this.key('fire');
    if (weapon.laser) {
      this.updateLaser(dt, firing, weapon);
      return;
    }
    this.hideLasers();
    if (weapon.spinup) {
      this.weaponHeat = THREE.MathUtils.clamp(this.weaponHeat + (firing ? dt / weapon.spinup : -dt / weapon.spinup), 0, 1);
      this.audio.minigunSpin(this.weaponHeat);
      const spin = this.weaponHeat * 40 * dt;
      car.pivot.traverse((o) => {
        if (o.name.startsWith('minigun')) o.rotation.z += spin;
      });
    }
    this.fireCooldown -= dt;
    const ready = !weapon.spinup || this.weaponHeat > 0.9;
    if (firing && ready && this.fireCooldown <= 0) {
      this.fireCooldown = 1 / weapon.rate;
      const m = weapon.muzzles[this.shotCount % weapon.muzzles.length];
      this.shotCount += 1;
      this.shoot(m, weapon);
    }
  }

  shoot(muzzle, weapon) {
    const car = this.car;
    this.audio.shot(this.stage);
    const origin = new THREE.Vector3(...muzzle);
    car.pivot.localToWorld(origin);
    const dir = this.aimDir ? this.aimDir.clone() : new THREE.Vector3(-Math.sin(car.heading), 0, -Math.cos(car.heading));
    dir.x += rand(-weapon.spread, weapon.spread);
    dir.z += rand(-weapon.spread, weapon.spread);
    dir.normalize();
    const hit = this.rayZombies(origin, dir, weapon.range);
    let end;
    if (hit) {
      end = hit.point;
      this.damageZombie(hit.z, weapon.dmg, dir);
    } else {
      end = origin.clone().add(dir.clone().multiplyScalar(weapon.range));
      // stop the tracer at the first building
      let d = 0;
      while (d < weapon.range) {
        d += 1.5;
        const px = origin.x + dir.x * d;
        const pz = origin.z + dir.z * d;
        if (this.city.blocked(px, pz)) {
          end.set(px, origin.y, pz);
          this.particles.burst(end, new THREE.Color(0xffe0a0), 3, 2, 1);
          break;
        }
      }
    }
    this.addTracer(origin, end, weapon.color, 0.07);
    this.particles.burst(origin, new THREE.Color(0xffe6b0), 2, 1.5, 0.5);
  }

  rayZombies(origin, dir, range) {
    let best = null;
    for (const z of this.zombies) {
      if (z.dead) continue;
      const v = this.tmp.copy(z.pos).sub(origin);
      v.y = 0;
      const t = v.dot(dir);
      if (t < 0 || t > range) continue;
      const perp = Math.sqrt(Math.max(0, v.lengthSq() - t * t));
      if (perp < z.r && (!best || t < best.t)) best = {z, t};
    }
    if (!best) return null;
    return {z: best.z, point: origin.clone().add(dir.clone().multiplyScalar(best.t)).setY(1.1)};
  }

  hideLasers() {
    if (this.laserBeams) for (const b of this.laserBeams) b.visible = false;
  }

  updateLaser(dt, firing, weapon) {
    this.audio.laser(firing);
    this.audio.minigunSpin(0);
    if (!this.laserBeams) {
      const mk = () => {
        const core = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 1, 8, 1, true),
          new THREE.MeshBasicMaterial({color: 0xdfffff, transparent: true, opacity: 0.95}),
        );
        const glow = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.22, 1, 8, 1, true),
          new THREE.MeshBasicMaterial({color: weapon.color, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending}),
        );
        const g = new THREE.Group();
        g.add(core, glow);
        g.visible = false;
        this.scene.add(g);
        return g;
      };
      this.laserBeams = weapon.muzzles.map(() => mk());
    }
    const car = this.car;
    for (let i = 0; i < weapon.muzzles.length; i++) {
      const beam = this.laserBeams[i];
      beam.visible = firing;
      if (!firing) continue;
      const origin = new THREE.Vector3(...weapon.muzzles[i]);
      car.pivot.localToWorld(origin);
      const dir = this.aimDir ? this.aimDir.clone() : new THREE.Vector3(-Math.sin(car.heading), 0, -Math.cos(car.heading));
      let len = weapon.range;
      for (let d = 2; d < weapon.range; d += 1.5) {
        if (this.city.blocked(origin.x + dir.x * d, origin.z + dir.z * d)) {
          len = d;
          break;
        }
      }
      for (const z of this.zombies) {
        if (z.dead) continue;
        const v = this.tmp.copy(z.pos).sub(origin);
        v.y = 0;
        const t = v.dot(dir);
        if (t < 0 || t > len) continue;
        const perp = Math.sqrt(Math.max(0, v.lengthSq() - t * t));
        if (perp < z.r + 0.2) this.damageZombie(z, weapon.dps * dt, dir, true);
      }
      const end = origin.clone().add(dir.clone().multiplyScalar(len));
      const mid = origin.clone().lerp(end, 0.5);
      beam.position.copy(mid);
      beam.scale.set(1, len, 1);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      if (Math.random() < 0.4) this.particles.burst(end, new THREE.Color(weapon.color), 2, 2, 1);
    }
  }

  addTracer(a, b, color, life) {
    const mesh = new THREE.Mesh(this.tracerGeo, new THREE.MeshBasicMaterial({color}));
    const len = a.distanceTo(b);
    mesh.position.copy(a).lerp(b, 0.5);
    mesh.scale.set(1, 1, len);
    mesh.lookAt(b);
    this.scene.add(mesh);
    this.tracers.push({mesh, t: life});
  }

  updateTracers(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.t -= dt;
      if (t.t <= 0) {
        this.scene.remove(t.mesh);
        t.mesh.material.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------- zombies
  spawn(dt) {
    this.spawnTimer -= dt;
    const alive = this.zombies.filter((z) => !z.dead).length;
    if (alive >= this.level.alive || this.spawnTimer > 0) return;
    this.spawnTimer = 0.35;
    const kind = pick(this.level.spawn);
    const p = this.city.randomFreePoint(this.car.pos.x, this.car.pos.z, 35, 75);
    if (!p) return;
    this.spawnKind(kind, p);
  }

  spawnKind(kind, p) {
    const def = ZOMBIES[kind];
    const mesh = new THREE.Mesh(this.zombieGeo[kind], this.bakedMat);
    mesh.castShadow = true;
    mesh.position.copy(p);
    this.levelGroup.add(mesh);
    this.zombies.push({
      kind,
      def,
      mesh,
      pos: p,
      hp: def.hp * this.level.zombieHp,
      maxHp: def.hp * this.level.zombieHp,
      speed: def.speed * this.level.zombieSpeed * rand(0.85, 1.15),
      r: def.r,
      dead: false,
      deadT: 0,
      bob: Math.random() * 6,
      throwT: rand(1, 3),
      yaw: 0,
    });
  }

  updateZombies(dt) {
    const car = this.car;
    const carR = 1.7;
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      if (z.dead) {
        z.deadT += dt;
        z.mesh.rotation.x = Math.min(Math.PI / 2, z.deadT * 4) * (z.fallDir || 1);
        z.mesh.position.y = -Math.max(0, z.deadT - 1.2) * 0.6;
        if (z.deadT > 2.5) {
          this.levelGroup.remove(z.mesh);
          this.zombies.splice(i, 1);
        }
        continue;
      }
      const dx = car.pos.x - z.pos.x;
      const dz = car.pos.z - z.pos.z;
      const dist = Math.hypot(dx, dz);
      // despawn far away stragglers
      if (dist > 140) {
        this.levelGroup.remove(z.mesh);
        this.zombies.splice(i, 1);
        continue;
      }
      z.yaw = Math.atan2(-dx, -dz);
      const touching = dist < carR + z.r;
      if (!touching) {
        const step = z.speed * dt;
        let moved = false;
        for (const off of [0, 0.7, -0.7, 1.4, -1.4]) {
          const a = Math.atan2(dx, dz) + off;
          const nx = z.pos.x + Math.sin(a) * step;
          const nz = z.pos.z + Math.cos(a) * step;
          if (!this.city.blocked(nx, nz)) {
            z.pos.x = nx;
            z.pos.z = nz;
            moved = true;
            break;
          }
        }
        if (!moved) z.pos.x += rand(-0.5, 0.5) * dt;
        // crowd separation
        for (const o of this.zombies) {
          if (o === z || o.dead) continue;
          const ox = z.pos.x - o.pos.x;
          const oz = z.pos.z - o.pos.z;
          const d = Math.hypot(ox, oz);
          const min = z.r + o.r;
          if (d > 0.01 && d < min) {
            z.pos.x += (ox / d) * (min - d) * 0.5;
            z.pos.z += (oz / d) * (min - d) * 0.5;
          }
        }
      } else {
        const speed = Math.abs(car.speed);
        if (speed > 3.5) {
          // ramming
          const st = CAR_STAGES[this.stage];
          const dmg = speed * st.ram * (z.def.heavy ? 0.5 : 1);
          this.audio.thud(z.def.heavy ? 1 : 0.6);
          this.damageZombie(z, dmg, new THREE.Vector3(-dx, 0, -dz).normalize());
          car.hp -= st.ramSelf * (z.def.heavy ? 3 : 1);
          car.speed *= z.def.heavy ? 0.3 : 0.88;
        } else {
          car.hp -= z.def.dmg * this.level.zombieDmg * dt * 0.5;
          if (Math.random() < 4 * dt) {
            this.particles.burst(car.pos.clone().setY(1.2), new THREE.Color(0xff5050), 3, 2, 1);
            this.audio.hit();
          }
        }
      }
      if (z.def.throws) {
        z.throwT -= dt;
        if (z.throwT <= 0 && dist > 8 && dist < z.def.throwRange) {
          z.throwT = z.def.throwEvery * rand(0.8, 1.3);
          this.throwObject(z);
        }
      }
      z.bob += dt * z.speed * 2.2;
      z.mesh.position.set(z.pos.x, Math.abs(Math.sin(z.bob)) * 0.08, z.pos.z);
      z.mesh.rotation.set(Math.min(0.25, z.speed * 0.04), z.yaw, Math.sin(z.bob) * 0.08);
    }
  }

  damageZombie(z, dmg, dir, quiet) {
    z.hp -= dmg;
    if (!quiet) this.audio.hit();
    if (!quiet || Math.random() < 0.3) {
      this.particles.burst(z.pos.clone().setY(1.2), new THREE.Color(0x8a0a0a), quiet ? 2 : 6, 2.5, 1.5);
    }
    if (z.hp <= 0 && !z.dead) {
      z.dead = true;
      this.audio.zombieDie(this.panOf(z.pos));
      z.fallDir = dir && dir.dot(new THREE.Vector3(-Math.sin(z.yaw), 0, -Math.cos(z.yaw))) < 0 ? 1 : -1;
      this.kills += 1;
      this.score += z.def.score;
      if (this.score > this.best) {
        this.best = this.score;
        writeBest(this.best);
      }
      this.particles.burst(z.pos.clone().setY(1.0), new THREE.Color(0x8a0a0a), 18, 3.5, 2.5);
    }
  }

  // ---------------------------------------------------------------- thrown objects
  throwObject(z) {
    const idx = Math.floor(Math.random() * THROWABLES.length);
    const def = THROWABLES[idx];
    const mesh = new THREE.Mesh(this.objGeo[idx], this.bakedMat);
    mesh.scale.setScalar(def.scale * 0.8);
    mesh.castShadow = true;
    const start = z.pos.clone().setY(z.def.heavy ? 3.4 : 2.0);
    const T = 1.25;
    const car = this.car;
    const fx = -Math.sin(car.heading) * car.speed * T * 0.8;
    const fz = -Math.cos(car.heading) * car.speed * T * 0.8;
    const target = new THREE.Vector3(car.pos.x + fx, 1.0, car.pos.z + fz);
    const g = 16;
    const vel = new THREE.Vector3((target.x - start.x) / T, (target.y - start.y + 0.5 * g * T * T) / T, (target.z - start.z) / T);
    mesh.position.copy(start);
    this.levelGroup.add(mesh);
    this.projectiles.push({mesh, vel, g, dmg: def.dmg, spin: new THREE.Vector3(rand(-3, 3), rand(-3, 3), rand(-3, 3)), t: 0});
    this.msg = this.msg || {text: 'INCOMING!', t: 1.2};
    this.audio.whoosh();
  }

  updateProjectiles(dt) {
    const car = this.car;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.t += dt;
      p.vel.y -= p.g * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      p.mesh.rotation.z += p.spin.z * dt;
      const d = Math.hypot(p.mesh.position.x - car.pos.x, p.mesh.position.z - car.pos.z);
      const hitCar = d < 2.4 && p.mesh.position.y < 2.6 && p.t > 0.3;
      if (hitCar || p.mesh.position.y <= 0.3) {
        if (hitCar) {
          const armour = 1 - this.stage * 0.18;
          car.hp -= p.dmg * this.level.zombieDmg * armour;
          car.speed *= 0.8;
          this.audio.crunch();
          this.particles.burst(p.mesh.position.clone(), new THREE.Color(0xffc060), 20, 4, 2);
        } else {
          this.audio.thud(Math.max(0.1, 0.6 - d / 60));
          this.particles.burst(p.mesh.position.clone(), new THREE.Color(0x9a9080), 10, 2, 1);
        }
        p.mesh.position.y = 0.25;
        p.mesh.rotation.set(rand(-0.3, 0.3), rand(0, 6), rand(-0.3, 0.3));
        this.debris.push({mesh: p.mesh, t: 25});
        this.projectiles.splice(i, 1);
      }
    }
  }

  updateDebris(dt) {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.t -= dt;
      if (d.t <= 0) {
        this.levelGroup.remove(d.mesh);
        this.debris.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------- camera & HUD
  updateCamera(dt) {
    const car = this.car;
    const fx = -Math.sin(car.heading);
    const fz = -Math.cos(car.heading);
    const back = 9.5 + Math.abs(car.speed) * 0.12;
    const target = new THREE.Vector3(car.pos.x - fx * back, 4.3, car.pos.z - fz * back);
    const k = 1 - Math.exp(-dt * 5);
    this.camera.position.lerp(target, k);
    const look = new THREE.Vector3(car.pos.x + fx * 12, 3.0, car.pos.z + fz * 12);
    this.camLook = this.camLook ? this.camLook.lerp(look, k) : look;
    this.camera.lookAt(this.camLook);
  }

  pushHud(force) {
    const now = performance.now();
    if (!force && now - this.lastHud < 100) return;
    this.lastHud = now;
    const car = this.car;
    const fx = -Math.sin(car.heading);
    const fz = -Math.cos(car.heading);
    const rx = Math.cos(car.heading);
    const rz = -Math.sin(car.heading);
    const dx = this.city.finish.x - car.pos.x;
    const dz = this.city.finish.z - car.pos.z;
    const arrow = (Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz) * 180) / Math.PI;
    this.onHud &&
      this.onHud({
        score: this.score,
        best: this.best,
        hp: Math.max(0, Math.round(car.hp)),
        maxHp: this.maxHp,
        kills: this.kills,
        goal: this.level.goalKills,
        weapon: WEAPONS[this.stage].name,
        stage: this.stage,
        title: this.level.title,
        arrow,
        distance: Math.round(Math.hypot(dx, dz)),
        goalReached: this.kills >= this.level.goalKills,
        msg: this.msg ? this.msg.text : null,
        nextUpgrade: this.stage === this.level.startStage ? Math.max(0, this.level.upgradeAt - (this.score - this.levelScore)) : 0,
      });
  }
}

import React, {useEffect, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './kill-bugs.module.css';

// Based on KillBills (github.com/EugeneZmeuk/KillBills), redrawn in OsmAnd style.
const WIDTH = 720;
const HEIGHT = 520;
const FPS = 60;
const PLAYER_RADIUS = 15;
const PLAYER_SPEED = 3;
const BUG_RADIUS = 15;
const BULLET_SPEED = 12;
const POINTS_PER_HIT_POINT = 250;
const BEST_KEY = 'kill-bugs-best';

// Frames between shots for each fire-rate upgrade (0 = no upgrades, 3 = max).
const FIRE_COOLDOWN = [18, 12, 8, 5];
const MAX_UPGRADES = FIRE_COOLDOWN.length - 1;
const PICKUP_EVERY = 12 * FPS;
const PICKUP_LIFETIME = 8 * FPS;
const BANNER_TIME = 2.5 * FPS;

const ORANGE = '#ff8800';
const KEYS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
};

// Bug types by hit points.
const BUG_TYPES = {
  1: {color: '#e53935', spots: '#2b2b2b', size: 1, speed: 1.6},
  2: {color: '#7b3fbf', spots: '#2b2b2b', size: 1.2, speed: 1.5},
  3: {color: '#1565c0', spots: '#ffffff', size: 1.4, speed: 1.35},
  4: {color: '#263238', spots: '#ffb300', size: 1.6, speed: 1.2},
};

// goal = total score needed to finish the level; mix = chance of each bug type.
const LEVELS = [
  {name: 'City', goal: 10000, mix: {1: 0.8, 2: 0.2}},
  {name: 'Forest', goal: 20000, mix: {1: 0.6, 2: 0.25, 3: 0.15}},
  {name: 'Desert', goal: 35000, mix: {1: 0.45, 2: 0.25, 3: 0.18, 4: 0.12}},
];

const PIN_PATH =
  'M576 288C576 407.332 503.424 509.716 400 553.412C346.536 576 328 588 312 620C310.442 623.116 309.112 626.08 307.876 628.832C302.766 640.22 299.274 648 288 648C276.726 648 273.234 640.22 268.124 628.832C266.888 626.08 265.558 623.116 264 620C248 588 228 576 176 553.412C72.578 509.716 0 407.332 0 288C0 128.942 128.942 0 288 0C447.06 0 576 128.942 576 288ZM448 288C448 376.366 376.366 448 288 448C199.635 448 128 376.366 128 288C128 199.635 199.635 128 288 128C376.366 128 448 199.635 448 288Z';

function readBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // ignore
  }
}

// Deterministic random so every map looks the same between games.
function seededRandom(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function strokePath(ctx, points, width, fill, casing, dash) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  if (casing) {
    ctx.strokeStyle = casing;
    ctx.lineWidth = width + 3;
    ctx.stroke();
  }
  ctx.setLineDash(dash || []);
  ctx.strokeStyle = fill;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawRiver(ctx, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 300);
  ctx.bezierCurveTo(160, 250, 240, 360, 360, 330);
  ctx.bezierCurveTo(470, 300, 520, 200, 720, 230);
  ctx.lineTo(720, 270);
  ctx.bezierCurveTo(540, 250, 490, 340, 370, 368);
  ctx.bezierCurveTo(230, 400, 160, 290, 0, 340);
  ctx.closePath();
  ctx.fill();
}

// Level 1: OsmAnd-like day map of a city.
function drawCity(ctx) {
  ctx.fillStyle = '#f1eee8';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#cdebb0';
  [[40, 40, 150, 110], [520, 330, 170, 150], [300, 380, 110, 90]].forEach(([x, y, w, h]) => {
    ctx.fillRect(x, y, w, h);
  });

  drawRiver(ctx, '#aad3df');

  ctx.fillStyle = '#d9d0c9';
  for (let x = 20; x < WIDTH; x += 120) {
    for (let y = 20; y < HEIGHT; y += 120) {
      if ((x * 7 + y * 3) % 5 === 0) continue;
      ctx.fillRect(x + 12, y + 14, 34, 26);
      ctx.fillRect(x + 56, y + 50, 28, 30);
    }
  }

  for (let x = 0; x <= WIDTH; x += 120) strokePath(ctx, [[x, 0], [x, HEIGHT]], 8, '#ffffff', '#c9c2b8');
  for (let y = 0; y <= HEIGHT; y += 120) strokePath(ctx, [[0, y], [WIDTH, y]], 8, '#ffffff', '#c9c2b8');
  strokePath(ctx, [[0, 180], [260, 180], [380, 60], [720, 60]], 13, '#fcd6a4', '#c99a5b');
  strokePath(ctx, [[480, 0], [480, 520]], 15, '#f9b29c', '#c5715a');
}

// Level 2: woodland with meadows, a lake and tracks.
function drawForest(ctx) {
  const random = seededRandom(7);
  ctx.fillStyle = '#add19e';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#cdebb0';
  [[150, 110, 90, 60], [560, 420, 110, 70], [600, 120, 70, 50]].forEach(([x, y, rx, ry]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#aad3df';
  ctx.strokeStyle = '#8ab8c8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(300, 300);
  ctx.bezierCurveTo(330, 230, 460, 240, 470, 300);
  ctx.bezierCurveTo(480, 370, 390, 400, 340, 380);
  ctx.bezierCurveTo(290, 360, 285, 330, 300, 300);
  ctx.fill();
  ctx.stroke();

  for (let i = 0; i < 260; i++) {
    const x = random() * WIDTH;
    const y = random() * HEIGHT;
    const r = 5 + random() * 7;
    ctx.fillStyle = random() < 0.5 ? '#8cbc7a' : '#9ac689';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  strokePath(ctx, [[0, 470], [180, 400], [260, 250], [420, 160], [720, 190]], 7, '#f6f1e6', '#b9a98a');
  strokePath(ctx, [[90, 0], [140, 180], [260, 250]], 3, '#ac8327', null, [8, 6]);
  strokePath(ctx, [[480, 520], [520, 380], [470, 300]], 3, '#ac8327', null, [8, 6]);
  strokePath(ctx, [[720, 330], [600, 300], [470, 300]], 3, '#ac8327', null, [8, 6]);
}

// Level 3: sand dunes, rocks, an oasis and a lonely highway.
function drawDesert(ctx) {
  const random = seededRandom(21);
  ctx.fillStyle = '#f2e2b8';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = '#e3cc96';
  ctx.lineWidth = 3;
  for (let y = -40; y < HEIGHT + 40; y += 46) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= WIDTH; x += 40) {
      ctx.quadraticCurveTo(x + 20, y + (x % 80 === 0 ? -14 : 14), x + 40, y + 6);
    }
    ctx.stroke();
  }

  ctx.fillStyle = '#d4bb8a';
  for (let i = 0; i < 26; i++) {
    const x = random() * WIDTH;
    const y = random() * HEIGHT;
    ctx.beginPath();
    ctx.ellipse(x, y, 6 + random() * 12, 4 + random() * 8, random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#cdebb0';
  ctx.beginPath();
  ctx.ellipse(170, 380, 70, 48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#aad3df';
  ctx.beginPath();
  ctx.ellipse(170, 380, 36, 22, 0, 0, Math.PI * 2);
  ctx.fill();

  strokePath(ctx, [[0, 90], [720, 470]], 13, '#fcd6a4', '#c99a5b');
  strokePath(ctx, [[170, 380], [300, 300], [380, 0]], 3, '#ac8327', null, [8, 6]);
  strokePath(ctx, [[720, 120], [560, 200], [430, 300]], 3, '#ac8327', null, [8, 6]);
}

const MAP_PAINTERS = [drawCity, drawForest, drawDesert];

function drawPlayer(ctx, player, aim) {
  const angle = Math.atan2(aim.y - player.y, aim.x - player.x);
  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.fillStyle = 'rgba(255, 136, 0, 0.18)';
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(angle + Math.PI / 2);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(14, 16);
  ctx.lineTo(0, 9);
  ctx.lineTo(-14, 16);
  ctx.closePath();
  ctx.fillStyle = ORANGE;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.restore();
}

function drawBug(ctx, bug, player, tick) {
  const type = BUG_TYPES[bug.maxHealth];
  const angle = Math.atan2(player.y - bug.y, player.x - bug.x);
  const legSwing = Math.sin(tick * 0.35 + bug.phase) * 4;

  ctx.save();
  ctx.translate(bug.x, bug.y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.scale(type.size, type.size);

  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 2;
  [-6, 0, 6].forEach((y, i) => {
    const swing = i % 2 === 0 ? legSwing : -legSwing;
    ctx.beginPath();
    ctx.moveTo(-8, y);
    ctx.lineTo(-15, y + swing);
    ctx.moveTo(8, y);
    ctx.lineTo(15, y - swing);
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(-3, -12);
  ctx.lineTo(-7, -19);
  ctx.moveTo(3, -12);
  ctx.lineTo(7, -19);
  ctx.stroke();

  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath();
  ctx.arc(0, -10, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = type.color;
  ctx.beginPath();
  ctx.ellipse(0, 2, 10, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = type.spots;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(0, 14);
  ctx.stroke();
  ctx.fillStyle = type.spots;
  [[-5, -1], [5, -1], [-4, 7], [4, 7]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  if (bug.maxHealth > 1 && bug.health < bug.maxHealth) {
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      bug.x,
      bug.y,
      BUG_RADIUS * type.size + 9,
      -Math.PI / 2,
      -Math.PI / 2 + (Math.PI * 2 * bug.health) / bug.maxHealth,
    );
    ctx.stroke();
  }
}

function drawPickup(ctx, pickup, tick) {
  if (pickup.ttl < 2 * FPS && Math.floor(tick / 8) % 2 === 0) return;
  const bob = Math.sin(tick * 0.1) * 3;
  ctx.save();
  ctx.translate(pickup.x, pickup.y + bob);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 2;
  ctx.stroke();

  const scale = 30 / 648;
  ctx.translate(-288 * scale, -324 * scale);
  ctx.scale(scale, scale);
  ctx.fillStyle = ORANGE;
  ctx.fill(new Path2D(PIN_PATH), 'evenodd');
  ctx.restore();
}

function drawBanner(ctx, banner) {
  const alpha = Math.min(1, banner.ttl / 30);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, HEIGHT / 2 - 48, WIDTH, 96);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '900 34px system-ui, -apple-system, sans-serif';
  ctx.fillText(banner.title, WIDTH / 2, HEIGHT / 2 + 2);
  ctx.fillStyle = '#ffb866';
  ctx.font = '700 17px system-ui, -apple-system, sans-serif';
  ctx.fillText(banner.text, WIDTH / 2, HEIGHT / 2 + 30);
  ctx.restore();
}

function pickBugHealth(mix) {
  let roll = Math.random();
  for (const [health, chance] of Object.entries(mix)) {
    roll -= chance;
    if (roll <= 0) return Number(health);
  }
  return 1;
}

function createBug(level) {
  let x;
  let y;
  const margin = BUG_RADIUS * 2;
  if (Math.random() < 0.5) {
    x = Math.random() < 0.5 ? -margin : WIDTH + margin;
    y = Math.random() * HEIGHT;
  } else {
    x = Math.random() * WIDTH;
    y = Math.random() < 0.5 ? -margin : HEIGHT + margin;
  }
  const health = pickBugHealth(LEVELS[level].mix);
  return {x, y, health, maxHealth: health, phase: Math.random() * 10};
}

function burst(particles, x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      radius: Math.random() + 2,
      color: i % 3 === 0 ? '#2b2b2b' : color,
      vx: (Math.random() - 0.5) * Math.random() * 6,
      vy: (Math.random() - 0.5) * Math.random() * 6,
      alpha: 1,
    });
  }
}

function createState() {
  return {
    player: {x: WIDTH / 2, y: HEIGHT / 2},
    aim: {x: WIDTH / 2, y: 0},
    bullets: [],
    bugs: [],
    particles: [],
    keys: new Set(),
    firing: false,
    cooldown: 0,
    upgrades: 0,
    pickup: null,
    pickupTimer: PICKUP_EVERY,
    level: 0,
    levelTime: 0,
    spawnTimer: 0,
    banner: {title: 'Level 1 · City', text: 'Squash the bugs before they reach you', ttl: BANNER_TIME},
    tick: 0,
    score: 0,
  };
}

export default function KillBugs() {
  const logoUrl = useBaseUrl('/img/osmand-pin.svg');
  const canvasRef = useRef(null);
  const mapsRef = useRef([]);
  const stateRef = useRef(createState());

  const [status, setStatus] = useState('ready'); // ready | playing | paused | over | won
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [upgrades, setUpgrades] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    setBest(readBest());
    mapsRef.current = MAP_PAINTERS.map((paint) => {
      const map = document.createElement('canvas');
      map.width = WIDTH;
      map.height = HEIGHT;
      paint(map.getContext('2d'));
      return map;
    });
    render();
  }, []);

  function render() {
    const canvas = canvasRef.current;
    const s = stateRef.current;
    const map = mapsRef.current[s.level];
    if (!canvas || !map) return;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(map, 0, 0);
    if (s.pickup) drawPickup(ctx, s.pickup, s.tick);
    s.particles.forEach((p) => {
      ctx.globalAlpha = Math.max(p.alpha, 0);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    s.bullets.forEach((b) => {
      ctx.fillStyle = ORANGE;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    drawPlayer(ctx, s.player, s.aim);
    s.bugs.forEach((bug) => drawBug(ctx, bug, s.player, s.tick));
    if (s.banner && s.banner.ttl > 0) drawBanner(ctx, s.banner);
  }

  function shoot(s) {
    const p = s.player;
    const dist = Math.hypot(s.aim.x - p.x, s.aim.y - p.y) || 1;
    s.bullets.push({
      x: p.x,
      y: p.y,
      vx: ((s.aim.x - p.x) / dist) * BULLET_SPEED,
      vy: ((s.aim.y - p.y) / dist) * BULLET_SPEED,
    });
    s.cooldown = FIRE_COOLDOWN[s.upgrades];
  }

  // Advances the game by dt frames. Returns 'caught', 'won' or null.
  function step(dt) {
    const s = stateRef.current;
    const held = (codes) => codes.some((code) => s.keys.has(code));

    s.tick += dt;
    s.levelTime += dt;
    s.spawnTimer -= dt;
    s.cooldown -= dt;
    if (s.banner) s.banner.ttl -= dt;

    // Same difficulty curve as KillBills: every second spawn N bugs, N grows every 30 seconds of the level.
    if (s.spawnTimer <= 0) {
      const count = 1 + Math.floor(s.levelTime / (FPS * 30));
      for (let i = 0; i < count; i++) s.bugs.push(createBug(s.level));
      s.spawnTimer = FPS;
    }

    const p = s.player;
    if (held(KEYS.up)) p.y -= PLAYER_SPEED * dt;
    if (held(KEYS.down)) p.y += PLAYER_SPEED * dt;
    if (held(KEYS.left)) p.x -= PLAYER_SPEED * dt;
    if (held(KEYS.right)) p.x += PLAYER_SPEED * dt;
    p.x = Math.min(Math.max(p.x, PLAYER_RADIUS), WIDTH - PLAYER_RADIUS);
    p.y = Math.min(Math.max(p.y, PLAYER_RADIUS), HEIGHT - PLAYER_RADIUS);

    if (s.firing && s.cooldown <= 0) shoot(s);

    s.bullets.forEach((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    });
    s.bullets = s.bullets.filter((b) => b.x > -5 && b.x < WIDTH + 5 && b.y > -5 && b.y < HEIGHT + 5);

    s.bugs.forEach((bug) => {
      const type = BUG_TYPES[bug.maxHealth];
      const dist = Math.hypot(p.x - bug.x, p.y - bug.y) || 1;
      bug.x += ((p.x - bug.x) / dist) * type.speed * dt;
      bug.y += ((p.y - bug.y) / dist) * type.speed * dt;

      const hitIndex = s.bullets.findIndex(
        (b) => Math.hypot(b.x - bug.x, b.y - bug.y) < BUG_RADIUS * type.size + 4,
      );
      if (hitIndex === -1) return;
      s.bullets.splice(hitIndex, 1);
      bug.health -= 1;
      if (bug.health > 0) return;
      s.score += POINTS_PER_HIT_POINT * bug.maxHealth;
      burst(s.particles, bug.x, bug.y, bug.maxHealth > 1 ? type.color : ORANGE, 30 + bug.maxHealth * 10);
    });
    s.bugs = s.bugs.filter((bug) => bug.health > 0);

    // OsmAnd logo pickup: each one makes shooting faster, up to MAX_UPGRADES.
    if (s.pickup) {
      s.pickup.ttl -= dt;
      if (Math.hypot(p.x - s.pickup.x, p.y - s.pickup.y) < PLAYER_RADIUS + 20) {
        s.upgrades += 1;
        burst(s.particles, s.pickup.x, s.pickup.y, ORANGE, 40);
        s.banner = {
          title: `Fire rate ${s.upgrades}/${MAX_UPGRADES}`,
          text: s.upgrades === MAX_UPGRADES ? 'Maximum power!' : 'OsmAnd boost collected',
          ttl: 1.5 * FPS,
        };
        s.pickup = null;
      } else if (s.pickup.ttl <= 0) {
        s.pickup = null;
      }
    } else if (s.upgrades < MAX_UPGRADES) {
      s.pickupTimer -= dt;
      if (s.pickupTimer <= 0) {
        s.pickup = {x: 60 + Math.random() * (WIDTH - 120), y: 60 + Math.random() * (HEIGHT - 120), ttl: PICKUP_LIFETIME};
        s.pickupTimer = PICKUP_EVERY;
      }
    }

    s.particles.forEach((pt) => {
      pt.vx *= 0.99;
      pt.vy *= 0.99;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.alpha -= 0.035 * dt;
    });
    s.particles = s.particles.filter((pt) => pt.alpha > 0);

    if (s.score >= LEVELS[s.level].goal) {
      if (s.level === LEVELS.length - 1) return 'won';
      s.level += 1;
      s.levelTime = 0;
      s.spawnTimer = 2 * FPS;
      s.bugs.forEach((bug) => burst(s.particles, bug.x, bug.y, BUG_TYPES[bug.maxHealth].color, 20));
      s.bugs = [];
      s.bullets = [];
      // Each new level brings a tougher bug: 3 hits in the forest, 4 hits in the desert.
      s.banner = {
        title: `Level ${s.level + 1} · ${LEVELS[s.level].name}`,
        text: `New bug: ${s.level + 2} hits to squash`,
        ttl: BANNER_TIME,
      };
      return null;
    }

    const caught = s.bugs.some(
      (bug) => Math.hypot(p.x - bug.x, p.y - bug.y) < BUG_RADIUS * BUG_TYPES[bug.maxHealth].size + PLAYER_RADIUS - 4,
    );
    return caught ? 'caught' : null;
  }

  useEffect(() => {
    if (status !== 'playing') return undefined;
    let frame;
    let last = performance.now();

    function finish(result) {
      const final = stateRef.current.score;
      if (final > readBest()) {
        saveBest(final);
        setBest(final);
      }
      setStatus(result === 'won' ? 'won' : 'over');
    }

    function loop(now) {
      const dt = Math.min((now - last) / (1000 / FPS), 3);
      last = now;
      const result = step(dt);
      render();
      const s = stateRef.current;
      setScore(s.score);
      setLevel(s.level);
      setUpgrades(s.upgrades);
      if (result) {
        finish(result);
        return;
      }
      frame = requestAnimationFrame(loop);
    }

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [status]);

  useEffect(() => {
    const allKeys = Object.values(KEYS).flat();
    function down(event) {
      if (event.code === 'KeyP' || event.code === 'Escape') {
        setStatus((value) => (value === 'playing' ? 'paused' : value === 'paused' ? 'playing' : value));
        return;
      }
      if (!allKeys.includes(event.code)) return;
      event.preventDefault();
      stateRef.current.keys.add(event.code);
    }
    function up(event) {
      stateRef.current.keys.delete(event.code);
    }
    function stopFiring() {
      stateRef.current.firing = false;
    }
    function blur() {
      stateRef.current.keys.clear();
      stopFiring();
    }
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    window.addEventListener('pointerup', stopFiring);
    window.addEventListener('pointercancel', stopFiring);
    window.addEventListener('blur', blur);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
      window.removeEventListener('pointerup', stopFiring);
      window.removeEventListener('pointercancel', stopFiring);
      window.removeEventListener('blur', blur);
    };
  }, []);

  function toCanvas(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    };
  }

  function handlePointerMove(event) {
    stateRef.current.aim = toCanvas(event);
    if (status !== 'playing') render();
  }

  function handlePointerDown(event) {
    if (status !== 'playing') return;
    event.preventDefault();
    const s = stateRef.current;
    s.aim = toCanvas(event);
    s.firing = true;
    if (s.cooldown <= 0) shoot(s);
  }

  function start() {
    stateRef.current = createState();
    setScore(0);
    setLevel(0);
    setUpgrades(0);
    setStatus('playing');
  }

  function holdKey(code) {
    return {
      onPointerDown: (event) => {
        event.preventDefault();
        stateRef.current.keys.add(code);
      },
      onPointerUp: () => stateRef.current.keys.delete(code),
      onPointerLeave: () => stateRef.current.keys.delete(code),
      onPointerCancel: () => stateRef.current.keys.delete(code),
      onContextMenu: (event) => event.preventDefault(),
    };
  }

  const goal = LEVELS[level].goal;

  return (
    <Layout title="Kill Bugs" description="Protect your OsmAnd location from map bugs">
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.eyebrow}>Game</p>
          <h1>Kill Bugs</h1>
          <p className={styles.subtitle}>
            Map bugs are crawling toward your location. Move with WASD or arrows, aim and hold the mouse to shoot.
            Catch the OsmAnd logo to shoot faster.
          </p>

          <div className={styles.stats}>
            <span>Level: <strong>{level + 1}/{LEVELS.length}</strong> · {LEVELS[level].name}</span>
            <span>Score: <strong>{score}</strong> / {goal}</span>
            <span>Fire rate: <strong>{upgrades}/{MAX_UPGRADES}</strong></span>
            <span>Best: <strong>{best}</strong></span>
            {status === 'playing' && <button type="button" onClick={() => setStatus('paused')}>Pause</button>}
            {status === 'paused' && <button type="button" onClick={() => setStatus('playing')}>Resume</button>}
            {status !== 'ready' && <button type="button" onClick={start}>Restart</button>}
          </div>

          <div className={styles.stage}>
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              className={styles.canvas}
              onPointerMove={handlePointerMove}
              onPointerDown={handlePointerDown}
            />

            {status === 'ready' && (
              <div className={styles.overlay}>
                <img src={logoUrl} alt="" className={styles.logo} />
                <strong>Kill Bugs</strong>
                <span>3 levels: City → Forest → Desert. Reach {LEVELS[LEVELS.length - 1].goal} points to win</span>
                <button type="button" onClick={start}>Start</button>
              </div>
            )}

            {status === 'paused' && (
              <div className={styles.overlay}>
                <strong>Paused</strong>
                <button type="button" onClick={() => setStatus('playing')}>Resume</button>
              </div>
            )}

            {status === 'over' && (
              <div className={styles.overlay}>
                <img src={logoUrl} alt="" className={styles.logo} />
                <strong>Route lost</strong>
                <span>Level {level + 1} · Score: {score}{score > 0 && score >= best ? ' · new best!' : ''}</span>
                <button type="button" onClick={start}>Play again</button>
              </div>
            )}

            {status === 'won' && (
              <div className={styles.overlay}>
                <img src={logoUrl} alt="" className={styles.logo} />
                <strong>You win!</strong>
                <span>The map is bug-free · Score: {score}</span>
                <button type="button" onClick={start}>Play again</button>
              </div>
            )}
          </div>

          <div className={styles.mobile}>
            <div />
            <button type="button" aria-label="Move up" {...holdKey('ArrowUp')}>↑</button>
            <div />
            <button type="button" aria-label="Move left" {...holdKey('ArrowLeft')}>←</button>
            <button type="button" aria-label="Move down" {...holdKey('ArrowDown')}>↓</button>
            <button type="button" aria-label="Move right" {...holdKey('ArrowRight')}>→</button>
          </div>
          <p className={styles.hint}>On a phone: hold the arrows to move, touch and hold the map to shoot.</p>
        </section>
      </main>
    </Layout>
  );
}

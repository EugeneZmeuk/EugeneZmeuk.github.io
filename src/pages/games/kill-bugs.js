import React, {useEffect, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './kill-bugs.module.css';

// Based on KillBills (github.com/EugeneZmeuk/KillBills), redrawn in OsmAnd style.
const WIDTH = 720;
const HEIGHT = 520;
const PLAYER_RADIUS = 15;
const PLAYER_SPEED = 3;
const BUG_RADIUS = 15;
const BUG_SPEED = 1.6;
const BULLET_SPEED = 12;
const POINTS_PER_BUG = 250;
const BEST_KEY = 'kill-bugs-best';

const ORANGE = '#ff8800';
const KEYS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
};

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

// Draws a static OsmAnd-like day map: land, parks, water, buildings and roads.
function drawMap(ctx) {
  ctx.fillStyle = '#f1eee8';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = '#cdebb0';
  [[40, 40, 150, 110], [520, 330, 170, 150], [300, 380, 110, 90]].forEach(([x, y, w, h]) => {
    ctx.fillRect(x, y, w, h);
  });

  ctx.fillStyle = '#aad3df';
  ctx.beginPath();
  ctx.moveTo(0, 300);
  ctx.bezierCurveTo(160, 250, 240, 360, 360, 330);
  ctx.bezierCurveTo(470, 300, 520, 200, 720, 230);
  ctx.lineTo(720, 270);
  ctx.bezierCurveTo(540, 250, 490, 340, 370, 368);
  ctx.bezierCurveTo(230, 400, 160, 290, 0, 340);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d9d0c9';
  for (let x = 20; x < WIDTH; x += 120) {
    for (let y = 20; y < HEIGHT; y += 120) {
      if ((x * 7 + y * 3) % 5 === 0) continue;
      ctx.fillRect(x + 12, y + 14, 34, 26);
      ctx.fillRect(x + 56, y + 50, 28, 30);
    }
  }

  const road = (points, width, fill, casing) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.strokeStyle = casing;
    ctx.lineWidth = width + 3;
    ctx.stroke();
    ctx.strokeStyle = fill;
    ctx.lineWidth = width;
    ctx.stroke();
  };

  for (let x = 0; x <= WIDTH; x += 120) road([[x, 0], [x, HEIGHT]], 8, '#ffffff', '#c9c2b8');
  for (let y = 0; y <= HEIGHT; y += 120) road([[0, y], [WIDTH, y]], 8, '#ffffff', '#c9c2b8');
  road([[0, 180], [260, 180], [380, 60], [720, 60]], 13, '#fcd6a4', '#c99a5b');
  road([[480, 0], [480, 520]], 15, '#f9b29c', '#c5715a');
}

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
  const angle = Math.atan2(player.y - bug.y, player.x - bug.x);
  const big = bug.maxHealth > 1;
  const size = big ? 1.25 : 1;
  const legSwing = Math.sin(tick * 0.35 + bug.phase) * 4;

  ctx.save();
  ctx.translate(bug.x, bug.y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.scale(size, size);

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

  ctx.fillStyle = big ? '#7b3fbf' : '#e53935';
  ctx.beginPath();
  ctx.ellipse(0, 2, 10, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2b2b';
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(0, 14);
  ctx.stroke();
  ctx.fillStyle = '#2b2b2b';
  [[-5, -1], [5, -1], [-4, 7], [4, 7]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  if (big && bug.health < bug.maxHealth) {
    ctx.strokeStyle = ORANGE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bug.x, bug.y, 24, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * bug.health) / bug.maxHealth);
    ctx.stroke();
  }
}

function createBug() {
  let x;
  let y;
  if (Math.random() < 0.5) {
    x = Math.random() < 0.5 ? -BUG_RADIUS : WIDTH + BUG_RADIUS;
    y = Math.random() * HEIGHT;
  } else {
    x = Math.random() * WIDTH;
    y = Math.random() < 0.5 ? -BUG_RADIUS : HEIGHT + BUG_RADIUS;
  }
  const health = Math.random() > 0.8 ? 2 : 1;
  return {x, y, health, maxHealth: health, phase: Math.random() * 10};
}

function createState() {
  return {
    player: {x: WIDTH / 2, y: HEIGHT / 2},
    aim: {x: WIDTH / 2, y: 0},
    bullets: [],
    bugs: [],
    particles: [],
    keys: new Set(),
    spawnTimer: 0,
    elapsed: 0,
    tick: 0,
    score: 0,
  };
}

export default function KillBugs() {
  const logoUrl = useBaseUrl('/img/osmand-pin.svg');
  const canvasRef = useRef(null);
  const mapRef = useRef(null);
  const stateRef = useRef(createState());

  const [status, setStatus] = useState('ready'); // ready | playing | paused | over
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    setBest(readBest());
    const map = document.createElement('canvas');
    map.width = WIDTH;
    map.height = HEIGHT;
    drawMap(map.getContext('2d'));
    mapRef.current = map;
    render();
  }, []);

  function render() {
    const canvas = canvasRef.current;
    if (!canvas || !mapRef.current) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    ctx.drawImage(mapRef.current, 0, 0);
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
  }

  function step(dt) {
    const s = stateRef.current;
    const held = (codes) => codes.some((code) => s.keys.has(code));

    s.tick += dt;
    s.elapsed += dt;
    s.spawnTimer -= dt;

    // Same difficulty curve as KillBills: every second spawn N bugs, N grows every 30 seconds.
    if (s.spawnTimer <= 0) {
      const count = 1 + Math.floor(s.elapsed / (60 * 30));
      for (let i = 0; i < count; i++) s.bugs.push(createBug());
      s.spawnTimer = 60;
    }

    const p = s.player;
    if (held(KEYS.up)) p.y -= PLAYER_SPEED * dt;
    if (held(KEYS.down)) p.y += PLAYER_SPEED * dt;
    if (held(KEYS.left)) p.x -= PLAYER_SPEED * dt;
    if (held(KEYS.right)) p.x += PLAYER_SPEED * dt;
    p.x = Math.min(Math.max(p.x, PLAYER_RADIUS), WIDTH - PLAYER_RADIUS);
    p.y = Math.min(Math.max(p.y, PLAYER_RADIUS), HEIGHT - PLAYER_RADIUS);

    s.bullets.forEach((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    });
    s.bullets = s.bullets.filter((b) => b.x > -5 && b.x < WIDTH + 5 && b.y > -5 && b.y < HEIGHT + 5);

    s.bugs.forEach((bug) => {
      const dist = Math.hypot(p.x - bug.x, p.y - bug.y) || 1;
      bug.x += ((p.x - bug.x) / dist) * BUG_SPEED * dt;
      bug.y += ((p.y - bug.y) / dist) * BUG_SPEED * dt;

      const hitIndex = s.bullets.findIndex((b) => Math.hypot(b.x - bug.x, b.y - bug.y) < BUG_RADIUS + 4);
      if (hitIndex === -1) return;
      s.bullets.splice(hitIndex, 1);
      bug.health -= 1;
      if (bug.health > 0) return;
      s.score += POINTS_PER_BUG * bug.maxHealth;
      for (let i = 0; i < 40; i++) {
        s.particles.push({
          x: bug.x,
          y: bug.y,
          radius: Math.random() + 2,
          color: i % 3 === 0 ? '#2b2b2b' : bug.maxHealth > 1 ? '#7b3fbf' : ORANGE,
          vx: (Math.random() - 0.5) * Math.random() * 6,
          vy: (Math.random() - 0.5) * Math.random() * 6,
          alpha: 1,
        });
      }
    });
    s.bugs = s.bugs.filter((bug) => bug.health > 0);

    s.particles.forEach((pt) => {
      pt.vx *= 0.99;
      pt.vy *= 0.99;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.alpha -= 0.035 * dt;
    });
    s.particles = s.particles.filter((pt) => pt.alpha > 0);

    return s.bugs.some((bug) => Math.hypot(p.x - bug.x, p.y - bug.y) < BUG_RADIUS + PLAYER_RADIUS - 4);
  }

  useEffect(() => {
    if (status !== 'playing') return undefined;
    let frame;
    let last = performance.now();

    function loop(now) {
      const dt = Math.min((now - last) / (1000 / 60), 3);
      last = now;
      const caught = step(dt);
      render();
      setScore(stateRef.current.score);
      if (caught) {
        const final = stateRef.current.score;
        if (final > readBest()) {
          saveBest(final);
          setBest(final);
        }
        setStatus('over');
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
    function blur() {
      stateRef.current.keys.clear();
    }
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      document.removeEventListener('keydown', down);
      document.removeEventListener('keyup', up);
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
    const target = toCanvas(event);
    s.aim = target;
    const dist = Math.hypot(target.x - s.player.x, target.y - s.player.y) || 1;
    s.bullets.push({
      x: s.player.x,
      y: s.player.y,
      vx: ((target.x - s.player.x) / dist) * BULLET_SPEED,
      vy: ((target.y - s.player.y) / dist) * BULLET_SPEED,
    });
  }

  function start() {
    stateRef.current = createState();
    setScore(0);
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

  return (
    <Layout title="Kill Bugs" description="Protect your OsmAnd location from map bugs">
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.eyebrow}>Game</p>
          <h1>Kill Bugs</h1>
          <p className={styles.subtitle}>
            Map bugs are crawling toward your location. Move with WASD or arrows, aim and click to shoot.
          </p>

          <div className={styles.stats}>
            <span>Score: <strong>{score}</strong></span>
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
                <span>Don't let a single bug reach you</span>
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
                <span>Score: {score}{score > 0 && score >= best ? ' · new best!' : ''}</span>
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
          <p className={styles.hint}>On a phone: hold the arrows to move, tap the map to shoot.</p>
        </section>
      </main>
    </Layout>
  );
}

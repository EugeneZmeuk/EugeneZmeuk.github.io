import * as THREE from 'three';

const CHUNK = 220;
const STYLE = {tenement: 0, stalin: 1, panel: 2, glass: 3, church: 4, brick: 5, blank: 6};
const ROOF = {flat: 0, tiles: 1, metal: 2, plain: 3};
// colours tagged in OSM are often pure ones, like 'red', which glare in a lit scene
const MUTE = new THREE.Color('#b3a795');
const PITCHED = new Set(['gabled', 'hipped', 'half-hipped', 'mansard', 'gambrel', 'saltbox', 'skillion', 'side_hipped', 'round', 'pyramidal', 'dome', 'onion', 'cone']);

const hash = (x, y) => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

const ringArea = (r) => {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x0, y0] = r[i];
    const [x1, y1] = r[(i + 1) % r.length];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
};

const perimeter = (r) => {
  let p = 0;
  for (let i = 0; i < r.length; i++) {
    const [x0, y0] = r[i];
    const [x1, y1] = r[(i + 1) % r.length];
    p += Math.hypot(x1 - x0, y1 - y0);
  }
  return p;
};

const center = (r) => [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];

class Chunk {
  constructor() {
    this.wall = {pos: [], nor: [], col: [], f: [], top: []};
    this.roof = {pos: [], nor: [], col: [], pat: []};
  }

  quad(a, b, height0, height1, n, color, f0, f1, seed, style, top) {
    const w = this.wall;
    const [ax, ay] = a;
    const [bx, by] = b;
    const v = [
      [ax, height0, -ay, f0[0], f0[1]],
      [bx, height0, -by, f1[0], f0[1]],
      [bx, height1, -by, f1[0], f1[1]],
      [ax, height0, -ay, f0[0], f0[1]],
      [bx, height1, -by, f1[0], f1[1]],
      [ax, height1, -ay, f0[0], f1[1]],
    ];
    for (const [x, y, z, u, fl] of v) {
      w.pos.push(x, y, z);
      w.nor.push(n[0], 0, n[1]);
      w.col.push(color.r, color.g, color.b);
      w.f.push(u, fl, seed, style);
      w.top.push(top);
    }
  }

  /** Flat-shaded roof triangle given in world coordinates, facing up or outward. */
  tri(a, b, c, color, pat) {
    const ux = b[0] - a[0];
    const uy = b[1] - a[1];
    const uz = b[2] - a[2];
    const vx = c[0] - a[0];
    const vy = c[1] - a[1];
    const vz = c[2] - a[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    const r = this.roof;
    for (const p of [a, b, c]) {
      r.pos.push(p[0], p[1], p[2]);
      r.nor.push(nx, ny, nz);
      r.col.push(color.r, color.g, color.b);
      r.pat.push(pat);
    }
  }

  meshes(wallMat, roofMat) {
    const out = [];
    const mk = (attrs, mat) => {
      const g = new THREE.BufferGeometry();
      for (const [name, data, size] of attrs) g.setAttribute(name, new THREE.Float32BufferAttribute(data, size));
      const m = new THREE.Mesh(g, mat);
      m.castShadow = true;
      m.receiveShadow = true;
      out.push(m);
    };
    if (this.wall.pos.length) {
      mk([['position', this.wall.pos, 3], ['normal', this.wall.nor, 3], ['color', this.wall.col, 3], ['aF', this.wall.f, 4], ['aTop', this.wall.top, 1]], wallMat);
    }
    if (this.roof.pos.length) {
      mk([['position', this.roof.pos, 3], ['normal', this.roof.nor, 3], ['color', this.roof.col, 3], ['aPat', this.roof.pat, 1]], roofMat);
    }
    return out;
  }
}

function addWalls(chunk, ring, h0, h1, color, seed, style, floorH, bayW) {
  const floors0 = h0 / floorH;
  const floors = Math.max(1, Math.round((h1 - h0) / floorH));
  const top = floors0 + floors;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 0.05) continue;
    const n = [dy / len, dx / len];
    const bays = Math.round(len / bayW);
    const s = bays < 1 ? STYLE.blank : style;
    chunk.quad(a, b, h0, h1, n, color, [0, floors0], [Math.max(bays, 1), top], seed, s, top);
  }
}

/** Inset a counter-clockwise ring. Returns null when the offset would turn the ring inside out. */
function inset(ring, d) {
  const n = ring.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = ring[(i + n - 1) % n];
    const c = ring[i];
    const q = ring[(i + 1) % n];
    const l0 = Math.hypot(c[0] - p[0], c[1] - p[1]) || 1;
    const l1 = Math.hypot(q[0] - c[0], q[1] - c[1]) || 1;
    const n0 = [-(c[1] - p[1]) / l0, (c[0] - p[0]) / l0];
    const n1 = [-(q[1] - c[1]) / l1, (q[0] - c[0]) / l1];
    const denom = 1 + n0[0] * n1[0] + n0[1] * n1[1];
    if (denom < 0.25) return null;
    out.push([c[0] + ((n0[0] + n1[0]) / denom) * d, c[1] + ((n0[1] + n1[1]) / denom) * d]);
  }
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    const c = out[i];
    const e = out[(i + 1) % n];
    if ((b[0] - a[0]) * (e[0] - c[0]) + (b[1] - a[1]) * (e[1] - c[1]) <= 0) return null;
  }
  return ringArea(out) > 0.5 ? out : null;
}

function cap(chunk, ring, holes, y, color, pat) {
  const contour = ring.map(([x, yy]) => new THREE.Vector2(x, yy));
  const hs = (holes || []).map((h) => h.map(([x, yy]) => new THREE.Vector2(x, yy)));
  const all = contour.concat(...hs);
  for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(contour, hs)) {
    const v = [all[i], all[j], all[k]].map((p) => [p.x, y, -p.y]);
    const cross = (v[1][0] - v[0][0]) * (v[2][2] - v[0][2]) - (v[1][2] - v[0][2]) * (v[2][0] - v[0][0]);
    if (cross > 0) chunk.tri(v[0], v[2], v[1], color, pat);
    else chunk.tri(v[0], v[1], v[2], color, pat);
  }
}

function hipRoof(chunk, ring, y, height, slopeRun, color, pat) {
  let d = slopeRun;
  let top = null;
  for (let tries = 0; tries < 5 && !top; tries++) {
    top = inset(ring, d);
    if (!top) d *= 0.7;
  }
  if (!top) return false;
  const rise = height * (d / slopeRun);
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    const a = [ring[i][0], y, -ring[i][1]];
    const b = [ring[j][0], y, -ring[j][1]];
    const c = [top[j][0], y + rise, -top[j][1]];
    const e = [top[i][0], y + rise, -top[i][1]];
    chunk.tri(a, b, c, color, pat);
    chunk.tri(a, c, e, color, pat);
  }
  cap(chunk, top, null, y + rise, color, pat);
  return true;
}

function gableRoof(chunk, ring, y, height, color, wallColor, pat) {
  // ring has four corners; the ridge runs along the longer pair of sides
  const len = (i) => Math.hypot(ring[(i + 1) % 4][0] - ring[i][0], ring[(i + 1) % 4][1] - ring[i][1]);
  const s = len(0) >= len(1) ? 0 : 1;
  const [a, b, c, e] = [ring[s], ring[(s + 1) % 4], ring[(s + 2) % 4], ring[(s + 3) % 4]];
  const m0 = [(e[0] + a[0]) / 2, (e[1] + a[1]) / 2];
  const m1 = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
  const P = (p, up = 0) => [p[0], y + up, -p[1]];
  chunk.tri(P(a), P(b), P(m1, height), color, pat);
  chunk.tri(P(a), P(m1, height), P(m0, height), color, pat);
  chunk.tri(P(c), P(e), P(m0, height), color, pat);
  chunk.tri(P(c), P(m0, height), P(m1, height), color, pat);
  chunk.tri(P(b), P(c), P(m1, height), wallColor, ROOF.plain);
  chunk.tri(P(e), P(a), P(m0, height), wallColor, ROOF.plain);
}

function pyramidRoof(chunk, ring, y, height, color, pat) {
  const [cx, cy] = center(ring);
  const apex = [cx, y + height, -cy];
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    chunk.tri([ring[i][0], y, -ring[i][1]], [ring[j][0], y, -ring[j][1]], apex, color, pat);
  }
}

function domeRoof(chunk, ring, y, height, color, onion) {
  const [cx, cy] = center(ring);
  const r = Math.sqrt(Math.abs(ringArea(ring)) / Math.PI);
  const seg = 14;
  const rows = 7;
  const shape = (t) => {
    if (!onion) return [Math.cos((t * Math.PI) / 2), Math.sin((t * Math.PI) / 2)];
    return [Math.max(0, Math.sin(Math.min(1, t * 1.15) * Math.PI) * 1.05 + (1 - t) * 0.35), t];
  };
  const P = (i, t) => {
    const a = (i / seg) * Math.PI * 2;
    const [rad, up] = shape(t);
    return [cx + Math.cos(a) * r * rad, y + up * height, -(cy + Math.sin(a) * r * rad)];
  };
  for (let row = 0; row < rows; row++) {
    const t0 = row / rows;
    const t1 = (row + 1) / rows;
    for (let i = 0; i < seg; i++) {
      chunk.tri(P(i, t0), P(i + 1, t0), P(i + 1, t1), color, ROOF.metal);
      chunk.tri(P(i, t0), P(i + 1, t1), P(i, t1), color, ROOF.metal);
    }
  }
}

function wallStyle(b, level, area, wallTop) {
  if (b.k === 'c') return STYLE.church;
  if (b.br) return STYLE.brick;
  if (wallTop > level.towerHeight) return b.c ? STYLE.brick : STYLE.glass;
  const r = hash(area, wallTop);
  const mix = level.facades;
  let acc = 0;
  for (const [name, weight] of mix) {
    acc += weight;
    if (r <= acc) return STYLE[name];
  }
  return STYLE[mix[0][0]];
}

export function buildBuildings(data, level, wallMat, roofMat) {
  const group = new THREE.Group();
  const chunks = new Map();
  const walls = level.wallColors.map((h) => new THREE.Color(h));
  const roofs = level.roofColors.map((h) => new THREE.Color(h));
  const copper = new THREE.Color('#6f9c8a');

  for (const b of data.buildings) {
    if (b.np || b.p.length < 3) continue;
    let ring = b.p;
    if (ringArea(ring) < 0) ring = ring.slice().reverse();
    const holes = (b.ho || []).map((h) => (ringArea(h) > 0 ? h.slice().reverse() : h));
    const area = Math.abs(ringArea(ring));
    if (area < 4) continue;
    const [cx, cy] = center(ring);
    const key = `${Math.floor(cx / CHUNK)},${Math.floor(cy / CHUNK)}`;
    if (!chunks.has(key)) chunks.set(key, new Chunk());
    const chunk = chunks.get(key);

    const seed = hash(cx, cy);
    const h0 = b.mh || 0;
    const narrow = (2 * area) / perimeter(ring);
    const rs = b.rs;
    const church = b.k === 'c';

    // decide the roof before the walls, because the walls stop where the roof starts
    let shape = rs && (PITCHED.has(rs) || rs === 'flat') ? rs : null;
    if (!shape) {
      const pitched = b.h < level.pitchedBelow && area < level.pitchedMaxArea && !holes.length && seed < level.pitchedShare;
      shape = pitched ? 'hipped' : 'flat';
    }
    let roofH = b.rh;
    if (roofH == null) {
      if (shape === 'flat') roofH = 0;
      else if (shape === 'dome' || shape === 'onion') roofH = Math.sqrt(area / Math.PI) * (shape === 'onion' ? 2 : 1);
      else if (shape === 'pyramidal' || shape === 'cone') roofH = Math.min(narrow * (church ? 3 : 1.4), b.h * 0.5);
      else roofH = Math.min(narrow * 0.85, 6.5);
    }
    roofH = Math.min(roofH, (b.h - h0) * 0.7);
    const wallTop = b.h - roofH;

    const color = b.c ? new THREE.Color(b.c).lerp(MUTE, 0.35) : walls[Math.floor(seed * 97) % walls.length];
    const roofColor = b.rc ? new THREE.Color(b.rc) : church ? copper : roofs[Math.floor(seed * 89) % roofs.length];
    const style = wallStyle(b, level, area, wallTop);
    const floorH = style === STYLE.stalin ? 3.9 : style === STYLE.panel ? 2.9 : style === STYLE.glass ? 3.6 : level.floorHeight;
    const bayW = style === STYLE.stalin ? 3.2 : style === STYLE.glass ? 1.8 : 3.0;
    addWalls(chunk, ring, h0, wallTop, color, seed, style, floorH, bayW);
    for (const hole of holes) addWalls(chunk, hole, h0, wallTop, color, seed, style, floorH, bayW);

    const pat = ROOF[b.rc || !level.roofMetal ? 'tiles' : 'metal'];
    let done = false;
    if (shape === 'gabled' && ring.length === 4) {
      gableRoof(chunk, ring, wallTop, roofH, roofColor, color, pat);
      done = true;
    } else if (shape === 'dome' || shape === 'round') {
      domeRoof(chunk, ring, wallTop, roofH, roofColor, false);
      done = true;
    } else if (shape === 'onion') {
      domeRoof(chunk, ring, wallTop, roofH, roofColor, true);
      done = true;
    } else if (shape === 'pyramidal' || shape === 'cone') {
      pyramidRoof(chunk, ring, wallTop, roofH, roofColor, pat);
      done = true;
    } else if (shape !== 'flat' && !holes.length) {
      done = hipRoof(chunk, ring, wallTop, roofH, narrow * 0.92, roofColor, pat);
    }
    if (!done) cap(chunk, ring, holes, wallTop, roofColor, ROOF.flat);
  }

  for (const c of chunks.values()) c.meshes(wallMat, roofMat).forEach((m) => group.add(m));
  return group;
}

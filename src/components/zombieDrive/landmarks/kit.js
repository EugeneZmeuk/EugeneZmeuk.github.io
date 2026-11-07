import * as THREE from 'three';

// Small modelling kit for landmarks. Every landmark is a short program that calls these
// shapes in its own local frame: x along the long side, z across it, y up, origin at the
// centre of the OSM footprint on the ground.

export const PAT = {flat: 0, tiles: 1, metal: 2, plain: 3, gold: 4, brick: 5, stone: 6, glass: 7};

const c = (hex) => new THREE.Color(hex);

export class Kit {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.col = [];
    this.pat = [];
    this.m = new THREE.Matrix4();
    this.v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    this.e1 = new THREE.Vector3();
    this.e2 = new THREE.Vector3();
    this.n = new THREE.Vector3();
  }

  /** Draw inside a moved and turned frame. */
  at({x = 0, y = 0, z = 0, ry = 0, s = 1}, fn) {
    const saved = this.m.clone();
    const t = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry),
      new THREE.Vector3(s, s, s),
    );
    this.m.multiply(t);
    fn();
    this.m.copy(saved);
  }

  /** Repeat round a vertical axis. */
  around(n, fn, start = 0) {
    for (let i = 0; i < n; i++) this.at({ry: start + (i / n) * Math.PI * 2}, () => fn(i));
  }

  tri(a, b, d, color, pat = PAT.plain) {
    const [p, q, r] = this.v;
    p.set(a[0], a[1], a[2]).applyMatrix4(this.m);
    q.set(b[0], b[1], b[2]).applyMatrix4(this.m);
    r.set(d[0], d[1], d[2]).applyMatrix4(this.m);
    this.n.crossVectors(this.e1.subVectors(q, p), this.e2.subVectors(r, p)).normalize();
    const k = typeof color === 'number' || typeof color === 'string' ? c(color) : color;
    for (const v of this.v) {
      this.pos.push(v.x, v.y, v.z);
      this.nor.push(this.n.x, this.n.y, this.n.z);
      this.col.push(k.r, k.g, k.b);
      this.pat.push(pat);
    }
  }

  quad(a, b, d, e, color, pat) {
    this.tri(a, b, d, color, pat);
    this.tri(a, d, e, color, pat);
  }

  /** Box centred on (x, z), standing on y. */
  box(x, y, z, w, h, d, color, pat = PAT.plain) {
    const [x0, x1, y0, y1, z0, z1] = [x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2];
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], color, pat);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], color, pat);
    this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], color, pat);
    this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], color, pat);
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], color, pat);
  }

  /** Truncated pyramid: w by d at the bottom, tw by td at the top. */
  hip(x, y, z, w, d, h, tw, td, color, pat = PAT.tiles) {
    const [x0, x1, z0, z1] = [x - w / 2, x + w / 2, z - d / 2, z + d / 2];
    const [a0, a1, b0, b1] = [x - tw / 2, x + tw / 2, z - td / 2, z + td / 2];
    const t = y + h;
    this.quad([x0, y, z1], [x1, y, z1], [a1, t, b1], [a0, t, b1], color, pat);
    this.quad([x1, y, z0], [x0, y, z0], [a0, t, b0], [a1, t, b0], color, pat);
    this.quad([x1, y, z1], [x1, y, z0], [a1, t, b0], [a1, t, b1], color, pat);
    this.quad([x0, y, z0], [x0, y, z1], [a0, t, b1], [a0, t, b0], color, pat);
    if (tw > 0 || td > 0) this.quad([a0, t, b1], [a1, t, b1], [a1, t, b0], [a0, t, b0], color, pat);
  }

  /** Gabled roof with its ridge along x. */
  gable(x, y, z, w, d, h, color, pat = PAT.tiles, end = color) {
    const [x0, x1, z0, z1] = [x - w / 2, x + w / 2, z - d / 2, z + d / 2];
    const t = y + h;
    this.quad([x0, y, z1], [x1, y, z1], [x1, t, z], [x0, t, z], color, pat);
    this.quad([x1, y, z0], [x0, y, z0], [x0, t, z], [x1, t, z], color, pat);
    this.tri([x1, y, z1], [x1, y, z0], [x1, t, z], end, PAT.plain);
    this.tri([x0, y, z0], [x0, y, z1], [x0, t, z], end, PAT.plain);
  }

  /** Solid of revolution. Profile is a list of [radius, height], bottom to top. */
  lathe(x, y, z, profile, color, pat = PAT.plain, seg = 14) {
    const P = (i, j) => {
      const a = (i / seg) * Math.PI * 2;
      const [r, h] = profile[j];
      return [x + Math.cos(a) * r, y + h, z + Math.sin(a) * r];
    };
    for (let j = 0; j + 1 < profile.length; j++) {
      for (let i = 0; i < seg; i++) {
        const [ll, lr, ur, ul] = [P(i + 1, j), P(i, j), P(i, j + 1), P(i + 1, j + 1)];
        if (profile[j][0] > 0.001) this.tri(ll, lr, ur, color, pat);
        if (profile[j + 1][0] > 0.001) this.tri(ll, ur, ul, color, pat);
      }
    }
  }

  cyl(x, y, z, r, h, color, pat = PAT.plain, seg = 14, top = r) {
    this.lathe(x, y, z, [[r, 0], [top, h], [0, h]], color, pat, seg);
  }

  dome(x, y, z, r, h, color, pat = PAT.metal, seg = 16) {
    const p = [];
    for (let i = 0; i <= 7; i++) {
      const a = (i / 7) * (Math.PI / 2);
      p.push([Math.cos(a) * r, Math.sin(a) * h]);
    }
    this.lathe(x, y, z, p, color, pat, seg);
  }

  onion(x, y, z, r, h, color, pat = PAT.gold, seg = 12) {
    const p = [[r * 0.72, 0], [r, 0.2 * h], [r * 0.98, 0.36 * h], [r * 0.72, 0.56 * h], [r * 0.32, 0.76 * h], [r * 0.1, 0.9 * h], [0, h]];
    this.lathe(x, y, z, p, color, pat, seg);
  }

  /** Baroque helmet: bulging dome, a waist, then a small lantern. */
  helmet(x, y, z, r, h, color, pat = PAT.metal) {
    const p = [[r, 0], [r * 0.98, 0.12 * h], [r * 0.7, 0.3 * h], [r * 0.36, 0.42 * h], [r * 0.4, 0.5 * h], [r * 0.34, 0.62 * h], [r * 0.14, 0.76 * h], [r * 0.06, h], [0, h]];
    this.lathe(x, y, z, p, color, pat, 10);
  }

  spire(x, y, z, r, h, color, pat = PAT.metal, seg = 8) {
    this.lathe(x, y, z, [[r, 0], [0, h]], color, pat, seg);
  }

  cross(x, y, z, h, color = 0xe9c766, pat = PAT.gold) {
    const t = h * 0.07;
    this.box(x, y, z, t, h, t, color, pat);
    this.box(x, y + h * 0.66, z, h * 0.5, t, t, color, pat);
    this.box(x, y + h * 0.66, z, t, t, h * 0.5, color, pat);
  }

  /** A window or door, slightly proud of the wall. (nx, nz) is the way the wall faces. */
  win(x, y, z, nx, nz, w, h, {color = 0x1c2733, frame = null, arch = false, pat = PAT.glass} = {}) {
    const R = [nz, -nx];
    const quad = (o, g, ww, hh, cc, pp) => {
      const P = (u, v) => [x + R[0] * u + nx * o, y + v + g, z + R[1] * u + nz * o];
      const bodyH = arch ? hh - ww / 2 : hh;
      this.quad(P(-ww / 2, 0), P(ww / 2, 0), P(ww / 2, bodyH), P(-ww / 2, bodyH), cc, pp);
      if (arch) {
        const n = 6;
        for (let i = 0; i < n; i++) {
          const a0 = (i / n) * Math.PI;
          const a1 = ((i + 1) / n) * Math.PI;
          this.tri(P(0, bodyH), P(Math.cos(a0) * (ww / 2), bodyH + Math.sin(a0) * (ww / 2)), P(Math.cos(a1) * (ww / 2), bodyH + Math.sin(a1) * (ww / 2)), cc, pp);
        }
      }
    };
    if (frame != null) quad(0.03, -0.12, w + 0.3, h + 0.28, frame, PAT.plain);
    quad(0.06, 0, w, h, color, pat);
  }

  /** Row of n windows along x on the plane z, facing nz. */
  winsX(z, nz, x0, x1, n, y, w, h, opts) {
    for (let i = 0; i < n; i++) this.win(n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (n - 1), y, z, 0, nz, w, h, opts);
  }

  /** Row of n windows along z on the plane x, facing nx. */
  winsZ(x, nx, z0, z1, n, y, w, h, opts) {
    for (let i = 0; i < n; i++) this.win(x, y, n === 1 ? (z0 + z1) / 2 : z0 + ((z1 - z0) * i) / (n - 1), nx, 0, w, h, opts);
  }

  /** The same grid of windows on all four sides of a box. */
  floors(x, z, w, d, ys, nx, nz, ww, wh, opts) {
    const mx = (w / 2) * (1 - 1 / (nx + 1));
    const mz = (d / 2) * (1 - 1 / (nz + 1));
    for (const y of ys) {
      this.winsX(z + d / 2, 1, x - mx, x + mx, nx, y, ww, wh, opts);
      this.winsX(z - d / 2, -1, x - mx, x + mx, nx, y, ww, wh, opts);
      this.winsZ(x + w / 2, 1, z - mz, z + mz, nz, y, ww, wh, opts);
      this.winsZ(x - w / 2, -1, z - mz, z + mz, nz, y, ww, wh, opts);
    }
  }

  colsX(z, x0, x1, n, y, h, r, color = 0xe9e3d3, pat = PAT.plain) {
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (n - 1);
      this.lathe(x, y, z, [[r * 1.35, 0], [r, 0.04 * h], [r * 0.86, 0.94 * h], [r * 1.3, h], [0, h]], color, pat, 8);
    }
  }

  colsZ(x, z0, z1, n, y, h, r, color = 0xe9e3d3, pat = PAT.plain) {
    for (let i = 0; i < n; i++) {
      const z = n === 1 ? (z0 + z1) / 2 : z0 + ((z1 - z0) * i) / (n - 1);
      this.lathe(x, y, z, [[r * 1.35, 0], [r, 0.04 * h], [r * 0.86, 0.94 * h], [r * 1.3, h], [0, h]], color, pat, 8);
    }
  }

  /** Crenels along a straight wall top. */
  crenelsX(z, x0, x1, n, y, h, thick, color, pat = PAT.brick) {
    const step = (x1 - x0) / n;
    for (let i = 0; i < n; i++) this.box(x0 + step * (i + 0.5), y, z, step * 0.56, h, thick, color, pat);
  }

  crenelsZ(x, z0, z1, n, y, h, thick, color, pat = PAT.brick) {
    const step = (z1 - z0) / n;
    for (let i = 0; i < n; i++) this.box(x, y, z0 + step * (i + 0.5), thick, h, step * 0.56, color, pat);
  }

  /** Crude standing figure: robe, shoulders, head. Reads well at driving distance. */
  statue(x, y, z, h, color = 0x5e6a5c, pat = PAT.metal) {
    this.lathe(x, y, z, [[0.2 * h, 0], [0.13 * h, 0.5 * h], [0.17 * h, 0.76 * h], [0.05 * h, 0.82 * h], [0.07 * h, 0.88 * h], [0.08 * h, 0.94 * h], [0, h]], color, pat, 8);
  }

  /** Cornice round a box at height y. */
  cornice(x, y, z, w, d, h, out, color = 0xf0ebdc, pat = PAT.plain) {
    this.box(x, y, z, w + out * 2, h, d + out * 2, color, pat);
  }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aPat', new THREE.Float32BufferAttribute(this.pat, 1));
    return g;
  }
}

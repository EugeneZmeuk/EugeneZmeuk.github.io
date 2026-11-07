import * as THREE from 'three';
import {groundMaterial} from './materials';

const PAT = {plain: 0, grass: 1, asphalt: 2, slabs: 3, setts: 4, water: 5, gravel: 6};

// Painted back to front. Nothing here writes depth, so layers can never z-fight;
// a depth-only plane drawn afterwards keeps objects below ground hidden.
const AREA_ORDER = ['cemetery', 'grass', 'garden', 'park', 'forest', 'pitch', 'water', 'parking', 'square'];

const ROAD_RANK = {footway: 0, path: 0, steps: 0, cycleway: 0, service: 1, pedestrian: 2};

class Layers {
  constructor() {
    this.pos = [];
    this.col = [];
    this.info = [];
    this.road = [];
  }

  vert(x, z, c, info, rx = 0, ry = 0) {
    this.pos.push(x, 0, z);
    this.col.push(c.r, c.g, c.b);
    this.info.push(info[0], info[1], info[2]);
    this.road.push(rx, ry);
  }

  tri(a, b, c, color, info) {
    // keep every triangle facing up, whatever the source ring orientation was
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const [p, q] = cross > 0 ? [c, b] : [b, c];
    this.vert(a[0], a[1], color, info, a[2], a[3]);
    this.vert(p[0], p[1], color, info, p[2], p[3]);
    this.vert(q[0], q[1], color, info, q[2], q[3]);
  }

  polygon(outer, holes, color, pat) {
    const contour = outer.map(([x, y]) => new THREE.Vector2(x, y));
    const hs = (holes || []).map((h) => h.map(([x, y]) => new THREE.Vector2(x, y)));
    const all = contour.concat(...hs);
    const info = [pat, 0, 0];
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(contour, hs)) {
      const [a, b, c] = [all[i], all[j], all[k]];
      this.tri([a.x, -a.y], [b.x, -b.y], [c.x, -c.y], color, info);
    }
  }

  disc(x, y, r, color, pat) {
    const n = 10;
    const info = [pat, r + 1, 0];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      this.tri(
        [x, -y, 0, 0],
        [x + Math.cos(a0) * r, -(y + Math.sin(a0) * r), 0, 0],
        [x + Math.cos(a1) * r, -(y + Math.sin(a1) * r), 0, 0],
        color,
        info,
      );
    }
  }

  ribbon(pts, width, color, pat, mark) {
    const half = width / 2;
    const info = [pat, half, mark];
    const n = pts.length;
    const offs = [];
    for (let i = 0; i < n; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[Math.min(n - 1, i + 1)];
      let dx = p1[0] - p0[0];
      let dy = p1[1] - p0[1];
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      let scale = 1;
      if (i > 0 && i < n - 1) {
        const ax = pts[i][0] - pts[i - 1][0];
        const ay = pts[i][1] - pts[i - 1][1];
        const al = Math.hypot(ax, ay) || 1;
        const cos = (ax * dx + ay * dy) / al;
        scale = Math.min(1 / Math.max(cos, 0.45), 2.2);
      }
      offs.push([-dy * half * scale, dx * half * scale]);
    }
    let along = 0;
    for (let i = 0; i + 1 < n; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      const seg = Math.hypot(bx - ax, by - ay);
      const [o0x, o0y] = offs[i];
      const [o1x, o1y] = offs[i + 1];
      const l0 = [ax + o0x, -(ay + o0y), -half, along];
      const r0 = [ax - o0x, -(ay - o0y), half, along];
      const l1 = [bx + o1x, -(by + o1y), -half, along + seg];
      const r1 = [bx - o1x, -(by - o1y), half, along + seg];
      this.tri(l0, r0, r1, color, info);
      this.tri(l0, r1, l1, color, info);
      along += seg;
    }
  }

  build() {
    const g = new THREE.BufferGeometry();
    const n = this.pos.length / 3;
    const normals = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) normals[i * 3 + 1] = 1;
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aInfo', new THREE.Float32BufferAttribute(this.info, 3));
    g.setAttribute('aRoad', new THREE.Float32BufferAttribute(this.road, 2));
    return g;
  }
}

const roadSurface = (r, colors) => {
  if (r.s === 'c') return [colors.setts, PAT.setts];
  if (r.s === 'p' || r.t === 'pedestrian') return [colors.slabs, PAT.slabs];
  if (r.s === 'g') return [colors.gravel, PAT.gravel];
  return [colors.asphalt, PAT.asphalt];
};

export function buildGround(data, level, bounds, uniforms) {
  const colors = {};
  for (const [k, v] of Object.entries(level.surfaces)) colors[k] = new THREE.Color(v);
  const areaStyle = {
    grass: [colors.grass, PAT.grass],
    park: [colors.park, PAT.grass],
    garden: [colors.garden, PAT.grass],
    forest: [colors.forest, PAT.grass],
    cemetery: [colors.garden, PAT.grass],
    pitch: [colors.pitch, PAT.grass],
    water: [colors.water, PAT.water],
    parking: [colors.asphalt, PAT.asphalt],
    square: [colors.square, PAT.setts],
  };
  const out = new Layers();
  for (const kind of AREA_ORDER) {
    const [color, pat] = areaStyle[kind];
    for (const a of data.areas) if (a.k === kind) out.polygon(a.p, a.ho, color, pat);
  }
  const roads = data.roads.slice().sort((a, b) => (ROAD_RANK[a.t] ?? 3) - (ROAD_RANK[b.t] ?? 3));
  const paths = roads.filter((r) => (ROAD_RANK[r.t] ?? 3) === 0);
  const streets = roads.filter((r) => (ROAD_RANK[r.t] ?? 3) > 0).sort((x, y) => x.w - y.w);
  for (const r of paths) {
    const [color, pat] = r.s === 'g' || r.t === 'path' ? [colors.gravel, PAT.gravel] : [colors.pavement, PAT.slabs];
    out.ribbon(r.p, r.w, color, pat, 0);
  }
  // pavements run under the carriageway, so they only show as a strip on each side
  for (const r of streets) {
    if (r.ns || r.t === 'service' || r.t === 'pedestrian') continue;
    const w = r.w + 5.2;
    out.ribbon(r.p, w, colors.pavement, PAT.slabs, 0);
    out.disc(r.p[0][0], r.p[0][1], w / 2, colors.pavement, PAT.slabs);
    out.disc(r.p[r.p.length - 1][0], r.p[r.p.length - 1][1], w / 2, colors.pavement, PAT.slabs);
  }
  for (const r of streets) {
    const [color, pat] = roadSurface(r, colors);
    out.ribbon(r.p, r.w, color, pat, r.m || 0);
    const end = r.p.length - 1;
    out.disc(r.p[0][0], r.p[0][1], r.w / 2 - 0.02, color, pat);
    out.disc(r.p[end][0], r.p[end][1], r.w / 2 - 0.02, color, pat);
  }

  const group = new THREE.Group();
  const [minx, miny, maxx, maxy] = bounds;
  const cx = (minx + maxx) / 2;
  const cz = -(miny + maxy) / 2;
  const w = maxx - minx;
  const h = maxy - miny;
  const mat = groundMaterial(uniforms);

  const base = new THREE.Mesh(new THREE.PlaneGeometry(w * 6, h * 6), mat);
  base.geometry.setAttribute('aInfo', zeroAttr(base.geometry, 3));
  base.geometry.setAttribute('aRoad', zeroAttr(base.geometry, 2));
  base.geometry.setAttribute('color', fillAttr(base.geometry, colors.base));
  base.rotation.x = -Math.PI / 2;
  base.position.set(cx, 0, cz);
  base.receiveShadow = true;
  base.renderOrder = -3;
  group.add(base);

  const surfaces = new THREE.Mesh(out.build(), mat);
  surfaces.receiveShadow = true;
  surfaces.renderOrder = -2;
  surfaces.frustumCulled = false;
  group.add(surfaces);

  const depth = new THREE.Mesh(new THREE.PlaneGeometry(w * 6, h * 6), new THREE.MeshBasicMaterial({colorWrite: false}));
  depth.rotation.x = -Math.PI / 2;
  depth.position.set(cx, 0, cz);
  depth.renderOrder = -1;
  group.add(depth);
  return group;
}

function zeroAttr(g, size) {
  return new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * size), size);
}

function fillAttr(g, c) {
  const n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  return new THREE.BufferAttribute(a, 3);
}

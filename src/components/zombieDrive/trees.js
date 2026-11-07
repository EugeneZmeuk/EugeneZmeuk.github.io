import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import {treeMaterial} from './materials';

const CHUNK = 160;
const DENSITY = {forest: 70, park: 170, cemetery: 130, garden: 260};

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paint(geo, c) {
  const n = geo.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) col.set(c, i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

function strip(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  return g;
}

function broadleaf(rng) {
  const parts = [paint(strip(new THREE.CylinderGeometry(0.16, 0.28, 3.2, 5)).translate(0, 1.6, 0), [0.62, 0.34, 0.3])];
  const blobs = [
    [0, 4.6, 0, 2.5],
    [1.2, 3.9, 0.5, 1.7],
    [-1.0, 4.0, -0.7, 1.6],
    [0.2, 5.8, -0.3, 1.6],
  ];
  for (const [x, y, z, r] of blobs) {
    const g = strip(new THREE.IcosahedronGeometry(r, 1));
    const p = g.attributes.position;
    const cache = new Map();
    for (let i = 0; i < p.count; i++) {
      const k = `${p.getX(i).toFixed(2)},${p.getY(i).toFixed(2)},${p.getZ(i).toFixed(2)}`;
      if (!cache.has(k)) cache.set(k, 0.86 + rng() * 0.28);
      const s = cache.get(k);
      p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.9, p.getZ(i) * s);
    }
    g.translate(x, y, z);
    parts.push(paint(g, [1, 1, 1]));
  }
  return BufferGeometryUtils.mergeGeometries(parts.map((g) => g.computeVertexNormals() || g), false);
}

function conifer() {
  const parts = [paint(strip(new THREE.CylinderGeometry(0.12, 0.22, 2, 5)).translate(0, 1, 0), [0.6, 0.32, 0.3])];
  [[1.9, 2.8, 1.6], [1.5, 2.5, 3.0], [1.05, 2.2, 4.3], [0.6, 1.8, 5.5]].forEach(([r, h, y]) => {
    parts.push(paint(strip(new THREE.ConeGeometry(r, h, 7)).translate(0, y, 0), [0.72, 0.86, 0.76]));
  });
  return BufferGeometryUtils.mergeGeometries(parts.map((g) => g.computeVertexNormals() || g), false);
}

function inPolygon(x, y, r) {
  let hit = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i];
    const [xj, yj] = r[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Tree positions in level coordinates: mapped trees first, then scattered through green areas. */
function placeTrees(data, city, level, rng) {
  const out = [];
  const seen = new Set();
  const add = (x, y) => {
    const key = `${Math.round(x / 2.4)},${Math.round(y / 2.4)}`;
    if (seen.has(key) || out.length >= level.maxTrees) return false;
    if (!city.freeForTree(x, -y)) return false;
    seen.add(key);
    out.push([x, y]);
    return true;
  };
  for (const [x, y] of data.trees) add(x, y);
  for (const row of data.treeRows) {
    for (let i = 0; i + 1 < row.length; i++) {
      const len = Math.hypot(row[i + 1][0] - row[i][0], row[i + 1][1] - row[i][1]);
      for (let d = 0; d < len; d += 9) {
        const t = d / len;
        add(row[i][0] + (row[i + 1][0] - row[i][0]) * t, row[i][1] + (row[i + 1][1] - row[i][1]) * t);
      }
    }
  }
  // Street trees are thinly mapped in OSM outside Krakow, so line the main streets with them.
  const lined = {primary: 1, secondary: 1, tertiary: 0.7, pedestrian: 0.6, residential: 0.25};
  for (const r of data.roads) {
    const share = (lined[r.t] || 0) * level.streetTrees;
    if (!share) continue;
    const off = r.w / 2 + 1.8;
    for (let i = 0; i + 1 < r.p.length; i++) {
      const [ax, ay] = r.p[i];
      const dx = r.p[i + 1][0] - ax;
      const dy = r.p[i + 1][1] - ay;
      const len = Math.hypot(dx, dy);
      if (len < 1) continue;
      for (let d = 6; d < len; d += 13) {
        for (const side of [-1, 1]) {
          if (rng() < share) add(ax + (dx * d) / len - (dy / len) * off * side, ay + (dy * d) / len + (dx / len) * off * side);
        }
      }
    }
  }
  for (const a of data.areas) {
    const spacing = DENSITY[a.k];
    if (!spacing) continue;
    const xs = a.p.map((p) => p[0]);
    const ys = a.p.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const tries = Math.min(1500, ((x1 - x0) * (y1 - y0)) / spacing);
    for (let i = 0; i < tries; i++) {
      const x = x0 + rng() * (x1 - x0);
      const y = y0 + rng() * (y1 - y0);
      if (!inPolygon(x, y, a.p) || (a.ho || []).some((h) => inPolygon(x, y, h))) continue;
      add(x, y);
    }
  }
  return out;
}

export function buildTrees(data, city, level) {
  const rng = mulberry(data.buildings.length);
  const trees = placeTrees(data, city, level, rng);
  const group = new THREE.Group();
  const material = treeMaterial();
  const leaves = level.leafColors.map((h) => new THREE.Color(h));
  const needles = new THREE.Color(level.needleColor);
  const geos = [broadleaf(rng), conifer()];
  const buckets = new Map();
  for (const [x, y] of trees) {
    const kind = rng() < level.coniferShare ? 1 : 0;
    const key = `${Math.floor(x / CHUNK)},${Math.floor(y / CHUNK)},${kind}`;
    if (!buckets.has(key)) buckets.set(key, {kind, items: []});
    buckets.get(key).items.push([x, y]);
  }
  const tmp = new THREE.Object3D();
  const color = new THREE.Color();
  for (const {kind, items} of buckets.values()) {
    const mesh = new THREE.InstancedMesh(geos[kind], material, items.length);
    items.forEach(([x, y], i) => {
      const s = 0.8 + rng() * 0.75;
      tmp.position.set(x, 0, -y);
      tmp.rotation.set(0, rng() * Math.PI * 2, 0);
      tmp.scale.set(s, s * (0.9 + rng() * 0.3), s);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      if (kind) color.copy(needles);
      else color.copy(leaves[Math.floor(rng() * leaves.length)]);
      color.multiplyScalar(0.85 + rng() * 0.3);
      mesh.setColorAt(i, color);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return {group, positions: trees};
}

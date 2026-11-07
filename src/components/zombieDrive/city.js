import * as THREE from 'three';
import {buildBuildings} from './buildings';
import {buildGround} from './ground';
import {buildLandmarks, landmarkPassages} from './landmarks';
import {facadeMaterial, landmarkMaterial, roofMaterial} from './materials';
import {buildTrees} from './trees';

// Level data is in metres: x east, y north. World: x east, z = -north, y up.
export const CELL = 1.5;

export class City {
  constructor(data, level) {
    this.data = data;
    this.level = level;
    const [minx, miny, maxx, maxy] = data.bounds;
    this.minx = minx;
    this.miny = miny;
    this.maxx = maxx;
    this.maxy = maxy;
    this.w = maxx - minx;
    this.h = maxy - miny;
    this.group = new THREE.Group();
    this.uniforms = {
      uTime: {value: 0},
      uNight: {value: level.night ? 1 : 0},
      uGlass: {value: new THREE.Color(level.glassSky)},
    };
    this.buildOccupancy();
    this.group.add(buildGround(data, level, data.bounds, this.uniforms));
    this.cullable = [];
    const city = buildBuildings(data, level, facadeMaterial(this.uniforms), roofMaterial(this.uniforms));
    this.group.add(city);
    this.landmarks = buildLandmarks(data, landmarkMaterial(this.uniforms));
    this.group.add(this.landmarks);
    const trees = buildTrees(data, this, level);
    this.group.add(trees.group);
    for (const t of trees.positions) this.setBlocked(t[0], -t[1]);
    this.treeCount = trees.positions.length;
    for (const m of [...city.children, ...this.landmarks.children, ...trees.group.children]) {
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
      const sphere = m.boundingSphere || m.geometry.boundingSphere;
      // landmarks are placed by their transform, so their sphere is not in world space yet
      m.updateMatrix();
      const center = sphere.center.clone().applyMatrix4(m.matrix);
      this.cullable.push({mesh: m, center, radius: sphere.radius});
    }
    this.start = this.freePointNear(data.start[0], data.start[1]);
    this.finish = this.freePointNear(data.finish[0], data.finish[1]);
    this.buildFinish();
  }

  /** Per-frame work: water animation and dropping whole chunks past the fog. */
  update(pos, time) {
    this.uniforms.uTime.value = time;
    const far = this.level.fog[2] + 40;
    for (const c of this.cullable) {
      const dx = c.center.x - pos.x;
      const dz = c.center.z - pos.z;
      c.mesh.visible = Math.hypot(dx, dz) - c.radius < far;
    }
  }

  dispose() {
    const seen = new Set();
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && !seen.has(o.material)) {
        seen.add(o.material);
        o.material.dispose();
      }
      if (o.isInstancedMesh) o.dispose();
    });
  }

  // ---------- occupancy grid (1 = building, water or tree trunk) ----------
  buildOccupancy() {
    const cols = Math.ceil(this.w / CELL);
    const rows = Math.ceil(this.h / CELL);
    this.cols = cols;
    this.rows = rows;
    const c = document.createElement('canvas');
    c.width = cols;
    c.height = rows;
    const ctx = c.getContext('2d', {willReadFrequently: true});
    const px = ([x, y]) => [(x - this.minx) / CELL, (this.maxy - y) / CELL];
    const trace = (ring) => {
      ring.forEach((p, i) => {
        const [a, b] = px(p);
        if (i === 0) ctx.moveTo(a, b);
        else ctx.lineTo(a, b);
      });
      ctx.closePath();
    };
    const fill = (item) => {
      ctx.beginPath();
      trace(item.p);
      (item.ho || []).forEach(trace);
      ctx.fill('evenodd');
    };
    const stroke = (r, extra) => {
      ctx.lineWidth = (r.w + extra) / CELL;
      ctx.beginPath();
      r.p.forEach((p, i) => {
        const [a, b] = px(p);
        if (i === 0) ctx.moveTo(a, b);
        else ctx.lineTo(a, b);
      });
      ctx.stroke();
    };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // streets first, for keeping scattered trees off them
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cols, rows);
    ctx.strokeStyle = '#000';
    for (const r of this.data.roads) stroke(r, 1);
    const roads = ctx.getImageData(0, 0, cols, rows).data;
    this.roadGrid = new Uint8Array(cols * rows);
    for (let i = 0; i < cols * rows; i++) this.roadGrid[i] = roads[i * 4] < 128 ? 1 : 0;
    // then everything solid: water, bridges back over it, buildings on top
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cols, rows);
    ctx.fillStyle = '#000';
    for (const a of this.data.areas) if (a.k === 'water') fill(a);
    ctx.strokeStyle = '#fff';
    for (const r of this.data.roads) if (r.b) stroke(r, 2);
    ctx.fillStyle = '#000';
    for (const b of this.data.buildings) if (!b.mh || b.mh < 3) fill(b);
    for (const m of this.data.landmarks || []) {
      if (m.solid) {
        const [a, b] = px([m.x, m.y]);
        ctx.beginPath();
        ctx.arc(a, b, m.solid / CELL, 0, Math.PI * 2);
        ctx.fill();
      }
      if (m.hill) {
        fill({p: m.ring});
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 18 / CELL;
        ctx.beginPath();
        trace(m.ring);
        ctx.stroke();
      }
    }
    // the arches and gates a street really runs through
    ctx.strokeStyle = '#fff';
    ctx.lineCap = 'butt';
    ctx.fillStyle = '#fff';
    for (const {path, width, yard} of landmarkPassages(this.data)) {
      stroke({p: path, w: width}, 0);
      if (yard) {
        const [a, b] = px(yard);
        ctx.beginPath();
        ctx.arc(a, b, yard[2] / CELL, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const img = ctx.getImageData(0, 0, cols, rows).data;
    const grid = new Uint8Array(cols * rows);
    for (let i = 0; i < cols * rows; i++) grid[i] = img[i * 4] < 128 ? 1 : 0;
    this.grid = grid;
  }

  cellOf(x, z) {
    const cx = Math.floor((x - this.minx) / CELL);
    const cy = Math.floor((this.maxy + z) / CELL);
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return -1;
    return cy * this.cols + cx;
  }

  setBlocked(x, z) {
    const i = this.cellOf(x, z);
    if (i >= 0) this.grid[i] = 1;
  }

  /** A tree may stand here: open ground, off every street and path. */
  freeForTree(x, z) {
    const i = this.cellOf(x, z);
    return i >= 0 && !this.grid[i] && !this.roadGrid[i];
  }

  /** World (x, z) -> blocked? */
  blocked(x, z) {
    const i = this.cellOf(x, z);
    return i < 0 || this.grid[i] === 1;
  }

  /** True when a circle of radius r around world (x, z) touches no building. */
  clear(x, z, r) {
    if (this.blocked(x, z)) return false;
    for (const rr of [r * 0.5, r]) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        if (this.blocked(x + Math.cos(a) * rr, z + Math.sin(a) * rr)) return false;
      }
    }
    return true;
  }

  /** Find a free world point near data coords (x east, y north) with clearance r. */
  freePointNear(x, y, r = 6) {
    for (let d = 0; d < 160; d += 2) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const px = x + Math.cos(a) * d;
        const pz = -(y + Math.sin(a) * d);
        if (this.clear(px, pz, r)) return new THREE.Vector3(px, 0, pz);
      }
    }
    return new THREE.Vector3(x, 0, -y);
  }

  /** Heading (radians, forward = (-sin, -cos)) with the longest free run from a point, preferring `wish`. */
  openHeading(p, wish) {
    let best = wish;
    let bestRun = -1;
    for (let i = 0; i < 24; i++) {
      const h = wish + (i * Math.PI * 2) / 24;
      let run = 0;
      while (run < 60) {
        run += 2;
        const x = p.x - Math.sin(h) * run;
        const z = p.z - Math.cos(h) * run;
        if (!this.clear(x, z, 2.2)) break;
      }
      const score = run - Math.abs(Math.atan2(Math.sin(h - wish), Math.cos(h - wish))) * 4;
      if (score > bestRun) {
        bestRun = score;
        best = h;
      }
    }
    return best;
  }

  randomFreePoint(cx, cz, rMin, rMax) {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = rMin + Math.random() * (rMax - rMin);
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      if (!this.blocked(x, z)) return new THREE.Vector3(x, 0, z);
    }
    return null;
  }

  // ---------- lamp posts along the main streets ----------
  placeLamps(lampGeo, material, max = 450) {
    const mats = [];
    const tmp = new THREE.Object3D();
    const types = new Set(['primary', 'secondary', 'tertiary', 'residential', 'pedestrian']);
    for (const r of this.data.roads) {
      if (!types.has(r.t) || mats.length >= max) continue;
      let acc = 15;
      for (let i = 1; i < r.p.length; i++) {
        const [x0, y0] = r.p[i - 1];
        const [x1, y1] = r.p[i];
        const dx = x1 - x0;
        const dy = y1 - y0;
        const len = Math.hypot(dx, dy);
        if (len < 0.1) continue;
        const nx = -dy / len;
        const ny = dx / len;
        while (acc < len) {
          const side = mats.length % 2 ? 1 : -1;
          const off = r.w / 2 + 1.2;
          const px = x0 + (dx * acc) / len + nx * off * side;
          const py = y0 + (dy * acc) / len + ny * off * side;
          if (!this.blocked(px, -py) && !this.blocked(px + 0.5 * side * nx, -(py + 0.5 * side * ny))) {
            tmp.position.set(px, 0, -py);
            tmp.rotation.y = Math.atan2(-nx * side, ny * side) + Math.PI;
            tmp.updateMatrix();
            mats.push(tmp.matrix.clone());
            if (mats.length >= max) break;
          }
          acc += 38;
        }
        acc -= len;
        if (mats.length >= max) break;
      }
    }
    const inst = new THREE.InstancedMesh(lampGeo, material, mats.length);
    mats.forEach((m, i) => inst.setMatrixAt(i, m));
    inst.castShadow = true;
    inst.instanceMatrix.needsUpdate = true;
    this.group.add(inst);
    if (this.level.night) this.group.add(this.lampPools(mats));
    return inst;
  }

  /** Soft pools of light under the lamps; real lights would be far too expensive here. */
  lampPools(mats) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,200,130,0.62)');
    g.addColorStop(1, 'rgba(255,200,130,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const geo = new THREE.PlaneGeometry(22, 22).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const pools = new THREE.InstancedMesh(geo, mat, mats.length);
    const p = new THREE.Vector3();
    const tmp = new THREE.Object3D();
    mats.forEach((m, i) => {
      p.setFromMatrixPosition(m);
      tmp.position.set(p.x, 0.05, p.z);
      tmp.updateMatrix();
      pools.setMatrixAt(i, tmp.matrix);
    });
    pools.instanceMatrix.needsUpdate = true;
    pools.frustumCulled = false;
    return pools;
  }

  buildFinish() {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(3, 3, 90, 24, 1, true),
      new THREE.MeshBasicMaterial({color: 0x44ff88, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false}),
    );
    beam.position.y = 45;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(5, 7, 48),
      new THREE.MeshBasicMaterial({color: 0x44ff88, transparent: true, opacity: 0.6, side: THREE.DoubleSide}),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    g.add(beam, ring);
    g.position.copy(this.finish);
    this.finishMesh = g;
    this.group.add(g);
  }
}

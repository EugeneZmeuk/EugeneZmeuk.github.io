import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// Level data is in metres: x east, y north. World: x east, z = -north, y up.
export const CELL = 1.5;

function windowTexture(night) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 128);
  // subtle plaster noise
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  // one window per tile (tile = 3.4 m)
  ctx.fillStyle = '#d9d2c4';
  ctx.fillRect(38, 22, 52, 74);
  ctx.fillStyle = night ? (Math.random() < 0.5 ? '#f3d58a' : '#1a2230') : '#2b3a4a';
  ctx.fillRect(43, 27, 42, 64);
  ctx.fillStyle = '#d9d2c4';
  ctx.fillRect(62, 27, 4, 64);
  ctx.fillRect(43, 56, 42, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(38, 96, 52, 5);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / 3.4, 1 / 3.4);
  tex.anisotropy = 4;
  return tex;
}

function nightWindowTexture() {
  // mixture of lit and dark windows for the night level
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  for (let wx = 0; wx < 2; wx++) {
    for (let wy = 0; wy < 2; wy++) {
      const x = wx * 128 + 38;
      const y = wy * 128 + 22;
      ctx.fillStyle = '#c9c2b4';
      ctx.fillRect(x, y, 52, 74);
      ctx.fillStyle = Math.random() < 0.35 ? '#ffd98a' : '#141a24';
      ctx.fillRect(x + 5, y + 5, 42, 64);
      ctx.fillStyle = '#c9c2b4';
      ctx.fillRect(x + 24, y + 5, 4, 64);
      ctx.fillRect(x + 5, y + 34, 42, 4);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / 6.8, 1 / 6.8);
  tex.anisotropy = 4;
  return tex;
}

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
    this.buildOccupancy();
    this.buildGround();
    this.buildBuildings();
    this.start = this.freePointNear(data.start[0], data.start[1]);
    this.finish = this.freePointNear(data.finish[0], data.finish[1]);
    this.buildFinish();
  }

  // ---------- occupancy grid (1 = building / out of bounds) ----------
  buildOccupancy() {
    const cols = Math.ceil(this.w / CELL);
    const rows = Math.ceil(this.h / CELL);
    this.cols = cols;
    this.rows = rows;
    const c = document.createElement('canvas');
    c.width = cols;
    c.height = rows;
    const ctx = c.getContext('2d', {willReadFrequently: true});
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cols, rows);
    ctx.fillStyle = '#000';
    for (const b of this.data.buildings) {
      ctx.beginPath();
      b.p.forEach(([x, y], i) => {
        const px = (x - this.minx) / CELL;
        const py = (this.maxy - y) / CELL;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
    }
    const img = ctx.getImageData(0, 0, cols, rows).data;
    const grid = new Uint8Array(cols * rows);
    for (let i = 0; i < cols * rows; i++) grid[i] = img[i * 4] < 128 ? 1 : 0;
    this.grid = grid;
  }

  /** World (x, z) -> blocked? */
  blocked(x, z) {
    const y = -z;
    const cx = Math.floor((x - this.minx) / CELL);
    const cy = Math.floor((this.maxy - y) / CELL);
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return true;
    return this.grid[cy * this.cols + cx] === 1;
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

  // ---------- ground with painted roads ----------
  buildGround() {
    const lvl = this.level;
    const size = 3072;
    const scale = size / Math.max(this.w, this.h);
    const c = document.createElement('canvas');
    c.width = Math.round(this.w * scale);
    c.height = Math.round(this.h * scale);
    const ctx = c.getContext('2d');
    ctx.fillStyle = lvl.ground;
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 40000; i++) {
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.12})`;
      ctx.fillRect(Math.random() * c.width, Math.random() * c.height, 3, 3);
    }
    const toPx = ([x, y]) => [(x - this.minx) * scale, (this.maxy - y) * scale];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const drawRoads = (filter, style, widthMul, extra) => {
      ctx.strokeStyle = style;
      for (const r of this.data.roads) {
        if (!filter(r)) continue;
        ctx.lineWidth = Math.max(1.5, r.w * scale * widthMul + (extra || 0));
        ctx.beginPath();
        r.p.forEach((p, i) => {
          const [px, py] = toPx(p);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }
    };
    // kerbs, asphalt, footpaths, centre lines
    drawRoads((r) => r.t !== 'footway', lvl.night ? '#6c6c68' : '#b8b2a6', 1.0, 4);
    drawRoads((r) => r.t !== 'footway', lvl.road, 1.0, 0);
    drawRoads((r) => r.t === 'footway', lvl.night ? '#7d7a72' : '#a9a397', 1.0, 0);
    ctx.setLineDash([8, 10]);
    drawRoads((r) => ['primary', 'secondary', 'tertiary'].includes(r.t), 'rgba(255,255,255,0.55)', 0.05, 1);
    ctx.setLineDash([]);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(this.w, this.h);
    const mat = new THREE.MeshStandardMaterial({map: tex, roughness: 0.95, metalness: 0});
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((this.minx + this.maxx) / 2, 0, -(this.miny + this.maxy) / 2);
    mesh.receiveShadow = true;
    this.group.add(mesh);
    // far ground beyond the data so the horizon never shows the void
    const far = new THREE.Mesh(
      new THREE.PlaneGeometry(this.w * 6, this.h * 6),
      new THREE.MeshStandardMaterial({color: new THREE.Color(lvl.ground).multiplyScalar(0.9), roughness: 1}),
    );
    far.rotation.x = -Math.PI / 2;
    far.position.set(mesh.position.x, -0.05, mesh.position.z);
    far.receiveShadow = true;
    this.group.add(far);
  }

  // ---------- extruded buildings, two merged meshes (roofs, walls) ----------
  buildBuildings() {
    const lvl = this.level;
    const caps = [];
    const sides = [];
    const palette = lvl.palette.map((h) => new THREE.Color(h));
    let idx = 0;
    for (const b of this.data.buildings) {
      const pts = b.p.map(([x, y]) => new THREE.Vector2(x, y));
      if (pts.length < 3) continue;
      const shape = new THREE.Shape(pts);
      let geo;
      try {
        geo = new THREE.ExtrudeGeometry(shape, {depth: b.h, bevelEnabled: false});
      } catch (e) {
        continue;
      }
      geo.rotateX(-Math.PI / 2);
      const col = palette[(idx++ + Math.floor(Math.abs(pts[0].x))) % palette.length];
      const n = geo.attributes.position.count;
      const colors = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.deleteAttribute('uv');
      // regenerate planar UVs for walls in metres so the window texture tiles correctly
      const pos = geo.attributes.position;
      const nor = geo.attributes.normal;
      const uv = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        const nx = Math.abs(nor.getX(i));
        const nz = Math.abs(nor.getZ(i));
        const u = nx > nz ? pos.getZ(i) : pos.getX(i);
        uv[i * 2] = u;
        uv[i * 2 + 1] = pos.getY(i);
      }
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      for (const grp of geo.groups) {
        const part = new THREE.BufferGeometry();
        for (const name of ['position', 'normal', 'color', 'uv']) {
          const a = geo.attributes[name];
          const arr = a.array.slice(grp.start * a.itemSize, (grp.start + grp.count) * a.itemSize);
          part.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize));
        }
        (grp.materialIndex === 0 ? caps : sides).push(part);
      }
    }
    const capGeo = BufferGeometryUtils.mergeGeometries(caps, false);
    const sideGeo = BufferGeometryUtils.mergeGeometries(sides, false);
    const roofMat = new THREE.MeshStandardMaterial({color: lvl.roof, vertexColors: true, roughness: 0.95});
    const wallMat = new THREE.MeshStandardMaterial({
      map: lvl.night ? nightWindowTexture() : windowTexture(false),
      vertexColors: true,
      roughness: 0.9,
    });
    if (lvl.night) {
      wallMat.emissiveMap = wallMat.map;
      wallMat.emissive = new THREE.Color(0x3a3020);
    }
    const roofs = new THREE.Mesh(capGeo, roofMat);
    const walls = new THREE.Mesh(sideGeo, wallMat);
    roofs.castShadow = walls.castShadow = true;
    roofs.receiveShadow = walls.receiveShadow = true;
    this.group.add(roofs, walls);
    this.buildingMeshes = [roofs, walls];
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
    this.lampMatrices = mats;
    return inst;
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

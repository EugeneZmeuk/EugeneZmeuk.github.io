import {PAT} from './kit';

/**
 * Stalin-era block: rusticated base, giant order on the upper floors, heavy cornice.
 * Front is the +z side. Used, with different proportions, across Minsk and Kyiv.
 */
export function stalinBlock(k, {x = 0, z = 0, w, d, h, wall, trim = 0xf0e8d6, base = 0xb9ad98, floors = 4, roof = 0x62666a}) {
  const baseH = Math.min(6, h * 0.24);
  k.box(x, 0, z, w, h, d, wall, PAT.stone);
  k.box(x, 0, z, w + 0.5, baseH, d + 0.5, base, PAT.stone);
  const fh = (h - baseH) / floors;
  const ys = Array.from({length: floors}, (_, i) => baseH + 0.7 + i * fh);
  const nx = Math.max(3, Math.round(w / 3.8));
  const nz = Math.max(2, Math.round(d / 3.8));
  k.floors(x, z, w, d, ys, nx, nz, 1.5, fh * 0.56, {frame: trim});
  k.floors(x, z, w + 0.5, d + 0.5, [0.9], nx, nz, 1.7, baseH * 0.56, {arch: true, frame: base});
  const step = w / Math.max(2, Math.floor(nx / 2));
  for (let i = 0; i <= Math.floor(nx / 2); i++) {
    k.box(x - w / 2 + i * step, baseH, z + d / 2 + 0.25, 0.8, h - baseH, 0.5, trim, PAT.stone);
    k.box(x - w / 2 + i * step, baseH, z - d / 2 - 0.25, 0.8, h - baseH, 0.5, trim, PAT.stone);
  }
  k.cornice(x, h, z, w, d, 0.9, 0.7, trim);
  k.box(x, h + 0.9, z, w - 0.6, 1.1, d - 0.6, trim, PAT.stone);
  k.hip(x, h + 2, z, w - 1.4, d - 1.4, 2.4, Math.max(w - 7, 1), Math.max(d - 7, 1), roof, PAT.metal);
}

/** Classical portico on the +z side of a block. */
export function portico(k, {x = 0, z, w, h, depth = 5, n = 8, r = 0.8, col = 0xf0e8d6, pediment = true, statues = 0, statue = 0xdcd3c0}) {
  k.box(x, 0, z + depth / 2, w + 2, 1.4, depth + 3, 0xb9ad98, PAT.stone);
  k.colsX(z + depth - 0.6, x - w / 2, x + w / 2, n, 1.4, h, r, col);
  k.box(x, 1.4 + h, z + depth / 2, w + 1.4, 1.5, depth, col, PAT.stone);
  if (pediment) {
    k.at({x, y: 2.9 + h, z: z + depth / 2, ry: 0}, () => {
      k.at({ry: Math.PI / 2}, () => k.gable(0, 0, 0, depth, w + 1.4, Math.max(2.4, w * 0.13), col, PAT.stone, col));
    });
  }
  for (let i = 0; i < statues; i++) {
    const t = statues === 1 ? 0.5 : i / (statues - 1);
    k.statue(x - w / 2 + w * t, 2.9 + h, z + depth - 0.8, 3.4, statue, PAT.stone);
  }
}

/** Twin-towered baroque front, white plaster. Front is -x, nave runs along +x. */
export function baroqueChurch(k, {w, d, wall = 0xefe9dc, trim = 0xd9cfbb, roof = 0x8a4a38, cap = 0x4a7f76, capPat = PAT.metal, towerH = 25, navH = 14, onion = false}) {
  const front = -w / 2 + 3;
  const nd = d * 0.58;
  k.box(2, 0, 0, w - 6, navH, nd, wall, PAT.plain);
  k.gable(2, navH, 0, w - 6, nd, nd * 0.34, roof, PAT.tiles, wall);
  k.lathe(w / 2 - 3, 0, 0, [[nd / 2, 0], [nd / 2, navH], [0, navH + nd * 0.3]], wall, PAT.plain, 8);
  k.winsX(nd / 2, 1, -w * 0.28, w * 0.34, 5, navH * 0.34, 1.8, navH * 0.42, {arch: true, frame: trim});
  k.winsX(-nd / 2, -1, -w * 0.28, w * 0.34, 5, navH * 0.34, 1.8, navH * 0.42, {arch: true, frame: trim});
  k.box(front, 0, 0, 6, navH + 4, d * 0.92, wall, PAT.plain);
  k.box(front - 3.3, 0, 0, 0.6, navH + 4, d * 0.5, trim, PAT.plain);
  k.win(front - 3.7, 0, 0, -1, 0, 2.8, 5, {arch: true, color: 0x3a2a20, pat: PAT.plain, frame: trim});
  k.win(front - 3.7, navH * 0.56, 0, -1, 0, 2.2, 4.4, {arch: true, frame: trim});
  k.at({x: front, ry: Math.PI / 2}, () => {
    k.gable(0, navH + 4, 0, d * 0.46, 6, 3.4, wall, PAT.plain, wall);
  });
  const ts = d * 0.27;
  for (const s of [1, -1]) {
    k.at({x: front, z: s * (d * 0.46 - ts / 2)}, () => {
      k.box(0, 0, 0, ts, towerH, ts, wall, PAT.plain);
      k.box(0, navH * 0.6, 0, ts + 0.4, 0.7, ts + 0.4, trim);
      k.box(0, navH + 4, 0, ts + 0.4, 0.7, ts + 0.4, trim);
      k.floors(0, 0, ts, ts, [navH + 6.4], 1, 1, 1.5, 4.6, {arch: true, frame: trim});
      k.cornice(0, towerH, 0, ts, ts, 0.7, 0.35, trim);
      if (onion) k.onion(0, towerH + 0.7, 0, ts * 0.42, ts * 1.2, cap, capPat);
      else k.helmet(0, towerH + 0.7, 0, ts * 0.46, ts * 1.5, cap, capPat);
      k.cross(0, towerH + 0.7 + ts * (onion ? 1.2 : 1.5), 0, 1.8);
    });
  }
}

/** Orthodox cupola on a windowed drum. */
export function cupola(k, x, y, z, r, drum, color, pat = PAT.gold, wall = 0xefe9dc) {
  k.cyl(x, y, z, r, drum, wall, PAT.plain, 10);
  k.at({x, y: y + drum * 0.26, z}, () => k.around(6, () => k.win(r, 0, 0, 1, 0, r * 0.3, drum * 0.5, {arch: true})));
  k.onion(x, y + drum, z, r * 1.1, r * 2.2, color, pat);
  k.cross(x, y + drum + r * 2.2, z, r * 0.9 + 0.7);
}

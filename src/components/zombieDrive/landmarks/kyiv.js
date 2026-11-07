import {PAT} from './kit';
import {cupola, portico, stalinBlock} from './shared';

const GOLD = 0xe8c05a;
const WHITE = 0xf1ece0;

function independence(k) {
  k.lathe(0, 0, 0, [[7, 0], [7, 0.6], [5.6, 0.6], [5.6, 1.2], [0, 1.2]], 0xc9c3b6, PAT.stone, 8);
  // the white pavilion under the column
  k.at({y: 1.2}, () => {
    k.around(8, () => k.cyl(4.4, 0, 0, 0.55, 8, WHITE, PAT.plain, 8), Math.PI / 8);
    k.lathe(0, 0, 0, [[3.4, 0], [3.4, 8], [0, 8]], 0xcdbb94, PAT.glass, 12);
    k.lathe(0, 8, 0, [[5.1, 0], [5.1, 1.2], [2.6, 3], [2.2, 4.4], [0, 4.4]], WHITE, PAT.stone, 12);
  });
  const shaft = [[2, 0], [1.9, 2], [1.72, 44]];
  k.lathe(0, 12.6, 0, [...shaft, [2.2, 45], [2.7, 47], [3, 48], [0, 48]], WHITE, PAT.plain, 12);
  // ring of acanthus gilding at the capital
  k.lathe(0, 57.6, 0, [[2.25, 0], [2.8, 2], [0, 2]], GOLD, PAT.gold, 12);
  // Berehynia holding up a guelder rose branch
  k.at({y: 60.6}, () => {
    k.lathe(0, 0, 0, [[1.1, 0], [0.8, 2.6], [0.72, 4.2], [0.9, 5.2], [0.3, 5.7], [0.36, 6.2], [0.4, 6.6], [0, 7]], GOLD, PAT.gold, 8);
    k.box(0, 5.2, 0, 4.4, 0.4, 0.5, GOLD, PAT.gold);
    for (const s of [1, -1]) k.lathe(s * 2.3, 5.2, 0, [[0.2, 0], [0.5, 1], [0.1, 3], [0, 3.4]], GOLD, PAT.gold, 6);
  });
}

function hotelUkraina(k, {w, d}) {
  const wall = 0xe9dfc8;
  const trim = 0xf5efdf;
  k.box(0, 0, 0, w, 30, d, wall, PAT.stone);
  k.box(0, 0, 0, w + 0.5, 6, d + 0.5, 0xb9ad98, PAT.stone);
  const ys = [8, 12, 16, 20, 24];
  k.floors(0, 0, w, d, ys, 13, 9, 1.5, 2.6, {frame: trim});
  k.cornice(0, 30, 0, w, d, 1, 0.8, trim);
  k.box(0, 31, 0, w * 0.74, 12, d * 0.74, wall, PAT.stone);
  k.floors(0, 0, w * 0.74, d * 0.74, [33, 37], 10, 7, 1.5, 2.6, {frame: trim});
  k.cornice(0, 43, 0, w * 0.74, d * 0.74, 1, 0.7, trim);
  k.box(0, 44, 0, w * 0.44, 14, d * 0.5, wall, PAT.stone);
  k.floors(0, 0, w * 0.44, d * 0.5, [46, 50, 54], 6, 5, 1.4, 2.6, {frame: trim});
  k.cornice(0, 58, 0, w * 0.44, d * 0.5, 0.9, 0.6, trim);
  k.box(0, 59, 0, w * 0.18, 8, d * 0.26, trim, PAT.stone);
  k.hip(0, 67, 0, w * 0.18, d * 0.26, 3, 3, 3, 0x7b7f82, PAT.metal);
  k.spire(0, 70, 0, 0.5, 9, GOLD, PAT.gold, 6);
  for (const a of [1, -1]) for (const b of [1, -1]) {
    k.at({x: (a * w * 0.74) / 2, z: (b * d * 0.74) / 2}, () => k.lathe(0, 44, 0, [[1.5, 0], [1.3, 2.6], [0, 4.6]], trim, PAT.stone, 8));
  }
  k.colsX(d / 2 + 1, -w * 0.24, w * 0.24, 8, 0, 6, 0.6, trim);
}

function tradeUnionsKyiv(k, {w, d}) {
  const wall = 0xe4dbc8;
  k.box(0, 0, 0, w, 24, d * 0.9, wall, PAT.stone);
  k.box(0, 0, 0, w + 0.4, 5, d * 0.9 + 0.4, 0x8f8579, PAT.stone);
  k.floors(0, 0, w, d * 0.9, [6.4, 10.4, 14.4, 18.4], 26, 12, 1.5, 2.6, {frame: 0xf1ebdc});
  k.cornice(0, 24, 0, w, d * 0.9, 0.9, 0.6, 0xf1ebdc);
  k.box(0, 24.9, 0, w - 8, 4, d * 0.9 - 8, 0xd2c9b6, PAT.stone);
  // glass atrium roof and the corner tower with its ball of lights
  k.at({ry: 0}, () => {
    k.gable(0, 28.9, 0, w * 0.5, d * 0.5, 5, 0x6f8fa3, PAT.glass);
  });
  k.at({x: w * 0.44, z: d * 0.36}, () => {
    k.lathe(0, 0, 0, [[6, 0], [6, 33], [6.4, 33.6], [0, 33.6]], wall, PAT.stone, 14);
    k.at({y: 7}, () => k.around(10, () => k.win(6, 0, 0, 1, 0, 1.5, 22, {})));
    k.cyl(0, 33.6, 0, 1.8, 4, 0x4a4f55, PAT.metal, 8);
    k.lathe(0, 37.6, 0, [[0.6, 0], [3.4, 1], [4.8, 3.4], [4.8, 5.4], [3.4, 7.8], [0.6, 8.8], [0, 8.8]], 0x25408a, PAT.gold, 12);
  });
}

function stSophia(k, {w, d}) {
  const wall = 0xf4f0e6;
  const green = 0x4f9a7c;
  k.box(0, 0, 0, w * 0.86, 16, d * 0.84, wall, PAT.plain);
  k.box(0, 0, 0, w * 0.87, 1.6, d * 0.85, 0xc9c3b6, PAT.stone);
  // baroque gables along the sides
  for (const s of [1, -1]) {
    for (let i = 0; i < 5; i++) {
      k.at({x: -w * 0.34 + i * w * 0.17, z: (s * d * 0.84) / 2, ry: Math.PI / 2}, () => k.gable(0, 16, 0, 2, 9, 5.5, wall, PAT.plain, wall));
    }
    k.winsX((s * d * 0.84) / 2, s, -w * 0.36, w * 0.36, 7, 6, 2, 6, {arch: true, frame: 0xdfd5be});
  }
  for (const s of [1, -1]) {
    k.winsZ((s * w * 0.86) / 2, s, -d * 0.3, d * 0.3, 4, 6, 2, 6, {arch: true, frame: 0xdfd5be});
    for (let i = 0; i < 3; i++) {
      k.at({x: (s * w * 0.86) / 2, z: -d * 0.26 + i * d * 0.26}, () => k.gable(0, 16, 0, 2, 9, 5.5, wall, PAT.plain, wall));
    }
  }
  k.hip(0, 16, 0, w * 0.86, d * 0.84, 4, w * 0.6, d * 0.6, green, PAT.metal);
  // thirteen domes: the great one, four round it, and the small outer ones
  cupola(k, 0, 20, 0, 5.4, 7, GOLD, PAT.gold, wall);
  for (const [x, z] of [[-11, -9], [-11, 9], [11, -9], [11, 9]]) cupola(k, x, 19, z, 3.4, 5, green, PAT.gold, wall);
  for (const [x, z] of [[-22, 0], [22, 0], [0, -15], [0, 15], [-20, -15], [-20, 15], [20, -15], [20, 15]]) {
    cupola(k, x, 17, z, 2.2, 3.4, GOLD, PAT.gold, wall);
  }
}

function sophiaBell(k, {w, d}) {
  const s = Math.min(w, d) * 0.9;
  const blue = 0x7fb6c9;
  const tier = (y, size, h) => {
    k.box(0, y, 0, size, h, size, blue, PAT.plain);
    k.floors(0, 0, size, size, [y + h * 0.22], 1, 1, size * 0.34, h * 0.6, {arch: true, color: 0x26303a, pat: PAT.plain, frame: WHITE});
    for (const a of [1, -1]) for (const b of [1, -1]) k.box((a * size) / 2, y, (b * size) / 2, 1, h, 1, WHITE, PAT.plain);
    k.cornice(0, y + h, 0, size, size, 0.8, 0.5, WHITE);
  };
  tier(0, s, 20);
  tier(20.8, s * 0.78, 15);
  tier(36.6, s * 0.6, 13);
  tier(50.4, s * 0.44, 10);
  k.lathe(0, 61.2, 0, [[s * 0.2, 0], [s * 0.21, 2], [s * 0.16, 4]], WHITE, PAT.plain, 8);
  k.helmet(0, 65, 0, s * 0.22, 11, GOLD, PAT.gold);
  k.cross(0, 76, 0, 3);
}

function stMichael(k, {w, d}) {
  const blue = 0x6fa8d6;
  const trim = 0xf6f2e6;
  k.box(0, 0, 0, w * 0.84, 18, d * 0.8, blue, PAT.plain);
  k.box(0, 0, 0, w * 0.85, 1.4, d * 0.81, trim, PAT.plain);
  for (const s of [1, -1]) {
    k.winsX((s * d * 0.8) / 2, s, -w * 0.34, w * 0.34, 6, 6, 2.2, 7, {arch: true, frame: trim});
    for (let i = 0; i < 3; i++) {
      k.at({x: -w * 0.26 + i * w * 0.26, z: (s * d * 0.8) / 2, ry: Math.PI / 2}, () => k.gable(0, 18, 0, 2, 12, 6.4, blue, PAT.plain, trim));
    }
  }
  k.winsZ(-w * 0.42, -1, -d * 0.24, d * 0.24, 2, 7, 2, 7, {arch: true, frame: trim});
  k.win(-w * 0.42, 0, 0, -1, 0, 3.4, 6, {arch: true, color: 0x3a2a20, pat: PAT.plain, frame: trim});
  k.hip(0, 18, 0, w * 0.84, d * 0.8, 4, w * 0.56, d * 0.5, 0x8fb4c6, PAT.metal);
  cupola(k, 0, 22, 0, 5, 7, GOLD, PAT.gold, blue);
  for (const [x, z] of [[-12, -9], [-12, 9], [12, -9], [12, 9], [20, 0], [-20, 0]]) cupola(k, x, 20, z, 2.8, 4.2, GOLD, PAT.gold, blue);
}

function goldenGate(k, {w, d}) {
  const stone = 0xa5866a;
  const s = Math.min(w, d);
  k.box(0, 0, 0, s, 11, s * 0.76, stone, PAT.brick);
  k.box(0, 11, 0, s + 0.6, 6, s * 0.76 + 0.6, 0x8c6f54, PAT.brick);
  k.win(0, 0, (s * 0.76) / 2, 0, 1, 7.4, 10, {arch: true, color: 0x1c1712, pat: PAT.plain, frame: 0xc9ad90});
  k.win(0, 0, -(s * 0.76) / 2, 0, -1, 7.4, 10, {arch: true, color: 0x1c1712, pat: PAT.plain, frame: 0xc9ad90});
  k.hip(0, 17, 0, s + 0.6, s * 0.76 + 0.6, 2.4, s * 0.5, s * 0.4, 0x7f6a55, PAT.tiles);
  // the small church of the Annunciation over the gate, with its gold cupola
  k.box(0, 19.4, 0, 7, 6, 7, 0xefe7d6, PAT.plain);
  k.floors(0, 0, 7, 7, [20.6], 1, 1, 1.4, 3.4, {arch: true});
  cupola(k, 0, 25.4, 0, 2.5, 3, GOLD, PAT.gold, 0xefe7d6);
  for (const a of [1, -1]) k.box((a * (s + 8)) / 2, 0, 0, 8, 12, 5.4, stone, PAT.brick);
}

function lyadski(k, {w}) {
  const stone = 0xd8cfbd;
  k.box(0, 0, 0, w, 7, 3, stone, PAT.stone);
  k.win(0, 0, 1.5, 0, 1, 3.6, 5.2, {arch: true, color: 0x1c1712, pat: PAT.plain, frame: 0xf0e8d6});
  k.win(0, 0, -1.5, 0, -1, 3.6, 5.2, {arch: true, color: 0x1c1712, pat: PAT.plain, frame: 0xf0e8d6});
  k.crenelsX(1.3, -w / 2, w / 2, 6, 7, 1.2, 0.5, stone, PAT.stone);
  k.crenelsX(-1.3, -w / 2, w / 2, 6, 7, 1.2, 0.5, stone, PAT.stone);
  k.cyl(0, 7, 0, 0.9, 2, stone, PAT.stone, 8);
  // Archangel Michael with sword and shield, wings spread
  k.at({y: 9}, () => {
    k.statue(0, 0, 0, 5.4, GOLD, PAT.gold);
    for (const s of [1, -1]) k.tri([0, 4.2, -0.1], [s * 2.6, 6.6, -0.5], [s * 0.5, 2.2, -0.2], GOLD, PAT.gold);
    for (const s of [1, -1]) k.tri([0, 4.2, -0.1], [s * 0.5, 2.2, -0.2], [s * 2.6, 6.6, -0.5], GOLD, PAT.gold);
    k.box(0.9, 3, 0.3, 0.14, 3.4, 0.14, GOLD, PAT.gold);
  });
}

function freedomArch(k, {w}) {
  const R = w * 0.44;
  const n = 26;
  const band = 2.4;
  const top = 2.6;
  const color = (i) => {
    const hue = [0xe05a4e, 0xee9a3e, 0xf1d54c, 0x62b56b, 0x4f8fd0, 0x6f5ac2, 0xb45ab0];
    return hue[Math.floor((i / n) * hue.length)];
  };
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI;
    const a1 = ((i + 1) / n) * Math.PI;
    const P = (a, r, z) => [Math.cos(a) * r, Math.sin(a) * r, z];
    const [r0, r1, h] = [R, R + band, top];
    const c = color(i);
    k.quad(P(a1, r0, h), P(a0, r0, h), P(a0, r1, h), P(a1, r1, h), c, PAT.gold);
    k.quad(P(a0, r0, -h), P(a1, r0, -h), P(a1, r1, -h), P(a0, r1, -h), c, PAT.gold);
    k.quad(P(a0, r1, h), P(a0, r1, -h), P(a1, r1, -h), P(a1, r1, h), 0xc9ced2, PAT.metal);
    k.quad(P(a1, r0, h), P(a1, r0, -h), P(a0, r0, -h), P(a0, r0, h), 0xc9ced2, PAT.metal);
  }
}

function ukrainianHouse(k, {w, d}) {
  const stone = 0xdad5ca;
  const h = 22;
  const bw = w * 0.86;
  const bd = d * 0.86;
  k.box(0, 0, 0, w, 3, d, 0xa9a59b, PAT.stone);
  k.box(0, 3, 0, bw, h - 3, bd, 0x33404d, PAT.glass);
  for (const s of [1, -1]) {
    for (let i = 0; i <= 15; i++) k.box(-bw / 2 + (bw * i) / 15, 3, (s * (bd + 1)) / 2, 1.4, h - 3, 1, stone, PAT.stone);
    for (let i = 0; i <= 12; i++) k.box((s * (bw + 1)) / 2, 3, -bd / 2 + (bd * i) / 12, 1, h - 3, 1.4, stone, PAT.stone);
  }
  k.cornice(0, h, 0, bw, bd, 2.8, 1.2, stone, PAT.stone);
  k.dome(0, h + 2.8, 0, bd * 0.3, 4, 0x8f9aa2, PAT.metal, 18);
  k.box(0, 0, d / 2 + 3, bw * 0.56, 2, 8, 0xa9a59b, PAT.stone);
}

function operaKyiv(k, {w, d}) {
  const wall = 0xd8cdb4;
  const trim = 0xf0e8d6;
  const front = -w / 2 + 5;
  k.box(8, 0, 0, w * 0.74, 21, d * 0.92, wall, PAT.stone);
  k.floors(8, 0, w * 0.74, d * 0.92, [3, 11], 11, 7, 2.2, 6, {arch: true, frame: trim});
  k.cornice(8, 21, 0, w * 0.74, d * 0.92, 1, 0.7, trim);
  k.hip(8, 22, 0, w * 0.74, d * 0.92, 6, w * 0.5, d * 0.5, 0x6d7a78, PAT.metal);
  k.box(w * 0.2, 22, 0, w * 0.28, 13, d * 0.56, wall, PAT.stone);
  k.gable(w * 0.2, 35, 0, w * 0.28, d * 0.56, 5, 0x6d7a78, PAT.metal, wall);
  // curved Renaissance front with its row of arches and griffin pair
  k.lathe(front + 7, 0, 0, [[d * 0.32, 0], [d * 0.32, 23], [d * 0.33, 24], [d * 0.1, 30], [0, 31]], wall, PAT.stone, 18);
  k.at({x: front + 7}, () => k.around(5, () => k.win(d * 0.32, 11, 0, 1, 0, 2.6, 7.4, {arch: true, frame: trim}), Math.PI * 0.6));
  k.at({x: front + 7}, () => k.around(5, () => k.win(d * 0.32, 1, 0, 1, 0, 3, 7, {arch: true, color: 0x3a2a20, pat: PAT.plain, frame: trim}), Math.PI * 0.6));
  k.statue(front + 7 - d * 0.27, 24, 8, 3.2, 0x5e6a5c);
  k.statue(front + 7 - d * 0.27, 24, -8, 3.2, 0x5e6a5c);
}

function tsum(k, {w, d}) {
  const wall = 0xcdc1aa;
  k.box(0, 0, 0, w * 0.92, 30, d * 0.92, wall, PAT.stone);
  k.box(0, 0, 0, w * 0.93, 8, d * 0.93, 0x2f3944, PAT.flat);
  k.floors(0, 0, w * 0.92, d * 0.92, [9.6, 14.6, 19.6, 24.6], 17, 15, 2.6, 3.6, {frame: 0xe9e1cf});
  k.cornice(0, 30, 0, w * 0.92, d * 0.92, 1.2, 0.5, 0xe9e1cf);
  k.box(w * 0.32, 31, d * 0.32, 15, 14, 15, wall, PAT.stone);
  k.floors(w * 0.32, d * 0.32, 15, 15, [35], 1, 1, 8, 5, {color: 0xeef0ea, pat: PAT.plain, frame: 0x2a2f33});
  k.box(w * 0.32, 45, d * 0.32, 15.6, 1, 15.6, 0xe9e1cf);
}

function kmda(k, {w, d}) {
  stalinBlock(k, {w, d, h: 21, wall: 0xd9c6a2, floors: 4});
  k.box(0, 0, d / 2 + 0.8, w * 0.2, 25, 1.6, 0xe6d8bb, PAT.stone);
  k.box(0, 0, 0, 12, 37, d * 0.76, 0xd9c6a2, PAT.stone);
  k.cornice(0, 37, 0, 12, d * 0.76, 0.8, 0.5, 0xf0e8d6);
  k.box(0, 37.8, 0, 8, 9, 8, 0xe6d8bb, PAT.stone);
  k.floors(0, 0, 8, 8, [39], 1, 1, 4.2, 4.2, {color: 0xeef0ea, pat: PAT.plain, frame: 0x2a2f33});
  k.helmet(0, 46.8, 0, 4, 10, 0x6d7a78);
  k.spire(0, 56.8, 0, 0.3, 7, GOLD, PAT.gold, 6);
  portico(k, {z: d / 2, w: w * 0.18, h: 8, n: 6, r: 0.55, depth: 3, pediment: false});
}

export const KYIV = {
  independence: {build: independence},
  hotel_ukraina: {build: hotelUkraina, faces: 'z+'},
  trade_unions_kyiv: {build: tradeUnionsKyiv, faces: 'z+'},
  st_sophia: {build: stSophia, faces: 'x-'},
  sophia_bell: {build: sophiaBell},
  st_michael: {build: stMichael, faces: 'x-'},
  golden_gate: {build: goldenGate, faces: 'z+'},
  lyadski: {build: lyadski},
  freedom_arch: {build: freedomArch},
  ukrainian_house: {build: ukrainianHouse, faces: 'z+'},
  opera_kyiv: {build: operaKyiv, faces: 'x-'},
  tsum: {build: tsum, faces: 'z+'},
  kmda: {build: kmda, faces: 'z+'},
};

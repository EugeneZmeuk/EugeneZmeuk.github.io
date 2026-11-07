import {PAT} from './kit';
import {baroqueChurch, portico, stalinBlock} from './shared';

const GRANITE = 0x9a8f88;
const BRONZE = 0x6a5f3f;

function victoryMonument(k) {
  k.lathe(0, 0, 0, [[12, 0], [12, 0.6], [10, 0.6], [10, 1.2], [8.4, 1.2], [8.4, 1.8], [0, 1.8]], 0xa89d94, PAT.stone, 4);
  k.at({y: 1.8, ry: Math.PI / 4}, () => {
    k.box(0, 0, 0, 7.4, 3.4, 7.4, GRANITE, PAT.stone);
    k.box(0, 3.4, 0, 6.2, 0.6, 6.2, 0xa89d94, PAT.stone);
    for (const f of [0, 1, 2, 3]) {
      k.at({ry: (f * Math.PI) / 2}, () => k.box(0, 0.7, 3.75, 5.4, 2.2, 0.16, BRONZE, PAT.metal));
    }
    k.hip(0, 4, 0, 4.6, 4.6, 36, 1.9, 1.9, GRANITE, PAT.stone);
    k.at({y: 41.5}, () => {
      k.box(0, -1.5, 0, 2.1, 1.5, 2.1, 0xa89d94, PAT.stone);
      // Order of Victory: a star on each face of the top
      for (const f of [0, 1, 2, 3]) {
        k.at({ry: (f * Math.PI) / 2}, () => {
          const n = 10;
          for (let i = 0; i < n; i++) {
            const R = (j) => (j % 2 ? 0.9 : 2.2);
            const A = (j) => Math.PI / 2 + (j / n) * Math.PI * 2;
            k.tri([0, 0.8, 1.1], [Math.cos(A(i)) * R(i), 0.8 + Math.sin(A(i)) * R(i), 1.1], [Math.cos(A(i + 1)) * R(i + 1), 0.8 + Math.sin(A(i + 1)) * R(i + 1), 1.1], i % 2 ? 0xb5362c : 0xe0b04a, PAT.gold);
          }
        });
      }
    });
  });
  // flame in front, on the east side
  k.lathe(0, 1.8, 9.2, [[1.5, 0], [1.2, 0.5], [0, 0.5]], 0x3a3a3c, PAT.metal, 8);
  k.spire(0, 2.3, 9.2, 0.6, 1.4, 0xff9c3a, PAT.gold, 6);
}

function palaceRepublic(k, {w, d}) {
  const wall = 0xd9d3c6;
  const h = 34;
  const bw = w * 0.92;
  const bd = d * 0.86;
  k.box(0, 0, 0, w, 2, d, 0xb1a998, PAT.stone);
  k.box(0, 2, 0, bw, 5, bd, 0x2a3440, PAT.glass);
  k.box(0, 7, 0, bw, h - 7, bd, 0x3a4550, PAT.glass);
  // the rows of tall square piers that give the building its look
  const piers = (axis, span, off) => {
    const n = Math.round(span / 6.4);
    for (let i = 0; i <= n; i++) {
      const t = -span / 2 + (span * i) / n;
      if (axis === 'x') k.box(t, 2, off, 2.8, h - 2, 1.6, wall, PAT.stone);
      else k.box(off, 2, t, 1.6, h - 2, 2.8, wall, PAT.stone);
    }
  };
  for (const s of [1, -1]) {
    piers('x', bw, (s * (bd + 1.6)) / 2);
    piers('z', bd, (s * (bw + 1.6)) / 2);
  }
  k.cornice(0, h, 0, bw, bd, 2.6, 1.8, wall, PAT.stone);
  k.box(0, h + 2.6, 0, bw * 0.84, 3.6, bd * 0.84, wall, PAT.stone);
  k.box(0, 0, d / 2 + 2, bw * 0.6, 1, 8, 0xb1a998, PAT.stone);
}

function tradeUnionsMinsk(k, {w, d}) {
  stalinBlock(k, {w, d: d * 0.8, h: 21, wall: 0xdfc98f, base: 0xc9bda3, floors: 3, z: -d * 0.1});
  portico(k, {z: d * 0.3, w: w * 0.52, h: 17, n: 8, r: 1, depth: 6, col: 0xf0e9d6, statues: 5, statue: 0xe8e2d2});
}

function townHallMinsk(k, {w, d}) {
  const wall = 0xf4f0e6;
  k.box(0, 0, 0, w, 11, d, wall, PAT.plain);
  k.box(0, 5.2, 0, w + 0.4, 0.5, d + 0.4, 0xdcd4c2);
  k.winsX(d / 2, 1, -w * 0.42, w * 0.42, 9, 0.5, 2.6, 4, {arch: true, color: 0x3a3a3c, pat: PAT.plain, frame: 0xe6dfd0});
  k.winsX(-d / 2, -1, -w * 0.42, w * 0.42, 9, 0.5, 2.6, 4, {arch: true, color: 0x3a3a3c, pat: PAT.plain, frame: 0xe6dfd0});
  k.winsX(d / 2, 1, -w * 0.42, w * 0.42, 9, 6.3, 1.5, 3, {frame: 0xdcd4c2});
  k.winsX(-d / 2, -1, -w * 0.42, w * 0.42, 9, 6.3, 1.5, 3, {frame: 0xdcd4c2});
  k.hip(0, 11, 0, w, d, 6, w * 0.6, 1.2, 0x9b4f38, PAT.tiles);
  k.box(0, 11, 0, 6.6, 12, 6.6, wall, PAT.plain);
  k.floors(0, 0, 6.6, 6.6, [17], 1, 1, 2.8, 2.8, {color: 0x20242a, pat: PAT.plain, frame: 0xe0b04a});
  k.cornice(0, 23, 0, 6.6, 6.6, 0.5, 0.3, 0xdcd4c2);
  k.lathe(0, 23.5, 0, [[3, 0], [2.9, 1], [1.4, 3], [0.9, 4], [0.5, 6], [0, 7.4]], 0x4f7f8c, PAT.metal, 8);
  k.spire(0, 30.9, 0, 0.16, 2.4, 0xe0b04a, PAT.gold, 5);
}

function holySpirit(k, p) {
  baroqueChurch(k, {...p, wall: 0xf7f4ec, trim: 0xe3dbc8, roof: 0x7f8b92, cap: 0xe8c56a, capPat: PAT.gold, towerH: 28, navH: 15});
}

function stMary(k, p) {
  baroqueChurch(k, {...p, wall: 0xf4efe2, trim: 0xcdbf9d, roof: 0x9b4f38, cap: 0x6d7a78, towerH: 26, navH: 15});
}

function redChurch(k, {w, d}) {
  const brick = 0xa33f2e;
  const dark = 0x82321f;
  const front = -w / 2 + 3;
  const nd = d * 0.56;
  k.box(1, 0, 0, w - 8, 19, nd, brick, PAT.brick);
  k.gable(1, 19, 0, w - 8, nd, 9, 0x6e2f28, PAT.tiles, brick);
  k.lathe(w / 2 - 3, 0, 0, [[nd / 2, 0], [nd / 2, 19], [0, 27]], brick, PAT.brick, 10);
  k.winsX(nd / 2, 1, -w * 0.26, w * 0.3, 5, 8, 2.2, 7.5, {arch: true, frame: dark});
  k.winsX(-nd / 2, -1, -w * 0.26, w * 0.3, 5, 8, 2.2, 7.5, {arch: true, frame: dark});
  k.box(front + 1, 0, 0, 8, 25, d * 0.5, brick, PAT.brick);
  k.at({x: front + 1, ry: Math.PI / 2}, () => k.gable(0, 25, 0, d * 0.5, 8, 7, brick, PAT.brick, brick));
  k.win(front - 3.1, 0, 0, -1, 0, 3.4, 7, {arch: true, color: 0x2c1a14, pat: PAT.plain, frame: dark});
  k.lathe(front - 3, 12, 0, [[0, 0]], brick);
  k.win(front - 3.1, 9, 0, -1, 0, 5, 5, {color: 0x24303e, frame: dark});
  // the tall tower and its two lower companions
  k.at({x: front + 1, z: d * 0.3}, () => {
    k.box(0, 0, 0, 8.6, 42, 8.6, brick, PAT.brick);
    k.floors(0, 0, 8.6, 8.6, [9, 20, 31], 1, 1, 2.2, 7, {arch: true, frame: dark});
    k.lathe(0, 42, 0, [[5.2, 0], [0, 15]], 0x6e2f28, PAT.tiles, 8);
    k.cross(0, 57, 0, 3);
  });
  k.at({x: front + 1, z: -d * 0.3}, () => {
    k.box(0, 0, 0, 7.2, 30, 7.2, brick, PAT.brick);
    k.floors(0, 0, 7.2, 7.2, [9, 20], 1, 1, 2, 6.6, {arch: true, frame: dark});
    k.lathe(0, 30, 0, [[4.3, 0], [0, 11]], 0x6e2f28, PAT.tiles, 8);
    k.cross(0, 41, 0, 2.4);
  });
  for (const s of [1, -1]) {
    k.at({x: w * 0.3, z: (s * nd) / 2}, () => {
      k.box(0, 0, 0, 5, 26, 5, brick, PAT.brick);
      k.lathe(0, 26, 0, [[3, 0], [0, 7]], 0x6e2f28, PAT.tiles, 6);
    });
  }
}

function peterPaulMinsk(k, p) {
  baroqueChurch(k, {...p, wall: 0xf4e9c9, trim: 0xf9f6ec, roof: 0x4f7f6a, cap: 0x4f7f6a, towerH: 21, navH: 11, onion: true});
  k.cyl(p.w * 0.06, 16, 0, 3.4, 5, 0xf4e9c9, PAT.plain, 10);
  k.onion(p.w * 0.06, 21, 0, 3.8, 7.4, 0x4f7f6a, PAT.metal);
  k.cross(p.w * 0.06, 28.4, 0, 2.2);
}

function kupalaTheatre(k, {w, d}) {
  stalinBlock(k, {w: w * 0.86, d: d * 0.8, h: 15, wall: 0xf1e5cc, base: 0xdccfb5, floors: 2, roof: 0x7b7f82, x: 0, z: 0});
  k.at({x: -w * 0.43, ry: -Math.PI / 2}, () => portico(k, {z: 0, w: d * 0.46, h: 11, n: 6, r: 0.7, depth: 4, statues: 3}));
}

function operaMinsk(k, {w}) {
  const r = w * 0.44;
  const wall = 0xefe7d6;
  k.lathe(0, 0, 0, [[r, 0], [r, 1.6], [r * 0.92, 1.6], [r * 0.92, 15], [r * 0.95, 15.6], [r * 0.95, 16.4], [0, 16.4]], wall, PAT.stone, 28);
  k.at({y: 2}, () => k.around(28, () => k.win(r * 0.92, 0, 0, 1, 0, 2.2, 11, {})));
  k.lathe(0, 16.4, 0, [[r * 0.62, 0], [r * 0.62, 9], [r * 0.65, 9.6], [0, 9.6]], wall, PAT.stone, 22);
  k.at({y: 17.6}, () => k.around(18, () => k.win(r * 0.62, 0, 0, 1, 0, 2, 6.4, {})));
  k.lathe(0, 26, 0, [[r * 0.34, 0], [r * 0.34, 7], [r * 0.36, 7.4], [0, 7.4]], wall, PAT.stone, 18);
  k.colsZ(-r - 1, -r * 0.4, r * 0.4, 8, 1.6, 11, 0.8, 0xf6efdf);
  k.box(-r - 1, 12.6, 0, 2.6, 1.4, r * 0.86, 0xf6efdf, PAT.stone);
}

function gum(k, {w, d}) {
  stalinBlock(k, {w, d: d * 0.92, h: 22, wall: 0xdcc8a0, base: 0xa9927a, floors: 3});
  const z = (d * 0.92) / 2;
  k.colsX(z + 1.2, -w * 0.3, w * 0.3, 10, 6, 14, 0.7, 0xf0e8d6);
  k.box(0, 20, z + 0.6, w * 0.64, 2, 2.4, 0xf0e8d6, PAT.stone);
  k.box(0, 24, 0, 16, 7, 16, 0xdcc8a0, PAT.stone);
  k.dome(0, 31, 0, 7, 6, 0x6d7a78);
}

function circus(k, {w}) {
  const r = w * 0.45;
  const wall = 0xe7dec9;
  k.lathe(0, 0, 0, [[r, 0], [r, 1.2], [r * 0.9, 1.2], [r * 0.9, 11], [r * 0.93, 11.8], [0, 11.8]], wall, PAT.stone, 28);
  k.at({y: 1.2}, () => k.around(24, () => k.win(r * 0.9, 0, 0, 1, 0, 2.6, 8, {color: 0x24303e})));
  k.at({y: 1.2}, () => k.around(24, (i) => k.cyl(r * 0.965, 0, 0, 0.6, 10.4, 0xf4ecd8, PAT.plain, 8), Math.PI / 24));
  k.lathe(0, 11.8, 0, [[r * 0.58, 0], [r * 0.58, 6], [r * 0.6, 6.6], [0, 6.6]], wall, PAT.stone, 22);
  k.dome(0, 18.4, 0, r * 0.58, 9, 0x8fa3a8, PAT.metal, 22);
  k.spire(0, 27.4, 0, 0.5, 5, 0xe0b04a, PAT.gold, 6);
}

export const MINSK = {
  victory_monument: {build: victoryMonument},
  palace_republic: {build: palaceRepublic, faces: 'z+'},
  trade_unions_minsk: {build: tradeUnionsMinsk, faces: 'z+'},
  town_hall_minsk: {build: townHallMinsk, faces: 'z+'},
  holy_spirit: {build: holySpirit, faces: 'x-'},
  st_mary_minsk: {build: stMary, faces: 'x-'},
  red_church: {build: redChurch, faces: 'x-'},
  peter_paul_minsk: {build: peterPaulMinsk, faces: 'x-'},
  kupala_theatre: {build: kupalaTheatre, faces: 'x-'},
  opera_minsk: {build: operaMinsk},
  gum: {build: gum, faces: 'z+'},
  circus: {build: circus},
};

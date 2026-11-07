import {PAT} from './kit';

const BRICK = 0x9a4f38;
const BRICK_DARK = 0x7f4030;
const STONE = 0xc9bfa9;
const PLASTER = 0xe6dcc2;
const COPPER = 0x6f9c8a;
const TILE = 0x9c4a33;

function wawelCathedral(k, {w, d}) {
  const nw = w * 0.82;
  const nd = d * 0.46;
  k.box(0, 0, 0, nw, 20, nd, BRICK, PAT.brick);
  k.gable(0, 20, 0, nw + 1, nd + 1, 9, COPPER, PAT.metal, BRICK);
  k.box(0, 0, 0, nw * 1.02, 8, d * 0.74, STONE, PAT.stone);
  k.winsX(nd / 2, 1, -nw * 0.4, nw * 0.4, 7, 9, 2.2, 8, {arch: true});
  k.winsX(-nd / 2, -1, -nw * 0.4, nw * 0.4, 7, 9, 2.2, 8, {arch: true});
  // apse at the east end
  k.lathe(nw / 2, 0, 0, [[nd * 0.5, 0], [nd * 0.5, 20], [nd * 0.12, 27], [0, 27]], BRICK, PAT.brick, 10);
  // Sigismund Tower, the tall green-topped one
  k.at({x: -nw * 0.34, z: nd * 0.82}, () => {
    k.box(0, 0, 0, 11, 34, 11, BRICK, PAT.brick);
    k.floors(0, 0, 11, 11, [12, 24], 2, 2, 1.6, 6, {arch: true});
    k.box(0, 34, 0, 12.4, 1, 12.4, STONE, PAT.stone);
    k.hip(0, 35, 0, 12, 12, 7, 7, 7, COPPER, PAT.metal);
    k.helmet(0, 42, 0, 3.6, 11, COPPER);
    k.cross(0, 53, 0, 3);
  });
  // Clock Tower
  k.at({x: -nw * 0.34, z: -nd * 0.82}, () => {
    k.box(0, 0, 0, 9.5, 30, 9.5, BRICK_DARK, PAT.brick);
    k.box(0, 30, 0, 8.4, 7, 8.4, PLASTER);
    k.floors(0, 0, 8.4, 8.4, [31], 1, 1, 3.2, 3.2, {color: 0xe9e0c8, pat: PAT.plain, frame: 0x2a2f33});
    k.helmet(0, 37, 0, 4.6, 12, COPPER);
    k.cross(0, 49, 0, 2.5);
  });
  // Sigismund Chapel with its gilded dome, and the dark Vasa Chapel beside it
  k.at({x: nw * 0.06, z: -nd * 0.82}, () => {
    k.box(0, 0, 0, 10, 15, 10, STONE, PAT.stone);
    k.lathe(0, 15, 0, [[4.8, 0], [4.6, 4], [0, 4]], STONE, PAT.stone, 12);
    k.dome(0, 19, 0, 4.7, 5, 0xe0b04a, PAT.gold);
    k.cyl(0, 24, 0, 0.9, 2.2, PLASTER, PAT.plain, 8);
    k.spire(0, 26.2, 0, 0.9, 1.6, 0xe0b04a, PAT.gold);
  });
  k.at({x: nw * 0.24, z: -nd * 0.82}, () => {
    k.box(0, 0, 0, 10, 15, 10, STONE, PAT.stone);
    k.dome(0, 15, 0, 4.6, 6, 0x2c2f33, PAT.metal);
    k.cross(0, 21, 0, 2.5);
  });
  // west front
  k.win(-nw / 2, 3, 0, -1, 0, 5, 8, {arch: true, color: 0x3a2a20, pat: PAT.plain, frame: STONE});
  k.win(-nw / 2, 11, 0, -1, 0, 3.4, 7, {arch: true});
}

// the street through the middle of the Cloth Hall, in the model's own frame
const HALL_GAP = 7.6;
const HALL_ARCH = 10;

function sukiennice(k, {w, d}) {
  const bw = w * 0.92;
  const bd = d * 0.62;
  k.boxGap(0, 0, 0, bw, 12.5, bd, HALL_GAP, HALL_ARCH, PLASTER, PAT.stone);
  // ground-floor arcades on both long sides
  const n = 13;
  const skip = (i) => Math.abs(i - (n - 1) / 2) < 1;
  for (const s of [1, -1]) {
    k.boxGap(0, 0, (s * (d - 1.2)) / 2, bw + 6, 8.2, 1.2, 12, 20, 0xeee5d0, PAT.stone);
    k.boxGap(0, 8.2, (s * (bd + (d - bd) / 2)) / 2, bw + 6, 1, (d - bd) / 2 + 1.2, 12, 20, 0xb05a3c, PAT.tiles);
    for (let i = 0; i < n; i++) {
      if (skip(i)) continue;
      const x = -bw * 0.47 + (bw * 0.94 * i) / (n - 1);
      k.win(x, 0.4, (s * d) / 2, 0, s, 5, 7, {arch: true, color: 0x2f2a26, pat: PAT.plain, frame: 0xf4ecd8});
    }
  }
  for (const s of [1, -1]) {
    k.box((s * (bw + 6)) / 2, 0, 0, 2, 8.2, d, 0xeee5d0, PAT.stone);
    k.win((s * (bw + 7)) / 2, 0.4, 0, s, 0, 7, 7.2, {arch: true, color: 0x2f2a26, pat: PAT.plain, frame: 0xf4ecd8});
  }
  // tall middle passage, open from side to side
  for (const s of [1, -1]) {
    k.boxGap(0, 0, (s * d) / 2, 12, 12.5, 1.6, HALL_GAP, HALL_ARCH, 0xe9dfc7, PAT.stone);
    k.at({z: (s * (d + 1.6)) / 2}, () => k.portal(0, 0, 0, 0, s, HALL_GAP, HALL_ARCH, 0xf8f1df, PAT.stone));
  }
  k.winsX(bd / 2, 1, -bw * 0.45, bw * 0.45, 22, 9.8, 1, 1.8, {});
  k.winsX(-bd / 2, -1, -bw * 0.45, bw * 0.45, 22, 9.8, 1, 1.8, {});
  // Renaissance attic: blind arcade and the row of little cresting pieces
  k.cornice(0, 12.5, 0, bw, bd, 0.6, 0.3, 0xf2ead6);
  k.box(0, 13.1, 0, bw, 3.2, bd, 0xefe6d0, PAT.stone);
  k.winsX(bd / 2, 1, -bw * 0.47, bw * 0.47, 40, 13.5, 1.5, 2.3, {arch: true, color: 0xcdbfa6, pat: PAT.plain});
  k.winsX(-bd / 2, -1, -bw * 0.47, bw * 0.47, 40, 13.5, 1.5, 2.3, {arch: true, color: 0xcdbfa6, pat: PAT.plain});
  k.winsZ(bw / 2, 1, -bd * 0.44, bd * 0.44, 8, 13.5, 1.5, 2.3, {arch: true, color: 0xcdbfa6, pat: PAT.plain});
  k.winsZ(-bw / 2, -1, -bd * 0.44, bd * 0.44, 8, 13.5, 1.5, 2.3, {arch: true, color: 0xcdbfa6, pat: PAT.plain});
  const crest = (x, z) => {
    k.box(x, 16.3, z, 0.7, 1.7, 0.5, 0xf4ecd8, PAT.stone);
    k.spire(x, 18, z, 0.32, 1.1, 0xf4ecd8, PAT.stone, 5);
  };
  for (let i = 0; i <= 30; i++) {
    const x = -bw / 2 + (bw * i) / 30;
    crest(x, bd / 2);
    crest(x, -bd / 2);
  }
  for (let i = 1; i < 6; i++) {
    const z = -bd / 2 + (bd * i) / 6;
    crest(bw / 2, z);
    crest(-bw / 2, z);
  }
  k.gable(0, 16.3, 0, bw - 1.4, bd - 1.4, 7.5, TILE, PAT.tiles, TILE);
}

function mariacki(k, {w, d}) {
  const nw = w * 0.92;
  const nd = d * 0.5;
  const front = -nw / 2;
  k.box(0, 0, 0, nw, 26, nd, BRICK, PAT.brick);
  k.gable(0, 26, 0, nw + 1, nd + 1, 15, 0x6d6f6e, PAT.metal, BRICK);
  // side chapels and buttresses
  for (const s of [1, -1]) {
    k.box(-nw * 0.1, 0, (s * d * 0.33), nw * 0.72, 11, d * 0.18, BRICK_DARK, PAT.brick);
    k.gable(-nw * 0.1, 11, (s * d * 0.34), nw * 0.72, d * 0.2, 3, 0x6d6f6e, PAT.metal, BRICK_DARK);
    for (let i = 0; i < 8; i++) {
      const x = front + 12 + i * ((nw - 16) / 7);
      k.box(x, 0, (s * (nd + 2.4)) / 2, 1.6, 22, 2.8, BRICK_DARK, PAT.brick);
    }
    k.winsX((s * nd) / 2, s, front + 15, nw / 2 - 8, 7, 13, 3, 11, {arch: true});
  }
  // chancel
  k.win(nw / 2, 6, 0, 1, 0, 4, 15, {arch: true});
  k.lathe(nw / 2, 0, 0, [[nd * 0.5, 0], [nd * 0.5, 26], [nd * 0.16, 36], [0, 39]], BRICK, PAT.brick, 8);
  // west front between the towers
  k.win(front - 0.2, 0, 0, -1, 0, 4.2, 7, {arch: true, color: 0x3a2a20, pat: PAT.plain, frame: STONE});
  k.win(front - 0.2, 10, 0, -1, 0, 5.2, 13, {arch: true});
  k.gable(front + 6, 0, 0, 13, 7, 0.01, BRICK, PAT.brick, BRICK);
  // Hejnal tower: the taller north one with its Gothic crown of turrets
  k.at({x: front + 4, z: d * 0.27}, () => {
    k.box(0, 0, 0, 12.5, 60, 12.5, BRICK, PAT.brick);
    k.floors(0, 0, 12.5, 12.5, [14, 26, 38, 49], 1, 1, 2.6, 6.5, {arch: true});
    k.cornice(0, 60, 0, 12.5, 12.5, 0.8, 0.3, STONE, PAT.stone);
    k.lathe(0, 60.8, 0, [[6, 0], [6, 2], [2.4, 11], [1.4, 17], [0, 20]], COPPER, PAT.metal, 8);
    k.around(4, () => {
      k.cyl(5.3, 60.8, 5.3, 1.1, 3, COPPER, PAT.metal, 6);
      k.spire(5.3, 63.8, 5.3, 1.1, 7, COPPER, PAT.metal, 6);
    });
    k.around(4, () => k.spire(6.2, 60.8, 0, 0.8, 5, COPPER, PAT.metal, 6));
    k.lathe(0, 78, 0, [[0.9, 0], [1.2, 0.6], [0.7, 1.1], [0.2, 1.8], [0, 2.2]], 0xe0b04a, PAT.gold, 8);
  });
  // lower south tower with the Renaissance cupola
  k.at({x: front + 4, z: -d * 0.27}, () => {
    k.box(0, 0, 0, 11.5, 52, 11.5, BRICK, PAT.brick);
    k.floors(0, 0, 11.5, 11.5, [14, 26, 38], 1, 1, 2.4, 6.5, {arch: true});
    k.cornice(0, 52, 0, 11.5, 11.5, 0.8, 0.3, STONE, PAT.stone);
    k.helmet(0, 52.8, 0, 5.6, 15, COPPER);
  });
}

function townHallTower(k, {w, d}) {
  const s = Math.min(w, d);
  k.box(0, 0, 0, s, 38, s, BRICK, PAT.brick);
  k.box(0, 0, 0, s + 1, 6, s + 1, STONE, PAT.stone);
  k.floors(0, 0, s, s, [9, 18, 27], 1, 1, 2, 5, {arch: true, frame: STONE});
  k.around(4, () => k.box(s / 2, 0, s / 2, 1.4, 38, 1.4, BRICK_DARK, PAT.brick), Math.PI / 8 * 0);
  k.cornice(0, 38, 0, s, s, 0.8, 0.5, STONE, PAT.stone);
  k.box(0, 38.8, 0, s * 0.82, 7, s * 0.82, PLASTER);
  k.floors(0, 0, s * 0.82, s * 0.82, [40], 1, 1, 3.4, 3.4, {color: 0xe9e0c8, pat: PAT.plain, frame: 0x2a2f33});
  k.helmet(0, 45.8, 0, s * 0.44, 16, COPPER);
  k.spire(0, 61.8, 0, 0.3, 3, 0xe0b04a, PAT.gold, 6);
}

// centre of the drum and the walkway through it, measured from the OSM footpath
const BARBAKAN = {x: 3.4, z: -1.3, door: Math.atan2(-13.7, -2.4), neck: Math.atan2(11.9, -18.5)};
const BARBAKAN_DOOR = 7;

function barbakan(k) {
  const {x, z, door, neck} = BARBAKAN;
  // hollow like the real one: a thick round wall with a courtyard inside
  k.ring(x, 0, z, 9, 12.5, BARBAKAN_DOOR, BRICK, PAT.brick, [door, neck], 0.3);
  k.ring(x, BARBAKAN_DOOR, z, 9, 12.5, 6, BRICK, PAT.brick, [], 0.24, 28, true);
  k.ring(x, 9, z, 12.5, 12.9, 0.7, STONE, PAT.stone);
  k.at({x, z}, () => {
    // loopholes round the drum
    k.around(14, () => k.win(12.5, 8, 0, 1, 0, 0.7, 2.4, {color: 0x1b1714, pat: PAT.plain}));
    k.around(22, () => k.box(12, 13, 0, 1, 1.4, 2, BRICK_DARK, PAT.brick));
    k.around(7, () => {
      k.cyl(11.4, 11, 0, 2.2, 7, BRICK, PAT.brick, 8);
      k.spire(11.4, 18, 0, 2.7, 6, TILE, PAT.tiles, 8);
      k.spire(11.4, 24, 0, 0.14, 1.6, 0xe0b04a, PAT.gold, 5);
    });
    // walled neck towards the Florian Gate
    k.at({ry: -neck}, () => {
      k.box(16, 0, 3.6, 9, 8, 1.2, BRICK_DARK, PAT.brick);
      k.box(16, 0, -3.6, 9, 8, 1.2, BRICK_DARK, PAT.brick);
    });
  });
}

const GATE_ARCH = {width: 4.6, height: 6.8};

function florianGate(k, {w, d}) {
  const s = Math.min(w, d);
  const {width, height} = GATE_ARCH;
  // drawn turned a quarter: the archway runs along z here, and x in the placed model
  k.at({ry: Math.PI / 2}, () => {
    k.boxGap(0, 0, 0, s, 24, s, width, height, BRICK, PAT.brick);
    k.boxGap(0, 0, 0, s + 0.6, 12, s + 0.6, width, height, STONE, PAT.stone);
    for (const f of [1, -1]) {
      k.at({z: (f * (s + 0.6)) / 2}, () => k.portal(0, 0, 0, 0, f, width, height, 0xdfd5be, PAT.stone));
    }
    k.win(0, 8.4, s / 2 + 0.3, 0, 1, 1.6, 2.2, {color: 0xe6dcc2, pat: PAT.plain, frame: 0xb7a98c});
    k.floors(0, 0, s, s, [15], 1, 1, 1.4, 4, {arch: true});
    k.cornice(0, 24, 0, s, s, 0.7, 0.4, STONE, PAT.stone);
    k.crenelsX(s / 2, -s / 2, s / 2, 5, 24.7, 1.6, 0.8, BRICK);
    k.crenelsX(-s / 2, -s / 2, s / 2, 5, 24.7, 1.6, 0.8, BRICK);
    k.crenelsZ(s / 2, -s / 2, s / 2, 5, 24.7, 1.6, 0.8, BRICK);
    k.crenelsZ(-s / 2, -s / 2, s / 2, 5, 24.7, 1.6, 0.8, BRICK);
    k.hip(0, 24.7, 0, s * 0.8, s * 0.8, 3.5, s * 0.46, s * 0.46, COPPER, PAT.metal);
    k.helmet(0, 28.2, 0, s * 0.27, 7.4, COPPER);
    // stubs of the old city wall on both sides
    k.box(s / 2 + 4, 0, 0, 8, 9, 2, BRICK, PAT.brick);
    k.box(-s / 2 - 4, 0, 0, 8, 9, 2, BRICK, PAT.brick);
    k.crenelsX(0, -s / 2 - 8, -s / 2, 3, 9, 1.2, 2, BRICK);
    k.crenelsX(0, s / 2, s / 2 + 8, 3, 9, 1.2, 2, BRICK);
  });
}

function slowackiTheatre(k, {w, d}) {
  const wall = 0xecdfc4;
  const trim = 0xcdb78d;
  k.box(w * 0.04, 0, 0, w * 0.86, 18, d * 0.92, wall, PAT.stone);
  k.box(w * 0.04, 0, 0, w * 0.87, 3.4, d * 0.93, trim, PAT.stone);
  k.floors(w * 0.04, 0, w * 0.86, d * 0.92, [4.6], 10, 5, 2, 3.4, {arch: true, frame: 0xf8f1df});
  k.floors(w * 0.04, 0, w * 0.86, d * 0.92, [11], 10, 5, 2, 4, {arch: true, frame: trim});
  k.cornice(w * 0.04, 18, 0, w * 0.86, d * 0.92, 0.8, 0.5, 0xf4ecd8);
  k.hip(w * 0.04, 18.8, 0, w * 0.86, d * 0.92, 5, w * 0.6, d * 0.5, 0x6b7a78, PAT.metal);
  // fly tower behind
  k.box(w * 0.28, 18.8, 0, w * 0.26, 9, d * 0.5, wall, PAT.stone);
  k.gable(w * 0.28, 27.8, 0, d * 0.5 * 0 + w * 0.26, d * 0.5, 3.4, 0x6b7a78, PAT.metal, wall);
  // rounded baroque front with the loggia
  const x = -w * 0.34;
  k.lathe(x, 0, 0, [[d * 0.34, 0], [d * 0.34, 21], [d * 0.34 + 0.5, 21.6], [d * 0.2, 25], [d * 0.08, 28], [0, 28]], wall, PAT.stone, 18);
  k.colsZ(x - d * 0.34 - 0.6, -d * 0.24, d * 0.24, 6, 7, 10, 0.55, 0xf8f1df);
  for (let i = 0; i < 3; i++) k.win(x - d * 0.34, 0.4, -6 + i * 6, -1, 0, 3.4, 4.8, {arch: true, color: 0x3a2a20, pat: PAT.plain, frame: trim});
  k.lathe(x, 28, 0, [[1.4, 0], [1.2, 1.4], [0, 1.6]], 0x6b7a78, PAT.metal, 8);
  k.statue(x, 29.6, 0, 3.4, 0xe0b04a, PAT.gold);
  for (const s of [1, -1]) {
    k.at({x: x + d * 0.12, z: s * d * 0.34}, () => {
      k.statue(0, 21.5, 0, 2.6, 0xe0b04a, PAT.gold);
    });
    k.at({x: w * 0.04 - w * 0.2, z: (s * d * 0.92) / 2}, () => k.box(0, 0, 0, 7, 21, 1.2, wall, PAT.stone));
  }
}

function peterPaul(k, {w, d}) {
  const wall = 0xe4dac6;
  const front = -w / 2 + 6;
  k.box(4, 0, 0, w * 0.82, 22, d * 0.5, wall, PAT.stone);
  k.gable(4, 22, 0, w * 0.82, d * 0.5, 8, 0x8a4a38, PAT.tiles, wall);
  // transept, drum and the great dome
  k.box(w * 0.1, 0, 0, d * 0.36, 22, d * 0.9, wall, PAT.stone);
  k.at({x: w * 0.1, ry: Math.PI / 2}, () => k.gable(0, 22, 0, d * 0.9, d * 0.36, 8, 0x8a4a38, PAT.tiles, wall));
  k.lathe(w * 0.1, 22, 0, [[7.6, 0], [7.6, 10], [8, 10.6], [0, 10.6]], wall, PAT.stone, 16);
  k.around(10, () => k.win(7.6, 0, 0, 1, 0, 1, 1, {}), 0);
  k.at({x: w * 0.1, y: 25}, () => k.around(8, () => k.win(7.7, 0, 0, 1, 0, 1.8, 5, {arch: true})));
  k.dome(w * 0.1, 32.6, 0, 7.8, 11, COPPER);
  k.cyl(w * 0.1, 43.6, 0, 1.4, 3.4, wall, PAT.stone, 8);
  k.spire(w * 0.1, 47, 0, 1.4, 2, COPPER, PAT.metal);
  k.cross(w * 0.1, 49, 0, 3);
  // Jesuit front in two storeys
  k.box(front, 0, 0, 5, 16, d * 0.62, wall, PAT.stone);
  k.box(front, 16, 0, 5, 12, d * 0.36, wall, PAT.stone);
  k.at({x: front, ry: Math.PI / 2}, () => k.gable(0, 28, 0, d * 0.4, 5, 3.6, wall, PAT.stone, wall));
  k.colsZ(front - 2.9, -d * 0.27, d * 0.27, 6, 0, 16, 0.6, 0xf2ead8);
  k.colsZ(front - 2.9, -d * 0.16, d * 0.16, 4, 16, 11.6, 0.42, 0xf2ead8);
  k.win(front - 2.5, 0, 0, -1, 0, 3.4, 7, {arch: true, color: 0x3a2a20, pat: PAT.plain, frame: 0xcdbfa6});
  k.win(front - 2.5, 18, 0, -1, 0, 3, 6, {arch: true});
  // the twelve apostles on the fence in front
  const fx = -w / 2 + 0.6;
  for (let i = 0; i < 12; i++) {
    const z = -d * 0.45 + (d * 0.9 * i) / 11;
    k.box(fx, 0, z, 1.1, 2.2, 1.1, 0xc9bfa9, PAT.stone);
    k.statue(fx, 2.2, z, 2.6, 0xdcd3c0, PAT.stone);
  }
}

function stAndrew(k, {w, d}) {
  const wall = 0xcfc4ae;
  const front = -w / 2 + 3;
  k.box(2, 0, 0, w * 0.74, 14, d * 0.62, wall, PAT.stone);
  k.gable(2, 14, 0, w * 0.74, d * 0.62, 6, 0x8a4a38, PAT.tiles, wall);
  k.box(front, 0, 0, 6, 18, d * 0.95, wall, PAT.stone);
  k.winsZ(front - 3, -1, -2.6, 2.6, 2, 9, 1.2, 3.6, {arch: true});
  k.win(front - 3, 0, 0, -1, 0, 2.6, 4.4, {arch: true, color: 0x3a2a20, pat: PAT.plain, frame: 0xe3dac6});
  for (const s of [1, -1]) {
    k.at({x: front, z: s * d * 0.36}, () => {
      k.lathe(0, 18, 0, [[3, 0], [3, 9], [3.5, 9.5], [0, 9.5]], 0xf3eee2, PAT.plain, 8);
      k.around(8, () => k.win(3, 3, 0, 1, 0, 0.9, 4, {arch: true}));
      k.at({y: 18}, () => k.around(8, () => k.win(3, 2, 0, 1, 0, 0.9, 4, {arch: true})));
      k.helmet(0, 27.5, 0, 3.2, 7.6, 0x4d3a33);
      k.cross(0, 35.1, 0, 1.7);
    });
  }
}

function stWojciech(k, {w, d}) {
  const wall = 0xd9cdb6;
  k.lathe(0, 0, 0, [[d * 0.42, 0], [d * 0.42, 6], [d * 0.45, 6.4], [0, 6.4]], wall, PAT.stone, 12);
  k.at({y: 2}, () => k.around(6, () => k.win(d * 0.42, 0, 0, 1, 0, 1, 2.4, {arch: true})));
  k.lathe(0, 6.4, 0, [[d * 0.3, 0], [d * 0.3, 2.6], [0, 2.6]], wall, PAT.stone, 10);
  k.helmet(0, 9, 0, d * 0.31, 7.5, COPPER);
  k.cross(0, 16.5, 0, 1.6);
  k.box(-w * 0.3, 0, 0, w * 0.34, 4.6, d * 0.42, wall, PAT.stone);
  k.gable(-w * 0.3, 4.6, 0, w * 0.34, d * 0.42, 2, 0x8a4a38, PAT.tiles, wall);
}

function mickiewicz(k) {
  const bronze = 0x4f5f54;
  k.lathe(0, 0, 0, [[6.4, 0], [6.4, 0.4], [5.4, 0.4], [5.4, 0.8], [0, 0.8]], 0xb7ad9c, PAT.stone, 8);
  k.box(0, 0.8, 0, 4.4, 6, 4.4, 0xc2b8a6, PAT.stone);
  k.box(0, 6.8, 0, 5, 0.6, 5, 0xb7ad9c, PAT.stone);
  k.statue(0, 7.4, 0, 4.6, bronze);
  k.around(4, () => {
    k.statue(4.1, 0.8, 0, 3.3, bronze);
    k.statue(3.5, 0.8, 1, 2.3, bronze);
  }, Math.PI / 4);
}

export const KRAKOW = {
  wawel_cathedral: {build: wawelCathedral, faces: 'x-'},
  sukiennice: {build: sukiennice, passage: {path: [[0, -24], [0, 24]], width: 6.6}},
  mariacki: {build: mariacki, faces: 'x-'},
  town_hall_tower: {build: townHallTower},
  barbakan: {build: barbakan, passage: {path: [[0.5, -20], [BARBAKAN.x, BARBAKAN.z], [-18, 12.5]], width: 6, yard: [BARBAKAN.x, BARBAKAN.z, 8]}},
  florian_gate: {build: florianGate, faces: 'x-', passage: {path: [[-9, 0], [9, 0]], width: 4}},
  slowacki_theatre: {build: slowackiTheatre, faces: 'x-'},
  peter_paul: {build: peterPaul, faces: 'x-'},
  st_andrew: {build: stAndrew, faces: 'x-'},
  st_wojciech: {build: stWojciech, faces: 'x-'},
  mickiewicz: {build: mickiewicz},
};

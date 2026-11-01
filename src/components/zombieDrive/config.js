// Game balance and level definitions for Zombie Drive.

export const BEST_KEY = 'zombie-drive-best';

// Car upgrade stages: model pickupN.glb, hit points, speed and ramming power.
export const CAR_STAGES = [
  {name: 'Stock pickup', hp: 100, maxSpeed: 20, accel: 9, ram: 1.5, ramSelf: 4, turn: 2.4},
  {name: 'Bull bar + plates', hp: 150, maxSpeed: 21, accel: 10, ram: 5, ramSelf: 1.2, turn: 2.5},
  {name: 'Armoured, big wheels', hp: 220, maxSpeed: 24, accel: 11, ram: 8, ramSelf: 0.4, turn: 2.7},
  {name: 'War rig', hp: 300, maxSpeed: 27, accel: 12, ram: 12, ramSelf: 0, turn: 2.8},
];

export const WEAPONS = [
  {name: 'Machine gun', rate: 9, dmg: 1.3, spread: 0.025, range: 75, muzzles: [[0, 0.62, -1.6]], color: 0xffd27a},
  {name: 'Twin machine guns', rate: 18, dmg: 1.3, spread: 0.035, range: 75, muzzles: [[-0.22, 0.62, -1.6], [0.22, 0.62, -1.6]], color: 0xffd27a},
  {name: 'Minigun', rate: 42, dmg: 1.0, spread: 0.05, range: 70, spinup: 0.7, muzzles: [[0, 0.7, -1.0]], color: 0xffe0a0},
  {name: 'Twin lasers', laser: true, dps: 38, range: 95, muzzles: [[-0.25, 0.7, -0.8], [0.25, 0.7, -0.8]], color: 0x5ff2ff},
];

// Zombie kinds. Model: zombie_<key>.glb. hp/speed/dmg are base values, scaled per level.
export const ZOMBIES = {
  civilian: {hp: 3, speed: 2.2, dmg: 4, r: 0.6, score: 10},
  office: {hp: 3, speed: 2.4, dmg: 4, r: 0.6, score: 10},
  nurse: {hp: 4, speed: 2.7, dmg: 5, r: 0.6, score: 12},
  builder: {hp: 7, speed: 2.1, dmg: 6, r: 0.65, score: 15},
  cop: {hp: 12, speed: 2.0, dmg: 7, r: 0.7, score: 25},
  soldier: {hp: 10, speed: 2.9, dmg: 8, r: 0.65, score: 25},
  runner: {hp: 3, speed: 5.8, dmg: 5, r: 0.55, score: 20},
  bloater: {hp: 22, speed: 1.4, dmg: 10, r: 0.9, score: 40, throws: true, throwRange: 28, throwEvery: 5},
  brute: {hp: 50, speed: 2.1, dmg: 22, r: 1.2, score: 100, throws: true, throwRange: 45, throwEvery: 3.5, heavy: true},
  crawler: {hp: 6, speed: 6.8, dmg: 6, r: 0.6, score: 30},
};

// Objects the throwers pick up: obj1..obj10.glb (bin, fence, rock, slab, manhole, bench, bricks, sign, cart, tire).
export const THROWABLES = [
  {id: 1, dmg: 10, scale: 0.9}, {id: 2, dmg: 9, scale: 0.9}, {id: 3, dmg: 14, scale: 1.0}, {id: 4, dmg: 18, scale: 0.9},
  {id: 5, dmg: 12, scale: 1.0}, {id: 6, dmg: 12, scale: 0.8}, {id: 7, dmg: 8, scale: 1.2}, {id: 8, dmg: 9, scale: 0.8},
  {id: 9, dmg: 11, scale: 0.9}, {id: 10, dmg: 8, scale: 1.0},
];

export const LEVELS = [
  {
    id: 'krakow',
    title: 'Level 1 · Krakow Old Town',
    brief: 'Clear the Old Town and reach Wawel castle. Score points to mount a second machine gun.',
    goalKills: 40,
    alive: 20,
    startStage: 0,
    upgradeAt: 600,
    zombieHp: 1.0,
    zombieSpeed: 1.0,
    zombieDmg: 1.0,
    spawn: [['civilian', 5], ['office', 4], ['nurse', 3], ['runner', 2], ['builder', 2], ['bloater', 0.4]],
    night: false,
    sky: 0xf5c89a,
    fog: [0xe9c9a3, 70, 300],
    hemi: [0xffe3c0, 0x8f7a63, 1.3],
    sun: [0xffd9b0, 1.8, [60, 80, 40]],
    exposure: 1.15,
    palette: [0xe9c79a, 0xd9a98a, 0xc9c99f, 0xeadfc9, 0xd8b7a2, 0xc8c3d5, 0xe4cfa6, 0xd0b48c],
    roof: 0x8d4b3a,
    ground: '#9b9284',
    road: '#5b5a58',
  },
  {
    id: 'minsk',
    title: 'Level 2 · Minsk centre',
    brief: 'Independence Avenue is overrun. Fight through to Victory Square. Earn the minigun.',
    goalKills: 60,
    alive: 28,
    startStage: 1,
    upgradeAt: 1500,
    zombieHp: 1.5,
    zombieSpeed: 1.2,
    zombieDmg: 1.3,
    spawn: [['civilian', 3], ['office', 3], ['nurse', 2], ['runner', 3], ['builder', 2], ['cop', 2], ['soldier', 2], ['bloater', 1], ['brute', 0.4]],
    night: false,
    sky: 0xbfd2e6,
    fog: [0xc5d1dc, 80, 340],
    hemi: [0xd8e6ff, 0x6c6c66, 1.2],
    sun: [0xfff2e0, 1.5, [-50, 90, 60]],
    exposure: 1.05,
    palette: [0xe6d9b8, 0xd9cdb0, 0xcfc4ad, 0xe8e2d2, 0xb8b4a8, 0xd4c7a5, 0xc9b99a, 0xdcd5c4],
    roof: 0x5a5e62,
    ground: '#8f8f8a',
    road: '#4c4c4e',
  },
  {
    id: 'kyiv',
    title: 'Level 3 · Kyiv, Khreshchatyk',
    brief: 'Night on Khreshchatyk. Hold out and break through to Maidan Nezalezhnosti. Lasers unlock at 3000.',
    goalKills: 80,
    alive: 36,
    startStage: 2,
    upgradeAt: 3000,
    zombieHp: 2.2,
    zombieSpeed: 1.4,
    zombieDmg: 1.6,
    spawn: [['civilian', 2], ['office', 2], ['nurse', 2], ['runner', 4], ['builder', 2], ['cop', 3], ['soldier', 3], ['bloater', 2], ['brute', 1], ['crawler', 3]],
    night: true,
    sky: 0x0d1626,
    fog: [0x0f1a2c, 40, 220],
    hemi: [0x3a4a6a, 0x151210, 0.55],
    sun: [0x8fa4d8, 0.35, [-40, 80, -60]],
    exposure: 0.9,
    palette: [0xcfc3b0, 0xbfb3a0, 0xd6cab5, 0xa9a39a, 0xc4b9a4, 0xb0a890, 0xd0c8b8, 0x9d9a92],
    roof: 0x3d4046,
    ground: '#585a5c',
    road: '#303234',
  },
];

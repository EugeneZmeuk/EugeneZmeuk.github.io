import React, {useEffect, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import styles from './offline-navigator.module.css';

const PROFILES = {
  car: {
    label: 'Car',
    icon: '🚗',
    description: 'Fast on roads, blocked on trails, forest, mountains, and water.',
    costs: {
      road: 1,
      start: 1,
      finish: 1,
      pin: 1,
      trail: null,
      forest: null,
      mountain: null,
      water: null,
      blocked: null,
    },
  },
  bike: {
    label: 'Bike',
    icon: '🚲',
    description: 'Good on roads and trails, slow in forest and mountains.',
    costs: {
      road: 1,
      start: 1,
      finish: 1,
      pin: 1,
      trail: 1,
      forest: 3,
      mountain: 4,
      water: null,
      blocked: null,
    },
  },
  walking: {
    label: 'Walking',
    icon: '🚶',
    description: 'Can pass most terrain, but each move costs more.',
    costs: {
      road: 2,
      start: 2,
      finish: 2,
      pin: 2,
      trail: 2,
      forest: 3,
      mountain: 4,
      water: null,
      blocked: null,
    },
  },
  hiking: {
    label: 'Hiking',
    icon: '🥾',
    description: 'Best for forest and mountain terrain.',
    costs: {
      road: 2,
      start: 2,
      finish: 2,
      pin: 2,
      trail: 2,
      forest: 2,
      mountain: 2,
      water: null,
      blocked: null,
    },
  },
};

const LEVELS = [
  {
    id: 'city',
    title: 'City Route',
    description: 'Roads, blocked streets, and a few useful pins.',
    map: [
      'SRRRRRRRRRRR',
      'RBBBWRRRBBBR',
      'RRRRWRRPRRRR',
      'RBBRWRBBBWRR',
      'RRRRRRRRRWRR',
      'RWWWWBBRRWRR',
      'RRRRRPRRRWRR',
      'RBBBBRBBBWRR',
      'RRRRRRRRRWRR',
      'RRRBBBRRRWRR',
      'RPRRRRRRRRRE',
      'RRRRRRRRRRRR',
    ],
  },
  {
    id: 'forest',
    title: 'Forest Trail',
    description: 'Trails, forest cells, blocked roads, and hidden pins.',
    map: [
      'STTTTFFFFFRR',
      'RBBBTFFFPFRR',
      'RRRRTTFFFFRR',
      'RWWWRTBBBFRR',
      'RFFFRTRRFFRR',
      'RFPFRTTRFFRR',
      'RFFFRBBRFFRR',
      'RRRRRTTRRRRR',
      'RBBBFFFFBBBR',
      'RRTTFFFFTTPR',
      'RRRRTTTTTTRE',
      'RRRRRRRRRRRR',
    ],
  },
  {
    id: 'mountain',
    title: 'Mountain Pass',
    description: 'Mountain terrain rewards the right profile choice.',
    map: [
      'SRRMMMMMMMRR',
      'RRRMMBBBMMRR',
      'RPRMMTTTMMRR',
      'RBBMMTPTMMRR',
      'RRRMMTTTMMRR',
      'RWWWWRRRWWRR',
      'RMMMMMMMRRRR',
      'RMMBBBMMPBBR',
      'RMMTTTMMRRRR',
      'RMMTPTMMRBBR',
      'RRRTTTMRRRRE',
      'RRRRRRRRRRRR',
    ],
  },
];

const TERRAIN = {
  S: {type: 'start', label: 'Start', icon: 'A'},
  E: {type: 'finish', label: 'Finish', icon: 'B'},
  R: {type: 'road', label: 'Road', icon: ''},
  T: {type: 'trail', label: 'Trail', icon: ''},
  F: {type: 'forest', label: 'Forest', icon: ''},
  M: {type: 'mountain', label: 'Mountain', icon: ''},
  W: {type: 'water', label: 'Water', icon: ''},
  B: {type: 'blocked', label: 'Blocked road', icon: '×'},
  P: {type: 'pin', label: 'OsmAnd pin', icon: '📍'},
};

function keyOf(cell) {
  return `${cell.x}-${cell.y}`;
}

function parseLevel(level) {
  let start = null;
  let finish = null;
  const pins = [];

  const grid = level.map.map((row, y) =>
    row.split('').map((symbol, x) => {
      const terrain = TERRAIN[symbol] || TERRAIN.R;

      if (symbol === 'S') {
        start = {x, y};
      }

      if (symbol === 'E') {
        finish = {x, y};
      }

      if (symbol === 'P') {
        pins.push({x, y});
      }

      return {
        x,
        y,
        symbol,
        ...terrain,
      };
    })
  );

  return {
    ...level,
    grid,
    width: grid[0].length,
    height: grid.length,
    start,
    finish,
    pins,
  };
}

function sameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

export default function OfflineNavigator() {
  const parsedLevels = useMemo(() => LEVELS.map(parseLevel), []);
  const [levelIndex, setLevelIndex] = useState(0);
  const [profileKey, setProfileKey] = useState('bike');

  const level = parsedLevels[levelIndex];
  const profile = PROFILES[profileKey];

  const [position, setPosition] = useState(level.start);
  const [score, setScore] = useState(100);
  const [steps, setSteps] = useState(0);
  const [collectedPins, setCollectedPins] = useState([]);
  const [path, setPath] = useState([level.start]);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState('Choose a navigation profile and reach point B.');

  function reset(nextLevelIndex = levelIndex, nextProfileKey = profileKey) {
    const nextLevel = parsedLevels[nextLevelIndex];

    setLevelIndex(nextLevelIndex);
    setProfileKey(nextProfileKey);
    setPosition(nextLevel.start);
    setScore(100);
    setSteps(0);
    setCollectedPins([]);
    setPath([nextLevel.start]);
    setFinished(false);
    setMessage('Choose a navigation profile and reach point B.');
  }

  function changeLevel(event) {
    reset(Number(event.target.value), profileKey);
  }

  function changeProfile(event) {
    reset(levelIndex, event.target.value);
  }

  function move(dx, dy) {
    if (finished) {
      return;
    }

    const next = {
      x: position.x + dx,
      y: position.y + dy,
    };

    if (
      next.x < 0 ||
      next.x >= level.width ||
      next.y < 0 ||
      next.y >= level.height
    ) {
      setScore((value) => value - 5);
      setMessage('Map boundary reached. You need to stay inside the offline map.');
      return;
    }

    const cell = level.grid[next.y][next.x];
    const cost = profile.costs[cell.type];

    if (cost === null || cost === undefined) {
      setScore((value) => value - 8);
      setMessage(`${profile.label} profile cannot pass ${cell.label.toLowerCase()}. Try another route or profile.`);
      return;
    }

    const pinKey = keyOf(next);
    const isNewPin = cell.type === 'pin' && !collectedPins.includes(pinKey);
    const reachedFinish = sameCell(next, level.finish);

    setPosition(next);
    setSteps((value) => value + 1);
    setPath((current) => [...current, next]);

    let scoreChange = -cost;
    let nextMessage = `${profile.label} moved through ${cell.label.toLowerCase()}. Move cost: -${cost}.`;

    if (isNewPin) {
      scoreChange += 15;
      setCollectedPins((current) => [...current, pinKey]);
      nextMessage = 'OsmAnd pin collected. +15 points.';
    }

    if (reachedFinish) {
      const finishBonus = 50 + collectedPins.length * 5;
      scoreChange += finishBonus;
      setFinished(true);
      nextMessage = `Route completed. Finish bonus: +${finishBonus}.`;
    }

    setScore((value) => value + scoreChange);
    setMessage(nextMessage);
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        move(0, -1);
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        move(0, 1);
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        move(-1, 0);
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        move(1, 0);
      }

      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        reset();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  });

  function cellClass(cell) {
    const classes = [
      styles.cell,
      styles[cell.type],
    ];

    if (sameCell(cell, position)) {
      classes.push(styles.player);
    }

    if (path.some((item) => sameCell(item, cell)) && !sameCell(cell, position)) {
      classes.push(styles.path);
    }

    if (cell.type === 'pin' && collectedPins.includes(keyOf(cell))) {
      classes.push(styles.collected);
    }

    return classes.join(' ');
  }

  return (
    <Layout
      title="Offline Navigator"
      description="OsmAnd-style route planning challenge game">
      <main className={styles.page}>
        <section className={styles.header}>
          <p className={styles.eyebrow}>Game</p>
          <h1>Offline Navigator</h1>
          <p>
            Plan your route, choose the right profile, collect OsmAnd pins, and reach point B.
          </p>
        </section>

        <section className={styles.layout}>
          <aside className={styles.panel}>
            <h2>Route setup</h2>

            <label className={styles.field}>
              Level
              <select value={levelIndex} onChange={changeLevel}>
                {parsedLevels.map((item, index) => (
                  <option key={item.id} value={index}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              Navigation profile
              <select value={profileKey} onChange={changeProfile}>
                {Object.entries(PROFILES).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.icon} {item.label}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.profileCard}>
              <strong>{profile.icon} {profile.label}</strong>
              <span>{profile.description}</span>
            </div>

            <div className={styles.stats}>
              <div>
                <span>Score</span>
                <strong>{score}</strong>
              </div>
              <div>
                <span>Steps</span>
                <strong>{steps}</strong>
              </div>
              <div>
                <span>Pins</span>
                <strong>{collectedPins.length}/{level.pins.length}</strong>
              </div>
            </div>

            <button className={styles.restart} type="button" onClick={() => reset()}>
              Restart level
            </button>

            <p className={styles.message}>{message}</p>

            <div className={styles.legend}>
              <h3>Legend</h3>
              <span><i className={styles.roadDot}></i> Road</span>
              <span><i className={styles.trailDot}></i> Trail</span>
              <span><i className={styles.forestDot}></i> Forest</span>
              <span><i className={styles.mountainDot}></i> Mountain</span>
              <span><i className={styles.waterDot}></i> Water</span>
              <span><i className={styles.blockedDot}></i> Blocked</span>
            </div>
          </aside>

          <section className={styles.boardWrap}>
            <div className={styles.levelInfo}>
              <strong>{level.title}</strong>
              <span>{level.description}</span>
            </div>

            <div
              className={styles.board}
              style={{
                gridTemplateColumns: `repeat(${level.width}, 1fr)`,
              }}>
              {level.grid.flat().map((cell) => {
                const isCurrent = sameCell(cell, position);
                const isCollectedPin = cell.type === 'pin' && collectedPins.includes(keyOf(cell));

                return (
                  <button
                    key={`${cell.x}-${cell.y}`}
                    type="button"
                    className={cellClass(cell)}
                    title={cell.label}
                    aria-label={cell.label}>
                    {isCurrent
                      ? profile.icon
                      : isCollectedPin
                        ? '✓'
                        : cell.icon}
                  </button>
                );
              })}
            </div>

            <div className={styles.controls}>
              <button type="button" onClick={() => move(0, -1)}>↑</button>
              <div>
                <button type="button" onClick={() => move(-1, 0)}>←</button>
                <button type="button" onClick={() => move(0, 1)}>↓</button>
                <button type="button" onClick={() => move(1, 0)}>→</button>
              </div>
            </div>

            {finished && (
              <div className={styles.completed}>
                <strong>Route completed!</strong>
                <span>Final score: {score}</span>
              </div>
            )}
          </section>
        </section>
      </main>
    </Layout>
  );
}

import React, {useEffect, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import styles from './route-runner.module.css';

const SIZE = 10;

function same(a, b) {
  return a.x === b.x && a.y === b.y;
}

function randomCell(exclude) {
  let cell;

  do {
    cell = {
      x: Math.floor(Math.random() * SIZE),
      y: Math.floor(Math.random() * SIZE),
    };
  } while (exclude.some((item) => same(item, cell)));

  return cell;
}

function createObstacles(player, pin, count = 10) {
  const obstacles = [];

  while (obstacles.length < count) {
    obstacles.push(randomCell([player, pin, ...obstacles]));
  }

  return obstacles;
}

export default function RouteRunner() {
  const start = {x: 0, y: 0};
  const firstPin = {x: 7, y: 7};

  const [player, setPlayer] = useState(start);
  const [pin, setPin] = useState(firstPin);
  const [obstacles, setObstacles] = useState(() => createObstacles(start, firstPin));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const cells = useMemo(() => {
    return Array.from({length: SIZE * SIZE}, (_, index) => ({
      x: index % SIZE,
      y: Math.floor(index / SIZE),
    }));
  }, []);

  function restart() {
    setPlayer(start);
    setPin(firstPin);
    setObstacles(createObstacles(start, firstPin));
    setScore(0);
    setGameOver(false);
  }

  function move(dx, dy) {
    if (gameOver) {
      return;
    }

    const next = {
      x: Math.max(0, Math.min(SIZE - 1, player.x + dx)),
      y: Math.max(0, Math.min(SIZE - 1, player.y + dy)),
    };

    if (obstacles.some((item) => same(item, next))) {
      setGameOver(true);
      return;
    }

    if (same(next, pin)) {
      const nextScore = score + 1;
      const nextPin = randomCell([next, ...obstacles]);
      const nextObstacles = createObstacles(next, nextPin, Math.min(18, 10 + nextScore));

      setScore(nextScore);
      setPin(nextPin);
      setObstacles(nextObstacles);
    }

    setPlayer(next);
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
        restart();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  });

  return (
    <Layout title="Route Runner" description="OsmAnd-style route runner game">
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.eyebrow}>Game</p>
          <h1>Route Runner</h1>
          <p className={styles.subtitle}>Collect pins and avoid blocked map cells.</p>

          <div className={styles.stats}>
            <span>Score: <strong>{score}</strong></span>
            <button type="button" onClick={restart}>{gameOver ? 'Play again' : 'Restart'}</button>
          </div>

          {gameOver && <div className={styles.gameOver}>Game Over</div>}

          <div className={styles.grid}>
            {cells.map((cell) => {
              const isPlayer = same(cell, player);
              const isPin = same(cell, pin);
              const isObstacle = obstacles.some((item) => same(item, cell));

              return (
                <div
                  key={`${cell.x}-${cell.y}`}
                  className={`${styles.cell} ${isPlayer ? styles.player : ''} ${isPin ? styles.pin : ''} ${isObstacle ? styles.obstacle : ''}`}>
                  {isPlayer ? '🧭' : isPin ? '📍' : isObstacle ? '×' : ''}
                </div>
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
        </section>
      </main>
    </Layout>
  );
}

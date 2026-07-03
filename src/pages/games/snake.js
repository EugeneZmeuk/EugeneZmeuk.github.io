import React, {useEffect, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './snake.module.css';

const CELL_SIZE = 25;
const CANVAS_SIZE = 600;
const SPEED = 10;

const KEY_LEFT = 'ArrowLeft';
const KEY_UP = 'ArrowUp';
const KEY_RIGHT = 'ArrowRight';
const KEY_DOWN = 'ArrowDown';

function randomPosition(max, cell) {
  return Math.floor(Math.random() * max / cell) * cell;
}

function createFruit(snake) {
  let fruit;

  do {
    fruit = {
      x: randomPosition(CANVAS_SIZE, CELL_SIZE),
      y: randomPosition(CANVAS_SIZE, CELL_SIZE),
    };
  } while (snake.some((item) => item.x === fruit.x && item.y === fruit.y));

  return fruit;
}

function isSameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

export default function SnakeGame() {
  const canvasRef = useRef(null);
  const pinUrl = useBaseUrl('/img/osmand-pin.svg');

  const directionRef = useRef({dx: 0, dy: 0});
  const snakeRef = useRef([]);
  const fruitRef = useRef(null);
  const gameIntervalRef = useRef(null);
  const pinImageRef = useRef(null);
  const gameOverRef = useRef(false);
  const scoreRef = useRef(0);

  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  function getStartSnake() {
    return [
      {
        x: CANVAS_SIZE / 2 - CELL_SIZE,
        y: CANVAS_SIZE / 2 - CELL_SIZE,
      },
    ];
  }

  function drawGame(ctx) {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const fruit = fruitRef.current;
    const pinImage = pinImageRef.current;

    if (fruit && pinImage) {
      ctx.drawImage(
        pinImage,
        fruit.x + 1,
        fruit.y + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
    }

    ctx.fillStyle = '#ff8800';

    snakeRef.current.forEach((part) => {
      ctx.fillRect(
        part.x + 1,
        part.y + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
    });

    if (gameOverRef.current) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.74)';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 48px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 16);

      ctx.fillStyle = '#ff8800';
      ctx.font = '700 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.fillText(`Score: ${scoreRef.current}`, CANVAS_SIZE / 2, CANVAS_SIZE / 2 + 28);
    }
  }

  function endGame() {
    gameOverRef.current = true;
    setGameOver(true);
    setStarted(false);

    const canvas = canvasRef.current;

    if (canvas) {
      drawGame(canvas.getContext('2d'));
    }
  }

  function resetGame() {
    const startSnake = getStartSnake();

    directionRef.current = {dx: 0, dy: 0};
    snakeRef.current = startSnake;
    fruitRef.current = createFruit(startSnake);
    gameOverRef.current = false;
    scoreRef.current = 0;

    setScore(0);
    setStarted(false);
    setGameOver(false);

    const canvas = canvasRef.current;

    if (canvas) {
      drawGame(canvas.getContext('2d'));
    }
  }

  function setDirection(nextDirection) {
    if (gameOverRef.current) {
      return;
    }

    const current = directionRef.current;

    if (nextDirection === KEY_LEFT && current.dx === 0) {
      directionRef.current = {dx: -1, dy: 0};
      setStarted(true);
    }

    if (nextDirection === KEY_UP && current.dy === 0) {
      directionRef.current = {dx: 0, dy: -1};
      setStarted(true);
    }

    if (nextDirection === KEY_RIGHT && current.dx === 0) {
      directionRef.current = {dx: 1, dy: 0};
      setStarted(true);
    }

    if (nextDirection === KEY_DOWN && current.dy === 0) {
      directionRef.current = {dx: 0, dy: 1};
      setStarted(true);
    }
  }

  useEffect(() => {
    snakeRef.current = getStartSnake();
    fruitRef.current = createFruit(snakeRef.current);

    const pinImage = new Image();
    pinImage.src = pinUrl;

    pinImage.onload = () => {
      pinImageRef.current = pinImage;

      const canvas = canvasRef.current;

      if (canvas) {
        drawGame(canvas.getContext('2d'));
      }
    };

    function handleKeyDown(event) {
      if ([KEY_LEFT, KEY_UP, KEY_RIGHT, KEY_DOWN].includes(event.key)) {
        event.preventDefault();
        setDirection(event.key);
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    gameIntervalRef.current = window.setInterval(() => {
      const canvas = canvasRef.current;

      if (!canvas || gameOverRef.current) {
        return;
      }

      const ctx = canvas.getContext('2d');
      const direction = directionRef.current;

      if (direction.dx === 0 && direction.dy === 0) {
        drawGame(ctx);
        return;
      }

      const currentSnake = snakeRef.current;
      const currentHead = currentSnake[0];

      const nextHead = {
        x: currentHead.x + direction.dx * CELL_SIZE,
        y: currentHead.y + direction.dy * CELL_SIZE,
      };

      const hitWall =
        nextHead.x < 0 ||
        nextHead.x >= CANVAS_SIZE ||
        nextHead.y < 0 ||
        nextHead.y >= CANVAS_SIZE;

      if (hitWall) {
        endGame();
        return;
      }

      const fruit = fruitRef.current;
      const willEat = fruit && isSameCell(nextHead, fruit);

      const bodyToCheck = willEat
        ? currentSnake
        : currentSnake.slice(0, -1);

      const hitBody = bodyToCheck.some((part) => isSameCell(nextHead, part));

      if (hitBody) {
        endGame();
        return;
      }

      const nextSnake = [nextHead, ...currentSnake];

      if (willEat) {
        const nextScore = scoreRef.current + 1;
        scoreRef.current = nextScore;
        setScore(nextScore);
        fruitRef.current = createFruit(nextSnake);
      } else {
        nextSnake.pop();
      }

      snakeRef.current = nextSnake;
      drawGame(ctx);
    }, 1000 / SPEED);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      if (gameIntervalRef.current) {
        window.clearInterval(gameIntervalRef.current);
      }
    };
  }, [pinUrl]);

  return (
    <Layout
      title="Snake"
      description="Classic Snake game with OsmAnd pins">
      <main className={styles.page}>
        <section className={styles.gameCard}>
          <div className={styles.header}>
            <p className={styles.eyebrow}>Game</p>
            <h1>Snake</h1>
            <p className={styles.subtitle}>
              Classic Snake: collect OsmAnd pins, avoid walls, and do not hit your own route.
            </p>
          </div>

          <div className={styles.scoreRow}>
            <div className={styles.score}>
              Score: <span>{score}</span>
            </div>
            <button className={styles.resetButton} type="button" onClick={resetGame}>
              {gameOver ? 'Play again' : 'Restart'}
            </button>
          </div>

          <div className={styles.canvasWrap}>
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className={styles.canvas}>
              HTML5 canvas is not supported.
            </canvas>
          </div>

          <p className={styles.controlsText}>
            {gameOver
              ? 'Game over. Press Play again to restart.'
              : started
                ? 'Use arrow keys to move. Avoid the walls and your own body.'
                : 'Press any arrow key to start.'}
          </p>

          <div className={styles.mobileControls} aria-label="Mobile controls">
            <button type="button" onClick={() => setDirection(KEY_UP)}>↑</button>
            <div>
              <button type="button" onClick={() => setDirection(KEY_LEFT)}>←</button>
              <button type="button" onClick={() => setDirection(KEY_DOWN)}>↓</button>
              <button type="button" onClick={() => setDirection(KEY_RIGHT)}>→</button>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}

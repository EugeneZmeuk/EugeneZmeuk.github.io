import React, {useEffect, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './pin-catcher.module.css';

const WIDTH = 520;
const HEIGHT = 520;
const PLAYER_WIDTH = 86;
const PIN_SIZE = 34;

function createPin() {
  return {
    id: Math.random().toString(36).slice(2),
    x: Math.random() * (WIDTH - PIN_SIZE),
    y: -PIN_SIZE,
    speed: 2 + Math.random() * 2.6,
  };
}

export default function PinCatcher() {
  const pinUrl = useBaseUrl('/img/osmand-pin.svg');

  const [playerX, setPlayerX] = useState(WIDTH / 2 - PLAYER_WIDTH / 2);
  const [pins, setPins] = useState(() => [createPin()]);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [paused, setPaused] = useState(false);

  const playerRef = useRef(playerX);
  const gameOver = missed >= 5;

  useEffect(() => {
    playerRef.current = playerX;
  }, [playerX]);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setPlayerX((value) => Math.max(0, value - 28));
      }

      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        event.preventDefault();
        setPlayerX((value) => Math.min(WIDTH - PLAYER_WIDTH, value + 28));
      }
    }

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (gameOver || paused) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setPins((current) => {
        let nextScore = 0;
        let nextMissed = 0;

        const moved = current
          .map((pin) => ({...pin, y: pin.y + pin.speed}))
          .filter((pin) => {
            const caught =
              pin.y + PIN_SIZE >= HEIGHT - 46 &&
              pin.x + PIN_SIZE >= playerRef.current &&
              pin.x <= playerRef.current + PLAYER_WIDTH;

            if (caught) {
              nextScore += 1;
              return false;
            }

            if (pin.y > HEIGHT) {
              nextMissed += 1;
              return false;
            }

            return true;
          });

        if (nextScore) {
          setScore((value) => value + nextScore);
        }

        if (nextMissed) {
          setMissed((value) => value + nextMissed);
        }

        if (Math.random() < 0.075) {
          moved.push(createPin());
        }

        if (moved.length === 0) {
          moved.push(createPin());
        }

        return moved;
      });
    }, 25);

    return () => window.clearInterval(interval);
  }, [gameOver, paused]);

  function restart() {
    setPlayerX(WIDTH / 2 - PLAYER_WIDTH / 2);
    setPins([createPin()]);
    setScore(0);
    setMissed(0);
    setPaused(false);
  }

  return (
    <Layout title="Pin Catcher" description="Catch falling OsmAnd pins">
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.eyebrow}>Game</p>
          <h1>Pin Catcher</h1>
          <p className={styles.subtitle}>Move left and right to catch falling OsmAnd pins.</p>

          <div className={styles.stats}>
            <span>Score: <strong>{score}</strong></span>
            <span>Missed: <strong>{missed}/5</strong></span>
            <button type="button" onClick={restart}>{gameOver ? 'Play again' : 'Restart'}</button>
            {!gameOver && <button type="button" onClick={() => setPaused((value) => !value)}>{paused ? 'Resume' : 'Pause'}</button>}
          </div>

          <div className={styles.stage} style={{width: WIDTH, height: HEIGHT}}>
            {pins.map((pin) => (
              <img
                key={pin.id}
                src={pinUrl}
                alt=""
                className={styles.pin}
                style={{left: pin.x, top: pin.y, width: PIN_SIZE, height: PIN_SIZE}}
              />
            ))}

            <div className={styles.player} style={{left: playerX, width: PLAYER_WIDTH}}>
              OsmAnd
            </div>

            {gameOver && <div className={styles.overlay}>Game Over</div>}
          </div>

          <div className={styles.mobile}>
            <button type="button" onClick={() => setPlayerX((value) => Math.max(0, value - 34))}>←</button>
            <button type="button" onClick={() => setPlayerX((value) => Math.min(WIDTH - PLAYER_WIDTH, value + 34))}>→</button>
          </div>
        </section>
      </main>
    </Layout>
  );
}

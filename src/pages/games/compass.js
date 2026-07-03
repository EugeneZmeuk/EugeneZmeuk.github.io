import React, {useEffect, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import styles from './compass.module.css';

const directions = [
  {label: 'North', arrow: '↑', key: 'ArrowUp'},
  {label: 'East', arrow: '→', key: 'ArrowRight'},
  {label: 'South', arrow: '↓', key: 'ArrowDown'},
  {label: 'West', arrow: '←', key: 'ArrowLeft'},
];

function randomDirection() {
  return directions[Math.floor(Math.random() * directions.length)];
}

export default function CompassReaction() {
  const [target, setTarget] = useState(() => randomDirection());
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [message, setMessage] = useState('Choose the correct direction.');
  const finished = round > 10;

  const options = useMemo(() => directions, []);

  function restart() {
    setTarget(randomDirection());
    setScore(0);
    setRound(1);
    setMessage('Choose the correct direction.');
  }

  function choose(direction) {
    if (finished) {
      return;
    }

    if (direction.label === target.label) {
      setScore((value) => value + 1);
      setMessage('Correct!');
    } else {
      setMessage(`Wrong. It was ${target.label}.`);
    }

    window.setTimeout(() => {
      setRound((value) => value + 1);
      setTarget(randomDirection());
    }, 450);
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        restart();
        return;
      }

      const direction = directions.find((item) => item.key === event.key);

      if (direction) {
        event.preventDefault();
        choose(direction);
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  });

  return (
    <Layout title="Compass Reaction" description="Compass reaction game">
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.eyebrow}>Game</p>
          <h1>Compass Reaction</h1>
          <p className={styles.subtitle}>Pick the direction shown on the compass card.</p>

          <div className={styles.stats}>
            <span>Round: <strong>{Math.min(round, 10)}/10</strong></span>
            <span>Score: <strong>{score}</strong></span>
            <button type="button" onClick={restart}>Restart</button>
          </div>

          {finished ? (
            <div className={styles.result}>
              <h2>Finished!</h2>
              <p>Your score: <strong>{score}/10</strong></p>
            </div>
          ) : (
            <>
              <div className={styles.compass}>
                <span>{target.arrow}</span>
                <strong>{target.label}</strong>
              </div>

              <div className={styles.options}>
                {options.map((direction) => (
                  <button key={direction.label} type="button" onClick={() => choose(direction)}>
                    <span>{direction.arrow}</span>
                    {direction.label}
                  </button>
                ))}
              </div>

              <p className={styles.message}>{message}</p>
            </>
          )}
        </section>
      </main>
    </Layout>
  );
}

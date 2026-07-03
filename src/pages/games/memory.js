import React, {useEffect, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import styles from './memory.module.css';

const icons = ['📍', '🗺️', '🧭', '🚲', '🥾', '☁️', '🛣️', '⭐'];

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function createDeck() {
  return shuffle(
    icons.flatMap((icon, index) => [
      {id: `${index}-a`, icon, matched: false},
      {id: `${index}-b`, icon, matched: false},
    ])
  );
}

export default function MemoryGame() {
  const [deck, setDeck] = useState(() => createDeck());
  const [selected, setSelected] = useState([]);
  const [moves, setMoves] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);

  const matchedCount = useMemo(
    () => deck.filter((card) => card.matched).length / 2,
    [deck]
  );

  const completed = matchedCount === icons.length;

  function restart() {
    setDeck(createDeck());
    setSelected([]);
    setMoves(0);
    setFocusIndex(0);
  }

  function selectCard(card) {
    if (selected.length === 2 || card.matched || selected.some((item) => item.id === card.id)) {
      return;
    }

    const nextSelected = [...selected, card];
    setSelected(nextSelected);

    if (nextSelected.length === 2) {
      setMoves((value) => value + 1);

      if (nextSelected[0].icon === nextSelected[1].icon) {
        window.setTimeout(() => {
          setDeck((current) =>
            current.map((item) =>
              item.icon === nextSelected[0].icon
                ? {...item, matched: true}
                : item
            )
          );
          setSelected([]);
        }, 350);
      } else {
        window.setTimeout(() => setSelected([]), 650);
      }
    }
  }

  useEffect(() => {
    function handleKeyDown(event) {
      const columns = 4;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setFocusIndex((value) => Math.min(deck.length - 1, value + 1));
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setFocusIndex((value) => Math.max(0, value - 1));
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusIndex((value) => Math.min(deck.length - 1, value + columns));
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusIndex((value) => Math.max(0, value - columns));
      }

      if ((event.key === 'Enter' || event.key === ' ') && deck[focusIndex]) {
        event.preventDefault();
        selectCard(deck[focusIndex]);
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
    <Layout title="Memory" description="OsmAnd-style memory game">
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.eyebrow}>Game</p>
          <h1>Memory</h1>
          <p className={styles.subtitle}>Find matching OsmAnd-style map and navigation icons.</p>

          <div className={styles.stats}>
            <span>Moves: <strong>{moves}</strong></span>
            <span>Pairs: <strong>{matchedCount}/{icons.length}</strong></span>
            <button type="button" onClick={restart}>Restart</button>
          </div>

          {completed && <div className={styles.complete}>Nice! All pairs found.</div>}

          <div className={styles.grid}>
            {deck.map((card, cardIndex) => {
              const isOpen = card.matched || selected.some((item) => item.id === card.id);

              return (
                <button
                  key={card.id}
                  type="button"
                  className={`${styles.tile} ${isOpen ? styles.open : ''} ${cardIndex === focusIndex ? styles.focused : ''}`}
                  onClick={() => selectCard(card)}>
                  <span>{isOpen ? card.icon : 'O'}</span>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </Layout>
  );
}

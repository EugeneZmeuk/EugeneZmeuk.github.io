import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './games.module.css';

const games = [
  {
    title: 'Offline Navigator',
    href: '/games/offline-navigator',
    text: 'Plan a route, choose the right profile, collect pins, and reach the finish.',
  },
  {
    title: 'Snake',
    href: '/games/snake',
    text: 'Classic Snake with OsmAnd pins, walls, and Game Over logic.',
  },
  {
    title: 'Memory',
    href: '/games/memory',
    text: 'Find matching OsmAnd-style map and navigation icons.',
  },
  {
    title: 'Route Runner',
    href: '/games/route-runner',
    text: 'Move along the grid, collect pins, and avoid obstacles.',
  },
  {
    title: 'Map Quiz',
    href: '/games/map-quiz',
    text: 'Answer questions based on OsmAnd user documentation.',
  },
  {
    title: 'Pin Catcher',
    href: '/games/pin-catcher',
    text: 'Catch falling OsmAnd pins before they reach the ground.',
  },
  {
    title: 'Compass Reaction',
    href: '/games/compass',
    text: 'React quickly and choose the correct compass direction.',
  },
];

export default function Games() {
  return (
    <Layout title="Games" description="Small OsmAnd-style games">
      <main className={styles.page}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Game</p>
          <h1>OsmAnd mini games</h1>
          <p>Small browser games inspired by maps, pins, routes, and navigation.</p>
        </section>

        <section className={styles.grid}>
          {games.map((game) => (
            <Link key={game.href} className={styles.card} to={game.href}>
              <strong>{game.title}</strong>
              <span>{game.text}</span>
            </Link>
          ))}
        </section>
      </main>
    </Layout>
  );
}

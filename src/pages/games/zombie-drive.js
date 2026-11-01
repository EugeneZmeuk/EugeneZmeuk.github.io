import React, {useEffect, useRef, useState} from 'react';
import Layout from '@theme/Layout';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './zombie-drive.module.css';

const CONTROLS = [
  ['W / S or ↑ / ↓', 'accelerate / brake, reverse'],
  ['A / D or ← / →', 'steer'],
  ['Mouse', 'aim the turret'],
  ['Left button or Space', 'fire'],
  ['Shift', 'handbrake'],
];

export default function ZombieDrive() {
  const mountRef = useRef(null);
  const gameRef = useRef(null);
  const base = useBaseUrl('/');
  const [hud, setHud] = useState(null);
  const [state, setState] = useState({phase: 'loading', progress: 0});

  useEffect(() => {
    let cancelled = false;
    let game = null;
    import('../../components/zombieDrive/game').then(({Game}) => {
      if (cancelled || !mountRef.current) return;
      game = new Game({container: mountRef.current, base, onHud: setHud, onState: setState});
      gameRef.current = game;
      window.__zombieDrive = game;
      game.init().catch((err) => {
        console.error(err);
        setState({phase: 'error', error: String(err)});
      });
    });
    return () => {
      cancelled = true;
      if (game) game.dispose();
    };
  }, [base]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Enter' && e.code !== 'Space') return;
      const g = gameRef.current;
      if (!g) return;
      if (state.phase === 'menu') g.startLevel(0, false);
      else if (state.phase === 'intro' || state.phase === 'dead') g.play();
      else if (state.phase === 'levelComplete') g.startLevel(state.index + 1).then(() => g.play());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state]);

  const g = () => gameRef.current;
  const phase = state.phase;
  const hpPct = hud ? Math.round((hud.hp / hud.maxHp) * 100) : 0;

  return (
    <Layout title="Zombie Drive" description="Drive a gun truck through Krakow, Minsk and Kyiv full of zombies">
      <main className={styles.page}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>Game · desktop, keyboard + mouse</p>
          <h1>Zombie Drive</h1>
          <p className={styles.subtitle}>
            Real OpenStreetMap streets of Krakow, Minsk and Kyiv. A pickup, a machine gun, and a city full of zombies.
          </p>
        </div>

        <div className={styles.frame}>
          <div ref={mountRef} className={styles.canvasHost} />

          {hud && (phase === 'playing' || phase === 'intro' || phase === 'dead' || phase === 'levelComplete') && (
            <div className={styles.hud}>
              <div className={styles.hudRow}>
                <span className={styles.badge}>{hud.title}</span>
                <span className={styles.badge}>Score {hud.score}</span>
                <span className={styles.badge}>Best {hud.best}</span>
                <span className={styles.badge}>
                  Kills {hud.kills}/{hud.goal}
                </span>
                <span className={styles.badge}>{hud.weapon}</span>
                {hud.nextUpgrade > 0 && <span className={styles.badgeDim}>upgrade in {hud.nextUpgrade}</span>}
              </div>
              <div className={styles.hudRow}>
                <div className={styles.hpBar}>
                  <div className={styles.hpFill} style={{width: `${hpPct}%`, background: hpPct > 40 ? '#4ccf6a' : '#e8503a'}} />
                  <span>HP {hud.hp}</span>
                </div>
                <span className={styles.badge} style={{color: hud.goalReached ? '#4ccf6a' : undefined}}>
                  <span className={styles.arrow} style={{transform: `rotate(${hud.arrow}deg)`}}>
                    ➤
                  </span>
                  {hud.goalReached ? 'Finish' : 'Finish (locked)'} {hud.distance} m
                </span>
              </div>
              {hud.msg && <div className={styles.msg}>{hud.msg}</div>}
            </div>
          )}

          {phase === 'loading' && (
            <div className={styles.overlay}>
              <div className={styles.card}>
                <h2>Loading models…</h2>
                <div className={styles.progress}>
                  <div style={{width: `${Math.round((state.progress || 0) * 100)}%`}} />
                </div>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className={styles.overlay}>
              <div className={styles.card}>
                <h2>Could not start</h2>
                <p>{state.error}</p>
                <p>The game needs WebGL and a desktop browser.</p>
              </div>
            </div>
          )}

          {phase === 'menu' && (
            <div className={styles.overlay}>
              <div className={styles.card}>
                <h2>Zombie Drive</h2>
                <p>
                  Three levels: Krakow Old Town, Minsk centre and Khreshchatyk in Kyiv. Score points to upgrade the truck: twin
                  machine guns, a minigun, then lasers. Armour, a bull bar and bigger wheels come with them. Kill the required
                  number of zombies, then reach the green beacon.
                </p>
                <table className={styles.controls}>
                  <tbody>
                    {CONTROLS.map(([k, v]) => (
                      <tr key={k}>
                        <td>
                          <kbd>{k}</kbd>
                        </td>
                        <td>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" className={styles.button} onClick={() => g() && g().startLevel(0, false)}>
                  Start (Enter)
                </button>
                {state.best > 0 && <p className={styles.small}>Best score: {state.best}</p>}
              </div>
            </div>
          )}

          {phase === 'intro' && state.level && (
            <div className={styles.overlay}>
              <div className={styles.card}>
                <h2>{state.level.title}</h2>
                <p>{state.level.brief}</p>
                <p className={styles.small}>
                  Goal: {state.level.goalKills} zombies, then reach the green beacon.
                </p>
                <button type="button" className={styles.button} onClick={() => g() && g().play()}>
                  Go (Enter)
                </button>
              </div>
            </div>
          )}

          {phase === 'dead' && (
            <div className={styles.overlay}>
              <div className={styles.card}>
                <h2>The truck is wrecked</h2>
                <p>Score {state.score}. Best {state.best}.</p>
                <button type="button" className={styles.button} onClick={() => g() && g().play()}>
                  Retry level (Enter)
                </button>
                <button type="button" className={styles.buttonSecondary} onClick={() => g() && g().startLevel(0, false)}>
                  Restart from Krakow
                </button>
              </div>
            </div>
          )}

          {phase === 'levelComplete' && (
            <div className={styles.overlay}>
              <div className={styles.card}>
                <h2>Level complete</h2>
                <p>
                  {state.level.title} cleared. Score {state.score}.
                </p>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => g() && g().startLevel(state.index + 1).then(() => g().play())}>
                  Next level (Enter)
                </button>
              </div>
            </div>
          )}

          {phase === 'won' && (
            <div className={styles.overlay}>
              <div className={styles.card}>
                <h2>You made it to Maidan</h2>
                <p>
                  All three cities cleared. Final score {state.score}. Best {state.best}.
                </p>
                <button type="button" className={styles.button} onClick={() => g() && g().startLevel(0, false)}>
                  Play again
                </button>
              </div>
            </div>
          )}
        </div>

        <p className={styles.footnote}>
          City layouts are real OpenStreetMap building footprints and streets (© OpenStreetMap contributors). Models were built
          in Blender.
        </p>
      </main>
    </Layout>
  );
}

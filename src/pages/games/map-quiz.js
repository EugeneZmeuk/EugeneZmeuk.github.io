import React, {useEffect, useState} from 'react';
import Layout from '@theme/Layout';
import styles from './map-quiz.module.css';

const questions = [
  {
    question: 'What can OsmAnd Web Route Planner do?',
    answers: [
      'Create navigation routes, plan tracks, and manage local files in a browser',
      'Only change the website color theme',
      'Only display weather radar',
      'Only edit app subscription settings',
    ],
    correct: 0,
  },
  {
    question: 'Which menu is used to download, update, remove, and manage offline map data?',
    answers: [
      'Maps & Resources',
      'Compass Calibration',
      'Night Mode',
      'Voice Volume',
    ],
    correct: 0,
  },
  {
    question: 'What does the Wikipedia plugin add to OsmAnd?',
    answers: [
      'Offline Wikipedia-related POIs and articles on the map',
      'A music player',
      'A new keyboard layout',
      'A photo editor',
    ],
    correct: 0,
  },
  {
    question: 'What is OsmAnd Cloud used for?',
    answers: [
      'Storing and synchronizing personal settings and app data across devices',
      'Changing the phone screen brightness',
      'Replacing OpenStreetMap data with satellite-only maps',
      'Blocking all map downloads',
    ],
    correct: 0,
  },
  {
    question: 'What map data is needed for Hillshade, Slope, and 3D Relief in the Topography plugin?',
    answers: [
      'Terrain map / 3D terrain data',
      'Only the world overview map',
      'Only a GPX file',
      'Only a favorite point',
    ],
    correct: 0,
  },
  {
    question: 'What is the Configure Map menu mainly used for?',
    answers: [
      'Customizing what is displayed on the map',
      'Deleting the whole app',
      'Changing the device language',
      'Turning the phone into a compass sensor',
    ],
    correct: 0,
  },
  {
    question: 'OsmAnd routing is based on which map data source?',
    answers: [
      'OpenStreetMap data',
      'Only private road data',
      'Only screenshots',
      'Only paper maps',
    ],
    correct: 0,
  },
  {
    question: 'What can Travel Guides help you do?',
    answers: [
      'Browse articles, add places to the map, and build routes to attractions',
      'Install phone firmware',
      'Create email accounts',
      'Measure battery health',
    ],
    correct: 0,
  },
];

function shuffleAnswers(question) {
  const mixed = question.answers.map((answer, index) => ({
    text: answer,
    correct: index === question.correct,
  })).sort(() => Math.random() - 0.5);

  return {
    question: question.question,
    answers: mixed,
  };
}

export default function MapQuiz() {
  const [items, setItems] = useState(() => questions.map(shuffleAnswers));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);

  const current = items[index];
  const finished = index >= items.length;

  function restart() {
    setItems(questions.map(shuffleAnswers));
    setIndex(0);
    setSelected(null);
    setScore(0);
  }

  function choose(answer, answerIndex) {
    if (selected !== null) {
      return;
    }

    setSelected(answerIndex);

    if (answer.correct) {
      setScore((value) => value + 1);
    }
  }

  function next() {
    setSelected(null);
    setIndex((value) => value + 1);
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        restart();
        return;
      }

      if (finished) {
        return;
      }

      if (selected !== null && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        next();
        return;
      }

      const answerNumber = Number(event.key);

      if (
        selected === null &&
        Number.isInteger(answerNumber) &&
        answerNumber >= 1 &&
        answerNumber <= current.answers.length
      ) {
        event.preventDefault();
        choose(current.answers[answerNumber - 1], answerNumber - 1);
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  });

  return (
    <Layout title="Map Quiz" description="OsmAnd documentation quiz game">
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.eyebrow}>Game</p>
          <h1>Map Quiz</h1>
          <p className={styles.subtitle}>Questions based on OsmAnd user documentation. Use keys 1–4 to answer.</p>

          {finished ? (
            <div className={styles.result}>
              <h2>Finished!</h2>
              <p>Your score: <strong>{score}/{items.length}</strong></p>
              <button type="button" onClick={restart}>Play again</button>
            </div>
          ) : (
            <>
              <div className={styles.progress}>
                Question {index + 1} / {items.length} · Score: <strong>{score}</strong>
              </div>

              <h2 className={styles.question}>{current.question}</h2>

              <div className={styles.answers}>
                {current.answers.map((answer, answerIndex) => {
                  const showResult = selected !== null;
                  const className = [
                    styles.answer,
                    showResult && answer.correct ? styles.correct : '',
                    showResult && selected === answerIndex && !answer.correct ? styles.wrong : '',
                  ].join(' ');

                  return (
                    <button
                      key={answer.text}
                      type="button"
                      className={className}
                      onClick={() => choose(answer, answerIndex)}>
                      {answer.text}
                    </button>
                  );
                })}
              </div>

              {selected !== null && (
                <button type="button" className={styles.next} onClick={next}>
                  {index + 1 === items.length ? 'Finish' : 'Next'}
                </button>
              )}
            </>
          )}
        </section>
      </main>
    </Layout>
  );
}

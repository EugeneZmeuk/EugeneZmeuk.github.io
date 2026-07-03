import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './index.module.css';

const socialLinks = [
  {
    title: 'LinkedIn',
    href: 'https://www.linkedin.com/in/eugene-kizevich-0a5b3914b/',
    badge: 'https://img.shields.io/badge/LinkedIn-Eugene%20Kizevich-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white',
  },
  {
    title: 'Facebook',
    href: 'https://www.facebook.com/kizevich',
    badge: 'https://img.shields.io/badge/Facebook-kizevich-1877F2?style=for-the-badge&logo=facebook&logoColor=white',
  },
  {
    title: 'Reddit',
    href: 'https://www.reddit.com/user/zmeuka/',
    badge: 'https://img.shields.io/badge/Reddit-zmeuka-FF4500?style=for-the-badge&logo=reddit&logoColor=white',
  },
];

function SocialLinks() {
  return (
    <div className={styles.socialLinks}>
      {socialLinks.map((item) => (
        <a key={item.title} href={item.href} target="_blank" rel="noreferrer">
          <img src={item.badge} alt={item.title} />
        </a>
      ))}
    </div>
  );
}

function GitHubStats() {
  return (
    <section className={styles.homeStats}>
      <Heading as="h2">GitHub stats</Heading>
      <div className={styles.stats}>
        <img
          src="https://github-readme-streak-stats.herokuapp.com/?user=EugeneZmeuk"
          alt="GitHub Streak"
        />
      </div>
    </section>
  );
}

export default function Home() {
  const logoLightUrl = useBaseUrl('/img/logo_osmand_black.svg');
  const logoDarkUrl = useBaseUrl('/img/logo_osmand_white.svg');

  return (
    <Layout
      title="Eugene Kizevich"
      description="Personal page of Eugene Kizevich, CMO at OsmAnd B.V.">
      <main className={styles.homePage}>
        <section className={styles.heroCompact}>
          <div className={styles.heroInner}>
            <div className={styles.heroLogoWrap}>
              <img
                className={`${styles.heroLogo} ${styles.heroLogoLight}`}
                src={logoLightUrl}
                alt="OsmAnd"
              />
              <img
                className={`${styles.heroLogo} ${styles.heroLogoDark}`}
                src={logoDarkUrl}
                alt=""
                aria-hidden="true"
              />
            </div>

            <p className={styles.eyebrow}>
              OsmAnd · Marketing · Community · Documentation
            </p>

            <Heading as="h1" className={styles.heroTitle}>
              Hi there, I&apos;m Eugene Kizevich <span aria-hidden="true">👋</span>
            </Heading>

            <p className={styles.heroSubtitle}>
              CMO at <a href="https://osmand.net/" target="_blank" rel="noreferrer">OsmAnd B.V.</a>
            </p>

            <p className={styles.heroText}>
              I work with marketing, communities, users, partners, documentation,
              QA, app testing, and support for OsmAnd — an offline maps and
              navigation app based on OpenStreetMap data.
            </p>

            <div className={styles.heroButtons}>
              <a className="button button--primary button--lg" href="https://osmand.net/" target="_blank" rel="noreferrer">
                OsmAnd Website
              </a>
              <a className="button button--secondary button--lg" href="https://osmand.net/docs/user/" target="_blank" rel="noreferrer">
                OsmAnd Docs
              </a>
              <Link className="button button--secondary button--lg" to="/about">
                About me
              </Link>
            </div>

            <SocialLinks />
          </div>
        </section>

        <GitHubStats />
      </main>
    </Layout>
  );
}

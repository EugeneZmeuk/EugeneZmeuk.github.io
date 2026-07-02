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
    badge:
      'https://img.shields.io/badge/LinkedIn-Eugene%20Kizevich-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white',
  },
  {
    title: 'Facebook',
    href: 'https://www.facebook.com/kizevich',
    badge:
      'https://img.shields.io/badge/Facebook-kizevich-1877F2?style=for-the-badge&logo=facebook&logoColor=white',
  },
  {
    title: 'Reddit',
    href: 'https://www.reddit.com/user/zmeuka/',
    badge:
      'https://img.shields.io/badge/Reddit-zmeuka-FF4500?style=for-the-badge&logo=reddit&logoColor=white',
  },
];

const osmandLinks = [
  {
    title: 'OsmAnd Website',
    text: 'Official OsmAnd website with product information, downloads, pricing, and feature pages.',
    href: 'https://osmand.net/',
  },
  {
    title: 'OsmAnd Docs',
    text: 'User documentation for Android, iOS, Web, maps, navigation, plugins, Cloud, and more.',
    href: 'https://osmand.net/docs/user/',
  },
  {
    title: 'OsmAnd Web Map',
    text: 'Online map and route planning tool connected with the OsmAnd ecosystem.',
    href: 'https://osmand.net/map',
  },
  {
    title: 'OsmAnd GitHub',
    text: 'Open-source repositories, code, documentation sources, issues, and development activity.',
    href: 'https://github.com/osmandapp',
  },
];

const focusAreas = [
  'Marketing and product communication',
  'Community work and user feedback',
  'Technical documentation',
  'QA and app testing',
  'Support workflows',
  'OpenStreetMap ecosystem',
  'Offline maps and navigation',
  'Android, iOS, Android Auto, and CarPlay testing',
];

const osmandFeatures = [
  'Offline maps and navigation',
  'Driving, cycling, walking, hiking, and travel profiles',
  'GPX tracks, route planning, and trip recording',
  'Topographic maps, contour lines, terrain data, and hillshade',
  'OpenStreetMap-based search, POI data, and map updates',
  'OsmAnd Cloud, backup, sync, and cross-device workflows',
  'Privacy-focused navigation without mandatory online tracking',
  'Web map and route planning tools',
];

function SocialLinks() {
  return (
    <div className={styles.socialLinks}>
      {socialLinks.map((item) => (
        <a
          key={item.title}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          aria-label={item.title}
        >
          <img src={item.badge} alt={item.title} />
        </a>
      ))}
    </div>
  );
}

function Card({title, children}) {
  return (
    <div className={styles.card}>
      <Heading as="h3">{title}</Heading>
      {children}
    </div>
  );
}

export default function Home() {
  const logoLightUrl = useBaseUrl('/img/logo_osmand_black.svg');
  const logoDarkUrl = useBaseUrl('/img/logo_osmand_white.svg');

  const gpxToolUrl = useBaseUrl('/tools/gpx-waypoints-osmand-url.html');
  const osmandGpxToKmlUrl = useBaseUrl('/tools/osmand-gpx-to-kml.html');
  const googleMapToOsmandGpxUrl = useBaseUrl('/tools/google-map-to-osmand-gpx.html');
  const kmlToOsmandGpxUrl = useBaseUrl('/tools/kml-to-osmand-gpx.html');
  const gmapIconsToOsmandUrl = useBaseUrl('/tools/gmap-icons-to-osmand.html');

  return (
    <Layout
      title="Eugene Kizevich"
      description="Personal page of Eugene Kizevich, CMO at OsmAnd B.V. Marketing, community, documentation, QA, testing, support, and OpenStreetMap."
    >
      <main>
        <section className={styles.hero}>
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

            <p className={styles.eyebrow}>OsmAnd · Marketing · Community · Documentation</p>

            <Heading as="h1" className={styles.heroTitle}>
              Hi there, I&apos;m Eugene Kizevich 👋
            </Heading>

            <p className={styles.heroSubtitle}>
              CMO at <Link to="https://osmand.net/">OsmAnd B.V.</Link>
            </p>

            <p className={styles.heroText}>
              I work with marketing, communities, users, partners, documentation,
              QA, app testing, and support for OsmAnd — an offline maps and
              navigation app based on OpenStreetMap data.
            </p>

            <div className={styles.heroButtons}>
              <Link className="button button--primary button--lg" to="https://osmand.net/">
                OsmAnd Website
              </Link>
              <Link className="button button--secondary button--lg" to="https://osmand.net/docs/user/">
                OsmAnd Docs
              </Link>
              <Link className="button button--secondary button--lg" to="https://github.com/EugeneZmeuk">
                My GitHub
              </Link>
            </div>

            <SocialLinks />
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <Heading as="h2">About me</Heading>

            <p>
              I&apos;m Eugene Kizevich, CMO at <strong>OsmAnd B.V.</strong>. My work is not
              limited to marketing: I also help with product communication, user feedback,
              technical documentation, app testing, QA reports, and support workflows.
            </p>

            <p>
              I like working at the intersection of product, users, and technology. My goal is
              to make OsmAnd easier to understand, easier to use, and easier to discover for
              travelers, drivers, cyclists, hikers, outdoor enthusiasts, and everyone who needs
              reliable offline navigation.
            </p>

            <div className={styles.note}>
              <strong>My role in one sentence:</strong> I help OsmAnd communicate better with
              users, explain complex features clearly, and turn real user feedback into product,
              documentation, and marketing improvements.
            </div>
          </div>
        </section>

        <section className={styles.sectionAlt}>
          <div className={styles.container}>
            <Heading as="h2">What I do at OsmAnd</Heading>

            <div className={styles.grid}>
              <Card title="Marketing and communication">
                <ul>
                  <li>Lead marketing activities and product communication</li>
                  <li>Work on landing pages, website content, and product messaging</li>
                  <li>Support app store communication and release-related content</li>
                  <li>Promote offline maps, privacy-focused navigation, and OpenStreetMap-based tools</li>
                </ul>
              </Card>

              <Card title="Community and users">
                <ul>
                  <li>Work with OsmAnd users, communities, and partners</li>
                  <li>Collect and organize feedback from real user scenarios</li>
                  <li>Help users understand OsmAnd features and workflows</li>
                  <li>Support communication between users, support, QA, and development teams</li>
                </ul>
              </Card>

              <Card title="Documentation">
                <ul>
                  <li>Help maintain and improve OsmAnd documentation</li>
                  <li>Write and review user guides for app features</li>
                  <li>Make complex settings and workflows easier to explain</li>
                  <li>Improve onboarding and help content for new users</li>
                </ul>
              </Card>

              <Card title="QA, testing, and support">
                <ul>
                  <li>Test OsmAnd apps on Android and iOS</li>
                  <li>Check Android Auto and CarPlay behavior</li>
                  <li>Help with QA reports, bug reports, and feature requests</li>
                  <li>Analyze support cases and recurring user problems</li>
                </ul>
              </Card>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <Heading as="h2">Areas I work with</Heading>

            <div className={styles.pillGrid}>
              {focusAreas.map((item) => (
                <span className={styles.pill} key={item}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.sectionAlt}>
          <div className={styles.container}>
            <Heading as="h2">OsmAnd</Heading>

            <p>
              <strong>OsmAnd</strong> is an offline maps and navigation application for Android,
              iOS, and Web. It is built around OpenStreetMap data and is designed for people
              who need reliable maps without depending on a constant internet connection.
            </p>

            <div className={styles.grid}>
              <Card title="OsmAnd is useful for">
                <ul>
                  {osmandFeatures.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>

              <Card title="Why it matters">
                <p>
                  OsmAnd is especially helpful for travel, outdoor activities, areas with poor
                  mobile coverage, long-distance routes, and users who prefer to keep maps and
                  navigation available offline.
                </p>
                <p>
                  The project combines open map data, detailed navigation settings, plugins,
                  custom profiles, GPX tools, and privacy-focused workflows.
                </p>
              </Card>
            </div>
          </div>
        </section>

        <section className={styles.section} id="osmand-links">
          <div className={styles.container}>
            <Heading as="h2">Useful OsmAnd links</Heading>

            <div className={styles.linkGrid}>
              {osmandLinks.map((item) => (
                <a
                  className={styles.linkCard}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  key={item.title}
                >
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        
      <section className={styles.sectionAlt} id="my-osmand-tools">
        <div className={styles.container}>
          <Heading as="h2">My OsmAnd tools</Heading>
          <p>
            Small helper tools I use for OsmAnd-related testing, support,
            documentation, and product workflows.
          </p>
          <div className={styles.linkGrid}>

            <Link className={styles.linkCard} to={osmandGpxToKmlUrl}>
              <strong>OsmAnd GPX to KML Converter</strong>
              <span>
                Convert OsmAnd GPX waypoints into a KML file for Google My
                Maps, with similar icon styles and colors where possible.
              </span>
            </Link>
            <Link className={styles.linkCard} to={gpxToolUrl}>
              <strong>GPX Waypoints to OsmAnd URL</strong>
              <span>
                Upload a GPX file with waypoints or route points, choose a
                routing profile, and open the generated route directly in
                OsmAnd Web Map.
              </span>
            </Link>
            <Link className={styles.linkCard} to={googleMapToOsmandGpxUrl}>
              <strong>Google Map to OsmAnd GPX Package</strong>
              <span>
                Create a ZIP package of OsmAnd-style GPX files from a Google
                My Maps KML or KMZ export, with tracks, waypoints, and layers.
              </span>
            </Link>
            <Link className={styles.linkCard} to={kmlToOsmandGpxUrl}>
              <strong>KML to OsmAnd GPX Converter</strong>
              <span>
                Convert a Google My Maps KML or KMZ export into a single
                OsmAnd-style GPX file with tracks, waypoints, colors, and icons.
              </span>
            </Link>
            <Link className={styles.linkCard} to={gmapIconsToOsmandUrl}>
              <strong>Google Maps Icons to OsmAnd GPX</strong>
              <span>
                Convert Google My Maps placemarks into OsmAnd GPX waypoints
                with similar OsmAnd icons where possible.
              </span>
            </Link>

          </div>
        </div>
      </section>

<section className={styles.sectionAlt}>
          <div className={styles.container}>
            <Heading as="h2">Current focus</Heading>

            <div className={styles.grid}>
              <Card title="Product and content">
                <ul>
                  <li>Improving OsmAnd documentation and onboarding</li>
                  <li>Making complex app features easier to explain</li>
                  <li>Improving marketing pages, landing pages, and product messaging</li>
                  <li>Helping users better understand offline navigation and OsmAnd features</li>
                </ul>
              </Card>

              <Card title="Testing and feedback">
                <ul>
                  <li>Collecting useful feedback from real users</li>
                  <li>Testing navigation, routing, maps, and subscriptions</li>
                  <li>Checking Android Auto and CarPlay workflows</li>
                  <li>Turning support cases into better documentation and QA tasks</li>
                </ul>
              </Card>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.container}>
            <Heading as="h2">Social media</Heading>
            <SocialLinks />
          </div>
        </section>

        <section className={styles.sectionAlt}>
          <div className={styles.container}>
            <Heading as="h2">GitHub stats</Heading>

            <div className={styles.stats}>
              <img
                src="https://github-readme-streak-stats.herokuapp.com/?user=EugeneZmeuk"
                alt="GitHub Streak"
              />
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
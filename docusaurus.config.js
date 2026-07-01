// @ts-check
// Docusaurus config for Eugene Kizevich personal page

import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Eugene Kizevich',
  tagline: 'CMO at OsmAnd B.V.',
  favicon: 'img/osmand_logo.png',

  future: {
    v4: true,
  },

  url: 'https://eugenezmeuk.github.io',
  baseUrl: '/kizevich/',

  organizationName: 'EugeneZmeuk',
  projectName: 'kizevich.github.io',
  deploymentBranch: 'gh-pages',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: false,
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/osmand_logo.png',

      colorMode: {
        respectPrefersColorScheme: true,
      },

      navbar: {
        title: 'Eugene Kizevich',
        logo: {
          alt: 'OsmAnd Logo',
          src: 'img/osmand_logo.png',
        },
        items: [
          {
            href: 'https://osmand.net/',
            label: 'OsmAnd',
            position: 'right',
          },
          {
            href: 'https://osmand.net/docs/intro',
            label: 'Docs',
            position: 'right',
          },
          {
            href: 'https://osmand.net/map',
            label: 'Web Map',
            position: 'right',
          },
          {
            href: 'https://github.com/osmandapp',
            label: 'OsmAnd GitHub',
            position: 'right',
          },
          {
            href: 'https://github.com/EugeneZmeuk',
            label: 'My GitHub',
            position: 'right',
          },
          {
            href: 'https://www.linkedin.com/in/eugene-kizevich-0a5b3914b/',
            label: 'LinkedIn',
            position: 'right',
          },
        ],
      },

      footer: {
        style: 'dark',
        links: [
          {
            title: 'OsmAnd',
            items: [
              {
                label: 'Website',
                href: 'https://osmand.net/',
              },
              {
                label: 'Documentation',
                href: 'https://osmand.net/docs/intro',
              },
              {
                label: 'Web Map',
                href: 'https://osmand.net/map',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/osmandapp',
              },
            ],
          },
          {
            title: 'Social media',
            items: [
              {
                label: 'LinkedIn',
                href: 'https://www.linkedin.com/in/eugene-kizevich-0a5b3914b/',
              },
              {
                label: 'Facebook',
                href: 'https://www.facebook.com/kizevich',
              },
              {
                label: 'Reddit',
                href: 'https://www.reddit.com/user/zmeuka/',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'My GitHub',
                href: 'https://github.com/EugeneZmeuk',
              },
              {
                label: 'Repository',
                href: 'https://github.com/EugeneZmeuk/kizevich.github.io',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Eugene Kizevich. Built with Docusaurus.`,
      },

      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
// @ts-check
// Docusaurus configuration for the wiremark docs site.
//
// - Reads the repo's ../docs folder directly (no copying). The component
//   reference is regenerated from meta/mui-support-matrix.json by the
//   prestart/prebuild hooks in package.json, so it is always fresh.
// - URL and base path are env-driven so the SAME build can deploy either as a
//   subdomain (docs.wiremark.dev, the default) or behind a /docs proxy on the
//   main site (set DOCS_URL=https://www.wiremark.dev and DOCS_BASE_URL=/docs/).

const { themes } = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'wiremark',
  tagline: 'A text-based, markdown-embeddable wireframing format',

  url: process.env.DOCS_URL || 'https://docs.wiremark.dev',
  baseUrl: process.env.DOCS_BASE_URL || '/',

  organizationName: 'blackburn-labs',
  projectName: 'wiremark',

  // A couple of links in the docs point at repo files (e.g. the source JSON)
  // that are not published to the site; warn rather than fail the build.
  onBrokenLinks: 'warn',
  onBrokenAnchors: 'warn',

  markdown: {
    // Treat .md as CommonMark (not MDX) so the generated "<!-- GENERATED -->"
    // banner and any literal < or { in the guides pass through untouched.
    format: 'md',
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: { defaultLocale: 'en', locales: ['en'] },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: '../docs', // the repo's docs folder is the single source
          routeBasePath: '/', // docs-only site: the guides ARE the site
          sidebarPath: require.resolve('./sidebars.js'),
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'wiremark',
        items: [
          { href: 'https://www.wiremark.dev', label: 'Home', position: 'right' },
          // Add once the repo URL is known:
          // { href: 'https://github.com/blackburn-labs/wiremark', label: 'GitHub', position: 'right' },
        ],
      },
      footer: {
        style: 'dark',
        copyright: 'Copyright (c) 2026 Blackburn Labs',
      },
      prism: {
        theme: themes.github,
        darkTheme: themes.dracula,
      },
    }),
};

module.exports = config;

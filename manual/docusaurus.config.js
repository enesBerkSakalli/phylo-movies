/* global process */

const analyticsProvider = (process.env.VITE_ANALYTICS_PROVIDER || '').trim().toLowerCase();
const analyticsDomain = (process.env.VITE_ANALYTICS_DOMAIN || '').trim();
const analyticsScriptSrc = (process.env.VITE_ANALYTICS_SCRIPT_SRC || '').trim();
const analyticsEndpoint = (process.env.VITE_ANALYTICS_ENDPOINT || '').trim();

function createAnalyticsScripts() {
  if (analyticsProvider === 'plausible') {
    return [
      {
        src: analyticsScriptSrc || 'https://plausible.io/js/script.js',
        defer: true,
        'data-domain': analyticsDomain || 'enesberksakalli.github.io',
      },
    ];
  }

  if (analyticsProvider === 'goatcounter' && analyticsEndpoint) {
    return [
      {
        src: analyticsScriptSrc || 'https://gc.zgo.at/count.js',
        defer: true,
        'data-goatcounter': analyticsEndpoint,
      },
    ];
  }

  return [];
}

const config = {
  title: 'Phylo-Movies Manual',
  tagline: 'Researcher guide for animated phylogenetic tree exploration',
  url: 'https://enesberksakalli.github.io',
  baseUrl: '/phylo-movies/manual/',
  favicon: 'icons/phylo-tree-icon.svg',
  organizationName: 'enesBerkSakalli',
  projectName: 'phylo-movies',
  trailingSlash: true,
  onBrokenLinks: 'throw',
  scripts: createAnalyticsScripts(),
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'Phylo-Movies Manual',
      logo: {
        alt: 'Phylo-Movies',
        src: 'icons/phylo-tree-icon.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'manualSidebar',
          position: 'left',
          label: 'Manual',
        },
        {
          href: 'https://enesberksakalli.github.io/phylo-movies/demo/',
          label: 'Browser Demo',
          position: 'right',
        },
        {
          href: 'https://github.com/enesBerkSakalli/phylo-movies',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Use Phylo-Movies',
          items: [
            {
              label: 'Browser demo',
              href: 'https://enesberksakalli.github.io/phylo-movies/demo/',
            },
            {
              label: 'Source repository',
              href: 'https://github.com/enesBerkSakalli/phylo-movies',
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} Phylo-Movies contributors.`,
    },
  },
};

export default config;

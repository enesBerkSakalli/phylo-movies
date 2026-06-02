const config = {
  title: 'Phylo-Movies Manual',
  tagline: 'Researcher guide for animated phylogenetic tree exploration',
  url: 'https://enesberksakalli.github.io',
  baseUrl: '/phylo-movies/manual/',
  organizationName: 'enesBerkSakalli',
  projectName: 'phylo-movies',
  trailingSlash: true,
  onBrokenLinks: 'throw',
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

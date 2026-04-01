#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const DIST_ARG = process.argv[2] || 'dist';
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(PROJECT_ROOT, DIST_ARG);
const INDEX_PATH = path.join(DIST_DIR, 'index.html');
const SPLASH_PATH = path.join(DIST_DIR, 'splash.html');
const IS_DOCS_ONLY = process.env.VITE_DOCS_ONLY === 'true';

const SITE_ROOT = 'https://enesberksakalli.github.io/phylo-movies';
const SOCIAL_IMAGE_REL_PATH = 'og/phylo-movies-preview.png';
const SOCIAL_IMAGE_URL = `${SITE_ROOT}/${SOCIAL_IMAGE_REL_PATH}`;
const REPOSITORY_URL = 'https://github.com/enesBerkSakalli/phylo-movies';
const README_URL = `${REPOSITORY_URL}#readme`;
const RELEASES_URL = `${REPOSITORY_URL}/releases`;
const PRIMARY_URL = IS_DOCS_ONLY ? `${SITE_ROOT}/` : `${SITE_ROOT}/home`;
const PAGE_TITLE = IS_DOCS_ONLY
  ? 'Phylo-Movies | README, Documentation, and Deployment'
  : 'Phylo-Movies | Interactive Phylogenetic Tree Visualization';
const DESCRIPTION = IS_DOCS_ONLY
  ? 'Interactive phylogenetic tree visualization and tree-morphing tool for sliding-window MSA analysis, recombination detection, and rogue taxa exploration. This GitHub Pages site provides README-style documentation and deployment guidance.'
  : 'Interactive phylogenetic tree visualization and tree-morphing tool for sliding-window MSA analysis, recombination detection, and rogue taxa exploration.';
const OG_DESCRIPTION = IS_DOCS_ONLY
  ? 'README-style project overview with links to the repository, desktop releases, example datasets, and full-stack deployment instructions.'
  : 'Visualize topological transitions between phylogenetic trees through smooth morphing animations, MSA-linked exploration, and lineage-aware analysis tools.';
const KEYWORDS = IS_DOCS_ONLY
  ? 'phylogenetics, phylogenetic trees, tree visualization, tree morphing, multiple sequence alignment, MSA, recombination, rogue taxa, Robinson-Foulds, computational biology, README, documentation'
  : 'phylogenetics, phylogenetic trees, tree visualization, tree morphing, bioinformatics, Robinson-Foulds, recombination, MSA, rogue taxa, computational biology';
const OG_IMAGE_WIDTH = '1914';
const OG_IMAGE_HEIGHT = '930';

const STRUCTURED_DATA = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Phylo-Movies',
    url: SITE_ROOT,
    description: DESCRIPTION,
    about: [
      'Phylogenetics',
      'Phylogenetic tree visualization',
      'Tree morphing',
      'Multiple sequence alignment',
      'Recombination detection',
      'Rogue taxa analysis'
    ],
    keywords: KEYWORDS.split(',').map((keyword) => keyword.trim())
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: 'Phylo-Movies',
    codeRepository: REPOSITORY_URL,
    url: PRIMARY_URL,
    description: DESCRIPTION,
    license: 'https://opensource.org/licenses/MIT',
    programmingLanguage: ['JavaScript', 'React', 'Python'],
    runtimePlatform: ['Web Browser', 'Electron', 'Docker'],
    applicationCategory: 'ScientificApplication',
    downloadUrl: RELEASES_URL,
    sameAs: [REPOSITORY_URL, README_URL, RELEASES_URL],
    keywords: KEYWORDS.split(',').map((keyword) => keyword.trim())
  }
];

function assertFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`);
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeTextFile(filePath, content) {
  fs.writeFileSync(filePath, `${content.trimEnd()}\n`, 'utf8');
}

function replaceTitleTag(html, newTitle) {
  const titleTag = `<title>${newTitle}</title>`;
  if (/<title>.*<\/title>/i.test(html)) {
    return html.replace(/<title>.*<\/title>/i, titleTag);
  }
  return html;
}

function replaceDescriptionMeta(html, newDescription) {
  const descriptionTag = `<meta name="description" content="${newDescription}">`;
  if (/<meta\s+name=["']description["']/i.test(html)) {
    return html.replace(/<meta\s+name=["']description["'][^>]*>/i, descriptionTag);
  }
  return html;
}

function injectIntoHead(html, injection) {
  if (html.includes('name="application-name"')) return html;
  if (!html.includes('</head>')) {
    throw new Error('Unable to inject SEO tags: </head> not found in index.html');
  }
  return html.replace('</head>', `${injection}\n  </head>`);
}

function applyIndexSeo(indexHtml) {
  let html = replaceTitleTag(indexHtml, PAGE_TITLE);
  html = replaceDescriptionMeta(html, DESCRIPTION);
  const structuredDataJson = JSON.stringify(STRUCTURED_DATA, null, 2);

  const injection = `
    <meta name="keywords" content="${KEYWORDS}">
    <meta name="author" content="Phylo-Movies Contributors">
    <meta name="application-name" content="Phylo-Movies">
    <meta name="generator" content="Vite">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="googlebot" content="index, follow, max-image-preview:large">
    <meta name="theme-color" content="#111827">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <meta property="og:site_name" content="Phylo-Movies">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="en_US">
    <meta property="og:title" content="${PAGE_TITLE}">
    <meta property="og:description" content="${OG_DESCRIPTION}">
    <meta property="og:url" content="${PRIMARY_URL}">
    <meta property="og:image" content="${SOCIAL_IMAGE_URL}">
    <meta property="og:image:secure_url" content="${SOCIAL_IMAGE_URL}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="${OG_IMAGE_WIDTH}">
    <meta property="og:image:height" content="${OG_IMAGE_HEIGHT}">
    <meta property="og:image:alt" content="Phylo-Movies application interface">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${PAGE_TITLE}">
    <meta name="twitter:description" content="${OG_DESCRIPTION}">
    <meta name="twitter:url" content="${PRIMARY_URL}">
    <meta name="twitter:image" content="${SOCIAL_IMAGE_URL}">
    <meta name="twitter:image:alt" content="Phylo-Movies application interface">
    <link rel="canonical" href="${PRIMARY_URL}">
    <link rel="alternate" hreflang="en" href="${PRIMARY_URL}">
    <link rel="alternate" hreflang="x-default" href="${PRIMARY_URL}">
    <link rel="manifest" href="/phylo-movies/site.webmanifest">
    <link rel="bookmark" href="${README_URL}">
    <script type="application/ld+json">
${structuredDataJson}
    </script>`;

  html = injectIntoHead(html, injection);
  return html;
}

function applySplashNoIndex(splashHtml) {
  if (!splashHtml.includes('</head>')) return splashHtml;
  if (/<meta\s+name=["']robots["']/i.test(splashHtml)) return splashHtml;
  return splashHtml.replace('</head>', '    <meta name="robots" content="noindex, nofollow">\n  </head>');
}

function writeRobotsTxt() {
  const content = `User-agent: *
Allow: /

Sitemap: ${SITE_ROOT}/sitemap.xml`;
  writeTextFile(path.join(DIST_DIR, 'robots.txt'), content);
}

function writeSitemapXml() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = IS_DOCS_ONLY
    ? [`${SITE_ROOT}/`]
    : [`${SITE_ROOT}/`, `${SITE_ROOT}/home`, `${SITE_ROOT}/visualization`];

  const entries = urls
    .map((url) => `  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
  </url>`)
    .join('\n');

  const content = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
  writeTextFile(path.join(DIST_DIR, 'sitemap.xml'), content);
}

function writeWebManifest() {
  const manifest = {
    name: 'Phylo-Movies',
    short_name: 'PhyloMovies',
    description: DESCRIPTION,
    start_url: IS_DOCS_ONLY ? '/phylo-movies/' : '/phylo-movies/home',
    scope: '/phylo-movies/',
    display: 'standalone',
    background_color: '#0b1220',
    theme_color: '#111827',
    icons: [
      {
        src: '/phylo-movies/icons/phylo-tree-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml'
      }
    ]
  };
  writeTextFile(path.join(DIST_DIR, 'site.webmanifest'), JSON.stringify(manifest, null, 2));
}

function copySocialPreviewImage() {
  const sourceImage = path.join(PROJECT_ROOT, 'docs', 'screenshot.png');
  assertFileExists(sourceImage);
  const outputDir = path.join(DIST_DIR, 'og');
  ensureDir(outputDir);
  const outputImage = path.join(outputDir, 'phylo-movies-preview.png');
  fs.copyFileSync(sourceImage, outputImage);
}

function main() {
  assertFileExists(INDEX_PATH);
  assertFileExists(SPLASH_PATH);

  const indexHtml = fs.readFileSync(INDEX_PATH, 'utf8');
  const splashHtml = fs.readFileSync(SPLASH_PATH, 'utf8');

  const updatedIndexHtml = applyIndexSeo(indexHtml);
  const updatedSplashHtml = applySplashNoIndex(splashHtml);

  fs.writeFileSync(INDEX_PATH, updatedIndexHtml, 'utf8');
  fs.writeFileSync(SPLASH_PATH, updatedSplashHtml, 'utf8');
  writeRobotsTxt();
  writeSitemapXml();
  writeWebManifest();
  copySocialPreviewImage();

  console.log(`Applied GitHub Pages SEO assets to: ${DIST_DIR}`);
}

try {
  main();
} catch (error) {
  console.error('[apply-gh-seo] Failed:', error.message);
  process.exit(1);
}

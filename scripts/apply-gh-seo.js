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
const PUBLICATION_URL = 'https://www.biorxiv.org/content/10.64898/2026.04.01.715821v1';
const PUBLICATION_PDF_URL = 'https://www.biorxiv.org/content/10.64898/2026.04.01.715821v1.full.pdf';
const PUBLICATION_DOI = '10.64898/2026.04.01.715821';
const PUBLICATION_DOI_URL = `https://doi.org/${PUBLICATION_DOI}`;
const PUBLICATION_TITLE = 'Animating Phylogenetic Trees from Sliding-Window Analyses';
const PUBLICATION_DATE = '2026-04-01';
const PUBLICATION_JOURNAL = 'bioRxiv';
const PUBLICATION_AUTHORS = [
  'E. B. Sakalli',
  'S. E. Haendeler',
  'A. von Haeseler',
  'H. A. Schmidt'
];
const PRIMARY_URL = IS_DOCS_ONLY ? `${SITE_ROOT}/` : `${SITE_ROOT}/home`;
const PAGE_TITLE = IS_DOCS_ONLY
  ? 'Phylo-Movies | Desktop App, Phylogenetic Tree Interpolation, and Publication'
  : 'Phylo-Movies | Interactive Phylogenetic Tree Visualization';
const DESCRIPTION = IS_DOCS_ONLY
  ? 'Phylo-Movies is a desktop app and browser-based phylogenetic tree interpolation and visualization tool for sliding-window analyses, recombination detection, and rogue taxa exploration. This site provides publication details, citation metadata, desktop downloads, and setup guidance.'
  : 'Interactive phylogenetic tree visualization and tree-morphing tool for sliding-window MSA analysis, recombination detection, and rogue taxa exploration.';
const OG_DESCRIPTION = IS_DOCS_ONLY
  ? 'Landing page for the Phylo-Movies desktop app and web tool, with publication links, citation metadata, example use cases, datasets, and full-stack setup instructions.'
  : 'Visualize topological transitions between phylogenetic trees through smooth morphing animations, MSA-linked exploration, and lineage-aware analysis tools.';
const KEYWORDS = IS_DOCS_ONLY
  ? 'phylogenetics, phylogenetic tree interpolation, phylogenetic tree visualization, tree morphing, sliding-window phylogenetics, desktop app, electron app, multiple sequence alignment, MSA, recombination detection, rogue taxa, Robinson-Foulds, computational biology, bioRxiv, scientific software'
  : 'phylogenetics, phylogenetic trees, tree visualization, tree morphing, bioinformatics, Robinson-Foulds, recombination, MSA, rogue taxa, computational biology';
const OG_IMAGE_WIDTH = '1914';
const OG_IMAGE_HEIGHT = '930';

const FAQ_ITEMS = [
  {
    question: 'What does Phylo-Movies do?',
    answer: 'Phylo-Movies visualizes topological changes between phylogenetic trees by animating subtree movements across sliding-window analyses, bootstrap replicates, and related workflows.'
  },
  {
    question: 'When do I need the backend?',
    answer: 'You need the BranchArchitect backend for uploaded tree files, interpolation, morphing animations, and MSA-driven workflows. The GitHub Pages site is documentation-only and does not provide standalone processing.'
  },
  {
    question: 'Is Phylo-Movies available as a desktop app?',
    answer: 'Yes. Phylo-Movies is distributed both as a desktop application and as a browser-based tool. The landing page links directly to desktop releases for macOS, Windows, and Linux.'
  },
  {
    question: 'Which problems is Phylo-Movies useful for?',
    answer: 'Typical use cases include recombination breakpoint exploration, rogue taxon detection across bootstrap trees, and qualitative inspection of local phylogenetic conflict.'
  },
  {
    question: 'How should I cite Phylo-Movies?',
    answer: `Cite the bioRxiv preprint ${PUBLICATION_TITLE} using DOI ${PUBLICATION_DOI}.`
  }
];

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
    citation: PUBLICATION_DOI_URL,
    sameAs: [REPOSITORY_URL, README_URL, RELEASES_URL, PUBLICATION_URL, PUBLICATION_DOI_URL],
    subjectOf: PUBLICATION_URL,
    keywords: KEYWORDS.split(',').map((keyword) => keyword.trim())
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Phylo-Movies',
    url: PRIMARY_URL,
    description: DESCRIPTION,
    applicationCategory: 'ScientificApplication',
    operatingSystem: 'macOS, Windows, Linux, Web',
    softwareVersion: '0.64.0',
    downloadUrl: RELEASES_URL,
    codeRepository: REPOSITORY_URL,
    screenshot: SOCIAL_IMAGE_URL,
    citation: PUBLICATION_DOI_URL,
    keywords: KEYWORDS.split(',').map((keyword) => keyword.trim())
  },
  {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: PUBLICATION_TITLE,
    name: PUBLICATION_TITLE,
    url: PUBLICATION_URL,
    sameAs: PUBLICATION_DOI_URL,
    identifier: PUBLICATION_DOI,
    isPartOf: {
      '@type': 'Periodical',
      name: 'bioRxiv'
    },
    datePublished: PUBLICATION_DATE,
    author: PUBLICATION_AUTHORS.map((name) => ({ '@type': 'Person', name })),
    about: [
      'Phylogenetics',
      'Sliding-window analyses',
      'Tree morphing',
      'Recombination detection',
      'Rogue taxa'
    ]
  },
  ...(IS_DOCS_ONLY
    ? [{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: answer
          }
        }))
      }]
    : [])
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
  const citationAuthorTags = PUBLICATION_AUTHORS
    .map((author) => `    <meta name="citation_author" content="${author}">`)
    .join('\n');

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
    <meta name="citation_title" content="${PUBLICATION_TITLE}">
  ${citationAuthorTags}
    <meta name="citation_journal_title" content="${PUBLICATION_JOURNAL}">
    <meta name="citation_publication_date" content="${PUBLICATION_DATE}">
    <meta name="citation_public_url" content="${PUBLICATION_URL}">
    <meta name="citation_pdf_url" content="${PUBLICATION_PDF_URL}">
    <meta name="citation_doi" content="${PUBLICATION_DOI}">
    <meta property="article:published_time" content="${PUBLICATION_DATE}">
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

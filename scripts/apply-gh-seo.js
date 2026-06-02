#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const DIST_ARG = process.argv[2] || 'dist';
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(PROJECT_ROOT, DIST_ARG);
const INDEX_PATH = path.join(DIST_DIR, 'index.html');
const SPLASH_PATH = path.join(DIST_DIR, 'pages', 'Splash', 'splash.html');
const IS_DOCS_ONLY = process.env.VITE_DOCS_ONLY === 'true';

const SITE_ROOT = 'https://enesberksakalli.github.io/phylo-movies';
const SOCIAL_IMAGE_REL_PATH = 'og/phylo-movies-preview.png';
const SOCIAL_IMAGE_URL = `${SITE_ROOT}/${SOCIAL_IMAGE_REL_PATH}`;
const REPOSITORY_URL = 'https://github.com/enesBerkSakalli/phylo-movies';
const README_URL = `${REPOSITORY_URL}#readme`;
const RELEASES_URL = `${REPOSITORY_URL}/releases`;
const DEMO_URL = `${SITE_ROOT}/demo/`;
const PUBLICATION_URL = 'https://www.biorxiv.org/content/10.64898/2026.04.01.715821v1';
const PUBLICATION_PDF_URL = 'https://www.biorxiv.org/content/10.64898/2026.04.01.715821v1.full.pdf';
const PUBLICATION_DOI = '10.64898/2026.04.01.715821';
const PUBLICATION_DOI_URL = `https://doi.org/${PUBLICATION_DOI}`;
const SOFTWARE_DOI = '10.5281/zenodo.20488924';
const SOFTWARE_CONCEPT_DOI = '10.5281/zenodo.20488923';
const SOFTWARE_DOI_URL = `https://doi.org/${SOFTWARE_DOI}`;
const SOFTWARE_CONCEPT_DOI_URL = `https://doi.org/${SOFTWARE_CONCEPT_DOI}`;
const PUBLICATION_TITLE = 'Animating Phylogenetic Trees from Sliding-Window Analyses';
const PUBLICATION_DATE = '2026-04-01';
const PUBLICATION_JOURNAL = 'bioRxiv';
const PUBLICATION_AUTHORS = [
  'E. B. Sakalli',
  'S. E. Haendeler',
  'A. von Haeseler',
  'H. A. Schmidt',
];
const PRIMARY_URL = `${SITE_ROOT}/`;
const PAGE_TITLE = IS_DOCS_ONLY
  ? 'Phylo-Movies | Desktop App, Phylogenetic Tree Interpolation, and Publication'
  : 'Phylo-Movies | Interactive Phylogenetic Tree Visualization';
const DESCRIPTION = IS_DOCS_ONLY
  ? 'Phylo-Movies is a desktop app and browser-based phylogenetic tree interpolation and visualization tool for sliding-window analyses, recombination detection, and rogue taxa exploration. This static site provides publication details, generated demos, desktop downloads, and setup guidance.'
  : 'Interactive phylogenetic tree visualization and tree-morphing tool for sliding-window MSA analysis, recombination detection, and rogue taxa exploration.';
const OG_DESCRIPTION = IS_DOCS_ONLY
  ? 'Landing page for the Phylo-Movies desktop app and web tool, with publication links, citation metadata, example use cases, datasets, and full-stack setup instructions.'
  : 'Visualize topological transitions between phylogenetic trees through smooth morphing animations, MSA-linked exploration, and lineage-aware analysis tools.';
const DEMO_PAGE_TITLE = 'Phylo-Movies Browser Demo | Generated Phylogenetic Examples';
const DEMO_DESCRIPTION =
  'Open generated Phylo-Movies browser examples for norovirus recombination, IQ-TREE bootstrap rogue taxa, a paper figure tree pair, MSA-linked trees, and a 1000-taxon scale-limit demo.';
const DEMO_OG_DESCRIPTION =
  'Static browser demo for Phylo-Movies with generated publication examples, precomputed JSON payloads, norovirus sliding-window trees, bootstrap tree series, and a 1000-taxon limit example.';
const KEYWORDS = IS_DOCS_ONLY
  ? 'phylogenetics, phylogenetic tree interpolation, phylogenetic tree visualization, tree morphing, sliding-window phylogenetics, desktop app, electron app, multiple sequence alignment, MSA, recombination detection, rogue taxa, Robinson-Foulds, computational biology, bioRxiv, scientific software'
  : 'phylogenetics, phylogenetic trees, tree visualization, tree morphing, bioinformatics, Robinson-Foulds, recombination, MSA, rogue taxa, computational biology';
const OG_IMAGE_WIDTH = '1914';
const OG_IMAGE_HEIGHT = '930';

const FAQ_ITEMS = [
  {
    question: 'What does Phylo-Movies do?',
    answer:
      'Phylo-Movies visualizes topological changes between phylogenetic trees by animating subtree movements across sliding-window analyses, bootstrap replicates, and related workflows.',
  },
  {
    question: 'When do I need the backend?',
    answer:
      'You need the BranchArchitect backend for uploaded tree files, interpolation, morphing animations, and MSA-driven workflows. The GitHub Pages site is documentation-only and does not provide standalone processing.',
  },
  {
    question: 'Is Phylo-Movies available as a desktop app?',
    answer:
      'Yes. Phylo-Movies is distributed both as a desktop application and as a browser-based tool. The landing page links directly to desktop releases for macOS, Windows, and Linux.',
  },
  {
    question: 'Can I try Phylo-Movies in the browser?',
    answer:
      'Yes. The GitHub Pages site includes generated publication examples that open the visualization workspace without backend processing.',
  },
  {
    question: 'Why did a GitHub Pages action say Failed to fetch?',
    answer:
      'That message means a backend-dependent action was started on the static site. Use the generated browser demo on GitHub Pages, or run the desktop app, Docker, or source checkout for uploads and local example processing.',
  },
  {
    question: 'Which problems is Phylo-Movies useful for?',
    answer:
      'Typical use cases include recombination breakpoint exploration, rogue taxon detection across bootstrap trees, and qualitative inspection of local phylogenetic conflict.',
  },
  {
    question: 'How should I cite Phylo-Movies?',
    answer: `Cite the bioRxiv preprint ${PUBLICATION_TITLE} using DOI ${PUBLICATION_DOI}, and cite the archived software release using DOI ${SOFTWARE_DOI}.`,
  },
];

const DEMO_EXAMPLES = [
  {
    name: 'Norovirus Polymerase-Capsid Recombination',
    workflow: 'Sliding-window MSA with SH-aLRT',
    scale: '334 taxa, 17 IQ-TREE SH-aLRT window trees, 8,058 bp alignment',
    description:
      'Generated IQ-TREE GTR+G fast-search browser payload with SH-aLRT support scores for norovirus recombination breakpoint exploration and genome-window topology changes.',
    keywords: [
      'norovirus',
      'recombination',
      'sliding-window phylogenetics',
      'IQ-TREE',
      'SH-aLRT',
    ],
  },
  {
    name: 'Paper Figure Example',
    workflow: 'Precomputed trees',
    scale: '14 taxa, 2 trees',
    description:
      'Small publication figure example for inspecting Phylo-Movies tree transitions and timeline controls.',
    keywords: ['phylogenetic tree interpolation', 'tree morphing', 'publication example'],
  },
  {
    name: 'IQ-TREE Bootstrap Trees (24 taxa)',
    workflow: 'Bootstrap tree series',
    scale: '24 taxa, 200 composition-ranked bootstrap trees',
    description:
      'Generated static payload for rogue-taxon movement review across IQ-TREE bootstrap replicate trees.',
    keywords: ['bootstrap trees', 'rogue taxa', 'IQ-TREE', 'SPR moves'],
  },
  {
    name: 'IQ-TREE Bootstrap Trees (125 taxa)',
    workflow: 'Bootstrap tree series',
    scale: '125 taxa, 200 composition-ranked bootstrap trees',
    description:
      'Larger generated bootstrap tree-series payload for topology-change and rogue-taxon exploration.',
    keywords: ['bootstrap trees', 'rogue taxa', 'large phylogenetic trees'],
  },
  {
    name: 'Quick MSA Demo',
    workflow: 'Trees plus MSA',
    scale: '30 taxa, 10 trees',
    description:
      'Synthetic MSA-linked demo for checking alignment-window synchronization in the browser.',
    keywords: ['multiple sequence alignment', 'MSA viewer', 'tree synchronization'],
  },
  {
    name: 'msprime 1000-Taxa Limit Demo',
    workflow: 'Generated tree movie',
    scale: '1000 taxa, 2 trees',
    description:
      'Generated scale-limit payload for checking 1000-taxon browser visualization behavior.',
    keywords: ['1000 taxa', 'scale limit', 'msprime', 'large tree visualization'],
  },
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
      'Rogue taxa analysis',
    ],
    keywords: KEYWORDS.split(',').map((keyword) => keyword.trim()),
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
    citation: SOFTWARE_DOI_URL,
    identifier: SOFTWARE_DOI,
    sameAs: [
      REPOSITORY_URL,
      README_URL,
      RELEASES_URL,
      PUBLICATION_URL,
      PUBLICATION_DOI_URL,
      SOFTWARE_DOI_URL,
      SOFTWARE_CONCEPT_DOI_URL,
    ],
    subjectOf: PUBLICATION_URL,
    keywords: KEYWORDS.split(',').map((keyword) => keyword.trim()),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Phylo-Movies',
    url: PRIMARY_URL,
    description: DESCRIPTION,
    applicationCategory: 'ScientificApplication',
    operatingSystem: 'macOS, Windows, Linux, Web',
    softwareVersion: '0.92.0',
    downloadUrl: RELEASES_URL,
    codeRepository: REPOSITORY_URL,
    screenshot: SOCIAL_IMAGE_URL,
    citation: SOFTWARE_DOI_URL,
    identifier: SOFTWARE_DOI,
    sameAs: [REPOSITORY_URL, RELEASES_URL, SOFTWARE_DOI_URL, SOFTWARE_CONCEPT_DOI_URL],
    keywords: KEYWORDS.split(',').map((keyword) => keyword.trim()),
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
      name: 'bioRxiv',
    },
    datePublished: PUBLICATION_DATE,
    author: PUBLICATION_AUTHORS.map((name) => ({ '@type': 'Person', name })),
    about: [
      'Phylogenetics',
      'Sliding-window analyses',
      'Tree morphing',
      'Recombination detection',
      'Rogue taxa',
    ],
  },
  ...(IS_DOCS_ONLY
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
            '@type': 'Question',
            name: question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: answer,
            },
          })),
        },
      ]
    : []),
];

const DEMO_STRUCTURED_DATA = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: DEMO_PAGE_TITLE,
    url: DEMO_URL,
    description: DEMO_DESCRIPTION,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Phylo-Movies',
      url: SITE_ROOT,
    },
    about: [
      'Phylogenetic tree visualization',
      'Sliding-window phylogenetics',
      'Norovirus recombination',
      'Rogue taxa analysis',
      'Bootstrap tree series',
    ],
    hasPart: DEMO_EXAMPLES.map((example) => ({
      '@type': 'Dataset',
      name: example.name,
      description: example.description,
      keywords: example.keywords,
    })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Phylo-Movies Browser Demo',
    url: DEMO_URL,
    description: DEMO_DESCRIPTION,
    applicationCategory: 'ScientificApplication',
    operatingSystem: 'Web',
    isAccessibleForFree: true,
    codeRepository: REPOSITORY_URL,
    citation: PUBLICATION_DOI_URL,
  },
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

function replaceRootHtml(html, staticHtml, marker) {
  if (!IS_DOCS_ONLY || html.includes(marker)) return html;
  const rootPattern = /<div\s+id=["']root["']><\/div>/i;
  if (!rootPattern.test(html)) {
    throw new Error('Unable to inject static HTML: <div id="root"></div> not found.');
  }
  return html.replace(rootPattern, `<div id="root">\n${staticHtml}\n    </div>`);
}

function injectStaticLandingHtml(html) {
  return replaceRootHtml(html, renderStaticLandingHtml(), 'data-prerendered-landing="true"');
}

function injectStaticDemoHtml(html) {
  return replaceRootHtml(html, renderStaticDemoHtml(), 'data-prerendered-demo="true"');
}

function renderStaticLandingHtml() {
  return `      <main data-prerendered-landing="true" style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; background: #ffffff; min-height: 100vh;">
        <section style="max-width: 960px; margin: 0 auto; padding: 48px 24px 32px; text-align: center;">
          <img src="/phylo-movies/icons/phylo-tree-icon.svg" alt="" width="64" height="64" style="margin: 0 auto 16px; display: block;">
          <h1 style="margin: 0 auto 16px; max-width: 780px; font-size: 36px; line-height: 1.12; font-weight: 760;">Phylo-Movies: Desktop App and Web Tool for Phylogenetic Tree Interpolation</h1>
          <p style="margin: 0 auto; max-width: 780px; color: #4b5563; font-size: 18px; line-height: 1.65;">Phylo-Movies is available both as a desktop app and as a browser-based phylogenetic tree visualization and interpolation tool for sliding-window analyses, recombination detection, and rogue taxa exploration. This static page provides publication details, citation metadata, downloads, generated browser examples, and setup paths. Uploads and local example processing require the desktop app, Docker, or a source checkout.</p>
          <nav aria-label="Primary links" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 24px;">
            <a href="${PUBLICATION_URL}" style="${primaryLinkStyle()}">Read Publication</a>
            <a href="${DEMO_URL}" style="${secondaryLinkStyle()}">Open Browser Demo</a>
            <a href="${RELEASES_URL}" style="${secondaryLinkStyle()}">Download Desktop App</a>
            <a href="${README_URL}" style="${secondaryLinkStyle()}">Full README</a>
          </nav>
        </section>

        <section style="${sectionStyle()}">
          <h2 style="${headingStyle()}">Choose How to Use Phylo-Movies</h2>
          <div style="${gridStyle()}">
            <article style="${cardStyle()}"><h3 style="${subheadingStyle()}">Desktop App</h3><p style="${bodyStyle()}">Best default path for end users who want a packaged local application without setting up Node.js or Python.</p><a href="${RELEASES_URL}">Download desktop releases</a></article>
            <article style="${cardStyle()}"><h3 style="${subheadingStyle()}">Browser Demo</h3><p style="${bodyStyle()}">Open generated publication examples directly on GitHub Pages, without backend processing.</p><a href="${DEMO_URL}">Open generated examples</a></article>
            <article style="${cardStyle()}"><h3 style="${subheadingStyle()}">Full Stack Workflow</h3><p style="${bodyStyle()}">Required for interpolation, morphing animations, uploaded tree files, and MSA-driven processing via BranchArchitect.</p><a href="${README_URL}">View setup instructions</a></article>
          </div>
        </section>

        <section style="${sectionStyle()}">
          <h2 style="${headingStyle()}">Key Use Cases</h2>
          <div style="${gridStyle()}">
            <article style="${cardStyle()}"><h3 style="${subheadingStyle()}">Recombination Detection</h3><p style="${bodyStyle()}">Inspect where local tree topology shifts across genomic windows instead of relying only on scalar distance summaries.</p></article>
            <article style="${cardStyle()}"><h3 style="${subheadingStyle()}">Rogue Taxa Analysis</h3><p style="${bodyStyle()}">Track taxa that change attachment across bootstrap trees and identify which subtrees move and where they attach.</p></article>
            <article style="${cardStyle()}"><h3 style="${subheadingStyle()}">Sliding-Window Phylogenetics</h3><p style="${bodyStyle()}">Animate changes across ordered tree series generated from overlapping windows in a multiple sequence alignment.</p></article>
          </div>
        </section>

        <section style="${sectionStyle()}">
          <h2 style="${headingStyle()}">Publication and Citation</h2>
          <p style="${bodyStyle()}"><strong>${PUBLICATION_TITLE}</strong> presents the Phylo-Movies workflow for recombination-focused sliding-window phylogenetics and rogue-taxon exploration across bootstrap tree sets.</p>
          <p style="${bodyStyle()}">Authors: ${PUBLICATION_AUTHORS.join(', ')}.</p>
          <p style="${bodyStyle()}">Publication DOI: <a href="${PUBLICATION_DOI_URL}">${PUBLICATION_DOI}</a></p>
          <p style="${bodyStyle()}">Software DOI: <a href="${SOFTWARE_DOI_URL}">${SOFTWARE_DOI}</a> (concept DOI: <a href="${SOFTWARE_CONCEPT_DOI_URL}">${SOFTWARE_CONCEPT_DOI}</a>)</p>
          <pre style="white-space: pre-wrap; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; padding: 16px; color: #111827; font-size: 13px; line-height: 1.55;">Sakalli, E. B., Haendeler, S. E., von Haeseler, A., and Schmidt, H. A. (2026). Animating Phylogenetic Trees from Sliding-Window Analyses. bioRxiv. doi:10.64898/2026.04.01.715821</pre>
          <pre style="white-space: pre-wrap; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; padding: 16px; color: #111827; font-size: 13px; line-height: 1.55;">Sakalli, E. B., Haendeler, S. E., von Haeseler, A., and Schmidt, H. A. (2026). Phylo-Movies: Interactive Phylogenetic Tree Interpolation and Visualization, version 0.92.0. Zenodo. doi:10.5281/zenodo.20488924</pre>
        </section>

        <section style="${sectionStyle()}">
          <h2 style="${headingStyle()}">Run the Full Application</h2>
          <p style="${bodyStyle()}">The complete local or deployed app combines the React frontend with the BranchArchitect backend for uploaded trees, interpolation, and MSA-based processing.</p>
          <pre style="overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; padding: 16px; color: #111827; font-size: 13px; line-height: 1.55;"><code>git clone --recurse-submodules https://github.com/enesBerkSakalli/phylo-movies.git
cd phylo-movies
docker compose up --build</code></pre>
        </section>

        <section style="${sectionStyle()}">
          <h2 style="${headingStyle()}">Frequently Asked Questions</h2>
          <article style="${cardStyle()}"><h3 style="${subheadingStyle()}">What does Phylo-Movies do?</h3><p style="${bodyStyle()}">Phylo-Movies visualizes topological changes between phylogenetic trees by animating subtree movements across sliding-window analyses, bootstrap replicates, and related workflows.</p></article>
          <article style="${cardStyle()}"><h3 style="${subheadingStyle()}">Can I try it in the browser?</h3><p style="${bodyStyle()}">Yes. The GitHub Pages site includes generated publication examples that open the visualization workspace without backend processing.</p></article>
          <article style="${cardStyle()}"><h3 style="${subheadingStyle()}">When do I need the backend?</h3><p style="${bodyStyle()}">You need the BranchArchitect backend for uploaded tree files, local example processing, interpolation, morphing animations, and MSA-driven workflows.</p></article>
          <article style="${cardStyle()}"><h3 style="${subheadingStyle()}">Why did a GitHub Pages action say Failed to fetch?</h3><p style="${bodyStyle()}">That usually means a backend-dependent action was started on the static site. Use the generated demo here, or run the desktop app, Docker, or source checkout for uploads.</p></article>
          <article style="${cardStyle()}"><h3 style="${subheadingStyle()}">How should I cite Phylo-Movies?</h3><p style="${bodyStyle()}">Cite the bioRxiv preprint ${PUBLICATION_TITLE} using DOI ${PUBLICATION_DOI}, and cite the archived software release using DOI ${SOFTWARE_DOI}.</p></article>
        </section>
      </main>`;
}

function renderStaticDemoHtml() {
  const exampleRows = DEMO_EXAMPLES.map(
    (example) => `            <article style="${cardStyle()}">
              <h3 style="${subheadingStyle()}">${example.name}</h3>
              <p style="${bodyStyle()}"><strong>Workflow:</strong> ${example.workflow}</p>
              <p style="${bodyStyle()}"><strong>Scale:</strong> ${example.scale}</p>
              <p style="${bodyStyle()}">${example.description}</p>
              <p style="${bodyStyle()}"><strong>Search terms:</strong> ${example.keywords.join(', ')}</p>
            </article>`
  ).join('\n');

  return `      <main data-prerendered-demo="true" style="font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; background: #ffffff; min-height: 100vh;">
        <section style="max-width: 960px; margin: 0 auto; padding: 48px 24px 32px; text-align: center;">
          <img src="/phylo-movies/icons/phylo-tree-icon.svg" alt="" width="64" height="64" style="margin: 0 auto 16px; display: block;">
          <h1 style="margin: 0 auto 16px; max-width: 780px; font-size: 36px; line-height: 1.12; font-weight: 760;">Phylo-Movies Browser Demo: Generated Phylogenetic Examples</h1>
          <p style="margin: 0 auto; max-width: 800px; color: #4b5563; font-size: 18px; line-height: 1.65;">Open generated Phylo-Movies examples directly in the browser without backend processing. The demo includes a norovirus sliding-window recombination dataset, IQ-TREE bootstrap rogue-taxon tree series, a paper figure example, a quick MSA-linked tree set, and a 1000-taxon scale-limit payload.</p>
          <nav aria-label="Demo links" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 24px;">
            <a href="${DEMO_URL}" style="${primaryLinkStyle()}">Open Generated Examples</a>
            <a href="${PRIMARY_URL}" style="${secondaryLinkStyle()}">Phylo-Movies Landing Page</a>
            <a href="${PUBLICATION_URL}" style="${secondaryLinkStyle()}">Read Publication</a>
          </nav>
        </section>

        <section style="${sectionStyle()}">
          <h2 style="${headingStyle()}">Generated Demo Datasets</h2>
          <p style="${bodyStyle()}">Each row in the live demo opens a precomputed Phylo-Movies JSON payload. No upload form or BranchArchitect backend is required for these bundled examples.</p>
          <div style="${gridStyle()}">
${exampleRows}
          </div>
        </section>

        <section style="${sectionStyle()}">
          <h2 style="${headingStyle()}">What This Demo Helps Discover</h2>
          <div style="${gridStyle()}">
            <article style="${cardStyle()}"><h3 style="${subheadingStyle()}">Norovirus Recombination</h3><p style="${bodyStyle()}">Inspect topology changes and SH-aLRT support across generated IQ-TREE trees inferred from the 334-taxon norovirus MSA.</p></article>
            <article style="${cardStyle()}"><h3 style="${subheadingStyle()}">Rogue Taxa in Bootstrap Trees</h3><p style="${bodyStyle()}">Review subtree movement, split support, and SPR recurrence across composition-ranked IQ-TREE bootstrap tree series.</p></article>
            <article style="${cardStyle()}"><h3 style="${subheadingStyle()}">Large Tree Visualization</h3><p style="${bodyStyle()}">Open a generated 1000-taxon two-tree payload for browser scale-limit inspection.</p></article>
          </div>
        </section>

        <section style="${sectionStyle()}">
          <h2 style="${headingStyle()}">Citation</h2>
          <p style="${bodyStyle()}">These generated examples support the Phylo-Movies publication workflow described in <strong>${PUBLICATION_TITLE}</strong>.</p>
          <p style="${bodyStyle()}">Publication DOI: <a href="${PUBLICATION_DOI_URL}">${PUBLICATION_DOI}</a></p>
          <p style="${bodyStyle()}">Software DOI: <a href="${SOFTWARE_DOI_URL}">${SOFTWARE_DOI}</a></p>
        </section>
      </main>`;
}

function primaryLinkStyle() {
  return 'display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 0 16px; border-radius: 8px; background: #111827; color: #ffffff; text-decoration: none; font-weight: 650; font-size: 14px;';
}

function secondaryLinkStyle() {
  return 'display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 0 16px; border-radius: 8px; border: 1px solid #d1d5db; color: #111827; text-decoration: none; font-weight: 650; font-size: 14px;';
}

function sectionStyle() {
  return 'max-width: 960px; margin: 0 auto; padding: 28px 24px;';
}

function headingStyle() {
  return 'margin: 0 0 14px; color: #111827; font-size: 24px; line-height: 1.25; font-weight: 720;';
}

function subheadingStyle() {
  return 'margin: 0 0 8px; color: #111827; font-size: 16px; line-height: 1.35; font-weight: 680;';
}

function bodyStyle() {
  return 'margin: 0 0 12px; color: #4b5563; font-size: 15px; line-height: 1.65;';
}

function gridStyle() {
  return 'display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;';
}

function cardStyle() {
  return 'border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff; padding: 16px; margin: 0 0 12px;';
}

function buildSeoInjection({ pageTitle, ogDescription, pageUrl, structuredData }) {
  const structuredDataJson = JSON.stringify(structuredData, null, 2);
  const citationAuthorTags = PUBLICATION_AUTHORS.map(
    (author) => `    <meta name="citation_author" content="${author}">`
  ).join('\n');

  return `
    <meta name="keywords" content="${KEYWORDS}">
    <meta name="author" content="Phylo-Movies Contributors">
    <meta name="application-name" content="Phylo-Movies">
    <meta name="generator" content="Vite">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="googlebot" content="index, follow, max-image-preview:large">
    <meta name="google-site-verification" content="kdEmgK5GYFcbtDTl8PpHXP06uNDeJMREL6pkaetwkHk">
    <meta name="theme-color" content="#111827">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <meta property="og:site_name" content="Phylo-Movies">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="en_US">
    <meta property="og:title" content="${pageTitle}">
    <meta property="og:description" content="${ogDescription}">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:image" content="${SOCIAL_IMAGE_URL}">
    <meta property="og:image:secure_url" content="${SOCIAL_IMAGE_URL}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="${OG_IMAGE_WIDTH}">
    <meta property="og:image:height" content="${OG_IMAGE_HEIGHT}">
    <meta property="og:image:alt" content="Phylo-Movies application interface">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${pageTitle}">
    <meta name="twitter:description" content="${ogDescription}">
    <meta name="twitter:url" content="${pageUrl}">
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
    <link rel="canonical" href="${pageUrl}">
    <link rel="alternate" hreflang="en" href="${pageUrl}">
    <link rel="alternate" hreflang="x-default" href="${pageUrl}">
    <link rel="apple-touch-icon" sizes="180x180" href="/phylo-movies/icons/apple-touch-icon.png">
    <link rel="manifest" href="/phylo-movies/site.webmanifest">
    <link rel="bookmark" href="${README_URL}">
    <script type="application/ld+json">
${structuredDataJson}
    </script>`;
}

function applyIndexSeo(indexHtml) {
  let html = replaceTitleTag(indexHtml, PAGE_TITLE);
  html = replaceDescriptionMeta(html, DESCRIPTION);
  html = injectStaticLandingHtml(html);
  const injection = buildSeoInjection({
    pageTitle: PAGE_TITLE,
    ogDescription: OG_DESCRIPTION,
    pageUrl: PRIMARY_URL,
    structuredData: STRUCTURED_DATA,
  });

  html = injectIntoHead(html, injection);
  return html;
}

function applyDemoSeo(indexHtml) {
  let html = replaceTitleTag(indexHtml, DEMO_PAGE_TITLE);
  html = replaceDescriptionMeta(html, DEMO_DESCRIPTION);
  html = injectStaticDemoHtml(html);
  const injection = buildSeoInjection({
    pageTitle: DEMO_PAGE_TITLE,
    ogDescription: DEMO_OG_DESCRIPTION,
    pageUrl: DEMO_URL,
    structuredData: DEMO_STRUCTURED_DATA,
  });

  html = injectIntoHead(html, injection);
  return html;
}

function applySplashNoIndex(splashHtml) {
  if (!splashHtml.includes('</head>')) return splashHtml;
  if (/<meta\s+name=["']robots["']/i.test(splashHtml)) return splashHtml;
  return splashHtml.replace(
    '</head>',
    '    <meta name="robots" content="noindex, nofollow">\n  </head>'
  );
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
    ? [`${SITE_ROOT}/`, DEMO_URL]
    : [`${SITE_ROOT}/`, `${SITE_ROOT}/visualization`];

  const entries = urls
    .map(
      (url) => `  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
  </url>`
    )
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
    start_url: '/phylo-movies/',
    scope: '/phylo-movies/',
    display: 'standalone',
    background_color: '#0b1220',
    theme_color: '#111827',
    icons: [
      {
        src: '/phylo-movies/icons/phylo-tree-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/phylo-movies/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/phylo-movies/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
  writeTextFile(path.join(DIST_DIR, 'site.webmanifest'), JSON.stringify(manifest, null, 2));
}

function writeDemoIndexHtml(indexHtml) {
  const demoDir = path.join(DIST_DIR, 'demo');
  ensureDir(demoDir);
  writeTextFile(path.join(demoDir, 'index.html'), applyDemoSeo(indexHtml));
}

function copySocialPreviewImage() {
  const sourceImageCandidates = [
    path.join(PROJECT_ROOT, 'docs', 'screenshot.png'),
    path.join(PROJECT_ROOT, 'assets', 'screenshot.png'),
  ];
  const sourceImage = sourceImageCandidates.find((candidate) => fs.existsSync(candidate));
  if (!sourceImage) {
    throw new Error(
      `Required social preview image not found. Checked: ${sourceImageCandidates.join(', ')}`
    );
  }
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
  writeDemoIndexHtml(indexHtml);
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

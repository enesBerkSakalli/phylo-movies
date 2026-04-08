import React from 'react';
import phyloTreeIcon from '/icons/phylo-tree-icon.svg';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const REPO_URL = 'https://github.com/enesBerkSakalli/phylo-movies';
const README_URL = `${REPO_URL}#readme`;
const RELEASES_URL = `${REPO_URL}/releases`;
const PREPRINT_URL = 'https://www.biorxiv.org/content/10.64898/2026.04.01.715821v1';
const PREPRINT_DOI_URL = 'https://doi.org/10.64898/2026.04.01.715821';
const PREPRINT_PDF_URL = 'https://www.biorxiv.org/content/10.64898/2026.04.01.715821v1.full.pdf';

const USE_CASES = [
  {
    title: 'Recombination Detection',
    description: 'Inspect where local tree topology shifts across genomic windows instead of relying only on scalar distance summaries.'
  },
  {
    title: 'Rogue Taxa Analysis',
    description: 'Track taxa that jump between clades across bootstrap trees and identify which lineages move and where they attach.'
  },
  {
    title: 'Sliding-Window Phylogenetics',
    description: 'Animate changes across ordered tree series generated from overlapping windows in an MSA.'
  }
];

const ACCESS_OPTIONS = [
  {
    title: 'Desktop App',
    description: 'Best default path for end users who want a packaged local application without setting up Node.js or Python.',
    ctaLabel: 'Download Desktop Releases',
    href: RELEASES_URL,
  },
  {
    title: 'Browser Interface',
    description: 'Use the web frontend as part of a local or deployed full-stack setup backed by BranchArchitect.',
    ctaLabel: 'Open README',
    href: README_URL,
  },
  {
    title: 'Full Stack Workflow',
    description: 'Required for interpolation, morphing animations, and MSA-driven processing via the BranchArchitect backend.',
    ctaLabel: 'View Setup Instructions',
    href: README_URL,
  }
];

const PLATFORM_DOWNLOADS = [
  {
    platform: 'macOS (Apple Silicon)',
    artifact: 'Phylo-Movies-<version>-mac-arm64.dmg',
    architecture: 'ARM64 (M1/M2/M3/M4)'
  },
  {
    platform: 'macOS (Intel)',
    artifact: 'Phylo-Movies-<version>-mac-x64.dmg',
    architecture: 'x86_64'
  },
  {
    platform: 'Linux',
    artifact: 'Phylo-Movies-<version>-linux-x86_64.AppImage',
    architecture: 'x86_64'
  },
  {
    platform: 'Windows',
    artifact: 'Phylo-Movies-<version>-win-x64.exe',
    architecture: 'x86_64'
  }
];

const HOW_IT_WORKS = [
  'Upload trees directly or derive them from sliding-window MSA workflows.',
  'BranchArchitect computes subtree movements and interpolated intermediate states.',
  'Phylo-Movies renders animated transitions, linked statistics, and optional MSA context.'
];

const FAQ_ITEMS = [
  {
    question: 'Is the README already a landing page?',
    answer: 'It is a strong repository document, but not an ideal search landing page on its own because it mixes many intents at once: installation, architecture, datasets, developer workflow, and citation. A dedicated landing page is better for search and AI retrieval because it leads with the core problem, use cases, publication, and calls to action.'
  },
  {
    question: 'Do I need the backend to use Phylo-Movies?',
    answer: 'Yes. Phylo-Movies requires the BranchArchitect backend for uploaded tree files, interpolation, morphing animations, and MSA-driven workflows. The GitHub Pages site is documentation-only, not a standalone processing frontend.'
  },
  {
    question: 'Is Phylo-Movies also a desktop app?',
    answer: 'Yes. Phylo-Movies is available as a desktop app in addition to the browser-based interface, and the desktop releases are linked directly from this landing page.'
  },
  {
    question: 'How should I cite the project?',
    answer: 'Use the bioRxiv preprint Animating Phylogenetic Trees from Sliding-Window Analyses with DOI 10.64898/2026.04.01.715821.'
  },
  {
    question: 'Which search intents should this page answer?',
    answer: 'It should explicitly answer queries around phylogenetic tree interpolation, sliding-window phylogenetics, recombination visualization, rogue taxa detection, and MSA-linked tree analysis.'
  }
];

const DOCKER_QUICKSTART = `git clone --recurse-submodules https://github.com/enesBerkSakalli/phylo-movies.git
cd phylo-movies
docker compose up --build`;

export function GitHubPagesInfoPage() {
  return (
    <div className="home-page bg-background">
      <main className="container mx-auto max-w-4xl py-8 space-y-8">
        <section className="text-center space-y-4">
          <div className="flex justify-center">
            <img src={phyloTreeIcon} alt="" className="size-16" />
          </div>
          <Badge variant="secondary">GitHub Pages information site</Badge>
          <div className="space-y-3 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight">
              Phylo-Movies: Desktop App and Web Tool for Phylogenetic Tree Interpolation
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Phylo-Movies is available both as a desktop app and as a
              browser-based phylogenetic tree visualization and interpolation
              tool for sliding-window analyses, recombination detection, and
              rogue taxa exploration. This page is the public landing page for
              the software, publication, citation details, downloads, and setup
              paths.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button asChild>
                <a href={PREPRINT_URL} target="_blank" rel="noopener noreferrer">
                  Read Publication
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer">
                  Download Desktop App
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={README_URL} target="_blank" rel="noopener noreferrer">
                  Full README
                </a>
              </Button>
            </div>
          </div>
        </section>

        <Card className="shadow-lg border-muted">
          <CardHeader>
            <CardTitle>Choose How to Use Phylo-Movies</CardTitle>
            <CardDescription>
              The desktop app should be a primary call to action, not a footnote.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {ACCESS_OPTIONS.map((option) => (
              <div key={option.title} className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <h3 className="font-semibold text-foreground">{option.title}</h3>
                <p className="text-sm text-muted-foreground">{option.description}</p>
                <Button variant="outline" asChild>
                  <a href={option.href} target="_blank" rel="noopener noreferrer">
                    {option.ctaLabel}
                  </a>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-muted">
          <CardHeader>
            <CardTitle>Desktop Download Matrix</CardTitle>
            <CardDescription>
              Release artifacts are published on GitHub Releases for the main desktop targets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-170 border-collapse text-left">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-foreground">Platform</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Release Artifact</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Architecture</th>
                  </tr>
                </thead>
                <tbody>
                  {PLATFORM_DOWNLOADS.map((item) => (
                    <tr key={item.platform} className="border-t">
                      <td className="px-4 py-3 text-foreground">{item.platform}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{item.artifact}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.architecture}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer">
                  Open Releases Page
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-muted">
          <CardHeader>
            <CardTitle>Publication</CardTitle>
            <CardDescription>
              Method details, benchmarks, and case studies are described in the
              current bioRxiv preprint.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>Animating Phylogenetic Trees from Sliding-Window Analyses</strong>
              {' '}presents the Phylo-Movies workflow for recombination-focused
              sliding-window phylogenetics and rogue-taxon exploration across
              bootstrap tree sets.
            </p>
            <p>
              Authors: E. B. Sakalli, S. E. Haendeler, A. von Haeseler, and
              H. A. Schmidt.
            </p>
            <p>
              DOI: <a href={PREPRINT_DOI_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">10.64898/2026.04.01.715821</a>
            </p>
            <div className="rounded-lg border bg-muted p-4 text-xs leading-relaxed text-foreground">
              Sakalli, E. B., Haendeler, S. E., von Haeseler, A., and Schmidt,
              H. A. (2026). <em>Animating Phylogenetic Trees from Sliding-Window
              Analyses</em>. bioRxiv. doi:10.64898/2026.04.01.715821
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild>
                <a href={PREPRINT_URL} target="_blank" rel="noopener noreferrer">
                  View bioRxiv Preprint
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={PREPRINT_DOI_URL} target="_blank" rel="noopener noreferrer">
                  DOI Link
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={PREPRINT_PDF_URL} target="_blank" rel="noopener noreferrer">
                  PDF
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-muted">
          <CardHeader>
            <CardTitle>What the Tool Does</CardTitle>
            <CardDescription>
              Phylo-Movies helps inspect topological changes across phylogenetic
              trees across desktop and browser-based workflows, including
              sliding-window and bootstrap analyses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              The full application combines a React frontend with the
              BranchArchitect Python backend for interpolation and MSA-based
              processing.
            </p>
            <p>
              This GitHub Pages deployment does not host that backend, so it
              only explains the project and links to full deployment options.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild>
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                  Source Repository
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={README_URL} target="_blank" rel="noopener noreferrer">
                  README and Setup Guide
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href={RELEASES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Desktop Releases
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={PREPRINT_URL} target="_blank" rel="noopener noreferrer">
                  Publication
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-muted">
          <CardHeader>
            <CardTitle>Key Use Cases</CardTitle>
            <CardDescription>
              The landing page should be explicit about the scientific problems
              the software solves.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {USE_CASES.map((item) => (
              <div key={item.title} className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-muted">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>
              Search-oriented landing pages perform better when the workflow is
              understandable in a few steps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {HOW_IT_WORKS.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-lg border bg-muted/30 p-4">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </div>
                <p>{step}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-muted">
          <CardHeader>
            <CardTitle>Run the full application</CardTitle>
            <CardDescription>
              Recommended path for complete functionality is Docker full-stack
              deployment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <pre className="rounded-lg border bg-muted p-4 overflow-x-auto text-xs leading-relaxed">
              <code>{DOCKER_QUICKSTART}</code>
            </pre>
            <p className="text-muted-foreground">
              Then open <code>http://localhost:8080/home</code> to use the app
              with backend-powered processing.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-muted">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>
              These entries are also mirrored in machine-readable FAQ schema for
              search engines and AI retrieval systems.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question} className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <h3 className="font-semibold text-foreground">{item.question}</h3>
                <p className="text-sm text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default GitHubPagesInfoPage;

import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Database,
  Download,
  ExternalLink,
  Film,
  GitBranch,
  Play,
  Terminal,
  Upload,
} from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { DEMO_EXAMPLE_DATASETS } from '../WorkspaceInitialization/exampleDatasets.js';

const REPO_URL = 'https://github.com/enesBerkSakalli/phylo-movies';
const DOCS_USAGE_URL = `${REPO_URL}/blob/main/docs/usage.md`;
const README_URL = `${REPO_URL}#readme`;

const DEMO_STEPS = [
  {
    title: 'Open the demo library',
    description:
      'The public demo uses bundled Phylo-Movies JSON payloads, so it works without a backend.',
  },
  {
    title: 'Choose a generated dataset',
    description:
      'Start with the paper figure example for a small walkthrough, or open the norovirus dataset for a publication-scale transition.',
  },
  {
    title: 'Play and inspect transitions',
    description:
      'Use the timeline, playback controls, sidebar statistics, transition inspector, and optional MSA window to review topology changes.',
  },
  {
    title: 'Export a visual',
    description:
      'After adjusting the viewport and styling, export a still image or record WebM playback from the canvas controls.',
  },
];

const WORKFLOWS = [
  {
    title: 'View bundled examples',
    icon: Database,
    description: 'Fastest way to see the interface and understand the analysis workflow.',
    path: 'Generated Examples -> Open -> Visualization workspace',
  },
  {
    title: 'Upload your own trees',
    icon: Upload,
    description: 'Use an ordered Newick tree series when trees were inferred outside the app.',
    path: 'New Project -> Tree file -> Rooting options -> Create visualization',
  },
  {
    title: 'Infer trees from an MSA',
    icon: GitBranch,
    description:
      'Run sliding-window phylogenetics from a FASTA, PHYLIP, Nexus, MSF, or CLUSTAL alignment.',
    path: 'New Project -> MSA file -> Sliding windows -> Tree inference -> Create visualization',
  },
  {
    title: 'Download source artifacts',
    icon: Download,
    description:
      'Use example source files, regeneration notes, and metadata to reproduce bundled demos.',
    path: 'Example Library -> Download buttons -> Source files and metadata',
  },
];

const FULL_STACK_COMMAND = `git clone --recurse-submodules https://github.com/enesBerkSakalli/phylo-movies.git
cd phylo-movies
docker compose up --build`;

export function UsageExamplesPage() {
  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-background">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div className="min-w-0 space-y-4">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <Badge variant="secondary" className="gap-1">
                <BookOpen className="size-3.5" aria-hidden />
                Usage guide
              </Badge>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">Back to overview</Link>
              </Button>
            </div>
            <div className="max-w-3xl space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                See Phylo-Movies in use
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
                Use this page as a short walkthrough: open a generated example, inspect the movie
                workspace, then move to the full application when you want to process your own tree
                series or alignments.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/demo">
                  <Play data-icon="inline-start" />
                  Open Generated Examples
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <a href={DOCS_USAGE_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink data-icon="inline-start" />
                  Full Usage Docs
                </a>
              </Button>
            </div>
          </div>

          <Card className="min-w-0 border-muted shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="size-5" aria-hidden />
                Quickest Demo
              </CardTitle>
              <CardDescription>Recommended first path for reviewers and new users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Open <strong className="text-foreground">Paper Figure Example</strong> first. It is
                small enough to make every transition easy to follow.
              </p>
              <div className="rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
                /usage -&gt; /demo -&gt; Paper Figure Example -&gt; Open
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="border-muted shadow-lg">
          <CardHeader>
            <CardTitle>Demo Walkthrough</CardTitle>
            <CardDescription>
              A backend-free path that shows the interface with generated example movies.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {DEMO_STEPS.map((step, index) => (
              <div key={step.title} className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-3 flex size-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <h2 className="text-sm font-semibold text-foreground">{step.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card className="min-w-0 border-muted shadow-lg">
            <CardHeader>
              <CardTitle>Common Workflows</CardTitle>
              <CardDescription>
                These are the main ways users move from input data to a movie.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {WORKFLOWS.map((workflow) => {
                const WorkflowIcon = workflow.icon;
                return (
                  <div
                    key={workflow.title}
                    className="flex gap-3 rounded-lg border bg-muted/30 p-4"
                  >
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-foreground">
                      <WorkflowIcon className="size-4" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-foreground">{workflow.title}</h2>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {workflow.description}
                      </p>
                      <p className="mt-2 break-words rounded-md bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
                        {workflow.path}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-muted shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="size-5" aria-hidden />
                Run the Full App
              </CardTitle>
              <CardDescription>
                Required for uploads, interpolation, and MSA-driven tree inference.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg border bg-muted p-4 text-xs leading-relaxed">
                <code>{FULL_STACK_COMMAND}</code>
              </pre>
              <p className="text-muted-foreground">
                Then open <code>http://localhost:8080/</code> and use <strong>New Project</strong>{' '}
                for your own files or <strong>Example Library</strong> for bundled source inputs.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild>
                  <a href={README_URL} target="_blank" rel="noopener noreferrer">
                    <ExternalLink data-icon="inline-start" />
                    Setup README
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className="border-muted shadow-lg">
          <CardHeader>
            <CardTitle>Generated Examples You Can Open</CardTitle>
            <CardDescription>
              These rows are sourced from the same demo metadata used by the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {DEMO_EXAMPLE_DATASETS.map((example) => (
              <div
                key={example.id}
                className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="min-w-0 text-sm font-semibold leading-tight text-foreground">
                    {example.name}
                  </h2>
                  {example.badge && (
                    <Badge variant="secondary" className="text-2xs">
                      {example.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {example.description}
                </p>
                <div className="mt-auto grid gap-2 text-xs text-muted-foreground">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium text-foreground/70">Workflow</span>
                    <span className="text-right">{example.workflow}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="font-medium text-foreground/70">Scale</span>
                    <span className="text-right">{example.scale}</span>
                  </div>
                  <div className="rounded-md bg-background px-3 py-2">
                    <span className="font-medium text-foreground/70">Best for: </span>
                    {example.bestFor}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default UsageExamplesPage;

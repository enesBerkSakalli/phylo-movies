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
              Phylo-Movies
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Interactive phylogenetic tree visualization and tree-morphing for
              sliding-window MSA analysis, recombination detection, and rogue
              taxa exploration. This GitHub Pages site acts as a README-style
              project overview and setup guide.
            </p>
          </div>
        </section>

        <Card className="shadow-lg border-muted">
          <CardHeader>
            <CardTitle>What the tool does</CardTitle>
            <CardDescription>
              Phylo-Movies helps inspect topological changes across phylogenetic
              trees, including sliding-window and bootstrap workflows.
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
            </div>
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
      </main>
    </div>
  );
}

export default GitHubPagesInfoPage;

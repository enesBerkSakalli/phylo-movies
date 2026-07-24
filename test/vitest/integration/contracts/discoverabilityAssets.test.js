import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();

function source(relativePath) {
  return readFileSync(join(repoRoot, relativePath), 'utf8');
}

describe('public discoverability assets', () => {
  it('generates indexable usage and AI-readable entry points', () => {
    const seoSource = source('scripts/apply-gh-seo.js');

    expect(seoSource).toContain('data-prerendered-usage="true"');
    expect(seoSource).toContain('writeUsageIndexHtml(indexHtml)');
    expect(seoSource).toContain("writeTextFile(path.join(DIST_DIR, 'llms.txt'), content)");
    expect(seoSource).toContain('Sitemap: ${SITE_ROOT}/manual/sitemap.xml');
    expect(seoSource).toContain('USAGE_STRUCTURED_DATA');
    expect(seoSource).toContain("'@type': 'HowTo'");
  });

  it('keeps the landing and usage heading hierarchy semantic', () => {
    const landingSource = source('src/pages/GitHubPages/GitHubPagesInfoPage.jsx');
    const usageSource = source('src/pages/UsageExamples/UsageExamplesPage.jsx');

    expect(landingSource).toContain('<h1');
    expect(landingSource).toContain('<h2>{children}</h2>');
    expect(landingSource).not.toContain('alt=""');
    expect(usageSource).toContain('<h1');
    expect(usageSource).toContain('<h2 className={className}>{children}</h2>');
    expect(usageSource).toContain('<h3 className="text-sm font-semibold text-foreground">');
  });

  it('publishes focused scientific use-case content and a directory tracker', () => {
    const expectedFiles = [
      'docs/promotion/discoverability-plan.md',
      'docs/promotion/directory-submission-tracker.csv',
      'manual/docs/use-cases/sliding-window-phylogenetics.md',
      'manual/docs/use-cases/recombination-analysis.md',
      'manual/docs/use-cases/rogue-taxa-bootstrap-trees.md',
    ];

    for (const relativePath of expectedFiles) {
      expect(existsSync(join(repoRoot, relativePath)), relativePath).toBe(true);
    }
  });
});

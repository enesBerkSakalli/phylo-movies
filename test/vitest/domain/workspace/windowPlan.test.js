import { describe, expect, it } from 'vitest';
import {
  assessWindowPlan,
  countNewickTrees,
  countWindows,
  suggestWindowSettings,
  summarizeAlignmentText,
} from '../../../../src/pages/WorkspaceInitialization/windowPlan.js';

describe('upload window plan', () => {
  it('summarizes FASTA and PHYLIP alignments', () => {
    expect(summarizeAlignmentText('>a\nACGT\nAC\n>b\nACGTAC\n')).toEqual({
      sequenceCount: 2,
      siteCount: 6,
    });
    expect(summarizeAlignmentText(' 30 1000\nT01 ACGT')).toEqual({
      sequenceCount: 30,
      siteCount: 1000,
    });
    expect(summarizeAlignmentText('CLUSTAL W\n')).toBeNull();
  });

  it('counts Newick trees and ignores bracket comments', () => {
    expect(countNewickTrees('(a,b);\n(a,[x;y]b);\n')).toBe(2);
    expect(countNewickTrees('')).toBeNull();
  });

  it('counts windows the way the backend cuts them', () => {
    expect(countWindows(1000, 10)).toBe(100);
    expect(countWindows(1000, 100)).toBe(10);
    expect(countWindows(1001, 100)).toBe(11);
    expect(countWindows(0, 100)).toBeNull();
  });

  it('suggests settings from the alignment length, or one window per uploaded tree', () => {
    expect(suggestWindowSettings({ siteCount: 1000 })).toEqual({ windowSize: 200, stepSize: 100 });
    expect(suggestWindowSettings({ siteCount: 8058 })).toEqual({ windowSize: 1600, stepSize: 800 });
    expect(suggestWindowSettings({ siteCount: 1000, treeCount: 10 })).toEqual({
      windowSize: 200,
      stepSize: 100,
    });
    expect(suggestWindowSettings({ siteCount: 0 })).toBeNull();
  });

  it('warns about mismatched, degenerate, and very large plans', () => {
    expect(
      assessWindowPlan({ siteCount: 1000, treeCount: 10, windowSize: 1000, stepSize: 10 })
    ).toEqual([
      'The tree file has 10 trees but these settings give 100 windows, so windows will not line up with trees.',
      'The window covers the whole alignment, so every window is identical.',
    ]);
    expect(assessWindowPlan({ siteCount: 1000, windowSize: 200, stepSize: 5 })[0]).toMatch(
      /infers 200 trees/
    );
    expect(assessWindowPlan({ siteCount: 1000, windowSize: 200, stepSize: 100 })).toEqual([]);
  });
});

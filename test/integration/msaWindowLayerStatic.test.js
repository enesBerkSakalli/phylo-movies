import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('MSA window layering', () => {
  it('keeps the alignment viewer above timeline and HUD controls', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/msa/MsaRndWindow.jsx'),
      'utf8'
    );
    const layerSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/ui/floating-window-layer.js'),
      'utf8'
    );

    expect(source).toContain('getFloatingWindowLayerClass');
    expect(layerSource).toContain('z-[1100]');
    expect(source).not.toContain('z-40');
  });

  it('starts with enough minimum width for the MSA toolbar', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/msa/MsaRndWindow.jsx'),
      'utf8'
    );

    expect(source).toContain('minWidth: 840');
  });

  it('keeps MSA select dropdowns above the floating window', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/msa/MSAControls.jsx'),
      'utf8'
    );

    expect(source).toContain('<SelectContent className="z-[2000]">');
  });

  it('exposes taxa row coloring in the MSA coloring menu', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/msa/MSAControls.jsx'),
      'utf8'
    );

    expect(source).toContain('<SelectItem value="taxa">Taxa</SelectItem>');
  });

  it('does not vertically clip wrapped MSA toolbar controls', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/msa/MSAControls.jsx'),
      'utf8'
    );

    expect(source).toContain('flex-wrap');
    expect(source).not.toContain('overflow-y-hidden');
  });

  it('keeps visible column status out of the MSA toolbar', () => {
    const controlsSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/msa/MSAControls.jsx'),
      'utf8'
    );
    const controlsIndexSource = fs.readFileSync(
      path.join(process.cwd(), 'src/components/msa/controls/index.js'),
      'utf8'
    );

    expect(controlsSource).not.toContain('MSAVisibleRange');
    expect(controlsIndexSource).not.toContain('MSAVisibleRange');
  });

  it('keeps tree context icons in the viewer status badge', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/msa/MSAViewer.jsx'),
      'utf8'
    );

    expect(source).toContain('buildMsaTreeStatus');
    expect(source).toContain('GitBranch');
    expect(source).toContain('ArrowRight');
    expect(source).toContain('formatMsaTreeStatusLabel');
    expect(source).toContain('formatMsaTreeStatusTooltip');
    expect(source).toContain('inline-flex w-[7rem] shrink-0');
    expect(source).toContain('shrink-0');
  });

  it('keeps the active MSA window region in the viewer status badge', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/msa/MSAViewer.jsx'),
      'utf8'
    );

    expect(source).toContain('buildMsaWindowStatus');
    expect(source).toContain('formatMsaWindowStatusLabel');
    expect(source).toContain('formatMsaWindowStatusTooltip');
    expect(source).toContain('MSAWindowStatus');
    expect(source).toContain('inline-flex w-[7.5rem] shrink-0');
  });

  it('docks the MSA viewer status away from the top-left taxa labels', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/msa/MSAViewer.jsx'),
      'utf8'
    );

    expect(source).toContain('absolute inset-x-3 top-3 z-10 flex justify-end');
    expect(source).toContain('pointer-events-none');
    expect(source).not.toContain('absolute left-3 top-3');
  });

  it('keeps the MSA viewer status overlay clippable', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/msa/MSAViewer.jsx'),
      'utf8'
    );

    expect(source).toContain('statusClipped');
    expect(source).toContain('Clip alignment status overlay');
    expect(source).toContain('Show alignment status overlay');
    expect(source).toContain('aria-pressed={clipped}');
  });

  it('renders MSA region as read-only toolbar context', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/msa/controls/MSARegionOverrides.jsx'),
      'utf8'
    );

    expect(source).toContain('aria-label="Alignment region"');
    expect(source).toContain('aria-live="polite"');
    expect(source).not.toContain('Input');
    expect(source).not.toContain('setMsaRegion');
    expect(source).not.toContain('clearMsaRegion');
  });

  it('keeps shared tooltips above floating window UI', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/ui/tooltip.tsx'),
      'utf8'
    );

    expect(source).toContain('z-[2200]');
    expect(source).not.toContain('z-50 w-fit');
  });

  it('shows source-target MSA window overlap as separated source and target lanes', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/msa/MSAViewer.jsx'),
      'utf8'
    );

    expect(source).toContain('buildMsaWindowOverlapStatus');
    expect(source).toContain('MSAWindowOverlapStatus');
    expect(source).toContain('MSAWindowOverlapTrack');
    expect(source).toContain('leavingRanges');
    expect(source).toContain('enteringRanges');
    expect(source).toContain('Source W{status.sourceWindowIndex + 1}');
    expect(source).toContain('Target W{status.targetWindowIndex + 1}');
    expect(source).toContain('grid-cols-[4.75rem_minmax(14rem,1fr)]');
    expect(source).toContain('label="leaving"');
    expect(source).toContain('label="shared"');
    expect(source).toContain('label="entering"');
  });

  it('uses a compact single-row MSA window header', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/components/msa/MsaRndWindow.jsx'),
      'utf8'
    );

    expect(source).toContain('msa-rnd-header flex items-center justify-between gap-2 px-2 py-1');
    expect(source).toContain('min-w-0');
    expect(source).toContain('truncate');
  });
});

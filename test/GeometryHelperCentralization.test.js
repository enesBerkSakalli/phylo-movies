import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..');

describe('geometry helper centralization', () => {
  it('keeps polar and label geometry helpers out of orchestration classes', () => {
    const checks = [
      {
        file: 'src/treeVisualisation/deckgl/interpolation/TreeInterpolator.js',
        patterns: [
          /function positionToPolar\b/,
          /function positionFromPolar\b/,
          /function polarToPosition\b/,
          /function shouldFlipLabel\b/,
          /function labelRotation\b/,
          /_interpolateFinite\b/,
          /optionsOrLegacy\b/,
          /_angleFromPosition\b/,
          /_lastPathPoint\b/,
          /_firstPathPoint\b/,
          /_replaceLastPathPoint\b/,
          /_interpolateLifecycleAwareLinks\b/,
          /_computeLifecycleEntry\b/,
          /_interpolateLifecycleScaledLink\b/,
          /_lifecycleTargetReferencePosition\b/,
          /_interpolateLinkEndpointPosition\b/,
          /_interpolateLinkDatum\b/,
          /_createLinkDatumFromPositions\b/,
          /_interpolateLabelRadius\b/,
          /_interpolateExtensionRadius\b/,
          /_applyLabelRadius\b/,
          /_applyExtensionTargetRadius\b/,
          /function getLifecycleClock\b/,
          /function getLifecycleLengthScale\b/,
          /function lifecycleTargetReferenceLink\b/,
          /function shouldAttachLifecycleEndpoints\b/
        ]
      },
      {
        file: 'src/treeVisualisation/deckgl/builders/data/labels/LabelDataBuilder.js',
        patterns: [
          /_shouldFlipLabel\b/,
          /_calculateTextAnchor\b/,
          /_calculateLabelRotation\b/,
          /_calculateLabelPosition\b/
        ]
      }
    ];

    const violations = [];
    for (const { file, patterns } of checks) {
      const text = fs.readFileSync(path.join(repoRoot, file), 'utf8');
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          violations.push(`${file}: ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

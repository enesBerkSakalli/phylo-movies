import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'test/AdaptiveScaling.test.js',
      'test/ComparisonGeometryUtils.test.js',
      'test/ComplexDataLayer.test.js',
      'test/ConnectorGeometryBuilder.test.js',
      'test/ConnectorIntegration.test.js',
      'test/RadialTreeGeometry.test.js',
      'test/RadialTreeLayout.test.js',
      'test/RealDataIntegration.test.js',
      'test/RealDataScaling.test.js',
      'test/reproduce_tooltip_issue.test.js',
      'test/scaleUtils.test.js',
      'test/subtree-frequency.test.js',
      'test/subtree-temporal.test.js',
      'test/subtreeConnectorBuilder.test.js',
      'test/taxa-coloring.test.js',
      'test/TidyTreeLayout.test.js',
      'test/ViewLinkMapper.test.js',
      'test/domain/**/*.test.{js,ts}',
      'test/integration/**/*.test.{js,ts}',
    ],
  }
});

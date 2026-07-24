/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'not-to-unresolvable',
      severity: 'error',
      from: {},
      to: {
        couldNotResolve: true,
      },
    },
    {
      name: 'no-source-to-test',
      severity: 'error',
      from: {
        path: '^src/',
      },
      to: {
        path: '^test/',
      },
    },
    {
      name: 'no-renderer-to-ui',
      severity: 'error',
      from: {
        path: '^src/treeVisualisation/',
      },
      to: {
        path: '^src/(?:components|pages|hooks)/',
      },
    },
    {
      name: 'layer-internals-are-owned',
      severity: 'error',
      from: {
        path: '^src/',
        pathNot: '^src/treeVisualisation/deckgl/layers/',
      },
      to: {
        path: '^src/treeVisualisation/deckgl/layers/(?:config|factory|styles)/',
      },
    },
    {
      name: 'deckgl-does-not-own-orchestration',
      severity: 'warn',
      from: {
        path: '^src/treeVisualisation/deckgl/',
      },
      to: {
        path: '^src/treeVisualisation/(?:DeckGLTreeAnimationController[.]js|comparison/|interaction/|systems/|viewport/)',
      },
    },
    {
      name: 'layer-implementation-does-not-own-app-state',
      severity: 'warn',
      from: {
        path: '^src/treeVisualisation/deckgl/layers/',
      },
      to: {
        path: '^src/state/',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    moduleSystems: ['es6', 'cjs'],
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.js', '.jsx', '.mjs', '.ts', '.tsx', '.json'],
      mainFields: ['module', 'main'],
    },
    skipAnalysisNotInRules: true,
  },
};

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Custom plugin to handle the problematic SCSS import
const virtualizedMatrixViewerPlugin = () => {
  return {
    name: 'virtualized-matrix-viewer-mock',
    resolveId(id, importer) {
      console.log('Vite Plugin - resolveId called with:', { id, importer });

      // Handle various possible import patterns
      if (id === './VirtualizedMatrixViewer.scss' ||
          id.endsWith('VirtualizedMatrixViewer.scss') ||
          id.includes('VirtualizedMatrixViewer.scss')) {
        console.log('Vite Plugin - Intercepting SCSS import:', id);
        return 'virtual:virtualized-matrix-viewer-scss';
      }

      // Also handle absolute paths from node_modules
      if (importer && importer.includes('alignment-viewer-2') && id.includes('VirtualizedMatrixViewer.scss')) {
        console.log('Vite Plugin - Intercepting node_modules SCSS import:', id);
        return 'virtual:virtualized-matrix-viewer-scss';
      }
    },
    load(id) {
      if (id === 'virtual:virtualized-matrix-viewer-scss') {
        console.log('Vite Plugin - Loading virtual CSS module');
        return `export default {
  hoverTrackerSize: 5,
  'av2-virtualized-matrix': 'av2-virtualized-matrix',
  'scrolled-indicator': 'scrolled-indicator',
  'av2-wheel-scroller': 'av2-wheel-scroller',
  'hover-tracker-y': 'hover-tracker-y',
  'hover-tracker-x': 'hover-tracker-x',
  'triangle-up': 'triangle-up',
  'triangle-down': 'triangle-down',
  'triangle-left': 'triangle-left',
  'triangle-right': 'triangle-right',
  'av2-data': 'av2-data'
};`;
      }
    },
    transform(code, id) {
      // Intercept and replace require calls for the SCSS file
      if (id.includes('alignment-viewer-2') && code.includes('VirtualizedMatrixViewer.scss')) {
        console.log('Vite Plugin - Transforming code that includes VirtualizedMatrixViewer.scss:', id);
        const transformedCode = code.replace(
          /require\(["']\.\/VirtualizedMatrixViewer\.scss["']\)/g,
          `{ default: { hoverTrackerSize: 5, 'av2-virtualized-matrix': 'av2-virtualized-matrix', 'scrolled-indicator': 'scrolled-indicator', 'av2-wheel-scroller': 'av2-wheel-scroller', 'hover-tracker-y': 'hover-tracker-y', 'hover-tracker-x': 'hover-tracker-x', 'triangle-up': 'triangle-up', 'triangle-down': 'triangle-down', 'triangle-left': 'triangle-left', 'triangle-right': 'triangle-right', 'av2-data': 'av2-data' } }`
        );
        if (transformedCode !== code) {
          console.log('Vite Plugin - Code was transformed!');
          return transformedCode;
        }
      }
    }
  };
};

export default defineConfig({
  plugins: [react(), virtualizedMatrixViewerPlugin()],

  define: {
    global: 'globalThis',
    'process.env': {},
    process: JSON.stringify({
      env: {},
      browser: true,
      version: '',
      versions: {}
    }),
  },

  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]___[hash:base64:5]'
    },
    preprocessorOptions: {
      scss: {
        additionalData: `$hoverTrackerSize: 5;`
      }
    }
  },

  server: {
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true,
    },
    proxy: {
      "/treedata": "http://localhost:5002",
      "/msa": "http://localhost:5002",
    },
  },
  optimizeDeps: {
    include: ["d3", "alignment-viewer-2"],
    force: true
  },
  build: {
    outDir: "../dist",
    rollupOptions: {
      input: {
        main: "index.html",
        vis: "vis.html",
      },
    },
  },
});

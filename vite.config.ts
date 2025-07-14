import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';



// Custom plugin to handle the problematic SCSS import and SVG assets
const virtualizedMatrixViewerPlugin = () => {
  return {
    name: 'virtualized-matrix-viewer-mock',
    resolveId(id, importer) {
      console.log('Vite Plugin - resolveId called with:', { id, importer });
      
      // Handle SCSS imports
      if (
        id === './VirtualizedMatrixViewer.scss' ||
        id.endsWith('VirtualizedMatrixViewer.scss') ||
        id.includes('VirtualizedMatrixViewer.scss')
      ) {
        console.log('Vite Plugin - Intercepting SCSS import:', id);
        return 'virtual:virtualized-matrix-viewer-scss';
      }
      if (importer && importer.includes('alignment-viewer-2') && id.includes('VirtualizedMatrixViewer.scss')) {
        console.log('Vite Plugin - Intercepting node_modules SCSS import:', id);
        return 'virtual:virtualized-matrix-viewer-scss';
      }

      // Handle SVG asset imports from AlignmentViewer 2.0
      if (importer && importer.includes('alignment-viewer-2') && id.endsWith('.svg')) {
        console.log('Vite Plugin - Intercepting SVG import from AlignmentViewer:', id);
        // Return a data URI for common icons
        if (id.includes('close.svg') || id === './close.svg') {
          return 'virtual:close-svg';
        }
        if (id.includes('search.svg') || id === './search.svg') {
          return 'virtual:search-svg';
        }
        if (id.includes('settings.svg') || id === './settings.svg') {
          return 'virtual:settings-svg';
        }
        // Generic fallback for other SVGs
        return 'virtual:generic-svg';
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
      
      // Handle virtual SVG assets
      if (id === 'virtual:close-svg') {
        return 'export default "data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\' fill=\'%23666\'%3E%3Cpath d=\'M3.293 3.293a1 1 0 011.414 0L8 6.586l3.293-3.293a1 1 0 111.414 1.414L9.414 8l3.293 3.293a1 1 0 01-1.414 1.414L8 9.414l-3.293 3.293a1 1 0 01-1.414-1.414L6.586 8 3.293 4.707a1 1 0 010-1.414z\'/%3E%3C/svg%3E"';
      }
      
      if (id === 'virtual:search-svg') {
        return 'export default "data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\' fill=\'%23666\'%3E%3Cpath d=\'M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z\'/%3E%3C/svg%3E"';
      }
      
      if (id === 'virtual:settings-svg') {
        return 'export default "data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\' fill=\'%23666\'%3E%3Cpath d=\'M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z\'/%3E%3Cpath d=\'M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z\'/%3E%3C/svg%3E"';
      }
      
      if (id === 'virtual:generic-svg') {
        return 'export default "data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 16 16\' fill=\'%23666\'%3E%3Cpath d=\'M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z\'/%3E%3C/svg%3E"';
      }
    },
    transform(code, id) {
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
  base: '/',
  plugins: [react(), virtualizedMatrixViewerPlugin()],
  resolve: {
    alias: [
      // Alias "../utils/globalThis" to our stub file.
      { find: "../utils/globalThis", replacement: path.resolve(__dirname, "src/stubs/globalThis.js") },
      // Alias for @juggle/resize-observer relative import of "./globalThis"
      { find: "@juggle/resize-observer/lib/utils/globalThis", replacement: path.resolve(__dirname, "src/stubs/globalThis.js") },
      // Alias for @juggle/resize-observer utils/global import (the actual issue)
      { find: "@juggle/resize-observer/lib/utils/global", replacement: path.resolve(__dirname, "src/stubs/globalThis.js") },
      // Alias for relative import "./globalThis" within modules (such as from scheduler.js)
      { find: /^\.\/globalThis$/, replacement: path.resolve(__dirname, "src/stubs/globalThis.js") },
      // (Removed VirtualizedMatrixViewer.scss alias; plugin handles mocking)
    ]
  },
  assetsInclude: [
    // Include AlignmentViewer 2.0 assets
    "**/*.svg",
    "**/node_modules/alignment-viewer-2/**/*.svg",
    "**/node_modules/alignment-viewer-2/**/*.png",
    "**/node_modules/alignment-viewer-2/**/*.ico"
  ],
  define: {
    global: 'globalThis',
    'process.env': {}
    // Removed full 'process' replacement to avoid interfering with libraries like FilePond
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
    watch: { usePolling: true },
    proxy: {
      "/treedata": "http://localhost:5002",
      "/msa": "http://localhost:5002",
      "/about": "http://localhost:5002"
    }
  },
  optimizeDeps: { include: ["d3", "alignment-viewer-2"], force: true },
  
  build: {
    outDir: "dist",
    rollupOptions: {
      input: { main: "index.html", visualization: "visualization.html" }
    }
  }
});

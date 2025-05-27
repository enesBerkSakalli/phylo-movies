import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // <-- 1. Import the 'path' module

export default defineConfig({
  plugins: [react()],

  // 2. Add the 'resolve.alias' configuration
  resolve: {
    alias: {
      // Update path to point to local copy instead of node_modules
      msaview: path.resolve(__dirname, 'react-msaview/lib/src'),
      'react-msaview': path.resolve(__dirname, 'react-msaview/lib/src'),
    },
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
    include: ["d3"],
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
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {}
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]___[hash:base64:5]'
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
  optimizeDeps: {
    include: ["d3", "winbox"]
  },

  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: "pages/home/index.html",
        visualization: "pages/visualization/index.html"
      }
    }
  }
});

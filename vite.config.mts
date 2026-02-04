import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Strip importmap blocks from built HTML (not during dev)
function stripImportMapsOnBuild() {
  return {
    name: 'strip-importmaps-on-build',
    apply: 'build' as const,
    transformIndexHtml(html: string) {
      return html.replace(/<script\s+type=["']importmap["'][\s\S]*?<\/script>\s*/gi, '');
    }
  };
}

// Serve publication_data folder as /examples during development
function servePublicationData() {
  return {
    name: 'serve-publication-data',
    configureServer(server: import('vite').ViteDevServer) {
      // Register middleware BEFORE Vite's built-in middleware (including SPA fallback)
      server.middlewares.use((req, res, next) => {
        if (req.url?.startsWith('/examples/')) {
          const relativePath = req.url.replace('/examples/', '');
          const filePath = path.join(__dirname, 'publication_data', relativePath);
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.setHeader('Content-Type', 'application/octet-stream');
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig(async (): Promise<UserConfig> => {
  // Use relative paths for Electron builds
  const isElectronBuild = process.env.ELECTRON_BUILD === 'true';

  return {
    root: 'src',
    publicDir: 'public',
    base: isElectronBuild ? './' : '/',
    plugins: [
      react(),
      stripImportMapsOnBuild(),
      tailwindcss(),
      servePublicationData()
    ],
    define: {
      global: 'globalThis',
      'process.env': {}
    },
    envPrefix: ['VITE_'],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
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
      watch: {
        ignored: ['**/electron-app/**', '**/node_modules/**', '**/data/**', '**/*.ova']
      },
      proxy: {
        "/treedata": "http://localhost:5002",
        "/stream": "http://localhost:5002",
        "/msa": "http://localhost:5002",
        "/about": "http://localhost:5002"
      },
      // Allow serving files from publication_data
      fs: {
        allow: ['..']
      }
    },
    optimizeDeps: {
      include: ["d3", "winbox", "winbox/src/js/winbox.js"]
    },
    build: {
      outDir: "../dist",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'src/index.html'),
          splash: path.resolve(__dirname, 'src/splash.html')
        }
      }
    }
  };
});

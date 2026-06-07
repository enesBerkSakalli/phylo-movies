import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import fs from 'node:fs';
import { stat } from 'node:fs/promises';
import { visualizer } from 'rollup-plugin-visualizer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicationDataRoot = path.resolve(__dirname, 'publication_data');

export function resolvePublicationDataPath(
  requestUrl: string | undefined,
  baseDir = publicationDataRoot
): string | null {
  if (!requestUrl?.startsWith('/examples/')) return null;

  let pathname: string;
  try {
    pathname = new URL(requestUrl, 'http://localhost').pathname;
  } catch {
    return null;
  }

  if (!pathname.startsWith('/examples/')) return null;

  let relativePath: string;
  try {
    relativePath = decodeURIComponent(pathname.slice('/examples/'.length));
  } catch {
    return null;
  }

  const filePath = path.resolve(baseDir, relativePath);
  const relativeToBase = path.relative(baseDir, filePath);
  if (relativeToBase.startsWith('..') || path.isAbsolute(relativeToBase)) return null;
  return filePath;
}

// Strip importmap blocks from built HTML (not during dev)
function stripImportMapsOnBuild() {
  return {
    name: 'strip-importmaps-on-build',
    apply: 'build' as const,
    transformIndexHtml(html: string) {
      return html.replace(/<script\s+type=["']importmap["'][\s\S]*?<\/script>\s*/gi, '');
    },
  };
}

// Serve publication_data folder as /examples during development
function servePublicationData() {
  return {
    name: 'serve-publication-data',
    configureServer(server: import('vite').ViteDevServer) {
      // Register middleware BEFORE Vite's built-in middleware (including SPA fallback)
      server.middlewares.use(async (req, res, next) => {
        const isExamplesRequest = req.url?.startsWith('/examples/');
        const filePath = resolvePublicationDataPath(req.url);
        if (!filePath) {
          if (isExamplesRequest) {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }
          next();
          return;
        }

        try {
          const fileStats = await stat(filePath);
          if (!fileStats.isFile()) {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }

          res.setHeader('Content-Type', 'application/octet-stream');
          fs.createReadStream(filePath).on('error', next).pipe(res);
        } catch {
          res.statusCode = 404;
          res.end('Not found');
        }
      });
    },
  };
}

export default defineConfig(async (): Promise<UserConfig> => {
  // Use relative paths for Electron builds
  const isElectronBuild = process.env.ELECTRON_BUILD === 'true';
  const shouldAnalyzeBundle = process.env.BUNDLE_ANALYZE === 'true';
  const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));

  return {
    root: 'src',
    publicDir: 'public',
    base: isElectronBuild ? './' : '/',
    plugins: [
      react(),
      stripImportMapsOnBuild(),
      tailwindcss(),
      servePublicationData(),
      shouldAnalyzeBundle &&
        visualizer({
          filename: path.resolve(__dirname, 'dist/bundle-stats.html'),
          template: 'treemap',
          gzipSize: true,
          brotliSize: true,
        }),
    ],
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
    },
    envPrefix: ['VITE_'],
    resolve: {
      alias: [
        {
          find: /^wgsl_reflect$/,
          replacement: path.resolve(__dirname, 'node_modules/wgsl_reflect/wgsl_reflect.module.js'),
        },
      ],
    },
    css: {
      modules: {
        localsConvention: 'camelCase',
        generateScopedName: '[name]__[local]___[hash:base64:5]',
      },
    },
    server: {
      host: '127.0.0.1', // Explicit IPv4 binding
      port: 5173,
      strictPort: true,
      hmr: { host: '127.0.0.1' }, // Force HMR WebSocket to same IPv4.
      watch: {
        ignored: [
          '**/electron-app/**',
          '**/node_modules/**',
          path.join(__dirname, 'data/**'),
          path.join(__dirname, 'test/data/**'),
          '**/*.ova',
        ],
      },
      proxy: {
        '/treedata': 'http://127.0.0.1:5002',
        '/stream': 'http://127.0.0.1:5002',
        '^/msa(?:/|$)': 'http://127.0.0.1:5002',
        '/health': 'http://127.0.0.1:5002',
        '/about': 'http://127.0.0.1:5002',
      },
      // Allow serving files from publication_data
      fs: {
        allow: ['..'],
      },
    },
    optimizeDeps: {
      include: ['d3-hierarchy', 'd3-scale-chromatic'],
    },
    build: {
      modulePreload: false,
      outDir: '../dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'src/index.html'),
          splash: path.resolve(__dirname, 'src/pages/Splash/splash.html'),
        },
      },
    },
  };
});

import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';

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

export default defineConfig(async (): Promise<UserConfig> => {
  // Use relative paths for Electron builds
  const isElectronBuild = process.env.ELECTRON_BUILD === 'true';

  return {
    root: 'src',
    base: isElectronBuild ? './' : '/',
    plugins: [
      react(),
      stripImportMapsOnBuild(),
      tailwindcss()
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

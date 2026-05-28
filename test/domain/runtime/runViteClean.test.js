import { describe, expect, it } from 'vitest';
import {
  formatBackendUnavailableWarning,
  resolveViteArgs,
  sanitizeNodeRuntimeEnv,
  shouldCheckBackendHealth,
  stripConsoleNinjaHooks,
} from '../../../scripts/run-vite-clean.mjs';

describe('clean Vite runtime wrapper', () => {
  it('strips Console Ninja build hooks from a patched Vite CLI source', () => {
    const source = [
      '#!/usr/bin/env node',
      "/* build-hook-start */try { require('/tmp/wallabyjs.console-ninja/out/buildHook/index.js') } catch {}/* build-hook-end */",
      "import { performance } from 'node:perf_hooks'",
      'global.__vite_start_time = performance.now()',
    ].join('\n');

    const cleaned = stripConsoleNinjaHooks(source);

    expect(cleaned).not.toContain('build-hook-start');
    expect(cleaned).not.toContain('console-ninja');
    expect(cleaned).toContain("import { performance } from 'node:perf_hooks'");
  });

  it('removes Console Ninja and Wallaby environment hooks before launching Vite', () => {
    const cleanEnv = sanitizeNodeRuntimeEnv({
      PATH: ['/usr/local/bin', '/Users/me/.console-ninja/.bin', '/usr/bin'].join(':'),
      NODE_OPTIONS: '--require /Users/me/.console-ninja/.bin/loader.js',
      CONSOLE_NINJA_SESSION: 'active',
      WALLABY_PRODUCTION: 'true',
      SAFE_ENV: 'kept',
    });

    expect(cleanEnv.PATH).toBe('/usr/local/bin:/usr/bin');
    expect(cleanEnv.NODE_OPTIONS).toBeUndefined();
    expect(cleanEnv.CONSOLE_NINJA_SESSION).toBeUndefined();
    expect(cleanEnv.WALLABY_PRODUCTION).toBeUndefined();
    expect(cleanEnv.SAFE_ENV).toBe('kept');
  });

  it('defaults bare npm run dev to IPv4 localhost', () => {
    expect(resolveViteArgs([])).toEqual(['--host', '127.0.0.1']);
    expect(resolveViteArgs(['preview'])).toEqual(['preview']);
  });

  it('checks backend health for frontend dev-server runs only', () => {
    expect(shouldCheckBackendHealth(resolveViteArgs([]))).toBe(true);
    expect(shouldCheckBackendHealth(['--port', '5173'])).toBe(true);
    expect(shouldCheckBackendHealth(['build'])).toBe(false);
    expect(shouldCheckBackendHealth(['preview'])).toBe(false);
  });

  it('explains that npm run dev is frontend-only when the backend is unavailable', () => {
    const warning = formatBackendUnavailableWarning('http://127.0.0.1:5002/health');

    expect(warning).toContain('npm run dev starts the Vite frontend only');
    expect(warning).toContain('./start.sh');
    expect(warning).toContain('start_movie_server.sh');
  });
});

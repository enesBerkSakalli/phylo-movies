#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { delimiter } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { get } from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const viteCliPath = resolve(projectRoot, 'node_modules/vite/bin/vite.js');

const CONSOLE_NINJA_HOOK_PATTERN = /\/\* build-hook-start \*\/[\s\S]*?\/\* build-hook-end \*\/\s*/g;
const CONSOLE_NINJA_ENV_PATTERN = /(console[-_]?ninja|wallaby)/i;
const DEFAULT_BACKEND_HEALTH_URL = 'http://127.0.0.1:5002/about';
const DEFAULT_BACKEND_HEALTH_TIMEOUT_MS = 750;

export function stripConsoleNinjaHooks(source) {
  return source.replace(CONSOLE_NINJA_HOOK_PATTERN, '');
}

export function sanitizeNodeRuntimeEnv(env = process.env) {
  const cleanEnv = { ...env };

  for (const key of Object.keys(cleanEnv)) {
    if (CONSOLE_NINJA_ENV_PATTERN.test(key)) {
      delete cleanEnv[key];
    }
  }

  if (CONSOLE_NINJA_ENV_PATTERN.test(cleanEnv.NODE_OPTIONS || '')) {
    delete cleanEnv.NODE_OPTIONS;
  }

  if (cleanEnv.PATH) {
    cleanEnv.PATH = cleanEnv.PATH.split(delimiter)
      .filter((entry) => !CONSOLE_NINJA_ENV_PATTERN.test(entry))
      .join(delimiter);
  }

  return cleanEnv;
}

export function removePatchedViteHook(vitePath = viteCliPath) {
  const original = readFileSync(vitePath, 'utf8');
  const cleaned = stripConsoleNinjaHooks(original);

  if (cleaned !== original) {
    writeFileSync(vitePath, cleaned);
    return true;
  }

  return false;
}

export function resolveViteArgs(args) {
  return args.length > 0 ? args : ['--host', '127.0.0.1'];
}

export function shouldCheckBackendHealth(viteArgs) {
  return !viteArgs.some(
    (arg) =>
      arg === 'build' ||
      arg === 'preview' ||
      arg === '--help' ||
      arg === '-h' ||
      arg === '--version' ||
      arg === '-v'
  );
}

export function formatBackendUnavailableWarning(healthUrl = DEFAULT_BACKEND_HEALTH_URL) {
  return [
    `[backend] WARNING: BranchArchitect backend is not reachable at ${healthUrl}.`,
    '[backend] npm run dev starts the Vite frontend only.',
    '[backend] Loading examples, processing uploaded trees, interpolation, and MSA-derived tree inference need the backend.',
    '[backend] Start it with ./start.sh, or run:',
    '[backend]   cd engine/BranchArchitect && ./start_movie_server.sh',
  ].join('\n');
}

export function checkBackendHealth(
  healthUrl = DEFAULT_BACKEND_HEALTH_URL,
  timeoutMs = DEFAULT_BACKEND_HEALTH_TIMEOUT_MS
) {
  return new Promise((resolveHealth) => {
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      resolveHealth(value);
    };

    const request = get(healthUrl, (response) => {
      response.resume();
      settle(response.statusCode >= 200 && response.statusCode < 300);
    });

    request.on('error', () => settle(false));
    request.setTimeout(timeoutMs, () => {
      request.destroy();
      settle(false);
    });
  });
}

async function run() {
  const removedHook = removePatchedViteHook();
  if (removedHook) {
    console.warn('[vite-clean] Removed Console Ninja hook from node_modules/vite/bin/vite.js');
  }

  const viteArgs = resolveViteArgs(process.argv.slice(2));
  if (shouldCheckBackendHealth(viteArgs)) {
    const backendHealthy = await checkBackendHealth();
    if (!backendHealthy) {
      console.warn(formatBackendUnavailableWarning());
    }
  }

  const child = spawn(process.execPath, [viteCliPath, ...viteArgs], {
    cwd: projectRoot,
    env: sanitizeNodeRuntimeEnv(),
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error('[vite-clean] Failed to start Vite:', error);
    process.exit(1);
  });
}

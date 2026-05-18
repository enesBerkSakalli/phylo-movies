#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { delimiter } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const viteCliPath = resolve(projectRoot, 'node_modules/vite/bin/vite.js');

const CONSOLE_NINJA_HOOK_PATTERN = /\/\* build-hook-start \*\/[\s\S]*?\/\* build-hook-end \*\/\s*/g;
const CONSOLE_NINJA_ENV_PATTERN = /(console[-_]?ninja|wallaby)/i;

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
    cleanEnv.PATH = cleanEnv.PATH
      .split(delimiter)
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

function run() {
  const removedHook = removePatchedViteHook();
  if (removedHook) {
    console.warn('[vite-clean] Removed Console Ninja hook from node_modules/vite/bin/vite.js');
  }

  const viteArgs = resolveViteArgs(process.argv.slice(2));
  const child = spawn(process.execPath, [viteCliPath, ...viteArgs], {
    cwd: projectRoot,
    env: sanitizeNodeRuntimeEnv(),
    stdio: 'inherit'
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
  run();
}

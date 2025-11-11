#!/usr/bin/env node
/**
 * Quick store usage linter
 * - Parses keys from src/js/core/store.js (state + actions)
 * - Searches repo for usages via useAppStore selector or getState().key
 * - Prints potentially unused keys
 *
 * This is heuristic and string-based; treat results as hints.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const STORE_PATH = path.join(ROOT, 'src/js/core/store.js');
const SEARCH_DIRS = [
  path.join(ROOT, 'src/js'),
  path.join(ROOT, 'src/react'),
];

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

function listFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let ents = [];
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const ent of ents) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) {
        stack.push(full);
      } else if (/[.](js|jsx|ts|tsx)$/.test(ent.name)) {
        // Exclude the store definition itself from usage search
        if (path.resolve(full) !== path.resolve(STORE_PATH)) out.push(full);
      }
    }
  }
  return out;
}

function extractStoreKeys(storeSrc) {
  const startIdx = storeSrc.indexOf('export const useAppStore = create((set, get) => ({');
  if (startIdx === -1) throw new Error('Could not locate useAppStore definition');
  // Extract from start to the end of create({...}))
  const tail = storeSrc.slice(startIdx);
  // Find the first '{' after the arrow
  const firstBrace = tail.indexOf('{');
  if (firstBrace === -1) throw new Error('Could not find opening { of store object');
  let depth = 0;
  let endPos = -1;
  for (let i = firstBrace; i < tail.length; i++) {
    const ch = tail[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { endPos = i; break; }
    }
  }
  if (endPos === -1) throw new Error('Could not find closing } of store object');
  const objSrc = tail.slice(firstBrace + 1, endPos); // inside {...}

  const keys = [];
  const lines = objSrc.split(/\r?\n/);
  let braceDepth = 1; // relative to start of object; we’re inside already
  for (const rawLine of lines) {
    const line = rawLine.trim();
    // Update depth using naive brace counting (good enough for lint)
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    // Capture keys when at top-level of store object (braceDepth == 1 before applying current line closes)
    if (braceDepth === 1) {
      const m = line.match(/^([a-zA-Z_][\w]*)\s*:\s*/);
      if (m) {
        const name = m[1];
        keys.push(name);
      }
    }
    braceDepth += opens - closes;
  }
  return Array.from(new Set(keys));
}

function fileContainsUsage(src, key) {
  // Look for common patterns:
  // 1) useAppStore((s) => s.key) or (state) => state.key
  const reSelector = new RegExp(`useAppStore\\\([^)]*=>[^\n;]*\\b(?:s|state)\\.${key}\\b`);
  // 2) useAppStore.getState().key or getState().key
  const reGetState = new RegExp(`getState\\\(\\\)\\.${key}\\b`);
  // 2b) Destructuring from getState(): const { key } = useAppStore.getState();
  const reDestructure = new RegExp(`\\{[^}]*\\b${key}\\b[^}]*\\}\\s*=\\s*useAppStore\\s*\\.\\s*getState\\s*\\(\\s*\\)`);
  // 3) Direct dot usage in a line with useAppStore (looser fallback)
  const reLoose = new RegExp(`useAppStore[^\n]*\\.${key}\\b`);
  // 3b) useAppStore.subscribe((state) => ({ key: state.key })) or selector accessing state.key
  const reSubscribe = new RegExp(`useAppStore\\s*\\.\\s*subscribe\\s*\\(\\s*\\(\\s*(?:s|state)\\s*\\)\\s*=>[^{]*\\{[^}]*\\b${key}\\b[^}]*\\}`);

  // 4) Detect variable assigned from getState() and dot usage: const st = useAppStore.getState(); ... st.key
  const stateVarRegex = /const\s+([A-Za-z_$][\w$]*)\s*=\s*useAppStore\s*\.\s*getState\s*\(\s*\)/g;
  let m;
  let stateVarUsed = false;
  while ((m = stateVarRegex.exec(src)) !== null) {
    const v = m[1];
    const reVarDot = new RegExp(`\\b${v}\\.${key}\\b`);
    if (reVarDot.test(src)) { stateVarUsed = true; break; }
  }

  return reSelector.test(src) || reGetState.test(src) || reDestructure.test(src) || reLoose.test(src) || reSubscribe.test(src) || stateVarUsed;
}

function main() {
  const storeSrc = readFile(STORE_PATH);
  const keys = extractStoreKeys(storeSrc);
  const files = SEARCH_DIRS.flatMap(listFiles);

  const unused = [];
  for (const key of keys) {
    let used = false;
    for (const f of files) {
      const src = readFile(f);
      if (fileContainsUsage(src, key)) { used = true; break; }
    }
    if (!used) unused.push(key);
  }

  if (unused.length) {
    console.log('Possibly unused store keys/actions:');
    for (const k of unused) console.log(' -', k);
    process.exitCode = 1;
  } else {
    console.log('All store keys/actions appear to be used.');
  }
}

try { main(); } catch (e) {
  console.error('[check-store-usage] Failed:', e.message);
  process.exit(2);
}

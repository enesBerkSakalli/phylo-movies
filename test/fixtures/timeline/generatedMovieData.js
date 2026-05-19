import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

export const smallExampleMovieData = readJson(
  'test/data/small_example/small_example.response.json'
);

export const ostrichBugMovieData = readJson('test/data/ostrich_bug_response.json');

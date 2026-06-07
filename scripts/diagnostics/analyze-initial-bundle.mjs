import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const distAssetsDir = path.resolve(process.cwd(), 'dist/assets');

function formatKilobytes(bytes) {
  return `${(bytes / 1000).toFixed(2)} kB`;
}

function readAsset(fileName) {
  return fs.readFileSync(path.join(distAssetsDir, fileName));
}

function gzipSize(buffer) {
  return zlib.gzipSync(buffer).length;
}

function findMainChunk() {
  const mainChunk = fs
    .readdirSync(distAssetsDir)
    .find((fileName) => /^main-.*\.js$/.test(fileName));

  if (!mainChunk) {
    throw new Error(`Could not find main chunk in ${distAssetsDir}`);
  }

  return mainChunk;
}

function getStaticImports(fileName) {
  const code = readAsset(fileName).toString('utf8');
  const imports = [];
  const staticImportPattern = /import[^;]*?from["']\.\/([^"']+\.js)["']/g;
  let match;

  while ((match = staticImportPattern.exec(code))) {
    imports.push(match[1]);
  }

  return imports;
}

function walkStaticGraph(entryFileName, seen = new Set()) {
  if (seen.has(entryFileName)) return seen;

  seen.add(entryFileName);

  for (const importedFileName of getStaticImports(entryFileName)) {
    walkStaticGraph(importedFileName, seen);
  }

  return seen;
}

function summarize(files) {
  return files.map((fileName) => {
    const buffer = readAsset(fileName);
    return {
      fileName,
      bytes: buffer.length,
      gzipBytes: gzipSize(buffer),
    };
  });
}

function printRows(label, rows) {
  let totalBytes = 0;
  let totalGzipBytes = 0;

  console.log(label);
  for (const row of rows) {
    totalBytes += row.bytes;
    totalGzipBytes += row.gzipBytes;
    console.log(
      `${row.fileName}\t${formatKilobytes(row.bytes)}\t${formatKilobytes(row.gzipBytes)} gzip`
    );
  }

  console.log(
    `TOTAL\t${formatKilobytes(totalBytes)}\t${formatKilobytes(totalGzipBytes)} gzip`
  );
}

const mainChunk = findMainChunk();
const initialGraph = [...walkStaticGraph(mainChunk)].sort();
const allJs = fs
  .readdirSync(distAssetsDir)
  .filter((fileName) => fileName.endsWith('.js'))
  .sort();

printRows('Initial static import graph', summarize(initialGraph));
console.log('');
printRows('All emitted JS assets', summarize(allJs));

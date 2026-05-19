import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'assets', 'brand', 'generated-icons-manifest.json');

const expectedPngSizes = new Map([
  ['src/public/icons/favicon-16.png', 16],
  ['src/public/icons/favicon-32.png', 32],
  ['src/public/icons/apple-touch-icon.png', 180],
  ['src/public/icons/icon-192.png', 192],
  ['src/public/icons/icon-512.png', 512],
  ['electron-app/build/icon.png', 512],
  ['electron-app/build/icon_16.png', 16],
  ['electron-app/build/icon.iconset/icon_16x16.png', 16],
  ['electron-app/build/icon.iconset/icon_16x16@2x.png', 32],
  ['electron-app/build/icon.iconset/icon_32x32.png', 32],
  ['electron-app/build/icon.iconset/icon_32x32@2x.png', 64],
  ['electron-app/build/icon.iconset/icon_128x128.png', 128],
  ['electron-app/build/icon.iconset/icon_128x128@2x.png', 256],
  ['electron-app/build/icon.iconset/icon_256x256.png', 256],
  ['electron-app/build/icon.iconset/icon_256x256@2x.png', 512],
  ['electron-app/build/icon.iconset/icon_512x512.png', 512],
  ['electron-app/build/icon.iconset/icon_512x512@2x.png', 1024],
]);

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

async function assertExists(relativePath) {
  await fs.access(path.join(root, relativePath));
}

async function assertPngSize(relativePath, expectedSize) {
  const metadata = await sharp(path.join(root, relativePath)).metadata();
  if (metadata.width !== expectedSize || metadata.height !== expectedSize) {
    throw new Error(
      `${relativePath} expected ${expectedSize}x${expectedSize}, got ${metadata.width}x${metadata.height}`,
    );
  }
}

async function main() {
  const manifest = await readJson(manifestPath);
  const sourcePath = path.join(root, manifest.source);
  const sourceBuffer = await fs.readFile(sourcePath);
  const sourceHash = crypto.createHash('sha256').update(sourceBuffer).digest('hex');

  if (manifest.source_sha256 !== sourceHash) {
    throw new Error(
      `Brand manifest source hash is stale. Run npm run generate:brand.`,
    );
  }

  for (const output of manifest.generated_outputs) {
    await assertExists(output);
  }

  for (const [relativePath, expectedSize] of expectedPngSizes) {
    await assertPngSize(relativePath, expectedSize);
  }

  await assertExists('src/public/icons/phylo-tree-icon.svg');
  await assertExists('electron-app/build/icon.ico');
  await assertExists('electron-app/build/icon.icns');

  console.log('Brand assets verified.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

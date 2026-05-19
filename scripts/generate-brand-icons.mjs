import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const execFile = promisify(execFileCallback);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const sourceSvg = path.join(root, 'assets', 'brand', 'phylo-movies-mark.svg');
const webIconDir = path.join(root, 'src', 'public', 'icons');
const electronBuildDir = path.join(root, 'electron-app', 'build');
const iconsetDir = path.join(electronBuildDir, 'icon.iconset');
const manifestPath = path.join(root, 'assets', 'brand', 'generated-icons-manifest.json');

const webPngOutputs = [
  { file: path.join(webIconDir, 'favicon-16.png'), size: 16 },
  { file: path.join(webIconDir, 'favicon-32.png'), size: 32 },
  { file: path.join(webIconDir, 'apple-touch-icon.png'), size: 180 },
  { file: path.join(webIconDir, 'icon-192.png'), size: 192 },
  { file: path.join(webIconDir, 'icon-512.png'), size: 512 },
];

const electronPngOutputs = [
  { file: path.join(electronBuildDir, 'icon.png'), size: 512 },
  { file: path.join(electronBuildDir, 'icon_16.png'), size: 16 },
];

const iconsetOutputs = [
  { name: 'icon_16x16.png', size: 16 },
  { name: 'icon_16x16@2x.png', size: 32 },
  { name: 'icon_32x32.png', size: 32 },
  { name: 'icon_32x32@2x.png', size: 64 },
  { name: 'icon_128x128.png', size: 128 },
  { name: 'icon_128x128@2x.png', size: 256 },
  { name: 'icon_256x256.png', size: 256 },
  { name: 'icon_256x256@2x.png', size: 512 },
  { name: 'icon_512x512.png', size: 512 },
  { name: 'icon_512x512@2x.png', size: 1024 },
].map((item) => ({ ...item, file: path.join(iconsetDir, item.name) }));

const icoSizes = [16, 32, 48, 64, 128, 256];

async function ensureDirs() {
  await fs.mkdir(webIconDir, { recursive: true });
  await fs.mkdir(electronBuildDir, { recursive: true });
  await fs.mkdir(iconsetDir, { recursive: true });
}

async function renderPng(svgBuffer, output) {
  await sharp(svgBuffer)
    .resize(output.size, output.size, { fit: 'contain' })
    .png()
    .toFile(output.file);
}

async function generateIco(svgBuffer) {
  const tmpDir = path.join(root, 'node_modules', '.cache', 'phylo-movies-brand');
  await fs.rm(tmpDir, { recursive: true, force: true });
  await fs.mkdir(tmpDir, { recursive: true });

  const pngFiles = [];
  for (const size of icoSizes) {
    const file = path.join(tmpDir, `icon-${size}.png`);
    await renderPng(svgBuffer, { file, size });
    pngFiles.push(file);
  }

  const icoBuffer = await pngToIco(pngFiles);
  await fs.writeFile(path.join(electronBuildDir, 'icon.ico'), icoBuffer);
  await fs.rm(tmpDir, { recursive: true, force: true });
}

async function generateIcns() {
  if (process.platform !== 'darwin') {
    console.warn('Skipping icon.icns generation: iconutil is available only on macOS.');
    return;
  }

  await execFile('iconutil', [
    '-c',
    'icns',
    iconsetDir,
    '-o',
    path.join(electronBuildDir, 'icon.icns'),
  ]);
}

function relative(file) {
  return path.relative(root, file);
}

async function writeManifest(svgBuffer) {
  const outputs = [
    path.join(webIconDir, 'phylo-tree-icon.svg'),
    ...webPngOutputs.map((item) => item.file),
    ...electronPngOutputs.map((item) => item.file),
    ...iconsetOutputs.map((item) => item.file),
    path.join(electronBuildDir, 'icon.ico'),
    path.join(electronBuildDir, 'icon.icns'),
  ];

  const manifest = {
    source: relative(sourceSvg),
    source_sha256: crypto.createHash('sha256').update(svgBuffer).digest('hex'),
    generated_outputs: outputs.map(relative).sort(),
    generator: relative(fileURLToPath(import.meta.url)),
  };

  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function main() {
  const svgBuffer = await fs.readFile(sourceSvg);
  await ensureDirs();

  await fs.copyFile(sourceSvg, path.join(webIconDir, 'phylo-tree-icon.svg'));

  for (const output of [...webPngOutputs, ...electronPngOutputs, ...iconsetOutputs]) {
    await renderPng(svgBuffer, output);
  }

  await generateIco(svgBuffer);
  await generateIcns();
  await writeManifest(svgBuffer);

  if (!existsSync(path.join(electronBuildDir, 'icon.icns')) && process.platform === 'darwin') {
    throw new Error('Expected icon.icns to be generated.');
  }

  console.log('Generated Phylo-Movies brand icons.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

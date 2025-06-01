import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// Create a mock browser environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
});

// Define browser globals
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;

// Mock localStorage
global.localStorage = {
  items: {},
  getItem(key) { return this.items[key]; },
  setItem(key, value) { this.items[key] = value; },
  removeItem(key) { delete this.items[key]; },
  clear() { this.items = {}; }
};

// Create test data directory if it doesn't exist
const testDataDir = path.join(__dirname, 'test_data');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

// Copy test files if they don't exist in the test_data directory
const sourceFiles = {
  fasta: path.join(__dirname, '../BranchArchitect/notebooks/data/alltrees_treees_cutted/alltrees.fasta'),
  newick: path.join(__dirname, '../test/test_data/alltrees.trees_cutted.newick')
};

for (const [type, sourcePath] of Object.entries(sourceFiles)) {
  if (fs.existsSync(sourcePath)) {
    const targetPath = path.join(testDataDir, path.basename(sourcePath));
    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`Copied ${type} test file to test_data directory`);
    }
  } else {
    console.warn(`Source ${type} file not found: ${sourcePath}`);
  }
}

// Global test setup
before(() => {
  console.log('Test environment setup complete');
});

// Global test teardown
after(() => {
  console.log('Test environment teardown complete');
});

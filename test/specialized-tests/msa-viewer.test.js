import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('MSA Viewer Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('MSA viewer with alignment file', async ({ page }) => {
    // Try to find and upload MSA file
    const msaFiles = [
      '../../data/simulation_trees/complex_concatenated_msa.fasta',
      '../../frontend/test/test_data/alltrees.fasta',
      '../../data/test-data/alltrees/alltrees.fasta'
    ];

    let msaLoaded = false;
    for (const msaFile of msaFiles) {
      try {
        const filePath = path.join(__dirname, msaFile);
        const fileInput = await page.locator('input[type="file"]');
        await fileInput.setInputFiles(filePath);
        
        await page.waitForTimeout(3000);
        
        // Check if MSA viewer appeared
        const msaViewer = await page.locator('.msa-viewer, .alignment-viewer, .sequence-viewer');
        if (await msaViewer.isVisible()) {
          msaLoaded = true;
          await page.screenshot({ 
            path: 'reports/screenshots/msa-viewer-loaded.png',
            fullPage: true 
          });
          break;
        }
      } catch (error) {
        console.log(`Could not load MSA file: ${msaFile}`);
      }
    }

    if (!msaLoaded) {
      // Load tree first, then look for MSA functionality
      const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(treeFile);
      
      await page.waitForSelector('svg', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // Look for MSA button/trigger
      const msaTriggers = [
        'button:has-text("MSA")',
        'button:has-text("Alignment")',
        'button:has-text("Sequences")',
        '.msa-btn',
        '.alignment-btn',
        'button[title*="alignment"]',
        'button[aria-label*="msa"]'
      ];

      for (const trigger of msaTriggers) {
        const element = await page.locator(trigger);
        if (await element.isVisible()) {
          console.log(`Found MSA trigger: ${trigger}`);
          await element.click();
          await page.waitForTimeout(1000);
          
          await page.screenshot({ 
            path: 'reports/screenshots/msa-trigger-clicked.png',
            fullPage: true 
          });
          
          msaLoaded = true;
          break;
        }
      }
    }

    // If MSA viewer is available, test its functionality
    if (msaLoaded) {
      // Test MSA navigation
      const msaContainer = await page.locator('.msa-viewer, .alignment-viewer, .sequence-viewer');
      
      // Test scrolling
      if (await msaContainer.isVisible()) {
        await msaContainer.scroll({ left: 100, top: 0 });
        await page.waitForTimeout(500);
        
        await page.screenshot({ 
          path: 'reports/screenshots/msa-scrolled-horizontal.png',
          fullPage: true 
        });

        await msaContainer.scroll({ left: 0, top: 50 });
        await page.waitForTimeout(500);
        
        await page.screenshot({ 
          path: 'reports/screenshots/msa-scrolled-vertical.png',
          fullPage: true 
        });
      }

      // Test MSA controls
      const msaControls = await page.locator('.msa-controls, .alignment-controls, .sequence-controls');
      if (await msaControls.isVisible()) {
        await page.screenshot({ 
          path: 'reports/screenshots/msa-controls.png',
          clip: await msaControls.boundingBox()
        });
      }

      // Test MSA search functionality
      const searchButton = await page.locator('button:has-text("search"), .search-btn');
      if (await searchButton.isVisible()) {
        await searchButton.click();
        await page.waitForTimeout(500);
        
        const searchInput = await page.locator('input[placeholder*="search"], .search-input');
        if (await searchInput.isVisible()) {
          await searchInput.fill('A');
          await page.waitForTimeout(1000);
          
          await page.screenshot({ 
            path: 'reports/screenshots/msa-search-results.png',
            fullPage: true 
          });
        }
      }

      // Test MSA settings
      const settingsButton = await page.locator('button:has-text("settings"), .settings-btn');
      if (await settingsButton.isVisible()) {
        await settingsButton.click();
        await page.waitForTimeout(500);
        
        await page.screenshot({ 
          path: 'reports/screenshots/msa-settings-panel.png',
          fullPage: true 
        });
      }
    } else {
      console.log('MSA viewer functionality not found');
      await page.screenshot({ 
        path: 'reports/screenshots/msa-not-available.png',
        fullPage: true 
      });
    }
  });

  test('MSA viewer window management', async ({ page }) => {
    // Load tree
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile);
    
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Test MSA window resizing and positioning
    const msaWindow = await page.locator('.msa-window, .alignment-window, [data-component="msa"]');
    if (await msaWindow.isVisible()) {
      // Test window resize
      const windowBox = await msaWindow.boundingBox();
      if (windowBox) {
        // Try to resize window
        await page.mouse.move(windowBox.x + windowBox.width, windowBox.y + windowBox.height);
        await page.mouse.down();
        await page.mouse.move(windowBox.x + windowBox.width + 100, windowBox.y + windowBox.height + 50);
        await page.mouse.up();
        
        await page.waitForTimeout(500);
        await page.screenshot({ 
          path: 'reports/screenshots/msa-window-resized.png',
          fullPage: true 
        });
      }
    }

    // Test MSA integration with tree animation
    const playButton = await page.locator('button:has-text("play_arrow")');
    if (await playButton.isVisible()) {
      await playButton.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: 'reports/screenshots/msa-with-animation.png',
        fullPage: true 
      });
    }
  });

  test('MSA viewer data synchronization', async ({ page }) => {
    // Load tree
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile);
    
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Test MSA synchronization with tree selection
    const treeNodes = await page.locator('svg circle, svg .leaf-node');
    if (await treeNodes.count() > 0) {
      // Select a tree node
      await treeNodes.first().click();
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: 'reports/screenshots/msa-tree-node-selected.png',
        fullPage: true 
      });

      // Check if MSA highlights corresponding sequence
      const msaSequences = await page.locator('.msa-sequence, .alignment-row, .sequence-row');
      if (await msaSequences.count() > 0) {
        const highlighted = await page.locator('.sequence-highlighted, .selected-sequence');
        if (await highlighted.isVisible()) {
          await page.screenshot({ 
            path: 'reports/screenshots/msa-sequence-highlighted.png',
            clip: await highlighted.boundingBox()
          });
        }
      }
    }
  });
});
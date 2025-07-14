import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Animation Workflow Tests - Fixed', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('interface discovery and tree loading', async ({ page }) => {
    // Screenshot initial interface
    await page.screenshot({ 
      path: '../../reports/screenshots/interface-initial.png',
      fullPage: true 
    });

    // Find the Tree File input specifically
    const treeFileSection = await page.locator('text=Tree File').locator('..').locator('input[type="file"]').first();
    
    // Upload tree file
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    await treeFileSection.setInputFiles(treeFile);
    
    // Wait for tree to load
    await page.waitForSelector('svg', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    // Screenshot with tree loaded
    await page.screenshot({ 
      path: '../../reports/screenshots/tree-loaded.png',
      fullPage: true 
    });

    // Count tree elements
    const nodes = await page.locator('svg circle, svg .node');
    const nodeCount = await nodes.count();
    console.log(`Tree loaded with ${nodeCount} nodes`);

    // Look for animation controls
    const playButton = await page.locator('button:has-text("play_arrow"), [aria-label*="play"], .play-btn');
    const pauseButton = await page.locator('button:has-text("pause"), [aria-label*="pause"], .pause-btn');
    const controlsPanel = await page.locator('.controls, .control-panel, .movie-player-bar');

    console.log('Animation controls found:');
    console.log('- Play button:', await playButton.isVisible());
    console.log('- Pause button:', await pauseButton.isVisible());
    console.log('- Controls panel:', await controlsPanel.isVisible());

    if (await playButton.isVisible()) {
      await playButton.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: '../../reports/screenshots/animation-playing.png',
        fullPage: true 
      });

      if (await pauseButton.isVisible()) {
        await pauseButton.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: '../../reports/screenshots/animation-paused.png',
          fullPage: true 
        });
      }
    }
  });

  test('control interface analysis', async ({ page }) => {
    // Load tree first
    const treeFileSection = await page.locator('text=Tree File').locator('..').locator('input[type="file"]').first();
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    await treeFileSection.setInputFiles(treeFile);
    
    await page.waitForSelector('svg', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Document all visible buttons and controls
    const allButtons = await page.locator('button');
    const buttonCount = await allButtons.count();
    
    console.log(`Found ${buttonCount} buttons on the page:`);
    
    for (let i = 0; i < Math.min(buttonCount, 20); i++) {
      const button = allButtons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const isVisible = await button.isVisible();
      
      console.log(`Button ${i}: "${text}" (aria-label: "${ariaLabel}") - visible: ${isVisible}`);
    }

    // Screenshot all controls
    await page.screenshot({ 
      path: '../../reports/screenshots/all-controls-visible.png',
      fullPage: true 
    });

    // Test zoom functionality
    const svg = await page.locator('svg');
    if (await svg.isVisible()) {
      await svg.hover();
      await page.mouse.wheel(0, -200);
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: '../../reports/screenshots/tree-zoomed-in.png',
        fullPage: true 
      });

      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: '../../reports/screenshots/tree-zoomed-out.png',
        fullPage: true 
      });
    }
  });
});
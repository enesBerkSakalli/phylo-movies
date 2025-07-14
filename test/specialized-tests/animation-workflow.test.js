import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Animation Workflow Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('complete animation workflow with play/pause/seek', async ({ page }) => {
    // Upload larger tree file for animation testing
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile);
    
    // Wait for tree to load
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Screenshot initial state
    await page.screenshot({ 
      path: 'reports/screenshots/animation-initial-state.png',
      fullPage: true 
    });

    // Start animation
    const playButton = await page.locator('button:has-text("play_arrow")');
    await playButton.click();
    
    // Screenshot playing state
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'reports/screenshots/animation-playing.png',
      fullPage: true 
    });

    // Test pause functionality
    const pauseButton = await page.locator('button:has-text("pause")');
    await pauseButton.click();
    await page.waitForTimeout(500);
    
    await page.screenshot({ 
      path: 'reports/screenshots/animation-paused.png',
      fullPage: true 
    });

    // Test speed control
    const speedControl = await page.locator('.speed-control-container');
    if (await speedControl.isVisible()) {
      // Click to open speed menu
      await speedControl.click();
      await page.waitForTimeout(500);
      
      // Select different speed
      const speed2x = await page.locator('text=2x');
      if (await speed2x.isVisible()) {
        await speed2x.click();
        await page.screenshot({ 
          path: 'reports/screenshots/animation-speed-2x.png',
          fullPage: true 
        });
      }
    }

    // Resume animation
    await playButton.click();
    await page.waitForTimeout(2000);

    // Test position seeking
    const timeline = await page.locator('.timeline-container, .progress-bar, input[type="range"]');
    if (await timeline.isVisible()) {
      // Try to seek to middle position
      const box = await timeline.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(1000);
        await page.screenshot({ 
          path: 'reports/screenshots/animation-seek-middle.png',
          fullPage: true 
        });
      }
    }

    // Capture key animation frames
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(1500);
      await page.screenshot({ 
        path: `reports/screenshots/animation-frame-${i + 1}.png`,
        fullPage: true 
      });
    }
  });

  test('animation controls visibility and interaction', async ({ page }) => {
    // Upload tree file
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile);
    
    await page.waitForSelector('svg', { timeout: 10000 });
    
    // Check all animation controls
    const controls = {
      play: 'button:has-text("play_arrow")',
      first: 'button:has-text("first_page")',
      previous: 'button:has-text("chevron_left")',
      next: 'button:has-text("chevron_right")',
      last: 'button:has-text("last_page")'
    };

    for (const [name, selector] of Object.entries(controls)) {
      const control = await page.locator(selector);
      const isVisible = await control.isVisible();
      console.log(`${name} control visible:`, isVisible);
      
      if (isVisible) {
        await control.hover();
        await page.screenshot({ 
          path: `reports/screenshots/animation-control-${name}-hover.png`,
          clip: await control.boundingBox()
        });
      }
    }
  });
});
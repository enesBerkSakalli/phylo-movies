import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Play Button Workflow Test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('complete play button workflow', async ({ page }) => {
    // Upload tree file
    const treeFileSection = await page.locator('text=Tree File').locator('..').locator('input[type="file"]').first();
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    await treeFileSection.setInputFiles(treeFile);
    
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: '../../reports/screenshots/play-01-file-loaded.png',
      fullPage: true 
    });

    // Click the Play button
    const playButton = await page.locator('button:has-text("Play")');
    console.log('Play button visible:', await playButton.isVisible());
    
    if (await playButton.isVisible()) {
      await playButton.click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: '../../reports/screenshots/play-02-after-click.png',
        fullPage: true 
      });

      // Wait longer to see if visualization appears
      await page.waitForTimeout(8000);
      
      await page.screenshot({ 
        path: '../../reports/screenshots/play-03-after-processing.png',
        fullPage: true 
      });

      // Check if we're on a new page or if content has changed
      const currentUrl = page.url();
      console.log('Current URL after play:', currentUrl);

      // Look for visualization elements
      const visualElements = await page.locator('svg circle, canvas, .tree-viz, .visualization');
      const visualCount = await visualElements.count();
      console.log('Visual elements found:', visualCount);

      // Check for video/movie elements
      const videoElements = await page.locator('video');
      const videoCount = await videoElements.count();
      console.log('Video elements found:', videoCount);

      // Look for animation controls that might appear after play
      const animationControls = await page.locator('button:has-text("pause"), button:has-text("stop"), .pause-btn, .stop-btn');
      const controlCount = await animationControls.count();
      console.log('Animation controls found:', controlCount);

      // Check if URL changed (might redirect to visualization)
      if (currentUrl !== 'http://localhost:5173/') {
        console.log('URL changed - navigated to:', currentUrl);
        await page.screenshot({ 
          path: '../../reports/screenshots/play-04-new-page.png',
          fullPage: true 
        });
      }

      // Wait a bit more and take final screenshot
      await page.waitForTimeout(5000);
      await page.screenshot({ 
        path: '../../reports/screenshots/play-05-final-state.png',
        fullPage: true 
      });

      // Try different viewport sizes to see if content appears
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: '../../reports/screenshots/play-06-large-viewport.png',
        fullPage: true 
      });
    }
  });

  test('test with different tree files', async ({ page }) => {
    const testFiles = [
      '../../data/test-data/multifurcation.tree',
      '../../data/test-data/hiv_index_86.tree'
    ];

    for (const [index, testFile] of testFiles.entries()) {
      if (index > 0) {
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      }

      const treeFileSection = await page.locator('text=Tree File').locator('..').locator('input[type="file"]').first();
      const filePath = path.join(__dirname, testFile);
      await treeFileSection.setInputFiles(filePath);
      
      await page.waitForTimeout(3000);
      
      const playButton = await page.locator('button:has-text("Play")');
      if (await playButton.isVisible()) {
        await playButton.click();
        await page.waitForTimeout(5000);
        
        await page.screenshot({ 
          path: `../../reports/screenshots/play-test-file-${index}.png`,
          fullPage: true 
        });

        const currentUrl = page.url();
        console.log(`Test file ${index} - URL after play:`, currentUrl);
      }
    }
  });

  test('test with configuration options', async ({ page }) => {
    // Upload tree file
    const treeFileSection = await page.locator('text=Tree File').locator('..').locator('input[type="file"]').first();
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    await treeFileSection.setInputFiles(treeFile);
    
    await page.waitForTimeout(3000);

    // Test with different window sizes
    const windowSizeInput = await page.locator('input').nth(0); // Window Size field
    await windowSizeInput.fill('5');
    
    // Test with midpoint rooting enabled
    const midpointCheckbox = await page.locator('text=Enable Midpoint Rooting').locator('..').locator('input[type="checkbox"]');
    if (await midpointCheckbox.isVisible()) {
      await midpointCheckbox.check();
    }

    await page.screenshot({ 
      path: '../../reports/screenshots/play-config-modified.png',
      fullPage: true 
    });

    // Click Play with modified configuration
    const playButton = await page.locator('button:has-text("Play")');
    if (await playButton.isVisible()) {
      await playButton.click();
      await page.waitForTimeout(8000);
      
      await page.screenshot({ 
        path: '../../reports/screenshots/play-config-result.png',
        fullPage: true 
      });

      const currentUrl = page.url();
      console.log('URL after play with config:', currentUrl);
    }
  });
});
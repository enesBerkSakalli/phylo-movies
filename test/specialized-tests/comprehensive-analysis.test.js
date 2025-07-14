import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Comprehensive Application Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('complete workflow analysis', async ({ page }) => {
    // 1. Initial interface documentation
    await page.screenshot({ 
      path: '../../reports/screenshots/01-initial-interface.png',
      fullPage: true 
    });

    // 2. Upload tree file
    const treeFileSection = await page.locator('text=Tree File').locator('..').locator('input[type="file"]').first();
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    await treeFileSection.setInputFiles(treeFile);
    
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: '../../reports/screenshots/02-file-uploaded.png',
      fullPage: true 
    });

    // 3. Wait for processing and check for tree visualization
    await page.waitForTimeout(5000);
    
    // Look for any SVG elements that might contain the tree
    const svgElements = await page.locator('svg');
    const svgCount = await svgElements.count();
    console.log(`Found ${svgCount} SVG elements`);

    // Check for tree-related elements
    const treeContainer = await page.locator('#tree-container, .tree-container, .visualization-container, .tree-viz');
    const canvasElements = await page.locator('canvas');
    const canvasCount = await canvasElements.count();
    console.log(`Found ${canvasCount} canvas elements`);

    await page.screenshot({ 
      path: '../../reports/screenshots/03-after-processing.png',
      fullPage: true 
    });

    // 4. Document all visible elements
    const allButtons = await page.locator('button:visible');
    const buttonCount = await allButtons.count();
    console.log(`\\n=== BUTTON ANALYSIS (${buttonCount} visible buttons) ===`);
    
    for (let i = 0; i < Math.min(buttonCount, 30); i++) {
      const button = allButtons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const className = await button.getAttribute('class');
      console.log(`Button ${i}: "${text?.trim()}" | aria-label: "${ariaLabel}" | class: "${className}"`);
    }

    // 5. Look for animation controls specifically
    const animationControls = [
      'button:has-text("play_arrow")',
      'button:has-text("pause")', 
      'button:has-text("stop")',
      'button:has-text("first_page")',
      'button:has-text("last_page")',
      'button:has-text("chevron_left")',
      'button:has-text("chevron_right")',
      '.play-button',
      '.pause-button',
      '.control-button'
    ];

    console.log(`\\n=== ANIMATION CONTROLS ANALYSIS ===`);
    for (const control of animationControls) {
      const element = await page.locator(control);
      const isVisible = await element.isVisible();
      const count = await element.count();
      console.log(`${control}: visible=${isVisible}, count=${count}`);
    }

    // 6. Test different file types if first one doesn't work
    const alternativeFiles = [
      '../../data/test-data/hiv_index_86.tree',
      '../../data/test-data/multifurcation.tree'
    ];

    for (const [index, altFile] of alternativeFiles.entries()) {
      try {
        const altFilePath = path.join(__dirname, altFile);
        await treeFileSection.setInputFiles(altFilePath);
        await page.waitForTimeout(4000);
        
        await page.screenshot({ 
          path: `../../reports/screenshots/04-alternative-file-${index}.png`,
          fullPage: true 
        });

        // Check if tree appears with this file
        const postUploadSvg = await page.locator('svg circle, svg path[d*="M"], svg .node');
        const treeElementCount = await postUploadSvg.count();
        console.log(`Alternative file ${index}: found ${treeElementCount} tree elements`);

        if (treeElementCount > 5) {
          console.log(`SUCCESS: Tree visualization appeared with alternative file ${index}`);
          break;
        }
      } catch (error) {
        console.log(`Alternative file ${index} failed:`, error.message);
      }
    }

    // 7. Test interaction capabilities
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: '../../reports/screenshots/05-zoom-test.png',
      fullPage: true 
    });

    // 8. Test responsive behavior
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: '../../reports/screenshots/06-responsive-small.png',
      fullPage: true 
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: '../../reports/screenshots/07-responsive-large.png',
      fullPage: true 
    });

    // 9. Look for additional functionality
    const functionalityElements = [
      '.msa-viewer',
      '.comparison-tool', 
      '.color-picker',
      '.settings-panel',
      '.export-button',
      '.save-button',
      'input[type="color"]',
      'input[type="range"]'
    ];

    console.log(`\\n=== ADDITIONAL FUNCTIONALITY ===`);
    for (const element of functionalityElements) {
      const found = await page.locator(element);
      const isVisible = await found.isVisible();
      const count = await found.count();
      console.log(`${element}: visible=${isVisible}, count=${count}`);
    }

    // 10. Final state documentation
    await page.screenshot({ 
      path: '../../reports/screenshots/08-final-state.png',
      fullPage: true 
    });
  });

  test('error handling and edge cases', async ({ page }) => {
    // Test with invalid file
    const invalidFile = path.join(__dirname, '../../package.json');
    const treeFileSection = await page.locator('text=Tree File').locator('..').locator('input[type="file"]').first();
    
    await treeFileSection.setInputFiles(invalidFile);
    await page.waitForTimeout(3000);
    
    await page.screenshot({ 
      path: '../../reports/screenshots/error-invalid-file.png',
      fullPage: true 
    });

    // Check for error messages
    const errorElements = await page.locator('.error, .alert, .warning, [role="alert"]');
    const errorCount = await errorElements.count();
    console.log(`Error elements found: ${errorCount}`);

    // Test empty form submission
    const submitButtons = await page.locator('button[type="submit"], .submit-btn, button:has-text("Submit")');
    if (await submitButtons.count() > 0) {
      await submitButtons.first().click();
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: '../../reports/screenshots/error-empty-submission.png',
        fullPage: true 
      });
    }
  });

  test('performance and loading states', async ({ page }) => {
    // Monitor performance
    const startTime = Date.now();
    
    const treeFileSection = await page.locator('text=Tree File').locator('..').locator('input[type="file"]').first();
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    await treeFileSection.setInputFiles(treeFile);
    
    // Look for loading indicators
    const loadingIndicators = await page.locator('.loading, .spinner, .progress, [aria-busy="true"]');
    const hasLoading = await loadingIndicators.count() > 0;
    
    if (hasLoading) {
      await page.screenshot({ 
        path: '../../reports/screenshots/loading-state.png',
        fullPage: true 
      });
    }

    await page.waitForTimeout(5000);
    const loadTime = Date.now() - startTime;
    console.log(`File processing took ${loadTime}ms`);

    // Memory usage if available
    const memoryInfo = await page.evaluate(() => {
      if (performance.memory) {
        return {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
        };
      }
      return null;
    });

    if (memoryInfo) {
      console.log(`Memory usage: ${memoryInfo.used}MB / ${memoryInfo.total}MB`);
    }
  });
});
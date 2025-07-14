import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Taxa Coloring Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('taxa coloring modal workflow', async ({ page }) => {
    // Load tree
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile);
    
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Screenshot initial tree state
    await page.screenshot({ 
      path: 'reports/screenshots/taxa-coloring-initial.png',
      fullPage: true 
    });

    // Look for taxa coloring functionality
    const coloringTriggers = [
      'button:has-text("palette")',
      'button:has-text("color")',
      '.color-button',
      '.taxa-coloring-btn',
      'button[title*="color"]',
      'button[aria-label*="color"]',
      '.appearance-controls button',
      '.coloring-controls button'
    ];

    let coloringFound = false;
    for (const trigger of coloringTriggers) {
      const element = await page.locator(trigger);
      if (await element.isVisible()) {
        console.log(`Found coloring trigger: ${trigger}`);
        await element.click();
        await page.waitForTimeout(1000);
        
        // Screenshot the coloring interface
        await page.screenshot({ 
          path: 'reports/screenshots/taxa-coloring-modal-opened.png',
          fullPage: true 
        });
        
        coloringFound = true;
        break;
      }
    }

    // Try appearance controls
    if (!coloringFound) {
      const appearanceButton = await page.locator('button:has-text("tune"), button:has-text("settings")');
      if (await appearanceButton.isVisible()) {
        await appearanceButton.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: 'reports/screenshots/taxa-appearance-controls.png',
          fullPage: true 
        });
        
        // Look for color controls within appearance panel
        const colorControls = await page.locator('.color-picker, input[type="color"], .color-palette');
        if (await colorControls.isVisible()) {
          coloringFound = true;
        }
      }
    }

    if (coloringFound) {
      // Test color picker interface
      const colorPickers = await page.locator('input[type="color"], .color-picker');
      const pickerCount = await colorPickers.count();
      
      for (let i = 0; i < Math.min(pickerCount, 3); i++) {
        const picker = colorPickers.nth(i);
        if (await picker.isVisible()) {
          // Try to change color
          await picker.click();
          await page.waitForTimeout(500);
          
          await page.screenshot({ 
            path: `reports/screenshots/taxa-color-picker-${i}.png`,
            fullPage: true 
          });
        }
      }

      // Test different color schemes
      const colorSchemes = await page.locator('.color-scheme, .preset-colors button, .color-preset');
      const schemeCount = await colorSchemes.count();
      
      for (let i = 0; i < Math.min(schemeCount, 3); i++) {
        const scheme = colorSchemes.nth(i);
        if (await scheme.isVisible()) {
          await scheme.click();
          await page.waitForTimeout(1000);
          
          await page.screenshot({ 
            path: `reports/screenshots/taxa-color-scheme-${i}.png`,
            fullPage: true 
          });
        }
      }

      // Apply colors and screenshot results
      const applyButton = await page.locator('button:has-text("Apply"), button:has-text("OK"), .apply-btn');
      if (await applyButton.isVisible()) {
        await applyButton.click();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: 'reports/screenshots/taxa-coloring-applied.png',
          fullPage: true 
        });
      }
    } else {
      console.log('No taxa coloring functionality found');
      
      // Check if tree nodes have color attributes
      const nodes = await page.locator('svg circle, svg .node');
      const nodeCount = await nodes.count();
      console.log(`Found ${nodeCount} tree nodes`);
      
      if (nodeCount > 0) {
        const firstNode = nodes.first();
        const fill = await firstNode.getAttribute('fill');
        const stroke = await firstNode.getAttribute('stroke');
        console.log(`Node colors - fill: ${fill}, stroke: ${stroke}`);
      }
    }

    // Test right-click context menu on nodes
    const treeNodes = await page.locator('svg circle');
    if (await treeNodes.count() > 0) {
      const firstNode = treeNodes.first();
      await firstNode.click({ button: 'right' });
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: 'reports/screenshots/taxa-context-menu.png',
        fullPage: true 
      });
    }
  });

  test('monophyletic group coloring', async ({ page }) => {
    // Load tree
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile);
    
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Try to select multiple taxa for grouping
    const treeNodes = await page.locator('svg circle, svg .leaf-node');
    const nodeCount = await treeNodes.count();
    
    if (nodeCount > 3) {
      // Select multiple nodes with Ctrl+click
      for (let i = 0; i < 3; i++) {
        await treeNodes.nth(i).click({ modifiers: ['Control'] });
        await page.waitForTimeout(300);
      }
      
      await page.screenshot({ 
        path: 'reports/screenshots/taxa-multiple-selection.png',
        fullPage: true 
      });

      // Look for group coloring options
      const groupButtons = await page.locator('button:has-text("group"), .group-btn, .monophyletic-btn');
      if (await groupButtons.isVisible()) {
        await groupButtons.first().click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: 'reports/screenshots/taxa-group-coloring.png',
          fullPage: true 
        });
      }
    }
  });

  test('color legend and accessibility', async ({ page }) => {
    // Load tree and apply coloring
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile);
    
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Look for color legend
    const legend = await page.locator('.legend, .color-legend, .taxa-legend');
    if (await legend.isVisible()) {
      await page.screenshot({ 
        path: 'reports/screenshots/taxa-color-legend.png',
        clip: await legend.boundingBox()
      });
    }

    // Test color accessibility
    const nodes = await page.locator('svg circle[fill]');
    const nodeCount = await nodes.count();
    const colors = new Set();
    
    for (let i = 0; i < Math.min(nodeCount, 10); i++) {
      const fill = await nodes.nth(i).getAttribute('fill');
      if (fill) colors.add(fill);
    }
    
    console.log(`Found ${colors.size} different colors:`, Array.from(colors));
  });
});
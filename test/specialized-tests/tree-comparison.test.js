import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Tree Comparison Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('tree comparison modal workflow', async ({ page }) => {
    // Load first tree
    const treeFile1 = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile1);
    
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Screenshot with first tree loaded
    await page.screenshot({ 
      path: 'reports/screenshots/comparison-tree1-loaded.png',
      fullPage: true 
    });

    // Look for compare sequences button/modal trigger
    const compareButton = await page.locator('button:has-text("compare"), [data-action="compare"], .compare-btn, #compareBtn');
    const compareModal = await page.locator('.compare-modal, #compareModal, [role="dialog"]:has-text("compare")');
    
    // Try to find comparison functionality
    const possibleTriggers = [
      'button:has-text("Compare")',
      'button:has-text("Sequences")',
      '.menu-item:has-text("Compare")',
      '.comparison-button',
      'button[title*="compare"]',
      'button[aria-label*="compare"]'
    ];

    let comparisonFound = false;
    for (const trigger of possibleTriggers) {
      const element = await page.locator(trigger);
      if (await element.isVisible()) {
        console.log(`Found comparison trigger: ${trigger}`);
        await element.click();
        await page.waitForTimeout(1000);
        
        // Screenshot the comparison interface
        await page.screenshot({ 
          path: 'reports/screenshots/comparison-modal-opened.png',
          fullPage: true 
        });
        
        comparisonFound = true;
        break;
      }
    }

    if (!comparisonFound) {
      // Try keyboard shortcuts
      await page.keyboard.press('c');
      await page.waitForTimeout(500);
      
      // Check if modal appeared
      const modal = await page.locator('[role="dialog"], .modal, .comparison-window');
      if (await modal.isVisible()) {
        await page.screenshot({ 
          path: 'reports/screenshots/comparison-keyboard-shortcut.png',
          fullPage: true 
        });
        comparisonFound = true;
      }
    }

    // If we found comparison interface, test it further
    if (comparisonFound) {
      // Try to load second tree in comparison
      const secondFileInput = await page.locator('input[type="file"]').last();
      if (await secondFileInput.isVisible()) {
        const treeFile2 = path.join(__dirname, '../../data/test-data/hiv_index_86.tree');
        await secondFileInput.setInputFiles(treeFile2);
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: 'reports/screenshots/comparison-both-trees.png',
          fullPage: true 
        });
      }

      // Test comparison controls
      const comparisonControls = await page.locator('.comparison-controls, .tree-controls');
      if (await comparisonControls.isVisible()) {
        await page.screenshot({ 
          path: 'reports/screenshots/comparison-controls.png',
          clip: await comparisonControls.boundingBox()
        });
      }
    } else {
      console.log('No comparison functionality found - documenting current interface');
      await page.screenshot({ 
        path: 'reports/screenshots/comparison-not-found.png',
        fullPage: true 
      });
    }

    // Document all available menu options
    const menuButtons = await page.locator('button, .menu-item, .nav-item');
    const menuCount = await menuButtons.count();
    console.log(`Found ${menuCount} menu items`);
    
    for (let i = 0; i < Math.min(menuCount, 20); i++) {
      const text = await menuButtons.nth(i).textContent();
      console.log(`Menu item ${i}: ${text}`);
    }
  });

  test('tree comparison with different tree formats', async ({ page }) => {
    // Test with different tree file formats
    const treeFiles = [
      '../../data/test-data/hiv_index_2.tree',
      '../../data/test-data/multifurcation.tree',
      '../../data/test-data/simon_test_tree_2.tree'
    ];

    for (const [index, treeFile] of treeFiles.entries()) {
      const filePath = path.join(__dirname, treeFile);
      
      // Clear and load new tree
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      
      await page.waitForSelector('svg', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      await page.screenshot({ 
        path: `reports/screenshots/comparison-tree-format-${index}.png`,
        fullPage: true 
      });
    }
  });
});
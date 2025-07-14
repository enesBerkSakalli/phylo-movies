import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Error Handling Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('invalid file upload handling', async ({ page }) => {
    // Test uploading various invalid files
    const invalidFiles = [
      { name: 'text-file.txt', content: 'This is just plain text, not a tree file' },
      { name: 'json-file.json', content: '{"invalid": "json structure"}' },
      { name: 'malformed-newick.tree', content: '((A:0.1,B:0.2):0.05,C:0.3' }, // Missing closing parenthesis
      { name: 'empty-file.tree', content: '' },
      { name: 'binary-file.bin', content: '\x00\x01\x02\x03\x04\x05' }
    ];

    for (const [index, file] of invalidFiles.entries()) {
      // Create temporary file
      const tempFilePath = path.join(__dirname, `../../temp-${file.name}`);
      await fs.writeFile(tempFilePath, file.content);

      try {
        const fileInput = await page.locator('input[type="file"]');
        await fileInput.setInputFiles(tempFilePath);
        
        await page.waitForTimeout(2000);
        
        // Check for error messages
        const errorElements = await page.locator('.error, .alert-danger, .error-message, [role="alert"]');
        const errorCount = await errorElements.count();
        
        if (errorCount > 0) {
          console.log(`Error detected for ${file.name}`);
          await page.screenshot({ 
            path: `reports/screenshots/error-invalid-file-${index}.png`,
            fullPage: true 
          });
        } else {
          console.log(`No error shown for ${file.name}`);
          await page.screenshot({ 
            path: `reports/screenshots/error-no-feedback-${index}.png`,
            fullPage: true 
          });
        }

        // Check console errors
        const consoleLogs = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleLogs.push(msg.text());
          }
        });

        await page.waitForTimeout(1000);
        
        if (consoleLogs.length > 0) {
          console.log(`Console errors for ${file.name}:`, consoleLogs);
        }

      } catch (error) {
        console.log(`Exception for ${file.name}:`, error.message);
      } finally {
        // Clean up temp file
        try {
          await fs.unlink(tempFilePath);
        } catch (e) {}
      }
    }
  });

  test('network error simulation', async ({ page }) => {
    // Load a valid tree first
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile);
    
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Screenshot normal state
    await page.screenshot({ 
      path: 'reports/screenshots/error-before-network-failure.png',
      fullPage: true 
    });

    // Simulate network failure
    await page.route('**/*', route => {
      if (route.request().url().includes('api') || route.request().url().includes('backend')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Try to trigger network-dependent operations
    const networkOperations = [
      () => page.reload(),
      () => page.locator('button:has-text("refresh")').click(),
      () => page.locator('button:has-text("load")').click()
    ];

    for (const [index, operation] of networkOperations.entries()) {
      try {
        await operation();
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: `reports/screenshots/error-network-operation-${index}.png`,
          fullPage: true 
        });
      } catch (error) {
        console.log(`Network operation ${index} failed:`, error.message);
      }
    }
  });

  test('malformed tree data handling', async ({ page }) => {
    // Test various malformed tree formats
    const malformedTrees = [
      {
        name: 'invalid-newick-1',
        content: '((A:0.1,B:0.2):0.05,C:0.3));' // Extra closing parenthesis
      },
      {
        name: 'invalid-newick-2',
        content: '(A:invalid,B:0.2):0.05,C:0.3);' // Invalid branch length
      },
      {
        name: 'invalid-newick-3',
        content: '((A,B),C' // Missing semicolon and parentheses
      },
      {
        name: 'invalid-nexus',
        content: '#NEXUS\nBEGIN TREES;\nTREE tree1 = invalid_format;\nEND;'
      },
      {
        name: 'circular-tree',
        content: '((A:0.1,(B:0.2,A:0.1):0.05):0.1,C:0.3);' // Circular reference
      }
    ];

    for (const [index, tree] of malformedTrees.entries()) {
      const tempFilePath = path.join(__dirname, `../../temp-${tree.name}.tree`);
      await fs.writeFile(tempFilePath, tree.content);

      try {
        const fileInput = await page.locator('input[type="file"]');
        await fileInput.setInputFiles(tempFilePath);
        
        await page.waitForTimeout(3000);
        
        // Check for parsing errors
        const errors = await page.locator('.parse-error, .tree-error, .error-message');
        if (await errors.isVisible()) {
          console.log(`Parse error detected for ${tree.name}`);
        }
        
        await page.screenshot({ 
          path: `reports/screenshots/error-malformed-tree-${index}.png`,
          fullPage: true 
        });

      } catch (error) {
        console.log(`Exception for ${tree.name}:`, error.message);
      } finally {
        try {
          await fs.unlink(tempFilePath);
        } catch (e) {}
      }
    }
  });

  test('UI error states and recovery', async ({ page }) => {
    // Test various UI error scenarios
    
    // Test with no file loaded
    await page.screenshot({ 
      path: 'reports/screenshots/error-no-file-loaded.png',
      fullPage: true 
    });

    // Try to use controls without data
    const controls = [
      'button:has-text("play_arrow")',
      'button:has-text("pause")',
      'button:has-text("first_page")',
      'button:has-text("last_page")'
    ];

    for (const [index, control] of controls.entries()) {
      const button = await page.locator(control);
      if (await button.isVisible()) {
        await button.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: `reports/screenshots/error-control-no-data-${index}.png`,
          fullPage: true 
        });
      }
    }

    // Test memory/performance limits
    const largeFile = path.join(__dirname, '../../data/test-data/hiv-421trees-midpoint-rooted.tree');
    try {
      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(largeFile);
      
      // Wait longer for large file
      await page.waitForTimeout(10000);
      
      await page.screenshot({ 
        path: 'reports/screenshots/error-large-file-handling.png',
        fullPage: true 
      });

      // Check if browser shows memory warnings
      const memoryWarnings = await page.locator('.memory-warning, .performance-warning, .browser-warning');
      if (await memoryWarnings.isVisible()) {
        await page.screenshot({ 
          path: 'reports/screenshots/error-memory-warning.png',
          clip: await memoryWarnings.boundingBox()
        });
      }

    } catch (error) {
      console.log('Large file error:', error.message);
      await page.screenshot({ 
        path: 'reports/screenshots/error-large-file-failed.png',
        fullPage: true 
      });
    }
  });

  test('JavaScript error handling', async ({ page }) => {
    // Monitor JavaScript errors
    const jsErrors = [];
    page.on('pageerror', error => {
      jsErrors.push({
        message: error.message,
        stack: error.stack
      });
    });

    // Load tree to trigger potential JS errors
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile);
    
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Trigger various operations that might cause JS errors
    const operations = [
      () => page.mouse.wheel(0, 1000), // Extreme zoom
      () => page.mouse.wheel(0, -1000), // Extreme zoom out
      () => page.setViewportSize({ width: 100, height: 100 }), // Tiny viewport
      () => page.setViewportSize({ width: 4000, height: 3000 }), // Large viewport
    ];

    for (const [index, operation] of operations.entries()) {
      try {
        await operation();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: `reports/screenshots/error-js-operation-${index}.png`,
          fullPage: true 
        });
      } catch (error) {
        console.log(`JS operation ${index} error:`, error.message);
      }
    }

    // Report collected JS errors
    if (jsErrors.length > 0) {
      console.log('JavaScript errors detected:', jsErrors);
      await page.screenshot({ 
        path: 'reports/screenshots/error-js-errors-detected.png',
        fullPage: true 
      });
    } else {
      console.log('No JavaScript errors detected');
    }
  });

  test('error recovery and user guidance', async ({ page }) => {
    // Test error recovery workflows
    
    // Upload invalid file
    const invalidContent = 'invalid tree data';
    const tempFilePath = path.join(__dirname, '../../temp-invalid.tree');
    await fs.writeFile(tempFilePath, invalidContent);

    try {
      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(tempFilePath);
      
      await page.waitForTimeout(2000);
      
      // Look for error recovery options
      const recoveryOptions = [
        'button:has-text("Try Again")',
        'button:has-text("Reset")',
        'button:has-text("Clear")',
        '.error-recovery',
        '.retry-btn'
      ];

      for (const option of recoveryOptions) {
        const element = await page.locator(option);
        if (await element.isVisible()) {
          console.log(`Found recovery option: ${option}`);
          await page.screenshot({ 
            path: 'reports/screenshots/error-recovery-option.png',
            clip: await element.boundingBox()
          });
        }
      }

      // Test help/documentation links
      const helpLinks = [
        'a:has-text("Help")',
        'button:has-text("?")',
        '.help-btn',
        '.documentation-link'
      ];

      for (const link of helpLinks) {
        const element = await page.locator(link);
        if (await element.isVisible()) {
          console.log(`Found help link: ${link}`);
          await element.hover();
          await page.waitForTimeout(500);
          
          await page.screenshot({ 
            path: 'reports/screenshots/error-help-available.png',
            fullPage: true 
          });
        }
      }

    } finally {
      try {
        await fs.unlink(tempFilePath);
      } catch (e) {}
    }
  });
});
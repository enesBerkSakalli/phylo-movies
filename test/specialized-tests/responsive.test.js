import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Responsive Design Tests', () => {
  const viewports = [
    { name: 'mobile-portrait', width: 375, height: 667 },
    { name: 'mobile-landscape', width: 667, height: 375 },
    { name: 'tablet-portrait', width: 768, height: 1024 },
    { name: 'tablet-landscape', width: 1024, height: 768 },
    { name: 'desktop-small', width: 1280, height: 720 },
    { name: 'desktop-large', width: 1920, height: 1080 },
    { name: 'ultrawide', width: 2560, height: 1440 }
  ];

  test('responsive layout across different viewport sizes', async ({ page }) => {
    // Load tree for testing
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');
      
      // Upload tree
      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(treeFile);
      
      await page.waitForSelector('svg', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // Screenshot each viewport
      await page.screenshot({ 
        path: `reports/screenshots/responsive-${viewport.name}.png`,
        fullPage: true 
      });

      // Test UI element visibility and positioning
      const uiElements = {
        fileInput: 'input[type="file"]',
        playButton: 'button:has-text("play_arrow")',
        controlPanel: '.controls, .control-panel, .movie-player-bar',
        tree: 'svg',
        menuButton: 'button:has-text("menu"), .menu-btn, .hamburger'
      };

      const elementStats = {};
      for (const [name, selector] of Object.entries(uiElements)) {
        const element = await page.locator(selector);
        const isVisible = await element.isVisible();
        const boundingBox = isVisible ? await element.boundingBox() : null;
        
        elementStats[name] = {
          visible: isVisible,
          position: boundingBox
        };
      }
      
      console.log(`${viewport.name} UI elements:`, elementStats);

      // Test responsive menu behavior
      if (viewport.width < 768) {
        // Mobile behavior
        const mobileMenu = await page.locator('.mobile-menu, .hamburger-menu, .responsive-menu');
        if (await mobileMenu.isVisible()) {
          await mobileMenu.click();
          await page.waitForTimeout(500);
          
          await page.screenshot({ 
            path: `reports/screenshots/responsive-${viewport.name}-menu-open.png`,
            fullPage: true 
          });
        }
      }
    }
  });

  test('touch interaction compatibility', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Load tree
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile);
    
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ 
      path: 'reports/screenshots/responsive-mobile-initial.png',
      fullPage: true 
    });

    // Test touch gestures
    const svg = await page.locator('svg');
    const svgBox = await svg.boundingBox();
    
    if (svgBox) {
      // Test tap
      await page.touchscreen.tap(svgBox.x + svgBox.width / 2, svgBox.y + svgBox.height / 2);
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: 'reports/screenshots/responsive-mobile-tap.png',
        fullPage: true 
      });

      // Test pinch zoom (simulate)
      await page.evaluate(() => {
        const svg = document.querySelector('svg');
        if (svg) {
          // Dispatch touch events for pinch zoom
          const touchStart = new TouchEvent('touchstart', {
            touches: [
              { clientX: 100, clientY: 100, identifier: 0 },
              { clientX: 200, clientY: 200, identifier: 1 }
            ]
          });
          svg.dispatchEvent(touchStart);
          
          setTimeout(() => {
            const touchMove = new TouchEvent('touchmove', {
              touches: [
                { clientX: 80, clientY: 80, identifier: 0 },
                { clientX: 220, clientY: 220, identifier: 1 }
              ]
            });
            svg.dispatchEvent(touchMove);
          }, 100);
        }
      });
      
      await page.waitForTimeout(1000);
      await page.screenshot({ 
        path: 'reports/screenshots/responsive-mobile-pinch.png',
        fullPage: true 
      });
    }

    // Test button tap targets
    const buttons = await page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const buttonBox = await button.boundingBox();
      
      if (buttonBox) {
        const tapTargetSize = Math.min(buttonBox.width, buttonBox.height);
        console.log(`Button ${i} tap target size: ${tapTargetSize}px`);
        
        // Check if button meets minimum tap target size (44px recommended)
        if (tapTargetSize < 44) {
          console.log(`Warning: Button ${i} may be too small for touch interaction`);
        }
      }
    }
  });

  test('orientation change handling', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Load tree
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile);
    
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Test portrait to landscape transition
    await page.setViewportSize({ width: 375, height: 667 }); // Portrait
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'reports/screenshots/responsive-portrait.png',
      fullPage: true 
    });

    await page.setViewportSize({ width: 667, height: 375 }); // Landscape
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: 'reports/screenshots/responsive-landscape.png',
      fullPage: true 
    });

    // Test that tree adjusts to new dimensions
    const svg = await page.locator('svg');
    const svgBox = await svg.boundingBox();
    
    if (svgBox) {
      console.log(`Landscape SVG dimensions: ${svgBox.width}x${svgBox.height}`);
      
      // Check if tree content is still visible and properly scaled
      const nodes = await page.locator('svg circle');
      const nodeCount = await nodes.count();
      console.log(`Visible nodes in landscape: ${nodeCount}`);
    }
  });

  test('text readability and scaling', async ({ page }) => {
    const textTestViewports = [
      { name: 'small-mobile', width: 320, height: 568 },
      { name: 'large-mobile', width: 414, height: 896 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of textTestViewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');
      
      // Load tree with labels
      const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(treeFile);
      
      await page.waitForSelector('svg', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // Check text elements
      const textElements = await page.locator('svg text, .label, .taxa-label');
      const textCount = await textElements.count();
      
      if (textCount > 0) {
        // Sample a few text elements to check font size
        for (let i = 0; i < Math.min(textCount, 3); i++) {
          const textElement = textElements.nth(i);
          const fontSize = await textElement.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.fontSize;
          });
          
          console.log(`${viewport.name} text ${i} font size: ${fontSize}`);
        }
      }
      
      await page.screenshot({ 
        path: `reports/screenshots/responsive-text-${viewport.name}.png`,
        fullPage: true 
      });
    }
  });

  test('control panel adaptation', async ({ page }) => {
    // Test how control panels adapt to different screen sizes
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    
    for (const viewport of viewports.slice(0, 4)) { // Test key viewports
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');
      
      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(treeFile);
      
      await page.waitForSelector('svg', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // Check control panel layout
      const controlPanel = await page.locator('.controls, .control-panel, .movie-player-bar');
      if (await controlPanel.isVisible()) {
        const panelBox = await controlPanel.boundingBox();
        const isHorizontal = panelBox.width > panelBox.height;
        
        console.log(`${viewport.name} control panel: ${panelBox.width}x${panelBox.height}, horizontal: ${isHorizontal}`);
        
        // Screenshot control panel specifically
        await page.screenshot({ 
          path: `reports/screenshots/responsive-controls-${viewport.name}.png`,
          clip: panelBox
        });
      }

      // Test control button visibility and arrangement
      const controlButtons = await page.locator('.controls button, .control-panel button');
      const buttonCount = await controlButtons.count();
      
      console.log(`${viewport.name} visible control buttons: ${buttonCount}`);
      
      // Check if buttons stack or wrap appropriately
      if (buttonCount > 1) {
        const firstButton = await controlButtons.first().boundingBox();
        const lastButton = await controlButtons.last().boundingBox();
        
        if (firstButton && lastButton) {
          const isStacked = Math.abs(firstButton.y - lastButton.y) > 10;
          console.log(`${viewport.name} buttons stacked: ${isStacked}`);
        }
      }
    }
  });

  test('accessibility at different screen sizes', async ({ page }) => {
    // Test accessibility features across viewport sizes
    
    for (const viewport of [viewports[0], viewports[3], viewports[5]]) { // Mobile, tablet, desktop
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');
      
      // Check color contrast and element sizes
      const bodyStyles = await page.evaluate(() => {
        const body = document.body;
        const style = window.getComputedStyle(body);
        return {
          backgroundColor: style.backgroundColor,
          color: style.color,
          fontSize: style.fontSize
        };
      });
      
      console.log(`${viewport.name} body styles:`, bodyStyles);
      
      // Check focus indicators
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);
      
      const focusedElement = await page.locator(':focus');
      if (await focusedElement.isVisible()) {
        const focusBox = await focusedElement.boundingBox();
        console.log(`${viewport.name} focus target size: ${focusBox?.width}x${focusBox?.height}`);
        
        await page.screenshot({ 
          path: `reports/screenshots/responsive-focus-${viewport.name}.png`,
          fullPage: true 
        });
      }
    }
  });
});
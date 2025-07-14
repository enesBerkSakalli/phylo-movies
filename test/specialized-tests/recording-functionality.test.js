import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Recording Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('screen recording workflow', async ({ page }) => {
    // Load tree for recording
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile);
    
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Screenshot initial state
    await page.screenshot({ 
      path: 'reports/screenshots/recording-initial-state.png',
      fullPage: true 
    });

    // Look for recording functionality
    const recordingTriggers = [
      'button:has-text("videocam")',
      'button:has-text("record")',
      '.record-btn',
      '.recording-btn',
      'button[title*="record"]',
      'button[aria-label*="record"]',
      '.record-control',
      'button:has-text("fiber_manual_record")'
    ];

    let recordingFound = false;
    for (const trigger of recordingTriggers) {
      const element = await page.locator(trigger);
      if (await element.isVisible()) {
        console.log(`Found recording trigger: ${trigger}`);
        
        // Start recording
        await element.click();
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
          path: 'reports/screenshots/recording-started.png',
          fullPage: true 
        });
        
        recordingFound = true;
        
        // Perform some actions while recording
        const playButton = await page.locator('button:has-text("play_arrow")');
        if (await playButton.isVisible()) {
          await playButton.click();
          await page.waitForTimeout(3000);
          
          await page.screenshot({ 
            path: 'reports/screenshots/recording-during-animation.png',
            fullPage: true 
          });
        }

        // Stop recording
        const stopButton = await page.locator('button:has-text("stop"), .stop-btn');
        if (await stopButton.isVisible()) {
          await stopButton.click();
          await page.waitForTimeout(1000);
          
          await page.screenshot({ 
            path: 'reports/screenshots/recording-stopped.png',
            fullPage: true 
          });
        } else {
          // Try clicking the same button again to stop
          await element.click();
          await page.waitForTimeout(1000);
          
          await page.screenshot({ 
            path: 'reports/screenshots/recording-toggle-stopped.png',
            fullPage: true 
          });
        }
        
        break;
      }
    }

    if (!recordingFound) {
      console.log('No recording functionality found');
      
      // Check browser media permissions
      const context = page.context();
      try {
        await context.grantPermissions(['camera', 'microphone'], { origin: 'http://localhost:5173' });
        console.log('Granted media permissions');
      } catch (error) {
        console.log('Could not grant media permissions:', error.message);
      }
      
      await page.screenshot({ 
        path: 'reports/screenshots/recording-not-found.png',
        fullPage: true 
      });
    }

    // Check for download functionality
    const downloadTriggers = [
      'button:has-text("download")',
      'button:has-text("save")',
      '.download-btn',
      'a[download]',
      'button[title*="download"]'
    ];

    for (const trigger of downloadTriggers) {
      const element = await page.locator(trigger);
      if (await element.isVisible()) {
        console.log(`Found download trigger: ${trigger}`);
        await page.screenshot({ 
          path: 'reports/screenshots/recording-download-available.png',
          clip: await element.boundingBox()
        });
        break;
      }
    }
  });

  test('recording controls and status', async ({ page }) => {
    // Load tree
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile);
    
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check for recording status indicators
    const statusIndicators = [
      '.recording-status',
      '.record-indicator',
      '.recording-light',
      '[data-recording="true"]',
      '.rec-status'
    ];

    for (const indicator of statusIndicators) {
      const element = await page.locator(indicator);
      if (await element.isVisible()) {
        console.log(`Found recording status indicator: ${indicator}`);
        await page.screenshot({ 
          path: 'reports/screenshots/recording-status-indicator.png',
          clip: await element.boundingBox()
        });
      }
    }

    // Test recording quality settings
    const qualitySettings = await page.locator('.quality-settings, .recording-options, .video-settings');
    if (await qualitySettings.isVisible()) {
      await qualitySettings.click();
      await page.waitForTimeout(500);
      
      await page.screenshot({ 
        path: 'reports/screenshots/recording-quality-settings.png',
        fullPage: true 
      });
    }
  });

  test('recording with different content types', async ({ page }) => {
    // Test recording with different visualization states
    const scenarios = [
      { name: 'static-tree', action: null },
      { name: 'animated-tree', action: () => page.locator('button:has-text("play_arrow")').click() },
      { name: 'zoomed-tree', action: () => page.mouse.wheel(0, -500) }
    ];

    for (const scenario of scenarios) {
      // Reset page state
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Load tree
      const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(treeFile);
      
      await page.waitForSelector('svg', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Apply scenario action
      if (scenario.action) {
        await scenario.action();
        await page.waitForTimeout(1000);
      }

      await page.screenshot({ 
        path: `reports/screenshots/recording-${scenario.name}.png`,
        fullPage: true 
      });

      // Look for recording button and test if available
      const recordButton = await page.locator('button:has-text("videocam"), button:has-text("record"), .record-btn');
      if (await recordButton.isVisible()) {
        await recordButton.hover();
        await page.waitForTimeout(300);
        
        await page.screenshot({ 
          path: `reports/screenshots/recording-${scenario.name}-ready.png`,
          fullPage: true 
        });
      }
    }
  });

  test('browser media API support', async ({ page }) => {
    // Test browser support for recording APIs
    const mediaSupport = await page.evaluate(() => {
      return {
        mediaRecorder: typeof MediaRecorder !== 'undefined',
        getUserMedia: typeof navigator.mediaDevices?.getUserMedia === 'function',
        getDisplayMedia: typeof navigator.mediaDevices?.getDisplayMedia === 'function',
        webrtc: typeof RTCPeerConnection !== 'undefined'
      };
    });

    console.log('Browser media API support:', mediaSupport);

    // Test media permissions
    try {
      await page.context().grantPermissions(['camera', 'microphone'], { 
        origin: 'http://localhost:5173' 
      });
      console.log('Media permissions granted successfully');
    } catch (error) {
      console.log('Media permissions error:', error.message);
    }

    await page.screenshot({ 
      path: 'reports/screenshots/recording-browser-support.png',
      fullPage: true 
    });
  });
});
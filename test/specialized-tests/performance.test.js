import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('large dataset loading performance', async ({ page }) => {
    // Test with progressively larger datasets
    const testFiles = [
      { name: 'small', file: '../../data/test-data/hiv_index_2.tree', expectedNodes: '<50' },
      { name: 'medium', file: '../../data/test-data/hiv_index_86.tree', expectedNodes: '50-200' },
      { name: 'large', file: '../../data/test-data/hiv-421trees-midpoint-rooted.tree', expectedNodes: '>200' }
    ];

    const performanceResults = [];

    for (const testFile of testFiles) {
      try {
        const filePath = path.join(__dirname, testFile.file);
        
        // Measure load time
        const startTime = Date.now();
        
        const fileInput = await page.locator('input[type="file"]');
        await fileInput.setInputFiles(filePath);
        
        // Wait for tree to appear
        await page.waitForSelector('svg', { timeout: 30000 });
        await page.waitForTimeout(2000); // Allow for rendering
        
        const loadTime = Date.now() - startTime;
        
        // Count nodes for verification
        const nodes = await page.locator('svg circle, svg .node');
        const nodeCount = await nodes.count();
        
        // Measure render performance
        const renderStartTime = Date.now();
        await page.mouse.wheel(0, -200); // Zoom operation
        await page.waitForTimeout(1000);
        const renderTime = Date.now() - renderStartTime;
        
        performanceResults.push({
          dataset: testFile.name,
          loadTime,
          nodeCount,
          renderTime,
          expectedNodes: testFile.expectedNodes
        });
        
        console.log(`${testFile.name} dataset: ${loadTime}ms load, ${nodeCount} nodes, ${renderTime}ms render`);
        
        await page.screenshot({ 
          path: `reports/screenshots/performance-${testFile.name}-dataset.png`,
          fullPage: true 
        });

        // Test memory usage
        const memoryUsage = await page.evaluate(() => {
          if (performance.memory) {
            return {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
              jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
          }
          return null;
        });
        
        if (memoryUsage) {
          console.log(`Memory usage for ${testFile.name}:`, memoryUsage);
        }

      } catch (error) {
        console.log(`Performance test failed for ${testFile.name}:`, error.message);
        await page.screenshot({ 
          path: `reports/screenshots/performance-${testFile.name}-failed.png`,
          fullPage: true 
        });
      }
    }

    // Create performance summary
    console.log('Performance Results Summary:', performanceResults);
  });

  test('animation performance measurement', async ({ page }) => {
    // Load medium-sized tree for animation testing
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_86.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile);
    
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Screenshot initial state
    await page.screenshot({ 
      path: 'reports/screenshots/performance-animation-initial.png',
      fullPage: true 
    });

    // Start performance monitoring
    await page.evaluate(() => {
      window.performanceMetrics = {
        frameCount: 0,
        startTime: performance.now(),
        frameTimes: []
      };
      
      function recordFrame() {
        const now = performance.now();
        window.performanceMetrics.frameCount++;
        window.performanceMetrics.frameTimes.push(now);
        requestAnimationFrame(recordFrame);
      }
      requestAnimationFrame(recordFrame);
    });

    // Start animation
    const playButton = await page.locator('button:has-text("play_arrow")');
    if (await playButton.isVisible()) {
      await playButton.click();
      
      // Let animation run for 5 seconds
      await page.waitForTimeout(5000);
      
      // Stop animation
      const pauseButton = await page.locator('button:has-text("pause")');
      if (await pauseButton.isVisible()) {
        await pauseButton.click();
      }
      
      // Get performance metrics
      const metrics = await page.evaluate(() => {
        const m = window.performanceMetrics;
        const duration = performance.now() - m.startTime;
        const fps = (m.frameCount / duration) * 1000;
        
        // Calculate frame time statistics
        const frameDurations = [];
        for (let i = 1; i < m.frameTimes.length; i++) {
          frameDurations.push(m.frameTimes[i] - m.frameTimes[i-1]);
        }
        
        frameDurations.sort((a, b) => a - b);
        const avgFrameTime = frameDurations.reduce((sum, time) => sum + time, 0) / frameDurations.length;
        const medianFrameTime = frameDurations[Math.floor(frameDurations.length / 2)];
        const p95FrameTime = frameDurations[Math.floor(frameDurations.length * 0.95)];
        
        return {
          duration,
          frameCount: m.frameCount,
          fps,
          avgFrameTime,
          medianFrameTime,
          p95FrameTime
        };
      });
      
      console.log('Animation Performance Metrics:', metrics);
      
      await page.screenshot({ 
        path: 'reports/screenshots/performance-animation-completed.png',
        fullPage: true 
      });
    }
  });

  test('zoom and pan performance', async ({ page }) => {
    // Load tree
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_86.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile);
    
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Test zoom performance
    const zoomOperations = [
      { name: 'zoom-in', operation: () => page.mouse.wheel(0, -500) },
      { name: 'zoom-out', operation: () => page.mouse.wheel(0, 500) },
      { name: 'pan-right', operation: () => page.mouse.move(400, 300).then(() => page.mouse.down()).then(() => page.mouse.move(600, 300)).then(() => page.mouse.up()) },
      { name: 'pan-left', operation: () => page.mouse.move(600, 300).then(() => page.mouse.down()).then(() => page.mouse.move(400, 300)).then(() => page.mouse.up()) }
    ];

    for (const zoom of zoomOperations) {
      const startTime = Date.now();
      await zoom.operation();
      await page.waitForTimeout(500); // Allow for smooth transition
      const operationTime = Date.now() - startTime;
      
      console.log(`${zoom.name} operation took ${operationTime}ms`);
      
      await page.screenshot({ 
        path: `reports/screenshots/performance-${zoom.name}.png`,
        fullPage: true 
      });
    }
  });

  test('DOM node count and complexity', async ({ page }) => {
    const testFiles = [
      '../../data/test-data/hiv_index_2.tree',
      '../../data/test-data/hiv_index_86.tree'
    ];

    for (const [index, file] of testFiles.entries()) {
      const filePath = path.join(__dirname, file);
      
      // Clear previous tree
      if (index > 0) {
        await page.reload();
        await page.waitForLoadState('networkidle');
      }
      
      const fileInput = await page.locator('input[type="file"]');
      await fileInput.setInputFiles(filePath);
      
      await page.waitForSelector('svg', { timeout: 10000 });
      await page.waitForTimeout(2000);
      
      // Count DOM elements
      const domStats = await page.evaluate(() => {
        return {
          totalElements: document.querySelectorAll('*').length,
          svgElements: document.querySelectorAll('svg *').length,
          circles: document.querySelectorAll('circle').length,
          paths: document.querySelectorAll('path').length,
          texts: document.querySelectorAll('text').length,
          groups: document.querySelectorAll('g').length
        };
      });
      
      console.log(`DOM stats for file ${index}:`, domStats);
      
      await page.screenshot({ 
        path: `reports/screenshots/performance-dom-complexity-${index}.png`,
        fullPage: true 
      });
    }
  });

  test('resource loading and caching', async ({ page }) => {
    // Monitor network requests
    const networkRequests = [];
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: Date.now()
      });
    });

    page.on('response', response => {
      const request = networkRequests.find(req => req.url === response.url());
      if (request) {
        request.status = response.status();
        request.responseTime = Date.now() - request.timestamp;
      }
    });

    // Load tree and measure resource usage
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_2.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile);
    
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Analyze network requests
    const jsRequests = networkRequests.filter(req => req.resourceType === 'script');
    const cssRequests = networkRequests.filter(req => req.resourceType === 'stylesheet');
    const imageRequests = networkRequests.filter(req => req.resourceType === 'image');
    
    console.log('Network Performance:');
    console.log(`JS files: ${jsRequests.length}`);
    console.log(`CSS files: ${cssRequests.length}`);
    console.log(`Images: ${imageRequests.length}`);
    console.log(`Total requests: ${networkRequests.length}`);
    
    // Test second load (caching)
    await page.reload();
    const cacheStartTime = Date.now();
    await page.waitForLoadState('networkidle');
    const cacheLoadTime = Date.now() - cacheStartTime;
    
    console.log(`Cache load time: ${cacheLoadTime}ms`);
    
    await page.screenshot({ 
      path: 'reports/screenshots/performance-resource-loading.png',
      fullPage: true 
    });
  });

  test('browser performance metrics', async ({ page }) => {
    // Load tree
    const treeFile = path.join(__dirname, '../../data/test-data/hiv_index_86.tree');
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(treeFile);
    
    await page.waitForSelector('svg', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Get detailed performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      return {
        navigation: navigation ? {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          domInteractive: navigation.domInteractive - navigation.navigationStart,
          totalTime: navigation.loadEventEnd - navigation.navigationStart
        } : null,
        paint: paint.map(p => ({ name: p.name, startTime: p.startTime })),
        memory: performance.memory ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        } : null
      };
    });
    
    console.log('Browser Performance Metrics:', performanceMetrics);
    
    await page.screenshot({ 
      path: 'reports/screenshots/performance-metrics.png',
      fullPage: true 
    });
  });
});
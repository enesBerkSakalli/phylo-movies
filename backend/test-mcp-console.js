#!/usr/bin/env node

/**
 * Test script to verify MCP console logging functionality
 */

const { exec } = require('child_process');
const fs = require('fs');

console.log('🧪 Testing MCP Console Logging Functionality');
console.log('==============================================');

// Test 1: Check if browser-tools-server is running
console.log('\n1. Testing browser-tools-server connection...');
exec('curl -s http://localhost:3025', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Browser-tools-server not accessible');
    return;
  }
  console.log('✅ Browser-tools-server is running');
  
  // Test 2: Check if we can simulate console.log capture
  console.log('\n2. Simulating console.log capture...');
  
  // Create a test HTML file with console.log statements
  const testHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>MCP Console Test</title>
</head>
<body>
    <h1>Testing MCP Console Logging</h1>
    <script>
        console.log('[LinkRenderer] Testing console.log capture');
        console.error('[LinkRenderer] Error getting stroke width:', new Error('test error'));
        console.warn('[LinkRenderer] Warning message');
        console.info('[LinkRenderer] Info message');
        
        // Simulate your LinkRenderer.js errors
        setTimeout(() => {
            console.error('[LinkRenderer] Error getting stroke color:', new Error('color error'), {test: 'data'});
        }, 1000);
        
        setTimeout(() => {
            console.log('[LinkRenderer] Animation completed successfully');
        }, 2000);
    </script>
</body>
</html>`;

  fs.writeFileSync('/tmp/mcp-test.html', testHTML);
  console.log('✅ Created test HTML file: /tmp/mcp-test.html');
  
  console.log('\n3. Instructions to test MCP console logging:');
  console.log('==========================================');
  console.log('1. Open Chrome with DevTools');
  console.log('2. Navigate to: file:///tmp/mcp-test.html');
  console.log('3. Open the BrowserToolsMCP panel in DevTools');
  console.log('4. Use MCP commands like:');
  console.log('   - "Show me all console errors"');
  console.log('   - "Get console logs from LinkRenderer"');
  console.log('   - "Check for JavaScript errors"');
  console.log('');
  console.log('5. Or test with your actual app:');
  console.log('   - Navigate to: http://127.0.0.1:5173/ (your phylo-movies app)');
  console.log('   - Open DevTools and BrowserToolsMCP panel');
  console.log('   - Use MCP to capture LinkRenderer.js console logs');
  
  console.log('\n4. Expected MCP Tools Available:');
  console.log('================================');
  console.log('✓ get_console_logs - Get browser console logs');
  console.log('✓ take_screenshot - Capture current page');
  console.log('✓ get_selected_element - Get DOM element');
  console.log('✓ get_network_logs - Get network requests');
  console.log('✓ clear_logs - Clear stored logs');
  console.log('✓ runDebuggerMode - Complete debugging sequence');
  
  console.log('\n🎉 MCP Console Logging Test Setup Complete!');
  console.log('Open Chrome and test the functionality manually.');
});
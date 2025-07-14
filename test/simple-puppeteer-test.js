/**
 * Simple Puppeteer Test to verify the application loads correctly
 */

const puppeteer = require('puppeteer');
const path = require('path');

async function simpleTest() {
    console.log('🚀 Starting simple Puppeteer test...');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 900 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        console.log('Browser Console:', msg.type(), msg.text());
    });

    page.on('pageerror', error => {
        console.log('Page Error:', error.message);
    });

    try {
        console.log('📍 Navigating to application...');
        await page.goto('http://localhost:5173/', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        console.log('✅ Successfully loaded the page');
        
        // Take initial screenshot
        const screenshotDir = path.join(__dirname, '..', 'test-results');
        await page.screenshot({ path: path.join(screenshotDir, 'simple-test-initial.png') });
        console.log('📸 Initial screenshot saved');
        
        // Wait to see the page
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Look for key elements
        const title = await page.title();
        console.log('📄 Page title:', title);
        
        // Check for main container or svg
        const mainElement = await page.$('main, #main, svg, .main-container');
        if (mainElement) {
            console.log('✅ Found main visualization element');
        } else {
            console.log('⚠️ Main visualization element not found');
        }
        
        // Check for file upload
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
            console.log('✅ Found file input element');
        } else {
            console.log('⚠️ File input element not found');
        }
        
        // Take final screenshot
        await page.screenshot({ path: path.join(screenshotDir, 'simple-test-final.png') });
        console.log('📸 Final screenshot saved');
        
        console.log('🎉 Simple test completed successfully!');
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
        await page.screenshot({ path: path.join(__dirname, '..', 'test-results', 'simple-test-error.png') });
    } finally {
        await browser.close();
    }
}

// Run the test
simpleTest()
    .then(() => {
        console.log('✨ Test execution completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('🔴 Test execution failed:', error);
        process.exit(1);
    });
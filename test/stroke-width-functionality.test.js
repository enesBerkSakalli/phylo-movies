const puppeteer = require('puppeteer');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs');

describe('Stroke Width Functionality Test', function() {
    this.timeout(60000); // 60 seconds timeout for browser operations
    
    let browser;
    let page;
    const baseUrl = 'http://127.0.0.1:5173';
    const testTreePath = path.join(__dirname, '../data/small_example/small_example.tree');
    
    before(async function() {
        // Verify test file exists
        if (!fs.existsSync(testTreePath)) {
            throw new Error(`Test tree file not found at: ${testTreePath}`);
        }
        
        // Launch browser
        browser = await puppeteer.launch({
            headless: false, // Set to true for CI/CD
            devtools: false,
            defaultViewport: { width: 1280, height: 800 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        page = await browser.newPage();
        
        // Listen to console messages for debugging
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                console.log('Browser console error:', msg.text());
            }
        });
        
        // Listen to page errors
        page.on('pageerror', (error) => {
            console.log('Page error:', error.message);
        });
    });
    
    after(async function() {
        if (browser) {
            await browser.close();
        }
    });
    
    it('should complete the full stroke width testing workflow', async function() {
        console.log('Starting stroke width functionality test...');
        
        // Step 1: Navigate to the landing page
        console.log('Step 1: Navigating to landing page...');
        await page.goto(baseUrl, { waitUntil: 'networkidle2' });
        
        // Step 2: Upload the tree file using FilePond
        console.log('Step 2: Uploading tree file...');
        
        // Wait for page to be fully loaded
        await page.waitForSelector('#trees', { timeout: 10000 });
        
        // Try to upload file to the actual hidden input element
        const hiddenInput = await page.$('input[type="file"]#trees');
        if (hiddenInput) {
            await hiddenInput.uploadFile(testTreePath);
            console.log('File uploaded successfully');
        } else {
            // Alternative approach - use page.evaluate to set the file
            console.log('Trying alternative file upload approach...');
            await page.evaluate(() => {
                // Trigger the FilePond file browser
                const fileInput = document.querySelector('input[type="file"]#trees');
                if (fileInput) {
                    fileInput.click();
                }
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Upload to any file input found
            const anyFileInput = await page.$('input[type="file"]');
            if (anyFileInput) {
                await anyFileInput.uploadFile(testTreePath);
            } else {
                throw new Error('Could not find any file input element');
            }
        }
        
        // Wait for file to be processed
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Submit the form
        const submitButton = await page.$('button[type="submit"]');
        expect(submitButton).to.not.be.null;
        await submitButton.click();
        
        // Step 3: Wait for redirect to visualization page
        console.log('Step 3: Waiting for redirect to visualization page...');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        // Verify we're on the visualization page
        const currentUrl = page.url();
        expect(currentUrl).to.include('visualization.html');
        
        // Step 4: Wait for tree to load completely
        console.log('Step 4: Waiting for tree to load...');
        
        // Wait for the main SVG container
        await page.waitForSelector('#application-container svg', { timeout: 30000 });
        
        // Wait for tree paths to be rendered
        await page.waitForSelector('#application-container svg path', { timeout: 30000 });
        
        // Wait for appearance panel to be loaded
        await page.waitForSelector('#appearance-submenu', { timeout: 30000 });
        
        // Additional wait to ensure all rendering is complete
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 5: Take screenshot of initial state
        console.log('Step 5: Taking initial screenshot...');
        await page.screenshot({ 
            path: path.join(__dirname, '../reports/stroke-width-initial.png'),
            fullPage: true 
        });
        
        // Step 6: Locate and test stroke width slider
        console.log('Step 6: Testing stroke width slider...');
        
        // Wait for appearance panel to be available
        await page.waitForSelector('#appearance-submenu', { timeout: 10000 });
        
        // Find the stroke width slider
        const strokeWidthSlider = await page.$('#stroke-width');
        expect(strokeWidthSlider).to.not.be.null;
        
        // Get initial stroke width value
        const initialValue = await page.$eval('#stroke-width', el => el.value);
        console.log(`Initial stroke width value: ${initialValue}`);
        
        // Get initial stroke width display
        const initialDisplayValue = await page.$eval('#stroke-width-value', el => el.textContent);
        console.log(`Initial display value: ${initialDisplayValue}`);
        
        // Get initial SVG stroke-width attributes
        const initialStrokeWidths = await page.evaluate(() => {
            const paths = document.querySelectorAll('#application-container svg path');
            return Array.from(paths).slice(0, 5).map(path => ({
                strokeWidth: path.getAttribute('stroke-width') || path.style.strokeWidth,
                id: path.id || 'no-id'
            }));
        });
        console.log('Initial stroke widths in SVG:', initialStrokeWidths);
        
        // Step 7: Change to thin branches (1.5)
        console.log('Step 7: Changing to thin branches (1.5)...');
        
        // Set slider to 1.5
        await page.$eval('#stroke-width', el => {
            el.value = '1.5';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        
        // Wait for update to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify the display was updated
        const thinDisplayValue = await page.$eval('#stroke-width-value', el => el.textContent);
        console.log(`Thin branches display value: ${thinDisplayValue}`);
        expect(thinDisplayValue).to.equal('1.5');
        
        // Take screenshot after thin change
        await page.screenshot({ 
            path: path.join(__dirname, '../reports/stroke-width-thin.png'),
            fullPage: true 
        });
        
        // Get stroke widths after thin change
        const thinStrokeWidths = await page.evaluate(() => {
            const paths = document.querySelectorAll('#application-container svg path');
            return Array.from(paths).slice(0, 5).map(path => ({
                strokeWidth: path.getAttribute('stroke-width') || path.style.strokeWidth,
                id: path.id || 'no-id'
            }));
        });
        console.log('Thin stroke widths in SVG:', thinStrokeWidths);
        
        // Step 8: Change to thick branches (6)
        console.log('Step 8: Changing to thick branches (6)...');
        
        // Set slider to 6
        await page.$eval('#stroke-width', el => {
            el.value = '6';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        
        // Wait for update to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify the display was updated
        const thickDisplayValue = await page.$eval('#stroke-width-value', el => el.textContent);
        console.log(`Thick branches display value: ${thickDisplayValue}`);
        expect(thickDisplayValue).to.equal('6');
        
        // Take screenshot after thick change
        await page.screenshot({ 
            path: path.join(__dirname, '../reports/stroke-width-thick.png'),
            fullPage: true 
        });
        
        // Get stroke widths after thick change
        const thickStrokeWidths = await page.evaluate(() => {
            const paths = document.querySelectorAll('#application-container svg path');
            return Array.from(paths).slice(0, 5).map(path => ({
                strokeWidth: path.getAttribute('stroke-width') || path.style.strokeWidth,
                id: path.id || 'no-id'
            }));
        });
        console.log('Thick stroke widths in SVG:', thickStrokeWidths);
        
        // Step 9: Verify stroke width changes
        console.log('Step 9: Verifying stroke width changes...');
        
        // Test that the values changed appropriately
        // Note: The actual stroke-width might be scaled or have a multiplier
        
        // Extract numeric values for comparison
        const extractNumeric = (strokeWidthStr) => {
            if (!strokeWidthStr) return 0;
            const match = strokeWidthStr.match(/[\d.]+/);
            return match ? parseFloat(match[0]) : 0;
        };
        
        const initialNumeric = extractNumeric(initialStrokeWidths[0]?.strokeWidth);
        const thinNumeric = extractNumeric(thinStrokeWidths[0]?.strokeWidth);
        const thickNumeric = extractNumeric(thickStrokeWidths[0]?.strokeWidth);
        
        console.log('Numeric stroke widths:', {
            initial: initialNumeric,
            thin: thinNumeric,
            thick: thickNumeric
        });
        
        // Verify that changes occurred in the correct direction
        expect(thinNumeric).to.be.lessThan(initialNumeric, 'Thin stroke width should be less than initial');
        expect(thickNumeric).to.be.greaterThan(initialNumeric, 'Thick stroke width should be greater than initial');
        expect(thickNumeric).to.be.greaterThan(thinNumeric, 'Thick stroke width should be greater than thin');
        
        // Test the relationship between slider value and actual stroke width
        // This might be proportional rather than exact
        const initialSliderValue = parseFloat(initialValue);
        const thinSliderValue = 1.5;
        const thickSliderValue = 6;
        
        // Calculate expected ratios
        const thinRatio = thinSliderValue / initialSliderValue;
        const thickRatio = thickSliderValue / initialSliderValue;
        
        const actualThinRatio = thinNumeric / initialNumeric;
        const actualThickRatio = thickNumeric / initialNumeric;
        
        console.log('Expected vs Actual ratios:', {
            expectedThin: thinRatio,
            actualThin: actualThinRatio,
            expectedThick: thickRatio,
            actualThick: actualThickRatio
        });
        
        // Allow for some tolerance in the ratio comparison (±10%)
        const tolerance = 0.1;
        expect(Math.abs(actualThinRatio - thinRatio)).to.be.lessThan(tolerance, 
            `Thin ratio should be close to expected (${thinRatio}), but got ${actualThinRatio}`);
        expect(Math.abs(actualThickRatio - thickRatio)).to.be.lessThan(tolerance,
            `Thick ratio should be close to expected (${thickRatio}), but got ${actualThickRatio}`);
        
        // Step 10: Test slider bounds
        console.log('Step 10: Testing slider bounds...');
        
        // Test minimum value (1)
        await page.$eval('#stroke-width', el => {
            el.value = '1';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const minDisplayValue = await page.$eval('#stroke-width-value', el => el.textContent);
        expect(minDisplayValue).to.equal('1');
        
        // Test maximum value (6)
        await page.$eval('#stroke-width', el => {
            el.value = '6';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const maxDisplayValue = await page.$eval('#stroke-width-value', el => el.textContent);
        expect(maxDisplayValue).to.equal('6');
        
        // Test intermediate value (3.5)
        await page.$eval('#stroke-width', el => {
            el.value = '3.5';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const midDisplayValue = await page.$eval('#stroke-width-value', el => el.textContent);
        expect(midDisplayValue).to.equal('3.5');
        
        console.log('Stroke width functionality test completed successfully!');
        
        // Final screenshot showing working state
        await page.screenshot({ 
            path: path.join(__dirname, '../reports/stroke-width-final.png'),
            fullPage: true 
        });
    });
    
    it('should have correct slider attributes and DOM structure', async function() {
        console.log('Testing DOM structure and slider attributes...');
        
        // Ensure we're on the visualization page
        const currentUrl = page.url();
        if (!currentUrl.includes('visualization.html')) {
            console.log('Not on visualization page, skipping edge case test');
            this.skip();
            return;
        }
        
        // Wait for elements to be loaded
        await page.waitForSelector('#stroke-width', { timeout: 10000 });
        
        // Test that the slider exists and has correct attributes
        const sliderAttributes = await page.evaluate(() => {
            const slider = document.getElementById('stroke-width');
            if (!slider) return null;
            
            return {
                min: slider.min,
                max: slider.max,
                step: slider.step,
                type: slider.type,
                value: slider.value
            };
        });
        
        expect(sliderAttributes).to.not.be.null;
        expect(sliderAttributes.min).to.equal('1');
        expect(sliderAttributes.max).to.equal('6');
        expect(sliderAttributes.step).to.equal('0.5');
        expect(sliderAttributes.type).to.equal('range');
        
        // Test that the display element exists
        const displayElement = await page.$('#stroke-width-value');
        expect(displayElement).to.not.be.null;
        
        // Test that tree paths exist
        const pathsExist = await page.evaluate(() => {
            const paths = document.querySelectorAll('#application-container svg path');
            return paths.length > 0;
        });
        expect(pathsExist).to.be.true;
        
        console.log('DOM structure and slider attributes test completed successfully!');
    });
});
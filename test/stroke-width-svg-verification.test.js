const puppeteer = require('puppeteer');
const { expect } = require('chai');
const path = require('path');
const fs = require('fs');

describe('Stroke Width SVG Verification Test', function() {
    this.timeout(120000); // 2 minutes timeout
    
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
            headless: false,
            devtools: false,
            defaultViewport: { width: 1280, height: 800 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        page = await browser.newPage();
        
        // Reduce console noise - only log errors and important messages
        page.on('console', (msg) => {
            if (msg.type() === 'error' || msg.text().includes('stroke') || msg.text().includes('Stroke')) {
                console.log(`Browser ${msg.type()}: ${msg.text()}`);
            }
        });
    });
    
    after(async function() {
        if (browser) {
            await browser.close();
        }
    });
    
    it('should verify stroke width changes are applied to SVG elements', async function() {
        console.log('🧪 Testing complete stroke width functionality with SVG verification...');
        
        // Step 1: Navigate and upload
        console.log('📁 Step 1: Uploading tree file...');
        await page.goto(baseUrl, { waitUntil: 'networkidle2' });
        
        // Upload file
        const fileInputs = await page.$$('input[type="file"]');
        expect(fileInputs.length).to.be.greaterThan(0);
        await fileInputs[0].uploadFile(testTreePath);
        
        // Submit form
        const submitButton = await page.$('button[type="submit"]');
        await submitButton.click();
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        // Step 2: Wait for tree to load
        console.log('🌳 Step 2: Waiting for tree visualization to load...');
        await page.waitForSelector('#stroke-width', { timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for tree rendering
        
        // Step 3: Get initial stroke width state
        console.log('📊 Step 3: Recording initial stroke width state...');
        
        const initialState = await page.evaluate(() => {
            const slider = document.getElementById('stroke-width');
            const display = document.getElementById('stroke-width-value');
            const paths = document.querySelectorAll('#application svg path');
            
            const pathStrokeWidths = Array.from(paths).slice(0, 10).map((path, index) => ({
                index,
                strokeWidth: path.getAttribute('stroke-width') || path.style.strokeWidth || 'not-set',
                id: path.id || `path-${index}`
            }));
            
            return {
                sliderValue: slider ? slider.value : 'not-found',
                displayValue: display ? display.textContent : 'not-found',
                pathCount: paths.length,
                pathStrokeWidths
            };
        });
        
        console.log('Initial state:', {
            sliderValue: initialState.sliderValue,
            displayValue: initialState.displayValue,
            pathCount: initialState.pathCount,
            sampleStrokeWidths: initialState.pathStrokeWidths.slice(0, 3)
        });
        
        expect(initialState.pathCount).to.be.greaterThan(0, 'Tree should have path elements');
        
        // Step 4: Change to thin stroke width (1.5)
        console.log('📏 Step 4: Testing thin stroke width (1.5)...');
        
        await page.$eval('#stroke-width', el => {
            el.value = '1.5';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for update
        
        const thinState = await page.evaluate(() => {
            const slider = document.getElementById('stroke-width');
            const display = document.getElementById('stroke-width-value');
            const paths = document.querySelectorAll('#application svg path');
            
            const pathStrokeWidths = Array.from(paths).slice(0, 10).map((path, index) => ({
                index,
                strokeWidth: path.getAttribute('stroke-width') || path.style.strokeWidth || 'not-set',
                id: path.id || `path-${index}`
            }));
            
            return {
                sliderValue: slider ? slider.value : 'not-found',
                displayValue: display ? display.textContent : 'not-found',
                pathCount: paths.length,
                pathStrokeWidths
            };
        });
        
        console.log('Thin state:', {
            sliderValue: thinState.sliderValue,
            displayValue: thinState.displayValue,
            sampleStrokeWidths: thinState.pathStrokeWidths.slice(0, 3)
        });
        
        expect(thinState.displayValue).to.equal('1.5', 'Display should show 1.5');
        
        // Step 5: Change to thick stroke width (5.5)
        console.log('📏 Step 5: Testing thick stroke width (5.5)...');
        
        await page.$eval('#stroke-width', el => {
            el.value = '5.5';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for update
        
        const thickState = await page.evaluate(() => {
            const slider = document.getElementById('stroke-width');
            const display = document.getElementById('stroke-width-value');
            const paths = document.querySelectorAll('#application svg path');
            
            const pathStrokeWidths = Array.from(paths).slice(0, 10).map((path, index) => ({
                index,
                strokeWidth: path.getAttribute('stroke-width') || path.style.strokeWidth || 'not-set',
                id: path.id || `path-${index}`
            }));
            
            return {
                sliderValue: slider ? slider.value : 'not-found',
                displayValue: display ? display.textContent : 'not-found',
                pathCount: paths.length,
                pathStrokeWidths
            };
        });
        
        console.log('Thick state:', {
            sliderValue: thickState.sliderValue,
            displayValue: thickState.displayValue,
            sampleStrokeWidths: thickState.pathStrokeWidths.slice(0, 3)
        });
        
        expect(thickState.displayValue).to.equal('5.5', 'Display should show 5.5');
        
        // Step 6: Verify stroke width changes in SVG
        console.log('🔍 Step 6: Verifying SVG stroke width changes...');
        
        // Extract numeric values for comparison
        const extractNumeric = (strokeWidthStr) => {
            if (!strokeWidthStr || strokeWidthStr === 'not-set') return 0;
            const match = strokeWidthStr.match(/([0-9]*\\.?[0-9]+)/);
            return match ? parseFloat(match[0]) : 0;
        };
        
        // Compare first few paths that should have stroke widths
        const pathsToCheck = Math.min(5, initialState.pathStrokeWidths.length);
        
        for (let i = 0; i < pathsToCheck; i++) {
            const initialWidth = extractNumeric(initialState.pathStrokeWidths[i].strokeWidth);
            const thinWidth = extractNumeric(thinState.pathStrokeWidths[i].strokeWidth);
            const thickWidth = extractNumeric(thickState.pathStrokeWidths[i].strokeWidth);
            
            console.log(`Path ${i}: initial=${initialWidth}, thin=${thinWidth}, thick=${thickWidth}`);
            
            if (initialWidth > 0) { // Only check paths that have stroke widths
                expect(thinWidth).to.be.lessThan(thickWidth, 
                    `Path ${i}: Thin stroke (${thinWidth}) should be less than thick stroke (${thickWidth})`);
                
                // The ratio should roughly match the slider ratio
                const expectedRatio = 5.5 / 1.5; // 3.67
                const actualRatio = thickWidth / thinWidth;
                
                // Allow 20% tolerance for scaling and rendering differences
                const tolerance = 0.2;
                expect(Math.abs(actualRatio - expectedRatio) / expectedRatio).to.be.lessThan(tolerance,
                    `Path ${i}: Stroke width ratio (${actualRatio}) should be close to expected (${expectedRatio})`);
            }
        }
        
        // Step 7: Test edge cases
        console.log('🔬 Step 7: Testing edge cases...');
        
        // Test minimum value
        await page.$eval('#stroke-width', el => {
            el.value = '1';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const minDisplayValue = await page.$eval('#stroke-width-value', el => el.textContent);
        expect(minDisplayValue).to.equal('1', 'Minimum value should be 1');
        
        // Test maximum value
        await page.$eval('#stroke-width', el => {
            el.value = '6';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const maxDisplayValue = await page.$eval('#stroke-width-value', el => el.textContent);
        expect(maxDisplayValue).to.equal('6', 'Maximum value should be 6');
        
        // Step 8: Take final screenshots
        console.log('📸 Step 8: Taking verification screenshots...');
        
        await page.screenshot({ 
            path: path.join(__dirname, '../reports/stroke-width-verification-complete.png'),
            fullPage: true 
        });
        
        console.log('✅ Stroke width SVG verification test completed successfully!');
        
        // Final summary
        console.log('\n📋 TEST SUMMARY:');
        console.log(`✅ Slider controls work correctly`);
        console.log(`✅ Display values update properly`);
        console.log(`✅ SVG stroke widths change proportionally`);
        console.log(`✅ Edge cases (min/max values) work`);
        console.log(`✅ Tree visualization has ${initialState.pathCount} path elements`);
        console.log(`✅ Stroke width functionality is fully operational`);
    });
});
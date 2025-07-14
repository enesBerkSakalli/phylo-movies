/**
 * DOM Exploration Test to identify actual element selectors
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function exploreDOMTest() {
    console.log('🔍 Starting DOM exploration test...');
    
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 900 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    try {
        console.log('📍 Navigating to application...');
        await page.goto('http://localhost:5173/', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Take initial screenshot
        const screenshotDir = path.join(__dirname, '..', 'test-results');
        await page.screenshot({ path: path.join(screenshotDir, 'dom-exploration-initial.png') });
        
        // Upload file first
        console.log('📂 Uploading test file...');
        const testDataFile = path.join(__dirname, '..', 'data', 'norovirus_200_20', 'two_tree.newick');
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
            await fileInput.uploadFile(testDataFile);
            console.log('✅ File uploaded');
            
            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 5000));
            await page.screenshot({ path: path.join(screenshotDir, 'dom-exploration-after-upload.png') });
        }
        
        console.log('🔍 Exploring DOM structure...');
        
        // Get all elements with IDs
        const elementsWithIds = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('[id]'));
            return elements.map(el => ({
                id: el.id,
                tagName: el.tagName.toLowerCase(),
                type: el.type || '',
                className: el.className || '',
                textContent: el.textContent ? el.textContent.trim().substring(0, 50) : '',
                visible: el.offsetHeight > 0 && el.offsetWidth > 0
            }));
        });
        
        // Get all buttons
        const buttons = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
            return elements.map(el => ({
                id: el.id || '',
                className: el.className || '',
                textContent: el.textContent ? el.textContent.trim() : '',
                type: el.type || '',
                visible: el.offsetHeight > 0 && el.offsetWidth > 0
            }));
        });
        
        // Get all input elements
        const inputs = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('input, select, textarea'));
            return elements.map(el => ({
                id: el.id || '',
                name: el.name || '',
                type: el.type || '',
                className: el.className || '',
                placeholder: el.placeholder || '',
                visible: el.offsetHeight > 0 && el.offsetWidth > 0
            }));
        });
        
        // Get all elements with common UI class names
        const uiElements = await page.evaluate(() => {
            const selectors = [
                '.btn', '.button', '.control', '.slider', '.range', '.toggle',
                '.modal', '.sidebar', '.timeline', '.chart', '.nav', '.menu'
            ];
            
            const elements = [];
            selectors.forEach(selector => {
                const found = Array.from(document.querySelectorAll(selector));
                found.forEach(el => {
                    elements.push({
                        selector: selector,
                        id: el.id || '',
                        className: el.className || '',
                        textContent: el.textContent ? el.textContent.trim().substring(0, 50) : '',
                        visible: el.offsetHeight > 0 && el.offsetWidth > 0
                    });
                });
            });
            return elements;
        });
        
        // Look for SVG elements (tree visualization)
        const svgElements = await page.evaluate(() => {
            const svgs = Array.from(document.querySelectorAll('svg'));
            return svgs.map(svg => ({
                id: svg.id || '',
                className: svg.className.baseVal || '',
                width: svg.getAttribute('width') || svg.style.width || '',
                height: svg.getAttribute('height') || svg.style.height || '',
                childCount: svg.children.length,
                visible: svg.offsetHeight > 0 && svg.offsetWidth > 0
            }));
        });
        
        // Generate exploration report
        const explorationReport = {
            timestamp: new Date().toISOString(),
            elementsWithIds: elementsWithIds.filter(el => el.visible),
            buttons: buttons.filter(btn => btn.visible),
            inputs: inputs.filter(input => input.visible),
            uiElements: uiElements.filter(el => el.visible),
            svgElements: svgElements.filter(svg => svg.visible),
            recommendations: {
                playButtons: buttons.filter(btn => 
                    btn.textContent.toLowerCase().includes('play') ||
                    btn.textContent.toLowerCase().includes('start') ||
                    btn.className.toLowerCase().includes('play') ||
                    btn.id.toLowerCase().includes('play') ||
                    btn.id.toLowerCase().includes('start')
                ),
                navigationButtons: buttons.filter(btn =>
                    btn.textContent.toLowerCase().includes('forward') ||
                    btn.textContent.toLowerCase().includes('back') ||
                    btn.textContent.toLowerCase().includes('next') ||
                    btn.textContent.toLowerCase().includes('prev') ||
                    btn.className.toLowerCase().includes('nav') ||
                    btn.id.toLowerCase().includes('forward') ||
                    btn.id.toLowerCase().includes('backward')
                ),
                sliders: inputs.filter(input => 
                    input.type === 'range' ||
                    input.className.toLowerCase().includes('slider') ||
                    input.className.toLowerCase().includes('range')
                ),
                positionInputs: inputs.filter(input =>
                    input.id.toLowerCase().includes('position') ||
                    input.name.toLowerCase().includes('position') ||
                    input.placeholder.toLowerCase().includes('position')
                )
            }
        };
        
        // Save exploration report
        const reportPath = path.join(screenshotDir, 'dom-exploration-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(explorationReport, null, 2));
        
        console.log('📋 DOM Exploration Results:');
        console.log(`📍 Elements with IDs found: ${explorationReport.elementsWithIds.length}`);
        console.log(`🔘 Buttons found: ${explorationReport.buttons.length}`);
        console.log(`📝 Input elements found: ${explorationReport.inputs.length}`);
        console.log(`🎨 UI elements found: ${explorationReport.uiElements.length}`);
        console.log(`🌳 SVG elements found: ${explorationReport.svgElements.length}`);
        
        console.log('\n🎯 Recommendations for test selectors:');
        console.log('Play buttons:', explorationReport.recommendations.playButtons);
        console.log('Navigation buttons:', explorationReport.recommendations.navigationButtons);
        console.log('Sliders:', explorationReport.recommendations.sliders);
        console.log('Position inputs:', explorationReport.recommendations.positionInputs);
        
        await page.screenshot({ path: path.join(screenshotDir, 'dom-exploration-final.png') });
        console.log(`📋 Exploration report saved to: ${reportPath}`);
        
    } catch (error) {
        console.error('💥 DOM exploration failed:', error.message);
        await page.screenshot({ path: path.join(__dirname, '..', 'test-results', 'dom-exploration-error.png') });
    } finally {
        await browser.close();
    }
}

// Run the test
exploreDOMTest()
    .then(() => {
        console.log('✨ DOM exploration completed');
        process.exit(0);
    })
    .catch(error => {
        console.error('🔴 DOM exploration failed:', error);
        process.exit(1);
    });
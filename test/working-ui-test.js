/**
 * Working UI Test Suite - simplified and robust approach
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function runWorkingUITest() {
    console.log('🚀 Starting Working UI Test...');
    
    const screenshotDir = path.join(__dirname, '..', 'test-results', 'working-ui');
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1400, height: 900 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    const results = {
        passed: 0,
        failed: 0,
        tests: [],
        screenshots: []
    };

    async function takeScreenshot(name, description) {
        const filepath = path.join(screenshotDir, `${name}.png`);
        await page.screenshot({ path: filepath, fullPage: true });
        results.screenshots.push({ name: `${name}.png`, description, path: filepath });
        console.log(`📸 ${name}.png - ${description}`);
    }

    async function logTest(name, passed, error = null) {
        results.tests.push({ name, passed, error: error?.message, timestamp: new Date().toISOString() });
        if (passed) {
            results.passed++;
            console.log(`✅ ${name}`);
        } else {
            results.failed++;
            console.log(`❌ ${name}: ${error?.message || 'Unknown error'}`);
        }
    }

    try {
        console.log('📍 Navigating to application...');
        await page.goto('http://localhost:5173/', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        await takeScreenshot('01-initial-load', 'Initial page load');
        await logTest('Page Load', true);

        // Upload file
        console.log('📂 Uploading test file...');
        const testFile = path.join(__dirname, '..', 'data', 'norovirus_200_20', 'two_tree.newick');
        
        try {
            const fileInput = await page.$('input[type="file"]');
            if (fileInput) {
                await fileInput.uploadFile(testFile);
                await new Promise(resolve => setTimeout(resolve, 2000));
                await takeScreenshot('02-file-uploaded', 'File uploaded');
                await logTest('File Upload', true);
            } else {
                throw new Error('File input not found');
            }
        } catch (error) {
            await logTest('File Upload', false, error);
        }

        // Click Play button
        console.log('▶️ Starting visualization...');
        try {
            const playButton = await page.$('.btn.btn-primary.btn-lg');
            if (playButton) {
                await playButton.click();
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for visualization
                await takeScreenshot('03-visualization-started', 'Visualization started');
                await logTest('Start Visualization', true);
            } else {
                throw new Error('Play button not found');
            }
        } catch (error) {
            await logTest('Start Visualization', false, error);
        }

        // Test navigation after visualization loads
        console.log('🧪 Testing UI elements...');

        // Look for any buttons that appear after visualization
        const buttons = await page.$$('button, input[type="button"], input[type="submit"], .btn');
        console.log(`Found ${buttons.length} button-like elements`);

        for (let i = 0; i < Math.min(buttons.length, 10); i++) {
            try {
                const button = buttons[i];
                const buttonInfo = await button.evaluate(el => ({
                    id: el.id,
                    className: el.className,
                    textContent: el.textContent?.trim(),
                    type: el.type,
                    visible: el.offsetHeight > 0 && el.offsetWidth > 0
                }));

                if (buttonInfo.visible && buttonInfo.textContent && buttonInfo.textContent.length > 0) {
                    console.log(`🔘 Testing button: "${buttonInfo.textContent}" (${buttonInfo.className})`);
                    
                    await takeScreenshot(`04-before-button-${i}`, `Before clicking button: ${buttonInfo.textContent}`);
                    await button.click();
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await takeScreenshot(`05-after-button-${i}`, `After clicking button: ${buttonInfo.textContent}`);
                    
                    await logTest(`Button Click: ${buttonInfo.textContent}`, true);
                }
            } catch (error) {
                await logTest(`Button Click ${i}`, false, error);
            }
        }

        // Test range inputs (sliders)
        const rangeInputs = await page.$$('input[type="range"]');
        console.log(`Found ${rangeInputs.length} range slider elements`);

        for (let i = 0; i < rangeInputs.length; i++) {
            try {
                const slider = rangeInputs[i];
                const sliderInfo = await slider.evaluate(el => ({
                    id: el.id,
                    name: el.name,
                    min: el.min,
                    max: el.max,
                    value: el.value
                }));

                console.log(`🎚️ Testing slider: ${sliderInfo.id || sliderInfo.name || `slider-${i}`}`);
                
                await takeScreenshot(`06-before-slider-${i}`, `Before moving slider: ${sliderInfo.id}`);
                
                // Move slider to max
                await slider.evaluate(el => {
                    el.value = el.max;
                    el.dispatchEvent(new Event('input'));
                    el.dispatchEvent(new Event('change'));
                });
                
                await new Promise(resolve => setTimeout(resolve, 500));
                await takeScreenshot(`07-after-slider-${i}`, `After moving slider: ${sliderInfo.id}`);
                
                await logTest(`Slider Test: ${sliderInfo.id || `slider-${i}`}`, true);
            } catch (error) {
                await logTest(`Slider Test ${i}`, false, error);
            }
        }

        // Test text inputs
        const textInputs = await page.$$('input[type="text"], input[type="number"]');
        console.log(`Found ${textInputs.length} text input elements`);

        for (let i = 0; i < Math.min(textInputs.length, 5); i++) {
            try {
                const input = textInputs[i];
                const inputInfo = await input.evaluate(el => ({
                    id: el.id,
                    name: el.name,
                    placeholder: el.placeholder,
                    value: el.value
                }));

                if (inputInfo.id !== 'windowSize' && inputInfo.id !== 'window-step-size') {
                    console.log(`📝 Testing input: ${inputInfo.id || inputInfo.name || `input-${i}`}`);
                    
                    await takeScreenshot(`08-before-input-${i}`, `Before typing in input: ${inputInfo.id}`);
                    
                    await input.click({ clickCount: 3 }); // Select all
                    await input.type('42');
                    await input.press('Enter');
                    
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await takeScreenshot(`09-after-input-${i}`, `After typing in input: ${inputInfo.id}`);
                    
                    await logTest(`Input Test: ${inputInfo.id || `input-${i}`}`, true);
                }
            } catch (error) {
                await logTest(`Input Test ${i}`, false, error);
            }
        }

        // Test checkbox toggles
        const checkboxes = await page.$$('input[type="checkbox"]');
        console.log(`Found ${checkboxes.length} checkbox elements`);

        for (let i = 0; i < checkboxes.length; i++) {
            try {
                const checkbox = checkboxes[i];
                const checkboxInfo = await checkbox.evaluate(el => ({
                    id: el.id,
                    name: el.name,
                    checked: el.checked
                }));

                console.log(`☑️ Testing checkbox: ${checkboxInfo.id || checkboxInfo.name || `checkbox-${i}`}`);
                
                await takeScreenshot(`10-before-checkbox-${i}`, `Before toggling checkbox: ${checkboxInfo.id}`);
                await checkbox.click();
                await new Promise(resolve => setTimeout(resolve, 500));
                await takeScreenshot(`11-after-checkbox-${i}`, `After toggling checkbox: ${checkboxInfo.id}`);
                
                await logTest(`Checkbox Test: ${checkboxInfo.id || `checkbox-${i}`}`, true);
            } catch (error) {
                await logTest(`Checkbox Test ${i}`, false, error);
            }
        }

        // Look for SVG (tree visualization)
        const svgElements = await page.$$('svg');
        console.log(`Found ${svgElements.length} SVG elements`);

        if (svgElements.length > 0) {
            try {
                await takeScreenshot('12-tree-visualization', 'Tree visualization SVG');
                
                // Click on the first SVG
                const svg = svgElements[0];
                const boundingBox = await svg.boundingBox();
                if (boundingBox) {
                    await page.mouse.click(
                        boundingBox.x + boundingBox.width / 2,
                        boundingBox.y + boundingBox.height / 2
                    );
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await takeScreenshot('13-svg-clicked', 'After clicking on SVG');
                }
                
                await logTest('Tree Visualization Interaction', true);
            } catch (error) {
                await logTest('Tree Visualization Interaction', false, error);
            }
        }

        // Final screenshot
        await takeScreenshot('99-final-state', 'Final application state');

        // Generate report
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: results.tests.length,
                passed: results.passed,
                failed: results.failed,
                successRate: results.tests.length > 0 ? (results.passed / results.tests.length * 100).toFixed(1) : 0
            },
            tests: results.tests,
            screenshots: results.screenshots
        };

        const reportPath = path.join(screenshotDir, 'working-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log('\n🎉 Working UI Test Completed!');
        console.log(`📊 Results: ${report.summary.passed}/${report.summary.total} tests passed (${report.summary.successRate}%)`);
        console.log(`📋 Report saved to: ${reportPath}`);

        return report;

    } catch (error) {
        console.error('💥 Working UI test failed:', error);
        await takeScreenshot('error-state', 'Error state');
        throw error;
    } finally {
        await browser.close();
    }
}

// Run the test
if (require.main === module) {
    runWorkingUITest()
        .then(() => {
            console.log('✨ Test execution completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('🔴 Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = runWorkingUITest;
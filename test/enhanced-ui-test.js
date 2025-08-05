/**
 * Enhanced UI Test Suite that properly navigates through the application flow
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class EnhancedPhyloMoviesTestSuite {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'http://localhost:5173/';
        this.screenshotDir = path.join(__dirname, '..', 'test-results', 'enhanced-ui');
        this.testDataFile = path.join(__dirname, '..', 'data', 'norovirus_200_20', 'two_tree.newick');
        this.results = {
            passed: 0,
            failed: 0,
            tests: [],
            screenshots: []
        };
    }

    async setup() {
        console.log('🚀 Setting up Enhanced UI Test...');

        // Ensure screenshot directory exists
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }

        this.browser = await puppeteer.launch({
            headless: false, // Set to true for CI
            defaultViewport: { width: 1400, height: 900 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();

        // Enable console logging
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('🔴 Browser Console Error:', msg.text());
            }
        });

        await this.page.goto(this.baseUrl, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        console.log('✅ Navigated to application');
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
        console.log('🧹 Test environment cleaned up');
    }

    async takeScreenshot(name, description = '') {
        const filename = `${name}.png`;
        const filepath = path.join(this.screenshotDir, filename);
        await this.page.screenshot({ path: filepath, fullPage: true });

        this.results.screenshots.push({
            name: filename,
            description: description,
            path: filepath
        });

        console.log(`📸 Screenshot saved: ${filename} - ${description}`);
        return filepath;
    }

    async logTestResult(testName, passed, error = null) {
        this.results.tests.push({
            name: testName,
            passed: passed,
            error: error ? error.message : null,
            timestamp: new Date().toISOString()
        });

        if (passed) {
            this.results.passed++;
            console.log(`✅ ${testName}`);
        } else {
            this.results.failed++;
            console.log(`❌ ${testName}: ${error ? error.message : 'Unknown error'}`);
        }
    }

    async waitForElement(selector, timeout = 10000) {
        try {
            await this.page.waitForSelector(selector, { timeout });
            return true;
        } catch (error) {
            console.log(`⚠️ Element not found: ${selector}`);
            return false;
        }
    }

    async uploadFileAndStartVisualization() {
        console.log('\n📂 Step 1: Uploading file and starting visualization...');

        try {
            // Take initial screenshot
            await this.takeScreenshot('01-initial-page', 'Initial application page');

            // Upload file
            const fileInput = await this.page.$('input[type="file"]');
            if (fileInput) {
                await fileInput.uploadFile(this.testDataFile);
                console.log('✅ File uploaded');
                await this.takeScreenshot('02-file-uploaded', 'File uploaded to FilePond');

                // Wait for file processing
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Click the Play button to start visualization
                const playButton = await this.page.$('.btn.btn-primary.btn-lg');
                if (playButton) {
                    await playButton.click();
                    console.log('✅ Clicked Play button to start visualization');

                    // Wait for visualization to load
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    await this.takeScreenshot('03-visualization-started', 'Visualization started');

                } else {
                    throw new Error('Play button not found');
                }

            } else {
                throw new Error('File input not found');
            }

            await this.logTestResult('File Upload and Start Visualization', true);

        } catch (error) {
            await this.logTestResult('File Upload and Start Visualization', false, error);
            throw error;
        }
    }

    async exploreVisualizationUI() {
        console.log('\n🔍 Step 2: Exploring visualization UI...');

        try {
            // Get all visible elements after visualization starts
            const allElements = await this.page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('*'));
                return elements
                    .filter(el => el.offsetHeight > 0 && el.offsetWidth > 0)
                    .map(el => ({
                        tagName: el.tagName.toLowerCase(),
                        id: el.id || '',
                        className: el.className || '',
                        textContent: el.textContent ? el.textContent.trim().substring(0, 50) : '',
                        type: el.type || '',
                        hasClick: el.onclick !== null || el.addEventListener !== undefined
                    }))
                    .filter(el =>
                        // Filter for potentially interactive elements
                        el.tagName === 'button' ||
                        el.tagName === 'input' ||
                        el.tagName === 'select' ||
                        el.id.includes('button') ||
                        el.id.includes('slider') ||
                        el.id.includes('control') ||
                        el.className.includes('btn') ||
                        el.className.includes('control') ||
                        el.className.includes('slider') ||
                        el.className.includes('range')
                    );
            });

            console.log(`🔍 Found ${allElements.length} potentially interactive elements`);

            // Look for SVG elements (tree visualization)
            const svgElements = await this.page.$$('svg');
            console.log(`🌳 Found ${svgElements.length} SVG elements`);

            // Test specific selectors that might exist
            const testSelectors = [
                '#play-button', '#play-button', '.play-button',
                '#forward-button', '#backward-button', '.nav-button',
                '#forwardStepButton', '#backwardStepButton',
                '#positionValue', '#positionButton',
                '#animation-speed-range', '.speed-control', '.range-slider',
                '#font-size', '.font-slider',
                '#branch-length-options', '.branch-toggle',
                '#branch-transformation', '.transform-select',
                '#monophyletic-coloring', '.coloring-toggle',
                '#chart-modal', '#taxa-coloring-button', '#compare-sequence-button',
                '#sidebar-toggle', '.sidebar-control',
                '.timeline', '.s-edge-bar', '#timeline'
            ];

            const foundSelectors = [];
            for (const selector of testSelectors) {
                const element = await this.page.$(selector);
                if (element) {
                    const elementInfo = await element.evaluate(el => ({
                        selector: selector,
                        tagName: el.tagName.toLowerCase(),
                        id: el.id,
                        className: el.className,
                        textContent: el.textContent ? el.textContent.trim().substring(0, 30) : '',
                        visible: el.offsetHeight > 0 && el.offsetWidth > 0
                    }));
                    if (elementInfo.visible) {
                        foundSelectors.push(elementInfo);
                    }
                }
            }

            console.log('\n🎯 Found working selectors:');
            foundSelectors.forEach(sel => {
                console.log(`  ${sel.selector} -> ${sel.tagName}#${sel.id}.${sel.className} "${sel.textContent}"`);
            });

            // Save exploration data
            const explorationData = {
                timestamp: new Date().toISOString(),
                allInteractiveElements: allElements,
                foundSelectors: foundSelectors,
                svgCount: svgElements.length
            };

            const reportPath = path.join(this.screenshotDir, 'ui-exploration.json');
            fs.writeFileSync(reportPath, JSON.stringify(explorationData, null, 2));

            await this.logTestResult('UI Exploration', true);
            return foundSelectors;

        } catch (error) {
            await this.logTestResult('UI Exploration', false, error);
            return [];
        }
    }

    async testFoundElements(foundSelectors) {
        console.log('\n🧪 Step 3: Testing found UI elements...');

        // Test each found selector
        for (const selectorInfo of foundSelectors) {
            try {
                const element = await this.page.$(selectorInfo.selector);
                if (element) {
                    console.log(`\n🔧 Testing ${selectorInfo.selector}...`);

                    const tagName = selectorInfo.tagName;

                    // Take before screenshot
                    await this.takeScreenshot(
                        `before-${selectorInfo.selector.replace(/[#.]/g, '')}`,
                        `Before interacting with ${selectorInfo.selector}`
                    );

                    if (tagName === 'button' || tagName === 'input' && selectorInfo.selector.includes('button')) {
                        // Click buttons
                        await element.click();
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        console.log(`  ✅ Clicked ${selectorInfo.selector}`);

                    } else if (tagName === 'input' && selectorInfo.textContent === 'range') {
                        // Test range sliders
                        await element.evaluate(el => {
                            el.value = el.max || '100';
                            el.dispatchEvent(new Event('input'));
                        });
                        await new Promise(resolve => setTimeout(resolve, 500));
                        console.log(`  ✅ Moved slider ${selectorInfo.selector}`);

                    } else if (tagName === 'input' && selectorInfo.textContent === 'checkbox') {
                        // Toggle checkboxes
                        await element.click();
                        await new Promise(resolve => setTimeout(resolve, 500));
                        console.log(`  ✅ Toggled ${selectorInfo.selector}`);

                    } else if (tagName === 'select') {
                        // Change select options
                        const options = await element.$$('option');
                        if (options.length > 1) {
                            await element.select(await options[1].evaluate(opt => opt.value));
                            await new Promise(resolve => setTimeout(resolve, 500));
                            console.log(`  ✅ Changed select ${selectorInfo.selector}`);
                        }

                    } else if (tagName === 'input' && selectorInfo.textContent === 'text') {
                        // Test text inputs
                        await element.click({ clickCount: 3 }); // Select all
                        await element.type('1');
                        await new Promise(resolve => setTimeout(resolve, 500));
                        console.log(`  ✅ Typed in ${selectorInfo.selector}`);
                    }

                    // Take after screenshot
                    await this.takeScreenshot(
                        `after-${selectorInfo.selector.replace(/[#.]/g, '')}`,
                        `After interacting with ${selectorInfo.selector}`
                    );

                    await this.logTestResult(`Interactive Test: ${selectorInfo.selector}`, true);

                } else {
                    throw new Error(`Element no longer found: ${selectorInfo.selector}`);
                }

            } catch (error) {
                await this.logTestResult(`Interactive Test: ${selectorInfo.selector}`, false, error);
            }
        }
    }

    async testTreeVisualization() {
        console.log('\n🌳 Step 4: Testing tree visualization...');

        try {
            // Look for SVG elements
            const svgElements = await this.page.$$('svg');

            if (svgElements.length > 0) {
                await this.takeScreenshot('tree-visualization', 'Tree visualization SVG elements');

                // Test clicking on tree elements
                for (let i = 0; i < Math.min(svgElements.length, 3); i++) {
                    const svg = svgElements[i];
                    const boundingBox = await svg.boundingBox();

                    if (boundingBox) {
                        // Click in center of SVG
                        await this.page.mouse.click(
                            boundingBox.x + boundingBox.width / 2,
                            boundingBox.y + boundingBox.height / 2
                        );
                        await new Promise(resolve => setTimeout(resolve, 500));

                        await this.takeScreenshot(`tree-click-${i}`, `Clicked on tree SVG ${i}`);
                    }
                }

                await this.logTestResult('Tree Visualization Interaction', true);
            } else {
                throw new Error('No SVG elements found for tree visualization');
            }

        } catch (error) {
            await this.logTestResult('Tree Visualization Interaction', false, error);
        }
    }

    async generateReport() {
        console.log('\n📊 Generating Enhanced Test Report...');

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.results.tests.length,
                passed: this.results.passed,
                failed: this.results.failed,
                successRate: this.results.tests.length > 0 ? (this.results.passed / this.results.tests.length * 100).toFixed(1) : 0
            },
            tests: this.results.tests,
            screenshots: this.results.screenshots,
            environment: {
                url: this.baseUrl,
                testFile: this.testDataFile,
                browser: 'Chromium/Puppeteer'
            }
        };

        const reportPath = path.join(this.screenshotDir, 'enhanced-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log(`📋 Enhanced test report saved to: ${reportPath}`);
        return report;
    }

    async runFullTestSuite() {
        try {
            await this.setup();

            // Step 1: Upload file and start visualization
            await this.uploadFileAndStartVisualization();

            // Step 2: Explore the UI that's now available
            const foundSelectors = await this.exploreVisualizationUI();

            // Step 3: Test the found elements
            if (foundSelectors.length > 0) {
                await this.testFoundElements(foundSelectors);
            } else {
                console.log('⚠️ No interactive elements found to test');
            }

            // Step 4: Test tree visualization
            await this.testTreeVisualization();

            // Final screenshot
            await this.takeScreenshot('final-state', 'Final application state');

            return await this.generateReport();

        } catch (error) {
            console.error('🔴 Enhanced test suite failed:', error);
            await this.takeScreenshot('error-state', 'Error state screenshot');
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Export for use as module
module.exports = EnhancedPhyloMoviesTestSuite;

// Run directly if called as script
if (require.main === module) {
    const testSuite = new EnhancedPhyloMoviesTestSuite();

    testSuite.runFullTestSuite()
        .then(report => {
            console.log('\n🎉 Enhanced Test Suite Completed!');
            console.log(`📊 Results: ${report.summary.passed}/${report.summary.total} tests passed (${report.summary.successRate}%)`);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Enhanced Test Suite Failed:', error.message);
            process.exit(1);
        });
}

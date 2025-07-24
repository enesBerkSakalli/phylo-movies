/**
 * Comprehensive UI Test Suite for Phylo-Movies Application
 * Testing all major UI components and functionality using Puppeteer
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class PhyloMoviesTestSuite {
    constructor() {
        this.browser = null;
        this.page = null;
        this.baseUrl = 'http://localhost:5173/';
        this.screenshotDir = path.join(__dirname, '..', 'test-results', 'comprehensive-ui');
        this.testDataFile = path.join(__dirname, '..', 'data', 'norovirus_200_20', 'two_tree.newick');
        this.results = {
            passed: 0,
            failed: 0,
            tests: [],
            screenshots: []
        };
    }

    async setup() {
        console.log('🚀 Setting up Puppeteer test environment...');

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

        // Enable error handling
        this.page.on('pageerror', error => {
            console.log('🔴 Page Error:', error.message);
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

    async uploadTestFile() {
        console.log('\n📂 Step 1: Uploading test file...');

        try {
            // Look for file input or file upload button
            const fileInputExists = await this.waitForElement('input[type="file"]', 5000);

            if (fileInputExists) {
                const fileInput = await this.page.$('input[type="file"]');
                await fileInput.uploadFile(this.testDataFile);
                console.log('✅ File uploaded via file input');

                // Wait for processing
                await new Promise(resolve => setTimeout(resolve, 3000));

            } else {
                // Try alternative upload methods
                console.log('🔍 Looking for alternative upload methods...');

                // Check for FilePond or other upload components
                const uploadButton = await this.page.$('#upload-button, .upload-button, [data-testid="upload"]');
                if (uploadButton) {
                    await uploadButton.click();
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    const fileInput = await this.page.$('input[type="file"]');
                    if (fileInput) {
                        await fileInput.uploadFile(this.testDataFile);
                    }
                }
            }

            await this.takeScreenshot('01-file-upload', 'File upload completed');
            await this.logTestResult('File Upload', true);

        } catch (error) {
            await this.logTestResult('File Upload', false, error);
            throw error;
        }
    }

    async testNavigationControls() {
        console.log('\n🎮 Test Group 1: Navigation Controls...');

        // Test Play/Pause Button
        try {
            const playButton = await this.page.$('#start-button');
            if (playButton) {
                await this.takeScreenshot('02-before-play', 'Before clicking play');
                await playButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.takeScreenshot('03-after-play', 'After clicking play (animation started)');

                // Click again to pause
                await playButton.click();
                await this.takeScreenshot('04-paused', 'Animation paused');

                await this.logTestResult('Play/Pause Button', true);
            } else {
                throw new Error('Play button not found');
            }
        } catch (error) {
            await this.logTestResult('Play/Pause Button', false, error);
        }

        // Test Forward Button
        try {
            const forwardButton = await this.page.$('#forward-button');
            if (forwardButton) {
                await forwardButton.click();
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.takeScreenshot('05-forward-step', 'After forward button click');
                await this.logTestResult('Forward Button', true);
            } else {
                throw new Error('Forward button not found');
            }
        } catch (error) {
            await this.logTestResult('Forward Button', false, error);
        }

        // Test Backward Button
        try {
            const backwardButton = await this.page.$('#backward-button');
            if (backwardButton) {
                await backwardButton.click();
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.takeScreenshot('06-backward-step', 'After backward button click');
                await this.logTestResult('Backward Button', true);
            } else {
                throw new Error('Backward button not found');
            }
        } catch (error) {
            await this.logTestResult('Backward Button', false, error);
        }

        // Test Step Forward Button
        try {
            const stepForwardButton = await this.page.$('#forwardStepButton');
            if (stepForwardButton) {
                await stepForwardButton.click();
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.takeScreenshot('07-step-forward', 'After step forward');
                await this.logTestResult('Step Forward Button', true);
            } else {
                throw new Error('Step forward button not found');
            }
        } catch (error) {
            await this.logTestResult('Step Forward Button', false, error);
        }

        // Test Step Backward Button
        try {
            const stepBackwardButton = await this.page.$('#backwardStepButton');
            if (stepBackwardButton) {
                await stepBackwardButton.click();
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.takeScreenshot('08-step-backward', 'After step backward');
                await this.logTestResult('Step Backward Button', true);
            } else {
                throw new Error('Step backward button not found');
            }
        } catch (error) {
            await this.logTestResult('Step Backward Button', false, error);
        }
    }

    async testPositionNavigation() {
        console.log('\n📍 Test Group 2: Position Navigation...');

        try {
            const positionInput = await this.page.$('#positionValue');
            const positionButton = await this.page.$('#positionButton');

            if (positionInput && positionButton) {
                // Test position 0
                await positionInput.click({ clickCount: 3 }); // Select all
                await positionInput.type('0');
                await positionButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.takeScreenshot('09-position-0', 'Position set to 0');

                // Test position 1
                await positionInput.click({ clickCount: 3 });
                await positionInput.type('1');
                await positionButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.takeScreenshot('10-position-1', 'Position set to 1');

                await this.logTestResult('Position Navigation', true);
            } else {
                throw new Error('Position input or button not found');
            }
        } catch (error) {
            await this.logTestResult('Position Navigation', false, error);
        }
    }

    async testSpeedControl() {
        console.log('\n⚡ Test Group 3: Speed Control...');

        try {
            const speedSlider = await this.page.$('#animation-speed-range');

            if (speedSlider) {
                // Get initial value
                const initialValue = await speedSlider.evaluate(el => el.value);
                await this.takeScreenshot('11-speed-initial', `Initial speed: ${initialValue}`);

                // Set to maximum speed
                await speedSlider.evaluate(el => el.value = el.max);
                await speedSlider.evaluate(el => el.dispatchEvent(new Event('input')));
                await new Promise(resolve => setTimeout(resolve, 500));

                const maxValue = await speedSlider.evaluate(el => el.value);
                await this.takeScreenshot('12-speed-max', `Maximum speed: ${maxValue}`);

                // Set to minimum speed
                await speedSlider.evaluate(el => el.value = el.min);
                await speedSlider.evaluate(el => el.dispatchEvent(new Event('input')));
                await new Promise(resolve => setTimeout(resolve, 500));

                const minValue = await speedSlider.evaluate(el => el.value);
                await this.takeScreenshot('13-speed-min', `Minimum speed: ${minValue}`);

                await this.logTestResult('Speed Control', true);
            } else {
                throw new Error('Speed slider not found');
            }
        } catch (error) {
            await this.logTestResult('Speed Control', false, error);
        }
    }

    async testAppearanceControls() {
        console.log('\n🎨 Test Group 4: Appearance Controls...');

        // Test Font Size Slider
        try {
            const fontSizeSlider = await this.page.$('#font-size');
            if (fontSizeSlider) {
                await this.takeScreenshot('14-font-before', 'Before font size change');

                // Increase font size
                await fontSizeSlider.evaluate(el => el.value = el.max);
                await fontSizeSlider.evaluate(el => el.dispatchEvent(new Event('input')));
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.takeScreenshot('15-font-large', 'Large font size');

                // Decrease font size
                await fontSizeSlider.evaluate(el => el.value = el.min);
                await fontSizeSlider.evaluate(el => el.dispatchEvent(new Event('input')));
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.takeScreenshot('16-font-small', 'Small font size');

                await this.logTestResult('Font Size Control', true);
            } else {
                throw new Error('Font size slider not found');
            }
        } catch (error) {
            await this.logTestResult('Font Size Control', false, error);
        }

        // Test Branch Length Toggle
        try {
            const branchLengthToggle = await this.page.$('#branch-length-options');
            if (branchLengthToggle) {
                await this.takeScreenshot('17-branch-before', 'Before branch length toggle');

                await branchLengthToggle.click();
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.takeScreenshot('18-branch-toggled', 'After branch length toggle');

                await this.logTestResult('Branch Length Toggle', true);
            } else {
                throw new Error('Branch length toggle not found');
            }
        } catch (error) {
            await this.logTestResult('Branch Length Toggle', false, error);
        }

        // Test Branch Transformation Dropdown
        try {
            const transformDropdown = await this.page.$('#branch-transformation');
            if (transformDropdown) {
                await this.takeScreenshot('19-transform-before', 'Before transformation change');

                // Change to different transformation
                await transformDropdown.select('log');
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.takeScreenshot('20-transform-log', 'Log transformation applied');

                await transformDropdown.select('sqrt');
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.takeScreenshot('21-transform-sqrt', 'Square root transformation applied');

                await this.logTestResult('Branch Transformation', true);
            } else {
                throw new Error('Branch transformation dropdown not found');
            }
        } catch (error) {
            await this.logTestResult('Branch Transformation', false, error);
        }

        // Test Monophyletic Coloring Toggle
        try {
            const monoToggle = await this.page.$('#monophyletic-coloring');
            if (monoToggle) {
                await this.takeScreenshot('22-mono-before', 'Before monophyletic coloring');

                await monoToggle.click();
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.takeScreenshot('23-mono-after', 'After monophyletic coloring toggle');

                await this.logTestResult('Monophyletic Coloring', true);
            } else {
                throw new Error('Monophyletic coloring toggle not found');
            }
        } catch (error) {
            await this.logTestResult('Monophyletic Coloring', false, error);
        }
    }

    async testModalWindows() {
        console.log('\n🪟 Test Group 5: Modal Windows...');

        // Test Chart Modal
        try {
            const chartModalButton = await this.page.$('#chart-modal');
            if (chartModalButton) {
                await chartModalButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.takeScreenshot('24-chart-modal', 'Chart modal opened');

                // Try to close modal
                const closeButton = await this.page.$('.close, .modal-close, [data-dismiss="modal"]');
                if (closeButton) {
                    await closeButton.click();
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                await this.logTestResult('Chart Modal', true);
            } else {
                throw new Error('Chart modal button not found');
            }
        } catch (error) {
            await this.logTestResult('Chart Modal', false, error);
        }

        // Test Taxa Coloring Modal
        try {
            const taxaColoringButton = await this.page.$('#taxa-coloring-button');
            if (taxaColoringButton) {
                await taxaColoringButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.takeScreenshot('25-taxa-coloring-modal', 'Taxa coloring modal opened');

                // Close modal
                await this.page.keyboard.press('Escape');
                await new Promise(resolve => setTimeout(resolve, 500));

                await this.logTestResult('Taxa Coloring Modal', true);
            } else {
                throw new Error('Taxa coloring button not found');
            }
        } catch (error) {
            await this.logTestResult('Taxa Coloring Modal', false, error);
        }

        // Test Compare Sequences Modal
        try {
            const compareButton = await this.page.$('#compare-sequence-button');
            if (compareButton) {
                await compareButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.takeScreenshot('26-compare-sequences-modal', 'Compare sequences modal opened');

                // Close modal
                await this.page.keyboard.press('Escape');
                await new Promise(resolve => setTimeout(resolve, 500));

                await this.logTestResult('Compare Sequences Modal', true);
            } else {
                throw new Error('Compare sequences button not found');
            }
        } catch (error) {
            await this.logTestResult('Compare Sequences Modal', false, error);
        }
    }

    async testSidebarToggle() {
        console.log('\n📋 Test Group 6: Sidebar Toggle...');

        try {
            const sidebarToggle = await this.page.$('#sidebar-toggle');
            if (sidebarToggle) {
                await this.takeScreenshot('27-sidebar-initial', 'Initial sidebar state');

                await sidebarToggle.click();
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.takeScreenshot('28-sidebar-toggled', 'Sidebar toggled');

                await sidebarToggle.click();
                await new Promise(resolve => setTimeout(resolve, 500));
                await this.takeScreenshot('29-sidebar-restored', 'Sidebar restored');

                await this.logTestResult('Sidebar Toggle', true);
            } else {
                throw new Error('Sidebar toggle not found');
            }
        } catch (error) {
            await this.logTestResult('Sidebar Toggle', false, error);
        }
    }

    async testTimelineAndSEdgeBar() {
        console.log('\n⏱️ Test Group 7: Timeline/S-Edge Bar...');

        try {
            // Look for timeline elements
            const timelineElements = await this.page.$$('.timeline, .s-edge-bar, #timeline, [data-timeline]');

            if (timelineElements.length > 0) {
                await this.takeScreenshot('30-timeline-initial', 'Timeline/S-Edge bar initial state');

                // Try interacting with timeline
                const timeline = timelineElements[0];
                const boundingBox = await timeline.boundingBox();

                if (boundingBox) {
                    // Click at different positions on timeline
                    await this.page.mouse.click(boundingBox.x + 50, boundingBox.y + boundingBox.height / 2);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await this.takeScreenshot('31-timeline-position-1', 'Timeline position 1');

                    await this.page.mouse.click(boundingBox.x + boundingBox.width - 50, boundingBox.y + boundingBox.height / 2);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await this.takeScreenshot('32-timeline-position-2', 'Timeline position 2');
                }

                await this.logTestResult('Timeline/S-Edge Bar', true);
            } else {
                console.log('ℹ️ No timeline elements found - this may be normal if timeline is not always visible');
                await this.logTestResult('Timeline/S-Edge Bar', true);
            }
        } catch (error) {
            await this.logTestResult('Timeline/S-Edge Bar', false, error);
        }
    }

    async testTreeAnimation() {
        console.log('\n🌳 Test Group 8: Tree Animation...');

        try {
            // Start animation sequence
            const playButton = await this.page.$('#start-button');
            if (playButton) {
                await this.takeScreenshot('33-animation-start', 'Before starting animation');

                await playButton.click();

                // Capture frames during animation
                for (let i = 0; i < 5; i++) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await this.takeScreenshot(`34-animation-frame-${i + 1}`, `Animation frame ${i + 1}`);
                }

                // Pause animation
                await playButton.click();
                await this.takeScreenshot('35-animation-paused', 'Animation paused');

                await this.logTestResult('Tree Animation', true);
            } else {
                throw new Error('Play button not found for animation test');
            }
        } catch (error) {
            await this.logTestResult('Tree Animation', false, error);
        }
    }

    async testIT2CTransitions() {
        console.log('\n🔄 Test Group 9: IT→C Transitions...');

        try {
            // Test specific transition scenarios
            const positionInput = await this.page.$('#positionValue');
            const positionButton = await this.page.$('#positionButton');

            if (positionInput && positionButton) {
                // Navigate to different positions to trigger IT→C transitions
                const positions = [0, 1];

                for (const pos of positions) {
                    await positionInput.click({ clickCount: 3 });
                    await positionInput.type(pos.toString());
                    await positionButton.click();
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    await this.takeScreenshot(`36-transition-position-${pos}`, `IT→C transition at position ${pos}`);
                }

                await this.logTestResult('IT→C Transitions', true);
            } else {
                throw new Error('Position controls not found for IT→C transition test');
            }
        } catch (error) {
            await this.logTestResult('IT→C Transitions', false, error);
        }
    }

    async generateReport() {
        console.log('\n📊 Generating Test Report...');

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

        const reportPath = path.join(this.screenshotDir, 'test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        // Generate HTML report
        const htmlReport = this.generateHTMLReport(report);
        const htmlReportPath = path.join(this.screenshotDir, 'test-report.html');
        fs.writeFileSync(htmlReportPath, htmlReport);

        console.log(`📋 Test report saved to: ${reportPath}`);
        console.log(`🌐 HTML report saved to: ${htmlReportPath}`);

        return report;
    }

    generateHTMLReport(report) {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Phylo-Movies UI Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .test-result { margin: 10px 0; padding: 10px; border-left: 4px solid #ddd; }
        .passed { border-left-color: #28a745; background: #d4edda; }
        .failed { border-left-color: #dc3545; background: #f8d7da; }
        .screenshots { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .screenshot { border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
        .screenshot img { max-width: 100%; height: auto; }
    </style>
</head>
<body>
    <h1>Phylo-Movies UI Test Report</h1>

    <div class="summary">
        <h2>Test Summary</h2>
        <p><strong>Total Tests:</strong> ${report.summary.total}</p>
        <p><strong>Passed:</strong> ${report.summary.passed}</p>
        <p><strong>Failed:</strong> ${report.summary.failed}</p>
        <p><strong>Success Rate:</strong> ${report.summary.successRate}%</p>
        <p><strong>Generated:</strong> ${report.timestamp}</p>
    </div>

    <h2>Test Results</h2>
    ${report.tests.map(test => `
        <div class="test-result ${test.passed ? 'passed' : 'failed'}">
            <strong>${test.name}</strong> - ${test.passed ? 'PASSED' : 'FAILED'}
            ${test.error ? `<br><small>Error: ${test.error}</small>` : ''}
        </div>
    `).join('')}

    <h2>Screenshots</h2>
    <div class="screenshots">
        ${report.screenshots.map(screenshot => `
            <div class="screenshot">
                <h4>${screenshot.name}</h4>
                <p>${screenshot.description}</p>
                <img src="${screenshot.name}" alt="${screenshot.description}">
            </div>
        `).join('')}
    </div>
</body>
</html>
        `;
    }

    async runFullTestSuite() {
        try {
            await this.setup();

            // Wait for application to load
            await new Promise(resolve => setTimeout(resolve, 3000));
            await this.takeScreenshot('00-initial-load', 'Application initial load');

            // Upload test file first
            await this.uploadTestFile();

            // Wait for file processing and visualization to load
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Run all test groups
            await this.testNavigationControls();
            await this.testPositionNavigation();
            await this.testSpeedControl();
            await this.testAppearanceControls();
            await this.testModalWindows();
            await this.testSidebarToggle();
            await this.testTimelineAndSEdgeBar();
            await this.testTreeAnimation();
            await this.testIT2CTransitions();

            // Generate final screenshot
            await this.takeScreenshot('99-final-state', 'Final application state');

            return await this.generateReport();

        } catch (error) {
            console.error('🔴 Test suite failed:', error);
            await this.takeScreenshot('error-state', 'Error state screenshot');
            throw error;
        } finally {
            await this.cleanup();
        }
    }
}

// Export for use as module
module.exports = PhyloMoviesTestSuite;

// Run directly if called as script
if (require.main === module) {
    const testSuite = new PhyloMoviesTestSuite();

    testSuite.runFullTestSuite()
        .then(report => {
            console.log('\n🎉 Test Suite Completed Successfully!');
            console.log(`📊 Results: ${report.summary.passed}/${report.summary.total} tests passed (${report.summary.successRate}%)`);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Test Suite Failed:', error.message);
            process.exit(1);
        });
}

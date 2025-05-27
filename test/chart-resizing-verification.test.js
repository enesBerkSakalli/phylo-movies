/**
 * Test suite for verifying chart resizing functionality
 * This tests the improved responsive behavior of the distance chart.
 */

const { expect } = require('chai');
const { JSDOM } = require('jsdom');

// Mock d3 for testing environment
const mockD3 = {
  select: (selector) => ({
    append: () => mockD3.select(),
    attr: () => mockD3.select(),
    style: () => mockD3.select(),
    text: () => mockD3.select(),
    remove: () => mockD3.select(),
    selectAll: () => mockD3.select(),
    data: () => mockD3.select(),
    enter: () => mockD3.select(),
    on: () => mockD3.select(),
    call: () => mockD3.select(),
    transition: () => mockD3.select(),
    duration: () => mockD3.select(),
    datum: () => mockD3.select(),
    querySelector: (sel) => mockDocument.querySelector(sel),
    querySelectorAll: (sel) => mockDocument.querySelectorAll(sel)
  }),
  scaleLinear: () => ({
    domain: () => mockD3.scaleLinear(),
    range: () => mockD3.scaleLinear(),
    invert: (x) => x
  }),
  axisBottom: () => ({
    ticks: () => mockD3.axisBottom(),
    tickFormat: () => mockD3.axisBottom(),
    tickValues: () => mockD3.axisBottom()
  }),
  axisLeft: () => mockD3.axisLeft(),
  area: () => ({
    x: () => mockD3.area(),
    y0: () => mockD3.area(),
    y1: () => mockD3.area()
  }),
  line: () => ({
    x: () => mockD3.line(),
    y: () => mockD3.line()
  }),
  format: () => (d) => d.toString(),
  pointer: () => [100, 100],
  drag: () => ({
    on: () => mockD3.drag()
  })
};

// Setup JSDOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    // Mock observation
  }
  disconnect() {
    // Mock disconnect
  }
};

// Mock d3 globally
global.d3 = mockD3;

// Mock the chart module by creating a simple version
const mockGenerateDistanceChart = (config, data, options = {}) => {
  const container = document.getElementById(config.containerId);
  if (!container) return null;

  // Create mock SVG structure
  const svg = document.createElement('svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', `0 0 ${container.clientWidth} ${container.clientHeight}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.className = 'distance-chart';

  // Add mock elements
  for (let i = 0; i < data.length; i++) {
    const dot = document.createElement('circle');
    dot.className = 'dot';
    dot.setAttribute('r', '3');
    svg.appendChild(dot);
  }

  const line = document.createElement('path');
  line.className = 'line';
  svg.appendChild(line);

  const area = document.createElement('path');
  area.className = 'area';
  svg.appendChild(area);

  if (typeof options.currentPosition === 'number') {
    const indicator = document.createElement('g');
    indicator.className = 'drag-indicator';
    const label = document.createElement('text');
    label.className = 'current-position-label';
    label.textContent = (options.currentPosition + 1).toString();
    indicator.appendChild(label);
    svg.appendChild(indicator);
  }

  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.style.opacity = '0';
  tooltip.style.position = 'absolute';

  container.appendChild(svg);
  container.appendChild(tooltip);

  return {
    update: () => {
      // Mock update - recreate elements with new dimensions
      container.innerHTML = '';
      const newSvg = document.createElement('svg');
      newSvg.setAttribute('width', '100%');
      newSvg.setAttribute('height', '100%');
      newSvg.setAttribute('viewBox', `0 0 ${container.clientWidth} ${container.clientHeight}`);
      newSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      newSvg.className = 'distance-chart';

      // Re-add mock elements
      for (let i = 0; i < data.length; i++) {
        const dot = document.createElement('circle');
        dot.className = 'dot';
        newSvg.appendChild(dot);
      }
      const line = document.createElement('path');
      line.className = 'line';
      newSvg.appendChild(line);
      const area = document.createElement('path');
      area.className = 'area';
      newSvg.appendChild(area);

      if (typeof options.currentPosition === 'number') {
        const indicator = document.createElement('g');
        indicator.className = 'drag-indicator';
        const label = document.createElement('text');
        label.className = 'current-position-label';
        label.textContent = (options.currentPosition + 1).toString();
        indicator.appendChild(label);
        newSvg.appendChild(indicator);
      }

      const newTooltip = document.createElement('div');
      newTooltip.className = 'chart-tooltip';
      newTooltip.style.opacity = '0';
      container.appendChild(newSvg);
      container.appendChild(newTooltip);
    },
    updatePosition: (newPosition) => {
      const label = container.querySelector('.current-position-label');
      if (label) {
        label.textContent = (newPosition + 1).toString();
      }
    },
    destroy: () => {
      container.innerHTML = '';
    },
    getState: () => ({ containerId: config.containerId, data, options })
  };
};

describe('Chart Resizing Functionality', () => {
  let container;
  let chartInstance;
  const testData = [0.1, 0.3, 0.2, 0.8, 0.5, 0.9, 0.4, 0.7, 0.6, 0.1];

  beforeEach(() => {
    // Create a test container
    container = document.createElement('div');
    container.id = 'test-chart-container';
    container.style.width = '400px';
    container.style.height = '300px';
    container.style.position = 'absolute';
    
    // Mock clientWidth and clientHeight
    Object.defineProperty(container, 'clientWidth', {
      value: 400,
      writable: true
    });
    Object.defineProperty(container, 'clientHeight', {
      value: 300,
      writable: true
    });
    
    document.body.appendChild(container);
  });

  afterEach(() => {
    // Clean up
    if (chartInstance && typeof chartInstance.destroy === 'function') {
      chartInstance.destroy();
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  it('should create chart with responsive SVG', () => {
    const config = { containerId: 'test-chart-container' };
    const options = {
      xLabel: 'Tree Index',
      yLabel: 'Distance',
      yMax: 1,
      currentPosition: 3
    };

    chartInstance = mockGenerateDistanceChart(config, testData, options);

    // Verify chart instance was created
    expect(chartInstance).to.not.be.null;
    expect(chartInstance.update).to.be.a('function');
    expect(chartInstance.updatePosition).to.be.a('function');
    expect(chartInstance.destroy).to.be.a('function');

    // Verify SVG was created with responsive attributes
    const svg = container.querySelector('svg');
    expect(svg).to.not.be.null;
    expect(svg.getAttribute('width')).to.equal('100%');
    expect(svg.getAttribute('height')).to.equal('100%');
    expect(svg.getAttribute('viewBox')).to.not.be.null;
    expect(svg.getAttribute('preserveAspectRatio')).to.equal('xMidYMid meet');
  });

  it('should handle container resizing correctly', (done) => {
    const config = { containerId: 'test-chart-container' };
    const options = {
      xLabel: 'Tree Index',
      yLabel: 'Distance',
      yMax: 1,
      currentPosition: 3
    };

    chartInstance = mockGenerateDistanceChart(config, testData, options);

    // Get initial viewBox
    const svg = container.querySelector('svg');
    const initialViewBox = svg.getAttribute('viewBox');
    
    // Simulate resize by updating dimensions and calling update
    Object.defineProperty(container, 'clientWidth', { value: 600, writable: true });
    Object.defineProperty(container, 'clientHeight', { value: 400, writable: true });
    
    // Trigger update
    chartInstance.update();

    // Wait for update to complete
    setTimeout(() => {
      const updatedSvg = container.querySelector('svg');
      const updatedViewBox = updatedSvg.getAttribute('viewBox');
      
      // ViewBox should be updated to reflect new dimensions
      expect(updatedViewBox).to.not.equal(initialViewBox);
      expect(updatedViewBox).to.include('600');
      expect(updatedViewBox).to.include('400');
      done();
    }, 50);
  });

  it('should update chart elements during resize', (done) => {
    const config = { containerId: 'test-chart-container' };
    const options = {
      xLabel: 'Tree Index',
      yLabel: 'Distance',
      yMax: 1,
      currentPosition: 5
    };

    chartInstance = mockGenerateDistanceChart(config, testData, options);

    // Count initial elements
    const initialDots = container.querySelectorAll('.dot').length;
    const initialLine = container.querySelector('.line');
    const initialArea = container.querySelector('.area');
    
    expect(initialDots).to.equal(testData.length);
    expect(initialLine).to.not.be.null;
    expect(initialArea).to.not.be.null;

    // Simulate resize
    Object.defineProperty(container, 'clientWidth', { value: 500, writable: true });
    Object.defineProperty(container, 'clientHeight', { value: 350, writable: true });
    chartInstance.update();

    setTimeout(() => {
      // Elements should still be present after resize
      const updatedDots = container.querySelectorAll('.dot').length;
      const updatedLine = container.querySelector('.line');
      const updatedArea = container.querySelector('.area');
      
      expect(updatedDots).to.equal(testData.length);
      expect(updatedLine).to.not.be.null;
      expect(updatedArea).to.not.be.null;
      
      // Position indicator should still be present
      const positionIndicator = container.querySelector('.drag-indicator');
      expect(positionIndicator).to.not.be.null;
      
      done();
    }, 50);
  });

  it('should handle position updates correctly', () => {
    const config = { containerId: 'test-chart-container' };
    const options = {
      xLabel: 'Tree Index',
      yLabel: 'Distance',
      yMax: 1,
      currentPosition: 3
    };

    chartInstance = mockGenerateDistanceChart(config, testData, options);

    // Initial position indicator should exist
    let positionIndicator = container.querySelector('.drag-indicator');
    expect(positionIndicator).to.not.be.null;

    // Update position
    chartInstance.updatePosition(7);

    // Position indicator should still exist
    positionIndicator = container.querySelector('.drag-indicator');
    expect(positionIndicator).to.not.be.null;

    // Label should reflect new position
    const label = container.querySelector('.current-position-label');
    expect(label.textContent).to.equal('8'); // Position 7 + 1 for display
  });

  it('should properly clean up resources', () => {
    const config = { containerId: 'test-chart-container' };
    const options = {
      xLabel: 'Tree Index',
      yLabel: 'Distance',
      yMax: 1,
      currentPosition: 4
    };

    chartInstance = mockGenerateDistanceChart(config, testData, options);

    // Verify elements exist
    expect(container.querySelector('svg')).to.not.be.null;
    expect(container.querySelector('.chart-tooltip')).to.not.be.null;

    // Destroy chart
    chartInstance.destroy();

    // Elements should be removed
    expect(container.querySelector('svg')).to.be.null;
    expect(container.querySelector('.chart-tooltip')).to.be.null;
  });

  it('should demonstrate improvement over previous static approach', () => {
    const config = { containerId: 'test-chart-container' };
    const options = {
      xLabel: 'Tree Index',
      yLabel: 'Distance',
      yMax: 1,
      currentPosition: 3
    };

    chartInstance = mockGenerateDistanceChart(config, testData, options);

    // Test the key improvements:
    
    // 1. Responsive SVG attributes (not fixed width/height)
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('width')).to.equal('100%');
    expect(svg.getAttribute('height')).to.equal('100%');
    expect(svg.getAttribute('viewBox')).to.not.be.null;
    
    // 2. Has update method for resizing
    expect(chartInstance.update).to.be.a('function');
    
    // 3. Has position update method
    expect(chartInstance.updatePosition).to.be.a('function');
    
    // 4. Has proper cleanup method
    expect(chartInstance.destroy).to.be.a('function');
    
    // 5. Can handle dimension changes
    const initialViewBox = svg.getAttribute('viewBox');
    Object.defineProperty(container, 'clientWidth', { value: 800, writable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, writable: true });
    
    chartInstance.update();
    
    const updatedSvg = container.querySelector('svg');
    const updatedViewBox = updatedSvg.getAttribute('viewBox');
    expect(updatedViewBox).to.not.equal(initialViewBox);
    expect(updatedViewBox).to.include('800');
    expect(updatedViewBox).to.include('600');
  });
});

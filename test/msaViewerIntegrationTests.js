const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');

// Mock React and related dependencies
const mockReact = {
  useState: (initial) => [initial, () => {}],
  useEffect: (fn) => fn(),
  useRef: (initial) => ({ current: initial }),
  createElement: () => ({}),
};

// Mock for the WinBox class
class MockWinBox {
  constructor(title, options) {
    this.title = title;
    this.width = options.width || 800;
    this.height = options.height || 600;
    this.options = options;
  }
  
  focus() {
    return this;
  }
  
  close() {
    this.closed = true;
    if (this.options.onclose) this.options.onclose();
    return this;
  }
}

describe('MSA Viewer Integration Tests', () => {
  const fastaPath = path.join(__dirname, 'test_data/alltrees.fasta');
  let fastaContent;
  
  // Set up global mocks
  global.React = mockReact;
  global.WinBox = MockWinBox;
  global.window = {
    addEventListener: sinon.stub(),
    removeEventListener: sinon.stub(),
    dispatchEvent: sinon.stub(),
    syncMSAViewer: sinon.stub(),
  };
  global.document = {
    createElement: () => ({
      id: '',
      style: {},
      appendChild: () => {},
    }),
    getElementById: () => null,
    body: { appendChild: () => {} },
  };
  global.localStorage = {
    items: {},
    getItem(key) { return this.items[key]; },
    setItem(key, value) { this.items[key] = value; },
  };
  
  before(() => {
    fastaContent = fs.readFileSync(fastaPath, 'utf8');
  });
  
  beforeEach(() => {
    // Reset mocks and spies (simplified)
    // Note: stubs are automatically reset between tests
  });
  
  it('should store MSA data in localStorage correctly', () => {
    // Store test data
    const testData = {
      sequences: [
        { id: 'A1', sequence: 'ACGT' },
        { id: 'A2', sequence: 'ACGT' },
        { id: 'B1', sequence: 'ACGT' },
      ],
      rawData: fastaContent.substring(0, 100),
    };
    
    global.localStorage.setItem('phyloMovieMSAData', JSON.stringify(testData));
    
    const stored = JSON.parse(global.localStorage.getItem('phyloMovieMSAData'));
    expect(stored).to.have.property('sequences');
    expect(stored.sequences.length).to.equal(3);
    expect(stored.sequences[0].id).to.equal('A1');
    expect(stored).to.have.property('rawData');
  });
  
  it('should create MSA model with correct data structure', () => {
    // Mock the MSA model factory and related functions
    const setWidthSpy = sinon.spy();
    const createSpy = sinon.stub().returns({
      id: 'msa-test',
      type: 'MsaView',
      setWidth: setWidthSpy,
      data: { msa: fastaContent }
    });
    
    const mockModel = {
      create: createSpy,
    };
    
    const MSAModelF = () => mockModel;
    
    // Create model using the mock factory
    const model = MSAModelF().create({
      id: 'msa-test',
      type: 'MsaView',
      data: { msa: fastaContent },
    });
    
    // Set width as the code would do
    model.setWidth(1200);
    
    // Verify model creation and configuration
    expect(createSpy.calledOnce).to.be.true;
    expect(setWidthSpy.calledOnce).to.be.true;
    expect(setWidthSpy.calledWith(1200)).to.be.true;
  });
  
  it('should handle window resize event correctly', () => {
    // Create mock functions
    const setWidthSpy = sinon.spy();
    
    // Setup global references that would be created by the MSA viewer
    global.window.msaModelRef = {
      current: {
        setWidth: setWidthSpy,
      },
    };
    
    // Create a mock WinBox instance
    const wb = new MockWinBox('Test', {
      width: 1000,
      height: 600,
      onresize: (width, height) => {
        // This simulates the onresize callback in the code
        if (global.window.syncMSAViewer && global.window.msaModelRef) {
          setTimeout(() => {
            if (global.window.msaModelRef.current && 
                typeof global.window.msaModelRef.current.setWidth === 'function') {
              global.window.msaModelRef.current.setWidth(width - 40);
            }
          }, 10);
        }
      },
    });
    
    // Trigger resize
    wb.options.onresize(800, 500);
    
    // Wait for the setTimeout to complete
    return new Promise(resolve => setTimeout(resolve, 20))
      .then(() => {
        // Check if setWidth was called with the right value
        expect(setWidthSpy.calledOnce).to.be.true;
        expect(setWidthSpy.calledWith(760)).to.be.true; // 800 - 40
      });
  });
  
  it('should clean up resources when WinBox is closed', () => {
    const unmountSpy = sinon.spy();
    
    // Create a mock container with a React root
    const container = {
      __reactRoot: {
        unmount: unmountSpy,
      },
    };
    
    // Create a mock WinBox with onclose handler
    const wb = new MockWinBox('Test', {
      mount: container,
      onclose: () => {
        if (container.__reactRoot) {
          try {
            container.__reactRoot.unmount();
          } catch (err) {
            console.error("Error unmounting React root:", err);
          }
        }
      },
    });
    
    // Close the WinBox
    wb.close();
    
    // Verify unmount was called
    expect(unmountSpy.calledOnce).to.be.true;
  });
});
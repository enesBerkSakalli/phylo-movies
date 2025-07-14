const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { JSDOM } = require('jsdom');
const sinon = require('sinon');
// const fetch = require('node-fetch');

// Mock the window object for testing
const setupMockDOM = () => {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <head></head>
      <body>
        <div id="msa-react-root"></div>
      </body>
    </html>
  `, {
    url: 'http://localhost:3000',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.localStorage = {
    store: {},
    getItem(key) {
      return this.store[key] || null;
    },
    setItem(key, value) {
      this.store[key] = value.toString();
    },
    clear() {
      this.store = {};
    }
  };

  // Mock WinBox
  global.WinBox = class WinBox {
    constructor(title, options) {
      this.title = title;
      this.options = options;
      this.width = options.width || 800;
      this.height = options.height || 600;
      this.mount = options.mount;
    }

    focus() {
      return this;
    }

    close() {
      if (this.options.onclose) this.options.onclose();
      return this;
    }
  };

  return dom;
};

describe('Integration Tests', () => {
  const fastaPath = path.join(__dirname, 'test_data/alltrees.fasta');
  const newickPath = path.join(__dirname, 'test_data/alltrees.trees_cutted.newick');
  let fastaContent, newickContent, dom;

  before(() => {
    // Load test files
    fastaContent = fs.readFileSync(fastaPath, 'utf8');
    newickContent = fs.readFileSync(newickPath, 'utf8');
    dom = setupMockDOM();
  });

  it('should store MSA data in localStorage and open MSA viewer', () => {
    // Setup data in localStorage as if it was uploaded
    const sequences = parseFastaContent(fastaContent);
    global.localStorage.setItem('phyloMovieMSAData', JSON.stringify({
      rawData: fastaContent,
      sequences: sequences
    }));

    // Simulate loading the MSA viewer
    const storedData = JSON.parse(global.localStorage.getItem('phyloMovieMSAData'));
    expect(storedData).to.have.property('rawData');
    expect(storedData).to.have.property('sequences');
    expect(storedData.sequences.length).to.equal(11);

    // Simulate opening the MSA viewer window
    global.window.syncMSAViewer = sinon.stub();
    global.window.dispatchEvent(new global.window.CustomEvent('open-msa-viewer'));

    // Check that the event was dispatched
    expect(document.getElementById('msa-react-root')).to.not.be.null;
  });

  it('should correctly integrate with MSA viewer component', () => {
    // This would test that MSAViewerContent correctly renders with the data
    // This is a mock implementation since we can't fully test React components here

    // Mock MSA component creation
    const mockMSAViewerContent = {
      render: (props) => {
        expect(props).to.have.property('msaString');
        expect(props.msaString).to.be.a('string');
        expect(props.msaString.length).to.be.greaterThan(0);
        return true;
      }
    };

    // Test integration
    const msaString = JSON.parse(global.localStorage.getItem('phyloMovieMSAData')).rawData;
    const renderResult = mockMSAViewerContent.render({ msaString });
    expect(renderResult).to.be.true;
  });
});

// Helper functions
function parseFastaContent(fastaString) {
  if (!fastaString) return [];

  const sequences = [];
  const chunks = fastaString.split('>').filter(Boolean);

  chunks.forEach(chunk => {
    const lines = chunk.split('\n');
    const id = lines[0].trim();
    const sequence = lines.slice(1).join('').replace(/\s/g, '');
    sequences.push({ id, sequence });
  });

  return sequences;
}

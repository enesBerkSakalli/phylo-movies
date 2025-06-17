const assert = require('assert');
const path = require('path');
const { JSDOM } = require('jsdom');

describe('MSA Button Integration Tests', function() {
  let dom, window, document, eventFired, msaViewerMounted, msaStringLoaded;

  beforeEach(function() {
    // Setup DOM
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <button id="msa-viewer-btn">Open Alignment Viewer</button>
          <div id="msa-react-root"></div>
        </body>
      </html>
    `, { url: 'http://localhost', runScripts: 'dangerously' });

    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    global.navigator = window.navigator;
    global.HTMLElement = window.HTMLElement;

    // Mock localforage
    global.localforage = {
      getItem: async function(key) {
        if (key === 'phyloMovieMSAData') {
          return { rawData: '>seq1\nATCG\n>seq2\nATCG' };
        }
        return null;
      }
    };

    // Track event firing
    eventFired = false;
    window.addEventListener('open-msa-viewer', () => { eventFired = true; });

    // Track viewer mounting and data loading
    msaViewerMounted = false;
    msaStringLoaded = null;

    // Mock createRoot and AlignmentViewer2Component
    global.React = require('react');
    global.ReactDOM = { createRoot: () => ({
      render: (el) => {
        msaViewerMounted = true;
        // Simulate the prop passed to AlignmentViewer2Component
        if (el && el.props && el.props.msaString) {
          msaStringLoaded = el.props.msaString;
        }
      }
    })};

    // Patch require cache for react-dom/client and localforage
    const moduleCache = require.cache;
    Object.keys(moduleCache).forEach(key => {
      if (key.includes('react-dom/client') || key.includes('localforage')) {
        delete moduleCache[key];
      }
    });
    // Mock react-dom/client
    require.cache[require.resolve('react-dom/client')] = {
      exports: { createRoot: global.ReactDOM.createRoot }
    };
    // Mock localforage
    require.cache[require.resolve('localforage')] = {
      exports: global.localforage
    };
    // Load the MSA viewer index.jsx (this will setup the event listener)
    require('../js/msaViewer/index.jsx');
  });

  afterEach(function() {
    dom.window.close();
    delete global.window;
    delete global.document;
    delete global.navigator;
    delete global.HTMLElement;
    delete global.React;
    delete global.ReactDOM;
    // Clean up require cache
    const moduleCache = require.cache;
    Object.keys(moduleCache).forEach(key => {
      if (key.includes('react-dom/client') || key.includes('localforage')) {
        delete moduleCache[key];
      }
    });
  });

  it('should dispatch open-msa-viewer event when button is clicked', function() {
    // Simulate button click
    const btn = document.getElementById('msa-viewer-btn');
    assert(btn, 'MSA button should exist');
    btn.dispatchEvent(new window.Event('click', { bubbles: true }));
    // The event should be fired (if the handler is attached)
    assert(eventFired, 'open-msa-viewer event should be dispatched');
  });

  it('should mount the MSA viewer and load msaString when event is fired', async function() {
    // Fire the event
    window.dispatchEvent(new window.CustomEvent('open-msa-viewer'));
    // Simulate async data loading
    await new Promise(r => setTimeout(r, 10));
    assert(msaViewerMounted, 'MSA viewer should be mounted');
    assert(msaStringLoaded && msaStringLoaded.includes('>seq1'), 'MSA string should be loaded and passed to viewer');
  });

  it('should not mount the viewer if msa data is missing', async function() {
    // Remove data
    global.localforage.getItem = async () => null;
    msaViewerMounted = false;
    msaStringLoaded = null;
    window.dispatchEvent(new window.CustomEvent('open-msa-viewer'));
    await new Promise(r => setTimeout(r, 10));
    assert(!msaViewerMounted, 'MSA viewer should not mount if data is missing');
  });
});

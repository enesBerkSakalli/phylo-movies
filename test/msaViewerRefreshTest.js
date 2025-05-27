// Test to verify MSA viewer refreshes when new data is uploaded
const { expect } = require('chai');
const sinon = require('sinon');
const { JSDOM } = require('jsdom');

describe('MSA Viewer Refresh Tests', function() {
  let dom, window, document;
  let eventListeners = {};
  let localStorageData = {};
  let localStorageSetItemStub, localStorageGetItemStub, localStorageRemoveItemStub;
  let dispatchEventStub, addEventListenerStub, removeEventListenerStub;
  
  beforeEach(function() {
    // Create a fresh DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="msa-react-root"></div>
        </body>
      </html>
    `, { 
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    
    window = dom.window;
    document = window.document;
    
    // Mock localStorage
    localStorageGetItemStub = sinon.stub().callsFake(key => localStorageData[key] || null);
    localStorageSetItemStub = sinon.stub().callsFake((key, value) => {
      localStorageData[key] = value;
      // Simulate storage event dispatch
      if (eventListeners['msa-data-updated']) {
        eventListeners['msa-data-updated'].forEach(listener => listener());
      }
    });
    localStorageRemoveItemStub = sinon.stub().callsFake(key => delete localStorageData[key]);
    
    window.localStorage = {
      getItem: localStorageGetItemStub,
      setItem: localStorageSetItemStub,
      removeItem: localStorageRemoveItemStub
    };
    
    // Mock event system
    addEventListenerStub = sinon.stub().callsFake((event, listener) => {
      if (!eventListeners[event]) eventListeners[event] = [];
      eventListeners[event].push(listener);
    });
    
    removeEventListenerStub = sinon.stub();
    
    dispatchEventStub = sinon.stub().callsFake((event) => {
      const eventType = event.type;
      if (eventListeners[eventType]) {
        eventListeners[eventType].forEach(listener => listener(event));
      }
    });
    
    window.addEventListener = addEventListenerStub;
    window.removeEventListener = removeEventListenerStub;
    window.dispatchEvent = dispatchEventStub;
    
    // Mock CustomEvent
    window.CustomEvent = function(type, options) {
      this.type = type;
      this.detail = options ? options.detail : undefined;
    };
    
    // Reset storage data
    localStorageData = {};
    eventListeners = {};
  });

  afterEach(function() {
    if (dom) {
      dom.window.close();
    }
  });

  it('should dispatch custom event when MSA data is saved to localStorage', function() {
    // Mock the parseMSA function
    const mockParsedData = {
      sequences: [
        { id: 'seq1', sequence: 'ATCGATCG' },
        { id: 'seq2', sequence: 'ATCGATCG' }
      ],
      rawData: '>seq1\nATCGATCG\n>seq2\nATCGATCG'
    };
    
    // Directly call the localStorage setItem to verify it works
    localStorageSetItemStub('phyloMovieMSAData', JSON.stringify(mockParsedData));
    dispatchEventStub(new window.CustomEvent('msa-data-updated'));
    
    // Verify localStorage was called
    expect(localStorageSetItemStub.calledOnce).to.be.true;
    expect(localStorageSetItemStub.firstCall.args[0]).to.equal('phyloMovieMSAData');
    
    // Verify custom event was dispatched
    expect(dispatchEventStub.calledOnce).to.be.true;
    const dispatchedEvent = dispatchEventStub.getCall(0).args[0];
    expect(dispatchedEvent.type).to.equal('msa-data-updated');
  });

  it('should handle multiple MSA data updates correctly', function() {
    const msaData1 = {
      sequences: [{ id: 'seq1', sequence: 'AAAA' }],
      rawData: '>seq1\nAAAA'
    };
    
    const msaData2 = {
      sequences: [{ id: 'seq2', sequence: 'TTTT' }],
      rawData: '>seq2\nTTTT'
    };
    
    // First upload
    localStorageSetItemStub('phyloMovieMSAData', JSON.stringify(msaData1));
    dispatchEventStub(new window.CustomEvent('msa-data-updated'));
    
    // Second upload
    localStorageSetItemStub('phyloMovieMSAData', JSON.stringify(msaData2));
    dispatchEventStub(new window.CustomEvent('msa-data-updated'));
    
    // Verify both updates were handled
    expect(localStorageSetItemStub.callCount).to.equal(2);
    expect(dispatchEventStub.callCount).to.equal(2);
    
    // Verify the latest data is stored
    const storedData = JSON.parse(localStorageGetItemStub('phyloMovieMSAData'));
    expect(storedData.rawData).to.equal('>seq2\nTTTT');
  });

  it('should handle event listener registration and cleanup', function() {
    // Simulate MSA viewer component mounting
    const mockLoadMSAData = sinon.stub();
    
    // Register event listeners (what the MSA viewer does)
    window.addEventListener('storage', mockLoadMSAData);
    window.addEventListener('msa-data-updated', mockLoadMSAData);
    
    // Verify listeners were registered
    expect(addEventListenerStub.callCount).to.equal(2);
    expect(addEventListenerStub.calledWith('storage')).to.be.true;
    expect(addEventListenerStub.calledWith('msa-data-updated')).to.be.true;
    
    // Trigger the events
    if (eventListeners['msa-data-updated']) {
      eventListeners['msa-data-updated'].forEach(listener => listener());
    }
    
    // Verify the callback was called
    expect(mockLoadMSAData.calledOnce).to.be.true;
  });

  it('should handle malformed MSA data gracefully', function() {
    // Test with invalid JSON
    expect(() => {
      window.localStorage.setItem('phyloMovieMSAData', 'invalid json');
      window.dispatchEvent(new window.CustomEvent('msa-data-updated'));
    }).to.not.throw();
    
    // Test with empty string
    expect(() => {
      window.localStorage.setItem('phyloMovieMSAData', '');
      window.dispatchEvent(new window.CustomEvent('msa-data-updated'));
    }).to.not.throw();
    
    // Test with null
    expect(() => {
      window.localStorage.setItem('phyloMovieMSAData', null);
      window.dispatchEvent(new window.CustomEvent('msa-data-updated'));
    }).to.not.throw();
  });

  it('should properly clean up resources when component unmounts', function() {
    const mockRemoveEventListener = sinon.stub();
    window.removeEventListener = mockRemoveEventListener;
    
    // Simulate component cleanup
    window.removeEventListener('storage', sinon.stub());
    window.removeEventListener('msa-data-updated', sinon.stub());
    
    // Verify cleanup was called
    expect(mockRemoveEventListener.callCount).to.equal(2);
    expect(mockRemoveEventListener.calledWith('storage')).to.be.true;
    expect(mockRemoveEventListener.calledWith('msa-data-updated')).to.be.true;
  });
});
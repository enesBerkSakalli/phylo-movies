import { expect } from 'chai';
import { server } from '../src/js/services/data/dataService.js';

describe('DataService - API Integration', () => {
  const originalFetch = global.fetch;
  const originalWindow = global.window;

  beforeEach(() => {
    global.window = undefined;
    // Mock fetch
    global.fetch = async (url, options) => {
      return {
        ok: true,
        json: async () => ({ success: true, url }), // Return the URL used for verification
        status: 200,
        statusText: 'OK'
      };
    };
  });

  after(() => {
    global.fetch = originalFetch;
    global.window = originalWindow;
  });

  it('should use relative path in Web Mode', async () => {
    global.window = {}; // Simulate browser
    const result = await server.fetchTreeData(new FormData());
    expect(result.url).to.equal('/treedata');
  });

  it('should use absolute Electron URL in Electron Mode', async () => {
    global.window = {
      electronAPI: {
        getBackendUrl: async () => 'http://localhost:9999'
      }
    };

    const result = await server.fetchTreeData(new FormData());
    expect(result.url).to.equal('http://localhost:9999/treedata');
  });
});

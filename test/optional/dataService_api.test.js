import { expect } from 'chai';
import { resolveApiUrl } from '../../src/services/data/apiConfig.js';

describe('DataService - API Integration', () => {
  const originalWindow = global.window;

  beforeEach(() => {
    global.window = {};
  });

  after(() => {
    global.window = originalWindow;
  });

  it('should use relative path in Web Mode', async () => {
    const url = await resolveApiUrl('/treedata/stream');
    expect(url).to.equal('/treedata/stream');
  });

  it('should use absolute Electron URL in Electron Mode', async () => {
    global.window = {
      electronAPI: {
        getBackendUrl: async () => 'http://localhost:9999'
      }
    };

    const url = await resolveApiUrl('/treedata/stream');
    expect(url).to.equal('http://localhost:9999/treedata/stream');
  });
});

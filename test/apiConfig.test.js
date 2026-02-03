import { expect } from 'chai';
import { getApiBaseUrl, resolveApiUrl, isElectron } from '../src/js/services/data/apiConfig.js';

describe('apiConfig - Multi-platform URL Resolution', () => {
  // Save original window if it exists (though it shouldn't in node)
  const originalWindow = global.window;

  beforeEach(() => {
    // Reset global.window before each test
    global.window = undefined;
  });

  after(() => {
    // Restore global.window after all tests
    global.window = originalWindow;
  });

  describe('Web Mode Detection', () => {
    it('isElectron() should return false when window is undefined', () => {
      expect(isElectron()).to.be.false;
    });

    it('isElectron() should return false when window.electronAPI is missing', () => {
      global.window = {};
      expect(isElectron()).to.be.false;
    });

    it('getApiBaseUrl() should return an empty string in Web Mode', async () => {
      global.window = {};
      const baseUrl = await getApiBaseUrl();
      expect(baseUrl).to.equal('');
    });

    it('resolveApiUrl() should return relative path in Web Mode', async () => {
      global.window = {};
      const url = await resolveApiUrl('/treedata');
      expect(url).to.equal('/treedata');
    });

    it('resolveApiUrl() should handle endpoints without leading slash in Web Mode', async () => {
      global.window = {};
      const url = await resolveApiUrl('treedata');
      expect(url).to.equal('/treedata');
    });
  });

  describe('Electron Mode Detection', () => {
    it('isElectron() should return true when window.electronAPI exists', () => {
      global.window = { electronAPI: {} };
      expect(isElectron()).to.be.true;
    });

    it('getApiBaseUrl() should return value from getBackendUrl()', async () => {
      global.window = {
        electronAPI: {
          getBackendUrl: async () => 'http://localhost:5002'
        }
      };
      const baseUrl = await getApiBaseUrl();
      expect(baseUrl).to.equal('http://localhost:5002');
    });

    it('getApiBaseUrl() should slice trailing slash from backend URL', async () => {
      global.window = {
        electronAPI: {
          getBackendUrl: async () => 'http://127.0.0.1:5002/'
        }
      };
      const baseUrl = await getApiBaseUrl();
      expect(baseUrl).to.equal('http://127.0.0.1:5002');
    });

    it('getApiBaseUrl() should fallback to empty string if IPC call fails', async () => {
      global.window = {
        electronAPI: {
          getBackendUrl: async () => { throw new Error('IPC Bridge Error'); }
        }
      };
      const baseUrl = await getApiBaseUrl();
      expect(baseUrl).to.equal('');
    });

    it('resolveApiUrl() should join base URL and endpoint correctly', async () => {
      global.window = {
        electronAPI: {
          getBackendUrl: async () => 'http://localhost:5002'
        }
      };
      const url = await resolveApiUrl('/treedata');
      expect(url).to.equal('http://localhost:5002/treedata');
    });

    it('resolveApiUrl() should handle endpoints without leading slash in Electron', async () => {
      global.window = {
        electronAPI: {
          getBackendUrl: async () => 'http://localhost:5002'
        }
      };
      const url = await resolveApiUrl('treedata');
      expect(url).to.equal('http://localhost:5002/treedata');
    });
  });
});

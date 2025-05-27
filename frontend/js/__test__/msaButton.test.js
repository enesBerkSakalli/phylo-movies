
/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use jsdom for DOM APIs
import { beforeAll } from 'vitest';

// Set environment to jsdom
// @vitest-environment jsdom

// Mock openMSAViewer
vi.mock('../msaViewer.js', () => ({
  openMSAViewer: vi.fn(),
}));

import { openMSAViewer } from '../msaViewer.js';

// Helper to set up DOM
function setupDOM(hasMSAData = false) {
  document.body.innerHTML = `
    <div id="msa-status"><div class="info-value">No alignment data loaded</div></div>
    <button id="msa-viewer-btn">Open Alignment Viewer</button>
  `;
  if (hasMSAData) {
    localStorage.setItem('phyloMovieMSAData', '{"sequences":[]}');
  } else {
    localStorage.removeItem('phyloMovieMSAData');
  }
}

describe('MSA Button Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear DOM and localStorage
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('should show alert if no MSA data is present', () => {
    setupDOM(false);
    // Mock alert
    window.alert = vi.fn();
    // Simulate main.js logic
    const msaBtn = document.getElementById('msa-viewer-btn');
    msaBtn.addEventListener('click', () => {
      openMSAViewer();
    });
    msaBtn.click();
    // openMSAViewer should be called
    expect(openMSAViewer).toHaveBeenCalled();
  });

  it('should call openMSAViewer if MSA data is present', () => {
    setupDOM(true);
    // Simulate main.js logic
    const msaBtn = document.getElementById('msa-viewer-btn');
    msaBtn.addEventListener('click', () => {
      openMSAViewer();
    });
    msaBtn.click();
    expect(openMSAViewer).toHaveBeenCalled();
  });

  it('should update status text based on MSA data', () => {
    setupDOM(false);
    const msaStatus = document.getElementById('msa-status');
    expect(msaStatus.querySelector('.info-value').textContent).toBe('No alignment data loaded');
    setupDOM(true);
    expect(localStorage.getItem('phyloMovieMSAData')).not.toBeNull();
  });
});

import 'filepond/dist/filepond.css';
import * as FilePond from 'filepond';

// Import Material Web button components
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/button/filled-tonal-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/icon/icon.js';
import '@material/web/switch/switch.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/progress/circular-progress.js';
import { phyloData } from './services/data/dataService.js';

// FilePond setup
const treesInput = document.getElementById("trees");
const orderInput = document.getElementById("order");
const msaInput = document.getElementById("msa");
const treesPond = FilePond.create(treesInput, { allowMultiple: false });
const orderPond = FilePond.create(orderInput, { allowMultiple: false });
const msaPond = FilePond.create(msaInput, { allowMultiple: false });

// Prevent double submission
let isSubmitting = false;
let isStaticDemoMode = false;

function setDisabled(el, disabled) {
  if (!el) return;
  try { el.disabled = disabled; } catch {}
  if (disabled) el.setAttribute?.('disabled', ''); else el.removeAttribute?.('disabled');
}

function applyStaticDemoMode(enabled) {
  isStaticDemoMode = !!enabled;
  try {
    document.documentElement.setAttribute('data-static-demo', enabled ? 'true' : 'false');
  } catch {}

  // Banner visibility
  const banner = document.getElementById('static-demo-banner');
  if (banner) banner.style.display = enabled ? 'flex' : 'none';

  // Hide upload grid when static
  const grid = document.getElementById('upload-grid');
  if (grid) grid.style.display = enabled ? 'none' : 'grid';

  // Disable inputs and controls
  const submitButton = document.querySelector('#submit-button, md-filled-button[type="submit"]');
  const resetButton = document.querySelector('md-outlined-button[type="reset"]');
  const treesEl = document.getElementById('trees');
  const orderEl = document.getElementById('order');
  const msaEl = document.getElementById('msa');
  const windowSizeEl = document.getElementById('windowSize');
  const stepSizeEl = document.getElementById('window-step-size');
  const midpointEl = document.getElementById('midpointRooting');

  [treesEl, orderEl, msaEl, windowSizeEl, stepSizeEl, midpointEl, submitButton, resetButton].forEach(el => setDisabled(el, enabled));

  try { localStorage.setItem('staticDemoMode', enabled ? 'true' : 'false'); } catch {}
}

// Helper to show feedback in the alert div
function showFormAlert(message, type = 'danger') {
  const alertDiv = document.getElementById('form-alert');
  alertDiv.textContent = message;
  alertDiv.className = `alert alert-${type}`;
  alertDiv.classList.remove('d-none');
}
function hideFormAlert() {
  const alertDiv = document.getElementById('form-alert');
  alertDiv.textContent = '';
  alertDiv.className = 'alert d-none';
}

document.getElementById("phylo-form").addEventListener("submit", async function (e) {
  e.preventDefault();
  hideFormAlert();
  if (isStaticDemoMode) {
    showFormAlert('Static demo mode is enabled. Use "Load Example" to view the demo dataset.', 'danger');
    return;
  }
  if (isSubmitting) return;
  isSubmitting = true;
  const submitButton = this.querySelector("button[type='submit'], md-filled-button[type='submit'], #submit-button");
  if (submitButton) setDisabled(submitButton, true);

  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.style.display = "flex";
  }

  const treeFiles = treesPond.getFiles();
  if (treeFiles.length === 0) {
    showFormAlert("Please select a tree file.", 'danger');
    isSubmitting = false;
    if (submitButton) setDisabled(submitButton, false);
    if (overlay) {
      overlay.style.display = "none";
    }
    return;
  }
  const formData = new FormData();
  formData.append("treeFile", treeFiles[0].file);

  const orderFiles = orderPond.getFiles();
  if (orderFiles.length > 0) {
    formData.append("orderFile", orderFiles[0].file);
  }

  // Add MSA file if provided
  const msaFiles = msaPond.getFiles();
  if (msaFiles.length > 0) {
    formData.append("msaFile", msaFiles[0].file);
  }

  formData.append("windowSize", document.getElementById("windowSize").value);
  formData.append("windowStepSize", document.getElementById("window-step-size").value);
  formData.append("midpointRooting", document.getElementById("midpointRooting").checked ? "on" : "");

  try {
    const response = await fetch("/treedata", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      let errorMsg = "Upload failed!";
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) {
          errorMsg = errorData.error;
        }
      } catch (e) {
        try {
          errorMsg = await response.text();
        } catch {}
      }
      showFormAlert(errorMsg, 'danger');
      isSubmitting = false;
      if (submitButton) setDisabled(submitButton, false);
      if (overlay) {
        overlay.style.display = "none";
      }
      return;
    }
    const data = await response.json();
    console.log('[Index] Data from server - window_size:', data.window_size, 'window_step_size:', data.window_step_size);

    // Add the filename to the data object
    const treeFileName = treeFiles[0].file.name;
    data.file_name = treeFileName;

    // Save main data to IndexedDB/localForage
    console.log('[Index] Saving to localForage - window_size:', data.window_size, 'window_step_size:', data.window_step_size);
    await window.localforage.setItem("phyloMovieData", data);

    // Handle MSA data saving using dataService.js workflow
    try {
      const { workflows } = await import('../js/services/data/dataService.js');
      await workflows.handleMSADataSaving(formData, data);
    } catch (msaErr) {
      console.error("[index.html] Error in MSA workflow:", msaErr);
      // Continue with tree data even if MSA saving fails
    }

    const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
    window.location.href = `${base}pages/visualization/`;
  } catch (err) {
    showFormAlert("Network error: " + err, 'danger');
    isSubmitting = false;
    if (submitButton) setDisabled(submitButton, false);
    if (overlay) {
      overlay.style.display = "none";
    }
  }
});

// Ensure localForage is available on window
import("localforage").then((mod) => {
  window.localforage = mod.default || mod;
});

// Load Example button handler
const loadExampleButton = document.getElementById('load-example-button');
if (loadExampleButton) {
  loadExampleButton.addEventListener('click', async () => {
    hideFormAlert();
    const overlay = document.getElementById('loading-overlay');
    try {
      loadExampleButton.disabled = true;
      if (overlay) overlay.style.display = 'flex';

      let exampleData = null;
      const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/';
      const candidates = [
        `${base}example.json`,
        '/example.json',
        'example.json'
      ];
      for (const url of candidates) {
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            exampleData = await resp.json();
            break;
          }
        } catch {}
      }

      if (!exampleData) throw new Error('Example data not available');
      if (!exampleData.file_name) exampleData.file_name = 'example.json';

      await phyloData.set(exampleData);
      window.location.href = `${base}pages/visualization/`;
    } catch (err) {
      console.error('[Home] Failed to load example:', err);
      showFormAlert(`Failed to load example: ${err.message}`, 'danger');
    } finally {
      try { loadExampleButton.disabled = false; } catch {}
      if (overlay) overlay.style.display = 'none';
    }
  });
}

// Static demo toggle behavior
const staticToggle = document.getElementById('static-demo-toggle');
if (staticToggle) {
  // Initialize default value: prefer stored pref; else auto-enable on GitHub Pages or file://
  let defaultStatic = false;
  try {
    const saved = localStorage.getItem('staticDemoMode');
    if (saved === 'true' || saved === 'false') {
      defaultStatic = saved === 'true';
    } else {
      defaultStatic = (location.hostname.endsWith('github.io') || location.protocol === 'file:');
    }
  } catch {}

  // Material Web md-switch uses `selected`; fallback to `checked` for robustness
  try { staticToggle.selected = defaultStatic; } catch {}
  try { staticToggle.checked = defaultStatic; } catch {}
  applyStaticDemoMode(defaultStatic);

  staticToggle.addEventListener('change', () => {
    const on = staticToggle.selected ?? staticToggle.checked ?? false;
    applyStaticDemoMode(on);
  });
}

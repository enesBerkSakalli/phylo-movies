import 'filepond/dist/filepond.css';
import * as FilePond from 'filepond';

// Import Material Web button components
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/button/filled-tonal-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/icon/icon.js';

// FilePond setup
const treesInput = document.getElementById("trees");
const orderInput = document.getElementById("order");
const msaInput = document.getElementById("msa");
const treesPond = FilePond.create(treesInput, { allowMultiple: false });
const orderPond = FilePond.create(orderInput, { allowMultiple: false });
const msaPond = FilePond.create(msaInput, { allowMultiple: false });

// Prevent double submission
let isSubmitting = false;

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
  if (isSubmitting) return;
  isSubmitting = true;
  const submitButton = this.querySelector("button[type='submit']");
  if (submitButton) submitButton.disabled = true;

  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.style.display = "flex";
  }

  const treeFiles = treesPond.getFiles();
  if (treeFiles.length === 0) {
    showFormAlert("Please select a tree file.", 'danger');
    isSubmitting = false;
    if (submitButton) submitButton.disabled = false;
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
      if (submitButton) submitButton.disabled = false;
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
      const { workflows } = await import('../js/services/dataService.js');
      await workflows.handleMSADataSaving(formData, data);
    } catch (msaErr) {
      console.error("[index.html] Error in MSA workflow:", msaErr);
      // Continue with tree data even if MSA saving fails
    }

    window.location.href = "/pages/visualization/";
  } catch (err) {
    showFormAlert("Network error: " + err, 'danger');
    isSubmitting = false;
    if (submitButton) submitButton.disabled = false;
    if (overlay) {
      overlay.style.display = "none";
    }
  }
});
// Ensure localForage is available on window
import("localforage").then((mod) => {
  window.localforage = mod.default || mod;
});

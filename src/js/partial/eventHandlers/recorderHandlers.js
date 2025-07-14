/**
 * Manages event handlers related to the screen recording functionality.
 * It interacts with a `ScreenRecorder` instance and updates UI elements
 * based on the recording state.
 * @export
 * @class RecorderHandlers
 */
export class RecorderHandlers {
  /**
   * Creates an instance of RecorderHandlers.
   * @param {ScreenRecorder} recorder - The ScreenRecorder instance to manage.
   */
  constructor(recorder) {
    this.recorder = recorder;
    this.isRecording = false;

    // Bind methods to ensure 'this' context is correct when used as event handlers
    this.handleStartRecordingBound = this.handleStartRecording.bind(this);
    this.handleStopRecordingBound = this.handleStopRecording.bind(this);
  }

  /**
   * Attaches all necessary event listeners for recorder controls (start/stop buttons)
   * and sets up callbacks on the ScreenRecorder instance.
   * @returns {void}
   */
  attachAll() {
    const startRecordBtn = document.getElementById("start-record");
    if (startRecordBtn) {
      startRecordBtn.addEventListener('click', this.handleStartRecordingBound);
    }

    const stopRecordBtn = document.getElementById("stop-record");
    if (stopRecordBtn) {
      stopRecordBtn.addEventListener('click', this.handleStopRecordingBound);
    }

    // Set up recorder callbacks to update UI and state
    this.recorder.onStart = () => this.onRecordingStart();
    this.recorder.onStop = (blob) => this.onRecordingStop(blob);
    this.recorder.onError = (error) => this.onRecordingError(error);
  }

  /**
   * Handles the click event for the "Start Recording" button.
   * Initiates screen recording if not already recording.
   * @async
   * @returns {Promise<void>}
   */
  async handleStartRecording() {
    if (this.isRecording) {
      console.warn("Already recording");
      return;
    }

    try {
      await this.recorder.start();
    } catch (error) {
      console.error("Failed to start recording:", error);
      alert("Failed to start recording. Please check your permissions.");
    }
  }

  /**
   * Handles the click event for the "Stop Recording" button.
   * Stops the screen recording if currently active.
   * @returns {void}
   */
  handleStopRecording() {
    if (!this.isRecording) {
      console.warn("Not currently recording");
      return;
    }

    this.recorder.stop();
  }

  /**
   * Callback function executed when the ScreenRecorder starts recording.
   * Updates UI elements (buttons) and internal recording state.
   * @returns {void}
   */
  onRecordingStart() {
    this.isRecording = true;
    console.log("Recording started");

    // Update UI
    const startBtn = document.getElementById("start-record");
    const stopBtn = document.getElementById("stop-record");

    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = "Recording...";
      startBtn.style.backgroundColor = "#e14390";
    }

    if (stopBtn) {
      stopBtn.disabled = false;
      stopBtn.style.backgroundColor = "#ff4444";
    }
  }

  /**
   * Callback function executed when the ScreenRecorder stops recording.
   * Updates UI elements, internal state, and prompts for manual save if auto-save is off.
   * @param {Blob} blob - The recorded media data as a Blob.
   * @returns {void}
   */
  onRecordingStop(blob) {
    this.isRecording = false;
    console.log("Recording stopped, blob size:", blob.size);

    // Update UI
    const startBtn = document.getElementById("start-record");
    const stopBtn = document.getElementById("stop-record");

    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = "Start Recording";
      startBtn.style.backgroundColor = "";
    }

    if (stopBtn) {
      stopBtn.disabled = true;
      stopBtn.style.backgroundColor = "";
    }

    // If auto-save is not enabled, prompt user to save manually
    if (!this.recorder.autoSave) {
      this.promptManualSave();
    }
  }

  /**
   * Callback function executed when the ScreenRecorder encounters an error.
   * Updates UI, resets state, and alerts the user.
   * @param {Error} error - The error object from the ScreenRecorder.
   * @returns {void}
   */
  onRecordingError(error) {
    this.isRecording = false;
    console.error("Recording error:", error);

    // Reset UI
    const startBtn = document.getElementById("start-record");
    const stopBtn = document.getElementById("stop-record");

    if (startBtn) {
      startBtn.disabled = false;
      startBtn.textContent = "Start Recording";
      startBtn.style.backgroundColor = "";
    }

    if (stopBtn) {
      stopBtn.disabled = true;
      stopBtn.style.backgroundColor = "";
    }

    alert(`Recording error: ${error.message || error}`);
  }

  /**
   * Prompts the user to manually save the recording if auto-save is not enabled.
   * Uses a confirm dialog and then calls `this.recorder.performAutoSave()`.
   * @returns {void}
   */
  promptManualSave() {
    const saveChoice = confirm("Recording complete! Would you like to save it now?");
    if (saveChoice) {
      try {
        const filename = this.recorder.performAutoSave();
        console.log(`Recording saved as: ${filename}.webm`);
      } catch (error) {
        console.error("Failed to save recording:", error);
        alert("Failed to save recording. Please try again.");
      }
    }
  }

  /**
   * Sets up an advanced/manual save button for recordings.
   * This button is typically shown when auto-save is disabled, allowing the user
   * to trigger a save explicitly.
   * Note: This method manipulates the DOM to create and manage the save button.
   * @returns {void}
   */
  setupAdvancedSave() {
    // Add a custom save button if it doesn't exist
    let saveBtn = document.getElementById("save-recording");
    if (!saveBtn) {
      saveBtn = document.createElement("button");
      saveBtn.id = "save-recording";
      saveBtn.textContent = "Save Recording";
      saveBtn.style.display = "none"; // Hidden by default

      // Insert after stop button
      const stopBtn = document.getElementById("stop-record");
      if (stopBtn && stopBtn.parentNode) {
        stopBtn.parentNode.insertBefore(saveBtn, stopBtn.nextSibling);
      }
    }

    saveBtn.onclick = () => {
      try {
        if (this.recorder.getBlob().size > 0) {
          const filename = this.recorder.performAutoSave();
          console.log(`Recording saved as: ${filename}.webm`);
          saveBtn.style.display = "none";
        } else {
          alert("No recording to save.");
        }
      } catch (error) {
        console.error("Failed to save recording:", error);
        alert("Failed to save recording.");
      }
    };

    // Show save button after recording stops (only if auto-save is disabled)
    const originalOnStop = this.recorder.onStop;
    this.recorder.onStop = (blob) => {
      if (originalOnStop) originalOnStop(blob);

      if (!this.recorder.autoSave && blob.size > 0) {
        saveBtn.style.display = "inline-block";
      }
    };
  }

  /**
   * Cleans up all attached event listeners and nullifies callbacks on the
   * ScreenRecorder instance to prevent memory leaks.
   * This should be called when the recorder UI is being removed or re-initialized.
   * @returns {void}
   */
  cleanup() {
    const startRecordBtn = document.getElementById("start-record");
    if (startRecordBtn) {
      startRecordBtn.removeEventListener('click', this.handleStartRecordingBound);
    }

    const stopRecordBtn = document.getElementById("stop-record");
    if (stopRecordBtn) {
      stopRecordBtn.removeEventListener('click', this.handleStopRecordingBound);
    }

    // Clear recorder callbacks
    if (this.recorder) {
      this.recorder.onStart = null;
      this.recorder.onStop = null;
      this.recorder.onError = null;
    }

    console.log("RecorderHandlers cleaned up");
  }
}

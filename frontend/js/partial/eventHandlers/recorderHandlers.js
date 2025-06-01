/**
 * Screen recorder event handlers
 */
export class RecorderHandlers {
  constructor(recorder) {
    this.recorder = recorder;
    this.isRecording = false;

    // Bind methods
    this.handleStartRecordingBound = this.handleStartRecording.bind(this);
    this.handleStopRecordingBound = this.handleStopRecording.bind(this);
  }

  /**
   * Attach all recorder event handlers
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

    // Set up recorder callbacks
    this.recorder.onStart = () => this.onRecordingStart();
    this.recorder.onStop = (blob) => this.onRecordingStop(blob);
    this.recorder.onError = (error) => this.onRecordingError(error);
  }

  /**
   * Handle start recording button click
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
   * Handle stop recording button click
   */
  handleStopRecording() {
    if (!this.isRecording) {
      console.warn("Not currently recording");
      return;
    }

    this.recorder.stop();
  }

  /**
   * Called when recording starts
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
   * Called when recording stops
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
   * Called when recording encounters an error
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
   * Prompt user to manually save the recording
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
   * Set up advanced save options
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
   * Clean up event listeners and recorder callbacks
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

export class ScreenRecorder {
  constructor({ autoSave = false, filename = null, notifications = null } = {}) {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.autoSave = autoSave;
    this.filename = filename;
    this.isRecording = false;
    this.notifications = notifications; // Optional notifications system
  }

  async start() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: { mediaSource: "screen" },
      });
      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        this.onRecordingStop();
      };
      this.mediaRecorder.onerror = (e) => {
        this.isRecording = false;
        this.onRecordingError(e.error || e);
      };
      this.mediaRecorder.start(200);
      this.isRecording = true;
      this.onRecordingStart();
    } catch (error) {
      this.isRecording = false;
      this.onRecordingError(error);
    }
  }

  stop() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();

      // Auto-save if enabled - fix the naming conflict
      if (this.autoSave) {
        setTimeout(() => {
          this.performAutoSave(this.filename); // Use different method name
        }, 100);
      }
    }
  }

  getBlob() {
    return new Blob(this.recordedChunks, { type: "video/webm" });
  }

  createDownloadLink() {
    const blob = this.getBlob();
    const filename = window.prompt("Enter file name") || "recording";
    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${filename}.webm`;
    downloadLink.textContent = `Download ${filename}.webm`;
    downloadLink.style.display = "block";

    // Currently commented out - videos are NOT automatically downloaded
    // document.body.appendChild(downloadLink);
    // downloadLink.click();
    // document.body.removeChild(downloadLink);

    return downloadLink;
  }

  // Rename method to avoid conflict with autoSave property
  performAutoSave(filename = null) {
    const blob = this.getBlob();
    const defaultFilename = `phylo-movie-recording-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, "-")}`;
    const finalFilename = filename || defaultFilename;

    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${finalFilename}.webm`;

    // Automatically trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Clean up the blob URL after download
    setTimeout(() => {
      URL.revokeObjectURL(downloadLink.href);
    }, 1000);

    return finalFilename;
  }

  // Keep the old method name for backward compatibility
  autoSave(filename = null) {
    return this.performAutoSave(filename);
  }

  // UI State and Control Methods
  updateStartButton(disabled, text, backgroundColor) {
    const startBtn = document.getElementById("start-record");
    if (startBtn) {
      startBtn.disabled = disabled;
      if (text) startBtn.textContent = text;
      if (backgroundColor) startBtn.style.backgroundColor = backgroundColor;
      else startBtn.style.backgroundColor = "";
    }
  }

  updateStopButton(disabled, backgroundColor) {
    const stopBtn = document.getElementById("stop-record");
    if (stopBtn) {
      stopBtn.disabled = disabled;
      if (backgroundColor) stopBtn.style.backgroundColor = backgroundColor;
      else stopBtn.style.backgroundColor = "";
    }
  }

  onRecordingStart() {
    this.updateStartButton(true, "Recording...", "#e14390");
    this.updateStopButton(false, "#ff4444");
    console.log("Recording started");
  }

  onRecordingStop() {
    this.updateStartButton(false, "Start Recording", "");
    this.updateStopButton(true, "");
    console.log("Recording stopped");
    
    // If auto-save is not enabled, prompt user to save manually
    if (!this.autoSave) {
      this.promptManualSave();
    }
  }

  onRecordingError(error) {
    this.updateStartButton(false, "Start Recording", "");
    this.updateStopButton(true, "");
    console.error("Recording error:", error);
    
    // Show notification if available
    if (this.notifications) {
      this.notifications.show(`Recording error: ${error.message || error}`, "error");
    }
  }

  promptManualSave() {
    const saveChoice = confirm("Recording complete! Would you like to save it now?");
    if (saveChoice) {
      try {
        const filename = this.performAutoSave(this.filename);
        console.log(`Recording saved as: ${filename}.webm`);
        if (this.notifications) {
          this.notifications.show(`Recording saved as: ${filename}.webm`, "success");
        }
      } catch (error) {
        console.error("Failed to save recording:", error);
        if (this.notifications) {
          this.notifications.show("Failed to save recording. Please try again.", "error");
        }
      }
    }
  }

  // Add method to save with custom location (if using File System Access API)
  // Removed saveToCustomLocation - not used anywhere
  // The File System Access API method can be re-added if needed in the future
}
export class ScreenRecorder {
  constructor({ onStart, onStop, onError, autoSave = false, filename = null } = {}) {
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.onStart = onStart;
    this.onStop = onStop;
    this.onError = onError;
    this.autoSave = autoSave;
    this.filename = filename;
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
        if (typeof this.onStop === "function") {
          this.onStop(this.getBlob());
        }
      };
      this.mediaRecorder.onerror = (e) => {
        if (typeof this.onError === "function") {
          this.onError(e.error || e);
        }
      };
      this.mediaRecorder.start(200);
      if (typeof this.onStart === "function") {
        this.onStart();
      }
    } catch (error) {
      if (typeof this.onError === "function") {
        this.onError(error);
      }
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

  // Add method to save with custom location (if using File System Access API)
  async saveToCustomLocation() {
    try {
      // Check if File System Access API is supported
      if ("showSaveFilePicker" in window) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: `phylo-movie-recording-${new Date()
            .toISOString()
            .slice(0, 19)
            .replace(/:/g, "-")}.webm`,
          types: [
            {
              description: "Video files",
              accept: {
                "video/webm": [".webm"],
                "video/mp4": [".mp4"],
              },
            },
          ],
        });

        const writable = await fileHandle.createWritable();
        await writable.write(this.getBlob());
        await writable.close();

        return fileHandle.name;
      } else {
        // Fallback to regular download
        return this.autoSave();
      }
    } catch (error) {
      console.error("Failed to save file:", error);
      // Fallback to regular download
      return this.autoSave();
    }
  }
}
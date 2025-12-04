import { useAppStore } from '../../core/store.js';

/**
 * Modern canvas recorder using native MediaRecorder API
 * Replaces outdated CCapture.js with browser-native canvas.captureStream()
 */
export class CanvasRecorder {
  constructor({
    framerate = 60,
    mimeType = 'video/webm;codecs=vp9',
    videoBitsPerSecond = 2500000, // 2.5 Mbps for good quality
    autoSave = false,
    filename = null,
    notifications = null,
  } = {}) {
    this.framerate = framerate;
    this.mimeType = mimeType;
    this.videoBitsPerSecond = videoBitsPerSecond;
    this.autoSave = autoSave;
    this.filename = filename;
    this.notifications = notifications;

    this.mediaRecorder = null;
    this.canvas = null;
    this.stream = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.recordedBlob = null;
  }

  _resolveCanvas() {
    const { treeControllers } = useAppStore.getState();
    const primaryController = Array.isArray(treeControllers) && treeControllers.length > 0
      ? treeControllers[0]
      : null;

    const canvas = primaryController?.deckManager?.canvas || document.querySelector('#webgl-container canvas');
    if (!canvas) {
      throw new Error('Visualization canvas not found. Make sure the movie has finished rendering.');
    }
    this.deck = primaryController?.deckManager?.getDeck?.() || primaryController?.deckManager?.deck || null;
    return canvas;
  }

  _initializeMediaRecorder() {
    if (!this.stream) {
      throw new Error('Canvas stream not initialized');
    }

    // Check for MediaRecorder support and best codec
    const options = { mimeType: this.mimeType, videoBitsPerSecond: this.videoBitsPerSecond };

    // Fallback to alternative codecs if vp9 not supported
    if (!MediaRecorder.isTypeSupported(this.mimeType)) {
      const fallbacks = [
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4'
      ];

      for (const type of fallbacks) {
        if (MediaRecorder.isTypeSupported(type)) {
          options.mimeType = type;
          this._notifyInfo(`Using fallback codec: ${type}`);
          break;
        }
      }
    }

    this.mediaRecorder = new MediaRecorder(this.stream, options);
    this.recordedChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('[CanvasRecorder] MediaRecorder error:', event.error);
      this._notifyError(event.error);
    };
  }

  // Native canvas.captureStream() handles frame capture automatically
  // No manual frame capture hooks needed

  async start() {
    if (this.isRecording) return;

    try {
      this.canvas = this._resolveCanvas();

      // Use native canvas.captureStream() API
      this.stream = this.canvas.captureStream(this.framerate);

      if (!this.stream || this.stream.getTracks().length === 0) {
        throw new Error('Failed to capture canvas stream');
      }

      this._initializeMediaRecorder();

      // Start recording with timeslice for periodic data availability
      this.mediaRecorder.start(1000); // Request data every second
      this.isRecording = true;
      this.recordedBlob = null;

      this._notifyInfo('Recording started. Capturing the visualization canvas.');
    } catch (error) {
      this._cleanup();
      this._notifyError(error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRecording || !this.mediaRecorder) return null;

    this.isRecording = false;

    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.recordedChunks, {
            type: this.mediaRecorder.mimeType || 'video/webm'
          });

          this.recordedBlob = blob;
          this._notifyInfo('Recording finished. Preparing download.');

          if (this.autoSave) {
            this.performAutoSave(this.filename, blob);
          }

          this._cleanup();
          resolve(blob);
        } catch (error) {
          this._cleanup();
          this._notifyError(error);
          reject(error);
        }
      };

      // Stop the MediaRecorder
      try {
        this.mediaRecorder.stop();
      } catch (error) {
        this._cleanup();
        this._notifyError(error);
        reject(error);
      }
    });
  }

  _cleanup() {
    // Stop and clean up media stream tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.mediaRecorder = null;
    this.canvas = null;
    this.recordedChunks = [];
  }

  getBlob() {
    return this.recordedBlob;
  }

  createDownloadLink(blob = this.recordedBlob, filename = null) {
    if (!blob) return null;
    const finalName = this._buildFilename(filename);
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${finalName}.webm`;
    downloadLink.textContent = `Download ${finalName}.webm`;
    downloadLink.style.display = 'block';
    // Store URL for cleanup
    downloadLink.dataset.blobUrl = url;
    return downloadLink;
  }

  performAutoSave(filename = null, blob = this.recordedBlob) {
    if (!blob) return null;
    const link = this.createDownloadLink(blob, filename);
    if (!link) return null;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Proper cleanup with stored URL
    const url = link.dataset.blobUrl;
    if (url) {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    if (this.notifications) {
      this.notifications.show(`Recording saved as: ${link.download}`, 'success');
    }
    return link.download.replace(/\.webm$/, '');
  }

  // Removed - UI prompts should be handled by React components, not service layer

  _buildFilename(filename = null) {
    if (filename) return filename;
    return `phylo-movie-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
  }

  _notifyError(error) {
    console.error('[CanvasRecorder] Recording error:', error);
    if (this.notifications) {
      this.notifications.show(`Recording error: ${error.message || error}`, 'error');
    }
  }

  _notifyInfo(message) {
    if (this.notifications) {
      this.notifications.show(message, 'info');
    }
  }

}

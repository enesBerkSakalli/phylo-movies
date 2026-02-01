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
    backgroundColor = '#FFFFFF', // Force white background for video
  } = {}) {
    this.framerate = framerate;
    this.mimeType = mimeType;
    this.videoBitsPerSecond = videoBitsPerSecond;
    this.autoSave = autoSave;
    this.filename = filename;
    this.backgroundColor = backgroundColor;

    this.mediaRecorder = null;
    this.canvas = null;
    this.proxyCanvas = null;
    this.proxyCtx = null;
    this.renderLoopId = null;
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

    const canvas = primaryController?.deckContext?.canvas || document.querySelector('#webgl-container canvas');
    if (!canvas) {
      throw new Error('Visualization canvas not found. Make sure the movie has finished rendering.');
    }
    this.deck = primaryController?.deckContext?.getDeck?.() || primaryController?.deckContext?.deck || null;
    return canvas;
  }

  _initializeMediaRecorder() {
    if (!this.stream) {
      throw new Error('Canvas stream not initialized');
    }

    // Prioritize MP4 (H.264), then WebM
    const preferredTypes = [
      'video/mp4;codecs=h264',
      'video/mp4;codecs=avc1.42E01E',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];

    let options = { videoBitsPerSecond: this.videoBitsPerSecond };
    let selectedType = null;

    // 1. Try user-provided mimeType first if valid
    if (this.mimeType && MediaRecorder.isTypeSupported(this.mimeType)) {
      selectedType = this.mimeType;
    } else {
      // 2. Fallback to preferred list
      for (const type of preferredTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedType = type;
          break;
        }
      }
    }

    if (selectedType) {
        options.mimeType = selectedType;
    } else {
        console.warn('[CanvasRecorder] No preferred mimeType supported, letting browser choose default.');
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
    };
  }

  _startRenderLoop() {
    const render = () => {
      if (!this.isRecording) return;

      // 1. Clear with solid background
      this.proxyCtx.fillStyle = this.backgroundColor;
      this.proxyCtx.fillRect(0, 0, this.proxyCanvas.width, this.proxyCanvas.height);

      // 2. Draw source canvas onto proxy
      // WebGL canvas must have preserveDrawingBuffer: true for this to work
      this.proxyCtx.drawImage(this.canvas, 0, 0);

      this.renderLoopId = requestAnimationFrame(render);
    };

    this.renderLoopId = requestAnimationFrame(render);
  }

  async start() {
    if (this.isRecording) return;

    try {
      this.canvas = this._resolveCanvas();

      // Create a proxy canvas to handle background color
      // This is necessary because MediaRecorder interprets transparency as black
      this.proxyCanvas = document.createElement('canvas');
      this.proxyCanvas.width = this.canvas.width;
      this.proxyCanvas.height = this.canvas.height;
      this.proxyCtx = this.proxyCanvas.getContext('2d');

      // Start render loop to composite frames
      this._startRenderLoop();

      // Use proxy canvas for stream capture
      this.stream = this.proxyCanvas.captureStream(this.framerate);

      if (!this.stream || this.stream.getTracks().length === 0) {
        throw new Error('Failed to capture canvas stream');
      }

      this._initializeMediaRecorder();

      // Start recording
      this.mediaRecorder.start(1000);
      this.isRecording = true;
      this.recordedBlob = null;
    } catch (error) {
      this._cleanup();
      console.error('[CanvasRecorder] Start error:', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRecording || !this.mediaRecorder) return null;

    this.isRecording = false;

    if (this.renderLoopId) {
      cancelAnimationFrame(this.renderLoopId);
      this.renderLoopId = null;
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.recordedChunks, {
            type: this.mediaRecorder.mimeType || 'video/webm'
          });

          this.recordedBlob = blob;

          if (this.autoSave) {
            this.performAutoSave(this.filename, blob);
          }

          this._cleanup();
          resolve(blob);
        } catch (error) {
          this._cleanup();
          console.error('[CanvasRecorder] Stop error:', error);
          reject(error);
        }
      };

      try {
        this.mediaRecorder.stop();
      } catch (error) {
        this._cleanup();
        console.error('[CanvasRecorder] Stop error:', error);
        reject(error);
      }
    });
  }

  _cleanup() {
    if (this.renderLoopId) {
      cancelAnimationFrame(this.renderLoopId);
      this.renderLoopId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.mediaRecorder = null;
    this.canvas = null;
    this.proxyCanvas = null;
    this.proxyCtx = null;
    this.recordedChunks = [];
  }

  getBlob() {
    return this.recordedBlob;
  }

  _getExtension(mimeType) {
    if (!mimeType) return 'webm';
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('webm')) return 'webm';
    return 'webm'; // default fallback
  }

  createDownloadLink(blob = this.recordedBlob, filename = null) {
    if (!blob) return null;
    const ext = this._getExtension(blob.type);
    const finalName = this._buildFilename(filename);
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${finalName}.${ext}`;
    downloadLink.textContent = `Download ${finalName}.${ext}`;
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
    return link.download;
  }

  // Removed - UI prompts should be handled by React components, not service layer

  _buildFilename(filename = null) {
    if (filename) return filename;
    return `phylo-movie-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
  }

  _notifyError(error) {
    console.error('[CanvasRecorder] Recording error:', error);
  }

}

import CCapture from 'ccapture.js/src/CCapture.js';
import { useAppStore } from '../core/store.js';

export class CanvasRecorder {
  constructor({
    format = 'webm-mediarecorder',
    framerate = 60,
    quality = 90,
    verbose = false,
    autoSave = false,
    filename = null,
    notifications = null,
  } = {}) {
    this.format = format;
    this.framerate = framerate;
    this.quality = quality;
    this.verbose = verbose;
    this.autoSave = autoSave;
    this.filename = filename;
    this.notifications = notifications;

    this.capturer = null;
    this.canvas = null;
    this.deck = null;
    this.prevAfterRender = null;
    this.isRecording = false;
    this.recordedBlob = null;
    this._rafId = null;
  }

  _resolveCanvas() {
    const { treeController } = useAppStore.getState();
    const canvas = treeController?.deckManager?.canvas || document.querySelector('#webgl-container canvas');
    if (!canvas) {
      throw new Error('Visualization canvas not found. Make sure the movie has finished rendering.');
    }
    this.deck = treeController?.deckManager?.getDeck?.() || treeController?.deckManager?.deck || null;
    return canvas;
  }

  _createCapturer() {
    const CapturerCtor = CCapture.default || CCapture;
    return new CapturerCtor({
      format: this.format,
      framerate: this.framerate,
      quality: this.quality,
      verbose: this.verbose,
      autoSaveTime: 0,
    });
  }

  _attachCaptureHook() {
    if (this.deck) {
      const previous = this.deck.props?.onAfterRender;
      this.prevAfterRender = previous;
      this.deck.setProps({
        onAfterRender: (...args) => {
          if (typeof previous === 'function') {
            try {
              previous(...args);
            } catch (err) {
              console.error('[CanvasRecorder] Error in previous onAfterRender handler:', err);
            }
          }
          if (this.isRecording) {
            this.capturer.capture(this.canvas);
          }
        },
      });
    } else {
      const step = () => {
        if (!this.isRecording) return;
        this.capturer.capture(this.canvas);
        this._rafId = requestAnimationFrame(step);
      };
      this._rafId = requestAnimationFrame(step);
    }
  }

  _detachCaptureHook() {
    if (this.deck) {
      this.deck.setProps({ onAfterRender: this.prevAfterRender || undefined });
    }
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this.prevAfterRender = null;
    this.deck = null;
  }

  async start() {
    if (this.isRecording) return;
    try {
      this.canvas = this._resolveCanvas();
    } catch (error) {
      this._notifyError(error);
      throw error;
    }

    this.capturer = this._createCapturer();
    this.capturer.start();
    this.isRecording = true;
    this.recordedBlob = null;

    this._attachCaptureHook();
    this._notifyInfo('Recording started. Capturing the visualization canvas.');
    if (this.deck?.redraw) {
      try {
        this.deck.redraw(true);
      } catch (err) {
        console.warn('[CanvasRecorder] Unable to force deck redraw after starting capture:', err);
      }
    }
  }

  async stop() {
    if (!this.isRecording) return null;

    this.isRecording = false;
    this._detachCaptureHook();

    try {
      this.capturer.stop();
      const blob = await this._exportCapture();
      this.recordedBlob = blob;
      this._notifyInfo('Recording finished. Preparing download options.');
      if (this.autoSave) {
        this.performAutoSave(this.filename, blob);
      } else {
        await this.promptManualSave(blob);
      }
      return blob;
    } catch (error) {
      this._notifyError(error);
      throw error;
    } finally {
      this.canvas = null;
      this.capturer = null;
    }
  }

  _exportCapture() {
    return new Promise((resolve, reject) => {
      try {
        this.capturer.save((blob) => {
          if (!blob) {
            reject(new Error('Recording did not produce any data.'));
            return;
          }
          resolve(blob);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  getBlob() {
    return this.recordedBlob;
  }

  createDownloadLink(blob = this.recordedBlob, filename = null) {
    if (!blob) return null;
    const finalName = this._buildFilename(filename);
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `${finalName}.webm`;
    downloadLink.textContent = `Download ${finalName}.webm`;
    downloadLink.style.display = 'block';
    return downloadLink;
  }

  performAutoSave(filename = null, blob = this.recordedBlob) {
    if (!blob) return null;
    const link = this.createDownloadLink(blob, filename);
    if (!link) return null;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    if (this.notifications) {
      this.notifications.show(`Recording saved as: ${link.download}`, 'success');
    }
    return link.download.replace(/\.webm$/, '');
  }

  async promptManualSave(blob = this.recordedBlob) {
    if (!blob) return;
    const shouldSave = window.confirm('Recording complete! Would you like to save it now?');
    if (shouldSave) {
      const filename = this.performAutoSave(this.filename, blob);
    }
  }

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

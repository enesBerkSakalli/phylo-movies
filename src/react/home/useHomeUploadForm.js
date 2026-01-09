import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const WINDOW_MIN = 1;
const WINDOW_MAX = 100000;
const STEP_MIN = 1;
const STEP_MAX = 100000;

// Electron loading helpers
function getElectronAPI() {
  return typeof window !== 'undefined' ? window.electronAPI : null;
}

function showElectronLoading(message) {
  const api = getElectronAPI();
  if (api?.showLoading) api.showLoading(message);
}

function hideElectronLoading() {
  const api = getElectronAPI();
  if (api?.hideLoading) api.hideLoading();
}

function updateElectronProgress(progress, message) {
  const api = getElectronAPI();
  if (api?.updateProgress) api.updateProgress(progress, message);
}

export function useHomeUploadForm() {
  const navigate = useNavigate();
  const [treesFile, setTreesFile] = useState(null);
  const [orderFile, setOrderFile] = useState(null);
  const [msaFile, setMsaFile] = useState(null);
  const [windowSizeValue, setWindowSizeValue] = useState(1000);
  const [stepSizeValue, setStepSizeValue] = useState(10);
  const [windowSizeInput, setWindowSizeInput] = useState('1000');
  const [stepSizeInput, setStepSizeInput] = useState('10');
  const [windowSizeError, setWindowSizeError] = useState('');
  const [stepSizeError, setStepSizeError] = useState('');
  const [midpointRooting, setMidpointRooting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExample, setLoadingExample] = useState(false);
  const [alert, setAlert] = useState(null);
  const [progress, setProgress] = useState({ percent: 0, message: '' });

  const base = useMemo(() => {
    try {
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) {
        return import.meta.env.BASE_URL;
      }
    } catch {}
    return '/';
  }, []);

  function showAlert(message, type = 'danger') {
    setAlert({ type, message });
  }
  function clearAlert() {
    setAlert(null);
  }

  function validateIntegerField(valueStr, min, max, label) {
    const trimmed = (valueStr ?? '').trim();
    if (trimmed === '') {
      return { error: `Enter a ${label}.` };
    }
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) {
      return { error: `${label} must be a number.` };
    }
    if (!Number.isInteger(numeric)) {
      return { error: `${label} must be a whole number.` };
    }
    if (numeric < min) {
      return { error: `${label} must be at least ${min}.` };
    }
    if (numeric > max) {
      return { error: `${label} must be ${max} or below.` };
    }
    return { value: numeric, error: '' };
  }

  function handleWindowInputChange(value) {
    setWindowSizeInput(value);
    const { value: numeric, error } = validateIntegerField(value, WINDOW_MIN, WINDOW_MAX, 'Window size');
    setWindowSizeError(error);
    if (!error && numeric !== undefined) {
      setWindowSizeValue(numeric);
    }
  }

  function handleStepInputChange(value) {
    setStepSizeInput(value);
    const { value: numeric, error } = validateIntegerField(value, STEP_MIN, STEP_MAX, 'Step size');
    setStepSizeError(error);
    if (!error && numeric !== undefined) {
      setStepSizeValue(numeric);
    }
  }

  function commitWindowInput() {
    const { value, error } = validateIntegerField(windowSizeInput, WINDOW_MIN, WINDOW_MAX, 'Window size');
    setWindowSizeError(error);
    if (error) return false;
    setWindowSizeValue(value);
    setWindowSizeInput(String(value));
    return true;
  }

  function commitStepInput() {
    const { value, error } = validateIntegerField(stepSizeInput, STEP_MIN, STEP_MAX, 'Step size');
    setStepSizeError(error);
    if (error) return false;
    setStepSizeValue(value);
    setStepSizeInput(String(value));
    return true;
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();
    clearAlert();
    if (submitting) return;
    if (!treesFile && !msaFile) {
      showAlert('Please select at least a tree file or an MSA file.');
      return;
    }

    const windowValid = commitWindowInput();
    const stepValid = commitStepInput();
    if (!windowValid || !stepValid) {
      showAlert('Please fix the highlighted fields before submitting.');
      return;
    }

    setSubmitting(true);
    setProgress({ percent: 0, message: 'Preparing upload...' });
    showElectronLoading('Preparing upload...');

    let eventSource = null;

    try {
      updateElectronProgress(5, 'Uploading files...');

      const formData = new FormData();
      if (treesFile) formData.append('treeFile', treesFile);
      if (orderFile) formData.append('orderFile', orderFile);
      if (msaFile) formData.append('msaFile', msaFile);
      formData.append('windowSize', String(windowSizeValue ?? 1));
      formData.append('windowStepSize', String(stepSizeValue ?? 1));
      formData.append('midpointRooting', midpointRooting ? 'on' : '');

      // Use streaming endpoint
      const resp = await fetch('/treedata/stream', { method: 'POST', body: formData });
      if (!resp.ok) {
        let errorMsg = 'Upload failed!';
        try {
          const jd = await resp.json();
          if (jd && jd.error) errorMsg = jd.error;
        } catch {
          try { errorMsg = await resp.text(); } catch {}
        }
        throw new Error(errorMsg);
      }

      const { channel_id } = await resp.json();
      if (!channel_id) {
        throw new Error('No channel_id returned from server');
      }

      updateElectronProgress(10, 'Processing tree data...');

      // Connect to SSE stream for progress updates
      const data = await new Promise((resolve, reject) => {
        eventSource = new EventSource(`/stream/progress/${channel_id}`);

        eventSource.addEventListener('progress', (event) => {
          try {
            const progressData = JSON.parse(event.data);
            const percent = progressData.percent ?? progressData.current ?? 0;
            const message = progressData.message || 'Processing...';
            const scaledPercent = Math.min(90, 10 + percent * 0.8);
            setProgress({ percent: scaledPercent, message });
            updateElectronProgress(scaledPercent, message);
          } catch (err) {
            console.warn('[SSE] Failed to parse progress:', err);
          }
        });

        eventSource.addEventListener('log', (event) => {
          try {
            const log = JSON.parse(event.data);
            console.log(`[Backend] ${log.level}: ${log.message}`);
          } catch {}
        });

        eventSource.addEventListener('complete', (event) => {
          eventSource.close();
          eventSource = null;
          try {
            const result = JSON.parse(event.data);
            if (result.error) {
              reject(new Error(result.error));
            } else if (result.data) {
              resolve(result.data);
            } else if (result.result) {
              // Handle alternative response shape
              resolve(result.result);
            } else {
              reject(new Error('No data in complete event'));
            }
          } catch (err) {
            reject(new Error('Failed to parse completion data: ' + err.message));
          }
        });

        eventSource.addEventListener('error', (event) => {
          try {
            const error = JSON.parse(event.data);
            eventSource.close();
            eventSource = null;
            reject(new Error(error.error || 'Processing failed'));
          } catch {
            // SSE connection error (not a server error event)
            if (eventSource.readyState === EventSource.CLOSED) {
              reject(new Error('Connection to server lost'));
            }
          }
        });

        eventSource.onerror = () => {
          if (eventSource && eventSource.readyState === EventSource.CLOSED) {
            eventSource = null;
            reject(new Error('SSE connection closed unexpectedly'));
          }
        };
      });

      if (treesFile && treesFile.name) data.file_name = treesFile.name;

      setProgress({ percent: 92, message: 'Saving data locally...' });
      updateElectronProgress(92, 'Saving data locally...');

      const localforage = (await import('localforage')).default || (await import('localforage'));
      await localforage.setItem('phyloMovieData', data);

      setProgress({ percent: 95, message: 'Processing MSA data...' });
      updateElectronProgress(95, 'Processing MSA data...');

      try {
        const { workflows } = await import('@/js/services/data/dataService.js');
        const fd = new FormData();
        if (msaFile) fd.append('msaFile', msaFile);
        await workflows.handleMSADataSaving(fd, data);
      } catch (err) {
        console.error('[HomePage] MSA workflow error:', err);
      }

      setProgress({ percent: 100, message: 'Complete!' });
      updateElectronProgress(100, 'Complete!');

      // Brief delay to show completion
      await new Promise(resolve => setTimeout(resolve, 300));

      navigate('/visualization');
    } catch (err) {
      showAlert(err.message || String(err));
    } finally {
      // Clean up SSE connection if still open
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      hideElectronLoading();
      setSubmitting(false);
    }
  }

  async function handleLoadExample() {
    clearAlert();
    setLoadingExample(true);
    setProgress({ percent: 0, message: 'Loading example data...' });
    showElectronLoading('Loading example data...');

    try {
      setProgress({ percent: 20, message: 'Fetching example...' });
      updateElectronProgress(20, 'Fetching example...');

      let exampleData = null;
      const candidates = [
        `${base}example.json`,
        '/example.json',
        'example.json',
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

      setProgress({ percent: 70, message: 'Saving data...' });
      updateElectronProgress(70, 'Saving data...');

      const { phyloData } = await import('@/js/services/data/dataService.js');
      await phyloData.set(exampleData);

      setProgress({ percent: 100, message: 'Complete!' });
      updateElectronProgress(100, 'Complete!');
      await new Promise(resolve => setTimeout(resolve, 200));

      navigate('/visualization');
    } catch (err) {
      console.error('[HomePage] Failed to load example:', err);
      showAlert(`Failed to load example: ${err.message || err}`);
    } finally {
      hideElectronLoading();
      setLoadingExample(false);
    }
  }

  function reset() {
    setTreesFile(null);
    setOrderFile(null);
    setMsaFile(null);
    setWindowSizeValue(1000);
  setStepSizeValue(10);
  setWindowSizeInput('1000');
  setStepSizeInput('10');
    setWindowSizeError('');
    setStepSizeError('');
    setMidpointRooting(false);
    clearAlert();
  }

  return {
    // state
    treesFile, setTreesFile,
    orderFile, setOrderFile,
    msaFile, setMsaFile,
    windowSize: windowSizeInput, setWindowSize: handleWindowInputChange,
    stepSize: stepSizeInput, setStepSize: handleStepInputChange,
    windowSizeError, stepSizeError,
    commitWindowInput, commitStepInput,
    midpointRooting, setMidpointRooting,
    submitting, loadingExample, progress,
    alert, showAlert, clearAlert,
    // actions
    handleSubmit, handleLoadExample, reset,
    // derived
    base,
  };
}

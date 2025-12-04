import { useMemo, useState } from 'react';

const WINDOW_MIN = 1;
const WINDOW_MAX = 100000;
const STEP_MIN = 1;
const STEP_MAX = 100000;

export function useHomeUploadForm() {
  const [treesFile, setTreesFile] = useState(null);
  const [orderFile, setOrderFile] = useState(null);
  const [msaFile, setMsaFile] = useState(null);
  const [windowSizeValue, setWindowSizeValue] = useState(1);
  const [stepSizeValue, setStepSizeValue] = useState(1);
  const [windowSizeInput, setWindowSizeInput] = useState('1');
  const [stepSizeInput, setStepSizeInput] = useState('1');
  const [windowSizeError, setWindowSizeError] = useState('');
  const [stepSizeError, setStepSizeError] = useState('');
  const [midpointRooting, setMidpointRooting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingExample, setLoadingExample] = useState(false);
  const [alert, setAlert] = useState(null);

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
    try {
      const formData = new FormData();
      if (treesFile) formData.append('treeFile', treesFile);
      if (orderFile) formData.append('orderFile', orderFile);
      if (msaFile) formData.append('msaFile', msaFile);
      formData.append('windowSize', String(windowSizeValue ?? 1));
      formData.append('windowStepSize', String(stepSizeValue ?? 1));
      formData.append('midpointRooting', midpointRooting ? 'on' : '');

      const resp = await fetch('/treedata', { method: 'POST', body: formData });
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

      const data = await resp.json();
      if (treesFile && treesFile.name) data.file_name = treesFile.name;

      const localforage = (await import('localforage')).default || (await import('localforage'));
      await localforage.setItem('phyloMovieData', data);

      try {
        const { workflows } = await import('@/js/services/data/dataService.js');
        const fd = new FormData();
        if (msaFile) fd.append('msaFile', msaFile);
        await workflows.handleMSADataSaving(fd, data);
      } catch (err) {
        console.error('[HomePage] MSA workflow error:', err);
      }

      window.location.href = `${base}pages/visualization/`;
    } catch (err) {
      showAlert(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoadExample() {
    clearAlert();
    setLoadingExample(true);
    try {
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

      const { phyloData } = await import('@/js/services/data/dataService.js');
      await phyloData.set(exampleData);
      window.location.href = `${base}pages/visualization/`;
    } catch (err) {
      console.error('[HomePage] Failed to load example:', err);
      showAlert(`Failed to load example: ${err.message || err}`);
    } finally {
      setLoadingExample(false);
    }
  }

  function reset() {
    setTreesFile(null);
    setOrderFile(null);
    setMsaFile(null);
    setWindowSizeValue(1);
    setStepSizeValue(1);
    setWindowSizeInput('1');
    setStepSizeInput('1');
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
    submitting, loadingExample,
    alert, showAlert, clearAlert,
    // actions
    handleSubmit, handleLoadExample, reset,
    // derived
    base,
  };
}

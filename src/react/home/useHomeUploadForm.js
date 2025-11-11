import { useMemo, useState } from 'react';

export function useHomeUploadForm() {
  const [treesFile, setTreesFile] = useState(null);
  const [orderFile, setOrderFile] = useState(null);
  const [msaFile, setMsaFile] = useState(null);
  const [windowSize, setWindowSize] = useState(1);
  const [stepSize, setStepSize] = useState(1);
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

  async function handleSubmit(e) {
    e?.preventDefault?.();
    clearAlert();
    if (submitting) return;
    if (!treesFile) {
      showAlert('Please select a tree file.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('treeFile', treesFile);
      if (orderFile) formData.append('orderFile', orderFile);
      if (msaFile) formData.append('msaFile', msaFile);
      formData.append('windowSize', String(windowSize ?? 1));
      formData.append('windowStepSize', String(stepSize ?? 1));
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
        const { workflows } = await import('@/js/services/dataService.js');
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

      const { phyloData } = await import('@/js/services/dataService.js');
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
    setWindowSize(1);
    setStepSize(1);
    setMidpointRooting(false);
    clearAlert();
  }

  return {
    // state
    treesFile, setTreesFile,
    orderFile, setOrderFile,
    msaFile, setMsaFile,
    windowSize, setWindowSize,
    stepSize, setStepSize,
    midpointRooting, setMidpointRooting,
    submitting, loadingExample,
    alert, showAlert, clearAlert,
    // actions
    handleSubmit, handleLoadExample, reset,
    // derived
    base,
  };
}


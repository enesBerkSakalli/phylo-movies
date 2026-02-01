import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { homeFormSchema } from './homeFormModel.js';
import {
  processMovieData,
  finalizeMovieData,
  showElectronLoading,
  hideElectronLoading,
  updateElectronProgress
} from './services/movieProcessing.js';

/**
 * Custom hook to manage the home page upload form.
 * Orchestrates react-hook-form state and movie processing logic.
 */
export function useHomeUploadForm() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [loadingExample, setLoadingExample] = useState(false);
  const [alert, setAlert] = useState(null);
  const [progress, setProgress] = useState({ percent: 0, message: '' });

  const form = useForm({
    resolver: zodResolver(homeFormSchema),
    defaultValues: {
      windowSize: 1000,
      stepSize: 10,
      midpointRooting: false,
      treesFile: null,
      msaFile: null,
      orderFile: null,
      // Tree inference model options (enabled by default for viral data)
      useGtr: true,   // GTR (General Time Reversible) model - more realistic
      useGamma: true, // Gamma rate heterogeneity - accounts for rate variation
      usePseudo: false, // Pseudocounts - off by default, enable for gappy alignments
    },
    mode: "onBlur",
  });

  const { watch, setValue, reset: resetForm } = form;

  // Watch values for reactive UI updates
  const treesFile = watch('treesFile');
  const msaFile = watch('msaFile');
  const midpointRooting = watch('midpointRooting');

  const base = useMemo(() => {
    try {
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) {
        return import.meta.env.BASE_URL;
      }
    } catch { }
    return '/';
  }, []);

  function showAlert(message, type = 'danger') {
    setAlert({ type, message });
  }

  function clearAlert() {
    setAlert(null);
  }

  /**
   * Main submission handler for new projects.
   */
  async function onSubmit(formData) {
    clearAlert();
    if (submitting) return;

    if (!formData.treesFile && !formData.msaFile) {
      showAlert('Please select at least a tree file or an MSA file.');
      return;
    }

    setSubmitting(true);
    setProgress({ percent: 0, message: 'Preparing upload...' });
    showElectronLoading('Preparing upload...');

    try {
      updateElectronProgress(5, 'Uploading files...');

      // Process data via server stream
      const resultData = await processMovieData(formData, setProgress);

      // Finalize saving and MSA workflows
      await finalizeMovieData(resultData, formData, setProgress);

      // Brief delay to show completion sentiment
      await new Promise(resolve => setTimeout(resolve, 300));
      navigate('/visualization');

    } catch (err) {
      console.error('[useHomeUploadForm] Submission error:', err);
      showAlert(err.message || String(err));
    } finally {
      hideElectronLoading();
      setSubmitting(false);
    }
  }

  /**
   * Handler for loading the SARS-CoV-2 example project.
   */
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
        } catch { }
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
      console.error('[useHomeUploadForm] Failed to load example:', err);
      showAlert(`Failed to load example: ${err.message || err}`);
    } finally {
      hideElectronLoading();
      setLoadingExample(false);
    }
  }

  function reset() {
    resetForm();
    clearAlert();
  }

  return {
    form,
    // state
    treesFile,
    msaFile,
    midpointRooting,
    submitting,
    loadingExample,
    progress,
    alert,
    showAlert,
    clearAlert,
    // actions
    handleSubmit: onSubmit,
    handleLoadExample,
    reset,
    // derived
    base,
    // setters for custom UI components (controlled)
    setTreesFile: (f) => setValue('treesFile', f, { shouldValidate: true }),
    setMsaFile: (f) => setValue('msaFile', f, { shouldValidate: true }),
    setMidpointRooting: (v) => setValue('midpointRooting', v, { shouldValidate: true }),
  };
}

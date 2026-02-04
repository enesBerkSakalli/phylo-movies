import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { homeFormSchema } from './homeFormModel.js';
import { getExampleById } from './exampleDatasets.js';
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
  const [loadingExampleId, setLoadingExampleId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [operationState, setOperationState] = useState({ percent: 0, message: '' });

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

  const { setValue, reset: resetForm } = form;

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
    setOperationState({ percent: 0, message: 'Preparing upload...' });
    showElectronLoading('Preparing upload...');

    try {
      updateElectronProgress(5, 'Uploading files...');

      // Process data via server stream
      const resultData = await processMovieData(formData, setOperationState);

      // Finalize saving and MSA workflows
      await finalizeMovieData(resultData, formData, setOperationState);

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
   * Handler for loading example datasets.
   * Fetches the example file and processes it through the normal pipeline.
   * Supports both MSA files (sliding window) and pre-computed Newick tree files.
   */
  async function handleLoadExample(exampleId) {
    clearAlert();

    const example = getExampleById(exampleId);
    if (!example) {
      showAlert(`Example "${exampleId}" not found.`);
      return;
    }

    setLoadingExample(true);
    setLoadingExampleId(exampleId);
    setOperationState({ percent: 0, message: `Loading ${example.name}...` });
    showElectronLoading(`Loading ${example.name}...`);

    try {
      setOperationState({ percent: 10, message: 'Fetching example file...' });
      updateElectronProgress(10, 'Fetching example file...');

      // Fetch the example file from the public examples directory
      const resp = await fetch(example.filePath);
      if (!resp.ok) {
        throw new Error(`Failed to fetch example file: ${resp.status} ${resp.statusText}`);
      }

      const blob = await resp.blob();
      const file = new File([blob], example.fileName, { type: 'application/octet-stream' });

      setOperationState({ percent: 20, message: 'Processing data...' });
      updateElectronProgress(20, 'Processing data...');

      // Build form data based on file type:
      // - 'msa' files use msaFile field and need window/step parameters
      // - 'newick' files use treesFile field (pre-computed trees)
      const formData = {
        msaFile: example.fileType === 'msa' ? file : null,
        treesFile: example.fileType === 'newick' ? file : null,
        orderFile: null,
        ...example.parameters,
      };

      // Process through the standard pipeline
      const resultData = await processMovieData(formData, setOperationState);

      // Set the file name for display
      resultData.file_name = example.fileName;

      // Finalize saving and MSA workflows
      await finalizeMovieData(resultData, formData, setOperationState);

      // Brief delay to show completion
      await new Promise(resolve => setTimeout(resolve, 300));
      navigate('/visualization');

    } catch (err) {
      console.error('[useHomeUploadForm] Failed to load example:', err);
      showAlert(`Failed to load example: ${err.message || err}`);
    } finally {
      hideElectronLoading();
      setLoadingExample(false);
      setLoadingExampleId(null);
    }
  }

  function reset() {
    resetForm();
    clearAlert();
  }

  return {
    form,
    // state
    submitting,
    loadingExample,
    loadingExampleId,
    operationState,
    alert,
    showAlert,
    clearAlert,
    // actions
    handleSubmit: onSubmit,
    handleLoadExample,
    reset,
    // derived
    base,
  };
}

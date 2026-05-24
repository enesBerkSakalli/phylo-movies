import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { workspaceInitializationFormSchema } from './workspaceInitializationFormModel.js';
import { getExampleById } from './exampleDatasets.js';
import { resolveApiUrl } from '../../services/data/apiConfig.js';
import {
  processMovieData,
  finalizeMovieData,
  showElectronLoading,
  hideElectronLoading,
  updateElectronProgress
} from './services/movieProcessing.js';

const BACKEND_STATUS_TIMEOUT_MS = 1500;

/**
 * Custom hook to manage the workspace initialization upload form.
 * Orchestrates react-hook-form state and movie processing logic.
 */
export function useWorkspaceInitializationForm() {
  const navigate = useNavigate();
  const operationRef = useRef({ id: 0, controller: null, mounted: true });
  const [submitting, setSubmitting] = useState(false);
  const [loadingExample, setLoadingExample] = useState(false);
  const [loadingExampleId, setLoadingExampleId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [operationState, setOperationState] = useState({ percent: 0, message: '' });
  const [backendStatus, setBackendStatus] = useState({ state: 'checking' });

  const form = useForm({
    resolver: zodResolver(workspaceInitializationFormSchema),
    defaultValues: {
      windowSize: 1000,
      stepSize: 10,
      midpointRooting: false,
      treesFile: null,
      msaFile: null,
      // Tree inference model options (enabled by default for viral data)
      treeInferenceEngine: 'iqtree',
      iqtreeFastSearch: true,
      iqtreeSupportMode: 'none',
      iqtreeUfbootReplicates: 1000,
      iqtreeShAlrtReplicates: 1000,
      iqtreeBnni: false,
      useGtr: true,   // GTR (General Time Reversible) model - more realistic
      useGamma: true, // Gamma rate heterogeneity - accounts for rate variation
      usePseudo: false, // Pseudocounts - off by default, enable for gappy alignments
      noMl: true,
    },
    mode: "onBlur",
  });

  const { reset: resetForm } = form;

  useEffect(() => {
    return () => {
      operationRef.current.mounted = false;
      operationRef.current.id += 1;
      operationRef.current.controller?.abort();
      hideElectronLoading();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_STATUS_TIMEOUT_MS);

    async function checkBackendStatus() {
      try {
        const aboutUrl = await resolveApiUrl('/about');
        const response = await fetch(aboutUrl, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`Backend health check failed with ${response.status}`);
        }
        if (!cancelled) setBackendStatus({ state: 'ready' });
      } catch {
        if (!cancelled) setBackendStatus({ state: 'unavailable' });
      } finally {
        clearTimeout(timeoutId);
      }
    }

    checkBackendStatus();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

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

    const operation = beginOperation(operationRef);
    setSubmitting(true);
    setOperationState({ percent: 0, message: 'Preparing upload...' });
    showElectronLoading('Preparing upload...');

    try {
      updateElectronProgress(5, 'Uploading files...');

      // Process data via server stream
      const resultData = await processMovieData(
        formData,
        (progress) => setOperationStateIfCurrent(operationRef, operation, progress, setOperationState),
        { signal: operation.controller.signal }
      );
      if (!isCurrentOperation(operationRef, operation)) return;

      // Finalize saving
      await finalizeMovieData(
        resultData,
        formData,
        (progress) => setOperationStateIfCurrent(operationRef, operation, progress, setOperationState)
      );
      if (!isCurrentOperation(operationRef, operation)) return;

      // Brief delay to show completion sentiment
      await new Promise(resolve => setTimeout(resolve, 300));
      if (!isCurrentOperation(operationRef, operation)) return;
      navigate('/visualization');

    } catch (err) {
      if (!isCurrentOperation(operationRef, operation) || err?.name === 'AbortError') return;
      console.error('[useWorkspaceInitializationForm] Submission error:', err);
      showAlert(err.message || String(err));
    } finally {
      if (isCurrentOperation(operationRef, operation)) {
        hideElectronLoading();
        setSubmitting(false);
        finishOperation(operationRef, operation);
      }
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

    const operation = beginOperation(operationRef);
    setLoadingExample(true);
    setLoadingExampleId(exampleId);
    setOperationState({ percent: 0, message: `Loading ${example.name}...` });
    showElectronLoading(`Loading ${example.name}...`);

    try {
      setOperationState({ percent: 10, message: 'Fetching example file...' });
      updateElectronProgress(10, 'Fetching example file...');

      const file = await fetchExampleFile(example.filePath, example.fileName);
      const pairedMsaFile = example.msaFilePath
        ? await fetchExampleFile(example.msaFilePath, example.msaFileName)
        : null;

      setOperationState({ percent: 20, message: 'Processing data...' });
      updateElectronProgress(20, 'Processing data...');

      // Build form data based on file type:
      // - 'msa' files use msaFile field and need window/step parameters
      // - 'newick' files use treesFile field (pre-computed trees)
      // - 'tree-msa' files pair supplied input trees with an alignment
      const formData = {
        msaFile: example.fileType === 'msa' ? file : pairedMsaFile,
        treesFile: example.fileType === 'newick' || example.fileType === 'tree-msa' ? file : null,
        ...example.parameters,
      };

      // Process through the standard pipeline
      const resultData = await processMovieData(
        formData,
        (progress) => setOperationStateIfCurrent(operationRef, operation, progress, setOperationState),
        { signal: operation.controller.signal }
      );
      if (!isCurrentOperation(operationRef, operation)) return;

      // Set the file name for display
      resultData.file_name = example.fileName;

      // Finalize saving
      await finalizeMovieData(
        resultData,
        formData,
        (progress) => setOperationStateIfCurrent(operationRef, operation, progress, setOperationState)
      );
      if (!isCurrentOperation(operationRef, operation)) return;

      // Brief delay to show completion
      await new Promise(resolve => setTimeout(resolve, 300));
      if (!isCurrentOperation(operationRef, operation)) return;
      navigate('/visualization');

    } catch (err) {
      if (!isCurrentOperation(operationRef, operation) || err?.name === 'AbortError') return;
      console.error('[useWorkspaceInitializationForm] Failed to load example:', err);
      showAlert(`Failed to load example: ${err.message || err}`);
    } finally {
      if (isCurrentOperation(operationRef, operation)) {
        hideElectronLoading();
        setLoadingExample(false);
        setLoadingExampleId(null);
        finishOperation(operationRef, operation);
      }
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
    backendStatus,
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

async function fetchExampleFile(filePath, fileName) {
  const resp = await fetch(filePath);
  if (!resp.ok) {
    throw new Error(`Failed to fetch ${fileName}: ${resp.status} ${resp.statusText}`);
  }

  const blob = await resp.blob();
  return new File([blob], fileName, { type: 'application/octet-stream' });
}

function beginOperation(operationRef) {
  operationRef.current.controller?.abort();
  const controller = new AbortController();
  const id = operationRef.current.id + 1;
  operationRef.current.id = id;
  operationRef.current.controller = controller;
  return { id, controller };
}

function isCurrentOperation(operationRef, operation) {
  return (
    operationRef.current.mounted &&
    operationRef.current.id === operation.id &&
    operationRef.current.controller === operation.controller
  );
}

function finishOperation(operationRef, operation) {
  if (operationRef.current.controller === operation.controller) {
    operationRef.current.controller = null;
  }
}

function setOperationStateIfCurrent(operationRef, operation, progress, setOperationState) {
  if (isCurrentOperation(operationRef, operation)) {
    setOperationState(progress);
  }
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { workspaceInitializationFormSchema } from './workspaceInitializationFormModel.js';
import { getExampleById } from './exampleDatasets.js';
import { resolveApiUrl } from '../../services/data/apiConfig.js';
import { phyloData } from '../../services/data/dataService.js';
import {
  processMovieData,
  finalizeMovieData,
  showElectronLoading,
  hideElectronLoading,
  updateElectronProgress,
} from './services/movieProcessing.js';

const BACKEND_STATUS_TIMEOUT_MS = 1500;
const BACKEND_STATUS_POLL_MS = 5000;

/**
 * Custom hook to manage the workspace initialization upload form.
 * Orchestrates react-hook-form state and movie processing logic.
 */
export function useWorkspaceInitializationForm({ skipBackendCheck = false } = {}) {
  const navigate = useNavigate();
  const operationRef = useRef({ id: 0, controller: null, mounted: true });
  const [submitting, setSubmitting] = useState(false);
  const [loadingExample, setLoadingExample] = useState(false);
  const [loadingExampleId, setLoadingExampleId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [operationState, setOperationState] = useState({ percent: 0, message: '' });
  const [backendStatus, setBackendStatus] = useState({
    state: skipBackendCheck ? 'ready' : 'checking',
  });

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
      useGtr: true, // GTR (General Time Reversible) model - more realistic
      useGamma: true, // Gamma rate heterogeneity - accounts for rate variation
      usePseudo: false, // Pseudocounts - off by default, enable for gappy alignments
      noMl: true,
    },
    mode: 'onBlur',
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
    if (skipBackendCheck) {
      setBackendStatus({ state: 'ready', checkedAt: Date.now(), capabilities: [] });
      return undefined;
    }

    let cancelled = false;
    let controller = null;
    let timeoutId = null;
    let pollId = null;

    async function checkBackendStatus() {
      controller?.abort();
      if (timeoutId) clearTimeout(timeoutId);
      controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), BACKEND_STATUS_TIMEOUT_MS);

      try {
        const healthUrl = await resolveApiUrl('/health');
        const response = await fetch(healthUrl, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) {
          throw new Error(`Backend health check failed with ${response.status}`);
        }
        const payload = await response.json();
        if (!payload?.ready || payload.status !== 'ready') {
          throw new Error(`Backend is not ready (${payload?.status || 'unknown'})`);
        }
        if (!cancelled) {
          setBackendStatus({
            state: 'ready',
            checkedAt: Date.now(),
            capabilities: Array.isArray(payload.capabilities) ? payload.capabilities : [],
            version: payload.version || null,
          });
        }
      } catch {
        if (!cancelled) setBackendStatus({ state: 'unavailable', checkedAt: Date.now() });
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      }
    }

    checkBackendStatus();
    pollId = setInterval(checkBackendStatus, BACKEND_STATUS_POLL_MS);

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      if (timeoutId) clearTimeout(timeoutId);
      controller?.abort();
    };
  }, [skipBackendCheck]);

  const base = useMemo(() => {
    try {
      if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) {
        return import.meta.env.BASE_URL;
      }
    } catch {}
    return '/';
  }, []);

  function showAlert(message, type = 'danger', title = 'Action needed') {
    setAlert({ type, title, message });
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

    if (backendStatus.state !== 'ready') {
      showAlert(
        'Backend processing is not ready yet. Wait for Backend Connected, or start BranchArchitect with ./start.sh.',
        'danger',
        'Backend not ready'
      );
      return;
    }

    if (!formData.treesFile && !formData.msaFile) {
      showAlert(
        'Select a Newick tree file, an MSA file, or both before starting processing.',
        'danger',
        'No input file selected'
      );
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
        (progress) =>
          setOperationStateIfCurrent(operationRef, operation, progress, setOperationState),
        { signal: operation.controller.signal }
      );
      if (!isCurrentOperation(operationRef, operation)) return;

      // Finalize saving
      await finalizeMovieData(resultData, formData, (progress) =>
        setOperationStateIfCurrent(operationRef, operation, progress, setOperationState)
      );
      if (!isCurrentOperation(operationRef, operation)) return;

      // Brief delay to show completion sentiment
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (!isCurrentOperation(operationRef, operation)) return;
      navigate('/visualization');
    } catch (err) {
      if (!isCurrentOperation(operationRef, operation) || err?.name === 'AbortError') return;
      console.error('[useWorkspaceInitializationForm] Submission error:', err);
      showAlert(formatProcessingAlertMessage(err), 'danger', 'Dataset processing failed');
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

    if (backendStatus.state !== 'ready') {
      showAlert(
        'Examples require the BranchArchitect backend. Wait for Backend Connected, or start it with ./start.sh.',
        'danger',
        'Backend not ready'
      );
      return;
    }

    const example = getExampleById(exampleId);
    if (!example) {
      showAlert(
        `The example id "${exampleId}" is not registered in the example library.`,
        'danger',
        'Example not found'
      );
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

      const file = await fetchExampleFile(
        example.filePath,
        example.fileName,
        operation.controller.signal
      );
      const pairedMsaFile = example.msaFilePath
        ? await fetchExampleFile(
            example.msaFilePath,
            example.msaFileName,
            operation.controller.signal
          )
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
        runLabel: example.name,
        datasetProvenance: buildExampleDatasetProvenance(example),
        ...example.parameters,
      };

      // Process through the standard pipeline
      const resultData = await processMovieData(
        formData,
        (progress) =>
          setOperationStateIfCurrent(operationRef, operation, progress, setOperationState),
        { signal: operation.controller.signal }
      );
      if (!isCurrentOperation(operationRef, operation)) return;

      // Set the file name for display
      resultData.file_name = example.fileName;

      // Finalize saving
      await finalizeMovieData(resultData, formData, (progress) =>
        setOperationStateIfCurrent(operationRef, operation, progress, setOperationState)
      );
      if (!isCurrentOperation(operationRef, operation)) return;

      // Brief delay to show completion
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (!isCurrentOperation(operationRef, operation)) return;
      navigate('/visualization');
    } catch (err) {
      if (!isCurrentOperation(operationRef, operation) || err?.name === 'AbortError') return;
      console.error('[useWorkspaceInitializationForm] Failed to load example:', err);
      showAlert(formatExampleAlertMessage(example, err), 'danger', 'Example could not be loaded');
    } finally {
      if (isCurrentOperation(operationRef, operation)) {
        hideElectronLoading();
        setLoadingExample(false);
        setLoadingExampleId(null);
        finishOperation(operationRef, operation);
      }
    }
  }

  async function handleOpenPrecomputedExample(exampleId) {
    clearAlert();

    const example = getExampleById(exampleId);
    if (!example?.precomputedPayloadPath) {
      showAlert(
        `The example id "${exampleId}" does not have a generated browser payload.`,
        'danger',
        'Generated example not found'
      );
      return;
    }

    const operation = beginOperation(operationRef);
    setLoadingExample(true);
    setLoadingExampleId(exampleId);
    setOperationState({ percent: 0, message: `Opening ${example.name}...` });

    try {
      setOperationState({ percent: 35, message: 'Fetching generated example...' });
      const payload = await fetchPrecomputedExamplePayload(
        example.precomputedPayloadPath,
        example.name,
        operation.controller.signal
      );
      if (!isCurrentOperation(operationRef, operation)) return;

      setOperationState({ percent: 75, message: 'Preparing visualization...' });
      payload.file_name = payload.file_name || example.fileName;
      await phyloData.set(payload, { label: example.name });
      if (!isCurrentOperation(operationRef, operation)) return;

      navigate('/visualization');
    } catch (err) {
      if (!isCurrentOperation(operationRef, operation) || err?.name === 'AbortError') return;
      console.error('[useWorkspaceInitializationForm] Failed to open generated example:', err);
      showAlert(
        formatGeneratedExampleAlertMessage(example, err),
        'danger',
        'Example could not be opened'
      );
    } finally {
      if (isCurrentOperation(operationRef, operation)) {
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

  function cancelOperation() {
    const controller = operationRef.current.controller;
    if (!controller || (!submitting && !loadingExample)) return;

    operationRef.current.id += 1;
    operationRef.current.controller = null;
    controller.abort();
    hideElectronLoading();
    setSubmitting(false);
    setLoadingExample(false);
    setLoadingExampleId(null);
    setOperationState({ percent: 0, message: '' });
    showAlert('Processing was cancelled before completion.', 'danger', 'Processing cancelled');
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
    handleOpenPrecomputedExample,
    cancelOperation,
    reset,
    // derived
    base,
  };
}

function buildExampleDatasetProvenance(example) {
  const provenance = example.provenance || {};
  return {
    source_type: provenance.sourceType || example.workflow || 'Built-in example',
    source_label: provenance.sourceLabel || example.fileName,
    tree_source: provenance.treeSource || example.description || example.fileName,
    ...(provenance.alignmentSource ? { alignment_source: provenance.alignmentSource } : {}),
    settings: Array.isArray(provenance.settings)
      ? provenance.settings.map(({ label, value }) => ({ label, value }))
      : [],
    ...(example.citation ? { citation: example.citation } : {}),
  };
}

async function fetchExampleFile(filePath, fileName, signal) {
  const resp = await fetch(filePath, { signal });
  if (!resp.ok) {
    throw new Error(
      `Could not download "${fileName}" from the bundled examples (${resp.status} ${resp.statusText}).`
    );
  }

  const blob = await resp.blob();
  return new File([blob], fileName, { type: 'application/octet-stream' });
}

async function fetchPrecomputedExamplePayload(payloadPath, exampleName, signal) {
  const resp = await fetch(payloadPath, { signal, cache: 'no-store' });
  if (!resp.ok) {
    throw new Error(
      `Could not download the generated payload for "${exampleName}" (${resp.status} ${resp.statusText}).`
    );
  }

  return JSON.parse(await resp.text());
}

function formatProcessingAlertMessage(error) {
  const message = error?.message || String(error);
  return `${message} If the backend is offline, start it with ./start.sh and retry.`;
}

function formatExampleAlertMessage(example, error) {
  const message = error?.message || String(error);
  return `Could not load "${example.name}". ${message}`;
}

function formatGeneratedExampleAlertMessage(example, error) {
  const message = error?.message || String(error);
  return `Could not open "${example.name}". ${message}`;
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

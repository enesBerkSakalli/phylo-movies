/**
 * React hook for Electron loading progress
 *
 * Usage:
 * ```tsx
 * import { useElectronLoading } from './useElectronLoading';
 *
 * function MyComponent() {
 *   const { showLoading, hideLoading, updateProgress, isElectron } = useElectronLoading();
 *
 *   const handleSubmit = async () => {
 *     showLoading('Processing tree data...');
 *     try {
 *       updateProgress(20, 'Uploading file...');
 *       await uploadFile();
 *       updateProgress(60, 'Computing interpolations...');
 *       await processData();
 *       updateProgress(100, 'Done!');
 *     } finally {
 *       hideLoading();
 *     }
 *   };
 * }
 * ```
 */

import { useCallback, useMemo } from 'react';

interface ElectronAPI {
  platform: string;
  getAppVersion: () => Promise<string>;
  getBackendUrl: () => Promise<string>;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  updateProgress: (progress: number, message?: string) => void;
  setProgress: (progress: number) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function useElectronLoading() {
  const isElectron = useMemo(() => {
    return typeof window !== 'undefined' && !!window.electronAPI;
  }, []);

  const showLoading = useCallback((message?: string) => {
    if (window.electronAPI) {
      window.electronAPI.showLoading(message || 'Processing...');
    }
  }, []);

  const hideLoading = useCallback(() => {
    if (window.electronAPI) {
      window.electronAPI.hideLoading();
    }
  }, []);

  const updateProgress = useCallback((progress: number, message?: string) => {
    if (window.electronAPI) {
      window.electronAPI.updateProgress(progress, message);
    }
  }, []);

  const setDockProgress = useCallback((progress: number) => {
    if (window.electronAPI) {
      // -1 to hide, 0-1 for progress
      window.electronAPI.setProgress(progress);
    }
  }, []);

  return {
    isElectron,
    showLoading,
    hideLoading,
    updateProgress,
    setDockProgress,
  };
}

/**
 * Wrapper for async operations with loading progress
 *
 * Usage:
 * ```tsx
 * const { withLoading } = useElectronLoading();
 *
 * const result = await withLoading(
 *   async (updateProgress) => {
 *     updateProgress(0, 'Starting...');
 *     const data = await fetchData();
 *     updateProgress(50, 'Processing...');
 *     const result = await processData(data);
 *     updateProgress(100, 'Complete!');
 *     return result;
 *   },
 *   'Loading data...'
 * );
 * ```
 */
export function useElectronLoadingWrapper() {
  const { showLoading, hideLoading, updateProgress, isElectron } = useElectronLoading();

  const withLoading = useCallback(
    async <T>(
      operation: (updateProgress: (progress: number, message?: string) => void) => Promise<T>,
      initialMessage?: string
    ): Promise<T> => {
      showLoading(initialMessage);
      try {
        return await operation(updateProgress);
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading, updateProgress]
  );

  return {
    withLoading,
    isElectron,
  };
}

export default useElectronLoading;

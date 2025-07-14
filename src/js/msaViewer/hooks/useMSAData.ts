/**
 * Hook for managing MSA data from the data service
 */

import { useState, useEffect, useCallback } from "react";
import { msaData, EVENTS } from "../../services/dataService.js";

interface MSADataState {
  msaString: string;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useMSAData(): MSADataState {
  const [msaString, setMsaString] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadMSAData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await msaData.get();
      
      if (data?.rawData && typeof data.rawData === "string") {
        setMsaString(data.rawData);
      } else {
        setMsaString("");
      }
    } catch (err) {
      console.error("[useMSAData] Error loading MSA data:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load MSA data";
      setError(errorMessage);
      setMsaString("");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadMSAData();
  }, [loadMSAData]);

  // Listen for data updates
  useEffect(() => {
    const handleUpdate = () => {
      void loadMSAData();
    };
    
    window.addEventListener(EVENTS.MSA_UPDATED, handleUpdate);
    return () => window.removeEventListener(EVENTS.MSA_UPDATED, handleUpdate);
  }, [loadMSAData]);

  return { msaString, loading, error, reload: loadMSAData };
}
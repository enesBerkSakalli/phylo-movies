import { notifications } from "../notificationSystem.js";

/**
 * Open the MSA viewer window with available data.
 */
export async function handleOpenMSAViewer() {
  // Import MSA viewer module
  const { showMSAViewer } = await import('../../../msaViewer/index.js');

  // Get phylo data for MSA sequences
  const { phyloData } = await import('../../../services/dataService.js');
  const data = await phyloData.get();

  if (!data || !data.msa || !data.msa.sequences) {
    console.warn('[EventHandler] No MSA data available');
    notifications.show('No alignment data available. Please upload an MSA file.', 'warning');
    return;
  }

  // Show the MSA viewer window with data directly
  showMSAViewer(data);
  console.log('[EventHandler] MSA viewer window opened with data');
}


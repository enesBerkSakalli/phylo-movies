import { useAppStore } from '../core/store.js';

// React-based MSA viewer shim to preserve legacy API surface.
// Opens the React window and reads/writes regions via the store.

export async function showMSAViewer() {
  try { useAppStore.getState().openMsaViewer?.(); } catch {}
  return true;
}

export default showMSAViewer;

export async function setMSARegion(start, end) {
  try { useAppStore.getState().setMsaRegion?.(start, end); } catch {}
  return true;
}

export async function clearMSARegion() {
  try { useAppStore.getState().clearMsaRegion?.(); } catch {}
  return true;
}

export async function getMSARegion() {
  try {
    const { msaRegion } = useAppStore.getState();
    if (msaRegion) return { ...msaRegion };
  } catch {}
  return null;
}

import { useContext } from 'react';
import { MSAContext, MSAViewportContext, MSAViewportDispatchContext } from './MSAContextValue.js';

export function useMSA() {
  const context = useContext(MSAContext);
  if (!context) {
    throw new Error('useMSA must be used within an MSAProvider');
  }
  return context;
}

export function useMSAViewport() {
  const context = useContext(MSAViewportContext);
  if (!context) {
    throw new Error('useMSAViewport must be used within an MSAProvider');
  }
  return context;
}

export function useSetMSAVisibleRange() {
  const setVisibleRange = useContext(MSAViewportDispatchContext);
  if (!setVisibleRange) {
    throw new Error('useSetMSAVisibleRange must be used within an MSAProvider');
  }
  return setVisibleRange;
}

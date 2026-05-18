import { useContext } from 'react';
import { MSAContext } from './MSAContextValue.js';

export function useMSA() {
  const context = useContext(MSAContext);
  if (!context) {
    throw new Error('useMSA must be used within an MSAProvider');
  }
  return context;
}

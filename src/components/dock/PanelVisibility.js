import { createContext, useContext } from 'react';

/** Whether the dock panel around a component is on screen. Outside the dock: visible. */
export const PanelVisibility = createContext(true);

export function usePanelVisibility() {
  return useContext(PanelVisibility);
}

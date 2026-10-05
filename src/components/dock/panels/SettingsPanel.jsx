import React from 'react';
import { ToolsSidebar } from '../../sidebar/ToolsSidebar.jsx';
import {
  selectDatasetProvenance,
  selectFileName,
  useAppStore,
} from '../../../state/phyloStore/store.js';

export function SettingsPanel() {
  const fileName = useAppStore(selectFileName) || 'Loading...';
  const datasetProvenance = useAppStore(selectDatasetProvenance);
  return <ToolsSidebar fileName={fileName} datasetProvenance={datasetProvenance} />;
}

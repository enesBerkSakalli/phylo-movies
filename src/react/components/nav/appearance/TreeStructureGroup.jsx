import React from 'react';
import { TreeStructure } from './TreeStructure.jsx';
import { SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar';

export function TreeStructureGroup() {
  return (
    <div className="tree-structure-group-root" data-react-component="tree-structure-group">
      <TreeStructure />
    </div>
  );
}

export default TreeStructureGroup;

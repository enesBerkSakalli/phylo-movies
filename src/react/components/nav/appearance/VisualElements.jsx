import React from 'react';
import { ColoringPanel } from './ColoringPanel.jsx';
import { VisualStyle } from './VisualStyle.jsx';
import { ViewLinking } from './ViewLinking.jsx';
import { SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar';

export function VisualElements() {
  return (
    <div className="visual-elements-root" data-react-component="visual-elements">
      <SidebarGroup>
        <SidebarGroupLabel>Visual Style</SidebarGroupLabel>
        <VisualStyle />
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>Coloring & Styling</SidebarGroupLabel>
        <ColoringPanel />
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>View Linking</SidebarGroupLabel>
        <ViewLinking />
      </SidebarGroup>
    </div>
  );
}

export default VisualElements;

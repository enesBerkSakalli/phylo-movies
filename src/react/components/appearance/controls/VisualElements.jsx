import React from 'react';
import { ColoringPanel } from '../color/ColoringPanel.jsx';
import { VisualStyle } from './VisualStyle.jsx';
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
    </div>
  );
}

export default VisualElements;

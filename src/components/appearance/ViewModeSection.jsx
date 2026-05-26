import React from 'react';
import {
  selectCameraMode,
  selectToggleCameraMode,
  selectTreeControllers,
  useAppStore
} from '../../state/phyloStore/store.js';
import { Button } from '../ui/button';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem
} from '../ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui/collapsible';
import { Box, ChevronDown, Info } from 'lucide-react';

export function ViewModeSection() {
  const treeControllers = useAppStore(selectTreeControllers);
  const cameraMode = useAppStore(selectCameraMode);
  const toggleCameraMode = useAppStore(selectToggleCameraMode);

  const handleCameraModeToggle = () => {
    try {
      const newMode = toggleCameraMode();
      treeControllers.forEach((controller) => controller.setCameraMode(newMode));
    } catch { }
  };

  return (
    <Collapsible asChild className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip="View Mode">
            <Box className="text-primary" />
            <span>View Mode</span>
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <div className="flex flex-col gap-3 px-2 py-3">
                <Button
                  id="camera-mode-button"
                  className="h-9 w-full text-xs"
                  variant="outline"
                  onClick={handleCameraModeToggle}
                >
                  <span id="camera-mode-text">{cameraMode === 'orbit' ? 'Switch to 2D' : 'Switch to 3D'}</span>
                </Button>
                <div className="flex items-start gap-2 text-2xs leading-relaxed text-muted-foreground/80 italic">
                  <Info className="mt-1 size-3 shrink-0" />
                  <span>Switch between flat 2D and interactive 3D tree views.</span>
                </div>
              </div>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export default ViewModeSection;

import React from 'react';
import { useAppStore } from '../../../js/core/store.js';
import { Separator } from '@/components/ui/separator';
import { Download, ArrowLeftRight } from 'lucide-react';
import { SidebarMenuButtons } from '@/components/ui/sidebar-menu-buttons';

export function ButtonsFileOps() {
  const gui = useAppStore((s) => s.gui);
  return (
    <>
      <SidebarMenuButtons
        items={[
          {
            id: 'save-button',
            label: 'Save Image',
            title: 'Save current tree visualization as SVG',
            ariaLabel: 'Save SVG',
            onClick: () => gui?.saveImage?.(),
            icon: <Download className="size-4" />,
          },
        ]}
      />
      <Separator />
    </>
  );
}

export default ButtonsFileOps;

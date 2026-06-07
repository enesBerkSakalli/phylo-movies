import React, { useCallback } from 'react';
import {
  selectBranchTransformation,
  selectLinkGeometryMode,
  selectSetBranchTransformation,
  selectSetLinkGeometryMode,
  useAppStore,
} from '../../../state/phyloStore/store.js';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectValue,
} from '../../ui/select';
import { SidebarMenuSub, SidebarMenuSubItem } from '../../ui/sidebar';
import { GitGraph } from 'lucide-react';

export function TreeStructure() {
  const branchTransformation = useAppStore(selectBranchTransformation);
  const linkGeometryMode = useAppStore(selectLinkGeometryMode);
  const setBranchTransformation = useAppStore(selectSetBranchTransformation);
  const setLinkGeometryMode = useAppStore(selectSetLinkGeometryMode);

  const handleBranchOptionChange = useCallback(
    (nextValue) => setBranchTransformation(nextValue),
    [setBranchTransformation]
  );

  const handleLinkGeometryChange = useCallback(
    (rawValue) => {
      setLinkGeometryMode(rawValue === 'straight' ? 'straight' : 'radial-elbow');
    },
    [setLinkGeometryMode]
  );

  return (
    <SidebarMenuSub>
      <SidebarMenuSubItem>
        <div className="flex flex-col gap-3 px-2 py-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <GitGraph className="size-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Branch Lengths</span>
          </div>
          <Select value={branchTransformation || 'none'} onValueChange={handleBranchOptionChange}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="none">Original: input branch lengths</SelectItem>
                <SelectItem value="sqrt">Readable scale: global sqrt transform</SelectItem>
                <SelectItem value="log">Readable scale: global log transform</SelectItem>
                <SelectItem value="normalized-sqrt">Animation scale: normalized sqrt</SelectItem>
                <SelectItem value="normalized">
                  Animation scale: normalized input lengths
                </SelectItem>
                <SelectItem value="normalized-log">Animation scale: normalized log</SelectItem>
                <SelectItem value="ignore">Topology only: cladogram-style</SelectItem>
                <SelectItem value="linear-scale">Experimental: doubled input lengths</SelectItem>
                <SelectItem value="power2">Experimental: squared input lengths</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Original scale preserves proportional input branch lengths. Readable scale applies one
            global transform. Animation scale normalizes each tree for stable motion, so it is not
            absolute evolutionary scale.
          </p>

          <div className="flex items-center gap-2 text-muted-foreground">
            <GitGraph className="size-3.5" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Link Geometry</span>
          </div>
          <Select
            value={linkGeometryMode || 'radial-elbow'}
            onValueChange={handleLinkGeometryChange}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="radial-elbow">Radial Elbow</SelectItem>
                <SelectItem value="straight">Straight Lines</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </SidebarMenuSubItem>
    </SidebarMenuSub>
  );
}

export default TreeStructure;

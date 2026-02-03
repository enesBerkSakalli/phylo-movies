import React from 'react';
import { Network } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function HomeHero() {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="p-4 bg-splash-accent/10 rounded-md ring-1 ring-splash-accent/20">
          <Network className="size-8 text-splash-accent" />
        </div>
      </div>
      <div className="space-y-4 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight">Animate Topological Rearrangements</h2>
        <p className="text-muted-foreground text-lg leading-relaxed">
          A browser-based tool to visualize transitions between phylogenetic trees.
          Identify regions of rearrangement and observe specific topological shifts in real-time.
        </p>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto border-l-2 border-splash-accent/20 pl-4 py-1 italic">
          Accepts pre-computed tree sequences or generates phylogenies from MSAs via configurable sliding windows,
          highlighting structural changes as you progress through the sequence.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 pt-4">
        <Badge variant="outline" className="px-3 py-1 font-normal text-2xs uppercase tracking-widest border-splash-accent/30 text-splash-accent bg-splash-accent/5">
          Tree & MSA Input
        </Badge>
        <Badge variant="outline" className="px-3 py-1 font-normal text-2xs uppercase tracking-widest border-splash-accent/30 text-splash-accent bg-splash-accent/5">
          Sliding Window Inference
        </Badge>
        <Badge variant="outline" className="px-3 py-1 font-normal text-2xs uppercase tracking-widest border-splash-accent/30 text-splash-accent bg-splash-accent/5">
          Structural Highlights
        </Badge>
      </div>
    </div>
  );
}

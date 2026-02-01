import React from 'react';
import { Sprout } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function HomeHero() {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="p-3 bg-primary/10 rounded-full ring-1 ring-primary/20">
          <Sprout className="size-8 text-primary" />
        </div>
      </div>
      <div className="space-y-2 max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight">Visualize Phylogenetic Evolution</h2>
        <p className="text-muted-foreground text-lg">
          Transform static trees and alignments into dynamic evolutionary narratives.
          Analyze topology changes and sequence conservation side-by-side.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Badge variant="secondary" className="px-3 py-1 font-normal">
          Interactive Timeline
        </Badge>
        <Badge variant="secondary" className="px-3 py-1 font-normal">
          Smooth Transitions
        </Badge>
        <Badge variant="secondary" className="px-3 py-1 font-normal">
          Rich Visualization
        </Badge>
      </div>
    </div>
  );
}

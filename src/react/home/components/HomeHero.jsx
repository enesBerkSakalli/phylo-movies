import React from 'react';
import phyloTreeIcon from '/icons/phylo-tree-icon.svg';

export function HomeHero() {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <img src={phyloTreeIcon} alt="" className="size-16" />
      </div>
      <div className="space-y-4 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight">Phylogenetic Tree Animation</h2>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Visualize topological transitions between phylogenetic trees through smooth morphing animations.
          Track structural rearrangements across tree sequences or sliding-window phylogenies.
        </p>
      </div>
    </div>
  );
}

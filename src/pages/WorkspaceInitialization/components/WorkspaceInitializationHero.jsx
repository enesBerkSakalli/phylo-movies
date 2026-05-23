import React from 'react';
import phyloTreeIcon from '/icons/phylo-tree-icon.svg';

export function WorkspaceInitializationHero() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex justify-center">
        <img src={phyloTreeIcon} alt="" className="size-16" />
      </div>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Phylogenetic Tree Animation</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Visualize topological transitions between phylogenetic trees through smooth morphing animations.
          Track structural rearrangements across tree sequences or sliding-window phylogenies.
        </p>
      </div>
    </div>
  );
}

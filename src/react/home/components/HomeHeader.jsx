import React from 'react';
import { Dna } from 'lucide-react';

export function HomeHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-center gap-2 px-4">
        <Dna className="size-5 text-primary" />
        <h1 className="text-lg font-semibold tracking-tight">Phylo-Movies</h1>
      </div>
    </header>
  );
}

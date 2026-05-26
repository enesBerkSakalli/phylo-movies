import React from 'react';

export function TreeInferenceOptionGroup({ icon: Icon, title, description, children }) {
  return (
    <section className="flex flex-col gap-3 rounded-md border bg-muted/10 p-3">
      <div className="flex min-w-0 gap-2">
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{title}</p>
          <p className="mt-1 text-2xs font-normal leading-tight text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {children}
      </div>
    </section>
  );
}

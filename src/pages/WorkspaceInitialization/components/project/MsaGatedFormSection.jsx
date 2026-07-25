import React from 'react';
import { cn } from '../../../../lib/utils';
import { MsaRequiredBadge } from './MsaRequiredBadge.jsx';

/**
 * Section container shared by project-settings sections that only apply once
 * an MSA is uploaded: header icon/title (with an "MSA required" badge when
 * `hasMsa` is false), a short description, the section's own fields, and an
 * optional italic footnote shown only in the non-embedded (standalone) form.
 */
export function MsaGatedFormSection({
  icon: Icon,
  title,
  badgeDescription,
  description,
  footnote,
  hasMsa,
  embedded = false,
  children,
}) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col gap-4 transition-colors',
        embedded ? '' : 'rounded-md border p-4',
        !embedded && (!hasMsa ? 'border-dashed bg-muted/30' : 'bg-card')
      )}
    >
      {!embedded && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon className={cn('size-4', !hasMsa ? 'text-muted-foreground' : 'text-primary')} />
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          {!hasMsa && <MsaRequiredBadge description={badgeDescription} />}
        </div>
      )}

      <p className="text-2xs text-muted-foreground leading-relaxed">{description}</p>

      {children}

      {footnote && !embedded && (
        <p className="text-2xs text-muted-foreground italic leading-tight">{footnote}</p>
      )}
    </section>
  );
}

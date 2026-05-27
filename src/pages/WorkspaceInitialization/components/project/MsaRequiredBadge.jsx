import React from 'react';
import { Badge } from '../../../../components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/ui/tooltip';

export function MsaRequiredBadge({ description }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="secondary"
          className="h-5 cursor-help px-2 py-0 text-2xs font-medium uppercase tracking-wide"
        >
          MSA required
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

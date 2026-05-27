import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

export function AppTooltip({ children, content, side = 'top', contentClassName }) {
  if (!content) return children;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className={contentClassName}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

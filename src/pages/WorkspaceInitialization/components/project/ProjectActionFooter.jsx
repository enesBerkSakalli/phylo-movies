import React from 'react';
import { Button } from "../../../../components/ui/button";

export function ProjectActionFooter({ disabled, reset, canSubmit }) {
  return (
    <div className="flex justify-end gap-3 border-t bg-transparent pt-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={reset}
        disabled={disabled}
        className="px-4"
      >
        Reset form
      </Button>
      <Button
        type="submit"
        size="sm"
        disabled={disabled || !canSubmit}
        className="px-6"
      >
        Create Visualization
      </Button>
    </div>
  );
}

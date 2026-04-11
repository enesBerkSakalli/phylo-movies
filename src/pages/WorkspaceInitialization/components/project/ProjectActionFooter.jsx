import React from 'react';
import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ProjectActionFooter({ disabled, reset, canSubmit }) {
  return (
    <CardFooter className="flex justify-end gap-3 px-0 pb-0 pt-4 bg-transparent border-t">
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
        className="px-6 shadow-md hover:shadow-lg transition-all"
      >
        Create Visualization
      </Button>
    </CardFooter>
  );
}

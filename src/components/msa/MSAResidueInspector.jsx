import React, { useId, useState } from 'react';
import { ScanSearch } from 'lucide-react';
import { useMSA, useMSAViewport } from './useMSA.js';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

export function MSAResidueInspector() {
  const { processedData } = useMSA();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Inspect alignment residue"
          title="Inspect alignment residue"
          disabled={!processedData?.rows || !processedData?.cols}
          className="text-muted-foreground hover:text-foreground"
        >
          <ScanSearch aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="msa-popover z-[2000]"
        align="start"
        collisionPadding={8}
        aria-label="Alignment residue inspector"
      >
        {processedData?.rows > 0 && processedData?.cols > 0 ? (
          <ResidueInspector onClose={() => setOpen(false)} />
        ) : (
          <p className="text-sm">No alignment loaded.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ResidueInspector({ onClose }) {
  const { processedData, centerViewportOn } = useMSA();
  const { visibleRange } = useMSAViewport();
  const id = useId();
  const { rows, cols, sequences } = processedData;
  const [row, setRow] = useState(() => String(Math.min(rows, (visibleRange?.r0 ?? 0) + 1)));
  const [column, setColumn] = useState(() => String(Math.min(cols, (visibleRange?.c0 ?? 0) + 1)));
  const rowIndex = Number(row) - 1;
  const columnIndex = Number(column) - 1;
  const validRow = row !== '' && Number.isInteger(rowIndex) && rowIndex >= 0 && rowIndex < rows;
  const validColumn =
    column !== '' && Number.isInteger(columnIndex) && columnIndex >= 0 && columnIndex < cols;
  const valid = validRow && validColumn;
  const sequence = valid ? sequences[rowIndex] : null;
  const residue = sequence ? sequence.seq[columnIndex] || '-' : null;

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) centerViewportOn({ row: rowIndex, column: columnIndex });
      }}
    >
      <p className="text-sm font-semibold">Inspect a residue</p>
      <p id={`${id}-help`} className="text-xs text-muted-foreground">
        Enter a row and column, or use the arrow keys in either field.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={`${id}-row`}>Row</Label>
          <Input
            id={`${id}-row`}
            type="number"
            min={1}
            max={rows}
            step={1}
            required
            value={row}
            onChange={(event) => setRow(event.target.value)}
            aria-invalid={!validRow}
            aria-describedby={`${id}-help ${id}-result`}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-column`}>Column</Label>
          <Input
            id={`${id}-column`}
            type="number"
            min={1}
            max={cols}
            step={1}
            required
            value={column}
            onChange={(event) => setColumn(event.target.value)}
            aria-invalid={!validColumn}
            aria-describedby={`${id}-help ${id}-result`}
          />
        </div>
      </div>
      <output
        id={`${id}-result`}
        className="block break-words text-sm"
        aria-live="polite"
        aria-atomic="true"
      >
        {sequence ? (
          <>
            <span className="block">Taxon: {sequence.id}</span>
            <span className="block tabular-nums">
              Row {rowIndex + 1} of {rows} · Column {columnIndex + 1} of {cols}
            </span>
            <span className="block font-semibold">
              Residue: {residue === '-' ? 'Gap (−)' : residue}
            </span>
          </>
        ) : (
          `Enter a whole row from 1 to ${rows} and column from 1 to ${cols}.`
        )}
      </output>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={!valid}>
          Go to residue
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </form>
  );
}

import { Label } from '../../ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from '../../ui/select';
import { SPR_MOVE_EVENT_TABLE_COPY } from './SprMoveEventTable.contract';

export interface BranchValueOption {
  value: string;
  label: string;
  role?: string;
  path?: string[];
}

interface BranchValueSelectorProps {
  id: string;
  branchValueOptions?: BranchValueOption[];
  selectedBranchValueKey?: string;
  selectedBranchValueLabel: string;
  onSelectedBranchValueChange?: (valueKey: string) => void;
  titleDetail: string;
  trailingText?: string;
}

const NO_BRANCH_VALUES_OPTION_LABEL = 'No branch values detected';

function getVisibleBranchValueOptions(options: BranchValueOption[]): BranchValueOption[] {
  const hasSelectableBranchValues = options.some((option) => option.value !== 'none');
  if (hasSelectableBranchValues) return options;

  return options.map((option) =>
    option.value === 'none' ? { ...option, label: NO_BRANCH_VALUES_OPTION_LABEL } : option
  );
}

export function BranchValueSelector({
  id,
  branchValueOptions = [],
  selectedBranchValueKey = 'none',
  selectedBranchValueLabel,
  onSelectedBranchValueChange,
  titleDetail,
  trailingText,
}: BranchValueSelectorProps) {
  const visibleBranchValueOptions = getVisibleBranchValueOptions(branchValueOptions);

  return (
    <div
      className="flex min-w-0 items-center justify-between gap-3 text-2xs"
      title={`${SPR_MOVE_EVENT_TABLE_COPY.selectedValueLabel}: ${selectedBranchValueLabel}. ${titleDetail}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Label htmlFor={id} className="shrink-0 text-2xs font-semibold text-foreground">
          {SPR_MOVE_EVENT_TABLE_COPY.selectedValueLabel}
        </Label>
        <Select
          value={selectedBranchValueKey || 'none'}
          onValueChange={(value) => onSelectedBranchValueChange?.(value)}
          disabled={!onSelectedBranchValueChange || branchValueOptions.length === 0}
        >
          <SelectTrigger
            id={id}
            size="sm"
            className="h-7 min-w-0 flex-1 bg-background text-xs"
            title={selectedBranchValueLabel}
          >
            <span className="truncate">{selectedBranchValueLabel}</span>
          </SelectTrigger>
          <SelectContent className="z-[1300]">
            <SelectGroup>
              {visibleBranchValueOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {trailingText ? (
        <div className="hidden min-w-0 flex-1 truncate text-right text-muted-foreground md:block">
          {trailingText}
        </div>
      ) : null}
    </div>
  );
}

import type { SprMovedSubtreeRecurrence, SprMoveEventRow } from './types';

type SprMoveJumpSource = Pick<SprMoveEventRow, 'frameRange'>;

const firstFiniteInteger = (values: Array<number | null | undefined>): number | null => {
  const value = values.find((item) => Number.isInteger(item));
  return typeof value === 'number' ? value : null;
};

export const getSprMoveJumpFrame = (move: SprMoveJumpSource): number | null =>
  firstFiniteInteger([move.frameRange?.[0]]);

export const getRecurrenceJumpFrame = (recurrence: SprMovedSubtreeRecurrence): number | null =>
  firstFiniteInteger([recurrence.representativeFrameRange?.[0]]);

export const formatInputTreePair = (
  sourceInputTreeIndex: number | null | undefined,
  targetInputTreeIndex: number | null | undefined
): string => {
  if (
    typeof sourceInputTreeIndex === 'number' &&
    Number.isInteger(sourceInputTreeIndex) &&
    typeof targetInputTreeIndex === 'number' &&
    Number.isInteger(targetInputTreeIndex)
  ) {
    return `Source tree ${sourceInputTreeIndex + 1} -> Target tree ${targetInputTreeIndex + 1}`;
  }
  return 'selected source/target tree pair';
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function assertRecord(value: unknown, fieldName: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be an object`);
  }
}

export function assertArray(value: unknown, fieldName: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be an array`);
  }
}

export function requiredArray(value: unknown, fieldName: string): unknown[] {
  assertArray(value, fieldName);
  return value;
}

export function requiredNumberArray(value: unknown, fieldName: string): number[] {
  const array = requiredArray(value, fieldName);
  for (const [index, item] of array.entries()) {
    if (typeof item !== 'number') {
      throw new Error(`Invalid phyloMovieData payload: ${fieldName}[${index}] must be a number`);
    }
  }
  return array as number[];
}

export function requiredStringArray(value: unknown, fieldName: string): string[] {
  const array = requiredArray(value, fieldName);
  for (const [index, item] of array.entries()) {
    if (typeof item !== 'string') {
      throw new Error(`Invalid phyloMovieData payload: ${fieldName}[${index}] must be a string`);
    }
  }
  return array as string[];
}

export function requiredRecord(value: unknown, fieldName: string): Record<string, unknown> {
  assertRecord(value, fieldName);
  return value;
}

export function assertFiniteNumber(value: unknown, fieldName: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be a finite number`);
  }
}

export function validateInteger(value: unknown, fieldName: string): number {
  assertFiniteNumber(value, fieldName);
  if (!Number.isInteger(value)) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be an integer`);
  }
  return value;
}

export function validateIndex(value: unknown, fieldName: string, treeCount: number): number {
  const index = validateInteger(value, fieldName);
  if (index < 0 || index >= treeCount) {
    throw new Error(
      `Invalid phyloMovieData payload: ${fieldName} must be between 0 and ${Math.max(0, treeCount - 1)}`
    );
  }
  return index;
}

export function validateRangeTuple(value: unknown, fieldName: string): [number, number] {
  const range = requiredArray(value, fieldName);
  if (range.length !== 2) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be [number, number]`);
  }

  const start = validateInteger(range[0], `${fieldName}[0]`);
  const end = validateInteger(range[1], `${fieldName}[1]`);
  if (start > end) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} start must be less than or equal to end`);
  }

  return [start, end];
}

export function validateNullableNumber(value: unknown, fieldName: string): number | null {
  if (value === null) return null;
  assertFiniteNumber(value, fieldName);
  return value;
}

export function validateParallelLength(array: unknown[], fieldName: string, treeCount: number): void {
  if (array.length !== treeCount) {
    throw new Error(
      `Invalid phyloMovieData payload: ${fieldName} length (${array.length}) must match interpolated_trees length (${treeCount})`
    );
  }
}

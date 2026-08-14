/**
 * Branch annotation validation: annotation_definitions, expanded annotation
 * fields, and the compact annotation_values pairs, in the nested layout the
 * backend emits and the flat layout ingest normalises to.
 */

import type {
  AnnotationAnalysis,
  AnnotationField,
  AnnotationValue,
  AnnotationValueType,
  TreeNode,
} from './phyloMovieTypes';
import {
  assertExactRecordKeys,
  assertFiniteNumber,
  assertRecord,
  requiredArray,
  requiredRecord,
  validateInteger,
} from './schemaValidation';
import { isNestedAnnotationValues } from './annotationValueLayout';

export type AnnotationDefinition = Omit<AnnotationField, 'value'> & { key: string };

export function validateAnnotationDefinitions(value: unknown): AnnotationDefinition[] {
  if (value === undefined) return [];
  const definitions = requiredArray(value, 'annotation_definitions');
  return definitions.map((definitionValue, index) =>
    validateAnnotationDefinition(definitionValue, `annotation_definitions[${index}]`)
  );
}

/**
 * Validates the label/role/value_type fields shared by AnnotationDefinition
 * and AnnotationField payloads.
 */
function validateAnnotationLabelRoleAndType(
  value: Record<string, unknown>,
  fieldName: string
): { label: string; role: string; valueType: AnnotationValueType } {
  if (typeof value.label !== 'string' || value.label.length === 0) {
    throw new Error(
      `Invalid phyloMovieData payload: ${fieldName}.label must be a non-empty string`
    );
  }
  if (typeof value.role !== 'string' || value.role.length === 0) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.role must be a non-empty string`);
  }
  const valueType = validateAnnotationValueType(value.value_type, `${fieldName}.value_type`);
  return { label: value.label, role: value.role, valueType };
}

/**
 * Validates the optional unit/analysis fields shared by AnnotationDefinition
 * and AnnotationField payloads.
 */
function validateAnnotationUnitAndAnalysis(
  value: Record<string, unknown>,
  fieldName: string
): { unit?: string; analysis?: AnnotationAnalysis } {
  const unit =
    value.unit === undefined ? undefined : validateRequiredString(value.unit, `${fieldName}.unit`);
  const analysis =
    value.analysis === undefined
      ? undefined
      : validateAnnotationAnalysis(value.analysis, `${fieldName}.analysis`);
  return { unit, analysis };
}

function validateAnnotationDefinition(value: unknown, fieldName: string): AnnotationDefinition {
  assertRecord(value, fieldName);
  assertExactRecordKeys(value, fieldName, [
    'key',
    'path',
    'label',
    'value_type',
    'role',
    'unit',
    'analysis',
  ]);

  if (typeof value.key !== 'string' || value.key.length === 0) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.key must be a non-empty string`);
  }
  const path = validateStringArray(value.path, `${fieldName}.path`);
  if (path.length === 0) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.path must not be empty`);
  }
  if (path.join('.') !== value.key) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.path must match key`);
  }
  const { label, role, valueType } = validateAnnotationLabelRoleAndType(value, fieldName);
  const { unit, analysis } = validateAnnotationUnitAndAnalysis(value, fieldName);

  return {
    key: value.key,
    path,
    label,
    value_type: valueType,
    role,
    ...(unit === undefined ? {} : { unit }),
    ...(analysis === undefined ? {} : { analysis }),
  };
}

function validateAnnotationField(
  value: unknown,
  fieldName: string,
  fieldKey: string
): AnnotationField {
  assertRecord(value, fieldName);
  assertExactRecordKeys(value, fieldName, [
    'path',
    'label',
    'value',
    'value_type',
    'role',
    'unit',
    'analysis',
  ]);

  const path = validateStringArray(value.path, `${fieldName}.path`);
  if (path.length === 0) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.path must not be empty`);
  }
  const derivedKey = path.join('.');
  if (derivedKey !== fieldKey) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.path must match field key`);
  }

  const { label, role, valueType } = validateAnnotationLabelRoleAndType(value, fieldName);
  const annotationValue = validateAnnotationValue(value.value, valueType, `${fieldName}.value`);
  const { unit, analysis } = validateAnnotationUnitAndAnalysis(value, fieldName);

  return {
    path,
    label,
    value: annotationValue,
    value_type: valueType,
    role,
    ...(unit === undefined ? {} : { unit }),
    ...(analysis === undefined ? {} : { analysis }),
  };
}

function validateAnnotationAnalysis(value: unknown, fieldName: string): AnnotationAnalysis {
  assertRecord(value, fieldName);
  assertExactRecordKeys(value, fieldName, ['type', 'method', 'mode']);

  if (typeof value.type !== 'string' || value.type.length === 0) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName}.type must be a non-empty string`);
  }

  const method =
    value.method === undefined
      ? undefined
      : validateRequiredString(value.method, `${fieldName}.method`);
  const mode =
    value.mode === undefined ? undefined : validateRequiredString(value.mode, `${fieldName}.mode`);

  return {
    type: value.type,
    ...(method === undefined ? {} : { method }),
    ...(mode === undefined ? {} : { mode }),
  };
}

function validateAnnotationValue(
  value: unknown,
  valueType: AnnotationValueType,
  fieldName: string
): AnnotationValue {
  if (valueType === 'array') {
    const items = requiredArray(value, fieldName);
    return items.map((item, index) => validateAnnotationArrayItem(item, `${fieldName}[${index}]`));
  }

  if (valueType === 'number') {
    assertFiniteNumber(value, fieldName);
    return value;
  }
  if (valueType === 'integer') {
    return validateInteger(value, fieldName);
  }
  if (valueType === 'boolean') {
    if (typeof value !== 'boolean') {
      throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be a boolean`);
    }
    return value;
  }
  if (typeof value !== 'string') {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be a string`);
  }
  return value;
}

function validateAnnotationArrayItem(value: unknown, fieldName: string): string | number | boolean {
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  assertFiniteNumber(value, fieldName);
  return value;
}

function validateAnnotationValueType(value: unknown, fieldName: string): AnnotationValueType {
  if (
    value === 'string' ||
    value === 'number' ||
    value === 'integer' ||
    value === 'boolean' ||
    value === 'array'
  ) {
    return value;
  }
  throw new Error(
    `Invalid phyloMovieData payload: ${fieldName} must be a supported annotation value type`
  );
}

function validateStringArray(value: unknown, fieldName: string): string[] {
  const items = requiredArray(value, fieldName);
  return items.map((item, index) => {
    if (typeof item !== 'string' || item.length === 0) {
      throw new Error(
        `Invalid phyloMovieData payload: ${fieldName}[${index}] must be a non-empty string`
      );
    }
    return item;
  });
}

function validateRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} must be a non-empty string`);
  }
  return value;
}

function validateTreeNodeAnnotations(value: unknown, fieldName: string): TreeNode['annotations'] {
  assertRecord(value, fieldName);
  assertExactRecordKeys(value, fieldName, ['fields']);

  const fieldsRecord = requiredRecord(value.fields, `${fieldName}.fields`);
  const fields: Record<string, AnnotationField> = {};
  for (const [key, fieldValue] of Object.entries(fieldsRecord)) {
    fields[key] = validateAnnotationField(fieldValue, `${fieldName}.fields.${key}`, key);
  }

  return { fields };
}

export function validateNodeAnnotations(
  expandedAnnotations: unknown,
  compactAnnotationValues: unknown,
  expandedFieldName: string,
  compactFieldName: string,
  annotationDefinitions: AnnotationDefinition[]
): TreeNode['annotations'] | undefined {
  if (expandedAnnotations !== undefined) {
    return validateTreeNodeAnnotations(expandedAnnotations, expandedFieldName);
  }
  if (compactAnnotationValues !== undefined) {
    return validateCompactAnnotationValues(
      compactAnnotationValues,
      compactFieldName,
      annotationDefinitions
    );
  }
  return undefined;
}

export function validateTransportNodeAnnotations(
  expandedAnnotations: unknown,
  compactAnnotationValues: unknown,
  expandedFieldName: string,
  compactFieldName: string,
  annotationDefinitions: AnnotationDefinition[]
): void {
  if (expandedAnnotations !== undefined) {
    validateTreeNodeAnnotations(expandedAnnotations, expandedFieldName);
  }
  if (compactAnnotationValues !== undefined) {
    validateCompactAnnotationValues(
      compactAnnotationValues,
      compactFieldName,
      annotationDefinitions
    );
  }
}

export function validateCompactAnnotationValues(
  value: unknown,
  fieldName: string,
  annotationDefinitions: AnnotationDefinition[]
): TreeNode['annotations'] {
  if (annotationDefinitions.length === 0) {
    throw new Error(`Invalid phyloMovieData payload: ${fieldName} requires annotation_definitions`);
  }

  const rows = requiredArray(value, fieldName);
  const fields: Record<string, AnnotationField> = {};

  const addPair = (rawDefinitionIndex: unknown, rawValue: unknown, rowFieldName: string): void => {
    const definitionIndex = validateInteger(rawDefinitionIndex, `${rowFieldName}[0]`);
    if (definitionIndex < 0 || definitionIndex >= annotationDefinitions.length) {
      throw new Error(
        `Invalid phyloMovieData payload: ${rowFieldName}[0] must reference annotation_definitions`
      );
    }

    const definition = annotationDefinitions[definitionIndex];
    if (fields[definition.key] !== undefined) {
      throw new Error(
        `Invalid phyloMovieData payload: ${rowFieldName}[0] duplicates annotation field ${definition.key}`
      );
    }
    const annotationValue = validateAnnotationValue(
      rawValue,
      definition.value_type,
      `${rowFieldName}[1]`
    );
    const { key: _key, ...schema } = definition;
    fields[definition.key] = {
      ...schema,
      value: annotationValue,
    };
  };

  // Nested layout: one two-element array per field, as the backend emits it.
  if (isNestedAnnotationValues(rows)) {
    rows.forEach((row, index) => {
      const rowFieldName = `${fieldName}[${index}]`;
      const tuple = requiredArray(row, rowFieldName);
      if (tuple.length !== 2) {
        throw new Error(
          `Invalid phyloMovieData payload: ${rowFieldName} must be [definition, value]`
        );
      }
      addPair(tuple[0], tuple[1], rowFieldName);
    });
    return { fields };
  }

  // Flat layout: the same pairs inlined, which is what ingest normalises to.
  if (rows.length % 2 !== 0) {
    throw new Error(
      `Invalid phyloMovieData payload: ${fieldName} must hold definition/value pairs`
    );
  }
  for (let offset = 0; offset < rows.length; offset += 2) {
    addPair(rows[offset], rows[offset + 1], `${fieldName}[${offset / 2}]`);
  }

  return { fields };
}

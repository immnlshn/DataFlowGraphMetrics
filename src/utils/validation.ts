/**
 * Validation Utilities
 */

import { NodeRedExport, NodeRedItem } from '../core/types/node-red.types';

/**
 * Validates that input is a valid Node-RED export array
 */
export function isValidNodeRedExport(input: unknown): input is NodeRedExport {
  if (!Array.isArray(input)) {
    return false;
  }

  // Check if all items have required properties
  return input.every(item =>
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    'type' in item &&
    typeof item.id === 'string' &&
    typeof item.type === 'string'
  );
}

/**
 * Validates that an item has the Node-RED item structure
 */
export function isValidNodeRedItem(item: unknown): item is NodeRedItem {
  if (typeof item !== 'object' || item === null) {
    return false;
  }

  const obj = item as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.type === 'string'
  );
}

/**
 * Simple validation error class
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}


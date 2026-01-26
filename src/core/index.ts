/**
 * Core Analysis Module - Public API
 *
 * This is the main entry point for the Node-RED Flow Quality Analyzer.
 *
 * Export all core types for use by consumers and future phases.
 */

// Re-export all types
export * from './core/types/index';

// Re-export validation utilities
export * from './utils/validation';

// Version info
export const VERSION = '0.1.0-phase1';
export const PHASE = 'Phase 1: Foundation & Types';


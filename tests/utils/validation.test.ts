/**
 * Tests for validation utilities and fixtures (mirrors src/utils/validation.ts)
 */

import { describe, it, expect } from 'vitest';
import { isValidNodeRedExport } from '../../src/utils/validation.ts';
import simpleFlow from '../fixtures/simple-flow.json';
import multiComponent from '../fixtures/multi-component.json';
import emptyFlow from '../fixtures/empty-flow.json';
import disabledFlow from '../fixtures/simple-flow-disabled.json';
import complexBranching from '../fixtures/complex-branching.json';

describe('Validation Utilities', () => {
  it('should validate a simple flow export', () => {
    expect(isValidNodeRedExport(simpleFlow)).toBe(true);
  });

  it('should validate multi-component export', () => {
    expect(isValidNodeRedExport(multiComponent)).toBe(true);
  });

  it('should validate empty flow export', () => {
    expect(isValidNodeRedExport(emptyFlow)).toBe(true);
  });

  it('should validate complex-branching export', () => {
    expect(isValidNodeRedExport(complexBranching)).toBe(true);
  });

  it('should reject non-array input', () => {
    expect(isValidNodeRedExport({ invalid: 'data' })).toBe(false);
  });

  it('should reject array with invalid items', () => {
    expect(isValidNodeRedExport([{ missing: 'type' }])).toBe(false);
  });

  it('should reject null input', () => {
    expect(isValidNodeRedExport(null)).toBe(false);
  });
});

describe('Test Fixtures', () => {
  it('should load simple-flow.json', () => {
    expect(simpleFlow).toBeDefined();
    expect(Array.isArray(simpleFlow)).toBe(true);
    expect(simpleFlow.length).toBeGreaterThan(0);
  });

  it('should have 1 flow tab and 3 nodes in simple flow', () => {
    const tabs = simpleFlow.filter(item => item.type === 'tab');
    const nodes = simpleFlow.filter(item => item.type !== 'tab');

    expect(tabs.length).toBe(1);
    expect(nodes.length).toBe(3);
  });

  it('should load multi-component.json', () => {
    expect(multiComponent).toBeDefined();
    expect(Array.isArray(multiComponent)).toBe(true);
  });

  it('should have 2 flow tabs in multi-component', () => {
    const tabs = multiComponent.filter(item => item.type === 'tab');
    expect(tabs.length).toBe(2);
  });

  it('should load complex-branching.json and contain at least one switch node', () => {
    expect(complexBranching).toBeDefined();
    expect(Array.isArray(complexBranching)).toBe(true);
    const switches = complexBranching.filter((item: any) => item.type === 'switch');
    expect(switches.length).toBeGreaterThanOrEqual(1);
  });

  it('should load empty-flow.json', () => {
    expect(emptyFlow).toBeDefined();
    expect(Array.isArray(emptyFlow)).toBe(true);
    expect(emptyFlow.length).toBe(0);
  });

  it('should load disabled flow fixture and mark tab disabled', () => {
    expect(disabledFlow).toBeDefined();
    const tabs = disabledFlow.filter((item: any) => item.type === 'tab');
    expect(tabs.length).toBeGreaterThanOrEqual(1);
    expect((tabs[0] as any).disabled).toBe(true);
  });
});

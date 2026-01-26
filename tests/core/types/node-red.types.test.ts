/**
 * Tests for Node-RED type guards (mirrors src/core/types/node-red.types.ts)
 */

import { describe, it, expect } from 'vitest';
import { isFlowTab, isNode } from '../../../src/core/types/node-red.types.ts';

describe('Node-RED Type Guards', () => {
  it('should identify flow tabs correctly', () => {
    const flowTab = {
      id: 'test',
      type: 'tab',
      label: 'Test Flow'
    };

    expect(isFlowTab(flowTab)).toBe(true);
  });

  it('should identify nodes correctly', () => {
    const node = {
      id: 'node1',
      type: 'inject',
      z: 'flow1',
      wires: [['node2']]
    };

    expect(isNode(node)).toBe(true);
  });

  it('should reject tabs as nodes', () => {
    const flowTab = {
      id: 'test',
      type: 'tab',
      label: 'Test Flow'
    };

    expect(isNode(flowTab)).toBe(false);
  });

  it('should reject nodes as flow tabs', () => {
    const node = {
      id: 'nodeX',
      type: 'debug',
      z: 'flow1',
      wires: []
    };

    expect(isFlowTab(node)).toBe(false);
  });
});


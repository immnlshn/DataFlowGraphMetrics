/**
 * FlowParser Tests
 */

import { describe, it, expect } from 'vitest';
import { FlowParser } from '../../../src/core/parser/FlowParser';
import simpleFlow from '../../fixtures/simple-flow.json';
import multiComponent from '../../fixtures/multi-component.json';
import emptyFlow from '../../fixtures/empty-flow.json';
import simpleFlowDisabled from '../../fixtures/simple-flow-disabled.json';

describe('FlowParser', () => {
  const parser = new FlowParser();

  describe('parse()', () => {
    it('should parse valid single flow from JSON string', () => {
      const jsonString = JSON.stringify(simpleFlow);
      const result = parser.parse(jsonString);

      expect(result).toBeDefined();
      expect(result.tabs).toHaveLength(1);
      expect(result.tabs[0].label).toBe('Simple Flow');
      expect(result.nodes).toHaveLength(3);
    });

    it('should parse valid single flow from parsed object', () => {
      const result = parser.parse(simpleFlow);

      expect(result).toBeDefined();
      expect(result.tabs).toHaveLength(1);
      expect(result.nodes).toHaveLength(3);
    });

    it('should parse multiple flow tabs', () => {
      const result = parser.parse(multiComponent);

      expect(result.tabs).toHaveLength(2);
      expect(result.nodes).toHaveLength(11);
    });

    it('should handle empty flow', () => {
      const result = parser.parse(emptyFlow);

      expect(result).toBeDefined();
      expect(result.tabs).toHaveLength(0);
      expect(result.nodes).toHaveLength(0);
    });

    it('should throw error for invalid JSON string', () => {
      expect(() => parser.parse('invalid json {')).toThrow('Invalid JSON');
    });

    it('should throw error for non-array input', () => {
      expect(() => parser.parse({ not: 'array' })).toThrow('must be an array');
    });

    it('should throw error for item without id', () => {
      const invalid = [{ type: 'tab', label: 'Test' }];
      expect(() => parser.parse(invalid)).toThrow('missing or invalid \'id\'');
    });

    it('should throw error for item without type', () => {
      const invalid = [{ id: '123', label: 'Test' }];
      expect(() => parser.parse(invalid)).toThrow('missing or invalid \'type\'');
    });

    it('should skip disabled flows', () => {
      const result = parser.parse(simpleFlowDisabled);

      expect(result.tabs).toHaveLength(0);
      expect(result.nodes).toHaveLength(0);
    });
  });

  describe('getNodesForTab()', () => {
    it('should return nodes belonging to a specific tab', () => {
      const result = parser.parse(simpleFlow);
      const tabId = result.tabs[0].id;
      const nodes = parser.getNodesForTab(result.nodes, tabId);

      expect(nodes).toHaveLength(3);
      expect(nodes.every(node => node.z === tabId)).toBe(true);
    });

    it('should return empty array for non-existent tab', () => {
      const result = parser.parse(simpleFlow);
      const nodes = parser.getNodesForTab(result.nodes, 'non-existent-id');

      expect(nodes).toHaveLength(0);
    });

    it('should handle multiple tabs correctly', () => {
      const result = parser.parse(multiComponent);

      for (const tab of result.tabs) {
        const nodes = parser.getNodesForTab(result.nodes, tab.id);
        expect(nodes.every(node => node.z === tab.id)).toBe(true);
      }
    });
  });

  describe('filterActiveNodes()', () => {
    it('should filter out disabled nodes', () => {
      const nodes = [
        { id: '1', type: 'inject', wires: [[]], d: false },
        { id: '2', type: 'debug', wires: [[]], d: true },
        { id: '3', type: 'function', wires: [[]] },
      ];

      const activeNodes = parser.filterActiveNodes(nodes);

      expect(activeNodes).toHaveLength(2);
      expect(activeNodes.find(n => n.id === '2')).toBeUndefined();
    });

    it('should return all nodes if none are disabled', () => {
      const result = parser.parse(simpleFlow);
      const activeNodes = parser.filterActiveNodes(result.nodes);

      expect(activeNodes).toHaveLength(result.nodes.length);
    });
  });
});


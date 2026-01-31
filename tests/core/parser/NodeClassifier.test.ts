/**
 * NodeClassifier Tests
 */

import { describe, it, expect } from 'vitest';
import { NodeClassifier } from '../../../src/core/parser/NodeClassifier';
import { NodeRedNode } from '../../../src/core/types/node-red.types';

describe('NodeClassifier', () => {
  describe('isDecisionNode()', () => {
    it('should identify switch nodes as decision nodes', () => {
      const classifier = new NodeClassifier();
      const node: NodeRedNode = {
        id: '1',
        type: 'switch',
        wires: [[], []],
      };

      expect(classifier.isDecisionNode(node)).toBe(true);
    });

    it('should not identify function nodes as decision nodes', () => {
      const classifier = new NodeClassifier();
      const node: NodeRedNode = {
        id: '1',
        type: 'function',
        wires: [[]],
      };

      expect(classifier.isDecisionNode(node)).toBe(false);
    });

    it('should identify function nodes with multiple outputs as decision nodes', () => {
      const classifier = new NodeClassifier();
      const node: NodeRedNode = {
        id: '1',
        type: 'function',
        wires: [[], []],
      };

      expect(classifier.isDecisionNode(node)).toBe(true);
    });

    it('should identify trigger nodes as decision nodes', () => {
      const classifier = new NodeClassifier();
      const node: NodeRedNode = {
        id: '1',
        type: 'trigger',
        wires: [[]],
      };

      expect(classifier.isDecisionNode(node)).toBe(true);
    });

    it('should identify filter nodes as decision nodes', () => {
      const classifier = new NodeClassifier();
      const node: NodeRedNode = {
        id: '1',
        type: 'rbe',
        wires: [[]],
      };

      expect(classifier.isDecisionNode(node)).toBe(true);
    });

    it('should not identify inject nodes as decision nodes', () => {
      const classifier = new NodeClassifier();
      const node: NodeRedNode = {
        id: '1',
        type: 'inject',
        wires: [[]],
      };

      expect(classifier.isDecisionNode(node)).toBe(false);
    });

    it('should not identify debug nodes as decision nodes', () => {
      const classifier = new NodeClassifier();
      const node: NodeRedNode = {
        id: '1',
        type: 'debug',
        wires: [],
      };

      expect(classifier.isDecisionNode(node)).toBe(false);
    });
  });

  describe('custom decision types', () => {
    it('should accept custom decision types', () => {
      const classifier = new NodeClassifier(['my-custom-node']);
      const node: NodeRedNode = {
        id: '1',
        type: 'my-custom-node',
        wires: [[]],
      };

      expect(classifier.isDecisionNode(node)).toBe(true);
    });

    it('should merge custom types with defaults', () => {
      const classifier = new NodeClassifier(['custom']);

      const switchNode: NodeRedNode = { id: '1', type: 'switch', wires: [[]] };
      const customNode: NodeRedNode = { id: '2', type: 'custom', wires: [[]] };

      expect(classifier.isDecisionNode(switchNode)).toBe(true);
      expect(classifier.isDecisionNode(customNode)).toBe(true);
    });
  });

  describe('addDecisionType()', () => {
    it('should add a new decision type', () => {
      const classifier = new NodeClassifier();
      classifier.addDecisionType('http-request');

      const node: NodeRedNode = {
        id: '1',
        type: 'http-request',
        wires: [[]],
      };

      expect(classifier.isDecisionNode(node)).toBe(true);
    });
  });

  describe('removeDecisionType()', () => {
    it('should remove a decision type', () => {
      const classifier = new NodeClassifier();
      classifier.removeDecisionType('switch');

      const node: NodeRedNode = {
        id: '1',
        type: 'switch',
        wires: [[]],
      };

      expect(classifier.isDecisionNode(node)).toBe(false);
    });
  });

  describe('getDecisionTypes()', () => {
    it('should return all decision types', () => {
      const classifier = new NodeClassifier();
      const types = classifier.getDecisionTypes();

      expect(types).toContain('switch');
      expect(types).toContain('trigger');
      expect(types).toContain('rbe');
      expect(types).toHaveLength(3);
    });
  });

  describe('hasMultipleOutputs()', () => {
    it('should return true for nodes with multiple output ports', () => {
      const classifier = new NodeClassifier();
      const node: NodeRedNode = {
        id: '1',
        type: 'switch',
        wires: [['2'], ['3']],
      };

      expect(classifier.hasMultipleOutputs(node)).toBe(true);
    });

    it('should return false for nodes with single output', () => {
      const classifier = new NodeClassifier();
      const node: NodeRedNode = {
        id: '1',
        type: 'inject',
        wires: [['2']],
      };

      expect(classifier.hasMultipleOutputs(node)).toBe(false);
    });

    it('should return false for nodes with broadcast output', () => {
        const classifier = new NodeClassifier();
        const node: NodeRedNode ={
            id: '1',
            type: 'function',
            wires: [['2', '3', '4']],
        };

        expect(classifier.hasMultipleOutputs(node)).toBe(false);
    });

    it('should return false for nodes with no outputs', () => {
      const classifier = new NodeClassifier();
      const node: NodeRedNode = {
        id: '1',
        type: 'debug',
        wires: [],
      };

      expect(classifier.hasMultipleOutputs(node)).toBe(false);
    });
  });

  describe('classifyNodes()', () => {
    it('should classify nodes into decision and regular nodes', () => {
      const classifier = new NodeClassifier();
      const nodes: NodeRedNode[] = [
        { id: '1', type: 'inject', wires: [[]] },
        { id: '2', type: 'switch', wires: [[], []] },
        { id: '3', type: 'function', wires: [[]] },
        { id: '4', type: 'debug', wires: [] },
      ];

      const result = classifier.classifyNodes(nodes);

      expect(result.decisionNodes).toHaveLength(1);
      expect(result.regularNodes).toHaveLength(3);
      expect(result.decisionNodes.map(n => n.type)).toContain('switch');
    });

    it('should handle empty array', () => {
      const classifier = new NodeClassifier();
      const result = classifier.classifyNodes([]);

      expect(result.decisionNodes).toHaveLength(0);
      expect(result.regularNodes).toHaveLength(0);
    });

    it('should handle all decision nodes', () => {
      const classifier = new NodeClassifier();
      const nodes: NodeRedNode[] = [
        { id: '1', type: 'switch', wires: [[]] },
        { id: '2', type: 'switch', wires: [[]] },
      ];

      const result = classifier.classifyNodes(nodes);

      expect(result.decisionNodes).toHaveLength(2);
      expect(result.regularNodes).toHaveLength(0);
    });
  });
});

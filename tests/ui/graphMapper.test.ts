import { describe, it, expect } from 'vitest';
import { mapReportToElements } from '../../src/ui/graphMapper';
import type { ComponentReport } from '../../src/core/types/report.types';

describe('graphMapper', () => {
  describe('mapReportToElements', () => {
    it('should create port nodes for decisional edges', () => {
      // Decision node with multiple distinct output ports (true branching)
      const report: ComponentReport = {
        id: 'comp-1',
        flowId: 'flow-1',
        graph: {
          nodes: [
            { id: 'n1', type: 'switch', flowId: 'flow-1', isDecisionNode: true, metadata: {} },
            { id: 'n2', type: 'debug', flowId: 'flow-1', isDecisionNode: false, metadata: {} },
            { id: 'n3', type: 'debug', flowId: 'flow-1', isDecisionNode: false, metadata: {} }
          ],
          edges: [
            { source: 'n1', target: 'n2', sourcePort: 0 },
            { source: 'n1', target: 'n3', sourcePort: 1 }
          ]
        },
        metrics: {}
      };

      const result = mapReportToElements(report);

      // Should have: n1, n2, n3, port-n1:0, port-n1:1 = 5 nodes
      expect(result.nodes).toHaveLength(5);

      // Port nodes
      const portNodes = result.nodes.filter(n => n.classes === 'port-node');
      expect(portNodes).toHaveLength(2);

      // Should have: n1->port0, port0->n2, n1->port1, port1->n3 = 4 edges
      expect(result.edges).toHaveLength(4);
    });

    it('should create port node for broadcast edges', () => {
      // Node with single output port connecting to multiple targets (multicast)
      const report: ComponentReport = {
        id: 'comp-1',
        flowId: 'flow-1',
        graph: {
          nodes: [
            { id: 'n1', type: 'switch', flowId: 'flow-1', isDecisionNode: true, metadata: {} },
            { id: 'n2', type: 'debug', flowId: 'flow-1', isDecisionNode: false, metadata: {} },
            { id: 'n3', type: 'debug', flowId: 'flow-1', isDecisionNode: false, metadata: {} },
            { id: 'n4', type: 'debug', flowId: 'flow-1', isDecisionNode: false, metadata: {} }
          ],
          edges: [
            { source: 'n1', target: 'n2', sourcePort: 0 },
            { source: 'n1', target: 'n3', sourcePort: 0 },
            { source: 'n1', target: 'n4', sourcePort: 0 }
          ]
        },
        metrics: {}
      };

      const result = mapReportToElements(report);

      // Should have: n1, n2, n3, n4, port-n1:0 = 5 nodes
      expect(result.nodes).toHaveLength(5);

      // Port node for broadcast
      const portNodes = result.nodes.filter(n => n.classes === 'port-node');
      expect(portNodes).toHaveLength(1);

      // Should have: n1->port0, port0->n2, port0->n3, port0->n4 = 4 edges
      expect(result.edges).toHaveLength(4);

      // All edges use the same 'edge' class
      const allEdges = result.edges.filter(e => e.classes === 'edge');
      expect(allEdges).toHaveLength(4);
    });

    it('should not create port nodes for simple linear flow', () => {
      // Simple linear flow with no branching or broadcasting
      const report: ComponentReport = {
        id: 'comp-1',
        flowId: 'flow-1',
        graph: {
          nodes: [
            { id: 'n1', type: 'inject', flowId: 'flow-1', isDecisionNode: false, metadata: {} },
            { id: 'n2', type: 'function', flowId: 'flow-1', isDecisionNode: false, metadata: {} },
            { id: 'n3', type: 'debug', flowId: 'flow-1', isDecisionNode: false, metadata: {} }
          ],
          edges: [
            { source: 'n1', target: 'n2', sourcePort: 0 },
            { source: 'n2', target: 'n3', sourcePort: 0 }
          ]
        },
        metrics: {}
      };

      const result = mapReportToElements(report);

      // Only the 3 regular nodes, no port nodes
      expect(result.nodes).toHaveLength(3);

      // Direct edges, no port nodes needed
      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].classes).toBe('edge');
      expect(result.edges[1].classes).toBe('edge');
    });

    it('should handle mixed edge types correctly', () => {
      // Complex flow with both decisional and broadcast edges
      const report: ComponentReport = {
        id: 'comp-1',
        flowId: 'flow-1',
        graph: {
          nodes: [
            { id: 'n1', type: 'inject', flowId: 'flow-1', isDecisionNode: false, metadata: {} },
            { id: 'n2', type: 'switch', flowId: 'flow-1', isDecisionNode: true, metadata: {} },
            { id: 'n3', type: 'debug', flowId: 'flow-1', isDecisionNode: false, metadata: {} },
            { id: 'n4', type: 'debug', flowId: 'flow-1', isDecisionNode: false, metadata: {} },
            { id: 'n5', type: 'debug', flowId: 'flow-1', isDecisionNode: false, metadata: {} }
          ],
          edges: [
            { source: 'n1', target: 'n2', sourcePort: 0 }, // default edge
            { source: 'n2', target: 'n3', sourcePort: 0 }, // decisional edge (port 0)
            { source: 'n2', target: 'n4', sourcePort: 1 }, // decisional edge (port 1)
            { source: 'n2', target: 'n5', sourcePort: 1 }  // decisional edge (port 1, but also broadcast with n4)
          ]
        },
        metrics: {}
      };

      const result = mapReportToElements(report);

      // Should have: n1, n2, n3, n4, n5, port-n2:0, port-n2:1 = 7 nodes
      expect(result.nodes).toHaveLength(7);

      // Two decisional port nodes
      const portNodes = result.nodes.filter(n => n.classes === 'port-node');
      expect(portNodes).toHaveLength(2);

      // Edges: n1->n2, n2->port0, port0->n3, n2->port1, port1->n4, port1->n5 = 6 edges
      expect(result.edges).toHaveLength(6);
    });

    it('should handle single edge without port node', () => {
      const report: ComponentReport = {
        id: 'comp-1',
        flowId: 'flow-1',
        graph: {
          nodes: [
            { id: 'n1', type: 'switch', flowId: 'flow-1', isDecisionNode: true, metadata: {} },
            { id: 'n2', type: 'debug', flowId: 'flow-1', isDecisionNode: false, metadata: {} }
          ],
          edges: [
            { source: 'n1', target: 'n2', sourcePort: 3 }
          ]
        },
        metrics: {}
      };

      const result = mapReportToElements(report);

      // Single edge from decision node, but only one port, so no port node needed
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].data.sourcePort).toBe(3);
      expect(result.edges[0].data.id).toBe('n1-n2-3');
    });

    it('should classify nodes correctly', () => {
      const report: ComponentReport = {
        id: 'comp-1',
        flowId: 'flow-1',
        graph: {
          nodes: [
            { id: 'n1', type: 'inject', flowId: 'flow-1', isDecisionNode: false, metadata: { name: 'Start' } },
            { id: 'n2', type: 'switch', flowId: 'flow-1', isDecisionNode: true, metadata: { name: 'Decision' } }
          ],
          edges: []
        },
        metrics: {}
      };

      const result = mapReportToElements(report);

      expect(result.nodes).toHaveLength(2);
      expect(result.nodes[0].classes).toBe('normal-node');
      expect(result.nodes[0].data.label).toBe('Start');
      expect(result.nodes[1].classes).toBe('decision-node');
      expect(result.nodes[1].data.label).toBe('Decision');
    });

    it('should create port node for broadcast from non-decision node', () => {
      // Regular node with broadcast (e.g., link out node)
      const report: ComponentReport = {
        id: 'comp-1',
        flowId: 'flow-1',
        graph: {
          nodes: [
            { id: 'n1', type: 'function', flowId: 'flow-1', isDecisionNode: false, metadata: {} },
            { id: 'n2', type: 'debug', flowId: 'flow-1', isDecisionNode: false, metadata: {} },
            { id: 'n3', type: 'debug', flowId: 'flow-1', isDecisionNode: false, metadata: {} }
          ],
          edges: [
            { source: 'n1', target: 'n2', sourcePort: 0 },
            { source: 'n1', target: 'n3', sourcePort: 0 }
          ]
        },
        metrics: {}
      };

      const result = mapReportToElements(report);

      // Should have: n1, n2, n3, port-n1:0 = 4 nodes
      expect(result.nodes).toHaveLength(4);

      // Port node for broadcast (non-decision node, so just port-node)
      const portNodes = result.nodes.filter(n => n.classes === 'port-node');
      expect(portNodes).toHaveLength(1);

      // Should have: n1->port0, port0->n2, port0->n3 = 3 edges
      expect(result.edges).toHaveLength(3);
    });
  });
});

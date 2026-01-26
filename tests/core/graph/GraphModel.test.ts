import { describe, it, expect } from 'vitest';
import { GraphModel } from '../../../src/core/graph/GraphModel';
import { GraphNode, GraphEdge } from '../../../src/core/types/graph.types';

describe('GraphModel', () => {
  describe('Node Management', () => {
    it('should add and retrieve nodes', () => {
      const graph = new GraphModel();
      const node: GraphNode = {
        id: 'node1',
        type: 'function',
        flowId: 'flow1',
        isDecisionNode: false,
        metadata: { name: 'Test Node' }
      };

      graph.addNode(node);

      expect(graph.getNode('node1')).toEqual(node);
      expect(graph.hasNode('node1')).toBe(true);
      expect(graph.getNodeCount()).toBe(1);
    });

    it('should return undefined for non-existent nodes', () => {
      const graph = new GraphModel();
      
      expect(graph.getNode('nonexistent')).toBeUndefined();
      expect(graph.hasNode('nonexistent')).toBe(false);
    });

    it('should overwrite existing node with same ID', () => {
      const graph = new GraphModel();
      const node1: GraphNode = {
        id: 'node1',
        type: 'function',
        flowId: 'flow1',
        isDecisionNode: false,
        metadata: { name: 'First' }
      };
      const node2: GraphNode = {
        id: 'node1',
        type: 'debug',
        flowId: 'flow1',
        isDecisionNode: false,
        metadata: { name: 'Second' }
      };

      graph.addNode(node1);
      graph.addNode(node2);

      expect(graph.getNode('node1')).toEqual(node2);
      expect(graph.getNodeCount()).toBe(1);
    });

    it('should get all node IDs', () => {
      const graph = new GraphModel();
      const nodes: GraphNode[] = [
        { id: 'node1', type: 'inject', flowId: 'flow1', isDecisionNode: false, metadata: {} },
        { id: 'node2', type: 'function', flowId: 'flow1', isDecisionNode: false, metadata: {} },
        { id: 'node3', type: 'debug', flowId: 'flow1', isDecisionNode: false, metadata: {} }
      ];

      nodes.forEach(node => graph.addNode(node));

      const nodeIds = graph.getNodeIds();
      expect(nodeIds).toHaveLength(3);
      expect(nodeIds).toContain('node1');
      expect(nodeIds).toContain('node2');
      expect(nodeIds).toContain('node3');
    });

    it('should get all nodes as an array', () => {
      const graph = new GraphModel();
      const nodes: GraphNode[] = [
        { id: 'node1', type: 'inject', flowId: 'flow1', isDecisionNode: false, metadata: {} },
        { id: 'node2', type: 'function', flowId: 'flow1', isDecisionNode: false, metadata: {} }
      ];

      nodes.forEach(node => graph.addNode(node));

      const retrievedNodes = graph.getNodes();
      expect(retrievedNodes).toHaveLength(2);
      expect(retrievedNodes).toContainEqual(nodes[0]);
      expect(retrievedNodes).toContainEqual(nodes[1]);
    });
  });

  describe('Edge Management', () => {
    it('should add and retrieve edges', () => {
      const graph = new GraphModel();
      const edge: GraphEdge = {
        source: 'node1',
        target: 'node2',
        sourcePort: 0
      };

      graph.addEdge(edge);

      expect(graph.edges).toContain(edge);
      expect(graph.getEdgeCount()).toBe(1);
    });

    it('should allow multiple edges', () => {
      const graph = new GraphModel();
      const edges: GraphEdge[] = [
        { source: 'node1', target: 'node2', sourcePort: 0 },
        { source: 'node2', target: 'node3', sourcePort: 0 },
        { source: 'node1', target: 'node3', sourcePort: 1 }
      ];

      edges.forEach(edge => graph.addEdge(edge));

      expect(graph.getEdgeCount()).toBe(3);
    });

    it('should get incoming edges for a node', () => {
      const graph = new GraphModel();
      const edges: GraphEdge[] = [
        { source: 'node1', target: 'node2', sourcePort: 0 },
        { source: 'node2', target: 'node3', sourcePort: 0 },
        { source: 'node1', target: 'node3', sourcePort: 1 }
      ];

      edges.forEach(edge => graph.addEdge(edge));

      const incoming = graph.getIncoming('node3');
      expect(incoming).toHaveLength(2);
      expect(incoming).toContainEqual(edges[1]);
      expect(incoming).toContainEqual(edges[2]);
    });

    it('should get outgoing edges for a node', () => {
      const graph = new GraphModel();
      const edges: GraphEdge[] = [
        { source: 'node1', target: 'node2', sourcePort: 0 },
        { source: 'node2', target: 'node3', sourcePort: 0 },
        { source: 'node1', target: 'node3', sourcePort: 1 }
      ];

      edges.forEach(edge => graph.addEdge(edge));

      const outgoing = graph.getOutgoing('node1');
      expect(outgoing).toHaveLength(2);
      expect(outgoing).toContainEqual(edges[0]);
      expect(outgoing).toContainEqual(edges[2]);
    });

    it('should return empty array for node with no incoming edges', () => {
      const graph = new GraphModel();
      const edge: GraphEdge = { source: 'node1', target: 'node2', sourcePort: 0 };
      
      graph.addEdge(edge);

      expect(graph.getIncoming('node1')).toEqual([]);
    });

    it('should return empty array for node with no outgoing edges', () => {
      const graph = new GraphModel();
      const edge: GraphEdge = { source: 'node1', target: 'node2', sourcePort: 0 };
      
      graph.addEdge(edge);

      expect(graph.getOutgoing('node2')).toEqual([]);
    });
  });

  describe('Multi-port Support', () => {
    it('should track edges from different source ports', () => {
      const graph = new GraphModel();
      const edges: GraphEdge[] = [
        { source: 'switch1', target: 'node2', sourcePort: 0 },
        { source: 'switch1', target: 'node3', sourcePort: 1 },
        { source: 'switch1', target: 'node4', sourcePort: 2 }
      ];

      edges.forEach(edge => graph.addEdge(edge));

      const outgoing = graph.getOutgoing('switch1');
      expect(outgoing).toHaveLength(3);
      
      const port0Edges = outgoing.filter(e => e.sourcePort === 0);
      const port1Edges = outgoing.filter(e => e.sourcePort === 1);
      const port2Edges = outgoing.filter(e => e.sourcePort === 2);
      
      expect(port0Edges).toHaveLength(1);
      expect(port1Edges).toHaveLength(1);
      expect(port2Edges).toHaveLength(1);
    });
  });

  describe('Empty Graph', () => {
    it('should handle empty graph', () => {
      const graph = new GraphModel();

      expect(graph.getNodeCount()).toBe(0);
      expect(graph.getEdgeCount()).toBe(0);
      expect(graph.getNodeIds()).toEqual([]);
      expect(graph.getNodes()).toEqual([]);
    });
  });
});

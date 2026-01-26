import { describe, it, expect } from 'vitest';
import { ComponentFinder } from '../../../src/core/graph/ComponentFinder';
import { GraphModel } from '../../../src/core/graph/GraphModel';
import { GraphNode } from '../../../src/core/types/graph.types';

describe('ComponentFinder', () => {
  const createNode = (id: string, flowId: string = 'flow1', isDecisionNode: boolean = false): GraphNode => ({
    id,
    type: 'test-node',
    flowId,
    isDecisionNode,
    metadata: {},
  });

  describe('findComponents', () => {
    it('should identify a single component with all connected nodes', () => {
      const graph = new GraphModel();
      graph.addNode(createNode('n1'));
      graph.addNode(createNode('n2'));
      graph.addNode(createNode('n3'));
      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });

      const finder = new ComponentFinder();
      const components = finder.findComponents(graph);

      expect(components).toHaveLength(1);
      expect(components[0].nodes.size).toBe(3);
      expect(components[0].nodes.has('n1')).toBe(true);
      expect(components[0].nodes.has('n2')).toBe(true);
      expect(components[0].nodes.has('n3')).toBe(true);
    });

    it('should identify multiple disconnected components', () => {
      const graph = new GraphModel();
      // Component 1: n1 -> n2
      graph.addNode(createNode('n1'));
      graph.addNode(createNode('n2'));
      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });

      // Component 2: n3 -> n4
      graph.addNode(createNode('n3'));
      graph.addNode(createNode('n4'));
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });

      // Component 3: n5 (isolated)
      graph.addNode(createNode('n5'));

      const finder = new ComponentFinder();
      const components = finder.findComponents(graph);

      expect(components).toHaveLength(3);
      
      // Find each component
      const comp1 = components.find(c => c.nodes.has('n1'));
      const comp2 = components.find(c => c.nodes.has('n3'));
      const comp3 = components.find(c => c.nodes.has('n5'));

      expect(comp1?.nodes.size).toBe(2);
      expect(comp2?.nodes.size).toBe(2);
      expect(comp3?.nodes.size).toBe(1);
    });

    it('should handle components with cycles', () => {
      const graph = new GraphModel();
      graph.addNode(createNode('n1'));
      graph.addNode(createNode('n2'));
      graph.addNode(createNode('n3'));
      
      // Create a cycle: n1 -> n2 -> n3 -> n1
      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n3', target: 'n1', sourcePort: 0 });

      const finder = new ComponentFinder();
      const components = finder.findComponents(graph);

      expect(components).toHaveLength(1);
      expect(components[0].nodes.size).toBe(3);
      expect(components[0].nodes.has('n1')).toBe(true);
      expect(components[0].nodes.has('n2')).toBe(true);
      expect(components[0].nodes.has('n3')).toBe(true);
    });

    it('should handle empty graph', () => {
      const graph = new GraphModel();
      const finder = new ComponentFinder();
      const components = finder.findComponents(graph);

      expect(components).toHaveLength(0);
    });

    it('should handle graph with only isolated nodes', () => {
      const graph = new GraphModel();
      graph.addNode(createNode('n1'));
      graph.addNode(createNode('n2'));
      graph.addNode(createNode('n3'));

      const finder = new ComponentFinder();
      const components = finder.findComponents(graph);

      expect(components).toHaveLength(3);
      components.forEach(comp => {
        expect(comp.nodes.size).toBe(1);
      });
    });

    it('should treat graph as undirected (bidirectional connectivity)', () => {
      const graph = new GraphModel();
      graph.addNode(createNode('n1'));
      graph.addNode(createNode('n2'));
      
      // Only one directed edge, but should still be same component
      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });

      const finder = new ComponentFinder();
      const components = finder.findComponents(graph);

      expect(components).toHaveLength(1);
      expect(components[0].nodes.size).toBe(2);
    });

    it('should handle complex branching structure', () => {
      const graph = new GraphModel();
      /*
       * Structure:
       *     n1
       *    /  \
       *   n2  n3
       *    \  /
       *     n4
       */
      graph.addNode(createNode('n1'));
      graph.addNode(createNode('n2'));
      graph.addNode(createNode('n3'));
      graph.addNode(createNode('n4'));
      
      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n1', target: 'n3', sourcePort: 1 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 0 });
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });

      const finder = new ComponentFinder();
      const components = finder.findComponents(graph);

      expect(components).toHaveLength(1);
      expect(components[0].nodes.size).toBe(4);
    });
  });

  describe('component properties', () => {
    it('should assign unique component IDs', () => {
      const graph = new GraphModel();
      graph.addNode(createNode('n1'));
      graph.addNode(createNode('n2'));
      graph.addNode(createNode('n3'));

      const finder = new ComponentFinder();
      const components = finder.findComponents(graph);

      const ids = components.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should preserve flowId from nodes', () => {
      const graph = new GraphModel();
      graph.addNode(createNode('n1', 'flow-abc'));
      graph.addNode(createNode('n2', 'flow-abc'));
      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });

      const finder = new ComponentFinder();
      const components = finder.findComponents(graph);

      expect(components[0].flowId).toBe('flow-abc');
    });

    it('should create valid subgraph for component', () => {
      const graph = new GraphModel();
      graph.addNode(createNode('n1'));
      graph.addNode(createNode('n2'));
      graph.addNode(createNode('n3'));
      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });

      const finder = new ComponentFinder();
      const components = finder.findComponents(graph);
      const subgraph = components[0].graph;

      expect(subgraph.getNodeCount()).toBe(3);
      expect(subgraph.getEdgeCount()).toBe(2);
      expect(subgraph.hasNode('n1')).toBe(true);
      expect(subgraph.hasNode('n2')).toBe(true);
      expect(subgraph.hasNode('n3')).toBe(true);
    });

    it('should only include edges within component in subgraph', () => {
      const graph = new GraphModel();
      // Component 1
      graph.addNode(createNode('n1'));
      graph.addNode(createNode('n2'));
      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });

      // Component 2
      graph.addNode(createNode('n3'));
      graph.addNode(createNode('n4'));
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });

      const finder = new ComponentFinder();
      const components = finder.findComponents(graph);

      components.forEach(comp => {
        expect(comp.graph.getEdgeCount()).toBe(1);
        comp.graph.getEdges().forEach(edge => {
          expect(comp.nodes.has(edge.source)).toBe(true);
          expect(comp.nodes.has(edge.target)).toBe(true);
        });
      });
    });
  });

  describe('edge cases', () => {
    it('should handle self-loop', () => {
      const graph = new GraphModel();
      graph.addNode(createNode('n1'));
      graph.addEdge({ source: 'n1', target: 'n1', sourcePort: 0 });

      const finder = new ComponentFinder();
      const components = finder.findComponents(graph);

      expect(components).toHaveLength(1);
      expect(components[0].nodes.size).toBe(1);
      expect(components[0].graph.getEdgeCount()).toBe(1);
    });

    it('should handle multi-port connections', () => {
      const graph = new GraphModel();
      graph.addNode(createNode('n1'));
      graph.addNode(createNode('n2'));
      
      // Multiple edges from different ports
      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 1 });

      const finder = new ComponentFinder();
      const components = finder.findComponents(graph);

      expect(components).toHaveLength(1);
      expect(components[0].graph.getEdgeCount()).toBe(2);
    });

    it('should handle decision nodes correctly', () => {
      const graph = new GraphModel();
      graph.addNode(createNode('n1', 'flow1', true)); // decision node
      graph.addNode(createNode('n2'));
      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });

      const finder = new ComponentFinder();
      const components = finder.findComponents(graph);

      expect(components).toHaveLength(1);
      expect(components[0].nodes.has('n1')).toBe(true);
      
      const n1InSubgraph = components[0].graph.getNode('n1');
      expect(n1InSubgraph?.isDecisionNode).toBe(true);
    });
  });
});

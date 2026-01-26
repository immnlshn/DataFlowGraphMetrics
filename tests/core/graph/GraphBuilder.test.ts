import { describe, it, expect, beforeEach } from 'vitest';
import { GraphBuilder } from '../../../src/core/graph/GraphBuilder';
import { NodeClassifier } from '../../../src/core/parser/NodeClassifier';
import { NodeRedNode } from '../../../src/core/types/node-red.types';

describe('GraphBuilder', () => {
  let builder: GraphBuilder;
  let classifier: NodeClassifier;

  beforeEach(() => {
    classifier = new NodeClassifier();
    builder = new GraphBuilder(classifier);
  });

  describe('Basic Graph Construction', () => {
    it('should build graph from simple linear flow', () => {
      const nodes: NodeRedNode[] = [
        {
          id: 'node1',
          type: 'inject',
          z: 'flow1',
          wires: [['node2']],
          name: 'Start',
          x: 100,
          y: 100
        },
        {
          id: 'node2',
          type: 'function',
          z: 'flow1',
          wires: [['node3']],
          name: 'Process'
        },
        {
          id: 'node3',
          type: 'debug',
          z: 'flow1',
          wires: [],
          name: 'Output'
        }
      ];

      const graph = builder.build(nodes, 'flow1');

      expect(graph.getNodeCount()).toBe(3);
      expect(graph.getEdgeCount()).toBe(2);
      
      const node1 = graph.getNode('node1');
      expect(node1).toBeDefined();
      expect(node1?.type).toBe('inject');
      expect(node1?.flowId).toBe('flow1');
      expect(node1?.metadata.name).toBe('Start');
      expect(node1?.metadata.position).toEqual({ x: 100, y: 100 });
      
      const edges = graph.edges;
      expect(edges).toContainEqual({ source: 'node1', target: 'node2', sourcePort: 0 });
      expect(edges).toContainEqual({ source: 'node2', target: 'node3', sourcePort: 0 });
    });

    it('should build graph from nodes without position metadata', () => {
      const nodes: NodeRedNode[] = [
        {
          id: 'node1',
          type: 'inject',
          z: 'flow1',
          wires: [['node2']]
        },
        {
          id: 'node2',
          type: 'debug',
          z: 'flow1',
          wires: []
        }
      ];

      const graph = builder.build(nodes, 'flow1');

      const node1 = graph.getNode('node1');
      expect(node1?.metadata.position).toBeUndefined();
      expect(node1?.metadata.name).toBeUndefined();
    });

    it('should handle empty node list', () => {
      const graph = builder.build([], 'flow1');

      expect(graph.getNodeCount()).toBe(0);
      expect(graph.getEdgeCount()).toBe(0);
    });

    it('should handle nodes with no connections', () => {
      const nodes: NodeRedNode[] = [
        {
          id: 'node1',
          type: 'inject',
          z: 'flow1',
          wires: []
        },
        {
          id: 'node2',
          type: 'debug',
          z: 'flow1',
          wires: []
        }
      ];

      const graph = builder.build(nodes, 'flow1');

      expect(graph.getNodeCount()).toBe(2);
      expect(graph.getEdgeCount()).toBe(0);
    });
  });

  describe('Multi-port Handling', () => {
    it('should handle multi-output nodes', () => {
      const nodes: NodeRedNode[] = [
        {
          id: 'switch1',
          type: 'switch',
          z: 'flow1',
          wires: [
            ['node2'],
            ['node3'],
            ['node4']
          ]
        },
        {
          id: 'node2',
          type: 'debug',
          z: 'flow1',
          wires: []
        },
        {
          id: 'node3',
          type: 'debug',
          z: 'flow1',
          wires: []
        },
        {
          id: 'node4',
          type: 'debug',
          z: 'flow1',
          wires: []
        }
      ];

      const graph = builder.build(nodes, 'flow1');

      expect(graph.getNodeCount()).toBe(4);
      expect(graph.getEdgeCount()).toBe(3);

      const edges = graph.edges;
      expect(edges).toContainEqual({ source: 'switch1', target: 'node2', sourcePort: 0 });
      expect(edges).toContainEqual({ source: 'switch1', target: 'node3', sourcePort: 1 });
      expect(edges).toContainEqual({ source: 'switch1', target: 'node4', sourcePort: 2 });
    });

    it('should handle multiple targets per port', () => {
      const nodes: NodeRedNode[] = [
        {
          id: 'node1',
          type: 'function',
          z: 'flow1',
          wires: [
            ['node2', 'node3', 'node4']
          ]
        },
        {
          id: 'node2',
          type: 'debug',
          z: 'flow1',
          wires: []
        },
        {
          id: 'node3',
          type: 'debug',
          z: 'flow1',
          wires: []
        },
        {
          id: 'node4',
          type: 'debug',
          z: 'flow1',
          wires: []
        }
      ];

      const graph = builder.build(nodes, 'flow1');

      expect(graph.getNodeCount()).toBe(4);
      expect(graph.getEdgeCount()).toBe(3);

      const outgoing = graph.getOutgoing('node1');
      expect(outgoing).toHaveLength(3);
      expect(outgoing.every(e => e.sourcePort === 0)).toBe(true);
    });

    it('should handle empty output ports', () => {
      const nodes: NodeRedNode[] = [
        {
          id: 'switch1',
          type: 'switch',
          z: 'flow1',
          wires: [
            ['node2'],
            [],
            ['node3']
          ]
        },
        {
          id: 'node2',
          type: 'debug',
          z: 'flow1',
          wires: []
        },
        {
          id: 'node3',
          type: 'debug',
          z: 'flow1',
          wires: []
        }
      ];

      const graph = builder.build(nodes, 'flow1');

      expect(graph.getEdgeCount()).toBe(2);
      
      const edges = graph.edges;
      expect(edges).toContainEqual({ source: 'switch1', target: 'node2', sourcePort: 0 });
      expect(edges).toContainEqual({ source: 'switch1', target: 'node3', sourcePort: 2 });
      expect(edges.find(e => e.sourcePort === 1)).toBeUndefined();
    });
  });

  describe('Decision Node Classification', () => {
    it('should mark decision nodes correctly', () => {
      const nodes: NodeRedNode[] = [
        {
          id: 'node1',
          type: 'inject',
          z: 'flow1',
          wires: [['node2']]
        },
        {
          id: 'node2',
          type: 'switch',
          z: 'flow1',
          wires: [['node3'], ['node4']]
        },
        {
          id: 'node3',
          type: 'debug',
          z: 'flow1',
          wires: []
        },
        {
          id: 'node4',
          type: 'debug',
          z: 'flow1',
          wires: []
        }
      ];

      const graph = builder.build(nodes, 'flow1');

      expect(graph.getNode('node1')?.isDecisionNode).toBe(false);
      expect(graph.getNode('node2')?.isDecisionNode).toBe(true);
      expect(graph.getNode('node3')?.isDecisionNode).toBe(false);
      expect(graph.getNode('node4')?.isDecisionNode).toBe(false);
    });
  });

  describe('Edge Direction Preservation', () => {
    it('should preserve correct edge direction', () => {
      const nodes: NodeRedNode[] = [
        {
          id: 'node1',
          type: 'inject',
          z: 'flow1',
          wires: [['node2']]
        },
        {
          id: 'node2',
          type: 'debug',
          z: 'flow1',
          wires: []
        }
      ];

      const graph = builder.build(nodes, 'flow1');

      const edge = graph.edges[0];
      expect(edge.source).toBe('node1');
      expect(edge.target).toBe('node2');

      expect(graph.getOutgoing('node1')).toHaveLength(1);
      expect(graph.getIncoming('node1')).toHaveLength(0);
      
      expect(graph.getOutgoing('node2')).toHaveLength(0);
      expect(graph.getIncoming('node2')).toHaveLength(1);
    });
  });

  describe('Node Metadata Preservation', () => {
    it('should preserve node name and position', () => {
      const nodes: NodeRedNode[] = [
        {
          id: 'node1',
          type: 'inject',
          z: 'flow1',
          wires: [],
          name: 'My Node',
          x: 250,
          y: 150
        }
      ];

      const graph = builder.build(nodes, 'flow1');

      const node = graph.getNode('node1');
      expect(node?.metadata.name).toBe('My Node');
      expect(node?.metadata.position).toEqual({ x: 250, y: 150 });
    });

    it('should preserve flow hierarchy', () => {
      const nodes: NodeRedNode[] = [
        {
          id: 'node1',
          type: 'inject',
          z: 'flow1',
          wires: []
        }
      ];

      const graph = builder.build(nodes, 'flow1');

      const node = graph.getNode('node1');
      expect(node?.flowId).toBe('flow1');
    });
  });

  describe('Invalid Edge Handling', () => {
    it('should skip edges to non-existent nodes', () => {
      const nodes: NodeRedNode[] = [
        {
          id: 'node1',
          type: 'inject',
          z: 'flow1',
          wires: [['node2', 'nonexistent', 'node3']]
        },
        {
          id: 'node2',
          type: 'debug',
          z: 'flow1',
          wires: []
        },
        {
          id: 'node3',
          type: 'debug',
          z: 'flow1',
          wires: []
        }
      ];

      const graph = builder.build(nodes, 'flow1');

      expect(graph.getNodeCount()).toBe(3);
      expect(graph.getEdgeCount()).toBe(2);
      
      const edges = graph.edges;
      expect(edges).toContainEqual({ source: 'node1', target: 'node2', sourcePort: 0 });
      expect(edges).toContainEqual({ source: 'node1', target: 'node3', sourcePort: 0 });
      expect(edges.find(e => e.target === 'nonexistent')).toBeUndefined();
    });
  });

  describe('Multiple Flow Building', () => {
    it('should build multiple graphs for multiple flows', () => {
      const nodesByFlow = new Map<string, NodeRedNode[]>([
        ['flow1', [
          { id: 'node1', type: 'inject', z: 'flow1', wires: [['node2']] },
          { id: 'node2', type: 'debug', z: 'flow1', wires: [] }
        ]],
        ['flow2', [
          { id: 'node3', type: 'inject', z: 'flow2', wires: [['node4']] },
          { id: 'node4', type: 'debug', z: 'flow2', wires: [] }
        ]]
      ]);

      const graphs = builder.buildMultiple(nodesByFlow);

      expect(graphs.size).toBe(2);
      
      const graph1 = graphs.get('flow1');
      expect(graph1?.getNodeCount()).toBe(2);
      expect(graph1?.getNode('node1')?.flowId).toBe('flow1');
      
      const graph2 = graphs.get('flow2');
      expect(graph2?.getNodeCount()).toBe(2);
      expect(graph2?.getNode('node3')?.flowId).toBe('flow2');
    });

    it('should handle empty flows map', () => {
      const graphs = builder.buildMultiple(new Map());

      expect(graphs.size).toBe(0);
    });
  });
});

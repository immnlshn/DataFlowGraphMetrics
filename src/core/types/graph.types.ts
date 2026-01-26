/**
 * Internal Graph Representation
 */

export interface Graph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  type: string;
  flowId: string;
  isDecisionNode: boolean;
  metadata: {
    name?: string;
    position?: { x: number; y: number };
  };
}

export interface GraphEdge {
  source: string;
  target: string;
  sourcePort: number;
}

export interface ConnectedComponent {
  id: string;
  flowId: string;
  nodes: Set<string>;
  graph: Graph;
}


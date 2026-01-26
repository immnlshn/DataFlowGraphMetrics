/**
 * Internal Graph Representation
 */

export interface Graph {
  getNode(id: string): GraphNode | undefined;
  getNodes(): GraphNode[];
  getNodeIds(): string[];
  getNodeCount(): number;
  hasNode(id: string): boolean;
  
  getEdges(): GraphEdge[];
  getEdgeCount(): number;
  getIncoming(nodeId: string): GraphEdge[];
  getOutgoing(nodeId: string): GraphEdge[];
  
  addNode(node: GraphNode): void;
  addEdge(edge: GraphEdge): void;
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


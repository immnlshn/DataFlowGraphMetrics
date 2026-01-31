/**
 * GraphNode - Deeply immutable node representation
 */
export type GraphNode = Readonly<{
  id: string;
  type: string;
  flowId: string;
  isDecisionNode: boolean;
  metadata: Readonly<{
    name?: string;
    position?: Readonly<{ x: number; y: number }>;
  }>;
}>;

/**
 * GraphEdge - Immutable edge representation
 */
export type GraphEdge = Readonly<{
  source: string;
  target: string;
  sourcePort: number;
}>;

/**
 * Graph - Behavioral contract for graph operations with readonly views
 */
export interface Graph {
  getNode(id: string): Readonly<GraphNode> | undefined;
  getNodes(): ReadonlyArray<Readonly<GraphNode>>;
  getNodeIds(): ReadonlyArray<string>;
  getNodeCount(): number;
  hasNode(id: string): boolean;

  getEdges(): ReadonlyArray<Readonly<GraphEdge>>;
  getEdgeCount(): number;
  getIncoming(nodeId: string): ReadonlyArray<Readonly<GraphEdge>>;
  getOutgoing(nodeId: string): ReadonlyArray<Readonly<GraphEdge>>;
  getNeighbors(nodeId: string): ReadonlyArray<string>;

  addNode(node: GraphNode): void;
  addEdge(edge: GraphEdge): void;
}

/**
 * Serializable graph structure for reports
 */
export type GraphData = Readonly<{
  nodes: ReadonlyArray<Readonly<GraphNode>>;
  edges: ReadonlyArray<Readonly<GraphEdge>>;
}>;

/**
 * ConnectedComponent - Immutable component representation
 */
export type ConnectedComponent = Readonly<{
  id: string;
  flowId: string;
  flowName?: string;
  graph: Graph;
}>;

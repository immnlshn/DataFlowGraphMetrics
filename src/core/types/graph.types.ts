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
  /**
   * Get a node by its ID
   * @param id - The ID of the node to retrieve
   * @returns The node if found, otherwise undefined
   */
  getNode(id: string): Readonly<GraphNode> | undefined;

  /**
   * Get all nodes in the graph
   * @returns An array of all nodes in the graph
   */
  getNodes(): ReadonlyArray<Readonly<GraphNode>>;

  /**
   * Get all node IDs in the graph
   * @returns An array of all node IDs in the graph
   */
  getNodeIds(): ReadonlyArray<string>;
  
  /**
   * Get the total count of nodes in the graph
   * @returns The number of nodes in the graph
   */
  getNodeCount(): number;

  /**
   * Check if a node exists in the graph by its ID
   * @param id - The ID of the node to check
   * @returns True if the node exists, otherwise false
   */
  hasNode(id: string): boolean;


  /**
   * Get all edges in the graph
   * @returns An array of all edges in the graph
   */
  getEdges(): ReadonlyArray<Readonly<GraphEdge>>;

  /**
   * Get the total count of edges in the graph
   * @returns The number of edges in the graph
   */
  getEdgeCount(): number;

  /**
   * Get incoming edges for a given node
   * @param nodeId - The ID of the node
   * @returns An array of incoming edges
   */
  getIncoming(nodeId: string): ReadonlyArray<Readonly<GraphEdge>>;

  /**
   * Get outgoing edges for a given node
   * @param nodeId - The ID of the node
   * @returns An array of outgoing edges
   */
  getOutgoing(nodeId: string): ReadonlyArray<Readonly<GraphEdge>>;

  /**
   * Get distinct outgoing port numbers for a given node
   * @param nodeId - The ID of the node
   * @returns An array of distinct outgoing port numbers
   */
  getOutgoingPorts(nodeId: string): ReadonlySet<number>;
  
  /**
   * Get neighbor node IDs for a given node
   * @param nodeId - The ID of the node
   * @returns An array of neighbor node IDs
   */
  getNeighbors(nodeId: string): ReadonlyArray<string>;

  /**
   * Add a node to the graph
   * @param node - The node to add
   */
  addNode(node: GraphNode): void;
  
  /**
   * Add an edge to the graph
   * @param edge - The edge to add
   */
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

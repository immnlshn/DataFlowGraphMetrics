/**
 * GraphModel - Internal graph representation with query methods
 */

import { Graph, GraphNode, GraphEdge } from '../types/graph.types';

export class GraphModel implements Graph {
  private nodes: Map<string, GraphNode>;
  private edges: GraphEdge[];

  constructor() {
    this.nodes = new Map();
    this.edges = [];
  }

  /**
   * Add a node to the graph
   */
  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  /**
   * Add an edge to the graph
   */
  addEdge(edge: GraphEdge): void {
    this.edges.push(edge);
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): Readonly<GraphNode> | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all incoming edges for a node
   */
  getIncoming(nodeId: string): ReadonlyArray<Readonly<GraphEdge>> {
    return this.edges.filter(edge => edge.target === nodeId);
  }

  /**
   * Get all outgoing edges for a node
   */
  getOutgoing(nodeId: string): ReadonlyArray<Readonly<GraphEdge>> {
    return this.edges.filter(edge => edge.source === nodeId);
  }

  getOutgoingPorts(nodeId: string): ReadonlySet<number> {
      const outgoing = this.getOutgoing(nodeId);
      const ports = new Set<number>(outgoing.map(e => e.sourcePort));
      return ports;
  }

  /**
   * Get all node IDs
   */
  getNodeIds(): ReadonlyArray<string> {
    return Array.from(this.nodes.keys());
  }

  /**
   * Get all nodes as an array
   */
  getNodes(): ReadonlyArray<Readonly<GraphNode>> {
    return Array.from(this.nodes.values());
  }

  /**
   * Get the number of nodes
   */
  getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * Get the number of edges
   */
  getEdgeCount(): number {
    return this.edges.length;
  }

  /**
   * Check if a node exists
   */
  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  /**
   * Get all edges
   */
  getEdges(): ReadonlyArray<Readonly<GraphEdge>> {
    return this.edges;
  }

  /**
   * Get all neighbors (undirected) of a node
   */
  getNeighbors(nodeId: string): ReadonlyArray<string> {
    const neighbors = new Set<string>();

    for (const edge of this.edges) {
      if (edge.source === nodeId) {
        neighbors.add(edge.target);
      }
      if (edge.target === nodeId) {
        neighbors.add(edge.source);
      }
    }

    return Array.from(neighbors);
  }
}

import { IMetric } from '../IMetric';
import { ConnectedComponent, Graph, GraphEdge } from '../../types/graph.types';
import { MetricResult } from '../../types/metrics.types';

/**
 * NPath Complexity Metric
 *
 * Computes the number of distinct execution paths through a flow graph from entry nodes to terminal nodes.
 * This metric helps identify the complexity of control flow and potential test coverage requirements.
 *
 * **Approach:**
 * - Identifies all entry nodes (nodes with no incoming edges)
 * - For each entry node, performs a depth-first traversal to count all unique paths
 * - Returns the maximum path count among all entry nodes
 * - Handles cycles by treating revisited nodes as terminal paths
 * - Accounts for multicast nodes (multiple outputs on same port) additively
 * - Adds implicit paths for decision nodes (switch, trigger, filter) that can drop/block messages
 *
 * **Time Complexity:**
 * - Worst case: O(V + E + P) where:
 *   - V = number of nodes (vertices)
 *   - E = number of edges
 *   - P = number of distinct paths (exponential in branching factor)
 * - For graphs with heavy branching, P can grow exponentially
 * - Cycle detection prevents infinite recursion: O(V) per path
 *
 * **Space Complexity:**
 * - O(V) for the visited set in each recursive path
 * - O(D) for recursion depth where D is the longest path without cycles
 * - Total: O(V * D) in worst case
 *
 * @implements {IMetric}
 */
export class NPathComplexityMetric implements IMetric {
  readonly id = 'npath-complexity';
  readonly name = 'NPATH Complexity';
  readonly category = 'complexity' as const;
  readonly description = 'Counts distinct execution paths through the graph';

  /**
   * Computes the NPath complexity for a connected component.
   *
   * The complexity is determined by finding the maximum number of paths
   * from any single entry node. Multiple entry nodes are analyzed independently
   * since they represent different trigger points, not parallel execution.
   *
   * @param component - The connected component to analyze
   * @returns Metric result containing the maximum path count
   */
  public compute(component: ConnectedComponent): MetricResult {
    const graph = component.graph;
    const nodes = graph.getNodes();

    // Empty graph has no execution paths
    if (nodes.length === 0) {
      return {
        value: 0,
        metadata: {
          interpretation: 'Empty flow - no execution paths'
        }
      };
    }

    const entryNodes = this.findEntryNodes(graph);
    const startNodes = entryNodes.length > 0 ? entryNodes : [nodes[0]];

    // Compute paths from each entry node and take the maximum
    // Multiple entry points don't multiply complexity - they represent
    // independent triggers, not parallel execution
    let maxPaths = 0;
    for (const entry of startNodes) {
      const paths = this.countPathsFrom(graph, entry.id, new Set());
      maxPaths = Math.max(maxPaths, paths);
    }

    return {
      value: maxPaths,
      metadata: {
        details: {
          entryNodeCount: entryNodes.length
        },
        interpretation: this.generateInterpretation(maxPaths, entryNodes.length)
      }
    };
  }

  /**
   * Identifies all entry nodes in the graph.
   * Entry nodes are nodes with no incoming edges, representing flow start points.
   *
   * @param graph - The graph to analyze
   * @returns Array of entry nodes
   */
  private findEntryNodes(graph: Graph) {
    return graph.getNodes().filter(
      node => graph.getIncoming(node.id).length === 0
    );
  }

  /**
   * Recursively counts distinct execution paths from a given node using depth-first search.
   *
   * The algorithm tracks visited nodes to detect cycles. When a cycle is detected,
   * it counts as one terminal path. For nodes with multiple outputs, paths are summed
   * additively. Decision nodes that can drop or block messages contribute implicit paths.
   *
   * **Why create a new visited set for each branch?**
   * Consider this graph: A -> B -> C
   *                           \-> D -> C
   * When exploring paths from A:
   * - Path 1: A -> B -> C (visited: {A, B, C})
   * - Path 2: A -> B -> D -> C (visited: {A, B, D, C})
   *
   * Both paths should count C as reachable. If we shared the visited set,
   * when path 1 marks C as visited, path 2 would incorrectly think it's a cycle.
   * Each path exploration needs its own visited history to correctly identify
   * cycles within THAT path, not across different parallel paths.
   *
   * @param graph - The graph being analyzed
   * @param nodeId - Current node to count paths from
   * @param visited - Set of node IDs visited in the current path (for cycle detection)
   * @returns Number of distinct paths from this node to any terminal point
   */
  private countPathsFrom(
    graph: Graph,
    nodeId: string,
    visited: Set<string>
  ): number {
    // Cycle detection: if we've visited this node in current path,
    // count it as 1 terminal path (the loop itself)
    if (visited.has(nodeId)) {
      return 1;
    }

    const node = graph.getNode(nodeId);
    if (!node) {
      return 0;
    }

    // Track this node as visited in the current path
    // Create NEW visited set to maintain independence between different path branches
    // This ensures each path maintains its own history for accurate cycle detection
    const newVisited = new Set(visited);
    newVisited.add(nodeId);

    const outgoing = graph.getOutgoing(nodeId);

    // Terminal node: exactly 1 path ends here
    if (outgoing.length === 0) {
      return 1;
    }

    // Count paths through all outgoing edges
    const pathsFromEdges = this.countPathsFromEdges(graph, outgoing, newVisited);

    // Add implicit paths for decision nodes
    const implicitPaths = this.countImplicitPaths(node);

    return pathsFromEdges + implicitPaths;
  }

  /**
   * Counts paths through outgoing edges, accounting for multicast behavior.
   *
   * Edges are grouped by source port. Multiple edges on the same port (multicast)
   * contribute additively to the path count, as messages are sent to all targets.
   *
   * @param graph - The graph being analyzed
   * @param outgoing - Array of outgoing edges
   * @param visited - Set of visited nodes for cycle detection
   * @returns Total path count through all edges
   */
  private countPathsFromEdges(
    graph: Graph,
    outgoing: readonly GraphEdge[],
    visited: Set<string>
  ): number {
    // Group edges by source port to handle multicast correctly
    const edgesByPort = this.groupEdgesByPort(outgoing);

    // Sum paths from all outgoing edges
    // Multicast (multiple edges on same port) contributes additively
    let totalPaths = 0;
    for (const edges of edgesByPort.values()) {
      for (const edge of edges) {
        totalPaths += this.countPathsFrom(graph, edge.target, visited);
      }
    }

    return totalPaths;
  }

  /**
   * Groups edges by their source port number.
   * This is necessary to correctly handle multicast nodes that send messages
   * to multiple targets from the same output port.
   *
   * @param edges - Array of edges to group
   * @returns Map of port numbers to arrays of edges
   */
  private groupEdgesByPort(edges: readonly GraphEdge[]): Map<number, GraphEdge[]> {
    const edgesByPort = new Map<number, GraphEdge[]>();
    for (const edge of edges) {
      if (!edgesByPort.has(edge.sourcePort)) {
        edgesByPort.set(edge.sourcePort, []);
      }
      edgesByPort.get(edge.sourcePort)!.push(edge);
    }
    return edgesByPort;
  }

  /**
   * Counts implicit execution paths for decision nodes.
   *
   * Certain node types can drop or block messages, creating implicit paths
   * that don't follow explicit edges in the graph:
   * - Switch nodes: Have an implicit "drop" path when no condition matches
   * - Trigger/RBE nodes: Have an implicit "block" path when triggered
   *
   * @param node - The node to check for implicit paths
   * @returns Number of implicit paths (0, 1, or more)
   */
  private countImplicitPaths(node: any): number {
    if (!node.isDecisionNode) {
      return 0;
    }

    if (node.type === 'switch') {
      // Switch has implicit "drop" path when no condition matches
      return 1;
    }

    if (node.type === 'trigger' || node.type === 'rbe') {
      // Trigger/Filter has implicit "block" path
      return 1;
    }

    return 0;
  }

  /**
   * Generates a user-friendly interpretation of the NPath complexity value.
   *
   * Provides qualitative assessment and actionable insights based on the path count:
   * - 1: Linear flow, single execution path
   * - 2-5: Simple branching, minimal testing needed
   * - 6-20: Moderate complexity, comprehensive testing recommended
   * - 21-100: High complexity, difficult to test thoroughly
   * - 101+: Very high complexity, strongly consider refactoring
   *
   * @param pathCount - The computed number of distinct paths
   * @param entryNodes - Number of entry nodes in the component
   * @returns Human-readable interpretation string for UI display
   */
  private generateInterpretation(pathCount: number, entryNodes: number): string {
    const entryText = entryNodes === 1 ? '1 entry point' : `${entryNodes} entry points`;

    if (pathCount === 0) {
      return 'Empty flow - no execution paths';
    }

    if (pathCount === 1) {
      return `Linear flow with single execution path (${entryText}).`;
    }

    if (pathCount <= 5) {
      return `Simple flow with ${pathCount} distinct paths (${entryText}).`;
    }

    if (pathCount <= 20) {
      return `Moderate complexity with ${pathCount} distinct paths (${entryText}).`;
    }

    if (pathCount <= 100) {
      return `High complexity with ${pathCount} distinct paths (${entryText}).`;
    }

    return `Very high complexity with ${pathCount} distinct paths (${entryText}).`;
  }
}

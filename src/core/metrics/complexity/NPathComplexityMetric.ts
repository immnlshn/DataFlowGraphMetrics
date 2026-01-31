/**
 * NPathComplexityMetric - Counts distinct execution paths through the graph
 *
 * Algorithm: DFS with memoization
 * - Handles cycles by detecting back edges (returns loop path contribution)
 * - Handles multicast: same port to multiple targets = independent decisions multiply
 * - Handles implicit termination: switch/trigger/RBE can stop execution
 *
 * Key insights:
 * - Multicast itself doesn't create paths (fanout is parallel)
 * - BUT independent decisions within multicast targets DO multiply
 * - Cycles contribute: paths through loop + ways to exit loop
 *
 * Complexity: O(V + E) where V = nodes, E = edges
 */

import { IMetric } from '../IMetric';
import { ConnectedComponent, GraphEdge } from '../../types/graph.types';
import { MetricResult } from '../../types/metrics.types';

export class NPathComplexityMetric implements IMetric {
  readonly id = 'npath-complexity';
  readonly name = 'NPATH Complexity';
  readonly category = 'complexity' as const;
  readonly description = 'Counts distinct execution paths through the graph';

  /**
   * Groups edges by their source port number
   */
  private groupEdgesByPort(edges: ReadonlyArray<Readonly<GraphEdge>>): Map<number, GraphEdge[]> {
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
   * Checks if a cycle target node has multiple output ports (indicating exits from the cycle)
   */
  private cycleHasExits(targetNodeId: string, graph: ConnectedComponent['graph']): boolean {
    const targetOutgoing = graph.getOutgoing(targetNodeId);
    const targetPorts = new Set(targetOutgoing.map(e => e.sourcePort));
    return targetPorts.size > 1;
  }

  /**
   * Calculates the path contribution for a back edge (cycle)
   */
  private getCyclePathContribution(targetNodeId: string, graph: ConnectedComponent['graph']): number {
    if (this.cycleHasExits(targetNodeId, graph)) {
      // Cycle with exits: count both "loop forever" and "eventually exit" paths
      return 2;
    } else {
      // Cycle with no exits: just count the loop itself
      return 1;
    }
  }

  /**
   * Calculates paths through a single port's edges (handles multicast)
   */
  private calculatePortPaths(
    edges: GraphEdge[],
    graph: ConnectedComponent['graph'],
    visited: Map<string, number>,
    processing: Set<string>
  ): number {
    // Multicast on same port: independent decisions multiply
    let portPaths = 1;

    for (const edge of edges) {
      const targetPaths = this.countPathsFromNode(edge.target, graph, visited, processing);

      if (processing.has(edge.target)) {
        // Back edge detected - this is a cycle
        portPaths *= this.getCyclePathContribution(edge.target, graph);
      } else {
        // Normal edge - multiply by target's path count
        portPaths *= targetPaths;
      }
    }

    return portPaths;
  }

  /**
   * Checks if a node type has implicit termination (catch-all or block behavior)
   */
  private hasImplicitTermination(nodeType: string): boolean {
    return nodeType === 'switch' || nodeType === 'trigger' || nodeType === 'rbe';
  }

  /**
   * Count paths from a node using DFS with cycle detection
   */
  private countPathsFromNode(
    nodeId: string,
    graph: ConnectedComponent['graph'],
    visited: Map<string, number>,
    processing: Set<string>
  ): number {
    // Cycle detected - node is ancestor in current DFS path
    if (processing.has(nodeId)) {
      return 0; // Will be handled by the ancestor node itself
    }

    // Already computed
    if (visited.has(nodeId)) {
      return visited.get(nodeId)!;
    }

    processing.add(nodeId);

    const node = graph.getNode(nodeId);
    if (!node) {
      processing.delete(nodeId);
      return 0;
    }

    const outgoing = graph.getOutgoing(nodeId);

    // Terminal node (no outgoing edges)
    if (outgoing.length === 0) {
      processing.delete(nodeId);
      visited.set(nodeId, 1);
      return 1;
    }

    // Group edges by source port (critical for multicast handling)
    const edgesByPort = this.groupEdgesByPort(outgoing);

    // Sum paths from each output port
    let totalPaths = 0;
    for (const [port, edges] of edgesByPort) {
      const portPaths = this.calculatePortPaths(edges, graph, visited, processing);
      totalPaths += portPaths;
    }

    // Add implicit termination for switch/trigger/RBE nodes
    if (this.hasImplicitTermination(node.type)) {
      totalPaths += 1;
    }

    processing.delete(nodeId);
    visited.set(nodeId, totalPaths);
    return totalPaths;
  }

  /**
   * Finds entry nodes (nodes with no incoming edges)
   */
  private findEntryNodes(graph: ConnectedComponent['graph']): string[] {
    const entryNodes: string[] = [];
    for (const nodeId of graph.getNodeIds()) {
      if (graph.getIncoming(nodeId).length === 0) {
        entryNodes.push(nodeId);
      }
    }
    return entryNodes;
  }

  /**
   * Builds metadata details object
   */
  private buildMetadataDetails(
    nodeCount: number,
    entryNodes: string[],
    pathsPerNode: Map<string, number>
  ): Record<string, any> {
    const details: Record<string, any> = {
      algorithm: 'DFS with memoization and cycle detection',
      nodeCount,
      entryNodes
    };

    if (pathsPerNode.size > 0) {
      const pathsObj: Record<string, number> = {};
      for (const [nodeId, paths] of pathsPerNode) {
        pathsObj[nodeId] = paths;
      }
      details.pathsPerNode = pathsObj;
    }

    return details;
  }

  /**
   * Generates interpretation message for the result
   */
  private buildInterpretation(totalPaths: number, hasNoEntry: boolean): string {
    if (hasNoEntry) {
      return '1 distinct execution path (cycle with no entry)';
    }
    if (totalPaths === 0) {
      return 'Empty graph, no execution paths';
    }
    return totalPaths === 1
      ? '1 distinct execution path through the graph'
      : `${totalPaths} distinct execution paths through the graph`;
  }

  compute(component: ConnectedComponent): MetricResult {
    const nodeCount = component.graph.getNodeCount();

    // Handle empty graph
    if (nodeCount === 0) {
      return {
        value: 0,
        metadata: {
          details: this.buildMetadataDetails(0, [], new Map()),
          interpretation: this.buildInterpretation(0, false)
        }
      };
    }

    const entryNodes = this.findEntryNodes(component.graph);

    // If no entry nodes, entire graph is a cycle
    if (entryNodes.length === 0) {
      const details = this.buildMetadataDetails(nodeCount, [], new Map());
      details.note = 'No entry nodes - graph is a cycle';
      return {
        value: 1,
        metadata: {
          details,
          interpretation: this.buildInterpretation(1, true)
        }
      };
    }

    // Count paths from each entry node
    // Take the maximum complexity from any entry point (not sum)
    // Multiple entry points don't multiply complexity - they're just different triggers
    const visited = new Map<string, number>();
    const processing = new Set<string>();

    let maxPaths = 0;
    for (const entryId of entryNodes) {
      const paths = this.countPathsFromNode(entryId, component.graph, visited, processing);
      maxPaths = Math.max(maxPaths, paths);
    }

    const totalPaths = maxPaths;

    return {
      value: totalPaths,
      metadata: {
        details: this.buildMetadataDetails(nodeCount, entryNodes, visited),
        interpretation: this.buildInterpretation(totalPaths, false)
      }
    };
  }
}

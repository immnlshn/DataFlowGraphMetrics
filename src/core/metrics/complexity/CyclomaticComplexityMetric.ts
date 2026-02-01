import { IMetric } from '../IMetric';
import { ConnectedComponent, Graph, GraphNode } from '../../types/graph.types';
import { MetricResult } from '../../types/metrics.types';

/**
 * Cyclomatic Complexity Metric
 *
 * Measures the number of linearly independent decision-driven paths through a flow graph.
 * This metric helps identify code complexity, testing requirements, and potential maintenance burden.
 * Higher values indicate more complex control flow with more decision points.
 *
 * **Approach:**
 * - Starts with a baseline of 1 (representing a single linear path)
 * - Iterates through all nodes in the component
 * - For each node, calculates its contribution to complexity based on:
 *   - Node type (switch, trigger, filter, function, etc.)
 *   - Number of output ports (decision branches)
 *   - Multicast behavior (multiple edges on same port)
 * - Sums all contributions to get total complexity
 *
 * **Node-Specific Rules:**
 * - **Switch nodes**: Each output port + implicit drop path (numPorts contribution)
 * - **Trigger/Filter nodes**: Binary decision (pass or block) = +1 contribution
 * - **Function nodes**: Each additional output beyond first = +1 per port
 * - **Multicast nodes**: Each additional edge on same port = +1 (parallel execution)
 * - **Non-decision nodes**: Only multicast contributes to complexity
 *
 * **Time Complexity:**
 * - O(V + E) where:
 *   - V = number of nodes (vertices) - we iterate once through all nodes
 *   - E = number of edges - we examine edges to group by port
 * - Linear time algorithm, very efficient even for large graphs
 *
 * **Space Complexity:**
 * - O(P) where P = maximum number of ports on any single node
 * - Typically P << V, so effectively O(1) for most practical cases
 * - Uses a temporary Map per node to group edges by port
 *
 * @implements {IMetric}
 */
export class CyclomaticComplexityMetric implements IMetric {
  readonly id = 'cyclomatic-complexity';
  readonly name = 'Cyclomatic Complexity';
  readonly category = 'complexity' as const;
  readonly description = 'Measure of independent decision-driven paths with node-type-specific branching rules';

  /**
   * Computes the cyclomatic complexity for a connected component.
   *
   * Cyclomatic complexity starts at 1 (baseline for a linear flow) and increases
   * with each decision point. Each node's contribution depends on its type and
   * the number of distinct execution branches it creates.
   *
   * @param component - The connected component to analyze
   * @returns Metric result with complexity value and metadata about decision nodes
   */
  public compute(component: ConnectedComponent): MetricResult {
    const graph = component.graph;
    const nodes = graph.getNodes();

    // Cyclomatic complexity baseline is 1 (represents the single path through a linear flow)
    let complexity = 1;
    let decisionNodeCount = 0;

    // Sum the contribution from each node
    for (const node of nodes) {
      const contribution = this.computeNodeContribution(graph, node);
      complexity += contribution.branches;
      if (contribution.isDecision) {
        decisionNodeCount++;
      }
    }

    return {
      value: complexity,
      metadata: {
        details: {
          decisionNodeCount
        },
        interpretation: this.generateInterpretation(complexity, decisionNodeCount)
      }
    };
  }

  /**
   * Computes a single node's contribution to the overall cyclomatic complexity.
   *
   * The contribution depends on:
   * 1. Whether the node is a decision node (affects control flow)
   * 2. The node type (switch, trigger, function, etc.)
   * 3. The number of output ports (branching factor)
   * 4. Multicast behavior (multiple edges on same port)
   *
   * @param graph - The graph containing the node
   * @param node - The node to analyze
   * @returns Object with the number of branches added and whether it's a decision node
   */
  private computeNodeContribution(
    graph: Graph,
    node: Readonly<GraphNode>
  ): { branches: number; isDecision: boolean } {
    const outgoing = graph.getOutgoing(node.id);
    const edgesByPort = this.groupEdgesByPort(outgoing);
    const multicastContribution = this.calculateMulticastContribution(edgesByPort);

    // Non-decision nodes only contribute through multicast
    if (!node.isDecisionNode) {
      return { branches: multicastContribution, isDecision: false };
    }

    // Decision nodes contribute based on their type and number of ports
    const baseBranches = this.calculateBaseBranches(node, edgesByPort.size);

    return {
      branches: baseBranches + multicastContribution,
      isDecision: true
    };
  }

  /**
   * Groups outgoing edges by their source port number.
   *
   * This grouping is essential for:
   * - Identifying multicast behavior (multiple edges on same port)
   * - Counting distinct output ports for decision nodes
   *
   * @param edges - Array of outgoing edges from a node
   * @returns Map of port number to count of edges on that port
   */
  private groupEdgesByPort(edges: readonly Readonly<{ source: string; target: string; sourcePort: number; }>[]): Map<number, number> {
    const edgesByPort = new Map<number, number>();
    for (const edge of edges) {
      edgesByPort.set(edge.sourcePort, (edgesByPort.get(edge.sourcePort) || 0) + 1);
    }
    return edgesByPort;
  }

  /**
   * Calculates the complexity contribution from multicast behavior.
   *
   * When a node sends messages to multiple targets from the same output port,
   * it creates parallel execution paths. Each additional edge beyond the first
   * on any port adds one to the complexity.
   *
   * Example: If port 0 has 3 edges, it contributes 2 (3 - 1) to complexity.
   *
   * @param edgesByPort - Map of port number to edge count
   * @returns Total multicast contribution to complexity
   */
  private calculateMulticastContribution(edgesByPort: Map<number, number>): number {
    let multicastContribution = 0;
    for (const edgeCount of edgesByPort.values()) {
      if (edgeCount > 1) {
        multicastContribution += edgeCount - 1;
      }
    }
    return multicastContribution;
  }

  /**
   * Calculates the base branch contribution for a decision node.
   *
   * Different node types have different branching semantics:
   * - **Switch nodes**: Each output port represents a conditional branch,
   *   plus an implicit "drop" path when no condition matches.
   *   Contribution = numPorts (represents ports + 1 branches - 1 baseline)
   *
   * - **Trigger/Filter nodes**: Binary decision (pass or block message).
   *   Contribution = 1 (represents 2 branches - 1 baseline)
   *
   * - **Function and other decision nodes**: Standard branching formula.
   *   Each additional output port beyond the first adds a decision path.
   *   Contribution = max(0, numPorts - 1)
   *
   * @param node - The decision node to analyze
   * @param numPorts - Number of distinct output ports
   * @returns Base complexity contribution (before multicast)
   */
  private calculateBaseBranches(node: Readonly<GraphNode>, numPorts: number): number {
    if (node.type === 'switch') {
      // Switch nodes: numPorts represents explicit branches,
      // plus implicit catch-all (drop) case
      // Contribution = numPorts (which is ports + 1 branches - 1 baseline)
      return numPorts;
    }

    if (node.type === 'trigger' || node.type === 'rbe') {
      // Trigger/Filter nodes: always 2 branches (pass or block)
      // Contribution = 1 (which is 2 branches - 1 baseline)
      return 1;
    }

    // Function and other decision nodes: standard formula
    // Each additional output port beyond the first adds a branch
    return Math.max(0, numPorts - 1);
  }

  /**
   * Generates a user-friendly interpretation of the cyclomatic complexity value.
   *
   * Provides qualitative assessment and actionable insights based on the complexity score:
   * - 1-10: Simple, easy to test and maintain
   * - 11-20: Moderate, manageable complexity
   * - 21-50: Complex, consider refactoring
   * - 51+: Very complex, high risk
   *
   * @param complexity - The computed cyclomatic complexity value
   * @param decisionNodes - Number of decision nodes in the component
   * @returns Human-readable interpretation string for UI display
   */
  private generateInterpretation(complexity: number, decisionNodes: number): string {
    const decisionText = decisionNodes === 1 ? '1 decision node' : `${decisionNodes} decision nodes`;

    if (complexity === 1) {
      return `Linear flow with no branching (${decisionText})`;
    }

    if (complexity <= 10) {
      return `Simple flow with ${complexity} independent paths (${decisionText}).`;
    }

    if (complexity <= 20) {
      return `Moderate complexity with ${complexity} independent paths (${decisionText}).`;
    }

    if (complexity <= 50) {
      return `Complex flow with ${complexity} independent paths (${decisionText}).`;
    }

    return `Very complex flow with ${complexity} independent paths (${decisionText}).`;
  }
}

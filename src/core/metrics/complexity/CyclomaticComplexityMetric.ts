/**
 * CyclomaticComplexityMetric - Adapted for data flow graphs
 *
 * Definition:
 * For a connected component C:
 *   CC(C) = 1 + sum_{n in D(C)} branches(n)
 * where D(C) is the set of decision nodes in the component and
 * branches(n) is calculated based on node type:
 *   - Switch nodes: out(n) (accounts for implicit catch-all case)
 *   - Function nodes: out(n) - 1 (standard formula)
 *   - Trigger/RBE nodes: 1 (always 2 branches: pass or block)
 *
 * Complexity: O(V) where V is the number of nodes
 * Cycles do not affect the calculation - we simply count decision points
 */

import { IMetric } from '../IMetric';
import { ConnectedComponent } from '../../types/graph.types';
import { MetricResult } from '../../types/metrics.types';

export class CyclomaticComplexityMetric implements IMetric {
  readonly id = 'cyclomatic-complexity';
  readonly name = 'Cyclomatic Complexity';
  readonly category = 'complexity' as const;
  readonly description = 'Measure of independent decision-driven paths with node-type-specific branching rules';

  /**
   * Calculate branching contribution based on node type
   */
  private calculateBranches(nodeType: string, connectedPortCount: number): number {
    // Switch nodes have an implicit catch-all case
    // Total branches = out(n) + 1, so contribution = out(n)
    if (nodeType === 'switch') {
      return connectedPortCount;
    }

    // Trigger and RBE nodes always have 2 branches (pass or block)
    // Contribution = 1 (since 2 branches - 1)
    if (nodeType === 'trigger' || nodeType === 'rbe') {
      return 1;
    }

    // Function nodes and other decision nodes use standard formula
    // Formula: out(n) - 1
    return Math.max(0, connectedPortCount - 1);
  }

  /**
   * Gets all decision nodes from the graph
   */
  private getDecisionNodes(graph: ConnectedComponent['graph']) {
    return graph.getNodes().filter((n): n is NonNullable<typeof n> => !!n && n.isDecisionNode);
  }

  /**
   * Calculates branch information for a decision node
   */
  private calculateNodeBranches(node: NonNullable<ReturnType<ConnectedComponent['graph']['getNode']>>, graph: ConnectedComponent['graph']) {
    const ports = graph.getOutgoingPorts(node.id);
    const connectedPortCount = ports.size;
    const branches = this.calculateBranches(node.type, connectedPortCount);

    return {
      id: node.id,
      type: node.type,
      connectedPortCount,
      branches,
      ports: Array.from(ports)
    };
  }

  /**
   * Builds interpretation message
   */
  private buildInterpretation(complexity: number, decisionNodeCount: number): string {
    return `Cyclomatic complexity: ${complexity} (decision nodes: ${decisionNodeCount})`;
  }

  compute(component: ConnectedComponent): MetricResult {
    // Get all decision nodes and calculate their branch contributions
    const decisionNodes = this.getDecisionNodes(component.graph);
    const decisionInfos = decisionNodes.map(node =>
      this.calculateNodeBranches(node, component.graph)
    );

    // Sum all branch contributions
    const sumBranches = decisionInfos.reduce((sum, info) => sum + info.branches, 0);
    const complexity = 1 + sumBranches;

    return {
      value: complexity,
      metadata: {
        details: {
          decisionNodeCount: decisionInfos.length,
          perNode: decisionInfos,
          formula: '1 + sum_{n in D} branches(n) where branches vary by node type'
        },
        interpretation: this.buildInterpretation(complexity, decisionInfos.length)
      }
    };
  }
}

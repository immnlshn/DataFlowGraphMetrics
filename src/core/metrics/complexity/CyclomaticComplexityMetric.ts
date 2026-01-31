/**
 * CyclomaticComplexityMetric - Adapted for data flow graphs
 *
 * Definition:
 * For a connected component C:
 *   CC(C) = 1 + sum_{n in D(C)} branches(n)
 * where D(C) is the set of decision nodes in the component and
 * branches(n) is calculated based on node type:
 *   - Switch nodes: out(n) - 0 (accounts for implicit catch-all case)
 *   - Function nodes: out(n) - 1 (standard formula)
 *   - Trigger/Filter nodes: 1 (always 2 branches: pass or block)
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
    // - With 1 output: 2 branches (1 explicit + 1 catch-all), contribute 1
    // - With 2 outputs: 3 branches (2 explicit + 1 catch-all), contribute 2
    // - General: out(n) + 1 total branches, contribute out(n)
    if (nodeType === 'switch') {
      return connectedPortCount;
    }

    // Trigger and filter nodes always have 2 branches (pass or block)
    // Regardless of their output configuration
    if (nodeType === 'trigger' || nodeType === 'filter') {
      return 1;
    }

    // Function nodes and other decision nodes use standard formula
    // Formula: out(n) - 1
    return Math.max(0, connectedPortCount - 1);
  }

  compute(component: ConnectedComponent): MetricResult {
    const decisionInfos = component.graph.getNodes()
      .filter((n): n is NonNullable<typeof n> => !!n && n.isDecisionNode)
      .map(node => {
        const ports = component.graph.getOutgoingPorts(node.id);
        const connectedPortCount = ports.size;
        const branches = this.calculateBranches(node.type, connectedPortCount);
        return {
          id: node.id,
          type: node.type,
          connectedPortCount,
          branches,
          ports: Array.from(ports)
        };
      });

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
        interpretation: `Cyclomatic complexity: ${complexity} (decision nodes: ${decisionInfos.length})`
      }
    };
  }
}

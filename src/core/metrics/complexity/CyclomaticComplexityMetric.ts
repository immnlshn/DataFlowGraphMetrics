/**
 * CyclomaticComplexityMetric - Adapted for data flow graphs
 *
 * Definition:
 * For a connected component C:
 *   CC(C) = 1 + sum_{n in D(C)} (out(n) - 1)
 * where D(C) is the set of decision nodes in the component and
 * out(n) is the number of distinct connected output ports of node n.
 */

import { IMetric } from '../IMetric';
import { ConnectedComponent } from '../../types/graph.types';
import { MetricResult } from '../../types/metrics.types';

export class CyclomaticComplexityMetric implements IMetric {
  readonly id = 'cyclomatic-complexity';
  readonly name = 'Cyclomatic Complexity';
  readonly category = 'complexity' as const;
  readonly description = 'Measure of independent decision-driven paths (1 + sum(out(n)-1))';

  compute(component: ConnectedComponent): MetricResult {
    const decisionInfos = component.graph.getNodes()
      .filter((n): n is NonNullable<typeof n> => !!n && n.isDecisionNode)
      .map(node => {
        const ports = component.graph.getOutgoingPorts(node.id);
        const connectedPortCount = ports.size;
        return { id: node.id, connectedPortCount, ports: Array.from(ports) };
      });

    const sumBranches = decisionInfos.reduce((sum, info) => sum + Math.max(0, info.connectedPortCount - 1), 0);
    const complexity = 1 + sumBranches;

    return {
      value: complexity,
      metadata: {
        details: {
          decisionNodeCount: decisionInfos.length,
          perNode: decisionInfos,
          formula: '1 + sum_{n in D}(out(n) - 1)'
        },
        interpretation: `Cyclomatic complexity: ${complexity} (decision nodes: ${decisionInfos.length})`
      }
    };
  }
}

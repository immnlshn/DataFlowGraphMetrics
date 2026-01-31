/**
 * DensityMetric - Measures graph density (edge ratio)
 * Formula: E / (V * (V - 1)) for directed graphs
 */

import { IMetric } from '../IMetric';
import { ConnectedComponent } from '../../types/graph.types';
import { MetricResult } from '../../types/metrics.types';

export class DensityMetric implements IMetric {
  readonly id = 'density';
  readonly name = 'Graph Density';
  readonly category = 'structural' as const;
  readonly description = 'Ratio of actual edges to possible edges in a directed graph';

  compute(component: ConnectedComponent): MetricResult {
    const V = component.graph.getNodeCount();
    const E = component.graph.getEdgeCount();

    if (V <= 1) {
      return {
        value: 0,
        metadata: {
          interpretation: 'Graph has 0 or 1 node, density is 0'
        }
      };
    }

    const maxEdges = V * (V - 1);
    const density = E / maxEdges;

    return {
      value: Number(density.toFixed(4)),
      metadata: {
        details: {
          nodes: V,
          edges: E,
          maxPossibleEdges: maxEdges
        },
        interpretation: `Density: ${(density * 100).toFixed(2)}% (${E} of ${maxEdges} possible edges)`
      }
    };
  }
}

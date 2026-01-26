/**
 * VertexCountMetric - Counts the number of nodes in a component
 */

import { IMetric } from '../IMetric';
import { ConnectedComponent } from '../../types/graph.types';
import { MetricResult } from '../../types/metrics.types';

export class VertexCountMetric implements IMetric {
  readonly id = 'vertex-count';
  readonly name = 'Vertex Count';
  readonly category = 'size' as const;
  readonly description = 'Total number of nodes (vertices) in the component';

  compute(component: ConnectedComponent): MetricResult {
    const value = component.graph.getNodeCount();
    
    return {
      value,
      metadata: {
        interpretation: `This component contains ${value} node${value !== 1 ? 's' : ''}`
      }
    };
  }
}

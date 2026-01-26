/**
 * EdgeCountMetric - Counts the number of edges in a component
 */

import { IMetric } from '../IMetric';
import { ConnectedComponent } from '../../types/graph.types';
import { MetricResult } from '../../types/metrics.types';

export class EdgeCountMetric implements IMetric {
  readonly id = 'edge-count';
  readonly name = 'Edge Count';
  readonly category = 'size' as const;
  readonly description = 'Total number of edges (connections) in the component';

  compute(component: ConnectedComponent): MetricResult {
    const value = component.graph.getEdgeCount();
    
    return {
      value,
      metadata: {
        interpretation: `This component contains ${value} edge${value !== 1 ? 's' : ''}`
      }
    };
  }
}

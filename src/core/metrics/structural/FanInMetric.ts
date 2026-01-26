/**
 * FanInMetric - Measures incoming edges for each node
 */

import { IMetric } from '../IMetric';
import { ConnectedComponent } from '../../types/graph.types';
import { MetricResult } from '../../types/metrics.types';

export class FanInMetric implements IMetric {
  readonly id = 'fan-in';
  readonly name = 'Fan-In';
  readonly category = 'structural' as const;
  readonly description = 'Maximum and average number of incoming edges per node';

  compute(component: ConnectedComponent): MetricResult {
    const nodeIds = component.graph.getNodeIds();
    
    if (nodeIds.length === 0) {
      return { value: 0, metadata: { details: { max: 0, avg: 0 } } };
    }

    const fanIns = nodeIds.map(nodeId => 
      component.graph.getIncoming(nodeId).length
    );

    const max = Math.max(...fanIns);
    const sum = fanIns.reduce((a, b) => a + b, 0);
    const avg = sum / fanIns.length;

    return {
      value: max,
      metadata: {
        details: {
          max,
          avg: Number(avg.toFixed(2))
        },
        interpretation: `Maximum fan-in: ${max}, Average fan-in: ${avg.toFixed(2)}`
      }
    };
  }
}

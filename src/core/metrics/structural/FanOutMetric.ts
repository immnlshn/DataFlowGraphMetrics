/**
 * FanOutMetric - Measures outgoing edges for each node
 */

import { IMetric } from '../IMetric';
import { ConnectedComponent } from '../../types/graph.types';
import { MetricResult } from '../../types/metrics.types';

export class FanOutMetric implements IMetric {
  readonly id = 'fan-out';
  readonly name = 'Fan-Out';
  readonly category = 'structural' as const;
  readonly description = 'Maximum and average number of outgoing edges per node';

  compute(component: ConnectedComponent): MetricResult {
    const nodeIds = component.graph.getNodeIds();
    
    if (nodeIds.length === 0) {
      return { value: 0, metadata: { details: { max: 0, avg: 0 } } };
    }

    const fanOuts = nodeIds.map(nodeId => 
      component.graph.getOutgoing(nodeId).length
    );

    const max = Math.max(...fanOuts);
    const sum = fanOuts.reduce((a, b) => a + b, 0);
    const avg = sum / fanOuts.length;

    return {
      value: max,
      metadata: {
        details: {
          max,
          avg: Number(avg.toFixed(2))
        },
        interpretation: `Maximum fan-out: ${max}, Average fan-out: ${avg.toFixed(2)}`
      }
    };
  }
}

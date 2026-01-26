/**
 * IMetric - Base interface for all metrics
 */

import { ConnectedComponent } from '../types/graph.types';
import { MetricResult } from '../types/metrics.types';

export interface IMetric {
  readonly id: string;
  readonly name: string;
  readonly category: 'size' | 'structural' | 'complexity';
  readonly description: string;
  
  compute(component: ConnectedComponent): MetricResult;
}

/**
 * Metrics Type Definitions
 */

import { ConnectedComponent } from './graph.types';

export interface MetricDefinition {
  id: string;
  name: string;
  category: 'size' | 'structural' | 'complexity';
  description: string;
  compute: (component: ConnectedComponent) => MetricResult;
}

export interface MetricResult {
  value: number;
  metadata?: {
    details?: unknown;
    interpretation?: string;
  };
}

export interface ComponentMetrics {
  componentId: string;
  metrics: Map<string, MetricResult>;
}


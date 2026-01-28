/**
 * Metrics Type Definitions
 */

import { ConnectedComponent } from './graph.types';

/**
 * MetricDefinition - Defines how a metric is computed
 */
export type MetricDefinition = Readonly<{
  id: string;
  name: string;
  category: 'size' | 'structural' | 'complexity';
  description: string;
  compute: (component: ConnectedComponent) => MetricResult;
}>;

/**
 * MetricResult - Immutable result of a metric computation
 */
export type MetricResult = Readonly<{
  value: number;
  metadata?: Readonly<{
    details?: unknown;
    interpretation?: string;
  }>;
}>;

/**
 * ComponentMetrics - Collection of metrics for a component
 */
export type ComponentMetrics = Readonly<{
  componentId: string;
  metrics: ReadonlyMap<string, MetricResult>;
}>;


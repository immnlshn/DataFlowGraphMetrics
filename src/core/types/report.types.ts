/**
 * Analysis Report Output Structure
 */

import { GraphData } from './graph.types';
import { MetricResult } from './metrics.types';

/**
 * AnalysisReport - Deeply immutable report structure
 */
export type AnalysisReport = Readonly<{
  summary: Readonly<{
    flowCount: number;
    totalComponents: number;
    analyzedAt: string;
  }>;
  components: ReadonlyArray<ComponentReport>;
}>;

/**
 * ComponentReport - Serializable component with metrics and graph data
 */
export type ComponentReport = Readonly<{
  id: string;
  flowId: string;
  flowName?: string;
  graph: GraphData;
  metrics: Readonly<Record<string, MetricResult>>;
}>;

/**
 * Analysis Report Output Structure
 */

import { MetricResult } from './metrics.types';

export interface AnalysisReport {
  summary: {
    flowCount: number;
    totalComponents: number;
    analyzedAt: string;
  };
  components: ComponentReport[];
}

export interface ComponentReport {
  id: string;
  flowId: string;
  flowName?: string;
  metrics: Record<string, MetricResult>;
}


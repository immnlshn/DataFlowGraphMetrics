/**
 * Analysis Report Output Structure
 */

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
  nodeCount: number;
  metrics: {
    [metricId: string]: {
      value: number;
      category: string;
      name: string;
    };
  };
}


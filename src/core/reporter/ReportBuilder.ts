/**
 * ReportBuilder - Generates structured analysis reports
 */

import { ConnectedComponent, GraphData } from '../types/graph.types';
import { ComponentMetrics } from '../types/metrics.types';
import { AnalysisReport, ComponentReport } from '../types/report.types';

export class ReportBuilder {
  /**
   * Build a complete analysis report from components and their metrics
   */
  build(components: ConnectedComponent[], metricsMap: Map<string, ComponentMetrics>): AnalysisReport {
    const componentReports = components
      .map(component => {
        const metrics = metricsMap.get(component.id);
        if (!metrics) {
          throw new Error(`No metrics found for component ${component.id}`);
        }
        return this.buildComponentReport(component, metrics);
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    return {
      summary: {
        flowCount: this.countUniqueFlows(components),
        totalComponents: components.length,
        analyzedAt: new Date().toISOString(),
      },
      components: componentReports,
    };
  }

  /**
   * Build a report for a single component with serializable graph data
   */
  private buildComponentReport(component: ConnectedComponent, componentMetrics: ComponentMetrics): ComponentReport {
    const metricsObj: Record<string, any> = {};
    const sortedKeys = Array.from(componentMetrics.metrics.keys()).sort();

    for (const key of sortedKeys) {
      metricsObj[key] = componentMetrics.metrics.get(key);
    }

    const graphData = this.extractGraphData(component);

    return {
      id: component.id,
      flowId: component.flowId,
      flowName: component.flowName,
      graph: graphData,
      metrics: metricsObj,
    };
  }

  /**
   * Extract serializable graph data from a component
   */
  private extractGraphData(component: ConnectedComponent): GraphData {
    const nodes = Array.from(component.graph.getNodes()).sort((a, b) =>
      a.id.localeCompare(b.id)
    );
    const edges = Array.from(component.graph.getEdges()).sort((a, b) => {
      const sourceCmp = a.source.localeCompare(b.source);
      if (sourceCmp !== 0) return sourceCmp;
      const targetCmp = a.target.localeCompare(b.target);
      if (targetCmp !== 0) return targetCmp;
      return a.sourcePort - b.sourcePort;
    });

    return { nodes, edges };
  }

  /**
   * Count unique flows across all components
   */
  private countUniqueFlows(components: ConnectedComponent[]): number {
    const uniqueFlows = new Set(components.map(c => c.flowId));
    return uniqueFlows.size;
  }
}

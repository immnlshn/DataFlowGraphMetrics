/**
 * ReportBuilder - Generates structured analysis reports
 */

import { ConnectedComponent } from '../types/graph.types';
import { ComponentMetrics } from '../types/metrics.types';
import { AnalysisReport, ComponentReport } from '../types/report.types';

export class ReportBuilder {
  /**
   * Build a complete analysis report from components and their metrics
   */
  build(components: ConnectedComponent[], metricsMap: Map<string, ComponentMetrics>): AnalysisReport {
    const componentReports = components
      .map(c => {
        const metrics = metricsMap.get(c.id);
        if (!metrics) {
          throw new Error(`No metrics found for component ${c.id}`);
        }
        return this.buildComponentReport(c, metrics);
      })
      .sort((a, b) => a.id.localeCompare(b.id)); // Deterministic ordering

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
   * Build a report for a single component
   */
  private buildComponentReport(component: ConnectedComponent, componentMetrics: ComponentMetrics): ComponentReport {
    // Convert Map to plain object with sorted keys for determinism
    const metricsObj: Record<string, any> = {};
    const sortedKeys = Array.from(componentMetrics.metrics.keys()).sort();
    
    for (const key of sortedKeys) {
      metricsObj[key] = componentMetrics.metrics.get(key);
    }

    return {
      id: component.id,
      flowId: component.flowId,
      flowName: component.flowName,
      metrics: metricsObj,
    };
  }

  /**
   * Count unique flows across all components
   */
  private countUniqueFlows(components: ConnectedComponent[]): number {
    const uniqueFlows = new Set(components.map(c => c.flowId));
    return uniqueFlows.size;
  }
}

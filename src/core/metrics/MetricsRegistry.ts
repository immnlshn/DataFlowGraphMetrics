/**
 * MetricsRegistry - Central registry for all available metrics
 */

import { IMetric } from './IMetric';
import { ConnectedComponent } from '../types/graph.types';
import { ComponentMetrics, MetricResult } from '../types/metrics.types';

export class MetricsRegistry {
  private metrics: Map<string, IMetric> = new Map();

  /**
   * Register a metric
   */
  register(metric: IMetric): void {
    if (this.metrics.has(metric.id)) {
      throw new Error(`Metric with id '${metric.id}' is already registered`);
    }
    this.metrics.set(metric.id, metric);
  }

  /**
   * Get a metric by ID
   */
  getMetric(id: string): IMetric | undefined {
    return this.metrics.get(id);
  }

  /**
   * Get all registered metrics
   */
  getAllMetrics(): IMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metrics by category
   */
  getMetricsByCategory(category: 'size' | 'structural' | 'complexity'): IMetric[] {
    return this.getAllMetrics().filter(m => m.category === category);
  }

  /**
   * Compute all registered metrics for a component
   */
  computeAll(component: ConnectedComponent): ComponentMetrics {
    const metrics = new Map<string, MetricResult>();
    
    for (const metric of this.metrics.values()) {
      metrics.set(metric.id, metric.compute(component));
    }
    
    return {
      componentId: component.id,
      metrics
    };
  }

  /**
   * Compute specific metrics for a component
   */
  computeMetrics(component: ConnectedComponent, metricIds: string[]): ComponentMetrics {
    const metrics = new Map<string, MetricResult>();
    
    for (const id of metricIds) {
      const metric = this.metrics.get(id);
      if (metric) {
        metrics.set(id, metric.compute(component));
      }
    }
    
    return {
      componentId: component.id,
      metrics
    };
  }

  /**
   * Clear all registered metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Get count of registered metrics
   */
  size(): number {
    return this.metrics.size;
  }
}

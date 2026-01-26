import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsRegistry } from '../../../src/core/metrics/MetricsRegistry';
import { IMetric } from '../../../src/core/metrics/IMetric';
import { ConnectedComponent } from '../../../src/core/types/graph.types';
import { MetricResult } from '../../../src/core/types/metrics.types';
import { GraphModel } from '../../../src/core/graph/GraphModel';

describe('MetricsRegistry', () => {
  let registry: MetricsRegistry;

  beforeEach(() => {
    registry = new MetricsRegistry();
  });

  const createMockMetric = (id: string, category: 'size' | 'structural' | 'complexity'): IMetric => ({
    id,
    name: `Mock ${id}`,
    category,
    description: 'Mock metric',
    compute: (component: ConnectedComponent): MetricResult => ({
      value: component.nodes.size
    })
  });

  const createMockComponent = (): ConnectedComponent => ({
    id: 'comp-1',
    flowId: 'flow-1',
    nodes: new Set(['n1', 'n2', 'n3']),
    graph: new GraphModel()
  });

  describe('register', () => {
    it('should register a metric', () => {
      const metric = createMockMetric('test', 'size');
      registry.register(metric);

      expect(registry.size()).toBe(1);
      expect(registry.getMetric('test')).toBe(metric);
    });

    it('should throw error when registering duplicate metric', () => {
      const metric = createMockMetric('test', 'size');
      registry.register(metric);

      expect(() => registry.register(metric)).toThrow("Metric with id 'test' is already registered");
    });
  });

  describe('getMetric', () => {
    it('should return metric by id', () => {
      const metric = createMockMetric('test', 'size');
      registry.register(metric);

      expect(registry.getMetric('test')).toBe(metric);
    });

    it('should return undefined for non-existent metric', () => {
      expect(registry.getMetric('nonexistent')).toBeUndefined();
    });
  });

  describe('getAllMetrics', () => {
    it('should return all registered metrics', () => {
      const metric1 = createMockMetric('test1', 'size');
      const metric2 = createMockMetric('test2', 'structural');
      registry.register(metric1);
      registry.register(metric2);

      const metrics = registry.getAllMetrics();
      expect(metrics).toHaveLength(2);
      expect(metrics).toContain(metric1);
      expect(metrics).toContain(metric2);
    });

    it('should return empty array when no metrics registered', () => {
      expect(registry.getAllMetrics()).toEqual([]);
    });
  });

  describe('getMetricsByCategory', () => {
    it('should return metrics filtered by category', () => {
      const sizeMetric = createMockMetric('size1', 'size');
      const structuralMetric = createMockMetric('struct1', 'structural');
      const complexityMetric = createMockMetric('complex1', 'complexity');
      
      registry.register(sizeMetric);
      registry.register(structuralMetric);
      registry.register(complexityMetric);

      const sizeMetrics = registry.getMetricsByCategory('size');
      expect(sizeMetrics).toHaveLength(1);
      expect(sizeMetrics[0]).toBe(sizeMetric);

      const structuralMetrics = registry.getMetricsByCategory('structural');
      expect(structuralMetrics).toHaveLength(1);
      expect(structuralMetrics[0]).toBe(structuralMetric);
    });
  });

  describe('computeAll', () => {
    it('should compute all registered metrics', () => {
      const metric1 = createMockMetric('test1', 'size');
      const metric2 = createMockMetric('test2', 'structural');
      registry.register(metric1);
      registry.register(metric2);

      const component = createMockComponent();
      const result = registry.computeAll(component);

      expect(result.componentId).toBe('comp-1');
      expect(result.metrics.size).toBe(2);
      expect(result.metrics.get('test1')?.value).toBe(3);
      expect(result.metrics.get('test2')?.value).toBe(3);
    });
  });

  describe('computeMetrics', () => {
    it('should compute specific metrics', () => {
      const metric1 = createMockMetric('test1', 'size');
      const metric2 = createMockMetric('test2', 'structural');
      const metric3 = createMockMetric('test3', 'complexity');
      registry.register(metric1);
      registry.register(metric2);
      registry.register(metric3);

      const component = createMockComponent();
      const result = registry.computeMetrics(component, ['test1', 'test3']);

      expect(result.metrics.size).toBe(2);
      expect(result.metrics.has('test1')).toBe(true);
      expect(result.metrics.has('test3')).toBe(true);
      expect(result.metrics.has('test2')).toBe(false);
    });

    it('should skip non-existent metrics', () => {
      const metric = createMockMetric('test1', 'size');
      registry.register(metric);

      const component = createMockComponent();
      const result = registry.computeMetrics(component, ['test1', 'nonexistent']);

      expect(result.metrics.size).toBe(1);
      expect(result.metrics.has('test1')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all metrics', () => {
      registry.register(createMockMetric('test1', 'size'));
      registry.register(createMockMetric('test2', 'structural'));
      
      expect(registry.size()).toBe(2);
      
      registry.clear();
      
      expect(registry.size()).toBe(0);
      expect(registry.getAllMetrics()).toEqual([]);
    });
  });

  describe('size', () => {
    it('should return count of registered metrics', () => {
      expect(registry.size()).toBe(0);
      
      registry.register(createMockMetric('test1', 'size'));
      expect(registry.size()).toBe(1);
      
      registry.register(createMockMetric('test2', 'structural'));
      expect(registry.size()).toBe(2);
    });
  });
});

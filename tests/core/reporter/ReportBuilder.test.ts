/**
 * Tests for ReportBuilder
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReportBuilder } from '../../../src/core/reporter/ReportBuilder';
import { ConnectedComponent } from '../../../src/core/types/graph.types';
import { ComponentMetrics, MetricResult } from '../../../src/core/types/metrics.types';
import { GraphModel } from '../../../src/core/graph/GraphModel';

describe('ReportBuilder', () => {
  let builder: ReportBuilder;

  beforeEach(() => {
    builder = new ReportBuilder();
  });

  describe('build()', () => {
    it('should build a complete report with summary', () => {
      const { components, metricsMap } = createTestData([
        { id: 'comp-1', flowId: 'flow-1', nodeCount: 5, edgeCount: 4 },
      ]);

      const report = builder.build(components, metricsMap);

      expect(report.summary).toBeDefined();
      expect(report.summary.analyzedAt).toBeDefined();
      expect(report.summary.totalComponents).toBe(1);
      expect(report.summary.flowCount).toBe(1);
      expect(report.components).toHaveLength(1);
    });

    it('should generate ISO timestamp', () => {
      const { components, metricsMap } = createTestData([
        { id: 'comp-1', flowId: 'flow-1', nodeCount: 3, edgeCount: 2 },
      ]);

      const report = builder.build(components, metricsMap);

      const date = new Date(report.summary.analyzedAt);
      expect(date.toISOString()).toBe(report.summary.analyzedAt);
    });

    it('should handle empty components array', () => {
      const report = builder.build([], new Map());

      expect(report.summary.totalComponents).toBe(0);
      expect(report.summary.flowCount).toBe(0);
      expect(report.components).toHaveLength(0);
    });

    it('should sort components by ID for deterministic output', () => {
      const { components, metricsMap } = createTestData([
        { id: 'comp-3', flowId: 'flow-1', nodeCount: 3, edgeCount: 2 },
        { id: 'comp-1', flowId: 'flow-1', nodeCount: 5, edgeCount: 4 },
        { id: 'comp-2', flowId: 'flow-1', nodeCount: 2, edgeCount: 1 },
      ]);

      const report = builder.build(components, metricsMap);

      expect(report.components[0].id).toBe('comp-1');
      expect(report.components[1].id).toBe('comp-2');
      expect(report.components[2].id).toBe('comp-3');
    });

    it('should throw error if metrics not found for component', () => {
      const component = createComponent('comp-1', 'flow-1');
      const metricsMap = new Map<string, ComponentMetrics>();

      expect(() => builder.build([component], metricsMap)).toThrow('No metrics found for component comp-1');
    });
  });

  describe('summary statistics', () => {
    it('should calculate total components correctly', () => {
      const { components, metricsMap } = createTestData([
        { id: 'comp-1', flowId: 'flow-1', nodeCount: 5, edgeCount: 4 },
        { id: 'comp-2', flowId: 'flow-1', nodeCount: 3, edgeCount: 2 },
        { id: 'comp-3', flowId: 'flow-1', nodeCount: 7, edgeCount: 6 },
      ]);

      const report = builder.build(components, metricsMap);

      expect(report.summary.totalComponents).toBe(3);
    });

    it('should count unique flows correctly', () => {
      const { components, metricsMap } = createTestData([
        { id: 'comp-1', flowId: 'flow-1', nodeCount: 5, edgeCount: 4 },
        { id: 'comp-2', flowId: 'flow-1', nodeCount: 3, edgeCount: 2 },
        { id: 'comp-3', flowId: 'flow-2', nodeCount: 7, edgeCount: 6 },
      ]);

      const report = builder.build(components, metricsMap);

      expect(report.summary.flowCount).toBe(2);
    });

    it('should count flow correctly when all components in same flow', () => {
      const { components, metricsMap } = createTestData([
        { id: 'comp-1', flowId: 'flow-1', nodeCount: 5, edgeCount: 4 },
        { id: 'comp-2', flowId: 'flow-1', nodeCount: 3, edgeCount: 2 },
      ]);

      const report = builder.build(components, metricsMap);

      expect(report.summary.flowCount).toBe(1);
    });
  });

  describe('component reports', () => {
    it('should include component ID', () => {
      const { components, metricsMap } = createTestData([
        { id: 'my-component-id', flowId: 'flow-1', nodeCount: 5, edgeCount: 4 },
      ]);

      const report = builder.build(components, metricsMap);

      expect(report.components[0].id).toBe('my-component-id');
    });

    it('should include flow ID', () => {
      const { components, metricsMap } = createTestData([
        { id: 'comp-1', flowId: 'my-flow-id', nodeCount: 5, edgeCount: 4 },
      ]);

      const report = builder.build(components, metricsMap);

      expect(report.components[0].flowId).toBe('my-flow-id');
    });

    it('should include flow name if available', () => {
      const component = createComponent('comp-1', 'flow-1', 'My Flow');
      const metricsMap = new Map<string, ComponentMetrics>();
      metricsMap.set('comp-1', createComponentMetrics('comp-1', 5, 4));

      const report = builder.build([component], metricsMap);

      expect(report.components[0].flowName).toBe('My Flow');
    });

    it('should include all metrics', () => {
      const metricsData = new Map<string, MetricResult>();
      metricsData.set('vertex-count', { value: 5 });
      metricsData.set('edge-count', { value: 4 });
      metricsData.set('density', { value: 0.25 });
      metricsData.set('cyclomatic-complexity', { value: 3 });

      const component = createComponent('comp-1', 'flow-1');
      const metricsMap = new Map<string, ComponentMetrics>();
      metricsMap.set('comp-1', {
        componentId: 'comp-1',
        metrics: metricsData,
      });

      const report = builder.build([component], metricsMap);

      expect(report.components[0].metrics['vertex-count']).toEqual({ value: 5 });
      expect(report.components[0].metrics['edge-count']).toEqual({ value: 4 });
      expect(report.components[0].metrics['density']).toEqual({ value: 0.25 });
      expect(report.components[0].metrics['cyclomatic-complexity']).toEqual({ value: 3 });
    });

    it('should sort metric keys alphabetically for determinism', () => {
      const metricsData = new Map<string, MetricResult>();
      metricsData.set('zebra-metric', { value: 1 });
      metricsData.set('alpha-metric', { value: 2 });
      metricsData.set('beta-metric', { value: 3 });

      const component = createComponent('comp-1', 'flow-1');
      const metricsMap = new Map<string, ComponentMetrics>();
      metricsMap.set('comp-1', {
        componentId: 'comp-1',
        metrics: metricsData,
      });

      const report = builder.build([component], metricsMap);
      const keys = Object.keys(report.components[0].metrics);

      expect(keys).toEqual(['alpha-metric', 'beta-metric', 'zebra-metric']);
    });

    it('should preserve metric metadata', () => {
      const metricsData = new Map<string, MetricResult>();
      metricsData.set('vertex-count', { value: 5 });
      metricsData.set('density', { 
        value: 0.5,
        metadata: {
          details: { info: 'test' },
          interpretation: 'Medium density'
        }
      });

      const component = createComponent('comp-1', 'flow-1');
      const metricsMap = new Map<string, ComponentMetrics>();
      metricsMap.set('comp-1', {
        componentId: 'comp-1',
        metrics: metricsData,
      });

      const report = builder.build([component], metricsMap);

      expect(report.components[0].metrics['density'].metadata).toEqual({
        details: { info: 'test' },
        interpretation: 'Medium density'
      });
    });
  });

  describe('JSON serialization', () => {
    it('should produce valid JSON', () => {
      const { components, metricsMap } = createTestData([
        { id: 'comp-1', flowId: 'flow-1', nodeCount: 5, edgeCount: 4 },
      ]);

      const report = builder.build(components, metricsMap);
      const json = JSON.stringify(report);

      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should be serializable and deserializable', () => {
      const { components, metricsMap } = createTestData([
        { id: 'comp-1', flowId: 'flow-1', nodeCount: 5, edgeCount: 4 },
        { id: 'comp-2', flowId: 'flow-1', nodeCount: 3, edgeCount: 2 },
      ]);

      const report = builder.build(components, metricsMap);
      const json = JSON.stringify(report);
      const deserialized = JSON.parse(json);

      expect(deserialized.summary.totalComponents).toBe(2);
      expect(deserialized.components).toHaveLength(2);
    });
  });
});

/**
 * Helper to create ConnectedComponent for testing
 */
function createComponent(id: string, flowId: string, flowName?: string): ConnectedComponent {
  const graph = new GraphModel();
  return {
    id,
    flowId,
    flowName,
    nodes: new Set<string>(),
    graph,
  };
}

/**
 * Helper to create ComponentMetrics for testing
 */
function createComponentMetrics(
  id: string,
  nodeCount: number,
  edgeCount: number
): ComponentMetrics {
  const metricsMap = new Map<string, MetricResult>();
  metricsMap.set('vertex-count', { value: nodeCount });
  metricsMap.set('edge-count', { value: edgeCount });

  return {
    componentId: id,
    metrics: metricsMap,
  };
}

/**
 * Helper to create test data with components and metrics
 */
function createTestData(specs: Array<{ id: string; flowId: string; nodeCount: number; edgeCount: number; flowName?: string }>) {
  const components: ConnectedComponent[] = [];
  const metricsMap = new Map<string, ComponentMetrics>();

  for (const spec of specs) {
    const component = createComponent(spec.id, spec.flowId, spec.flowName);
    const metrics = createComponentMetrics(spec.id, spec.nodeCount, spec.edgeCount);
    
    components.push(component);
    metricsMap.set(spec.id, metrics);
  }

  return { components, metricsMap };
}

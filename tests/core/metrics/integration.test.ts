import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsRegistry } from '../../../src/core/metrics/MetricsRegistry';
import { VertexCountMetric } from '../../../src/core/metrics/size/VertexCountMetric';
import { EdgeCountMetric } from '../../../src/core/metrics/size/EdgeCountMetric';
import { FanInMetric } from '../../../src/core/metrics/structural/FanInMetric';
import { FanOutMetric } from '../../../src/core/metrics/structural/FanOutMetric';
import { DensityMetric } from '../../../src/core/metrics/structural/DensityMetric';
import { CyclomaticComplexityMetric } from '../../../src/core/metrics/complexity/CyclomaticComplexityMetric';
import { NPathComplexityMetric } from '../../../src/core/metrics/complexity/NPathComplexityMetric';
import { FlowParser } from '../../../src/core/parser/FlowParser';
import { NodeClassifier } from '../../../src/core/parser/NodeClassifier';
import { GraphBuilder } from '../../../src/core/graph/GraphBuilder';
import { ComponentFinder } from '../../../src/core/graph/ComponentFinder';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Metrics Integration', () => {
  let registry: MetricsRegistry;
  let parser: FlowParser;
  let classifier: NodeClassifier;
  let builder: GraphBuilder;
  let finder: ComponentFinder;

  beforeEach(() => {
    registry = new MetricsRegistry();
    registry.register(new VertexCountMetric());
    registry.register(new EdgeCountMetric());
    registry.register(new FanInMetric());
    registry.register(new FanOutMetric());
    registry.register(new DensityMetric());
    registry.register(new CyclomaticComplexityMetric());
    registry.register(new NPathComplexityMetric());

    parser = new FlowParser();
    classifier = new NodeClassifier();
    builder = new GraphBuilder(classifier);
    finder = new ComponentFinder();
  });

  function loadFixture(filename: string): string {
    return readFileSync(join(__dirname, '../../fixtures', filename), 'utf-8');
  }

  describe('simple-flow.json', () => {
    it('should compute all metrics for simple linear flow', () => {
      const json = loadFixture('simple-flow.json');
      const parsed = parser.parse(json);
      const flowId = parsed.tabs[0].id;
      const graph = builder.build(parsed.nodes, flowId);
      const components = finder.findComponents(graph);

      expect(components).toHaveLength(1);
      const component = components[0];

      const result = registry.computeAll(component);

      expect(result.componentId).toBe(component.id);
      expect(result.metrics.size).toBe(7);

      expect(result.metrics.get('vertex-count')?.value).toBe(3);
      expect(result.metrics.get('edge-count')?.value).toBe(2);

      expect(result.metrics.get('fan-in')?.value).toBe(1);
      expect(result.metrics.get('fan-in')?.metadata.details.avg).toBe(0.67);

      expect(result.metrics.get('fan-out')?.value).toBe(1);
      expect(result.metrics.get('fan-out')?.metadata.details.avg).toBe(0.67);

      expect(result.metrics.get('density')?.value).toBe(0.3333);

      expect(result.metrics.get('cyclomatic-complexity')?.value).toBe(1);
      expect(result.metrics.get('npath-complexity')?.value).toBe(1);
    });
  });

  describe('complex-branching.json', () => {
    it('should compute metrics for flow with decision nodes', () => {
      const json = loadFixture('complex-branching.json');
      const parsed = parser.parse(json);
      const flowId = parsed.tabs[0].id;
      const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
      const graph = builder.build(nodesForTab, flowId);
      const components = finder.findComponents(graph);

      expect(components).toHaveLength(1);
      const component = components[0];

      const result = registry.computeAll(component);

      expect(result.metrics.get('vertex-count')?.value).toBe(7);
      expect(result.metrics.get('edge-count')?.value).toBe(6);

      expect(result.metrics.get('fan-in')?.value).toBe(1);
      expect(result.metrics.get('fan-in')?.metadata.details.avg).toBe(0.86);

      expect(result.metrics.get('fan-out')?.value).toBe(2);
      expect(result.metrics.get('fan-out')?.metadata.details.avg).toBe(0.86);

      expect(result.metrics.get('density')?.value).toBe(0.1429);

      expect(result.metrics.get('cyclomatic-complexity')?.value).toBe(3);
      expect(result.metrics.get('npath-complexity')?.value).toBe(4);
    });
  });

  describe('multi-component.json', () => {
    it('should compute metrics for each component separately', () => {
      const json = loadFixture('multi-component.json');
      const parsed = parser.parse(json);
      const flowId = parsed.tabs[0].id;
      const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
      const graph = builder.build(nodesForTab, flowId);
      const components = finder.findComponents(graph);

      expect(components.length).toBeGreaterThan(1);

      // Compute metrics for each component
      const results = components.map(comp => registry.computeAll(comp));

      // Component ordering: first component is the 3-node linear flow, second is the 4-node with switch
      const r1 = results[0];
      const r2 = results[1];

      // Component 1 (3 nodes)
      expect(r1.metrics.get('vertex-count')?.value).toBe(3);
      expect(r1.metrics.get('edge-count')?.value).toBe(2);
      expect(r1.metrics.get('fan-in')?.value).toBe(1);
      expect(r1.metrics.get('fan-out')?.value).toBe(1);
      expect(r1.metrics.get('density')?.value).toBe(0.3333);
      expect(r1.metrics.get('cyclomatic-complexity')?.value).toBe(1);
      expect(r1.metrics.get('npath-complexity')?.value).toBe(1);

      // Component 2 (4 nodes, switch)
      expect(r2.metrics.get('vertex-count')?.value).toBe(4);
      expect(r2.metrics.get('edge-count')?.value).toBe(3);
      expect(r2.metrics.get('fan-in')?.value).toBe(1);
      expect(r2.metrics.get('fan-out')?.value).toBe(2);
      expect(r2.metrics.get('density')?.value).toBe(0.25);
      expect(r2.metrics.get('cyclomatic-complexity')?.value).toBe(2);
      expect(r2.metrics.get('npath-complexity')?.value).toBe(2);
    });
  });

  describe('metric categories', () => {
    it('should compute only size metrics', () => {
      const sizeMetrics = registry.getMetricsByCategory('size');
      
      expect(sizeMetrics).toHaveLength(2);
      expect(sizeMetrics.map(m => m.id)).toEqual(['vertex-count', 'edge-count']);
    });

    it('should compute only structural metrics', () => {
      const structuralMetrics = registry.getMetricsByCategory('structural');
      
      expect(structuralMetrics).toHaveLength(3);
      expect(structuralMetrics.map(m => m.id)).toContain('fan-in');
      expect(structuralMetrics.map(m => m.id)).toContain('fan-out');
      expect(structuralMetrics.map(m => m.id)).toContain('density');
    });

    it('should compute only complexity metrics', () => {
      const complexityMetrics = registry.getMetricsByCategory('complexity');
      
      expect(complexityMetrics).toHaveLength(2);
      expect(complexityMetrics.map(m => m.id)).toEqual(['cyclomatic-complexity', 'npath-complexity']);
    });
  });

  describe('selective computation', () => {
    it('should compute specific subset of metrics', () => {
      const json = loadFixture('simple-flow.json');
      const parsed = parser.parse(json);
      const flowId = parsed.tabs[0].id;
      const graph = builder.build(parsed.nodes, flowId);
      const components = finder.findComponents(graph);
      const component = components[0];

      const result = registry.computeMetrics(component, ['vertex-count', 'cyclomatic-complexity']);

      expect(result.metrics.size).toBe(2);
      expect(result.metrics.has('vertex-count')).toBe(true);
      expect(result.metrics.has('cyclomatic-complexity')).toBe(true);
      expect(result.metrics.has('edge-count')).toBe(false);
    });
  });

  describe('validation', () => {
    it('should verify all metrics have unique IDs', () => {
      const metrics = registry.getAllMetrics();
      const ids = metrics.map(m => m.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should verify all metrics return valid results', () => {
      const json = loadFixture('complex-branching.json');
      const parsed = parser.parse(json);
      const flowId = parsed.tabs[0].id;
      const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
      const graph = builder.build(nodesForTab, flowId);
      const components = finder.findComponents(graph);
      const component = components[0];

      const result = registry.computeAll(component);

      for (const [metricId, metricResult] of result.metrics) {
        expect(metricResult.value).toBeTypeOf('number');
        expect(metricResult.value).toBeGreaterThanOrEqual(0);
        expect(metricId).toBeTruthy();
      }
    });
  });
});

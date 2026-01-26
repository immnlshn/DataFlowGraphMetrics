/**
 * Integration tests for ReportBuilder with real flow data
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ReportBuilder } from '../../../src/core/reporter/ReportBuilder';
import { FlowParser } from '../../../src/core/parser/FlowParser';
import { NodeClassifier } from '../../../src/core/parser/NodeClassifier';
import { GraphBuilder } from '../../../src/core/graph/GraphBuilder';
import { ComponentFinder } from '../../../src/core/graph/ComponentFinder';
import { MetricsRegistry } from '../../../src/core/metrics/MetricsRegistry';
import { VertexCountMetric } from '../../../src/core/metrics/size/VertexCountMetric';
import { EdgeCountMetric } from '../../../src/core/metrics/size/EdgeCountMetric';
import { FanInMetric } from '../../../src/core/metrics/structural/FanInMetric';
import { FanOutMetric } from '../../../src/core/metrics/structural/FanOutMetric';
import { DensityMetric } from '../../../src/core/metrics/structural/DensityMetric';
import { CyclomaticComplexityMetric } from '../../../src/core/metrics/complexity/CyclomaticComplexityMetric';
import { NPathComplexityMetric } from '../../../src/core/metrics/complexity/NPathComplexityMetric';
import { ComponentMetrics } from '../../../src/core/types/metrics.types';

describe('ReportBuilder Integration', () => {
  let parser: FlowParser;
  let builder: GraphBuilder;
  let finder: ComponentFinder;
  let registry: MetricsRegistry;
  let reporter: ReportBuilder;

  beforeEach(() => {
    const classifier = new NodeClassifier();
    parser = new FlowParser();
    builder = new GraphBuilder(classifier);
    finder = new ComponentFinder();
    registry = new MetricsRegistry();
    reporter = new ReportBuilder();

    // Register all metrics
    registry.register(new VertexCountMetric());
    registry.register(new EdgeCountMetric());
    registry.register(new FanInMetric());
    registry.register(new FanOutMetric());
    registry.register(new DensityMetric());
    registry.register(new CyclomaticComplexityMetric());
    registry.register(new NPathComplexityMetric());
  });

  function loadFixture(filename: string): unknown {
    const fixturePath = path.join(__dirname, '../../fixtures', filename);
    const content = fs.readFileSync(fixturePath, 'utf-8');
    return JSON.parse(content);
  }

  describe('simple-flow.json', () => {
    it('should generate complete report for simple flow', () => {
      const json = loadFixture('simple-flow.json');
      const parsed = parser.parse(json);
      const flowId = parsed.tabs[0].id;
      const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
      const graph = builder.build(nodesForTab, flowId);
      const components = finder.findComponents(graph);

      const metricsMap = new Map<string, ComponentMetrics>();
      for (const component of components) {
        const metrics = registry.computeAll(component);
        metricsMap.set(component.id, metrics);
      }

      const report = reporter.build(components, metricsMap);

      expect(report.summary.flowCount).toBe(1);
      expect(report.summary.totalComponents).toBe(1);
      expect(report.summary.analyzedAt).toBeDefined();
      expect(report.components).toHaveLength(1);
      expect(report.components[0].metrics['vertex-count'].value).toBe(3);
      expect(report.components[0].metrics['edge-count'].value).toBe(2);
    });

    it('should include all metrics in component report', () => {
      const json = loadFixture('simple-flow.json');
      const parsed = parser.parse(json);
      const flowId = parsed.tabs[0].id;
      const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
      const graph = builder.build(nodesForTab, flowId);
      const components = finder.findComponents(graph);

      const metricsMap = new Map<string, ComponentMetrics>();
      for (const component of components) {
        const metrics = registry.computeAll(component);
        metricsMap.set(component.id, metrics);
      }

      const report = reporter.build(components, metricsMap);

      const component = report.components[0];
      expect(component.metrics['vertex-count']).toBeDefined();
      expect(component.metrics['edge-count']).toBeDefined();
      expect(component.metrics['fan-in']).toBeDefined();
      expect(component.metrics['fan-out']).toBeDefined();
      expect(component.metrics['density']).toBeDefined();
      expect(component.metrics['cyclomatic-complexity']).toBeDefined();
      expect(component.metrics['npath-complexity']).toBeDefined();
    });

    it('should include flow ID and component ID', () => {
      const json = loadFixture('simple-flow.json');
      const parsed = parser.parse(json);
      const flowId = parsed.tabs[0].id;
      const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
      const graph = builder.build(nodesForTab, flowId);
      const components = finder.findComponents(graph);

      const metricsMap = new Map<string, ComponentMetrics>();
      for (const component of components) {
        const metrics = registry.computeAll(component);
        metricsMap.set(component.id, metrics);
      }

      const report = reporter.build(components, metricsMap);

      expect(report.components[0].id).toBeDefined();
      expect(report.components[0].flowId).toBe(flowId);
    });
  });

  describe('multi-component.json', () => {
    it('should handle multiple components correctly', () => {
      const json = loadFixture('multi-component.json');
      const parsed = parser.parse(json);
      const flowId = parsed.tabs[0].id;
      const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
      const graph = builder.build(nodesForTab, flowId);
      const components = finder.findComponents(graph);

      const metricsMap = new Map<string, ComponentMetrics>();
      for (const component of components) {
        const metrics = registry.computeAll(component);
        metricsMap.set(component.id, metrics);
      }

      const report = reporter.build(components, metricsMap);

      expect(report.summary.totalComponents).toBe(2);
      expect(report.components).toHaveLength(2);
    });

    it('should include metrics for each component', () => {
      const json = loadFixture('multi-component.json');
      const parsed = parser.parse(json);
      const flowId = parsed.tabs[0].id;
      const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
      const graph = builder.build(nodesForTab, flowId);
      const components = finder.findComponents(graph);

      const metricsMap = new Map<string, ComponentMetrics>();
      for (const component of components) {
        const metrics = registry.computeAll(component);
        metricsMap.set(component.id, metrics);
      }

      const report = reporter.build(components, metricsMap);

      // Each component should have all metrics
      report.components.forEach(comp => {
        expect(comp.metrics['vertex-count']).toBeDefined();
        expect(comp.metrics['edge-count']).toBeDefined();
        expect(comp.metrics['density']).toBeDefined();
      });
    });

    it('should sort components deterministically', () => {
      const json = loadFixture('multi-component.json');
      const parsed = parser.parse(json);
      const flowId = parsed.tabs[0].id;
      const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
      const graph = builder.build(nodesForTab, flowId);
      const components = finder.findComponents(graph);

      const metricsMap = new Map<string, ComponentMetrics>();
      for (const component of components) {
        const metrics = registry.computeAll(component);
        metricsMap.set(component.id, metrics);
      }

      const report = reporter.build(components, metricsMap);

      // Component IDs should be sorted
      const ids = report.components.map(c => c.id);
      const sortedIds = [...ids].sort();
      expect(ids).toEqual(sortedIds);
    });
  });

  describe('complex-branching.json', () => {
    it('should handle complex flow with decision nodes', () => {
      const json = loadFixture('complex-branching.json');
      const parsed = parser.parse(json);
      const flowId = parsed.tabs[0].id;
      const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
      const graph = builder.build(nodesForTab, flowId);
      const components = finder.findComponents(graph);

      const metricsMap = new Map<string, ComponentMetrics>();
      for (const component of components) {
        const metrics = registry.computeAll(component);
        metricsMap.set(component.id, metrics);
      }

      const report = reporter.build(components, metricsMap);

      expect(report.summary.totalComponents).toBe(1);
      expect(report.components[0].metrics['cyclomatic-complexity'].value).toBeGreaterThan(1);
    });
  });

  describe('report serialization', () => {
    it('should produce JSON-serializable report', () => {
      const json = loadFixture('simple-flow.json');
      const parsed = parser.parse(json);
      const flowId = parsed.tabs[0].id;
      const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
      const graph = builder.build(nodesForTab, flowId);
      const components = finder.findComponents(graph);

      const metricsMap = new Map<string, ComponentMetrics>();
      for (const component of components) {
        const metrics = registry.computeAll(component);
        metricsMap.set(component.id, metrics);
      }

      const report = reporter.build(components, metricsMap);

      const jsonString = JSON.stringify(report, null, 2);
      expect(() => JSON.parse(jsonString)).not.toThrow();
    });

    it('should produce deterministic JSON for same input', () => {
      const json = loadFixture('simple-flow.json');
      const parsed = parser.parse(json);
      const flowId = parsed.tabs[0].id;
      const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
      const graph = builder.build(nodesForTab, flowId);
      const components = finder.findComponents(graph);

      const metricsMap1 = new Map<string, ComponentMetrics>();
      for (const component of components) {
        const metrics = registry.computeAll(component);
        metricsMap1.set(component.id, metrics);
      }

      const metricsMap2 = new Map<string, ComponentMetrics>();
      for (const component of components) {
        const metrics = registry.computeAll(component);
        metricsMap2.set(component.id, metrics);
      }

      const report1 = reporter.build(components, metricsMap1);
      const report2 = reporter.build(components, metricsMap2);

      // Structure should be identical (except timestamps)
      expect(report1.components).toEqual(report2.components);
      expect(report1.summary.totalComponents).toEqual(report2.summary.totalComponents);
      expect(report1.summary.flowCount).toEqual(report2.summary.flowCount);
    });
  });
});

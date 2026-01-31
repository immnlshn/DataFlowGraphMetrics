/**
 * End-to-end integration tests for FlowAnalyzer
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { analyzeFlow, FlowAnalyzer } from '../../src/core';

describe('FlowAnalyzer End-to-End', () => {
  function loadFixture(filename: string): unknown {
    const fixturePath = path.join(__dirname, '../fixtures', filename);
    const content = fs.readFileSync(fixturePath, 'utf-8');
    return JSON.parse(content);
  }

  describe('Public API', () => {
    it('should export analyzeFlow function', () => {
      expect(typeof analyzeFlow).toBe('function');
    });

    it('should export FlowAnalyzer class', () => {
      expect(FlowAnalyzer).toBeDefined();
      expect(typeof FlowAnalyzer).toBe('function');
    });
  });

  describe('Simple Flow', () => {
    it('should analyze complete flow and return report', () => {
      const json = loadFixture('simple-flow.json');
      const report = analyzeFlow(json);

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.components).toBeDefined();
      expect(Array.isArray(report.components)).toBe(true);
    });

    it('should have correct summary statistics', () => {
      const json = loadFixture('simple-flow.json');
      const report = analyzeFlow(json);

      expect(report.summary.flowCount).toBe(1);
      expect(report.summary.totalComponents).toBe(1);
      expect(report.summary.analyzedAt).toBeDefined();
    });

    it('should compute all metrics for each component', () => {
      const json = loadFixture('simple-flow.json');
      const report = analyzeFlow(json);

      expect(report.components).toHaveLength(1);
      const component = report.components[0];

      // Check all metrics are present
      expect(component.metrics['vertex-count']).toBeDefined();
      expect(component.metrics['edge-count']).toBeDefined();
      expect(component.metrics['fan-in']).toBeDefined();
      expect(component.metrics['fan-out']).toBeDefined();
      expect(component.metrics['density']).toBeDefined();
      expect(component.metrics['cyclomatic-complexity']).toBeDefined();
      expect(component.metrics['npath-complexity']).toBeDefined();
    });

    it('should include flow metadata in component reports', () => {
      const json = loadFixture('simple-flow.json');
      const report = analyzeFlow(json);

      const component = report.components[0];
      expect(component.id).toBeDefined();
      expect(component.flowId).toBeDefined();
    });

    it('should have correct metric values for simple flow', () => {
      const json = loadFixture('simple-flow.json');
      const report = analyzeFlow(json);

      const component = report.components[0];
      expect(component.metrics['vertex-count'].value).toBe(3);
      expect(component.metrics['edge-count'].value).toBe(2);
      expect(component.metrics['cyclomatic-complexity'].value).toBe(1);
    });
  });

  describe('Multi-Component Flow', () => {
    it('should find multiple components', () => {
      const json = loadFixture('multi-component.json');
      const report = analyzeFlow(json);

      expect(report.summary.totalComponents).toBeGreaterThan(1);
      expect(report.components.length).toBeGreaterThan(1);
    });

    it('should analyze each component independently', () => {
      const json = loadFixture('multi-component.json');
      const report = analyzeFlow(json);

      report.components.forEach(comp => {
        expect(comp.id).toBeDefined();
        expect(comp.metrics['vertex-count']).toBeDefined();
        expect(comp.metrics['edge-count']).toBeDefined();
      });
    });

    it('should maintain component isolation', () => {
      const json = loadFixture('multi-component.json');
      const report = analyzeFlow(json);

      const ids = report.components.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Complex Branching', () => {
    it('should handle decision nodes correctly', () => {
      const json = loadFixture('complex-branching.json');
      const report = analyzeFlow(json);

      const component = report.components[0];
      const cc = component.metrics['cyclomatic-complexity'].value;

      expect(cc).toBeGreaterThan(1);
    });

    it('should compute npath complexity for branches', () => {
      const json = loadFixture('complex-branching.json');
      const report = analyzeFlow(json);

      const component = report.components[0];
      const npath = component.metrics['npath-complexity'].value;

      expect(npath).toBeGreaterThan(1);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid JSON', () => {
      expect(() => analyzeFlow('not json')).toThrow();
    });

    it('should throw error for non-array input', () => {
      expect(() => analyzeFlow({ foo: 'bar' })).toThrow();
    });

    it('should throw error for null input', () => {
      expect(() => analyzeFlow(null)).toThrow();
    });

    it('should throw error for undefined input', () => {
      expect(() => analyzeFlow(undefined)).toThrow();
    });

    it('should handle empty array gracefully', () => {
      const report = analyzeFlow([]);

      expect(report.summary.totalComponents).toBe(0);
      expect(report.components).toHaveLength(0);
    });

    it('should handle flow with no nodes gracefully', () => {
      const json = [
        {
          id: 'test-flow',
          type: 'tab',
          label: 'Empty Flow',
          disabled: false,
          info: '',
          env: []
        }
      ];

      const report = analyzeFlow(json);

      expect(report.summary.totalComponents).toBe(0);
      expect(report.components).toHaveLength(0);
    });
  });

  describe('Performance Test', () => {
    it('should handle large flow (1000+ nodes) efficiently', () => {
      const json = loadFixture('large-flow.json');
      
      const startTime = Date.now();
      const report = analyzeFlow(json);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000);

      // Binary tree creates 1 connected component (single flow)
      expect(report.summary.totalComponents).toBe(1);
      
      let totalNodes = 0;
      report.components.forEach(comp => {
        totalNodes += comp.metrics['vertex-count'].value;
      });
      expect(totalNodes).toBeGreaterThan(1000);
    });

    it('should compute all metrics for large flow', () => {
      const json = loadFixture('large-flow.json');
      const report = analyzeFlow(json);

      report.components.forEach(comp => {
        expect(comp.metrics['vertex-count']).toBeDefined();
        expect(comp.metrics['edge-count']).toBeDefined();
        expect(comp.metrics['fan-in']).toBeDefined();
        expect(comp.metrics['fan-out']).toBeDefined();
        expect(comp.metrics['density']).toBeDefined();
        expect(comp.metrics['cyclomatic-complexity']).toBeDefined();
        expect(comp.metrics['npath-complexity']).toBeDefined();
      });
    });

    it('should maintain correctness at scale', () => {
      const json = loadFixture('large-flow.json');
      const report = analyzeFlow(json);

      report.components.forEach(comp => {
        const V = comp.metrics['vertex-count'].value;
        const E = comp.metrics['edge-count'].value;
        const density = comp.metrics['density'].value;

        expect(V).toBeGreaterThan(0);
        expect(E).toBeGreaterThanOrEqual(0);
        expect(E).toBeLessThanOrEqual(V * (V - 1));
        expect(density).toBeGreaterThanOrEqual(0);
        expect(density).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Multiple Flows', () => {
    it('should handle multiple flows/tabs in one export', () => {
      const json = loadFixture('multi-component.json');
      const report = analyzeFlow(json);

      expect(report.summary.flowCount).toBeGreaterThan(1);
    });

    it('should aggregate components across flows', () => {
      const json = loadFixture('multi-component.json');
      const report = analyzeFlow(json);

      const flowIds = new Set(report.components.map(c => c.flowId));
      expect(flowIds.size).toBeGreaterThan(1);
    });
  });

  describe('Report Structure Validation', () => {
    it('should produce valid JSON report', () => {
      const json = loadFixture('simple-flow.json');
      const report = analyzeFlow(json);

      const jsonString = JSON.stringify(report);
      expect(() => JSON.parse(jsonString)).not.toThrow();
    });

    it('should have deterministic output', () => {
      const json = loadFixture('simple-flow.json');
      
      const report1 = analyzeFlow(json);
      const report2 = analyzeFlow(json);

      expect(report1.components.length).toBe(report2.components.length);
      for (let i = 0; i < report1.components.length; i++) {
        expect(report1.components[i].id).toBe(report2.components[i].id);
      }
    });

    it('should sort components by ID', () => {
      const json = loadFixture('multi-component.json');
      const report = analyzeFlow(json);

      const ids = report.components.map(c => c.id);
      const sortedIds = [...ids].sort();
      expect(ids).toEqual(sortedIds);
    });

    it('should include timestamp in ISO format', () => {
      const json = loadFixture('simple-flow.json');
      const report = analyzeFlow(json);

      const timestamp = new Date(report.summary.analyzedAt);
      expect(timestamp.toISOString()).toBe(report.summary.analyzedAt);
    });
  });

  describe('FlowAnalyzer Class', () => {
    it('should be reusable across multiple analyses', () => {
      const analyzer = new FlowAnalyzer();
      
      const json1 = loadFixture('simple-flow.json');
      const json2 = loadFixture('multi-component.json');

      const report1 = analyzer.analyze(json1);
      const report2 = analyzer.analyze(json2);

      expect(report1.components.length).not.toBe(report2.components.length);
    });

    it('should produce same results as analyzeFlow function', () => {
      const json = loadFixture('simple-flow.json');
      
      const analyzer = new FlowAnalyzer();
      const report1 = analyzer.analyze(json);
      const report2 = analyzeFlow(json);

      expect(report1.components.length).toBe(report2.components.length);
      expect(report1.summary.totalComponents).toBe(report2.summary.totalComponents);
    });
  });
});

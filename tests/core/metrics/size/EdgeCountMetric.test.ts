import { describe, it, expect } from 'vitest';
import { EdgeCountMetric } from '../../../../src/core/metrics/size/EdgeCountMetric';
import { GraphModel } from '../../../../src/core/graph/GraphModel';
import { ConnectedComponent } from '../../../../src/core/types/graph.types';

describe('EdgeCountMetric', () => {
  const metric = new EdgeCountMetric();

  const createComponent = (nodeCount: number, edgeCount: number): ConnectedComponent => {
    const graph = new GraphModel();
    const nodes = new Set<string>();
    
    for (let i = 0; i < nodeCount; i++) {
      const nodeId = `n${i}`;
      nodes.add(nodeId);
      graph.addNode({
        id: nodeId,
        type: 'test',
        flowId: 'flow-1',
        isDecisionNode: false,
        metadata: {}
      });
    }
    
    for (let i = 0; i < edgeCount && i < nodeCount - 1; i++) {
      graph.addEdge({
        source: `n${i}`,
        target: `n${i + 1}`,
        sourcePort: 0
      });
    }
    
    return {
      id: 'comp-1',
      flowId: 'flow-1',
      nodes,
      graph
    };
  };

  it('should have correct metadata', () => {
    expect(metric.id).toBe('edge-count');
    expect(metric.name).toBe('Edge Count');
    expect(metric.category).toBe('size');
    expect(metric.description).toContain('edges');
  });

  it('should count edges correctly', () => {
    const component = createComponent(5, 4);
    const result = metric.compute(component);

    expect(result.value).toBe(4);
  });

  it('should handle component with no edges', () => {
    const component = createComponent(3, 0);
    const result = metric.compute(component);

    expect(result.value).toBe(0);
  });

  it('should handle single edge', () => {
    const component = createComponent(2, 1);
    const result = metric.compute(component);

    expect(result.value).toBe(1);
    expect(result.metadata?.interpretation).toContain('1 edge');
  });

  it('should include interpretation in metadata', () => {
    const component = createComponent(4, 3);
    const result = metric.compute(component);

    expect(result.metadata?.interpretation).toBeDefined();
    expect(result.metadata?.interpretation).toContain('3 edges');
  });
});

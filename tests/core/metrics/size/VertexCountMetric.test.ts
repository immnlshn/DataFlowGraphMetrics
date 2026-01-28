import { describe, it, expect } from 'vitest';
import { VertexCountMetric } from '../../../../src/core/metrics/size/VertexCountMetric';
import { GraphModel } from '../../../../src/core/graph/GraphModel';
import { ConnectedComponent } from '../../../../src/core/types/graph.types';

describe('VertexCountMetric', () => {
  const metric = new VertexCountMetric();

  const createComponent = (nodeCount: number): ConnectedComponent => {
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
    
    return {
      id: 'comp-1',
      flowId: 'flow-1',
      graph
    };
  };

  it('should have correct metadata', () => {
    expect(metric.id).toBe('vertex-count');
    expect(metric.name).toBe('Vertex Count');
    expect(metric.category).toBe('size');
    expect(metric.description).toContain('nodes');
  });

  it('should count vertices correctly', () => {
    const component = createComponent(5);
    const result = metric.compute(component);

    expect(result.value).toBe(5);
  });

  it('should handle empty component', () => {
    const component = createComponent(0);
    const result = metric.compute(component);

    expect(result.value).toBe(0);
  });

  it('should handle single node', () => {
    const component = createComponent(1);
    const result = metric.compute(component);

    expect(result.value).toBe(1);
    expect(result.metadata?.interpretation).toContain('1 node');
  });

  it('should include interpretation in metadata', () => {
    const component = createComponent(3);
    const result = metric.compute(component);

    expect(result.metadata?.interpretation).toBeDefined();
    expect(result.metadata?.interpretation).toContain('3 nodes');
  });
});

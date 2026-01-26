import { describe, it, expect } from 'vitest';
import { FanOutMetric } from '../../../../src/core/metrics/structural/FanOutMetric';
import { GraphModel } from '../../../../src/core/graph/GraphModel';
import { ConnectedComponent } from '../../../../src/core/types/graph.types';

describe('FanOutMetric', () => {
  const metric = new FanOutMetric();

  const createComponent = (graph: GraphModel): ConnectedComponent => {
    return {
      id: 'comp-1',
      flowId: 'flow-1',
      nodes: new Set(graph.getNodeIds()),
      graph
    };
  };

  it('should have correct metadata', () => {
    expect(metric.id).toBe('fan-out');
    expect(metric.name).toBe('Fan-Out');
    expect(metric.category).toBe('structural');
  });

  it('should calculate max and average fan-out', () => {
    const graph = new GraphModel();
    graph.addNode({ id: 'n1', type: 'test', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n2', type: 'test', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n3', type: 'test', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n4', type: 'test', flowId: 'f1', isDecisionNode: false, metadata: {} });
    
    graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
    graph.addEdge({ source: 'n1', target: 'n3', sourcePort: 1 });
    graph.addEdge({ source: 'n1', target: 'n4', sourcePort: 2 });

    const component = createComponent(graph);
    const result = metric.compute(component);

    expect(result.value).toBe(3); // max fan-out
    expect(result.metadata?.details).toEqual({ max: 3, avg: 0.75 });
  });

  it('should handle empty component', () => {
    const graph = new GraphModel();
    const component = createComponent(graph);
    const result = metric.compute(component);

    expect(result.value).toBe(0);
    expect(result.metadata?.details).toEqual({ max: 0, avg: 0 });
  });

  it('should handle component with no edges', () => {
    const graph = new GraphModel();
    graph.addNode({ id: 'n1', type: 'test', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n2', type: 'test', flowId: 'f1', isDecisionNode: false, metadata: {} });

    const component = createComponent(graph);
    const result = metric.compute(component);

    expect(result.value).toBe(0);
    expect(result.metadata?.details).toEqual({ max: 0, avg: 0 });
  });
});

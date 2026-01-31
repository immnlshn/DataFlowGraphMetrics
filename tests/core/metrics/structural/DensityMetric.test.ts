import { describe, it, expect } from 'vitest';
import { DensityMetric } from '../../../../src/core/metrics/structural/DensityMetric';
import { GraphModel } from '../../../../src/core/graph/GraphModel';
import { ConnectedComponent } from '../../../../src/core/types/graph.types';

describe('DensityMetric', () => {
  const metric = new DensityMetric();

  const createComponent = (graph: GraphModel): ConnectedComponent => {
    return {
      id: 'comp-1',
      flowId: 'flow-1',
      graph
    };
  };

  it('should have correct metadata', () => {
    expect(metric.id).toBe('density');
    expect(metric.name).toBe('Graph Density');
    expect(metric.category).toBe('structural');
  });

  it('should calculate density for directed graph', () => {
    const graph = new GraphModel();
    graph.addNode({ id: 'n1', type: 'test', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n2', type: 'test', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n3', type: 'test', flowId: 'f1', isDecisionNode: false, metadata: {} });
    
    graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
    graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
    graph.addEdge({ source: 'n3', target: 'n1', sourcePort: 0 });

    const component = createComponent(graph);
    const result = metric.compute(component);

    // 3 nodes, max edges = 3 * 2 = 6, actual = 3, density = 3/6 = 0.5
    expect(result.value).toBe(0.5);
  });

  it('should handle single node', () => {
    const graph = new GraphModel();
    graph.addNode({ id: 'n1', type: 'test', flowId: 'f1', isDecisionNode: false, metadata: {} });

    const component = createComponent(graph);
    const result = metric.compute(component);

    expect(result.value).toBe(0);
  });

  it('should handle empty component', () => {
    const graph = new GraphModel();
    const component = createComponent(graph);
    const result = metric.compute(component);

    expect(result.value).toBe(0);
  });

  it('should calculate density for fully connected graph', () => {
    const graph = new GraphModel();
    graph.addNode({ id: 'n1', type: 'test', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n2', type: 'test', flowId: 'f1', isDecisionNode: false, metadata: {} });
    
    graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
    graph.addEdge({ source: 'n2', target: 'n1', sourcePort: 0 });

    const component = createComponent(graph);
    const result = metric.compute(component);

    // 2 nodes, max edges = 2 * 1 = 2, actual = 2, density = 2/2 = 1.0
    expect(result.value).toBe(1.0);
  });

  it('should include details in metadata', () => {
    const graph = new GraphModel();
    graph.addNode({ id: 'n1', type: 'test', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n2', type: 'test', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n3', type: 'test', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });

    const component = createComponent(graph);
    const result = metric.compute(component);

    expect(result.metadata?.details).toEqual({
      nodes: 3,
      edges: 1,
      maxPossibleEdges: 6
    });
  });
});

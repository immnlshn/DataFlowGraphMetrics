import { describe, it, expect } from 'vitest';
import { NPathComplexityMetric } from '../../../../src/core/metrics/complexity/NPathComplexityMetric';
import { GraphModel } from '../../../../src/core/graph/GraphModel';
import { ConnectedComponent } from '../../../../src/core/types/graph.types';

describe('NPathComplexityMetric', () => {
  const metric = new NPathComplexityMetric();

  const createComponent = (graph: GraphModel): ConnectedComponent => {
    return {
      id: 'comp-1',
      flowId: 'flow-1',
      graph
    };
  };

  it('should have correct metadata', () => {
    expect(metric.id).toBe('npath-complexity');
    expect(metric.name).toBe('NPATH Complexity');
    expect(metric.category).toBe('complexity');
  });

  it('should return 1 for linear flow with no decision nodes', () => {
    const graph = new GraphModel();
    graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

    const component = createComponent(graph);
    const result = metric.compute(component);

    expect(result.value).toBe(1);
    expect(result.metadata?.interpretation).toContain('single execution path');
  });

  it('should calculate paths for decision nodes with fan-out', () => {
    const graph = new GraphModel();
    graph.addNode({ id: 'n1', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
    graph.addNode({ id: 'n2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
    
    graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
    graph.addEdge({ source: 'n1', target: 'n3', sourcePort: 1 });
    graph.addEdge({ source: 'n1', target: 'n4', sourcePort: 2 });

    const component = createComponent(graph);
    const result = metric.compute(component);

    expect(result.value).toBe(3); // 1 decision node with 3 outputs
    expect(result.metadata?.details).toEqual({
      decisionNodes: 1,
      pathMultipliers: [3]
    });
  });

  it('should multiply paths for multiple decision nodes', () => {
    const graph = new GraphModel();
    graph.addNode({ id: 'n1', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
    graph.addNode({ id: 'n2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
    graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
    
    graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
    graph.addEdge({ source: 'n1', target: 'n3', sourcePort: 1 });
    graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 0 });

    const component = createComponent(graph);
    const result = metric.compute(component);

    // n1 has 2 outputs, n2 has 1 output
    expect(result.value).toBe(2); // 2 * 1
  });

  it('should handle decision node with no outputs', () => {
    const graph = new GraphModel();
    graph.addNode({ id: 'n1', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
    graph.addNode({ id: 'n2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

    const component = createComponent(graph);
    const result = metric.compute(component);

    // Decision node with 0 decision paths should not affect the product
    expect(result.value).toBe(1);
  });
});

import { describe, it, expect } from 'vitest';
import { CyclomaticComplexityMetric } from '../../../../src/core/metrics/complexity/CyclomaticComplexityMetric';
import { GraphModel } from '../../../../src/core/graph/GraphModel';
import { ConnectedComponent } from '../../../../src/core/types/graph.types';

describe('CyclomaticComplexityMetric', () => {
  const metric = new CyclomaticComplexityMetric();

  const createComponent = (graph: GraphModel): ConnectedComponent => {
    return {
      id: 'comp-1',
      flowId: 'flow-1',
      graph
    };
  };

  it('should have correct metadata', () => {
    expect(metric.id).toBe('cyclomatic-complexity');
    expect(metric.name).toBe('Cyclomatic Complexity');
    expect(metric.category).toBe('complexity');
  });

  it('should compute complexity with no decision nodes', () => {
    const graph = new GraphModel();
    graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

    const component = createComponent(graph);
    const result = metric.compute(component);

    // CC = 1 + 0 = 1 (no decision nodes)
    expect(result.value).toBe(1);
    
    const details = result.metadata?.details as any;
    expect(details?.decisionNodeCount).toBe(0);
    expect(details?.formula).toBe('1 + sum_{n in D}(out(n) - 1)');
  });

  it('should compute complexity with decision nodes', () => {
    const graph = new GraphModel();
    graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
    graph.addNode({ id: 'n3', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
    graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
    
    // n2 has 2 output ports
    graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
    graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 1 });
    
    // n3 has 1 output port
    graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });

    const component = createComponent(graph);
    const result = metric.compute(component);

    // CC = 1 + (2-1) + (1-1) = 1 + 1 + 0 = 2
    expect(result.value).toBe(2);
    
    const details = result.metadata?.details as any;
    expect(details?.decisionNodeCount).toBe(2);
  });

  it('should include interpretation', () => {
    const graph = new GraphModel();
    graph.addNode({ id: 'n1', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
    graph.addNode({ id: 'n2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
    
    // n1 has 2 outputs
    graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
    graph.addEdge({ source: 'n1', target: 'n3', sourcePort: 1 });

    const component = createComponent(graph);
    const result = metric.compute(component);

    // CC = 1 + (2-1) = 2
    expect(result.value).toBe(2);
    expect(result.metadata?.interpretation).toContain('2');
    expect(result.metadata?.interpretation).toContain('1');
  });

  it('should count distinct output ports correctly', () => {
    const graph = new GraphModel();
    graph.addNode({ id: 'n1', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
    graph.addNode({ id: 'n2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
    graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
    
    // n1 has 3 distinct output ports
    graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
    graph.addEdge({ source: 'n1', target: 'n3', sourcePort: 1 });
    graph.addEdge({ source: 'n1', target: 'n4', sourcePort: 2 });

    const component = createComponent(graph);
    const result = metric.compute(component);

    // CC = 1 + (3-1) = 3
    expect(result.value).toBe(3);
  });
});

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

  describe('baseline: no decision nodes', () => {
    it('should return 1 for linear flow with no decision nodes', () => {
      // Linear flow: inject -> function -> debug
      // CC = 1 (base case, no branching)
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(1);

      const details = result.metadata?.details as any;
      expect(details?.decisionNodeCount).toBe(0);
    });

    it('should return 1 for multicast with no decision nodes', () => {
      // Multicast flow: inject -> function -> debug/debug (same port)
      // CC = 1 (base case, multicast is not branching)
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(1);
    });

    it('should return 1 for empty graph', () => {
      const graph = new GraphModel();
      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(1);
    });
  });

  describe('switch node: implicit catch-all case', () => {
    it('should count switch with 1 output as 2 branches (1 explicit + 1 catch-all)', () => {
      // Switch with 1 explicit output has implicit catch-all
      // 2 branches: pass through output or blocked by catch-all
      // Contribution: 1, CC = 1 + 1 = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should count switch with 1 output multicast same as linear (2 branches)', () => {
      // Switch with 1 output multicasting to multiple targets
      // Still 2 branches: pass or catch-all
      // Multicast on same port does not increase complexity
      // Contribution: 1, CC = 1 + 1 = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should count switch with 2 outputs as 3 branches (2 explicit + 1 catch-all)', () => {
      // Switch with 2 explicit outputs has implicit catch-all
      // 3 branches: output 1, output 2, or catch-all
      // Contribution: 2, CC = 1 + 2 = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });

    it('should count switch with 2 outputs and multicast on one port same as regular 2 outputs', () => {
      // Switch with 2 ports: port 0 multicasts to 2 targets, port 1 to 1 target
      // Still 2 distinct output ports, multicast doesn't change branching
      // 3 branches: output 1, output 2, or catch-all
      // Contribution: 2, CC = 1 + 2 = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      // Port 0: multicast to n3 and n4
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 0 });
      // Port 1: single target n5
      graph.addEdge({ source: 'n2', target: 'n5', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });

    it('should count switch with 3 outputs as 4 branches (3 explicit + 1 catch-all)', () => {
      // Switch with 3 explicit outputs has implicit catch-all
      // 4 branches: output 1, output 2, output 3, or catch-all
      // Contribution: 3, CC = 1 + 3 = 4
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

      expect(result.value).toBe(4);
    });

    it('should count multiple switch nodes correctly', () => {
      // Two switch nodes: first with 2 outputs, second with 1 output
      // First: 3 branches (2 explicit + catch-all), contribute 2
      // Second: 2 branches (1 explicit + catch-all), contribute 1
      // CC = 1 + 2 + 1 = 4
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      // n2 has 2 outputs
      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 1 });

      // n3 has 1 output
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(4);
    });
  });

  describe('function node: standard branching', () => {
    it('should count function with 1 output as 0 branches (linear flow)', () => {
      // Function with 1 output is linear (not a decision point)
      // Contribution: 0, CC = 1 + 0 = 1
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(1);
    });

    it('should count function with 1 output multicast same as linear (0 branches)', () => {
      // Function with 1 output multicasting to multiple targets
      // Still linear (not a decision point)
      // Multicast on same port does not increase complexity
      // Contribution: 0, CC = 1 + 0 = 1
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(1);
    });

    it('should count function with 2 outputs as 1 branch', () => {
      // Function with 2 outputs uses standard formula
      // Contribution: out(n) - 1 = 2 - 1 = 1
      // CC = 1 + 1 = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should count function with 2 outputs and multicast on one port same as regular 2 outputs', () => {
      // Function with 2 ports: port 0 multicasts to 2 targets, port 1 to 1 target
      // Still 2 distinct output ports, multicast doesn't change branching
      // Contribution: out(n) - 1 = 2 - 1 = 1
      // CC = 1 + 1 = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      // Port 0: multicast to n3 and n4
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 0 });
      // Port 1: single target n5
      graph.addEdge({ source: 'n2', target: 'n5', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should count function with 3 outputs as 2 branches', () => {
      // Function with 3 outputs
      // Contribution: out(n) - 1 = 3 - 1 = 2
      // CC = 1 + 2 = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n1', target: 'n3', sourcePort: 1 });
      graph.addEdge({ source: 'n1', target: 'n4', sourcePort: 2 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });

    it('should count multiple function nodes correctly', () => {
      // Two function nodes: first with 2 outputs, second with 1 output
      // First: contribute 1
      // Second: contribute 0
      // CC = 1 + 1 + 0 = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      // n2 has 2 outputs
      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 1 });

      // n3 has 1 output
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });
  });

  describe('trigger node: always 2 branches', () => {
    it('should count trigger with 1 output as 1 branch (pass or block)', () => {
      // Trigger nodes always have 2 branches: pass or block
      // Contribution: 1, CC = 1 + 1 = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should count trigger with multicast same as linear (1 branch)', () => {
      // Trigger with multicast still has 2 branches: pass or block
      // Multicast does not increase complexity
      // Contribution: 1, CC = 1 + 1 = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should count multiple trigger nodes correctly', () => {
      // Two triggers, each with 1 output
      // Each contributes 1
      // CC = 1 + 1 + 1 = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n2', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });
  });

  describe('filter node: always 2 branches', () => {
    it('should count filter with 1 output as 1 branch (pass or block)', () => {
      // Filter nodes always have 2 branches: pass or block
      // Contribution: 1, CC = 1 + 1 = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should count filter with multicast same as linear (1 branch)', () => {
      // Filter with multicast still has 2 branches: pass or block
      // Multicast does not increase complexity
      // Contribution: 1, CC = 1 + 1 = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should count multiple filter nodes correctly', () => {
      // Two filters, each with 1 output
      // Each contributes 1
      // CC = 1 + 1 + 1 = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n2', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });
  });

  describe('mixed node types', () => {
    it('should correctly compute complexity with switch and function nodes', () => {
      // Switch with 2 outputs: contribute 2
      // Function with 2 outputs: contribute 1
      // CC = 1 + 2 + 1 = 4
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 1 });
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(4);
    });

    it('should correctly compute complexity with all decision node types', () => {
      // Switch with 2 outputs: contribute 2
      // Function with 2 outputs: contribute 1
      // Trigger: contribute 1
      // Filter: contribute 1
      // CC = 1 + 2 + 1 + 1 + 1 = 6
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n4', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      // Switch with 2 outputs
      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n1', target: 'n5', sourcePort: 1 });

      // Function with 2 outputs
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n5', sourcePort: 1 });

      // Trigger
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });

      // Filter
      graph.addEdge({ source: 'n4', target: 'n5', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(6);

      const details = result.metadata?.details as any;
      expect(details?.decisionNodeCount).toBe(4);
    });

    it('should handle combination of linear and branching nodes', () => {
      // Switch with 1 output (linear): contribute 1
      // Switch with 2 outputs (branching): contribute 2
      // Function with 1 output (linear): contribute 0
      // Function with 2 outputs (branching): contribute 1
      // Trigger (always 2 branches): contribute 1
      // CC = 1 + 1 + 2 + 0 + 1 + 1 = 6
      const graph = new GraphModel();
      graph.addNode({ id: 's1', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 's2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'f1', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'f2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 't1', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'd1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      // s1: 1 output
      graph.addEdge({ source: 's1', target: 's2', sourcePort: 0 });

      // s2: 2 outputs
      graph.addEdge({ source: 's2', target: 'f1', sourcePort: 0 });
      graph.addEdge({ source: 's2', target: 'f2', sourcePort: 1 });

      // f1: 1 output
      graph.addEdge({ source: 'f1', target: 't1', sourcePort: 0 });

      // f2: 2 outputs
      graph.addEdge({ source: 'f2', target: 't1', sourcePort: 0 });
      graph.addEdge({ source: 'f2', target: 'd1', sourcePort: 1 });

      // t1: 1 output
      graph.addEdge({ source: 't1', target: 'd1', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(6);
    });
  });

  describe('cycles', () => {
    it('should handle simple cycle', () => {
      // Simple cycle: n1 -> n2 -> n3 -> n2 (back edge)
      // For CC, cycles don't change the formula: CC = 1 + sum(branches)
      // No decision nodes, so CC = 1
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n3', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n3', target: 'n2', sourcePort: 0 }); // Back edge creates cycle

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(1);
    });

    it('should handle cycle with decision nodes', () => {
      // Cycle with switch: inject -> switch -> function -> switch (back edge)
      // Switch has 2 outputs: one goes to function (which loops back), one goes to debug
      // Branches from switch: out(n) - 0 = 2 - 0 = 2
      // CC = 1 + 2 = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 1 });
      graph.addEdge({ source: 'n3', target: 'n2', sourcePort: 0 }); // Back edge creates cycle

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });

    it('should handle self-loop', () => {
      // Self-loop: node points to itself
      // No decision nodes, so CC = 1
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n2', sourcePort: 0 }); // Self-loop

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(1);
    });

    it('should handle self-loop with decision node', () => {
      // Self-loop on a switch with 2 outputs
      // One output loops back to itself, one goes to debug
      // Branches: 2
      // CC = 1 + 2 = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n2', sourcePort: 0 }); // Self-loop
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });
  });
});

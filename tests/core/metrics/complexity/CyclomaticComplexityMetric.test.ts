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
      // Structure: inject -> function -> debug
      // Decision nodes: none
      // Formula: CC = 1 + 0 = 1
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'function', sourcePort: 0 });
      graph.addEdge({ source: 'function', target: 'debug', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(1);
    });

    it('should count multicast as additive branches (non-decision node)', () => {
      // Structure: inject -> function -> [debug1, debug2] (multicast on port 0)
      // Multicast is additive: creates 2 parallel execution paths
      // But no decision nodes (function has isDecisionNode: false)
      // Formula: CC = 1 + 0 (from decision nodes) + 1 (from multicast) = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'function', sourcePort: 0 });
      graph.addEdge({ source: 'function', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'function', target: 'debug2', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
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
      // Contribution: 1, CC = 1 + 1 = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'switch', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should count switch with 1 output multicast as additive branches', () => {
      // Switch with 1 output multicasting to multiple targets
      // Multicast is additive: 2 parallel paths from same port
      // Switch contributes: 1 (from decision node) + 1 (from multicast) = 2
      // Plus implicit catch-all: +1
      // Contribution: 2, CC = 1 + 2 = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'switch', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug2', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });

    it('should count switch with 2 outputs as 3 branches (2 explicit + 1 catch-all)', () => {
      // Switch with 2 explicit outputs has implicit catch-all
      // 3 branches: output 1, output 2, or catch-all
      // Contribution: 2, CC = 1 + 2 = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'switch', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug2', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });

    it('should count switch with 2 outputs and multicast on one port as additive', () => {
      // Switch with 2 ports: port 0 multicasts to 2 targets, port 1 to 1 target
      // Port 0 multicast adds 1 branch (2 targets)
      // Port 1: 1 branch
      // Catch-all: 1 branch
      // Contribution: 2 (base) + 1 (multicast) = 3, CC = 1 + 3 = 4
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'switch', sourcePort: 0 });
      // Port 0: multicast to debug1 and debug2
      graph.addEdge({ source: 'switch', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug2', sourcePort: 0 });
      // Port 1: single target debug3
      graph.addEdge({ source: 'switch', target: 'debug3', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(4);
    });

    it('should count switch with 3 outputs as 4 branches (3 explicit + 1 catch-all)', () => {
      // Switch with 3 explicit outputs has implicit catch-all
      // 4 branches: output 1, output 2, output 3, or catch-all
      // Contribution: 3, CC = 1 + 3 = 4
      const graph = new GraphModel();
      graph.addNode({ id: 'switch', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'switch', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug2', sourcePort: 1 });
      graph.addEdge({ source: 'switch', target: 'debug3', sourcePort: 2 });

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
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch1', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'switch2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      // switch1 has 2 outputs
      graph.addEdge({ source: 'inject', target: 'switch1', sourcePort: 0 });
      graph.addEdge({ source: 'switch1', target: 'switch2', sourcePort: 0 });
      graph.addEdge({ source: 'switch1', target: 'debug', sourcePort: 1 });
      // switch2 has 1 output
      graph.addEdge({ source: 'switch2', target: 'debug', sourcePort: 0 });

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
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'function', sourcePort: 0 });
      graph.addEdge({ source: 'function', target: 'debug', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(1);
    });

    it('should count function with 1 output multicast as additive branches', () => {
      // Function with 1 output multicasting to multiple targets
      // Multicast is additive: creates 2 parallel paths
      // Contribution: 0 (not decision node) + 1 (multicast) = 1, CC = 1 + 1 = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'function', sourcePort: 0 });
      graph.addEdge({ source: 'function', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'function', target: 'debug2', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should count function with 2 outputs as 1 branch', () => {
      // Function with 2 outputs uses standard formula
      // Contribution: out(n) - 1 = 2 - 1 = 1
      // CC = 1 + 1 = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'function', sourcePort: 0 });
      graph.addEdge({ source: 'function', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'function', target: 'debug2', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should count function with 2 outputs and multicast on one port as additive', () => {
      // Function with 2 ports: port 0 multicasts to 2 targets, port 1 to 1 target
      // Port 0 multicast adds 1 branch
      // Contribution: (out(n) - 1) + 1 (multicast) = (2 - 1) + 1 = 2
      // CC = 1 + 2 = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'function', sourcePort: 0 });
      // Port 0: multicast to debug1 and debug2
      graph.addEdge({ source: 'function', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'function', target: 'debug2', sourcePort: 0 });
      // Port 1: single target debug3
      graph.addEdge({ source: 'function', target: 'debug3', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });

    it('should count function with 3 outputs as 2 branches', () => {
      // Function with 3 outputs
      // Contribution: out(n) - 1 = 3 - 1 = 2
      // CC = 1 + 2 = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'function', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'function', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'function', target: 'debug2', sourcePort: 1 });
      graph.addEdge({ source: 'function', target: 'debug3', sourcePort: 2 });

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
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function1', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      // function1 has 2 outputs
      graph.addEdge({ source: 'inject', target: 'function1', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'function2', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'debug', sourcePort: 1 });
      // function2 has 1 output
      graph.addEdge({ source: 'function2', target: 'debug', sourcePort: 0 });

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
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'trigger', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'trigger', sourcePort: 0 });
      graph.addEdge({ source: 'trigger', target: 'debug', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should count trigger with multicast as additive branches', () => {
      // Trigger with multicast adds branches
      // Multicast is additive: 2 parallel paths
      // Contribution: 1 (trigger) + 1 (multicast) = 2, CC = 1 + 2 = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'trigger', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'trigger', sourcePort: 0 });
      graph.addEdge({ source: 'trigger', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'trigger', target: 'debug2', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });

    it('should count multiple trigger nodes correctly', () => {
      // Two triggers, each with 1 output
      // Each contributes 1
      // CC = 1 + 1 + 1 = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'trigger1', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'trigger2', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'trigger1', target: 'trigger2', sourcePort: 0 });
      graph.addEdge({ source: 'trigger2', target: 'debug', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });
  });

  describe('filter node: always 2 branches', () => {
    it('should count filter with 1 output as 1 branch (pass or block)', () => {
      // Structure: inject -> rbe (filter) -> debug (1 output port)
      // Filter nodes always have 2 branches: pass message or block (filter out)
      // Contribution: always 1 (fixed for filter nodes)
      // Formula: CC = 1 + 1 = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'rbe', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'rbe', sourcePort: 0 });
      graph.addEdge({ source: 'rbe', target: 'debug', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should count filter with multicast as additive branches', () => {
      // Structure: inject -> rbe (filter) -> [debug1, debug2] (multicast on port 0)
      // Filter with multicast adds branches
      // Multicast is additive: 2 parallel paths
      // Contribution: 1 (filter) + 1 (multicast) = 2
      // Formula: CC = 1 + 2 = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'rbe', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'rbe', sourcePort: 0 });
      graph.addEdge({ source: 'rbe', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'rbe', target: 'debug2', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });

    it('should count multiple filter nodes correctly', () => {
      // Structure: rbe1 (filter) -> rbe2 (filter) -> debug
      // Decision nodes:
      // - rbe1: contributes 1
      // - rbe2: contributes 1
      // Formula: CC = 1 + 1 + 1 = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'rbe1', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'rbe2', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'rbe1', target: 'rbe2', sourcePort: 0 });
      graph.addEdge({ source: 'rbe2', target: 'debug', sourcePort: 0 });

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
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'switch', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'function', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug', sourcePort: 1 });
      graph.addEdge({ source: 'function', target: 'debug', sourcePort: 0 });
      graph.addEdge({ source: 'function', target: 'debug', sourcePort: 1 });

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
      graph.addNode({ id: 'switch1', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'func1', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'trigger1', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'rbe1', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      // Switch with 2 outputs
      graph.addEdge({ source: 'switch1', target: 'func1', sourcePort: 0 });
      graph.addEdge({ source: 'switch1', target: 'debug1', sourcePort: 1 });
      // Function with 2 outputs
      graph.addEdge({ source: 'func1', target: 'trigger1', sourcePort: 0 });
      graph.addEdge({ source: 'func1', target: 'debug1', sourcePort: 1 });
      // Trigger
      graph.addEdge({ source: 'trigger1', target: 'rbe1', sourcePort: 0 });
      // Filter
      graph.addEdge({ source: 'rbe1', target: 'debug1', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(6);
    });

    it('should handle combination of linear and branching nodes', () => {
      // Switch with 1 output (linear): contribute 1
      // Switch with 2 outputs (branching): contribute 2
      // Function with 1 output (linear): contribute 0
      // Function with 2 outputs (branching): contribute 1
      // Trigger (always 2 branches): contribute 1
      // CC = 1 + 1 + 2 + 0 + 1 + 1 = 6
      const graph = new GraphModel();
      graph.addNode({ id: 'switch1', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'switch2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function1', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'trigger', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      // switch1: 1 output
      graph.addEdge({ source: 'switch1', target: 'switch2', sourcePort: 0 });
      // switch2: 2 outputs
      graph.addEdge({ source: 'switch2', target: 'function1', sourcePort: 0 });
      graph.addEdge({ source: 'switch2', target: 'function2', sourcePort: 1 });
      // function1: 1 output
      graph.addEdge({ source: 'function1', target: 'trigger', sourcePort: 0 });
      // function2: 2 outputs
      graph.addEdge({ source: 'function2', target: 'trigger', sourcePort: 0 });
      graph.addEdge({ source: 'function2', target: 'debug', sourcePort: 1 });
      // trigger: 1 output
      graph.addEdge({ source: 'trigger', target: 'debug', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(6);
    });
  });

  describe('cycles', () => {
    it('should handle simple cycle', () => {
      // Simple cycle: inject -> function1 -> function2 -> function1 (back edge)
      // For CC, cycles don't change the formula: CC = 1 + sum(branches)
      // No decision nodes, so CC = 1
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function1', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function2', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'function1', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'function2', sourcePort: 0 });
      graph.addEdge({ source: 'function2', target: 'function1', sourcePort: 0 }); // Back edge creates cycle

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
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'switch', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'function', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug', sourcePort: 1 });
      graph.addEdge({ source: 'function', target: 'switch', sourcePort: 0 }); // Back edge creates cycle

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });

    it('should handle self-loop', () => {
      // Self-loop: node points to itself
      // No decision nodes, so CC = 1
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'function', sourcePort: 0 });
      graph.addEdge({ source: 'function', target: 'function', sourcePort: 0 }); // Self-loop

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
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'switch', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'switch', sourcePort: 0 }); // Self-loop
      graph.addEdge({ source: 'switch', target: 'debug', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });
  });

  describe('multiple entry nodes', () => {
    it('should not change complexity when multiple entry nodes lead to same flow', () => {
      // Two inject nodes both leading to the same switch
      // Complexity should be based on the flow structure, not the number of entry points
      // inject1 → switch → debug
      // inject2 → switch (same switch)
      // CC = 1 + 2 = 3 (switch has 2 outputs)
      const graph = new GraphModel();
      graph.addNode({ id: 'inject1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'inject2', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject1', target: 'switch', sourcePort: 0 });
      graph.addEdge({ source: 'inject2', target: 'switch', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug2', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });
  });

  describe('edge cases: multiple ports to same target', () => {
    it('should handle exec node with multiple output ports all targeting same node', () => {
      // Node with 3 output ports, all connecting to the same target
      // Structure: inject -> exec(3 ports) -> debug
      //
      // Exec node has 3 output ports (stdout, stderr, return code)
      // Marked as a decision node (isDecisionNode: true)
      // Expected: CC = 1 + (3 - 1) = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'exec', type: 'exec', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'exec', sourcePort: 0 });
      // Three different output ports, all targeting the same node
      graph.addEdge({ source: 'exec', target: 'debug', sourcePort: 0 });
      graph.addEdge({ source: 'exec', target: 'debug', sourcePort: 1 });
      graph.addEdge({ source: 'exec', target: 'debug', sourcePort: 2 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      // Expected: 3 (1 + 2 branches)
      expect(result.value).toBe(3);
    });

    it('should handle switch with 3 outputs where one path loops back', () => {
      // Edge case: Switch with 3 outputs, where one output creates a loop
      // Structure:
      // inject -> switch (3 outputs + implicit catch-all)
      //   port 0 -> debug1 (direct exit)
      //   port 1 -> function -> switch (loop back)
      //   port 2 -> debug2 (direct exit)
      //
      // Decision nodes:
      // - switch: 3 outputs -> contributes 3 (switch uses out(n) - 0 formula)
      // Expected: CC = 1 + 3 = 4
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'switch', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug1', sourcePort: 0 }); // port0 -> debug1
      graph.addEdge({ source: 'switch', target: 'function', sourcePort: 1 }); // port1 -> function (loop)
      graph.addEdge({ source: 'switch', target: 'debug2', sourcePort: 2 }); // port2 -> debug2
      graph.addEdge({ source: 'function', target: 'switch', sourcePort: 0 }); // loop back to switch

      const component = createComponent(graph);
      const result = metric.compute(component);

      // Expected: 4 (1 + 3 for switch with 3 outputs)
      expect(result.value).toBe(4);
    });

    it('should handle two switches in sequence with one path looping back', () => {
      // Two switches where the first loops back, second is in direct path
      // Structure:
      // inject -> function -> switch1 (2 outputs)
      //   port0 -> switch2 (2 outputs)
      //     port0 -> debug1
      //     port1 -> debug2
      //   port1 -> function (loops back)
      //
      // Decision nodes:
      // - switch1: 2 outputs -> contributes 2
      // - switch2: 2 outputs -> contributes 2
      // Expected: CC = 1 + 2 + 2 = 5
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch1', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'switch2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'function', sourcePort: 0 }); // inject -> function
      graph.addEdge({ source: 'function', target: 'switch1', sourcePort: 0 }); // function -> switch1
      graph.addEdge({ source: 'switch1', target: 'switch2', sourcePort: 0 }); // switch1 port0 -> switch2
      graph.addEdge({ source: 'switch1', target: 'function', sourcePort: 1 }); // switch1 port1 -> function (loop)
      graph.addEdge({ source: 'switch2', target: 'debug1', sourcePort: 0 }); // switch2 port0 -> debug1
      graph.addEdge({ source: 'switch2', target: 'debug2', sourcePort: 1 }); // switch2 port1 -> debug2

      const component = createComponent(graph);
      const result = metric.compute(component);

      // Expected: 5 (1 + 2 + 2)
      expect(result.value).toBe(5);
    });

    it('should handle nested decision nodes with loop from second level (flows5)', () => {
      // Based on flows(5).json
      // Structure:
      // inject -> function1 (2 outputs) -> function2 (2 outputs, loops back) + function3 (2 outputs)
      //
      // Decision nodes:
      // - function1: 2 outputs = 1 branch
      // - function2: 2 outputs = 1 branch
      // - function3: 2 outputs = 1 branch
      // CC = 1 + 1 + 1 + 1 = 4
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function1', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function3', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'function1', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'function2', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'function3', sourcePort: 1 });
      graph.addEdge({ source: 'function2', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'function2', target: 'function1', sourcePort: 1 }); // LOOP back
      graph.addEdge({ source: 'function3', target: 'debug2', sourcePort: 0 });
      graph.addEdge({ source: 'function3', target: 'debug3', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(4);
    });
  });

  describe('multicast with branching inside broadcast', () => {
    it('should count all decision nodes regardless of multicast', () => {
      // Switch multicasts on port0 to [function1, function2], both have 2 outputs
      // For CC: multicast doesn't affect counting, we just count decision points
      //
      // Structure:
      // inject -> switch (port0: multicast [function1, function2], port1: debug1)
      //           function1 (2 outputs) -> debug2, debug3
      //           function2 (2 outputs) -> debug4, debug5
      //
      // Decision nodes:
      // - switch: 2 outputs -> contributes 2 (out(n) - 0)
      // - function1: 2 outputs -> contributes 1 (out(n) - 1)
      // - function2: 2 outputs -> contributes 1 (out(n) - 1)
      // CC = 1 + 2 + 1 + 1 = 5
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function1', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'switch', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'function1', sourcePort: 0 }); // Multicast start
      graph.addEdge({ source: 'switch', target: 'function2', sourcePort: 0 }); // Multicast (same port)
      graph.addEdge({ source: 'switch', target: 'debug1', sourcePort: 1 }); // Different port
      graph.addEdge({ source: 'function1', target: 'debug2', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'debug3', sourcePort: 1 });
      graph.addEdge({ source: 'function2', target: 'debug4', sourcePort: 0 });
      graph.addEdge({ source: 'function2', target: 'debug5', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(6);

      const details = result.metadata?.details as any;
      expect(details?.decisionNodeCount).toBe(3); // switch, function1, function2
    });

    it('should count three-way multicast with branching', () => {
      // Multicast to 3 functions, each with 2 outputs
      // inject -> function1 (multicast to [function2, function3, function4])
      //           function2, function3, function4 each have 2 outputs
      //
      // Decision nodes: function2, function3, function4 (each contributes 1)
      // CC = 1 + 1 + 1 + 1 = 4
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function1', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function3', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function4', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug6', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'function1', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'function2', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'function3', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'function4', sourcePort: 0 });
      graph.addEdge({ source: 'function2', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'function2', target: 'debug2', sourcePort: 1 });
      graph.addEdge({ source: 'function3', target: 'debug3', sourcePort: 0 });
      graph.addEdge({ source: 'function3', target: 'debug4', sourcePort: 1 });
      graph.addEdge({ source: 'function4', target: 'debug5', sourcePort: 0 });
      graph.addEdge({ source: 'function4', target: 'debug6', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(6);

      const details = result.metadata?.details as any;
      expect(details?.decisionNodeCount).toBe(3); // function2, function3, function4
    });

    it('should handle multicast with mix of branching and non-branching targets', () => {
      // Function multicasts to [function (2 outputs), debug, debug]
      // Only the function with 2 outputs is a decision node
      // inject -> function1 (multicast to [function2, debug1, debug2])
      //           function2 has 2 outputs
      //
      // Decision nodes: function2 (contributes 1)
      // CC = 1 + 1 = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function1', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'function1', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'function2', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'debug2', sourcePort: 0 });
      graph.addEdge({ source: 'function2', target: 'debug3', sourcePort: 0 });
      graph.addEdge({ source: 'function2', target: 'debug4', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(4);

      const details = result.metadata?.details as any;
      expect(details?.decisionNodeCount).toBe(1); // function2 only
    });

    it('should handle nested multicast with branching', () => {
      // Switch multicasts to [function1, function2], then function1 multicasts to [function3, function4]
      // All functions have 2 outputs
      // inject -> switch (multicast to [function1, function2])
      //           function1 (multicast to [function3, function4])
      //           function2 (2 outputs)
      //           function3 (2 outputs)
      //           function4 (2 outputs)
      //
      // Decision nodes:
      // - switch: 2 outputs -> contributes 2
      // - function2: 2 outputs -> contributes 1
      // - function3: 2 outputs -> contributes 1
      // - function4: 2 outputs -> contributes 1
      // CC = 1 + 2 + 1 + 1 + 1 = 6
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function1', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function3', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function4', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug6', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug7', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'switch', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'function1', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'function2', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug7', sourcePort: 1 });
      graph.addEdge({ source: 'function1', target: 'function3', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'function4', sourcePort: 0 });
      graph.addEdge({ source: 'function2', target: 'debug5', sourcePort: 0 });
      graph.addEdge({ source: 'function2', target: 'debug6', sourcePort: 1 });
      graph.addEdge({ source: 'function3', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'function3', target: 'debug2', sourcePort: 1 });
      graph.addEdge({ source: 'function4', target: 'debug3', sourcePort: 0 });
      graph.addEdge({ source: 'function4', target: 'debug4', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(8);

      const details = result.metadata?.details as any;
      expect(details?.decisionNodeCount).toBe(4); // switch, function2, function3, function4
    });

    it('should handle loop from inside multicast back to before multicast', () => {
      // Switch multicasts to [function1, function2], function1 loops back to switch
      // For CC: cycles don't affect counting, just count decision nodes
      //
      // Structure:
      // inject -> switch (port0: multicast [function1, function2], port1: exit)
      //           function1: port0 -> loops back to switch
      //                      port1 -> debug1
      //           function2: port0 -> debug2
      //                      port1 -> debug3
      //
      // Decision nodes:
      // - switch: 2 outputs -> contributes 2
      // - function1: 2 outputs -> contributes 1
      // - function2: 2 outputs -> contributes 1
      // CC = 1 + 2 + 1 + 1 = 5
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function1', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'switch', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'function1', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'function2', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug4', sourcePort: 1 });
      graph.addEdge({ source: 'function1', target: 'switch', sourcePort: 0 }); // LOOP
      graph.addEdge({ source: 'function1', target: 'debug1', sourcePort: 1 });
      graph.addEdge({ source: 'function2', target: 'debug2', sourcePort: 0 });
      graph.addEdge({ source: 'function2', target: 'debug3', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(6);

      const details = result.metadata?.details as any;
      expect(details?.decisionNodeCount).toBe(3); // switch, function1, function2
    });
  });
});

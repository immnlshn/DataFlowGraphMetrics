/**
 * NPathComplexityMetric Tests
 */

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

  describe('baseline: no decision nodes', () => {
    it('should return 1 for linear flow with no decision nodes', () => {
      // Linear flow: inject -> function -> debug
      // No branching, single execution path
      // NPATH = 1
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

    it('should count multicast as multiple paths', () => {
      // Multicast flow: inject -> function -> [debug1, debug2] (same port)
      // Each target is a separate path
      // NPATH = 2 (path to debug1, path to debug2)
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

    it('should return 0 for empty graph', () => {
      // Empty graph has no execution paths
      const graph = new GraphModel();
      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(0);
    });
  });

  describe('switch node: implicit default (drop) behavior', () => {
    it('should count switch with 1 output as 2 paths', () => {
      // Switch with 1 explicit output has implicit default that drops message
      // Path 1: inject -> switch -> debug (message passes to port 0)
      // Path 2: inject -> switch -> DROP (default behavior, message dropped)
      // NPATH = 2
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

    it('should count switch with 1 output multicast as 3 paths', () => {
      // Switch with 1 output multicasting to multiple targets
      // Multicast creates separate paths, plus implicit drop
      // Path 1: inject -> switch -> debug1 (port 0)
      // Path 2: inject -> switch -> debug2 (port 0, multicast)
      // Path 3: inject -> switch -> DROP (default)
      // NPATH = 3
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

    it('should count switch with 2 outputs as 3 paths', () => {
      // Switch with 2 explicit outputs plus implicit drop
      // Path 1: inject -> switch -> debug1 (port 0)
      // Path 2: inject -> switch -> debug2 (port 1)
      // Path 3: inject -> switch -> DROP (default)
      // NPATH = 3
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

    it('should count switch with 2 outputs and multicast on one port as 4 paths', () => {
      // Switch with 2 outputs, port 0 multicasts to 2 targets, plus implicit drop
      // Path 1: inject -> switch -> debug1 (port 0)
      // Path 2: inject -> switch -> debug2 (port 0, multicast)
      // Path 3: inject -> switch -> debug3 (port 1)
      // Path 4: inject -> switch -> DROP (default)
      // NPATH = 4
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'switch', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug2', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug3', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(4);
    });

    it('should count paths through multiple switch nodes correctly', () => {
      // Two switches in sequence: first with 2 outputs, one leads to second switch with 1 output
      // Path 1: inject -> switch1(port0) -> switch2(port0) -> debug
      // Path 2: inject -> switch1(port0) -> switch2(catch-all) -> STOP
      // Path 3: inject -> switch1(port1) -> debug
      // Path 4: inject -> switch1(catch-all) -> STOP
      // NPATH = 4
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch1', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'switch2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'switch1', sourcePort: 0 });
      graph.addEdge({ source: 'switch1', target: 'switch2', sourcePort: 0 });
      graph.addEdge({ source: 'switch1', target: 'debug', sourcePort: 1 });
      graph.addEdge({ source: 'switch2', target: 'debug', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(4);
    });

    it('should handle paths through three switch nodes', () => {
      // Three switches in sequence, each multicasting both outputs to the next switch
      // Structure: inject -> switch1 -> switch2 -> switch3 -> debug
      // Each switch has 2 output ports going to same target (multicast) + implicit drop
      //
      // Calculation (switches multiply, but multicast is additive within each switch):
      // - switch1: 2 non-drop paths + 1 drop = 3 outcomes
      // - For each of 2 non-drop paths from switch1, switch2 adds: 2 + 1 drop = 3
      //   So: 2*3 + 1 drop from switch1 = 7 paths after switch2
      // - For each of 4 non-drop paths, switch3 adds: 2 + 1 drop = 3
      //   So: 4*3 + 3 drops from earlier = 15 paths
      // NPATH = 15
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch1', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'switch2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'switch3', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'switch1', sourcePort: 0 });
      graph.addEdge({ source: 'switch1', target: 'switch2', sourcePort: 0 });
      graph.addEdge({ source: 'switch1', target: 'switch2', sourcePort: 1 });
      graph.addEdge({ source: 'switch2', target: 'switch3', sourcePort: 0 });
      graph.addEdge({ source: 'switch2', target: 'switch3', sourcePort: 1 });
      graph.addEdge({ source: 'switch3', target: 'debug', sourcePort: 0 });
      graph.addEdge({ source: 'switch3', target: 'debug', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(15);
    });
  });

  describe('function node: standard path counting', () => {
    it('should count function with 1 output as 1 path', () => {
      // Function with 1 output is linear (not a decision)
      // NPATH = 1
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

    it('should count function with 1 output multicast as 2 paths', () => {
      // Function with 1 output multicasting to 2 targets
      // Multicast creates separate paths
      // Path 1: inject -> function -> debug1
      // Path 2: inject -> function -> debug2
      // NPATH = 2
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

    it('should count function with 2 outputs as 2 paths', () => {
      // Function with 2 outputs (decision node)
      // Path 1: inject -> function -> debug1 (port 0)
      // Path 2: inject -> function -> debug2 (port 1)
      // NPATH = 2
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

    it('should count function with 2 outputs and multicast on one port as 3 paths', () => {
      // Function with 2 outputs, port 0 multicasts to 2 targets
      // Multicast creates separate paths
      // Path 1: inject -> function -> debug1 (port 0)
      // Path 2: inject -> function -> debug2 (port 0, multicast)
      // Path 3: inject -> function -> debug3 (port 1)
      // NPATH = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'function', sourcePort: 0 });
      graph.addEdge({ source: 'function', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'function', target: 'debug2', sourcePort: 0 });
      graph.addEdge({ source: 'function', target: 'debug3', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });

    it('should count paths through multiple function nodes correctly', () => {
      // Two functions in sequence: first with 2 outputs, one leads to second function with 1 output
      // Path 1: inject -> function1(port0) -> function2(port0) -> debug
      // Path 2: inject -> function1(port1) -> debug
      // NPATH = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function1', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'function1', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'function2', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'debug', sourcePort: 1 });
      graph.addEdge({ source: 'function2', target: 'debug', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should handle paths through three function nodes', () => {
      // Three functions in sequence, each multicasting both outputs to the next function
      // Structure: inject -> function1 -> function2 -> function3 -> debug
      // Each function has 2 output ports going to same target (multicast)
      // function1: 2 outputs -> function2
      // function2: 2 outputs -> function3 (2 × 2 = 4 path combinations)
      // function3: 2 outputs -> debug (4 × 2 = 8 path combinations)
      // NPATH = 8
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function1', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function3', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'function1', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'function2', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'function2', sourcePort: 1 });
      graph.addEdge({ source: 'function2', target: 'function3', sourcePort: 0 });
      graph.addEdge({ source: 'function2', target: 'function3', sourcePort: 1 });
      graph.addEdge({ source: 'function3', target: 'debug', sourcePort: 0 });
      graph.addEdge({ source: 'function3', target: 'debug', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(8);
    });
  });

  describe('trigger node: always 2 paths (pass or block)', () => {
    it('should count trigger with 1 output as 2 paths', () => {
      // Trigger always has 2 paths: pass or block
      // Path 1: inject -> trigger -> debug (pass)
      // Path 2: inject -> trigger -> STOP (block)
      // NPATH = 2
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

    it('should count trigger with multicast as 3 paths', () => {
      // Trigger with multicast output
      // Path 1: inject -> trigger -> debug1 (pass)
      // Path 2: inject -> trigger -> debug2 (pass, multicast)
      // Path 3: inject -> trigger -> STOP (block)
      // NPATH = 3
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

    it('should count paths through multiple trigger nodes correctly', () => {
      // Two triggers in sequence
      // Path 1: inject -> trigger1(pass) -> trigger2(pass) -> debug
      // Path 2: inject -> trigger1(pass) -> trigger2(block) -> STOP
      // Path 3: inject -> trigger1(block) -> STOP
      // NPATH = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'trigger1', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'trigger2', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'trigger1', sourcePort: 0 });
      graph.addEdge({ source: 'trigger1', target: 'trigger2', sourcePort: 0 });
      graph.addEdge({ source: 'trigger2', target: 'debug', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });

    it('should count paths through three trigger nodes', () => {
      // Three triggers in sequence
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'trigger1', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'trigger2', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'trigger3', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'trigger1', sourcePort: 0 });
      graph.addEdge({ source: 'trigger1', target: 'trigger2', sourcePort: 0 });
      graph.addEdge({ source: 'trigger2', target: 'trigger3', sourcePort: 0 });
      graph.addEdge({ source: 'trigger3', target: 'debug', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(4);
    });
  });

  describe('Filter node: always 2 paths (pass or block)', () => {
    it('should count filter with 1 output as 2 paths', () => {
      // Filter (RBE) always has 2 paths: pass or block
      // Path 1: inject -> rbe -> debug (pass)
      // Path 2: inject -> rbe -> STOP (block)
      // NPATH = 2
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

    it('should count filter with multicast as 3 paths', () => {
      // filter with multicast output
      // Path 1: inject -> rbe -> debug1 (pass)
      // Path 2: inject -> rbe -> debug2 (pass, multicast)
      // Path 3: inject -> rbe -> STOP (block)
      // NPATH = 3
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

    it('should count paths through multiple RBE nodes correctly', () => {
      // Two RBE nodes in sequence
      // Path 1: inject -> rbe1(pass) -> rbe2(pass) -> debug
      // Path 2: inject -> rbe1(pass) -> rbe2(block) -> STOP
      // Path 3: inject -> rbe1(block) -> STOP
      // NPATH = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'rbe1', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'rbe2', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'rbe1', sourcePort: 0 });
      graph.addEdge({ source: 'rbe1', target: 'rbe2', sourcePort: 0 });
      graph.addEdge({ source: 'rbe2', target: 'debug', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });

    it('should count paths through three RBE nodes', () => {
      // Three RBE nodes in sequence
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'rbe1', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'rbe2', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'rbe3', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'rbe1', sourcePort: 0 });
      graph.addEdge({ source: 'rbe1', target: 'rbe2', sourcePort: 0 });
      graph.addEdge({ source: 'rbe2', target: 'rbe3', sourcePort: 0 });
      graph.addEdge({ source: 'rbe3', target: 'debug', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(4);
    });
  });

  describe('mixed node types', () => {
    it('should correctly compute paths with switch and function nodes', () => {
      // Switch (2 outputs) -> one path has function (2 outputs)
      // Path 1: inject -> switch(port0) -> function(port0) -> debug
      // Path 2: inject -> switch(port0) -> function(port1) -> debug
      // Path 3: inject -> switch(port1) -> debug
      // Path 4: inject -> switch(catch-all) -> STOP
      // NPATH = 4
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

    it('should correctly compute paths with all decision node types', () => {
      // switch -> trigger -> rbe -> function
      // Enumerating all paths through decision points:
      // Path 1: inject -> switch(port0) -> trigger(pass) -> rbe(pass) -> function(port0) -> debug
      // Path 2: inject -> switch(port0) -> trigger(pass) -> rbe(pass) -> function(port1) -> debug
      // Path 3: inject -> switch(port0) -> trigger(pass) -> rbe(block) -> STOP
      // Path 4: inject -> switch(port0) -> trigger(block) -> STOP
      // Path 5: inject -> switch(catch-all) -> STOP
      // NPATH = 5
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'trigger', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'rbe', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'switch', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'trigger', sourcePort: 0 });
      graph.addEdge({ source: 'trigger', target: 'rbe', sourcePort: 0 });
      graph.addEdge({ source: 'rbe', target: 'function', sourcePort: 0 });
      graph.addEdge({ source: 'function', target: 'debug', sourcePort: 0 });
      graph.addEdge({ source: 'function', target: 'debug', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(5);
    });
  });

  describe('cycles', () => {
    it('should handle simple cycle with no exit', () => {
      // Simple cycle: inject -> function1 -> function2 -> function1 (back edge)
      // No terminal nodes (cycle has no exit)
      // Baseline: 1 path (graph is not empty)
      // NPATH = 1
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

    it('should handle cycle with decision nodes and exit path', () => {
      // Cycle with switch: inject -> switch -> function -> switch (back edge)
      // Switch has 2 outputs: port0 loops back via function, port1 exits to debug
      // With new understanding:
      // - Loop is counted once (not recursively)
      // - Switch has implicit drop (+1)
      // Paths:
      // 1. switch(port0) -> function -> [loop back, counted once] -> switch(port1) -> debug
      // 2. switch(port1) -> debug (direct exit)
      // 3. switch(DROP) -> STOP (implicit default)
      // NPATH = 3
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
  });

  describe('multiple entry nodes', () => {
    it('should not multiply complexity when multiple entry nodes lead to same flow', () => {
      // Two inject nodes both leading to the same switch
      // Complexity should be based on the flow structure, not the number of entry points
      // inject1 → switch → debug
      // inject2 → switch (same switch)
      // NPATH = 3 (switch: 2 outputs + catch-all), not 6
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
      // Not marked as a decision node (isDecisionNode: false)
      // With new understanding: multicast creates separate paths
      // Even though it's not a decision node, 3 different ports to same target = 3 paths
      // Expected: NPATH = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'exec', type: 'exec', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'exec', sourcePort: 0 });
      // Three different output ports, all targeting the same node
      graph.addEdge({ source: 'exec', target: 'debug', sourcePort: 0 });
      graph.addEdge({ source: 'exec', target: 'debug', sourcePort: 1 });
      graph.addEdge({ source: 'exec', target: 'debug', sourcePort: 2 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      // Expected: 3 (3 different ports = 3 paths)
      expect(result.value).toBe(3);
    });

    it('should handle switch with 3 outputs where one path loops back', () => {
      // Structure:
      // inject -> switch (3 outputs + implicit drop)
      //           port0 -> debug1
      //           port1 -> function -> switch (LOOP)
      //           port2 -> debug2
      //
      // Paths (loop counted as terminal):
      // 1. switch(port0) -> debug1
      // 2. switch(port1) -> function -> LOOP (counted as terminal path)
      // 3. switch(port2) -> debug2
      // 4. switch(catch-all) -> STOP
      // NPATH = 4
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

      // Expected: 4 paths
      expect(result.value).toBe(4);
    });

    it('should handle two switches in sequence with one path looping back', () => {
      // Structure:
      // inject -> function -> switch1 (2 outputs + drop)
      //                       port0 -> switch2 (2 outputs + drop)
      //                                  port0 -> debug1
      //                                  port1 -> debug2
      //                       port1 -> function (LOOP)
      //
      // Paths (loop counted as terminal):
      // 1. switch1(port0) -> switch2(port0) -> debug1
      // 2. switch1(port0) -> switch2(port1) -> debug2
      // 3. switch1(port0) -> switch2(catch-all) -> STOP
      // 4. switch1(port1) -> function -> LOOP (counted as terminal path)
      // 5. switch1(catch-all) -> STOP
      // NPATH = 5
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch1', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} }); // switch1
      graph.addNode({ id: 'switch2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} }); // switch2
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} }); // debug1
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} }); // debug2

      graph.addEdge({ source: 'inject', target: 'function', sourcePort: 0 }); // inject -> function
      graph.addEdge({ source: 'function', target: 'switch1', sourcePort: 0 }); // function -> switch1
      graph.addEdge({ source: 'switch1', target: 'switch2', sourcePort: 0 }); // switch1 port0 -> switch2
      graph.addEdge({ source: 'switch1', target: 'function', sourcePort: 1 }); // switch1 port1 -> function (loop)
      graph.addEdge({ source: 'switch2', target: 'debug1', sourcePort: 0 }); // switch2 port0 -> debug1
      graph.addEdge({ source: 'switch2', target: 'debug2', sourcePort: 1 }); // switch2 port1 -> debug2

      const component = createComponent(graph);
      const result = metric.compute(component);

      // Expected: 5 paths
      expect(result.value).toBe(5);
    });

    it('should handle nested decision nodes with loop from second level', () => {
      // Structure:
      // inject -> function1 (2 outputs, decision)
      //             port0 -> function2 (2 outputs, decision)
      //                        port0 -> debug1
      //                        port1 -> function1 (LOOP!)
      //             port1 -> function3 (2 outputs, decision)
      //                        port0 -> debug2
      //                        port1 -> debug3
      //
      // Path enumeration (loop counted once):
      //   1. function1(port0) -> function2(port0) -> debug1
      //   2. function1(port0) -> function2(port1) -> LOOP (counted as terminal path)
      //   3. function1(port1) -> function3(port0) -> debug2
      //   4. function1(port1) -> function3(port1) -> debug3
      // NPATH = 4
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
    it('should add paths from independent multicast targets', () => {
      // Switch multicasts on port0 to [function1, function2], both have 2 outputs
      // Key: multicast is ADDITIVE - paths from parallel branches are added
      //
      // Structure:
      // inject -> switch (port0: multicast [function1, function2], port1: debug1)
      //           function1 (2 outputs) -> debug2, debug3
      //           function2 (2 outputs) -> debug4, debug5
      //
      // Paths (multicast is additive):
      // From port0: function1 contributes 2 paths + function2 contributes 2 paths = 4
      // From port1: 1 path
      // From catch-all: 1 path
      // NPATH = 4 + 1 + 1 = 6
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
    });

    it('should handle three-way multicast with branching', () => {
      // Multicast to 3 functions, each with 2 outputs
      // inject -> function1 (multicast to [function2, function3, function4])
      //           function2 (2 outputs) -> debug1, debug2
      //           function3 (2 outputs) -> debug3, debug4
      //           function4 (2 outputs) -> debug5, debug6
      // Multicast is additive: 2 + 2 + 2 = 6 paths
      // NPATH = 6
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
      // Multicast to 3 functions
      graph.addEdge({ source: 'function1', target: 'function2', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'function3', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'function4', sourcePort: 0 });
      // Each function has 2 outputs
      graph.addEdge({ source: 'function2', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'function2', target: 'debug2', sourcePort: 1 });
      graph.addEdge({ source: 'function3', target: 'debug3', sourcePort: 0 });
      graph.addEdge({ source: 'function3', target: 'debug4', sourcePort: 1 });
      graph.addEdge({ source: 'function4', target: 'debug5', sourcePort: 0 });
      graph.addEdge({ source: 'function4', target: 'debug6', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(6);
    });

    it('should handle multicast with mix of branching and non-branching targets', () => {
      // Function multicasts to [function (2 outputs), debug, debug]
      // inject -> function1 (multicast to [function2, debug1, debug2])
      //           function2 (2 outputs) -> debug3, debug4
      //           debug1, debug2 are terminal (1 path each)
      // Multicast is additive: 2 (from function2) + 1 (debug1) + 1 (debug2) = 4
      // NPATH = 4
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function1', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'function2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'function1', sourcePort: 0 });
      // Multicast to 3 targets
      graph.addEdge({ source: 'function1', target: 'function2', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'debug2', sourcePort: 0 });
      // Only function2 branches
      graph.addEdge({ source: 'function2', target: 'debug3', sourcePort: 0 });
      graph.addEdge({ source: 'function2', target: 'debug4', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(4);
    });

    it('should handle nested multicast with branching', () => {
      // Switch multicasts to [function1, function2], then function1 multicasts to [function3, function4]
      // inject -> switch (port0: multicast [function1, function2], port1: debug7)
      //           function1 (multicast to [function3, function4])
      //             function3 (2 outputs) -> debug1, debug2
      //             function4 (2 outputs) -> debug3, debug4
      //           function2 (2 outputs) -> debug5, debug6
      // Multicast is additive at each level:
      // - function1's multicast: 2 (function3) + 2 (function4) = 4
      // - port0's multicast: 4 (function1) + 2 (function2) = 6
      // - port1: 1
      // - drop: 1
      // NPATH = 6 + 1 + 1 = 8
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
      // Switch multicast on port0
      graph.addEdge({ source: 'switch', target: 'function1', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'function2', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug7', sourcePort: 1 });
      // function1 multicasts to function3, function4
      graph.addEdge({ source: 'function1', target: 'function3', sourcePort: 0 });
      graph.addEdge({ source: 'function1', target: 'function4', sourcePort: 0 });
      // function2 has 2 outputs
      graph.addEdge({ source: 'function2', target: 'debug5', sourcePort: 0 });
      graph.addEdge({ source: 'function2', target: 'debug6', sourcePort: 1 });
      // function3 has 2 outputs
      graph.addEdge({ source: 'function3', target: 'debug1', sourcePort: 0 });
      graph.addEdge({ source: 'function3', target: 'debug2', sourcePort: 1 });
      // function4 has 2 outputs
      graph.addEdge({ source: 'function4', target: 'debug3', sourcePort: 0 });
      graph.addEdge({ source: 'function4', target: 'debug4', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(8);
    });

    it('should handle loop from inside multicast back to before multicast', () => {
      // Switch multicasts to [function1, function2], function1 loops back to switch
      //
      // Structure:
      // inject -> switch (port0: multicast [function1, function2], port1: debug4)
      //           function1: port0 -> loops back to switch
      //                      port1 -> debug1
      //           function2: port0 -> debug2
      //                      port1 -> debug3
      //
      // Paths (loop counted as terminal path):
      //   1. switch(port0) -> function1(port0)->LOOP AND function2(port0)->debug2
      //   2. switch(port0) -> function1(port0)->LOOP AND function2(port1)->debug3
      //   3. switch(port0) -> function1(port1)->debug1 AND function2(port0)->debug2
      //   4. switch(port0) -> function1(port1)->debug1 AND function2(port1)->debug3
      //   5. switch(port1) -> debug4
      //   6. switch(catch-all) -> STOP
      // NPATH = 6
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'switch', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function1', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'function2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} }); // exit terminal

      graph.addEdge({ source: 'inject', target: 'switch', sourcePort: 0 });
      // Switch multicast on port0
      graph.addEdge({ source: 'switch', target: 'function1', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'function2', sourcePort: 0 });
      graph.addEdge({ source: 'switch', target: 'debug4', sourcePort: 1 }); // Direct exit
      // function1 has loop on port0, exit on port1
      graph.addEdge({ source: 'function1', target: 'switch', sourcePort: 0 }); // LOOP back to switch
      graph.addEdge({ source: 'function1', target: 'debug1', sourcePort: 1 });
      // function2 has two branches
      graph.addEdge({ source: 'function2', target: 'debug2', sourcePort: 0 });
      graph.addEdge({ source: 'function2', target: 'debug3', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(6);
    });
  });
});

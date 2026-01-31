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
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(1);
    });

    it('should return 1 for multicast with no decision nodes', () => {
      // Multicast flow: inject -> function -> debug/debug (same port)
      // Multicast doesn't create multiple execution paths
      // NPATH = 1
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

    it('should return 0 for empty graph', () => {
      // Empty graph has no execution paths
      const graph = new GraphModel();
      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(0);
    });
  });

  describe('switch node: implicit catch-all termination', () => {
    it('should count switch with 1 output as 2 paths', () => {
      // Switch with 1 explicit output has implicit catch-all that terminates
      // Path 1: inject -> switch -> debug (explicit)
      // Path 2: inject -> switch -> STOP (catch-all)
      // NPATH = 2
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

    it('should count switch with 1 output multicast same as linear', () => {
      // Switch with 1 output multicasting to multiple targets
      // Multicast doesn't create additional paths
      // Path 1: inject -> switch -> debug1/debug2 (explicit, multicast)
      // Path 2: inject -> switch -> STOP (catch-all)
      // NPATH = 2
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

    it('should count switch with 2 outputs as 3 paths', () => {
      // Switch with 2 explicit outputs + implicit catch-all
      // Path 1: inject -> switch -> debug1 (port 0)
      // Path 2: inject -> switch -> debug2 (port 1)
      // Path 3: inject -> switch -> STOP (catch-all)
      // NPATH = 3
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
      // Switch with 2 outputs, port 0 multicasts
      // Port 0 multicast doesn't add paths
      // Path 1: inject -> switch -> debug1/debug2 (port 0, multicast)
      // Path 2: inject -> switch -> debug3 (port 1)
      // Path 3: inject -> switch -> STOP (catch-all)
      // NPATH = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n5', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });

    it('should count paths through multiple switch nodes correctly', () => {
      // Two switches in sequence: first with 2 outputs, one leads to second switch with 1 output
      // Path 1: inject -> switch1(port0) -> switch2(port0) -> debug
      // Path 2: inject -> switch1(port0) -> switch2(catch-all) -> STOP
      // Path 3: inject -> switch1(port1) -> debug
      // Path 4: inject -> switch1(catch-all) -> STOP
      // NPATH = 4
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 1 });
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(4);
    });

    it('should handle paths through three switch nodes', () => {
      // Three switches in sequence, each with 2 outputs
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n4', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 1 });
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 1 });
      graph.addEdge({ source: 'n4', target: 'n5', sourcePort: 0 });
      graph.addEdge({ source: 'n4', target: 'n5', sourcePort: 1 });

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
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(1);
    });

    it('should count function with 1 output multicast same as linear', () => {
      // Function with 1 output multicasting
      // Multicast doesn't create paths
      // NPATH = 1
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

    it('should count function with 2 outputs as 2 paths', () => {
      // Function with 2 outputs (decision node)
      // Path 1: inject -> function -> debug1 (port 0)
      // Path 2: inject -> function -> debug2 (port 1)
      // NPATH = 2
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
      // Function with 2 outputs, port 0 multicasts
      // Port 0 multicast doesn't add paths
      // Path 1: inject -> function -> debug1/debug2 (port 0, multicast)
      // Path 2: inject -> function -> debug3 (port 1)
      // NPATH = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n5', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should count paths through multiple function nodes correctly', () => {
      // Two functions in sequence: first with 2 outputs, one leads to second function with 1 output
      // Path 1: inject -> func1(port0) -> func2(port0) -> debug
      // Path 2: inject -> func1(port1) -> debug
      // NPATH = 2
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 1 });
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should handle paths through three function nodes', () => {
      // Three functions in sequence, each with 2 outputs
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n4', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 1 });
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 1 });
      graph.addEdge({ source: 'n4', target: 'n5', sourcePort: 0 });
      graph.addEdge({ source: 'n4', target: 'n5', sourcePort: 1 });

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
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should count trigger with multicast same as linear', () => {
      // Trigger with multicast output
      // Path 1: inject -> trigger -> debug1/debug2 (pass, multicast)
      // Path 2: inject -> trigger -> STOP (block)
      // NPATH = 2
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

    it('should count paths through multiple trigger nodes correctly', () => {
      // Two triggers in sequence
      // Path 1: inject -> trigger1(pass) -> trigger2(pass) -> debug
      // Path 2: inject -> trigger1(pass) -> trigger2(block) -> STOP
      // Path 3: inject -> trigger1(block) -> STOP
      // NPATH = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });

    it('should count paths through three trigger nodes', () => {
      // Three triggers in sequence
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n4', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });
      graph.addEdge({ source: 'n4', target: 'n5', sourcePort: 0 });

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
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should count RBE with multicast same as linear', () => {
      // RBE with multicast output
      // Path 1: inject -> rbe -> debug1/debug2 (pass, multicast)
      // Path 2: inject -> rbe -> STOP (block)
      // NPATH = 2
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

    it('should count paths through multiple RBE nodes correctly', () => {
      // Two RBE nodes in sequence
      // Path 1: inject -> rbe1(pass) -> rbe2(pass) -> debug
      // Path 2: inject -> rbe1(pass) -> rbe2(block) -> STOP
      // Path 3: inject -> rbe1(block) -> STOP
      // NPATH = 3
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });

    it('should count paths through three RBE nodes', () => {
      // Three RBE nodes in sequence
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n4', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });
      graph.addEdge({ source: 'n4', target: 'n5', sourcePort: 0 });

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
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'trigger', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n4', type: 'rbe', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n5', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n6', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });
      graph.addEdge({ source: 'n4', target: 'n5', sourcePort: 0 });
      graph.addEdge({ source: 'n5', target: 'n6', sourcePort: 0 });
      graph.addEdge({ source: 'n5', target: 'n6', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(5);
    });
  });

  describe('cycles', () => {
    it('should handle simple cycle with no exit', () => {
      // Simple cycle: n1 -> n2 -> n3 -> n2 (back edge)
      // No terminal nodes (cycle has no exit)
      // NPATH = 1 (infinite loop is counted as single path)
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

    it('should handle cycle with decision nodes and exit path', () => {
      // Cycle with switch: inject -> switch -> function -> switch (back edge)
      // Switch has 2 outputs: port0 loops back via function, port1 exits to debug
      // Paths:
      // 1. inject -> switch(port0) -> function -> switch(port0) -> ... (infinite loop counted as 1)
      // 2. inject -> switch(port0) -> function -> switch(port1) -> debug (exit from within loop)
      // 3. inject -> switch(port1) -> debug (direct exit)
      // 4. inject -> switch(catch-all) -> STOP
      // NPATH = 4
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

      expect(result.value).toBe(4);
    });
  });
});

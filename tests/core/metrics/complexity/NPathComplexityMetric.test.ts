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
      // Baseline: 1 path (graph is not empty)
      // NPATH = 1
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
      // Enumerated paths:
      // 1. switch(port0) -> function -> switch(port1) -> debug (loop then exit)
      // 2. switch(port0) -> function -> switch(catch-all) -> STOP (loop then catch-all)
      // 3. switch(port1) -> debug (direct exit)
      // 4. switch(catch-all) -> STOP (direct)
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

  describe('multiple entry nodes', () => {
    it('should not multiply complexity when multiple entry nodes lead to same flow', () => {
      // Two inject nodes both leading to the same switch
      // Complexity should be based on the flow structure, not the number of entry points
      // inject1 → switch → debug
      // inject2 → switch (same switch)
      // NPATH = 3 (switch: 2 outputs + catch-all), not 6
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n3', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });
      graph.addEdge({ source: 'n3', target: 'n5', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(3);
    });

    it('should not multiply complexity with multiple independent entry points', () => {
      // Two inject nodes leading to independent flows
      // inject1 → switch (3 paths)
      // inject2 → function (1 path)
      // NPATH should be max(3, 1) = 3, not 3 + 1 = 4
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n3', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n6', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n7', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 });
      graph.addEdge({ source: 'n3', target: 'n5', sourcePort: 1 });
      graph.addEdge({ source: 'n2', target: 'n6', sourcePort: 0 });
      graph.addEdge({ source: 'n6', target: 'n7', sourcePort: 0 });

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
      // Expected: NPATH = 1 (no decision node, linear flow)
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'exec', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      // Three different output ports, all targeting the same node
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 1 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 2 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      // Expected: 1 (no decision node)
      expect(result.value).toBe(1);
    });

    it('should handle switch with 3 outputs where one path loops back', () => {
      // Edge case: Switch with 3 outputs, where one output creates a loop
      // Structure:
      // inject -> switch (3 outputs + implicit catch-all)
      //   port 0 -> debug1 (direct exit)
      //   port 1 -> function -> switch (loop back)
      //   port 2 -> debug2 (direct exit)
      //
      // Enumerated paths:
      // 1. switch(port0) -> debug1 (direct)
      // 2. switch(port1) -> function -> switch(port0) -> debug1 (loop then exit port0)
      // 3. switch(port1) -> function -> switch(port2) -> debug2 (loop then exit port2)
      // 4. switch(port1) -> function -> switch(catch-all) -> STOP (loop then catch-all)
      // 5. switch(port2) -> debug2 (direct)
      // 6. switch(catch-all) -> STOP (direct)
      // Expected: NPATH = 6
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 0 }); // port0 -> debug1
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 1 }); // port1 -> function (loop)
      graph.addEdge({ source: 'n2', target: 'n5', sourcePort: 2 }); // port2 -> debug2
      graph.addEdge({ source: 'n3', target: 'n2', sourcePort: 0 }); // loop back to switch

      const component = createComponent(graph);
      const result = metric.compute(component);

      // Expected: 6 paths
      expect(result.value).toBe(6);
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
      // Enumerated paths:
      // 1. switch1(port0) -> switch2(port0) -> debug1
      // 2. switch1(port0) -> switch2(port1) -> debug2
      // 3. switch1(port0) -> switch2(catch-all) -> STOP
      // 4. switch1(port1) -> loop -> switch1(port0) -> switch2(port0) -> debug1
      // 5. switch1(port1) -> loop -> switch1(port0) -> switch2(port1) -> debug2
      // 6. switch1(port1) -> loop -> switch1(port0) -> switch2(catch-all) -> STOP
      // 7. switch1(port1) -> loop -> switch1(catch-all) -> STOP
      // 8. switch1(catch-all) -> STOP
      // Expected: NPATH = 8
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n3', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} }); // switch1
      graph.addNode({ id: 'n4', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} }); // switch2
      graph.addNode({ id: 'n5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} }); // debug1
      graph.addNode({ id: 'n6', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} }); // debug2

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 }); // inject -> function
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 }); // function -> switch1
      graph.addEdge({ source: 'n3', target: 'n4', sourcePort: 0 }); // switch1 port0 -> switch2
      graph.addEdge({ source: 'n3', target: 'n2', sourcePort: 1 }); // switch1 port1 -> function (loop)
      graph.addEdge({ source: 'n4', target: 'n5', sourcePort: 0 }); // switch2 port0 -> debug1
      graph.addEdge({ source: 'n4', target: 'n6', sourcePort: 1 }); // switch2 port1 -> debug2

      const component = createComponent(graph);
      const result = metric.compute(component);

      // Expected: 8 paths
      expect(result.value).toBe(8);
    });

    it('should handle nested decision nodes with loop from second level (flows5)', () => {
      // Based on flows(5).json
      // Structure:
      // inject -> function8 (2 outputs, decision)
      //             port0 -> function21 (2 outputs, decision)
      //                        port0 -> debug21
      //                        port1 -> function8 (LOOP!)
      //             port1 -> function22 (2 outputs, decision)
      //                        port0 -> debug28
      //                        port1 -> debug29
      //
      // Path enumeration:
      // Direct paths (no loop):
      //   1. function8(port0) -> function21(port0) -> debug21
      //   2. function8(port1) -> function22(port0) -> debug28
      //   3. function8(port1) -> function22(port1) -> debug29
      // Loop paths (function21 loops back to function8):
      //   4. function8(port0) -> function21(port1) -> loop -> function8(port0) -> function21(port0) -> debug21
      //   5. function8(port0) -> function21(port1) -> loop -> function8(port1) -> function22(port0) -> debug28
      //   6. function8(port0) -> function21(port1) -> loop -> function8(port1) -> function22(port1) -> debug29
      // Total: 6 paths
      const graph = new GraphModel();
      graph.addNode({ id: 'inject', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'func8', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'func21', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'func22', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'debug21', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug28', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'debug29', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'inject', target: 'func8', sourcePort: 0 });
      graph.addEdge({ source: 'func8', target: 'func21', sourcePort: 0 });
      graph.addEdge({ source: 'func8', target: 'func22', sourcePort: 1 });
      graph.addEdge({ source: 'func21', target: 'debug21', sourcePort: 0 });
      graph.addEdge({ source: 'func21', target: 'func8', sourcePort: 1 }); // LOOP back
      graph.addEdge({ source: 'func22', target: 'debug28', sourcePort: 0 });
      graph.addEdge({ source: 'func22', target: 'debug29', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(6);
    });
  });

  describe('multicast with branching inside broadcast', () => {
    it('should multiply independent decisions within multicast targets', () => {
      // Switch multicasts on port0 to [function1, function2], both have 2 outputs
      // Key: multicast doesn't create paths, but independent decisions within DO multiply
      //
      // Structure:
      // inject -> switch (port0: multicast [n3, n4], port1: n5)
      //           n3 (2 outputs) -> n6, n7
      //           n4 (2 outputs) -> n8, n9
      //
      // Paths:
      // 1. inject -> switch(port0) -> [n3(port0)->n6 AND n4(port0)->n8] (parallel execution)
      // 2. inject -> switch(port0) -> [n3(port0)->n6 AND n4(port1)->n9]
      // 3. inject -> switch(port0) -> [n3(port1)->n7 AND n4(port0)->n8]
      // 4. inject -> switch(port0) -> [n3(port1)->n7 AND n4(port1)->n9]
      // 5. inject -> switch(port1) -> n5
      // 6. inject -> switch(catch-all) -> STOP
      // NPATH = 6 (4 from independent decisions in multicast + 1 direct + 1 catch-all)
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n3', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n4', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'n5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n6', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n7', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n8', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n9', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'n3', sourcePort: 0 }); // Multicast start
      graph.addEdge({ source: 'n2', target: 'n4', sourcePort: 0 }); // Multicast (same port)
      graph.addEdge({ source: 'n2', target: 'n5', sourcePort: 1 }); // Different port
      graph.addEdge({ source: 'n3', target: 'n6', sourcePort: 0 });
      graph.addEdge({ source: 'n3', target: 'n7', sourcePort: 1 });
      graph.addEdge({ source: 'n4', target: 'n8', sourcePort: 0 });
      graph.addEdge({ source: 'n4', target: 'n9', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(6);
    });

    it('should handle three-way multicast with branching', () => {
      // Multicast to 3 functions, each with 2 outputs
      // inject -> function (multicast to [f2, f3, f4])
      //           f2, f3, f4 each have 2 outputs
      // Paths = 2 × 2 × 2 = 8
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'f2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'f3', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'f4', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'd1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'd2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'd3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'd4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'd5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'd6', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      // Multicast to 3 functions
      graph.addEdge({ source: 'n2', target: 'f2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'f3', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'f4', sourcePort: 0 });
      // Each function has 2 outputs
      graph.addEdge({ source: 'f2', target: 'd1', sourcePort: 0 });
      graph.addEdge({ source: 'f2', target: 'd2', sourcePort: 1 });
      graph.addEdge({ source: 'f3', target: 'd3', sourcePort: 0 });
      graph.addEdge({ source: 'f3', target: 'd4', sourcePort: 1 });
      graph.addEdge({ source: 'f4', target: 'd5', sourcePort: 0 });
      graph.addEdge({ source: 'f4', target: 'd6', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(8);
    });

    it('should handle multicast with mix of branching and non-branching targets', () => {
      // Function multicasts to [function (2 outputs), debug, debug]
      // Only the function with 2 outputs creates paths
      // inject -> function (multicast to [f2, d1, d2])
      //           f2 has 2 outputs
      // Paths = 2 (from f2's branching)
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'n2', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'f2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'd1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'd2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'd3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'd4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 'n2', sourcePort: 0 });
      // Multicast to 3 targets
      graph.addEdge({ source: 'n2', target: 'f2', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'd1', sourcePort: 0 });
      graph.addEdge({ source: 'n2', target: 'd2', sourcePort: 0 });
      // Only f2 branches
      graph.addEdge({ source: 'f2', target: 'd3', sourcePort: 0 });
      graph.addEdge({ source: 'f2', target: 'd4', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(2);
    });

    it('should handle nested multicast with branching', () => {
      // Switch multicasts to [f1, f2], then f1 multicasts to [f3, f4]
      // All functions have 2 outputs
      // inject -> switch (multicast to [f1, f2])
      //           f1 (multicast to [f3, f4], each with 2 outputs) -> 2×2 = 4 paths
      //           f2 (2 outputs) -> 2 paths
      // Paths through multicast: 4 × 2 = 8, plus switch port1 + catch-all
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 's1', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'f1', type: 'function', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'f2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'f3', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'f4', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'd1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'd2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'd3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'd4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'd5', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'd6', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'd7', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });

      graph.addEdge({ source: 'n1', target: 's1', sourcePort: 0 });
      // Switch multicast on port0
      graph.addEdge({ source: 's1', target: 'f1', sourcePort: 0 });
      graph.addEdge({ source: 's1', target: 'f2', sourcePort: 0 });
      graph.addEdge({ source: 's1', target: 'd7', sourcePort: 1 });
      // f1 multicasts to f3, f4
      graph.addEdge({ source: 'f1', target: 'f3', sourcePort: 0 });
      graph.addEdge({ source: 'f1', target: 'f4', sourcePort: 0 });
      // f2 has 2 outputs
      graph.addEdge({ source: 'f2', target: 'd5', sourcePort: 0 });
      graph.addEdge({ source: 'f2', target: 'd6', sourcePort: 1 });
      // f3 has 2 outputs
      graph.addEdge({ source: 'f3', target: 'd1', sourcePort: 0 });
      graph.addEdge({ source: 'f3', target: 'd2', sourcePort: 1 });
      // f4 has 2 outputs
      graph.addEdge({ source: 'f4', target: 'd3', sourcePort: 0 });
      graph.addEdge({ source: 'f4', target: 'd4', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(10); // (4 × 2) + 1 + 1
    });

    it('should handle loop from inside multicast back to before multicast', () => {
      // Switch multicasts to [f1, f2], f1 loops back to switch
      // Key: one branch in multicast creates a cycle
      //
      // Structure:
      // inject -> switch (port0: multicast [f1, f2], port1: exit)
      //           f1: port0 -> loops back to switch
      //               port1 -> debug1
      //           f2: port0 -> debug2
      //               port1 -> debug3
      //
      // Paths (with one loop iteration):
      // Base case (f1 doesn't loop):
      //   1. switch(port0) -> f1(port1)->d1 AND f2(port0)->d2
      //   2. switch(port0) -> f1(port1)->d1 AND f2(port1)->d3
      //   3. switch(port1) -> d4 (direct)
      //   4. switch(catch-all) -> STOP (direct)
      // Loop case (f1 loops back):
      //   5. switch(port0) -> f1(port0)->loop AND f2(port0)->d2 -> infinite loop
      //   6. switch(port0) -> f1(port0)->loop AND f2(port1)->d3 -> infinite loop
      //   7. switch(port0) -> f1(port0)->switch(port1)->d4 AND f2(port0)->d2 (exit via loop)
      //   8. switch(port0) -> f1(port0)->switch(port1)->d4 AND f2(port1)->d3 (exit via loop)
      // Total: 8
      const graph = new GraphModel();
      graph.addNode({ id: 'n1', type: 'inject', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 's1', type: 'switch', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'f1', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'f2', type: 'function', flowId: 'f1', isDecisionNode: true, metadata: {} });
      graph.addNode({ id: 'd1', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'd2', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'd3', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} });
      graph.addNode({ id: 'd4', type: 'debug', flowId: 'f1', isDecisionNode: false, metadata: {} }); // exit terminal

      graph.addEdge({ source: 'n1', target: 's1', sourcePort: 0 });
      // Switch multicast on port0
      graph.addEdge({ source: 's1', target: 'f1', sourcePort: 0 });
      graph.addEdge({ source: 's1', target: 'f2', sourcePort: 0 });
      graph.addEdge({ source: 's1', target: 'd4', sourcePort: 1 }); // Direct exit
      // f1 has loop on port0, exit on port1
      graph.addEdge({ source: 'f1', target: 's1', sourcePort: 0 }); // LOOP back to switch
      graph.addEdge({ source: 'f1', target: 'd1', sourcePort: 1 });
      // f2 has two branches
      graph.addEdge({ source: 'f2', target: 'd2', sourcePort: 0 });
      graph.addEdge({ source: 'f2', target: 'd3', sourcePort: 1 });

      const component = createComponent(graph);
      const result = metric.compute(component);

      expect(result.value).toBe(8);
    });
  });
});

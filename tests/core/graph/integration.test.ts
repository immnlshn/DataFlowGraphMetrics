import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FlowParser } from '../../../src/core/parser/FlowParser';
import { NodeClassifier } from '../../../src/core/parser/NodeClassifier';
import { GraphBuilder } from '../../../src/core/graph/GraphBuilder';
import { NodeRedNode } from '../../../src/core/types/node-red.types';

describe('Graph Integration Tests', () => {
  let parser: FlowParser;
  let classifier: NodeClassifier;
  let builder: GraphBuilder;

  beforeEach(() => {
    parser = new FlowParser();
    classifier = new NodeClassifier();
    builder = new GraphBuilder(classifier);
  });

  function loadFixture(filename: string): string {
    return readFileSync(join(__dirname, '../../fixtures', filename), 'utf-8');
  }

  describe('Simple Flow', () => {
    it('should build graph from simple-flow.json', () => {
      const json = loadFixture('simple-flow.json');
      const parsed = parser.parse(json);

      expect(parsed.tabs).toHaveLength(1);
      expect(parsed.nodes).toHaveLength(3);

      const flowId = parsed.tabs[0].id;
      const graph = builder.build(parsed.nodes, flowId);

      expect(graph.getNodeCount()).toBe(3);

      expect(graph.hasNode('c2eae9ba404a97f3')).toBe(true);
      expect(graph.hasNode('54adaf750d028916')).toBe(true);
      expect(graph.hasNode('0155e6e6dfb222e7')).toBe(true);

      expect(graph.getEdgeCount()).toBe(2);

      const outgoingFromInject = graph.getOutgoing('c2eae9ba404a97f3');
      expect(outgoingFromInject).toHaveLength(1);
      expect(outgoingFromInject[0].target).toBe('54adaf750d028916');

      const outgoingFromFunction = graph.getOutgoing('54adaf750d028916');
      expect(outgoingFromFunction).toHaveLength(1);
      expect(outgoingFromFunction[0].target).toBe('0155e6e6dfb222e7');

      const injectNode = graph.getNode('c2eae9ba404a97f3');
      expect(injectNode?.metadata.name).toBe('Start');
      expect(injectNode?.metadata.position).toEqual({ x: 90, y: 80 });
    });
  });

  describe('Multi-Component Flow', () => {
    it('should build graph from multi-component.json', () => {
      const json = loadFixture('multi-component.json');
      const parsed = parser.parse(json);

      expect(parsed.tabs.length).toBe(2);

      const tab1Id = 'b880287e7ae67ece';
      const tab1 = parsed.tabs.find(t => t.id === tab1Id);
      expect(tab1).toBeDefined();

      const nodesForTab1 = parser.getNodesForTab(parsed.nodes, tab1Id);
      expect(nodesForTab1).toHaveLength(7);

      const graph1 = builder.build(nodesForTab1, tab1Id);
      expect(graph1.getNodeCount()).toBe(7);
      expect(graph1.getEdgeCount()).toBe(5);

      const decisionNodes1 = graph1.getNodes().filter(n => n.isDecisionNode);
      expect(decisionNodes1).toHaveLength(1);

      const tab2Id = 'c50cadcdcc866c52';
      const tab2 = parsed.tabs.find(t => t.id === tab2Id);
      expect(tab2).toBeDefined();

      const nodesForTab2 = parser.getNodesForTab(parsed.nodes, tab2Id);
      expect(nodesForTab2).toHaveLength(4);

      const graph2 = builder.build(nodesForTab2, tab2Id);
      expect(graph2.getNodeCount()).toBe(4);
      expect(graph2.getEdgeCount()).toBe(3);

      const decisionNodes2 = graph2.getNodes().filter(n => n.isDecisionNode);
      expect(decisionNodes2).toHaveLength(0);
    });
  });

  describe('Complex Branching Flow', () => {
    it('should build graph from complex-branching.json', () => {
      const json = loadFixture('complex-branching.json');
      const parsed = parser.parse(json);

      expect(parsed.tabs).toHaveLength(1);

      const flowId = parsed.tabs[0].id;
      const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
      const graph = builder.build(nodesForTab, flowId);

      expect(graph.getNodeCount()).toBe(7);
      expect(graph.getEdgeCount()).toBe(6);

      const decisionNodes = graph.getNodes().filter(n => n.isDecisionNode);
      expect(decisionNodes.length).toBe(2);

      const regularNodes = graph.getNodes().filter(n => !n.isDecisionNode);
      expect(regularNodes.length).toBe(5);
    });
  });

  describe('Empty Flow', () => {
    it('should handle empty-flow.json', () => {
      const json = loadFixture('empty-flow.json');
      const parsed = parser.parse(json);

      expect(parsed.tabs.length).toBe(0);
      expect(parsed.nodes.length).toBe(0);
    });
  });

  describe('Disabled Nodes', () => {
    it('should handle simple-flow-disabled.json', () => {
      const json = loadFixture('simple-flow-disabled.json');
      const parsed = parser.parse(json);

      expect(parsed.tabs.length).toBe(0);
      expect(parsed.nodes.length).toBe(0);
    });
  });

  describe('Multi-Flow Processing', () => {
    it('should build graphs for all flows in an export', () => {
      const json = loadFixture('multi-component.json');
      const parsed = parser.parse(json);

      expect(parsed.tabs.length).toBe(2);

      const nodesByFlow = new Map<string, ReadonlyArray<NodeRedNode>>();
      for (const tab of parsed.tabs) {
        const nodesForTab = parser.getNodesForTab(parsed.nodes, tab.id);
        nodesByFlow.set(tab.id, nodesForTab);
      }

      const graphs = builder.buildMultiple(nodesByFlow);

      expect(graphs.size).toBe(parsed.tabs.length);

      for (const [flowId, graph] of graphs) {
        const expectedNodes = nodesByFlow.get(flowId) ?? [];
        expect(graph.getNodeCount()).toBe(expectedNodes.length);

        for (const node of graph.getNodes()) {
          expect(node.flowId).toBe(flowId);
        }
      }
    });
  });
});

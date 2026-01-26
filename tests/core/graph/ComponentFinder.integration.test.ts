import { describe, it, expect } from 'vitest';
import { ComponentFinder } from '../../../src/core/graph/ComponentFinder';
import { GraphBuilder } from '../../../src/core/graph/GraphBuilder';
import { FlowParser } from '../../../src/core/parser/FlowParser';
import { NodeClassifier } from '../../../src/core/parser/NodeClassifier';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('ComponentFinder Integration', () => {
  const parser = new FlowParser();
  const classifier = new NodeClassifier();
  const builder = new GraphBuilder(classifier);
  const finder = new ComponentFinder();

  function loadFixture(filename: string): string {
    return readFileSync(join(__dirname, '../../fixtures', filename), 'utf-8');
  }

  it('should find single component in simple flow', () => {
    const json = loadFixture('simple-flow.json');
    const parsed = parser.parse(json);
    const flowId = parsed.tabs[0].id;
    const graph = builder.build(parsed.nodes, flowId);
    const components = finder.findComponents(graph);

    expect(components).toHaveLength(1);
    expect(components[0].nodes.size).toBe(3);
  });

  it('should find multiple components in multi-component flow', () => {
    const json = loadFixture('multi-component.json');
    const parsed = parser.parse(json);
    
    // Build graph for first tab
    const flowId = parsed.tabs[0].id;
    const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
    const graph = builder.build(nodesForTab, flowId);
    const components = finder.findComponents(graph);

    // Tab 1 has disconnected components
    expect(components.length).toBeGreaterThan(1);
    
    // Total nodes should match
    const totalNodes = components.reduce((sum, c) => sum + c.nodes.size, 0);
    expect(totalNodes).toBe(graph.getNodeCount());
  });

  it('should handle complex branching as single component', () => {
    const json = loadFixture('complex-branching.json');
    const parsed = parser.parse(json);
    const flowId = parsed.tabs[0].id;
    const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
    const graph = builder.build(nodesForTab, flowId);
    const components = finder.findComponents(graph);

    // Complex branching should all be connected
    expect(components).toHaveLength(1);
    expect(components[0].nodes.size).toBe(graph.getNodeCount());
  });

  it('should create valid subgraphs with all edges', () => {
    const json = loadFixture('simple-flow.json');
    const parsed = parser.parse(json);
    const flowId = parsed.tabs[0].id;
    const graph = builder.build(parsed.nodes, flowId);
    const components = finder.findComponents(graph);

    components.forEach(component => {
      // Verify all edges in subgraph are valid
      component.graph.getEdges().forEach(edge => {
        expect(component.nodes.has(edge.source)).toBe(true);
        expect(component.nodes.has(edge.target)).toBe(true);
      });
    });
  });

  it('should preserve node properties in subgraph', () => {
    const json = loadFixture('complex-branching.json');
    const parsed = parser.parse(json);
    const flowId = parsed.tabs[0].id;
    const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
    const graph = builder.build(nodesForTab, flowId);
    const components = finder.findComponents(graph);

    components.forEach(component => {
      component.nodes.forEach(nodeId => {
        const originalNode = graph.getNode(nodeId);
        const subgraphNode = component.graph.getNode(nodeId);
        
        expect(subgraphNode).toBeDefined();
        expect(subgraphNode?.id).toBe(originalNode?.id);
        expect(subgraphNode?.type).toBe(originalNode?.type);
        expect(subgraphNode?.isDecisionNode).toBe(originalNode?.isDecisionNode);
      });
    });
  });

  it('should not lose any nodes during component extraction', () => {
    const json = loadFixture('multi-component.json');
    const parsed = parser.parse(json);
    const flowId = parsed.tabs[0].id;
    const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
    const graph = builder.build(nodesForTab, flowId);
    const components = finder.findComponents(graph);

    const allComponentNodes = new Set<string>();
    components.forEach(component => {
      component.nodes.forEach(nodeId => allComponentNodes.add(nodeId));
    });

    expect(allComponentNodes.size).toBe(graph.getNodeCount());

    // Verify every original node is in exactly one component
    for (const nodeId of graph.getNodeIds()) {
      expect(allComponentNodes.has(nodeId)).toBe(true);
    }
  });

  it('should not duplicate nodes across components', () => {
    const json = loadFixture('multi-component.json');
    const parsed = parser.parse(json);
    const flowId = parsed.tabs[0].id;
    const nodesForTab = parser.getNodesForTab(parsed.nodes, flowId);
    const graph = builder.build(nodesForTab, flowId);
    const components = finder.findComponents(graph);

    // Check no node appears in multiple components
    const nodeToComponent = new Map<string, string>();
    
    components.forEach(component => {
      component.nodes.forEach(nodeId => {
        expect(nodeToComponent.has(nodeId)).toBe(false);
        nodeToComponent.set(nodeId, component.id);
      });
    });
  });

  it('should process all tabs in multi-component.json', () => {
    const json = loadFixture('multi-component.json');
    const parsed = parser.parse(json);

    expect(parsed.tabs.length).toBe(2);

    for (const tab of parsed.tabs) {
      const nodesForTab = parser.getNodesForTab(parsed.nodes, tab.id);
      const graph = builder.build(nodesForTab, tab.id);
      const components = finder.findComponents(graph);

      const allCompNodes = new Set<string>();
      components.forEach(c => c.nodes.forEach(id => allCompNodes.add(id)));

      expect(Array.from(allCompNodes)).toHaveLength(graph.getNodeCount());
      expect(components.length).toBeGreaterThanOrEqual(1);
    }
  });
});

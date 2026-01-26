/**
 * Parser Module Integration Tests
 */

import { describe, it, expect } from 'vitest';
import { FlowParser, NodeClassifier } from '../../../src/core/parser';
import simpleFlow from '../../fixtures/simple-flow.json';
import multiComponent from '../../fixtures/multi-component.json';
import complexBranching from '../../fixtures/complex-branching.json';

describe('Parser Integration', () => {
  const parser = new FlowParser();
  const classifier = new NodeClassifier();

  it('should parse and classify simple flow', () => {
    const parsed = parser.parse(simpleFlow);
    const activeNodes = parser.filterActiveNodes(parsed.nodes);
    const classified = classifier.classifyNodes(activeNodes);

    expect(parsed.tabs).toHaveLength(1);
    expect(activeNodes).toHaveLength(3);
    expect(classified.decisionNodes).toHaveLength(0);
    expect(classified.regularNodes).toHaveLength(3);
  });

  it('should parse and classify multi-component flow', () => {
    const parsed = parser.parse(multiComponent);
    const activeNodes = parser.filterActiveNodes(parsed.nodes);
    const classified = classifier.classifyNodes(activeNodes);

    expect(parsed.tabs).toHaveLength(2);
    expect(activeNodes).toHaveLength(11);
    expect(classified.decisionNodes).toHaveLength(1);
    expect(classified.regularNodes).toHaveLength(10);
  });

  it('should parse and classify complex branching flow', () => {
    const parsed = parser.parse(complexBranching);
    const activeNodes = parser.filterActiveNodes(parsed.nodes);
    const classified = classifier.classifyNodes(activeNodes);

    expect(parsed.tabs).toHaveLength(1);
    expect(activeNodes).toHaveLength(7);
    expect(classified.decisionNodes).toHaveLength(2);
    expect(classified.regularNodes).toHaveLength(5);
  });

  it('should correctly separate nodes by tab', () => {
    const parsed = parser.parse(multiComponent);

    expect(parsed.tabs).toHaveLength(2);

    const tab1 = parsed.tabs.find(t => t.id === 'b880287e7ae67ece');
    const tab2 = parsed.tabs.find(t => t.id === 'c50cadcdcc866c52');

    expect(tab1).toBeDefined();
    expect(tab2).toBeDefined();

    const tab1Nodes = parser.getNodesForTab(parsed.nodes, tab1!.id);
    const activeTab1Nodes = parser.filterActiveNodes(tab1Nodes);
    const classifiedTab1 = classifier.classifyNodes(activeTab1Nodes);

    expect(tab1Nodes).toHaveLength(7);
    expect(activeTab1Nodes).toHaveLength(7);
    expect(classifiedTab1.decisionNodes).toHaveLength(1);
    expect(classifiedTab1.regularNodes).toHaveLength(6);

    const tab2Nodes = parser.getNodesForTab(parsed.nodes, tab2!.id);
    const activeTab2Nodes = parser.filterActiveNodes(tab2Nodes);
    const classifiedTab2 = classifier.classifyNodes(activeTab2Nodes);

    expect(tab2Nodes).toHaveLength(4);
    expect(activeTab2Nodes).toHaveLength(4);
    expect(classifiedTab2.decisionNodes).toHaveLength(0);
    expect(classifiedTab2.regularNodes).toHaveLength(4);
  });
});

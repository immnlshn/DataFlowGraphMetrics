/**
 * GraphBuilder - Constructs internal graph from parsed Node-RED flows
 */

import { NodeRedNode } from '../types/node-red.types';
import { GraphNode, GraphEdge } from '../types/graph.types';
import { GraphModel } from './GraphModel';
import { NodeClassifier } from '../parser/NodeClassifier';

export class GraphBuilder {
  private classifier: NodeClassifier;

  constructor(classifier: NodeClassifier) {
    this.classifier = classifier;
  }

  /**
   * Build a graph from Node-RED nodes
   * @param nodes - Array of Node-RED nodes
   * @param flowId - The flow/tab ID these nodes belong to
   * @returns GraphModel instance
   */
  build(nodes: ReadonlyArray<NodeRedNode>, flowId: string): GraphModel {
    const graph = new GraphModel();

    for (const nodeRedNode of nodes) {
      const graphNode = this.createGraphNode(nodeRedNode, flowId);
      graph.addNode(graphNode);
    }

    for (const nodeRedNode of nodes) {
      const edges = this.createEdges(nodeRedNode);
      for (const edge of edges) {
        if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
          graph.addEdge(edge);
        }
      }
    }

    return graph;
  }

  /**
   * Create a GraphNode from a Node-RED node
   */
  private createGraphNode(node: NodeRedNode, flowId: string): GraphNode {
    const isDecisionNode = this.classifier.isDecisionNode(node);

    return {
      id: node.id,
      type: node.type,
      flowId,
      isDecisionNode,
      metadata: {
        name: node.name,
        position: node.x !== undefined && node.y !== undefined 
          ? { x: node.x, y: node.y }
          : undefined
      }
    };
  }

  /**
   * Create edges from a node's wires array
   * Handles multi-port output nodes
   */
  private createEdges(node: NodeRedNode): GraphEdge[] {
    const edges: GraphEdge[] = [];

    for (let portIndex = 0; portIndex < node.wires.length; portIndex++) {
      const port = node.wires[portIndex];

      for (const targetId of port) {
        edges.push({
          source: node.id,
          target: targetId,
          sourcePort: portIndex
        });
      }
    }

    return edges;
  }

  /**
   * Build graphs for multiple flows/tabs
   * @param nodesByFlow - Map of flow ID to array of nodes
   * @returns Map of flow ID to GraphModel
   */
  buildMultiple(nodesByFlow: ReadonlyMap<string, ReadonlyArray<NodeRedNode>>): Map<string, GraphModel> {
    const graphs = new Map<string, GraphModel>();

    for (const [flowId, nodes] of nodesByFlow) {
      const graph = this.build(nodes, flowId);
      graphs.set(flowId, graph);
    }

    return graphs;
  }
}

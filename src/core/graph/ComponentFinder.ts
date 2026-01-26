/**
 * ComponentFinder - Identifies connected components in a graph
 */

import { Graph, ConnectedComponent } from '../types/graph.types';
import { GraphModel } from './GraphModel';

export class ComponentFinder {
  /**
   * Find all connected components in the graph using undirected traversal
   */
  findComponents(graph: Graph): ConnectedComponent[] {
    const visited = new Set<string>();
    const components: ConnectedComponent[] = [];
    let componentIndex = 0;

    for (const nodeId of graph.getNodeIds()) {
      if (!visited.has(nodeId)) {
        const componentNodes = new Set<string>();
        this.dfs(nodeId, graph, visited, componentNodes);
        
        const node = graph.getNode(nodeId)!;
        const component = this.createComponent(
          componentIndex++,
          node.flowId,
          componentNodes,
          graph
        );
        components.push(component);
      }
    }

    return components;
  }

  /**
   * Depth-first search for undirected traversal
   */
  private dfs(
    nodeId: string,
    graph: Graph,
    visited: Set<string>,
    component: Set<string>
  ): void {
    visited.add(nodeId);
    component.add(nodeId);

    const neighbors = graph.getNeighbors(nodeId);

    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        this.dfs(neighborId, graph, visited, component);
      }
    }
  }

  /**
   * Create a component with its subgraph
   */
  private createComponent(
    index: number,
    flowId: string,
    nodeIds: Set<string>,
    originalGraph: Graph
  ): ConnectedComponent {
    const subgraph = this.extractSubgraph(nodeIds, originalGraph);

    return {
      id: `${flowId}-component-${index}`,
      flowId,
      nodes: nodeIds,
      graph: subgraph,
    };
  }

  /**
   * Extract a subgraph containing only the specified nodes
   */
  private extractSubgraph(nodeIds: Set<string>, graph: Graph): Graph {
    const subgraph = new GraphModel();

    // Add nodes
    for (const nodeId of nodeIds) {
      const node = graph.getNode(nodeId);
      if (node) {
        subgraph.addNode(node);
      }
    }

    // Add edges (only those within the component)
    for (const edge of graph.getEdges()) {
      if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
        subgraph.addEdge(edge);
      }
    }

    return subgraph;
  }
}

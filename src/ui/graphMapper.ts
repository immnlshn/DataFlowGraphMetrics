/**
 * Maps GraphModel to Cytoscape elements
 */

import type { ElementDefinition } from 'cytoscape';
import type { ComponentReport } from '../core/types/report.types';

export interface CytoscapeElements {
  nodes: ElementDefinition[];
  edges: ElementDefinition[];
}

/**
 * Convert a ConnectedComponent to Cytoscape elements
 */
export function mapReportToElements(report: ComponentReport): CytoscapeElements {
  const nodes: ElementDefinition[] = [];
  const edges: ElementDefinition[] = [];

  for (const graphNode of report.graph.nodes) {
    nodes.push({
      data: {
        id: graphNode.id,
        label: graphNode.metadata.name || graphNode.type,
        type: graphNode.type,
        isDecisionNode: graphNode.isDecisionNode
      },
      classes: graphNode.isDecisionNode ? 'decision-node' : 'normal-node'
    });
  }

  for (const edge of report.graph.edges) {
    const sourceNode = report.graph.nodes.find(n => n.id === edge.source);
    const isFromDecisionNode = sourceNode?.isDecisionNode || false;

    edges.push({
      data: {
        id: `${edge.source}-${edge.target}-${edge.sourcePort}`,
        source: edge.source,
        target: edge.target
      },
      classes: isFromDecisionNode ? 'decision-edge' : 'default-edge'
    });
  }

  return { nodes, edges };
}

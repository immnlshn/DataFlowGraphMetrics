/**
 * Maps GraphModel to Cytoscape elements with port nodes
 */

import type { ElementDefinition } from 'cytoscape';
import type { ComponentReport } from '../core/types/report.types';

export type CytoscapeElements = {
  nodes: ElementDefinition[];
  edges: ElementDefinition[];
}

type GraphEdge = ComponentReport['graph']['edges'][number];
type GraphNode = ComponentReport['graph']['nodes'][number];

type PortGroup = {
  sourceId: string;
  portNumber: number;
  edges: GraphEdge[];
}

type PortInfo = {
  needsPortNode: boolean;
  isDecisionNode: boolean;
  portCount: number;
}

/**
 * Convert a ComponentReport to Cytoscape elements with intermediate port nodes
 */
export function mapReportToElements(report: ComponentReport): CytoscapeElements {
  const nodes: ElementDefinition[] = createRegularNodes(report);
  const portGroups = groupEdgesByPort(report.graph.edges);
  const portInfo = analyzePortGroups(portGroups, report.graph.nodes);

  const { portNodes, portEdges } = createPortNodesAndEdges(portGroups, portInfo);

  return {
    nodes: [...nodes, ...portNodes],
    edges: portEdges
  };
}

/**
 * Create visualization nodes from graph nodes
 */
function createRegularNodes(report: ComponentReport): ElementDefinition[] {
  return report.graph.nodes.map(node => ({
    data: {
      id: node.id,
      label: node.metadata.name || node.type,
      type: node.type,
      isDecisionNode: node.isDecisionNode
    },
    classes: node.isDecisionNode ? 'decision-node' : 'normal-node'
  }));
}

/**
 * Group edges by (source, sourcePort) to identify potential port nodes
 */
function groupEdgesByPort(edges: readonly GraphEdge[]): PortGroup[] {
  const portMap = new Map<string, GraphEdge[]>();

  for (const edge of edges) {
    const portKey = `${edge.source}:${edge.sourcePort}`;
    if (!portMap.has(portKey)) {
      portMap.set(portKey, []);
    }
    portMap.get(portKey)!.push(edge);
  }

  const portGroups: PortGroup[] = [];
  for (const [portKey, groupEdges] of portMap) {
    const [sourceId, portNum] = portKey.split(':');
    portGroups.push({
      sourceId,
      portNumber: parseInt(portNum),
      edges: groupEdges
    });
  }

  return portGroups;
}

/**
 * Analyze port groups to determine which need port nodes
 */
function analyzePortGroups(
  portGroups: PortGroup[],
  nodes: readonly GraphNode[]
): Map<string, PortInfo> {
  const info = new Map<string, PortInfo>();

  // Count distinct ports per source node
  const portsPerNode = new Map<string, Set<number>>();
  for (const group of portGroups) {
    if (!portsPerNode.has(group.sourceId)) {
      portsPerNode.set(group.sourceId, new Set());
    }
    portsPerNode.get(group.sourceId)!.add(group.portNumber);
  }

  for (const group of portGroups) {
    const sourceNode = nodes.find(n => n.id === group.sourceId);
    const isDecisionNode = sourceNode?.isDecisionNode || false;
    const portCount = portsPerNode.get(group.sourceId)?.size || 1;
    const hasMultiplePorts = portCount > 1;
    const hasMultipleTargets = group.edges.length > 1;

    // Create port node if:
    // - Multiple edges from same port (broadcast/multicast), OR
    // - Decision node with multiple ports (need to visualize branch points)
    const needsPortNode = hasMultipleTargets || (isDecisionNode && hasMultiplePorts);

    info.set(`${group.sourceId}:${group.portNumber}`, {
      needsPortNode,
      isDecisionNode,
      portCount
    });
  }

  return info;
}

/**
 * Create port nodes and edges based on analysis
 */
function createPortNodesAndEdges(
  portGroups: PortGroup[],
  portInfo: Map<string, PortInfo>
): { portNodes: ElementDefinition[]; portEdges: ElementDefinition[] } {
  const portNodes: ElementDefinition[] = [];
  const portEdges: ElementDefinition[] = [];

  for (const group of portGroups) {
    const key = `${group.sourceId}:${group.portNumber}`;
    const info = portInfo.get(key);

    if (info?.needsPortNode) {
      const portNodeId = `port-${key}`;

      // Create port node
      portNodes.push({
        data: {
          id: portNodeId,
          label: `p${group.portNumber}`,
          type: 'port',
          sourcePort: group.portNumber
        },
        classes: 'port-node'
      });

      // Edge from source to port node
      portEdges.push({
        data: {
          id: `${group.sourceId}-${portNodeId}`,
          source: group.sourceId,
          target: portNodeId
        },
        classes: 'edge'
      });

      // Edges from port node to targets
      for (const edge of group.edges) {
        portEdges.push({
          data: {
            id: `${portNodeId}-${edge.target}`,
            source: portNodeId,
            target: edge.target
          },
          classes: 'edge'
        });
      }
    } else {
      // Direct edge without port node
      const edge = group.edges[0];
      portEdges.push({
        data: {
          id: `${edge.source}-${edge.target}-${edge.sourcePort}`,
          source: edge.source,
          target: edge.target,
          sourcePort: edge.sourcePort
        },
        classes: 'edge'
      });
    }
  }

  return { portNodes, portEdges };
}

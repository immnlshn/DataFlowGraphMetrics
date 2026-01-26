/**
 * NPathComplexityMetric - Estimates number of execution paths
 * 
 * Adaptation for Node-RED:
 * - Each decision node multiplies the path count
 * - For a decision node with F fan-out: multiply by F
 * - Upper bound estimate: product of all decision node fan-outs
 * 
 * Formula: NPATH = ∏(fan-out of each decision node)
 * Minimum value: 1 (no decision nodes)
 */

import { IMetric } from '../IMetric';
import { ConnectedComponent } from '../../types/graph.types';
import { MetricResult } from '../../types/metrics.types';

export class NPathComplexityMetric implements IMetric {
  readonly id = 'npath-complexity';
  readonly name = 'NPATH Complexity';
  readonly category = 'complexity' as const;
  readonly description = 'Estimated number of execution paths through the component';

  compute(component: ConnectedComponent): MetricResult {
    const nodeIds = component.graph.getNodeIds();
    
    const decisionNodes = nodeIds
      .map(nodeId => component.graph.getNode(nodeId))
      .filter(node => node?.isDecisionNode);

    if (decisionNodes.length === 0) {
      return {
        value: 1,
        metadata: {
          details: { decisionNodes: 0, pathMultipliers: [] },
          interpretation: 'No decision nodes, single execution path'
        }
      };
    }

    const pathMultipliers = decisionNodes.map(node => {
      const fanOut = component.graph.getOutgoing(node!.id).length;
      return Math.max(fanOut, 2); // Minimum 2 paths per decision
    });

    const npath = pathMultipliers.reduce((product, multiplier) => product * multiplier, 1);

    return {
      value: npath,
      metadata: {
        details: {
          decisionNodes: decisionNodes.length,
          pathMultipliers
        },
        interpretation: `Estimated ${npath} execution path${npath !== 1 ? 's' : ''} through ${decisionNodes.length} decision node${decisionNodes.length !== 1 ? 's' : ''}`
      }
    };
  }
}

/**
 * NodeClassifier - Classifies nodes as decision nodes or regular nodes
 */

import { NodeRedNode } from '../types/node-red.types';

/**
 * Default decision node types in Node-RED
 * These nodes branch execution flow based on conditions
 */
const DEFAULT_DECISION_TYPES = new Set([
  'switch'
]);

export class NodeClassifier {
  private decisionTypes: Set<string>;

  constructor(customDecisionTypes?: string[]) {
    this.decisionTypes = new Set(DEFAULT_DECISION_TYPES);

    if (customDecisionTypes) {
      customDecisionTypes.forEach(type => this.decisionTypes.add(type));
    }
  }

  /**
   * Check if a node is a decision node
   */
  isDecisionNode(node: NodeRedNode): boolean {
    return this.decisionTypes.has(node.type);
  }

  /**
   * Add a node type to the decision node registry
   */
  addDecisionType(type: string): void {
    this.decisionTypes.add(type);
  }

  /**
   * Remove a node type from the decision node registry
   */
  removeDecisionType(type: string): void {
    this.decisionTypes.delete(type);
  }

  /**
   * Get all registered decision node types
   */
  getDecisionTypes(): string[] {
    return Array.from(this.decisionTypes);
  }

  /**
   * Check if a node has multiple outputs
   */
  hasMultipleOutputs(node: NodeRedNode): boolean {
    return node.wires.length > 1;
  }

  /**
   * Classify nodes from a list
   */
  classifyNodes(nodes: ReadonlyArray<NodeRedNode>): Readonly<{
    decisionNodes: ReadonlyArray<NodeRedNode>;
    regularNodes: ReadonlyArray<NodeRedNode>;
  }> {
    const decisionNodes: NodeRedNode[] = [];
    const regularNodes: NodeRedNode[] = [];

    for (const node of nodes) {
      if (this.isDecisionNode(node)) {
        decisionNodes.push(node);
      } else {
        regularNodes.push(node);
      }
    }

    return { decisionNodes, regularNodes };
  }
}

/**
 * FlowParser - Parses and validates Node-RED JSON exports
 */

import { NodeRedExport, NodeRedFlowTab, NodeRedNode, isFlowTab, isNode } from '../types/node-red.types';

export interface ParsedFlow {
  tabs: NodeRedFlowTab[];
  nodes: NodeRedNode[];
}

export class FlowParser {
  /**
   * Parse Node-RED JSON export
   * @param input - JSON string or parsed object
   * @returns Separated tabs and nodes
   * @throws Error if input is invalid
   */
  parse(input: string | unknown): ParsedFlow {
    const data = this.validateInput(input);
    return this.extractFlowData(data);
  }

  /**
   * Validate and parse JSON input
   */
  private validateInput(input: string | unknown): NodeRedExport {
    let data: unknown;

    if (typeof input === 'string') {
      try {
        data = JSON.parse(input);
      } catch (error) {
        throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      data = input;
    }

    if (!Array.isArray(data)) {
      throw new Error('Node-RED export must be an array');
    }

    if (data.length === 0) {
      return data as NodeRedExport;
    }

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (!item || typeof item !== 'object') {
        throw new Error(`Invalid item at index ${i}: must be an object`);
      }
      if (!('id' in item) || typeof item.id !== 'string') {
        throw new Error(`Invalid item at index ${i}: missing or invalid 'id' property`);
      }
      if (!('type' in item) || typeof item.type !== 'string') {
        throw new Error(`Invalid item at index ${i}: missing or invalid 'type' property`);
      }
    }

    return data as NodeRedExport;
  }

  /**
   * Extract and separate flow tabs from nodes
   */
  private extractFlowData(data: NodeRedExport): ParsedFlow {
    const tabs: NodeRedFlowTab[] = [];
    const nodes: NodeRedNode[] = [];

    const enabledTabIds = new Set<string>();

    for (const item of data) {
      if (isFlowTab(item)) {
        if (!item.disabled) {
          tabs.push(item);
          enabledTabIds.add(item.id);
        }
      }
    }

    for (const item of data) {
      if (isNode(item)) {
        const node = item as NodeRedNode;
        if (!node.z || enabledTabIds.has(node.z)) {
          nodes.push(node);
        }
      }
    }

    return { tabs, nodes };
  }

  /**
   * Get nodes belonging to a specific flow tab
   */
  getNodesForTab(nodes: NodeRedNode[], tabId: string): NodeRedNode[] {
    return nodes.filter(node => node.z === tabId);
  }

  /**
   * Filter out disabled nodes (if they have a 'd' property set to true)
   */
  filterActiveNodes(nodes: NodeRedNode[]): NodeRedNode[] {
    return nodes.filter(node => {
      const disabled = (node as any).d;
      return disabled !== true;
    });
  }
}

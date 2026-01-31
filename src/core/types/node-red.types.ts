/**
 * Node-RED JSON Export Schema
 *
 * A Node-RED export is always a flat array of items.
 * Items can be either flow tab definitions or node definitions.
 */

/**
 * Union type: an item is either a flow tab or a node
 */
export type NodeRedExport = ReadonlyArray<NodeRedItem>;

export type NodeRedItem = NodeRedFlowTab | NodeRedNode;

/**
 * Flow tab definition (workspace container)
 */
export type NodeRedFlowTab = Readonly<{
  id: string;
  type: 'tab';
  label: string;
  disabled?: boolean;
  info?: string;
  env?: unknown[];
}>;

/**
 * Node definition - any node in the flow
 */
export type NodeRedNode = Readonly<{
  id: string;
  type: string;
  z?: string;
  wires: ReadonlyArray<ReadonlyArray<string>>;
  x?: number;
  y?: number;
  name?: string;
  [key: string]: unknown;
}>;

/**
 * Type guard: check if item is a flow tab
 */
export function isFlowTab(item: NodeRedItem): item is NodeRedFlowTab {
  return item.type === 'tab';
}

/**
 * Type guard: check if item is a node
 */
export function isNode(item: NodeRedItem): item is NodeRedNode {
  if (item.type === 'tab') return false;

  if (!('wires' in item)) return false;

  const maybeWires = (item as any).wires;
  if (!Array.isArray(maybeWires)) return false;

  return maybeWires.every(
    (port: unknown) => Array.isArray(port) && port.every(id => typeof id === 'string')
  );
}

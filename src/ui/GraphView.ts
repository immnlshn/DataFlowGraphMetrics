/**
 * GraphView - Cytoscape.js visualization component
 */

import cytoscape, { Core } from 'cytoscape';
import dagre from 'cytoscape-dagre';
import type { ComponentReport } from '../core/types/report.types';
import { mapReportToElements } from './graphMapper';

cytoscape.use(dagre);

export interface GraphViewOptions {
  container: HTMLElement;
  layoutOrientation?: 'LR' | 'TB';
}

export class GraphView {
  private cy: Core | null = null;
  private container: HTMLElement;
  private layoutOrientation: 'LR' | 'TB';

  constructor(options: GraphViewOptions) {
    this.container = options.container;
    this.layoutOrientation = options.layoutOrientation || 'LR';
  }

  /**
   * Render from a ComponentReport (from analysis report output)
   */
  renderFromReport(report: ComponentReport): void {
    if (this.cy) {
      this.cy.destroy();
    }

    const elements = mapReportToElements(report);

    this.cy = cytoscape({
      container: this.container,
      elements: [...elements.nodes, ...elements.edges],
      style: this.getStylesheet(),
      userPanningEnabled: true,
      userZoomingEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: true
    });

    const layout = this.cy.layout({
      name: 'dagre',
      rankDir: this.layoutOrientation,
      nodeSep: 50,
      rankSep: 100,
      padding: 30
    } as any);

    layout.run();
  }

  /**
   * Get Cytoscape stylesheet
   */
  private getStylesheet(): any[] {
    return [
      {
        selector: 'node',
        style: {
          'label': 'data(label)',
          'text-valign': 'center',
          'text-halign': 'center',
          'background-color': '#69b3e7',
          'color': '#fff',
          'width': 80,
          'height': 40,
          'shape': 'roundrectangle',
          'font-size': '12px',
          'text-wrap': 'wrap',
          'text-max-width': '70px',
          'border-width': 2,
          'border-color': '#1e88e5'
        } as any
      },
      {
        selector: 'node.decision-node',
        style: {
          'background-color': '#ff9800',
          'border-color': '#f57c00',
          'shape': 'diamond',
          'width': 60,
          'height': 60
        } as any
      },
      {
        selector: 'edge',
        style: {
          'width': 2,
          'line-color': '#999',
          'target-arrow-color': '#999',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier'
        } as any
      },
      {
        selector: 'edge.decision-edge',
        style: {
          'line-color': '#ff5722',
          'target-arrow-color': '#ff5722',
          'width': 2.5
        } as any
      }
    ];
  }

  /**
   * Destroy the view
   */
  destroy(): void {
    if (this.cy) {
      this.cy.destroy();
      this.cy = null;
    }
  }
}

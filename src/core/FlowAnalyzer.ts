/**
 * FlowAnalyzer - Main orchestration class for flow analysis pipeline
 */

import { FlowParser } from './parser/FlowParser';
import { NodeClassifier } from './parser/NodeClassifier';
import { GraphBuilder } from './graph/GraphBuilder';
import { ComponentFinder } from './graph/ComponentFinder';
import { MetricsRegistry } from './metrics/MetricsRegistry';
import { ReportBuilder } from './reporter/ReportBuilder';
import { VertexCountMetric } from './metrics/size/VertexCountMetric';
import { EdgeCountMetric } from './metrics/size/EdgeCountMetric';
import { FanInMetric } from './metrics/structural/FanInMetric';
import { FanOutMetric } from './metrics/structural/FanOutMetric';
import { DensityMetric } from './metrics/structural/DensityMetric';
import { CyclomaticComplexityMetric } from './metrics/complexity/CyclomaticComplexityMetric';
import { NPathComplexityMetric } from './metrics/complexity/NPathComplexityMetric';
import { AnalysisReport } from './types/report.types';
import { ComponentMetrics } from './types/metrics.types';

export class FlowAnalyzer {
  private parser: FlowParser;
  private graphBuilder: GraphBuilder;
  private componentFinder: ComponentFinder;
  private metricsRegistry: MetricsRegistry;
  private reportBuilder: ReportBuilder;

  constructor() {
    const classifier = new NodeClassifier();
    this.parser = new FlowParser();
    this.graphBuilder = new GraphBuilder(classifier);
    this.componentFinder = new ComponentFinder();
    this.metricsRegistry = this.initializeMetrics();
    this.reportBuilder = new ReportBuilder();
  }

  /**
   * Analyze a Node-RED flow and generate a metrics report
   * 
   * @param flowJson - Node-RED flow export (array of tabs and nodes)
   * @returns Analysis report with metrics for all components
   */
  analyze(flowJson: unknown): AnalysisReport {
    // 1. Parse and validate input
    const parsed = this.parser.parse(flowJson);
    
    // 2. Process each flow/tab
    const allComponents = [];
    const allMetrics = new Map<string, ComponentMetrics>();
    
    for (const tab of parsed.tabs) {
      const nodesForTab = this.parser.getNodesForTab(parsed.nodes, tab.id);
      const graph = this.graphBuilder.build(nodesForTab, tab.id);
      const components = this.componentFinder.findComponents(graph, tab.label);

      for (const component of components) {
        const metrics = this.metricsRegistry.computeAll(component);
        allComponents.push(component);
        allMetrics.set(component.id, metrics);
      }
    }
    
    // 3. Generate report
    return this.reportBuilder.build(allComponents, allMetrics);
  }

  /**
   * Initialize and register all metrics
   */
  private initializeMetrics(): MetricsRegistry {
    const registry = new MetricsRegistry();
    
    // Size metrics
    registry.register(new VertexCountMetric());
    registry.register(new EdgeCountMetric());
    
    // Structural metrics
    registry.register(new FanInMetric());
    registry.register(new FanOutMetric());
    registry.register(new DensityMetric());
    
    // Complexity metrics
    registry.register(new CyclomaticComplexityMetric());
    registry.register(new NPathComplexityMetric());
    
    return registry;
  }
}

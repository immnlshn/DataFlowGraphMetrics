/**
 * Core Analysis Module - Public API
 *
 * This is the main entry point for the Node-RED Flow Quality Analyzer.
 */

export * from './types/index';
export * from '../utils/validation';

export { FlowAnalyzer } from './FlowAnalyzer';

import { FlowAnalyzer } from './FlowAnalyzer';
import { AnalysisReport } from './types/report.types';

export const VERSION = '0.1.0';

/**
 * Analyze a Node-RED flow and generate a metrics report
 * 
 * This is the main entry point for flow analysis. Pass a Node-RED
 * flow export (JSON array) and get back a complete analysis report.
 * 
 * @param flowJson - Node-RED flow export (array of tabs and nodes)
 * @returns Analysis report with metrics for all components
 * 
 * @example
 * ```typescript
 * import { analyzeFlow } from './core';
 * 
 * const flowJson = [...]; // Node-RED export
 * const report = analyzeFlow(flowJson);
 * 
 * console.log(`Found ${report.summary.totalComponents} components`);
 * ```
 */
export function analyzeFlow(flowJson: unknown): AnalysisReport {
  const analyzer = new FlowAnalyzer();
  return analyzer.analyze(flowJson);
}

import type { AnalysisReport, ComponentReport } from '../core/types/report.types';

/**
 * Format a component report as readable text
 */
function formatComponent(comp: ComponentReport): string {
  const lines = [
    `\n  Component: ${comp.id}`,
    `  Flow: ${comp.flowName || comp.flowId}`,
    `  Metrics:`,
  ];

  Object.entries(comp.metrics)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([name, result]) => {
      lines.push(`    ${name}: ${result.value}`);
    });

  return lines.join('\n');
}

/**
 * Log a report to console in human-readable format
 */
export function logReport(report: AnalysisReport): void {
  console.log('\n=== Data Flow Graph Analysis Report ===');
  console.log(`Timestamp: ${report.summary.analyzedAt}`);
  console.log('\nSummary:');
  console.log(`  Flows: ${report.summary.flowCount}`);
  console.log(`  Components: ${report.summary.totalComponents}`);

  if (report.components.length > 0) {
    console.log('\nComponents:');
    report.components.forEach(comp => {
      console.log(formatComponent(comp));
    });
  }

  console.log('\n');
}

/**
 * Format report as JSON string
 */
export function formatReportJSON(report: AnalysisReport, pretty = true): string {
  return JSON.stringify(report, null, pretty ? 2 : 0);
}

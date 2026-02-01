#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { analyzeFlow } from './core/index.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
DataFlow Graph Metrics CLI

Usage:
  npm run analyze <flow.json>

Options:
  --help, -h     Show this help message
  --pretty, -p   Pretty print JSON output

Example:
  npm run analyze test.json
  npm run analyze test.json --pretty
`);
    process.exit(0);
  }

  const filePath = args[0];
  const pretty = args.includes('--pretty') || args.includes('-p');

  try {
    const content = await readFile(filePath, 'utf-8');
    const flowJson = JSON.parse(content);
    const report = analyzeFlow(flowJson);

    if (pretty) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(JSON.stringify(report));
    }

    console.error(`\nAnalysis complete: ${report.summary.totalComponents} components found`);
    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error('Unknown error occurred');
    }
    process.exit(1);
  }
}

main();

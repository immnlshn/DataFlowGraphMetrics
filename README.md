# DataFlow Graph Metrics

A static analysis tool for Node-RED flows that calculates software quality metrics on dataflow graphs.

## Features

- **Flow Parsing**: Imports and validates Node-RED flow JSON files
- **Graph Analysis**: Identifies connected components and builds directed graphs
- **Metrics Calculation**: Computes various software quality metrics
    - Size metrics (vertex count, edge count)
    - Structural metrics (fan-in, fan-out, density)
    - Complexity metrics (cyclomatic complexity, n-path complexity)
- **Interactive Visualization**: Web-based UI with graph rendering
- **JSON Export**: Detailed reports in JSON format

## Installation

```bash
npm install
```

## Usage

### Web UI

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to the provided URL (typically `http://localhost:5173`). Upload a Node-RED flow JSON file
to analyze it.

### CLI

Run metrics analysis via command line:

```bash
npm run analyze <path-to-flow.json>
```

### Programmatic API

```typescript
import { analyzeFlow } from './src/core/index';

const flowJson = /* your Node-RED flow */;
const report = analyzeFlow(flowJson);

console.log(report.summary);
console.log(report.components);
```

## Project Structure

```
src/
├── core/                  # Core analysis engine
│   ├── parser/           # Flow parsing and validation
│   ├── graph/            # Graph model and algorithms
│   ├── metrics/          # Metric implementations
│   └── reporter/         # Report generation
├── ui/                    # Web interface
│   ├── GraphView.ts      # Graph visualization
│   └── graphMapper.ts    # Data mapping for UI
├── utils/                 # Shared utilities
└── main.ts               # UI entry point

tests/                     # Test suite
├── core/                 # Unit and integration tests
├── integration/          # End-to-end tests
├── fixtures/             # Test data
└── utils/                # Utility tests
```

## Architecture

The system follows a pipeline architecture with clear separation of concerns:

1. **Parser**: Validates and normalizes Node-RED JSON
2. **Graph Builder**: Constructs directed graph representation
3. **Component Finder**: Identifies connected components
4. **Metrics Engine**: Calculates quality metrics
5. **Reporter**: Generates structured reports

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed documentation and diagrams.

## Metrics Reference

### Size Metrics

- **Vertex Count**: Number of nodes in the flow
- **Edge Count**: Number of connections between nodes

### Structural Metrics

- **Fan-In**: Maximum number of incoming edges to any node
- **Fan-Out**: Maximum number of outgoing edges from any node
- **Density**: Ratio of actual edges to possible edges

### Complexity Metrics

- **Cyclomatic Complexity**: Number of linearly independent paths (decision points + 1)
- **N-Path Complexity**: Number of execution paths through the flow

## Development

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## Technology Stack

- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **Vitest**: Unit and integration testing
- **Cytoscape.js**: Graph visualization
- **GitHub Actions**: CI/CD pipeline

## Testing

The project includes comprehensive test coverage:

- **Unit tests**: Individual classes and functions
- **Integration tests**: Multiple components working together within modules
- **End-to-end tests**: Full public API through `analyzeFlow()`
- 200+ tests total validating all functionality

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

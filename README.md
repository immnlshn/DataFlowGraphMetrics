# DataFlowGraphMetrics

Node-RED Flow Quality Analyzer - A tool for computing structural quality metrics on Node-RED flow graphs.

## 📁 Project Structure

```
src/
├── core/
│   ├── types/          # Core type definitions
│   ├── parser/         # Flow parsing 
│   ├── graph/          # Graph construction 
│   ├── metrics/        # Metrics computation 
│   └── reporter/       # Report generation 
└── utils/              # Shared utilities

tests/
├── fixtures/           # Test data
└── *.test.ts          # Test suites
```

## 🛠️ Development

### Install Dependencies
```bash
npm install
```

### Run Tests
```bash
npm test
```

### Type Check
```bash
npm run build
```

### Development Server
```bash
npm run dev
```

## 📊 Metrics (Planned)

### Size Metrics
- Vertex Count
- Edge Count

### Structural Metrics
- Fan-In
- Fan-Out
- Density

### Complexity Metrics
- Cyclomatic Complexity
- Npath Complexity

## 🏗️ Architecture

The analyzer follows a pipeline architecture:

```
Input (Node-RED JSON)
  ↓
Parser (validate & extract)
  ↓
Graph Builder (construct directed graph)
  ↓
Component Finder (identify connected components)
  ↓
Metrics Engine (compute metrics)
  ↓
Reporter (generate report)
  ↓
Output (Analysis Report JSON)
```


# DataFlowGraphMetrics

A Single-Page Application (SPA) built with Vite for analyzing Node-RED Flow files and calculating complexity metrics.

## Features

- 📊 **Complexity Metrics Analysis**: Calculate Fan-In, Fan-Out, and Henry-Kafura scores for Node-RED flows
- 🔍 **Stress Point Detection**: Automatically highlights nodes with high complexity (Henry-Kafura score > 100)
- 📁 **Simple File Upload**: Drag and drop or select JSON flow files
- 📈 **Visual Statistics**: Overview cards showing key metrics
- 🎨 **Modern UI**: Beautiful gradient design with responsive layout

## Metrics Calculated

### 1. Fan-Out (Ausgangsgrad)
Counts the total number of outgoing connections from a node by summing the length of all arrays within the `wires` property.

### 2. Fan-In (Eingangsgrad)
Counts the total number of incoming connections to a node by counting how often the node's `id` appears in other nodes' `wires` arrays.

### 3. Henry-Kafura Metric (Information Flow Complexity)
Uses the simplified formula for data flow designs:
```
Complexity = (FanIn × FanOut)² × Length
```
- For `function` nodes, Length is the character count of the `func` field
- For other nodes, Length = 1

## Installation

```bash
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173/`

## Build

Build for production:

```bash
npm run build
```

## Usage

1. Open the application in your browser
2. Click "Flow-Datei auswählen (.json)" to upload a Node-RED flow JSON file
3. View the analysis results in the table
4. Nodes with Henry-Kafura scores > 100 are highlighted in red as "stress points"

## Test File

A sample Node-RED flow file (`test-flow.json`) is included for testing purposes.

## Technology Stack

- **Vite** - Fast build tool and dev server
- **Vanilla JavaScript** - No framework overhead
- **HTML5 & CSS3** - Modern web standards 

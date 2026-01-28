# System Diagrams

## Package Diagram

Shows the main packages and their dependencies.

```mermaid
graph TB
    subgraph "Core Engine"
        Parser
        Graph
        Metrics
        Reporter
        Types
    end

    subgraph "User Interface"
        UI[Web UI]
        CLI
    end

    Utils

    UI --> Parser
    UI --> Reporter
    CLI --> Parser
    CLI --> Reporter

    Parser --> Types
    Parser --> Utils
    Graph --> Types
    Metrics --> Types
    Metrics --> Graph
    Reporter --> Types
    Reporter --> Graph
    Reporter --> Metrics

    style Parser stroke:#2563eb,stroke-width:3px
    style Graph stroke:#2563eb,stroke-width:3px
    style Metrics stroke:#2563eb,stroke-width:3px
    style Reporter stroke:#2563eb,stroke-width:3px
    style Types stroke:#2563eb,stroke-width:3px
    style UI stroke:#059669,stroke-width:3px
    style CLI stroke:#059669,stroke-width:3px
    style Utils stroke:#d97706,stroke-width:3px
```

## Component Diagram

Shows the main components and their relationships.

```mermaid
graph LR
    subgraph Input
        JSON[Node-RED Flow JSON]
    end

    subgraph Processing
        P[Parser]
        GB[Graph Builder]
        CF[Component Finder]
        MR[Metrics Registry]
        RB[Report Builder]
    end

    subgraph Output
        Report[Analysis Report]
        Viz[Visualization]
    end

    JSON --> P
    P --> GB
    GB --> CF
    CF --> MR
    MR --> RB
    RB --> Report
    Report --> Viz

    style P stroke:#2563eb,stroke-width:3px
    style GB stroke:#2563eb,stroke-width:3px
    style CF stroke:#2563eb,stroke-width:3px
    style MR stroke:#2563eb,stroke-width:3px
    style RB stroke:#2563eb,stroke-width:3px
    style Report stroke:#059669,stroke-width:3px
    style Viz stroke:#059669,stroke-width:3px
```

## Class Diagram - Core Components

```mermaid
classDiagram
    class FlowAnalyzer {
        -parser: FlowParser
        -graphBuilder: GraphBuilder
        -componentFinder: ComponentFinder
        -metricsRegistry: MetricsRegistry
        -reportBuilder: ReportBuilder
        +analyze(flowJson) AnalysisReport
    }

    class FlowParser {
        +parse(json) ParsedFlow
        +validate(json) void
        +getNodesForTab(nodes, tabId) Node[]
    }

    class GraphBuilder {
        +build(nodes, flowId) GraphModel
    }

    class ComponentFinder {
        +findComponents(graph, flowName) ConnectedComponent[]
    }

    class MetricsRegistry {
        -metrics: IMetric[]
        +register(metric) void
        +compute(component) Map~string,MetricResult~
    }

    class ReportBuilder {
        +buildReport(components, metrics) AnalysisReport
    }

    class IMetric {
        <<interface>>
        +id: string
        +name: string
        +category: MetricCategory
        +compute(component) MetricResult
    }

    FlowAnalyzer --> FlowParser
    FlowAnalyzer --> GraphBuilder
    FlowAnalyzer --> ComponentFinder
    FlowAnalyzer --> MetricsRegistry
    FlowAnalyzer --> ReportBuilder
    MetricsRegistry --> IMetric
```

## Data Flow Diagram

```mermaid
flowchart TD
    Start([User uploads flow.json]) --> Parse[Parse JSON]
    Parse --> Validate{Valid?}
    Validate -->|No| Error([Show error])
    Validate -->|Yes| BuildGraph[Build directed graph]

    BuildGraph --> FindComponents[Find connected components]
    FindComponents --> HasComponents{Components found?}

    HasComponents -->|No| Empty([Show no data])
    HasComponents -->|Yes| CalcMetrics[Calculate metrics]

    CalcMetrics --> Size[Size metrics]
    CalcMetrics --> Struct[Structural metrics]
    CalcMetrics --> Complex[Complexity metrics]

    Size --> BuildReport[Build report]
    Struct --> BuildReport
    Complex --> BuildReport

    BuildReport --> Display[Display results]
    Display --> ShowGraph[Render graph visualization]
    Display --> ShowMetrics[Show metrics table]
    Display --> ShowJSON[Provide JSON export]

    ShowGraph --> End([User interacts])
    ShowMetrics --> End
    ShowJSON --> End

    style Parse stroke:#2563eb,stroke-width:3px
    style BuildGraph stroke:#2563eb,stroke-width:3px
    style FindComponents stroke:#2563eb,stroke-width:3px
    style CalcMetrics stroke:#2563eb,stroke-width:3px
    style BuildReport stroke:#2563eb,stroke-width:3px
    style Display stroke:#059669,stroke-width:3px
```

## Metrics Categories

```mermaid
mindmap
  root((Metrics))
    Size
      Vertex Count
      Edge Count
    Structural
      Fan-In
      Fan-Out
      Density
    Complexity
      Cyclomatic
      N-Path
```

## Testing Pyramid

```mermaid
graph TB
    subgraph "Test Suite"
        E2E[End-to-End<br/>29 tests]
        Integration[Integration<br/>50+ tests]
        Unit[Unit<br/>140+ tests]
    end

    E2E --> Integration
    Integration --> Unit

    style E2E stroke:#dc2626,stroke-width:4px
    style Integration stroke:#ea580c,stroke-width:4px
    style Unit stroke:#059669,stroke-width:4px
```

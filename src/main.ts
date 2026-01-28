import './style.css'
import { analyzeFlow } from './core/index'
import type { AnalysisReport, ComponentReport } from './core/types/report.types'
import { GraphView } from './ui/GraphView'

const fileInput = document.querySelector<HTMLInputElement>('#file-input')!
const analyzeButton = document.querySelector<HTMLButtonElement>('#analyze-button')!
const clearButton = document.querySelector<HTMLButtonElement>('#clear-button')!
const fileInfo = document.querySelector<HTMLDivElement>('#file-info')!
const errorMessage = document.querySelector<HTMLDivElement>('#error-message')!
const resultsSection = document.querySelector<HTMLElement>('#results-section')!
const summaryContent = document.querySelector<HTMLDivElement>('#summary-content')!
const componentsContent = document.querySelector<HTMLDivElement>('#components-content')!
const jsonContent = document.querySelector<HTMLPreElement>('#json-content')!
const toggleJsonButton = document.querySelector<HTMLButtonElement>('#toggle-json-button')!

let currentFile: File | null = null
let currentReport: AnalysisReport | null = null

fileInput.addEventListener('change', (event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    currentFile = file
    analyzeButton.disabled = false
    fileInfo.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`
    errorMessage.textContent = ''
  } else {
    currentFile = null
    analyzeButton.disabled = true
    fileInfo.textContent = ''
  }
})

analyzeButton.addEventListener('click', async () => {
  if (!currentFile) return

  try {
    analyzeButton.disabled = true
    analyzeButton.textContent = 'Analyzing...'
    errorMessage.textContent = ''

    const report = await analyzeFile(currentFile)
    currentReport = report

    displayResults(currentReport)
    resultsSection.style.display = 'block'
    clearButton.style.display = 'inline-block'

  } catch (error) {
    errorMessage.textContent = error instanceof Error ? error.message : 'Analysis failed'
    resultsSection.style.display = 'none'
  } finally {
    analyzeButton.disabled = false
    analyzeButton.textContent = 'Analyze Flow'
  }
})

clearButton.addEventListener('click', () => {
  fileInput.value = ''
  currentFile = null
  currentReport = null
  analyzeButton.disabled = true
  fileInfo.textContent = ''
  errorMessage.textContent = ''
  resultsSection.style.display = 'none'
  clearButton.style.display = 'none'
  jsonContent.style.display = 'none'
  toggleJsonButton.textContent = 'Show JSON'
})

toggleJsonButton.addEventListener('click', () => {
  if (jsonContent.style.display === 'none') {
    jsonContent.style.display = 'block'
    toggleJsonButton.textContent = 'Hide JSON'
  } else {
    jsonContent.style.display = 'none'
    toggleJsonButton.textContent = 'Show JSON'
  }
})

/**
 * Analyze a JSON file containing Node-RED flow
 */
async function analyzeFile(file: File): Promise<AnalysisReport> {
  const content = await readFileAsText(file)

  let flowJson: unknown
  try {
    flowJson = JSON.parse(content)
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`)
  }

  try {
    return analyzeFlow(flowJson)
  } catch (error) {
    throw new Error(`Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Read file as text using FileReader API
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Display analysis results
 */
function displayResults(report: AnalysisReport): void {
  displaySummary(report)
  displayComponents(report.components)
  displayRawJSON(report)
}

/**
 * Format report as JSON string
 */
function formatReportJSON(report: AnalysisReport, pretty: boolean = false): string {
  return JSON.stringify(report, null, pretty ? 2 : 0)
}

/**
 * Display summary section
 */
function displaySummary(report: AnalysisReport): void {
  const { summary } = report

  summaryContent.innerHTML = `
    <div class="summary-grid">
      <div class="summary-item">
        <span class="summary-label">Flows:</span>
        <span class="summary-value">${summary.flowCount}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Components:</span>
        <span class="summary-value">${summary.totalComponents}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Analyzed:</span>
        <span class="summary-value">${formatTimestamp(summary.analyzedAt)}</span>
      </div>
    </div>
  `
}

/**
 * Display components with their metrics and inline graphs
 */
function displayComponents(components: ReadonlyArray<ComponentReport>): void {
  if (components.length === 0) {
    componentsContent.innerHTML = '<p class="no-data">No components found in the flow</p>'
    return
  }

  componentsContent.innerHTML = ''

  components.forEach((component, index) => {
    const metricsByCategory = {
      size: [] as Array<[string, any]>,
      structural: [] as Array<[string, any]>,
      complexity: [] as Array<[string, any]>
    };

    Object.entries(component.metrics).forEach(([name, result]) => {
      const category = getMetricCategory(name);
      if (category === 'size') {
        metricsByCategory.size.push([name, result]);
      } else if (category === 'structural') {
        metricsByCategory.structural.push([name, result]);
      } else if (category === 'complexity') {
        metricsByCategory.complexity.push([name, result]);
      }
    });

    metricsByCategory.size.sort((a, b) => a[0].localeCompare(b[0]));
    metricsByCategory.structural.sort((a, b) => a[0].localeCompare(b[0]));
    metricsByCategory.complexity.sort((a, b) => a[0].localeCompare(b[0]));

    const buildCategoryRows = (entries: Array<[string, any]>, category: string) => {
      if (entries.length === 0) return '';
      
      const rows = entries.map(([name, result]) => {
        const interpretation = result.metadata?.interpretation || '';
        return `
          <tr>
            <td class="metric-name">
              <span class="metric-badge metric-badge-${category}">${category}</span>
              ${formatMetricName(name)}
            </td>
            <td class="metric-value">${result.value}</td>
            ${interpretation ? `<td class="metric-interpretation">${interpretation}</td>` : '<td></td>'}
          </tr>
        `;
      }).join('');
      
      return rows;
    };

    const metricsHTML = [
      buildCategoryRows(metricsByCategory.size, 'size'),
      buildCategoryRows(metricsByCategory.structural, 'structural'),
      buildCategoryRows(metricsByCategory.complexity, 'complexity')
    ].join('');

    const card = document.createElement('div')
    card.className = 'component-card'
    card.innerHTML = `
      <div class="component-header">
        <h3>${component.flowName || 'Unnamed Flow'}</h3>
        <span class="component-id">ID: ${component.id}</span>
      </div>
      <div class="component-graph" id="graph-${index}"></div>
      <table class="metrics-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Interpretation</th>
          </tr>
        </thead>
        <tbody>
          ${metricsHTML}
        </tbody>
      </table>
    `
    componentsContent.appendChild(card)

    const graphContainer = card.querySelector<HTMLDivElement>(`#graph-${index}`)
    if (graphContainer) {
      requestAnimationFrame(() => {
        const graphView = new GraphView({
          container: graphContainer,
          layoutOrientation: 'LR',
        })
        graphView.renderFromReport(component)
      })
    }
  })
}

/**
 * Display raw JSON report
 */
function displayRawJSON(report: AnalysisReport): void {
  jsonContent.textContent = formatReportJSON(report, true)
}

/**
 * Get metric category from metric name
 */
function getMetricCategory(metricName: string): string {
  if (metricName.includes('count') || metricName.includes('size')) {
    return 'size'
  }
  if (metricName.includes('complexity') || metricName.includes('cyclomatic') || metricName.includes('npath')) {
    return 'complexity'
  }
  return 'structural'
}

/**
 * Format metric name for display
 */
function formatMetricName(name: string): string {
  return name
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

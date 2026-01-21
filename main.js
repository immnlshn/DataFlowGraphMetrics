// main.js - Node-RED Flow Metrics Analyzer

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadInfo = document.getElementById('uploadInfo');
    const resultsSection = document.getElementById('resultsSection');
    const resultsBody = document.getElementById('resultsBody');
    const resultsTable = document.getElementById('resultsTable');
    const errorMessage = document.getElementById('errorMessage');
    const statsGrid = document.getElementById('statsGrid');

    fileInput.addEventListener('change', handleFileUpload);

    function handleFileUpload(event) {
        const file = event.target.files[0];
        
        if (!file) {
            return;
        }

        uploadInfo.textContent = `Datei: ${file.name}`;
        errorMessage.style.display = 'none';

        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const flowData = JSON.parse(e.target.result);
                analyzeFlow(flowData);
            } catch (error) {
                showError('Fehler beim Parsen der JSON-Datei: ' + error.message);
            }
        };

        reader.onerror = () => {
            showError('Fehler beim Lesen der Datei');
        };

        reader.readAsText(file);
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        resultsSection.style.display = 'none';
    }

    function analyzeFlow(flowData) {
        // Filter out configuration nodes (nodes without wires or typical config types)
        const configTypes = ['mqtt-broker', 'ui_group', 'ui_tab', 'ui_base', 'http-proxy', 
                           'tls-config', 'inject-style', 'ui_template', 'ui_button'];
        
        const nodes = Array.isArray(flowData) ? flowData : [flowData];
        
        // Filter nodes: keep only those with wires or that are referenced in other wires
        const validNodes = nodes.filter(node => {
            // Skip if no id
            if (!node.id) return false;
            
            // Skip common config types
            if (configTypes.includes(node.type)) return false;
            
            // Keep if has wires property (even if empty)
            if (node.wires) return true;
            
            // Check if this node is referenced in any other node's wires
            const isReferenced = nodes.some(otherNode => {
                if (!otherNode.wires || otherNode.id === node.id) return false;
                return otherNode.wires.some(wireArray => 
                    wireArray.some(wireId => wireId === node.id)
                );
            });
            
            return isReferenced;
        });

        // Calculate metrics for each node
        const metricsData = validNodes.map(node => {
            const fanOut = calculateFanOut(node);
            const fanIn = calculateFanIn(node, validNodes);
            const length = calculateLength(node);
            const henryKafura = calculateHenryKafura(fanIn, fanOut, length);

            return {
                id: node.id,
                name: node.name || node.type || 'Unnamed',
                type: node.type || 'Unknown',
                fanIn,
                fanOut,
                length,
                henryKafura
            };
        });

        // Sort by Henry-Kafura score (descending)
        metricsData.sort((a, b) => b.henryKafura - a.henryKafura);

        displayResults(metricsData);
    }

    function calculateFanOut(node) {
        // Fan-out: Count total outgoing connections
        // Sum the length of all arrays within the wires property
        if (!node.wires || !Array.isArray(node.wires)) {
            return 0;
        }

        return node.wires.reduce((total, wireArray) => {
            return total + (Array.isArray(wireArray) ? wireArray.length : 0);
        }, 0);
    }

    function calculateFanIn(node, allNodes) {
        // Fan-in: Count how many times this node's id appears in other nodes' wires
        let count = 0;

        allNodes.forEach(otherNode => {
            if (otherNode.id === node.id || !otherNode.wires) {
                return;
            }

            otherNode.wires.forEach(wireArray => {
                if (Array.isArray(wireArray)) {
                    wireArray.forEach(wireId => {
                        if (wireId === node.id) {
                            count++;
                        }
                    });
                }
            });
        });

        return count;
    }

    function calculateLength(node) {
        // Length factor: 
        // - For 'function' nodes, use the length of the 'func' field
        // - Otherwise, use 1
        if (node.type === 'function' && node.func) {
            return node.func.length;
        }
        return 1;
    }

    function calculateHenryKafura(fanIn, fanOut, length) {
        // Henry-Kafura Metric: (FanIn * FanOut)² * Length
        // Using simplified formula: Complexity = (FanIn * FanOut)²
        // Modified with length factor for function nodes
        const complexity = Math.pow(fanIn * fanOut, 2);
        return complexity * length;
    }

    function displayResults(metricsData) {
        // Clear previous results
        resultsBody.innerHTML = '';

        // Calculate statistics
        const totalNodes = metricsData.length;
        const avgHenryKafura = totalNodes > 0 
            ? (metricsData.reduce((sum, m) => sum + m.henryKafura, 0) / totalNodes).toFixed(2)
            : 0;
        const maxHenryKafura = totalNodes > 0 
            ? Math.max(...metricsData.map(m => m.henryKafura))
            : 0;
        const stressPoints = metricsData.filter(m => m.henryKafura > 100).length;

        // Display statistics cards
        statsGrid.innerHTML = `
            <div class="stat-card">
                <h3>Gesamtanzahl Knoten</h3>
                <div class="value">${totalNodes}</div>
            </div>
            <div class="stat-card">
                <h3>Durchschn. HK-Score</h3>
                <div class="value">${avgHenryKafura}</div>
            </div>
            <div class="stat-card">
                <h3>Max HK-Score</h3>
                <div class="value">${maxHenryKafura}</div>
            </div>
            <div class="stat-card">
                <h3>Stresspunkte (>100)</h3>
                <div class="value">${stressPoints}</div>
            </div>
        `;

        // Populate table
        metricsData.forEach(metric => {
            const row = document.createElement('tr');
            const isStressPoint = metric.henryKafura > 100;
            
            if (isStressPoint) {
                row.classList.add('stress-point');
            }

            row.innerHTML = `
                <td>
                    <strong>${escapeHtml(metric.name)}</strong>
                    <br>
                    <small style="color: #999;">${escapeHtml(metric.type)}</small>
                </td>
                <td class="node-id">${escapeHtml(metric.id)}</td>
                <td class="metric-value">${metric.fanIn}</td>
                <td class="metric-value">${metric.fanOut}</td>
                <td class="${isStressPoint ? 'high-complexity' : 'metric-value'}">
                    ${metric.henryKafura.toFixed(2)}
                    ${isStressPoint ? ' ⚠️' : ''}
                </td>
            `;

            resultsBody.appendChild(row);
        });

        // Show results section
        resultsSection.style.display = 'block';
        resultsTable.style.display = 'table';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});

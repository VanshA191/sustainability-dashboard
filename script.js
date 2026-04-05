// Chart.js Default Configurations for Dim Mode
Chart.defaults.color = '#9CA3AF'; // Muted Silver
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.05)';
Chart.defaults.plugins.tooltip.backgroundColor = '#1F2937';
Chart.defaults.plugins.tooltip.titleColor = '#F9FAFB';
Chart.defaults.plugins.tooltip.bodyColor = '#D1D5DB';
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.1)';
Chart.defaults.plugins.tooltip.borderWidth = 1;

let historicalData, predictionsData, edaData;
let predictionChartInstance;

// Cyber Teal Color Palette
const COLORS = {
    primary: '#14B8A6',    // Teal 500
    secondary: '#475569',  // Slate 600
    accent: '#5EEAD4',     // Teal 300
    danger: '#EF4444',
    warning: '#F59E0B'
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const [historicalRes, predictionsRes, edaRes] = await Promise.all([
            fetch('data/historical_data.json'),
            fetch('data/predictions.json'),
            fetch('data/eda_insights.json')
        ]);

        historicalData = await historicalRes.json();
        predictionsData = await predictionsRes.json();
        edaData = await edaRes.json();

        initKPIs();
        initLiveTracker();
        initCharts();
        initMap();
        initInteractions();

    } catch (err) {
        console.error("Error loading data:", err);
        document.querySelector('.content').innerHTML = `
            <div class="glass-panel" style="padding: 2rem; border-color: var(--danger); text-align: center;">
                <h2 style="color: var(--danger)">System Initialization Failure</h2>
                <p>Data pipeline output missing. Verify algorithmic backend is active.</p>
                <p style="font-family: monospace; margin-top: 1rem; color: var(--text-muted)">${err.message}</p>
            </div>
        `;
    }
});

function initKPIs() {
    document.getElementById('val-co2').innerText = Math.round(edaData.current_co2).toLocaleString();
    document.getElementById('val-renew').innerText = edaData.current_renewable.toFixed(1);
    
    const lastPred = predictionsData['baseline'][predictionsData['baseline'].length - 1];
    document.getElementById('val-pred').innerText = Math.round(lastPred).toLocaleString();

    const formatTrend = (val, isPercent = false, inverse = false) => {
        const prefix = val > 0 ? '+' : '';
        const valStr = `${prefix}${val.toFixed(2)}${isPercent ? '%' : ' pts'}`;
        return {
            text: `${valStr} vs previous chronological year`,
            class: (val > 0) ? (inverse ? 'bad' : 'good') : (inverse ? 'good' : 'bad')
        };
    };

    const co2Trend = formatTrend(edaData.yoy_co2_change_percent, true, true);
    const co2Elem = document.getElementById('trend-co2');
    co2Elem.innerText = co2Trend.text;
    co2Elem.className = `kpi-trend ${co2Trend.class}`;

    const renewTrend = formatTrend(edaData.yoy_renewable_change_points, false, false);
    const renewElem = document.getElementById('trend-renew');
    renewElem.innerText = renewTrend.text;
    renewElem.className = `kpi-trend ${renewTrend.class}`;
}

function initLiveTracker() {
    const annualMt = edaData.current_co2;
    const annualTonnes = annualMt * 1000000;
    const tonnesPerSecond = annualTonnes / (365 * 24 * 60 * 60);

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diffSeconds = (now - startOfYear) / 1000;
    
    let currentEmissions = diffSeconds * tonnesPerSecond;
    const trackerEl = document.getElementById('tracker-val');

    setInterval(() => {
        currentEmissions += tonnesPerSecond;
        trackerEl.innerText = Math.floor(currentEmissions).toLocaleString();
    }, 1000);
}

function initMap() {
    // 1. Global Metrics Map
    const globalMap = L.map('globalMapObj').setView([20, 0], 1);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO', subdomains: 'abcd', maxZoom: 20
    }).addTo(globalMap);

    const globalZones = [
        { name: "Eastern China Industry Matrix", coords: [35, 105], impact: "Critical", value: 12500, color: COLORS.danger },
        { name: "North American Production Belt", coords: [40, -95], impact: "Elevated", value: 6200, color: COLORS.accent },
        { name: "Western Europe Synthesis Hub", coords: [50, 10], impact: "Moderate", value: 3100, color: COLORS.warning },
        { name: "Amazon Resource Deficit", coords: [-10, -55], impact: "Moderate", value: 1200, color: COLORS.warning }
    ];

    globalZones.forEach(zone => {
        const radius = Math.sqrt(zone.value) * 3000;
        const circle = L.circle(zone.coords, { color: zone.color, fillColor: zone.color, fillOpacity: 0.3, radius: radius }).addTo(globalMap);
        circle.bindPopup(`<b>${zone.name}</b><br>Diagnostic Severity: <strong style="color:${zone.color}">${zone.impact}</strong><br>Valuation: ${zone.value} Mt`);
    });

    // 2. India Subcontinent Specific Map
    const indiaMap = L.map('indiaMapObj').setView([22.5937, 78.9629], 4);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO', subdomains: 'abcd', maxZoom: 20
    }).addTo(indiaMap);

    const indiaZones = [
        { name: "Delhi NCR Output Region", coords: [28.6139, 77.2090], impact: "Critical", value: 1450, color: COLORS.danger },
        { name: "Mumbai Heavy Logistics", coords: [19.0760, 72.8777], impact: "Elevated", value: 920, color: COLORS.accent },
        { name: "Chota Nagpur Resource Vector", coords: [23.3, 85.3], impact: "Critical", value: 1800, color: COLORS.danger },
        { name: "Gujarat Processing Belt", coords: [22.2587, 71.1924], impact: "Elevated", value: 850, color: COLORS.accent },
        { name: "Western Ghats Degradation", coords: [13.0, 75.0], impact: "Moderate", value: 300, color: COLORS.warning },
        { name: "Bengaluru Technological Heat", coords: [12.9716, 77.5946], impact: "Nominal", value: 450, color: COLORS.secondary }
    ];

    indiaZones.forEach(zone => {
        const radius = Math.sqrt(zone.value) * 3000;
        const circle = L.circle(zone.coords, { color: zone.color, fillColor: zone.color, fillOpacity: 0.3, radius: radius }).addTo(indiaMap);
        circle.bindPopup(`<b>${zone.name}</b><br>Diagnostic Severity: <strong style="color:${zone.color}">${zone.impact}</strong><br>Valuation: ${zone.value} Mt`);
    });
}

function initCharts() {
    const years = historicalData.map(d => d.Year);
    const co2 = historicalData.map(d => d.CO2_Emissions_Mt);
    const renew = historicalData.map(d => d.Renewable_Energy_Share);
    const gdp = historicalData.map(d => d.GDP_Trillions);

    const predYears = predictionsData.Year;

    // --- NEW GRAPH 1: Energy Transition Matrix (Doughnut Chart) ---
    const ctxDoughnut = document.getElementById('energyMatrixChart').getContext('2d');
    const currentRenewableStr = renew[renew.length - 1];
    const currentFossilStr = 100 - currentRenewableStr;
    
    new Chart(ctxDoughnut, {
        type: 'doughnut',
        data: {
            labels: ['Renewable Infrastructure', 'Fossil Asset Base'],
            datasets: [{
                data: [currentRenewableStr, currentFossilStr],
                backgroundColor: [COLORS.primary, '#374151'], // Teal and Slate
                hoverBackgroundColor: [COLORS.accent, '#D1D5DB'],
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#9CA3AF' } }
            }
        }
    });

    // --- NEW GRAPH 2: Economic Decoupling Scatter Plot ---
    const ctxScatter = document.getElementById('decouplingChart').getContext('2d');
    
    // Map data into {x, y} coordinate objects for the scatter
    const scatterData = historicalData.map((d) => {
        return {
            x: d.GDP_Trillions,
            y: d.CO2_Emissions_Mt,
            year: d.Year
        };
    });

    new Chart(ctxScatter, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'GDP vs CO₂ Map',
                data: scatterData,
                backgroundColor: COLORS.accent, // Burnt Orange dots
                borderColor: COLORS.accent,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: 'Global GDP ($ Trillions)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { title: { display: true, text: 'CO₂ Output (Mt)' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const pt = context.raw;
                            return `Year: ${pt.year} | GDP: ${pt.x.toFixed(1)}T | CO₂: ${Math.round(pt.y)} Mt`;
                        }
                    }
                },
                legend: { display: false }
            }
        }
    });


    // --- EXIST 1: Chronological Chart ---
    const ctxHist = document.getElementById('historicalChart').getContext('2d');
    new Chart(ctxHist, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'CO₂ Output Variance (Mt)',
                    data: co2,
                    borderColor: COLORS.accent, // Burnt Orange
                    backgroundColor: 'rgba(234, 88, 12, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 0
                },
                {
                    label: 'Clean Energy Transition (%)',
                    data: renew,
                    borderColor: COLORS.primary, // Deep Blue
                    yAxisID: 'y1',
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { type: 'linear', display: true, position: 'left', title: {display: true, text: 'Valuation (Mt)'} },
                y1: { type: 'linear', display: true, position: 'right', grid: {drawOnChartArea: false}, title: {display: true, text: 'Index (%)'} },
            }
        }
    });

    // --- EXIST 2: Diagnostic Chart ---
    const ctxEda = document.getElementById('edaChart').getContext('2d');
    const feats = Object.keys(edaData.feature_importances).map(f => f.replace('_', ' '));
    const importances = Object.values(edaData.feature_importances).map(v => v * 100);

    new Chart(ctxEda, {
        type: 'bar',
        data: {
            labels: feats,
            datasets: [{
                label: 'Relative Diagnostic Weight (%)',
                data: importances,
                backgroundColor: COLORS.secondary, // Slate Gray
                borderRadius: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });

    // --- EXIST 3: Projections Chart ---
    renderPredictionChart('baseline');
}

function renderPredictionChart(scenario) {
    const historicalYears = historicalData.map(d => d.Year);
    const co2 = historicalData.map(d => d.CO2_Emissions_Mt);
    const lastHistVal = co2[co2.length - 1];
    
    const predYears = predictionsData.Year;
    const scenarioPreds = predictionsData[scenario];

    const comboYears = [...historicalYears.slice(-10), ...predYears];
    const comboHistorical = [...co2.slice(-10), ...Array(predYears.length).fill(null)];
    const comboPreds = [...Array(10).fill(null).map((_, i) => i === 9 ? lastHistVal : null), ...scenarioPreds];

    const scenarioColors = {
        'baseline': COLORS.primary,    // Blue
        'optimistic': COLORS.secondary,// Slate
        'pessimistic': COLORS.accent   // Orange
    };

    if (predictionChartInstance) {
        predictionChartInstance.destroy();
    }

    const ctxPred = document.getElementById('predictionChart').getContext('2d');
    predictionChartInstance = new Chart(ctxPred, {
        type: 'line',
        data: {
            labels: comboYears,
            datasets: [
                {
                    label: 'Historical Chronolog',
                    data: comboHistorical,
                    borderColor: 'rgba(255,255,255,0.1)',
                    tension: 0.4,
                    borderWidth: 2,
                },
                {
                    label: `Scenario Execution (${scenario})`,
                    data: comboPreds,
                    borderColor: scenarioColors[scenario],
                    backgroundColor: scenarioColors[scenario] + '33',
                    fill: false,
                    borderDash: [5, 5],
                    tension: 0.4,
                    borderWidth: 3,
                    pointBackgroundColor: scenarioColors[scenario],
                    pointRadius: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false }
        }
    });
}

function initInteractions() {
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const scenario = e.target.getAttribute('data-scenario');
            renderPredictionChart(scenario);
        });
    });

    const simBtn = document.getElementById('btn-simulate');
    if(simBtn) {
        simBtn.addEventListener('click', triggerSimulation);
    }

    // Sidebar Navigation Active State
    const navItems = document.querySelectorAll('.nav-links li');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Automatically trigger the simulation pulse every 6 seconds to create a "Live / Active" feel.
    setInterval(triggerSimulation, 6000);
}

function triggerSimulation() {
    // Interactive UI Flash
    const tracker = document.querySelector('.live-tracker');
    if(tracker) {
        tracker.style.borderColor = COLORS.danger;
        tracker.style.boxShadow = `0 0 20px rgba(220, 38, 38, 0.2)`;
        setTimeout(() => {
            tracker.style.borderColor = COLORS.primary;
            tracker.style.boxShadow = 'none';
        }, 600);
    }

    // Spike Ticker
    const trackerEl = document.getElementById('tracker-val');
    if(trackerEl) {
        let currentVal = parseInt(trackerEl.innerText.replace(/,/g, ''));
        if(!isNaN(currentVal)) {
            trackerEl.innerText = Math.floor(currentVal + 50000).toLocaleString();
        }
    }

    // Animate Doughnut Chart dynamically
    const ctxDoughnut = Chart.getChart('energyMatrixChart');
    if(ctxDoughnut && ctxDoughnut.data.datasets.length > 0) {
        let currentRenew = ctxDoughnut.data.datasets[0].data[0];
        let leap = Math.random() * 3; // Jump renewables randomly
        currentRenew = Math.min(100, currentRenew + leap);
        ctxDoughnut.data.datasets[0].data[0] = currentRenew;
        ctxDoughnut.data.datasets[0].data[1] = 100 - currentRenew;
        ctxDoughnut.update();
        
        // Update KPI text dynamically
        const valRenew = document.getElementById('val-renew');
        const trendRenew = document.getElementById('trend-renew');
        if(valRenew && trendRenew) {
            valRenew.innerText = currentRenew.toFixed(1);
            trendRenew.innerText = `+${leap.toFixed(2)} pts simulated`;
            trendRenew.className = 'kpi-trend good';
        }
    }
}

/**
 * OSU Energy Observatory - Enhanced Dashboard
 * With ML Simulator, Section Navigation, and Clear Insights
 */

// ============================================================
// DATA & STATE
// ============================================================

let dashboardData = null;
let currentSection = 'overview';
let monthlyChart = null;
let hourlyChart = null;
let weatherChart = null;
let euiChart = null;
let simulatorChart = null;
let simulatorFocusBuildings = [];

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  loadDashboardData();
  setupNavigation();
  setupSimulator();
});

async function loadDashboardData() {
  try {
    const response = await fetch('data/dashboard_data.json');
    dashboardData = await response.json();
    console.log('Dashboard data loaded:', dashboardData);
  } catch (error) {
    console.log('Using sample data');
    dashboardData = getSampleData();
  }
  initializeAllCharts();
  renderBuildingLists();
  renderFeatureImportance();
  renderRecommendationTargets();
  populateSimulatorFocusOptions(true);
  renderSimulatorPriorityBuildings();
  updateOverviewStats();
  updateInsights();
  updateSimulation();
}

// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = item.dataset.section;

      // Update nav state
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      // Update section visibility
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.getElementById(sectionId).classList.add('active');

      currentSection = sectionId;

      // Reinitialize charts if needed
      if (sectionId === 'insights' && !weatherChart) {
        setTimeout(initWeatherScatter, 100);
      }
      if (sectionId === 'patterns' && !hourlyChart) {
        setTimeout(() => {
          initHeatmap();
          initHourlyChart();
        }, 100);
      }
      if (sectionId === 'buildings' && !euiChart) {
        setTimeout(initEUIChart, 100);
      }
      if (sectionId === 'simulator') {
        setTimeout(() => {
          if (simulatorChart) simulatorChart.resize();
          updateSimulation();
        }, 100);
      }
    });
  });

  // Chart tabs
  const colors = {
    ELECTRICITY: '#fbbf24',
    HEAT: '#ff6b35',
    COOLING: '#00d4ff'
  };

  document.querySelectorAll('.chart-tab').forEach(tab => {
    // Set initial color for active tab
    if (tab.classList.contains('active')) {
      tab.style.backgroundColor = colors[tab.dataset.utility];
      tab.style.color = '#0a0e14';
    }

    tab.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(t => {
        t.classList.remove('active');
        t.style.backgroundColor = '';
        t.style.color = '';
      });
      tab.classList.add('active');

      // Set color based on utility
      tab.style.backgroundColor = colors[tab.dataset.utility];
      tab.style.color = '#0a0e14';

      updateMonthlyChart(tab.dataset.utility);
    });
  });
}

// ============================================================
// SAMPLE DATA
// ============================================================

function getSampleData() {
  return {
    summary: { total_electricity_mwh: 68732.9, total_buildings: 279 },
    campus_overview: {
      utility_totals: [
        { utility: "ELECTRICITY", total_mwh: 68732.9 },
        { utility: "HEAT", total_mwh: 23456.7 },
        { utility: "COOLING", total_mwh: 18234.5 }
      ],
      monthly_trends: generateMonthlyTrends()
    },
    buildings: {
      top_consumers: generateTopBuildings(),
      retrofit_candidates: generateRetrofitBuildings(),
      map_data: generateMapData()
    },
    time_patterns: {
      hourly_profile: generateHourlyProfile(),
      heatmap: generateHeatmapData()
    },
    models: {
      feature_importance: [
        { feature: "Day of Week", importance: 0.095 },
        { feature: "Cooling Degree Days", importance: 0.093 },
        { feature: "Apparent Temperature", importance: 0.087 },
        { feature: "Heating Degree Days", importance: 0.065 },
        { feature: "Temperature", importance: 0.063 },
        { feature: "Hour of Day", importance: 0.058 },
        { feature: "Cloud Cover", importance: 0.045 },
        { feature: "Humidity", importance: 0.042 }
      ]
    }
  };
}

function generateMonthlyTrends() {
  const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
                  '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];
  const data = [];
  months.forEach(month => {
    const m = parseInt(month.split('-')[1]);
    data.push({ month, utility: 'ELECTRICITY', energy_mwh: 5500 + Math.sin((m - 1) / 12 * Math.PI * 2) * 800 + Math.random() * 300 });
    data.push({ month, utility: 'HEAT', energy_mwh: 2500 + Math.cos((m - 1) / 12 * Math.PI * 2) * 1800 + Math.random() * 200 });
    data.push({ month, utility: 'COOLING', energy_mwh: 1800 - Math.cos((m - 1) / 12 * Math.PI * 2) * 1200 + Math.random() * 200 });
  });
  return data;
}

function generateTopBuildings() {
  return [
    { building_name: "Wexner Medical Center", total_energy: 25000000, mean_eui: 42.5, gross_area: 589000 },
    { building_name: "Ohio Stadium", total_energy: 18500000, mean_eui: 28.3, gross_area: 654000 },
    { building_name: "Thompson Library", total_energy: 12800000, mean_eui: 35.2, gross_area: 363500 },
    { building_name: "RPAC", total_energy: 11200000, mean_eui: 38.7, gross_area: 289000 },
    { building_name: "Ohio Union", total_energy: 9800000, mean_eui: 32.1, gross_area: 305000 },
    { building_name: "Biomedical Research Tower", total_energy: 8900000, mean_eui: 45.8, gross_area: 194000 },
    { building_name: "Physics Research Building", total_energy: 7600000, mean_eui: 41.2, gross_area: 184500 },
    { building_name: "Knowlton Hall", total_energy: 6500000, mean_eui: 29.4, gross_area: 221000 }
  ];
}

function generateRetrofitBuildings() {
  return [
    { building_name: "Orton Hall (1893)", building_age: 132, mean_eui: 58.2, retrofit_priority: 0.95 },
    { building_name: "Hayes Hall (1893)", building_age: 132, mean_eui: 52.8, retrofit_priority: 0.91 },
    { building_name: "Page Hall (1923)", building_age: 102, mean_eui: 48.5, retrofit_priority: 0.85 },
    { building_name: "Derby Hall (1906)", building_age: 119, mean_eui: 45.3, retrofit_priority: 0.82 },
    { building_name: "Denney Hall (1927)", building_age: 98, mean_eui: 42.8, retrofit_priority: 0.78 },
    { building_name: "Arps Hall (1926)", building_age: 99, mean_eui: 41.2, retrofit_priority: 0.75 },
    { building_name: "Stillman Hall (1915)", building_age: 110, mean_eui: 39.8, retrofit_priority: 0.72 },
    { building_name: "Mendenhall Lab (1904)", building_age: 121, mean_eui: 38.5, retrofit_priority: 0.68 }
  ];
}

function generateMapData() {
  const buildings = [];
  const centerLat = 40.0067, centerLng = -83.0305;
  for (let i = 0; i < 50; i++) {
    buildings.push({
      building_name: `Building ${i + 1}`,
      latitude: centerLat + (Math.random() - 0.5) * 0.02,
      longitude: centerLng + (Math.random() - 0.5) * 0.02,
      total_energy: Math.random() * 5000000,
      mean_eui: 15 + Math.random() * 35,
      gross_area: 20000 + Math.random() * 100000
    });
  }
  return buildings;
}

function generateHourlyProfile() {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    avg_energy: 2800 + Math.sin((hour - 6) / 24 * Math.PI * 2) * 1500 + (hour >= 9 && hour <= 17 ? 800 : 0)
  }));
}

function generateHeatmapData() {
  const data = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  for (let day = 0; day < 7; day++) {
    const isWeekend = day >= 5; // Saturday & Sunday

    for (let hour = 0; hour < 24; hour++) {
      // Base energy varies by day type
      let baseEnergy = isWeekend ? 2200 : 3500;

      // Time of day pattern (sinusoidal with peak in afternoon)
      const hourMod = Math.sin((hour - 6) / 24 * Math.PI * 2) * 1200;

      // Weekday business hours peak (9am-5pm)
      const peakMod = (!isWeekend && hour >= 9 && hour <= 17) ? 1200 : 0;

      // Weekend has different pattern - lower overall, peaks around noon
      const weekendMod = isWeekend && hour >= 10 && hour <= 16 ? 400 : 0;

      data.push({
        day_of_week: day,
        day_name: days[day],
        hour,
        energy_kwh: baseEnergy + hourMod + peakMod + weekendMod + Math.random() * 300
      });
    }
  }
  return data;
}

// ============================================================
// CHARTS INITIALIZATION
// ============================================================

async function initializeAllCharts() {
  await initMap(); // Wait for map to load building data
  initUtilityPieChart();
  initMonthlyChart();
  initHeatmap();
  initWeatherScatter();
  initHourlyChart();
  initEUIChart();
}

// ===== UTILITY PIE CHART =====
function initUtilityPieChart() {
  const ctx = document.getElementById('utility-pie-chart')?.getContext('2d');
  if (!ctx) return;

  const colors = {
    electricity: { bg: 'rgba(0, 212, 255, 0.8)', border: 'rgba(0, 212, 255, 1)' },
    heating: { bg: 'rgba(255, 107, 53, 0.8)', border: 'rgba(255, 107, 53, 1)' },
    cooling: { bg: 'rgba(0, 255, 136, 0.8)', border: 'rgba(0, 255, 136, 1)' },
    gas: { bg: 'rgba(168, 85, 247, 0.8)', border: 'rgba(168, 85, 247, 1)' }
  };

  const data = {
    labels: ['Electricity', 'Heating', 'Cooling', 'Natural Gas'],
    datasets: [{
      data: [68.7, 23.5, 18.2, 12.6],
      backgroundColor: [
        colors.electricity.bg,
        colors.heating.bg,
        colors.cooling.bg,
        colors.gas.bg
      ],
      borderColor: [
        colors.electricity.border,
        colors.heating.border,
        colors.cooling.border,
        colors.gas.border
      ],
      borderWidth: 3,
      hoverOffset: 15,
      hoverBorderWidth: 4
    }]
  };

  new Chart(ctx, {
    type: 'doughnut',
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'center',
          labels: {
            color: '#f0f4f8',
            font: {
              family: 'Space Mono',
              size: 12,
              weight: '500'
            },
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle',
            generateLabels: (chart) => {
              const data = chart.data;
              const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                const percentage = ((value / total) * 100).toFixed(1);
                return {
                  text: `${label}: ${value} GWh (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor[i],
                  lineWidth: 2,
                  hidden: false,
                  index: i,
                  fontColor: '#f0f4f8' // Explicit font color for each label
                };
              });
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 32, 0.98)',
          bodyColor: '#f0f4f8',
          borderWidth: 2,
          padding: 16,
          displayColors: true,
          boxWidth: 15,
          boxHeight: 15,
          usePointStyle: true,
          callbacks: {
            title: (context) => {
              return context[0].label;
            },
            label: (context) => {
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return [
                `Energy: ${value} GWh`,
                `Percentage: ${percentage}%`,
                `Annual Cost: ~$${(value * 100).toFixed(0)}K`
              ];
            },
            // Store the slice color for titleColor and borderColor
            beforeTitle: (context) => {
              const idx = context[0].dataIndex;
              const sliceColor = context[0].chart.data.datasets[0].borderColor[idx];
              context[0].chart.tooltip._sliceColor = sliceColor;
            },
            titleColor: (context) => {
              return context.chart.tooltip._sliceColor || '#00d4ff';
            }
          },
          // Dynamic border color matching the slice
          borderColor: (context) => {
            const tooltip = context.chart.tooltip;
            if (tooltip && tooltip._sliceColor) {
              return tooltip._sliceColor;
            }
            return 'rgba(0, 212, 255, 0.5)';
          }
        }
      },
      cutout: '65%',
      radius: '90%',
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1500,
        easing: 'easeInOutQuart'
      }
    }
  });
}

// ===== MAP =====
async function initMap() {
  const map = L.map('campus-map', { zoomControl: true }).setView([40.00160797506397, -83.02065110905887], 15);

  // Use dark CartoDB tiles to match the OSU EUI map
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    attribution: ''
  }).addTo(map);

  // Load real OSU building data
  let buildingData;
  try {
    const response = await fetch('building_markers.json');
    buildingData = await response.json();
    // Cache building data globally for other charts
    window.buildingDataCache = buildingData;
  } catch (error) {
    console.error('Could not load building data:', error);
    return;
  }

  const buildings = buildingData.buildings;

  // Calculate EUI statistics for categorization
  const euiValues = buildings.map(b => b.eui);
  const maxEui = Math.max(...euiValues);
  const minEui = Math.min(...euiValues);

  // Add all OSU buildings to the map
  buildings.forEach(b => {
    // Determine marker style based on EUI and whether it's the highest
    const markerOptions = {
      radius: b.radius,
      fillColor: b.fillColor,
      fillOpacity: 0.6,
      weight: b.weight,
      opacity: 1.0
    };

    // Special styling for the highest EUI building
    if (b.is_highest) {
      markerOptions.color = '#FFFFFF';
      markerOptions.weight = 3;
      markerOptions.fillOpacity = 0.9;
    } else if (b.strokeColor) {
      markerOptions.color = b.strokeColor;
    } else {
      markerOptions.color = null;
    }

    // Categorize EUI based on the actual marker color
    let euiCategory = 'Low';
    const fillColorLower = b.fillColor.toLowerCase();

    if (fillColorLower.includes('#e31a1c') || fillColorLower.includes('red')) {
      euiCategory = 'High';
    } else if (fillColorLower.includes('#5cfe69') || fillColorLower.includes('green')) {
      euiCategory = 'Medium';
    } else {
      euiCategory = 'Low';
    }

    // Use the marker's actual color for EUI value display
    const euiColor = b.fillColor;

    // Create circle marker
    const marker = L.circleMarker([b.lat, b.lng], markerOptions);

    // Create popup with building information
    const popupContent = `
      <div style="font-family: 'Space Mono', monospace; min-width: 220px;">
        <strong style="color: ${b.fillColor}; font-size: 14px;">${b.name}</strong>
        <div style="color: #8899a6; font-size: 11px; margin-top: 2px;">ID: ${b.id}</div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid ${b.fillColor}40;">
          <div style="margin: 6px 0;">
            <span style="color: #8899a6;">EUI:</span>
            <strong style="color: ${euiColor}; font-size: 16px; margin-left: 8px;">${b.eui.toFixed(1)} kWh/sqft/yr</strong>
            ${b.is_highest ? '<br><span style="color: #e31a1c; font-weight: bold; font-size: 11px;">⚠️ HIGHEST</span>' : ''}
            <span style="color: #8899a6; font-size: 11px; display: block; margin-top: 2px;">(${euiCategory} Usage)</span>
          </div>
          <div style="margin: 6px 0;">
            <span style="color: #8899a6;">Area:</span>
            <strong style="color: #fff; margin-left: 8px;">${formatNumber(b.area)} sqft</strong>
          </div>
        </div>
      </div>
    `;

    const popup = L.popup({
      className: 'custom-popup'
    }).setContent(popupContent);

    marker.bindPopup(popup);

    // Set popup border color to match marker when opened
    marker.on('popupopen', (e) => {
      const popupElement = e.popup._container;
      const wrapper = popupElement.querySelector('.leaflet-popup-content-wrapper');
      const tip = popupElement.querySelector('.leaflet-popup-tip');
      if (wrapper) {
        wrapper.style.borderColor = b.fillColor;
        wrapper.style.borderWidth = '2px';
      }
      if (tip) {
        tip.style.backgroundColor = 'rgba(17, 24, 32, 0.9)';
        tip.style.borderTopColor = b.fillColor;
        tip.style.borderLeftColor = b.fillColor;
      }
    });
    marker.addTo(map);
  });

  // Add legend to the map
  addMapLegend(map);
}

function addMapLegend(map) {
  const legend = L.control({ position: 'bottomleft' });

  legend.onAdd = function() {
    const div = L.DomUtil.create('div', 'map-legend-overlay');
    div.style.cssText = `
      background-color: rgba(17, 24, 32, 0.95);
      border: 2px solid rgba(0, 212, 255, 0.4);
      border-radius: 8px;
      padding: 12px;
      font-family: 'Space Mono', monospace;
      font-size: 12px;
      color: #f0f4f8;
      min-width: 200px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    `;

    div.innerHTML = `
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #00d4ff; border-bottom: 1px solid rgba(0, 212, 255, 0.3); padding-bottom: 6px;">EUI (kWh/sqft/yr)</p>
      <div style="display: flex; align-items: center; margin: 6px 0;">
        <span style="background-color: #1ab3d5; width: 24px; height: 12px; display: inline-block; margin-right: 8px; border-radius: 2px;"></span>
        <span>Low (0-4.5)</span>
      </div>
      <div style="display: flex; align-items: center; margin: 6px 0;">
        <span style="background-color: #5cfe69; width: 24px; height: 12px; display: inline-block; margin-right: 8px; border-radius: 2px;"></span>
        <span>Medium (4.5-7.5)</span>
      </div>
      <div style="display: flex; align-items: center; margin: 6px 0;">
        <span style="background-color: #e31a1c; width: 24px; height: 12px; display: inline-block; margin-right: 8px; border-radius: 2px;"></span>
        <span>High (7.5+)</span>
      </div>
      <div style="display: flex; align-items: center; margin: 6px 0;">
        <span style="background-color: #e31a1c; width: 24px; height: 12px; display: inline-block; margin-right: 8px; border: 2px solid #fff; border-radius: 2px;"></span>
        <span style="font-size: 10px;">Highest (433k+)</span>
      </div>
    `;

    return div;
  };

  legend.addTo(map);
}

// ===== MONTHLY CHART =====
function initMonthlyChart() {
  const ctx = document.getElementById('monthly-chart')?.getContext('2d');
  if (!ctx) return;
  
  const monthlyData = dashboardData.campus_overview?.monthly_trends || generateMonthlyTrends();
  const electricityData = monthlyData.filter(d => d.utility === 'ELECTRICITY');
  
  const labels = electricityData.map(d => {
    const [year, month] = d.month.split('-');
    return new Date(year, parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' });
  });
  
  monthlyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Energy (MWh)',
        data: electricityData.map(d => d.energy_mwh),
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: '#fbbf24',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    },
    options: getChartOptions('Energy (MWh)', 'Month')
  });
}

function updateMonthlyChart(utility) {
  if (!monthlyChart) return;

  const monthlyData = dashboardData.campus_overview?.monthly_trends || generateMonthlyTrends();
  const filtered = monthlyData.filter(d => d.utility === utility);

  const colors = {
    ELECTRICITY: { border: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)' },
    HEAT: { border: '#ff6b35', bg: 'rgba(255, 107, 53, 0.1)' },
    COOLING: { border: '#00d4ff', bg: 'rgba(0, 212, 255, 0.1)' }
  };

  monthlyChart.data.datasets[0].data = filtered.map(d => d.energy_mwh);
  monthlyChart.data.datasets[0].borderColor = colors[utility].border;
  monthlyChart.data.datasets[0].backgroundColor = colors[utility].bg;
  monthlyChart.data.datasets[0].pointBackgroundColor = colors[utility].border;
  monthlyChart.update('active');
}

// ===== WEATHER SCATTER =====
function initWeatherScatter() {
  const ctx = document.getElementById('weather-scatter')?.getContext('2d');
  if (!ctx) return;
  
  // U-shaped curve data
  const scatterData = [];
  for (let temp = 10; temp <= 100; temp += 3) {
    const baseEnergy = temp < 55 
      ? 4200 + (55 - temp) * 80  // Heating zone
      : temp > 70
      ? 3500 + (temp - 70) * 70  // Cooling zone
      : 3200 + Math.random() * 400;  // Optimal zone
    
    // Add some variance
    for (let i = 0; i < 3; i++) {
      scatterData.push({ 
        x: temp + (Math.random() - 0.5) * 4, 
        y: baseEnergy + (Math.random() - 0.5) * 600 
      });
    }
  }
  
  weatherChart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Energy vs Temperature',
        data: scatterData,
        backgroundColor: scatterData.map(d => {
          if (d.x < 55) return 'rgba(255, 107, 53, 0.6)';
          if (d.x > 70) return 'rgba(0, 212, 255, 0.6)';
          return 'rgba(0, 255, 136, 0.6)';
        }),
        pointRadius: 5,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 32, 0.95)',
          titleColor: '#00d4ff',
          bodyColor: '#f0f4f8',
          callbacks: {
            label: ctx => `${ctx.parsed.x.toFixed(0)}°F → ${formatNumber(ctx.parsed.y)} kWh`
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Temperature (°F)', color: '#8899a6', font: { family: 'Space Mono' } },
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#8899a6', font: { family: 'Space Mono' } }
        },
        y: {
          title: { display: true, text: 'Energy (kWh)', color: '#8899a6', font: { family: 'Space Mono' } },
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#8899a6', font: { family: 'Space Mono' }, callback: v => formatNumber(v) }
        }
      }
    }
  });
}

// ===== HOURLY CHART =====
function initHourlyChart() {
  const ctx = document.getElementById('hourly-chart')?.getContext('2d');
  if (!ctx) return;

  const hourlyData = dashboardData.time_patterns?.hourly_profile || generateHourlyProfile();

  // Calculate min/max for normalization (same as heatmap)
  const values = hourlyData.map(d => d.avg_energy);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  hourlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hourlyData.map(d => `${d.hour}:00`),
      datasets: [{
        label: 'Avg Energy (kWh)',
        data: hourlyData.map(d => d.avg_energy),
        backgroundColor: hourlyData.map(d => {
          // Normalize and use same color scale as heatmap
          const normalized = (d.avg_energy - minVal) / (maxVal - minVal);
          return getHeatmapColor(normalized);
        }),
        borderRadius: 4
      }]
    },
    options: {
      ...getChartOptions('Average Energy (kWh)', 'Hour of Day'),
      plugins: {
        ...getChartOptions('Average Energy (kWh)', 'Hour of Day').plugins,
        tooltip: {
          backgroundColor: 'rgba(17, 24, 32, 0.95)',
          bodyColor: '#f0f4f8',
          borderWidth: 2,
          padding: 12,
          callbacks: {
            title: (context) => {
              const hour = hourlyData[context[0].dataIndex].hour;
              return `Hour: ${hour}:00 - ${hour + 1}:00`;
            },
            label: (context) => {
              const value = context.parsed.y;
              const normalized = (value - minVal) / (maxVal - minVal);
              const percentile = (normalized * 100).toFixed(0);
              return [
                `Energy: ${formatNumber(value)} kWh`,
                `Usage Level: ${percentile}th percentile`,
                `vs Min: +${((value - minVal) / minVal * 100).toFixed(0)}%`,
                `vs Max: ${((value / maxVal) * 100).toFixed(0)}%`
              ];
            },
            beforeTitle: (context) => {
              // Set title and border color to match bar color
              const idx = context[0].dataIndex;
              const value = hourlyData[idx].avg_energy;
              const normalized = (value - minVal) / (maxVal - minVal);
              const barColor = getHeatmapColor(normalized);

              // Store color for use in titleColor and borderColor callbacks
              context[0].chart.tooltip._barColor = barColor;
            },
            titleColor: (context) => {
              return context.chart.tooltip._barColor || '#00d4ff';
            }
          },
          // Dynamic border color
          borderColor: (context) => {
            const tooltip = context.chart.tooltip;
            if (tooltip && tooltip._barColor) {
              return tooltip._barColor;
            }
            return 'rgba(0, 212, 255, 0.3)';
          }
        }
      }
    }
  });
}

// ===== EUI CHART =====
function initEUIChart() {
  const ctx = document.getElementById('eui-chart')?.getContext('2d');
  if (!ctx) return;

  // Use actual building data from the map
  let euiValues = [];

  // Try to get real building data
  if (window.buildingDataCache && window.buildingDataCache.buildings) {
    euiValues = window.buildingDataCache.buildings.map(b => b.eui);
    console.log('EUI Chart: Using real building data from', euiValues.length, 'buildings');
  } else {
    // Generate realistic sample data if building data not loaded yet
    console.warn('EUI Chart: Building data not loaded, using sample data');
    euiValues = Array.from({ length: 100 }, () => {
      // Generate realistic distribution
      const rand = Math.random();
      if (rand < 0.3) return Math.random() * 2.5; // 30% very efficient
      if (rand < 0.5) return 2.5 + Math.random() * 2.5; // 20% efficient
      if (rand < 0.7) return 5 + Math.random() * 2.5; // 20% good
      if (rand < 0.85) return 7.5 + Math.random() * 2.5; // 15% moderate
      if (rand < 0.95) return 10 + Math.random() * 5; // 10% high
      return 15 + Math.random() * 10; // 5% very high
    });
  }

  // Create EUI distribution bins
  const bins = [
    { label: '0-2.5', min: 0, max: 2.5, count: 0, color: 'rgba(0, 212, 255, 0.8)' },
    { label: '2.5-5', min: 2.5, max: 5, count: 0, color: 'rgba(0, 255, 136, 0.8)' },
    { label: '5-7.5', min: 5, max: 7.5, count: 0, color: 'rgba(100, 255, 100, 0.8)' },
    { label: '7.5-10', min: 7.5, max: 10, count: 0, color: 'rgba(251, 191, 36, 0.8)' },
    { label: '10-15', min: 10, max: 15, count: 0, color: 'rgba(255, 150, 50, 0.8)' },
    { label: '15-25', min: 15, max: 25, count: 0, color: 'rgba(255, 107, 53, 0.8)' },
    { label: '25+', min: 25, max: Infinity, count: 0, color: 'rgba(220, 38, 38, 0.8)' }
  ];

  // Count buildings in each bin
  euiValues.forEach(eui => {
    for (let bin of bins) {
      if (eui >= bin.min && eui < bin.max) {
        bin.count++;
        break;
      }
    }
  });

  euiChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: bins.map(b => b.label),
      datasets: [{
        label: 'Number of Buildings',
        data: bins.map(b => b.count),
        backgroundColor: bins.map(b => b.color),
        borderRadius: 6,
        borderWidth: 0
      }]
    },
    options: {
      ...getChartOptions('Number of Buildings', 'EUI Range (kWh/sqft/yr)'),
      plugins: {
        ...getChartOptions('Number of Buildings', 'EUI Range (kWh/sqft/yr)').plugins,
        tooltip: {
          backgroundColor: 'rgba(17, 24, 32, 0.98)',
          titleColor: '#00d4ff',
          bodyColor: '#f0f4f8',
          borderWidth: 2,
          borderColor: 'rgba(0, 212, 255, 0.5)',
          padding: 16,
          callbacks: {
            title: (context) => {
              return `EUI: ${context[0].label} kWh/sqft/yr`;
            },
            label: (context) => {
              const count = context.parsed.y;
              const total = euiValues.length;
              const percentage = ((count / total) * 100).toFixed(1);
              return [
                `Buildings: ${count}`,
                `Percentage: ${percentage}% of campus`,
                `Total Buildings: ${total}`
              ];
            }
          }
        }
      }
    }
  });
}

// ===== HEATMAP =====
function initHeatmap() {
  const container = document.getElementById('heatmap-container');
  if (!container) return;

  const heatmapData = dashboardData.time_patterns?.heatmap || generateHeatmapData();
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const values = heatmapData.map(d => d.energy_kwh);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  // Header row: empty corner + hours
  let html = '<div class="heatmap-label"></div>';
  for (let hour = 0; hour < 24; hour++) {
    html += `<div class="heatmap-label">${hour.toString().padStart(2, '0')}</div>`;
  }

  // Data rows: day label + cells
  for (let day = 0; day < 7; day++) {
    html += `<div class="heatmap-label">${days[day]}</div>`;
    for (let hour = 0; hour < 24; hour++) {
      const cell = heatmapData.find(d => d.hour === hour && d.day_of_week === day);
      const value = cell ? cell.energy_kwh : 0;
      const normalized = (value - minVal) / (maxVal - minVal);
      const color = getHeatmapColor(normalized);
      const percentile = (normalized * 100).toFixed(0);

      html += `<div class="heatmap-cell"
               style="background: ${color}"
               data-day="${days[day]}"
               data-hour="${hour}"
               data-value="${value}"
               data-percentile="${percentile}"
               data-min="${minVal}"
               data-max="${maxVal}"></div>`;
    }
  }

  container.innerHTML = html;

  // Add custom tooltip
  setupHeatmapTooltip();
}

function setupHeatmapTooltip() {
  // Create tooltip element
  let tooltip = document.getElementById('heatmap-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'heatmap-tooltip';
    tooltip.style.cssText = `
      position: fixed;
      background: rgba(17, 24, 32, 0.98);
      border: 1px solid rgba(0, 212, 255, 0.4);
      border-radius: 8px;
      padding: 12px;
      font-family: 'Space Mono', monospace;
      font-size: 12px;
      color: #f0f4f8;
      pointer-events: none;
      z-index: 10000;
      display: none;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      min-width: 200px;
    `;
    document.body.appendChild(tooltip);
  }

  const cells = document.querySelectorAll('.heatmap-cell');
  cells.forEach(cell => {
    cell.addEventListener('mouseenter', (e) => {
      const day = cell.dataset.day;
      const hour = parseInt(cell.dataset.hour);
      const value = parseFloat(cell.dataset.value);
      const percentile = cell.dataset.percentile;
      const minVal = parseFloat(cell.dataset.min);
      const maxVal = parseFloat(cell.dataset.max);

      // Get the cell's color
      const normalized = (value - minVal) / (maxVal - minVal);
      const tileColor = getHeatmapColor(normalized);

      // Format as Day Hour:00
      const hourStr = hour.toString().padStart(2, '0');
      const dateStr = `${day} ${hourStr}:00`;

      const vsMin = ((value - minVal) / minVal * 100).toFixed(0);
      const vsMax = ((value / maxVal) * 100).toFixed(0);

      // Update tooltip border color to match tile
      tooltip.style.borderColor = tileColor;

      tooltip.innerHTML = `
        <div style="color: ${tileColor}; font-weight: bold; margin-bottom: 8px;">${dateStr}</div>
        <div style="margin-bottom: 4px;">
          <span style="color: #8899a6;">Energy:</span>
          <strong style="color: #fff; margin-left: 8px;">${formatNumber(value)} kWh</strong>
        </div>
        <div style="margin-bottom: 4px;">
          <span style="color: #8899a6;">Usage Level:</span>
          <strong style="margin-left: 8px;">${percentile}th percentile</strong>
        </div>
        <div style="font-size: 10px; color: #8899a6; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1);">
          vs Min: +${vsMin}% | vs Max: ${vsMax}%
        </div>
      `;

      tooltip.style.display = 'block';
      updateTooltipPosition(e);
    });

    cell.addEventListener('mousemove', updateTooltipPosition);

    cell.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });
  });

  function updateTooltipPosition(e) {
    const tooltipRect = tooltip.getBoundingClientRect();
    let x = e.clientX + 15;
    let y = e.clientY + 15;

    // Keep tooltip within viewport
    if (x + tooltipRect.width > window.innerWidth) {
      x = e.clientX - tooltipRect.width - 15;
    }
    if (y + tooltipRect.height > window.innerHeight) {
      y = e.clientY - tooltipRect.height - 15;
    }

    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }
}

function getHeatmapColor(normalized) {
  // Use power scale to emphasize high values (red zones)
  const emphasizedValue = Math.pow(normalized, 0.5); // Square root makes high values more prominent

  // Blue (low) → Cyan → Green → Yellow → Orange → Red (high)
  if (emphasizedValue < 0.2) {
    // Dark blue to cyan (very low usage)
    return `hsl(200, 100%, ${15 + emphasizedValue * 100}%)`;
  } else if (emphasizedValue < 0.4) {
    // Cyan to green (low to moderate usage)
    const local = (emphasizedValue - 0.2) / 0.2;
    return `hsl(${200 - local * 80}, 100%, 50%)`;
  } else if (emphasizedValue < 0.6) {
    // Green to yellow (moderate usage)
    const local = (emphasizedValue - 0.4) / 0.2;
    return `hsl(${120 - local * 60}, 100%, 50%)`;
  } else if (emphasizedValue < 0.8) {
    // Yellow to orange (high usage)
    const local = (emphasizedValue - 0.6) / 0.2;
    return `hsl(${60 - local * 30}, 100%, 55%)`;
  } else {
    // Orange to red (peak usage - RED ZONES)
    const local = (emphasizedValue - 0.8) / 0.2;
    return `hsl(${30 - local * 30}, 100%, ${55 + local * 5}%)`;
  }
}

// ============================================================
// BUILDING LISTS
// ============================================================

function renderBuildingLists() {
  renderTopConsumers();
  renderRetrofitList();
}

function renderTopConsumers() {
  const container = document.getElementById('top-consumers-list');
  if (!container) return;
  
  const buildings = dashboardData.buildings?.top_consumers || generateTopBuildings();
  
  container.innerHTML = buildings.slice(0, 8).map((b, i) => `
    <div class="building-item">
      <div class="building-rank">${i + 1}</div>
      <div class="building-info">
        <div class="building-name">${b.building_name}</div>
        <div class="building-meta">EUI: ${(b.mean_eui || 25).toFixed(1)} kWh/sqft</div>
      </div>
      <div class="building-value">
        <div class="building-value-num">${formatNumber((b.total_energy || 0) / 1000000)}</div>
        <div class="building-value-unit">GWh/yr</div>
      </div>
    </div>
  `).join('');
}

function renderRetrofitList() {
  const container = document.getElementById('retrofit-list');
  if (!container) return;
  
  const buildings = dashboardData.buildings?.retrofit_candidates || generateRetrofitBuildings();
  
  container.innerHTML = buildings.slice(0, 8).map((b, i) => `
    <div class="building-item">
      <div class="building-rank" style="background: rgba(0, 255, 136, 0.2); color: #00ff88;">${i + 1}</div>
      <div class="building-info">
        <div class="building-name">${b.building_name}</div>
        <div class="building-meta">${Math.round(b.building_age || 50)} years old</div>
      </div>
      <div class="building-value">
        <div class="building-value-num" style="color: #ff6b35;">${(b.mean_eui || 40).toFixed(1)}</div>
        <div class="building-value-unit">EUI</div>
      </div>
    </div>
  `).join('');
}

// ============================================================
// FEATURE IMPORTANCE
// ============================================================

function renderFeatureImportance() {
  const container = document.getElementById('feature-bars');
  if (!container) return;
  
  const features = dashboardData.models?.feature_importance || [
    { feature: "Day of Week", importance: 0.095 },
    { feature: "Cooling Degree Days", importance: 0.093 },
    { feature: "Apparent Temperature", importance: 0.087 },
    { feature: "Heating Degree Days", importance: 0.065 },
    { feature: "Temperature", importance: 0.063 },
    { feature: "Hour of Day", importance: 0.058 },
    { feature: "Cloud Cover", importance: 0.045 },
    { feature: "Humidity", importance: 0.042 }
  ];
  
  const maxImportance = Math.max(...features.map(f => f.importance));
  
  container.innerHTML = features.map(f => `
    <div class="feature-bar-item">
      <div class="feature-bar-label">${f.feature}</div>
      <div class="feature-bar-track">
        <div class="feature-bar-fill" style="width: ${(f.importance / maxImportance) * 100}%;"></div>
      </div>
      <div class="feature-bar-value">${(f.importance * 100).toFixed(1)}%</div>
    </div>
  `).join('');
}

// ============================================================
// ML SIMULATOR
// ============================================================

const simulatorPresets = {
  conservative: { schedule: 35, ml: 25 },
  recommended: { schedule: 60, ml: 45 },
  aggressive: { schedule: 85, ml: 70 }
};

const simulatorAssumptions = {
  scheduleMinPct: 0.08,
  scheduleMaxPct: 0.12,
  mlMinPct: 0.05,
  mlMaxPct: 0.08,
  peakReductionFactor: 0.7
};

function setupSimulator() {
  const scheduleSlider = document.getElementById('sim-schedule');
  const mlSlider = document.getElementById('sim-ml');
  const focusSelect = document.getElementById('sim-focus');

  if (scheduleSlider) scheduleSlider.addEventListener('input', updateSimulation);
  if (mlSlider) mlSlider.addEventListener('input', updateSimulation);
  if (focusSelect) focusSelect.addEventListener('change', updateSimulation);

  const presetButtons = document.querySelectorAll('.toggle.preset');
  presetButtons.forEach(button => {
    button.addEventListener('click', () => {
      presetButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      applySimulatorPreset(button.dataset.preset);
      updateSimulation();
    });
  });

  updateSimulation();
}

function updateSimulation() {
  const data = getSimulationData();
  populateSimulatorFocusOptions();

  const scheduleSlider = document.getElementById('sim-schedule');
  const mlSlider = document.getElementById('sim-ml');
  const focusSelect = document.getElementById('sim-focus');

  const scheduleVal = parseInt(scheduleSlider?.value || 0, 10);
  const mlVal = parseInt(mlSlider?.value || 0, 10);
  const focusValue = focusSelect?.value || 'campus';
  const scenarioBadge = document.getElementById('sim-scenario-badge');

  const maxSchedulePct = simulatorAssumptions.scheduleMaxPct;
  const maxMlPct = simulatorAssumptions.mlMaxPct;

  const schedulePct = (scheduleVal / 100) * maxSchedulePct;
  const mlPct = (mlVal / 100) * maxMlPct;
  const overlap = Math.min(schedulePct, mlPct) * 0.3;
  const totalPct = Math.min(0.25, schedulePct + mlPct - overlap);

  const totalGwh = normalizeTotalGwh(data.summary?.total_electricity_mwh || 68732.9);
  const campusBaselineKwh = totalGwh ? totalGwh * 1000000 : 68732.9 * 1000;
  let baselineKwh = campusBaselineKwh;
  let focusLabel = 'Campus-wide baseline';

  if (focusValue.startsWith('building-')) {
    const index = parseInt(focusValue.split('-')[1], 10);
    const building = simulatorFocusBuildings[index];
    if (building) {
      baselineKwh = building.total_energy || campusBaselineKwh * 0.02;
      focusLabel = `Building focus: ${building.building_name}`;
    }
  } else {
    const totalBuildings = data.summary?.total_buildings || 279;
    focusLabel = `Campus-wide baseline (${totalBuildings} buildings)`;
  }

  const savingsKwh = baselineKwh * totalPct;
  const costSavings = savingsKwh * 0.12;
  const co2Savings = savingsKwh * 0.0004;
  const peakBaseKw = 12000 * (baselineKwh / campusBaselineKwh);
  const peakReductionPct = totalPct * simulatorAssumptions.peakReductionFactor;
  const peakReductionKw = peakBaseKw * peakReductionPct;

  const scheduleKwh = baselineKwh * schedulePct;
  const mlKwh = baselineKwh * mlPct;

  const campusSavingsKwh = campusBaselineKwh * totalPct;
  const campusCostSavings = campusSavingsKwh * 0.12;
  const campusCo2Savings = campusSavingsKwh * 0.0004;

  if (scenarioBadge) scenarioBadge.textContent = getScenarioLabel(scheduleVal, mlVal);

  const scheduleValEl = document.getElementById('sim-schedule-val');
  const mlValEl = document.getElementById('sim-ml-val');
  const mlCoverageEl = document.getElementById('sim-ml-coverage');
  if (scheduleValEl) scheduleValEl.textContent = `${scheduleVal}%`;
  if (mlValEl) mlValEl.textContent = `${mlVal}%`;
  if (mlCoverageEl) mlCoverageEl.textContent = `${mlVal}%`;

  const savingsKwhEl = document.getElementById('sim-savings-kwh');
  const savingsDollarEl = document.getElementById('sim-savings-dollar');
  const savingsCo2El = document.getElementById('sim-savings-co2');
  const peakReductionEl = document.getElementById('sim-peak-reduction');
  const peakKwEl = document.getElementById('sim-peak-kw');
  const focusLabelEl = document.getElementById('sim-focus-label');

  if (savingsKwhEl) savingsKwhEl.textContent = formatNumber(savingsKwh);
  if (savingsDollarEl) savingsDollarEl.textContent = formatCurrency(costSavings);
  if (savingsCo2El) savingsCo2El.textContent = `${formatNumber(co2Savings)} tons`;
  if (peakReductionEl) peakReductionEl.textContent = formatPercent(peakReductionPct);
  if (peakKwEl) peakKwEl.textContent = `${formatNumber(peakReductionKw)} kW`;
  if (focusLabelEl) focusLabelEl.textContent = focusLabel;

  const breakdownScheduleEl = document.getElementById('sim-breakdown-schedule');
  const breakdownMlEl = document.getElementById('sim-breakdown-ml');
  const breakdownTotalEl = document.getElementById('sim-breakdown-total');
  const breakdownBarEl = document.getElementById('sim-breakdown-bar');

  if (breakdownScheduleEl) breakdownScheduleEl.textContent = `${formatPercent(schedulePct)} (${formatNumber(scheduleKwh)} kWh)`;
  if (breakdownMlEl) breakdownMlEl.textContent = `${formatPercent(mlPct)} (${formatNumber(mlKwh)} kWh)`;
  if (breakdownTotalEl) breakdownTotalEl.textContent = `${formatPercent(totalPct)} (${formatNumber(savingsKwh)} kWh)`;
  if (breakdownBarEl) breakdownBarEl.style.width = `${Math.min(100, (totalPct / 0.25) * 100)}%`;

  const recoSavingsEl = document.getElementById('reco-total-savings');
  const recoReductionEl = document.getElementById('reco-total-reduction');
  const recoCo2El = document.getElementById('reco-total-co2');
  if (recoSavingsEl) recoSavingsEl.textContent = formatCurrency(campusCostSavings);
  if (recoReductionEl) recoReductionEl.textContent = formatPercent(totalPct);
  if (recoCo2El) recoCo2El.textContent = formatNumber(campusCo2Savings);

  const heroSavingsEl = document.getElementById('hero-savings');
  if (heroSavingsEl) heroSavingsEl.textContent = formatCurrency(campusCostSavings);

  updateInsights(peakReductionPct);

  const { labels, baseline } = getMonthlyBaseline(data);
  const baselineSum = baseline.reduce((acc, value) => acc + value, 0);
  const baselineScale = baselineSum > 0 ? campusBaselineKwh / baselineSum : 1;
  const scaledBaseline = baseline.map(value => value * baselineScale);
  const focusBaseline = scaledBaseline.map(value => value * (baselineKwh / campusBaselineKwh));
  const optimized = focusBaseline.map(value => value * (1 - totalPct));
  updateSimulatorChart(labels, focusBaseline, optimized);
}

function applySimulatorPreset(presetName) {
  const preset = simulatorPresets[presetName];
  if (!preset) return;

  const scheduleSlider = document.getElementById('sim-schedule');
  const mlSlider = document.getElementById('sim-ml');
  if (scheduleSlider) scheduleSlider.value = preset.schedule;
  if (mlSlider) mlSlider.value = preset.ml;
}

function getScenarioLabel(scheduleVal, mlVal) {
  const match = Object.entries(simulatorPresets).find(([, preset]) => (
    preset.schedule === scheduleVal && preset.ml === mlVal
  ));
  if (!match) return 'Custom scenario';
  const name = match[0];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} scenario`;
}

function getSimulationData() {
  return dashboardData || getSampleData();
}

function populateSimulatorFocusOptions(force = false) {
  const select = document.getElementById('sim-focus');
  if (!select) return;
  if (select.dataset.ready && !force) return;

  const data = getSimulationData();
  const totalBuildings = data.summary?.total_buildings || 279;
  const topBuildings = data.buildings?.top_consumers || generateTopBuildings();
  simulatorFocusBuildings = topBuildings.slice(0, 6);

  let html = `<option value="campus">Campus-wide (${totalBuildings} buildings)</option>`;
  html += simulatorFocusBuildings
    .map((b, i) => `<option value="building-${i}">${b.building_name}</option>`)
    .join('');

  select.innerHTML = html;
  select.dataset.ready = 'true';

  const scheduleTargets = topBuildings.slice(0, 3).map(b => b.building_name);
  const scheduleTargetEl = document.getElementById('sim-schedule-buildings');
  if (scheduleTargetEl) scheduleTargetEl.textContent = scheduleTargets.join(', ');
}

function renderSimulatorPriorityBuildings() {
  const container = document.getElementById('sim-building-list');
  if (!container) return;

  const cards = getPilotCandidates();
  container.innerHTML = cards.map(card => `
    <div class="sim-building-card">
      <div class="sim-building-name">${card.name}</div>
      <div class="sim-building-meta">${card.meta}</div>
    </div>
  `).join('');
}

function renderRecommendationTargets() {
  const scheduleContainer = document.getElementById('reco-schedule-buildings');
  const mlContainer = document.getElementById('reco-ml-buildings');
  if (!scheduleContainer && !mlContainer) return;

  const data = getSimulationData();
  const topBuildings = data.buildings?.top_consumers || generateTopBuildings();
  const retrofitBuildings = data.buildings?.retrofit_candidates || generateRetrofitBuildings();

  if (scheduleContainer) {
    const scheduleTargets = [
      ...retrofitBuildings.slice(0, 3).map(b => b.building_name),
      ...topBuildings.slice(0, 2).map(b => b.building_name)
    ];
    scheduleContainer.innerHTML = scheduleTargets.map(name => `<span class="reco-pill">${name}</span>`).join('');
  }

  if (mlContainer) {
    const mlTargets = topBuildings.slice(0, 4).map(b => b.building_name);
    mlContainer.innerHTML = mlTargets.map(name => `<span class="reco-pill">${name}</span>`).join('');
  }
}

function getPilotCandidates() {
  const data = getSimulationData();
  const topBuildings = data.buildings?.top_consumers || generateTopBuildings();
  const retrofitBuildings = data.buildings?.retrofit_candidates || generateRetrofitBuildings();

  return [
    ...topBuildings.slice(0, 2).map(b => ({
      name: b.building_name,
      meta: `High demand - ${formatNumber((b.total_energy || 0) / 1000000)} GWh/yr`
    })),
    ...retrofitBuildings.slice(0, 2).map(b => ({
      name: b.building_name,
      meta: `Legacy building - EUI ${(b.mean_eui || 0).toFixed(1)}`
    }))
  ];
}

function updateInsights(peakReductionOverride = null) {
  const scheduleRangeEl = document.getElementById('insight-schedule-range');
  const mlRangeEl = document.getElementById('insight-ml-range');
  const peakReductionEl = document.getElementById('insight-peak-reduction');
  const pilotCountEl = document.getElementById('insight-pilot-count');

  if (scheduleRangeEl) {
    scheduleRangeEl.textContent = formatPercentRange(
      simulatorAssumptions.scheduleMinPct,
      simulatorAssumptions.scheduleMaxPct
    );
  }

  if (mlRangeEl) {
    mlRangeEl.textContent = formatPercentRange(
      simulatorAssumptions.mlMinPct,
      simulatorAssumptions.mlMaxPct
    );
  }

  if (peakReductionEl) {
    const reductionPct = peakReductionOverride ?? (simulatorAssumptions.scheduleMaxPct + simulatorAssumptions.mlMaxPct) * simulatorAssumptions.peakReductionFactor;
    peakReductionEl.textContent = formatPercent(reductionPct);
  }

  if (pilotCountEl) {
    const pilots = getPilotCandidates();
    pilotCountEl.textContent = `Top ${pilots.length}`;
  }
}

function updateOverviewStats() {
  const data = getSimulationData();
  const summary = data.summary || {};

  const heroTotalEl = document.getElementById('hero-total');
  const heroBuildingsEl = document.getElementById('hero-buildings');
  const overviewDateEl = document.getElementById('overview-date');

  const totalGwh = normalizeTotalGwh(summary.total_electricity_mwh);
  if (heroTotalEl && totalGwh !== null) {
    heroTotalEl.textContent = totalGwh.toFixed(1);
  }

  if (heroBuildingsEl && summary.total_buildings) {
    heroBuildingsEl.textContent = summary.total_buildings;
  }

  if (overviewDateEl && summary.date_range) {
    overviewDateEl.textContent = summary.date_range;
  }
}

function getMonthlyBaseline(data) {
  const monthly = data.campus_overview?.monthly_trends || generateMonthlyTrends();
  const totals = {};

  monthly.forEach(entry => {
    const month = entry.month;
    const value = entry.energy_mwh || entry.total_mwh || 0;
    totals[month] = (totals[month] || 0) + value;
  });

  const labels = Object.keys(totals).sort();
  const baseline = labels.map(month => totals[month] * 1000);
  return { labels, baseline };
}

function updateSimulatorChart(labels, baseline, optimized) {
  const ctx = document.getElementById('sim-forecast-chart')?.getContext('2d');
  if (!ctx) return;

  const data = {
    labels,
    datasets: [
      {
        label: 'Baseline',
        data: baseline,
        borderColor: 'rgba(255, 107, 53, 0.9)',
        backgroundColor: 'rgba(255, 107, 53, 0.15)',
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 0
      },
      {
        label: 'Optimized',
        data: optimized,
        borderColor: 'rgba(0, 255, 136, 0.9)',
        backgroundColor: 'rgba(0, 255, 136, 0.12)',
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 0
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 32, 0.95)',
        borderColor: 'rgba(0, 212, 255, 0.3)',
        borderWidth: 1,
        titleColor: '#00d4ff',
        bodyColor: '#f0f4f8',
        callbacks: {
          label: (context) => `${context.dataset.label}: ${formatNumber(context.parsed.y)} kWh`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#8899a6', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: {
          color: '#8899a6',
          font: { size: 10 },
          callback: (value) => formatNumber(value)
        }
      }
    }
  };

  if (!simulatorChart) {
    simulatorChart = new Chart(ctx, { type: 'line', data, options });
  } else {
    simulatorChart.data = data;
    simulatorChart.options = options;
    simulatorChart.update();
  }
}

// ============================================================
// UTILITIES
// ============================================================

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '--';
  if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(0);
}

function formatCurrency(num) {
  if (num === null || num === undefined || isNaN(num)) return '--';
  return `$${formatNumber(num)}`;
}

function formatPercent(decimal) {
  if (decimal === null || decimal === undefined || isNaN(decimal)) return '--';
  return `${(decimal * 100).toFixed(1)}%`;
}

function formatPercentRange(min, max) {
  if (
    min === null || min === undefined || isNaN(min) ||
    max === null || max === undefined || isNaN(max)
  ) {
    return '--';
  }
  return `${(min * 100).toFixed(0)}-${(max * 100).toFixed(0)}%`;
}

function normalizeTotalGwh(rawValue) {
  if (rawValue === null || rawValue === undefined || isNaN(rawValue)) return null;
  if (rawValue > 1000000) {
    return rawValue / 1000000;
  }
  return rawValue / 1000;
}

function getChartOptions(yLabel, xLabel = null) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 32, 0.95)',
        titleColor: '#00d4ff',
        bodyColor: '#f0f4f8',
        borderColor: 'rgba(0, 212, 255, 0.3)',
        borderWidth: 1,
        padding: 12
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#8899a6', font: { family: 'Space Mono', size: 10 } },
        title: xLabel ? {
          display: true,
          text: xLabel,
          color: '#8899a6',
          font: { family: 'Space Mono', size: 11 }
        } : { display: false }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: {
          color: '#8899a6',
          font: { family: 'Space Mono', size: 10 },
          callback: v => formatNumber(v)
        },
        title: {
          display: true,
          text: yLabel,
          color: '#8899a6',
          font: { family: 'Space Mono', size: 11 }
        }
      }
    }
  };
}

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
    });
  });
  
  // Chart tabs
  document.querySelectorAll('.chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
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
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      const baseEnergy = dow < 5 ? 3500 : 2200;
      const hourMod = Math.sin((hour - 6) / 24 * Math.PI * 2) * 1500;
      const peakMod = (dow < 5 && hour >= 9 && hour <= 17) ? 1000 : 0;
      data.push({ day_of_week: dow, hour, energy_kwh: baseEnergy + hourMod + peakMod + Math.random() * 300 });
    }
  }
  return data;
}

// ============================================================
// CHARTS INITIALIZATION
// ============================================================

function initializeAllCharts() {
  initMap();
  initMonthlyChart();
  initHeatmap();
  initWeatherScatter();
  initHourlyChart();
  initEUIChart();
}

// ===== MAP =====
function initMap() {
  const map = L.map('campus-map', { zoomControl: true }).setView([40.0067, -83.0305], 15);
  
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
  }).addTo(map);
  
  // Add sample buildings
  const sampleBuildings = [
    { name: "Wexner Medical Center", lat: 39.9949, lng: -83.0160, energy: 25000000, eui: 42.5 },
    { name: "Ohio Stadium", lat: 40.0017, lng: -83.0197, energy: 18500000, eui: 28.3 },
    { name: "Thompson Library", lat: 40.0027, lng: -83.0148, energy: 12800000, eui: 35.2 },
    { name: "RPAC", lat: 40.0093, lng: -83.0183, energy: 11200000, eui: 38.7 },
    { name: "Ohio Union", lat: 40.0048, lng: -83.0108, energy: 9800000, eui: 32.1 },
    { name: "Knowlton Hall", lat: 40.0020, lng: -83.0157, energy: 6500000, eui: 29.4 },
    { name: "Physics Research", lat: 40.0019, lng: -83.0278, energy: 7600000, eui: 41.2 },
    { name: "Dreese Labs", lat: 40.0016, lng: -83.0157, energy: 5200000, eui: 33.8 },
    { name: "Caldwell Lab", lat: 40.0026, lng: -83.0165, energy: 4100000, eui: 28.9 },
    { name: "Scott Lab", lat: 40.0023, lng: -83.0168, energy: 3800000, eui: 31.2 }
  ];
  
  sampleBuildings.forEach(b => {
    const intensity = Math.min(1, b.energy / 25000000);
    const color = getHeatColor(intensity);
    
    L.circleMarker([b.lat, b.lng], {
      radius: 8 + intensity * 12,
      fillColor: color,
      color: '#fff',
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.75
    }).bindPopup(`
      <div style="font-family: 'Space Mono', monospace;">
        <strong style="color: #00d4ff;">${b.name}</strong><br>
        <span style="color: #8899a6;">Energy:</span> ${formatNumber(b.energy / 1000)} MWh<br>
        <span style="color: #8899a6;">EUI:</span> ${b.eui.toFixed(1)} kWh/sqft
      </div>
    `).addTo(map);
  });
}

function getHeatColor(intensity) {
  if (intensity < 0.4) return '#00d4ff';
  if (intensity < 0.7) return '#fbbf24';
  return '#ff6b35';
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
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: '#00d4ff',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    },
    options: getChartOptions('MWh')
  });
}

function updateMonthlyChart(utility) {
  if (!monthlyChart) return;
  
  const monthlyData = dashboardData.campus_overview?.monthly_trends || generateMonthlyTrends();
  const filtered = monthlyData.filter(d => d.utility === utility);
  
  const colors = {
    ELECTRICITY: { border: '#00d4ff', bg: 'rgba(0, 212, 255, 0.1)' },
    HEAT: { border: '#ff6b35', bg: 'rgba(255, 107, 53, 0.1)' },
    COOLING: { border: '#00ff88', bg: 'rgba(0, 255, 136, 0.1)' }
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
  
  hourlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hourlyData.map(d => `${d.hour}:00`),
      datasets: [{
        label: 'Avg Energy (kWh)',
        data: hourlyData.map(d => d.avg_energy),
        backgroundColor: hourlyData.map(d => {
          if (d.hour >= 9 && d.hour <= 17) return 'rgba(0, 212, 255, 0.7)';
          return 'rgba(0, 212, 255, 0.3)';
        }),
        borderRadius: 4
      }]
    },
    options: getChartOptions('kWh')
  });
}

// ===== EUI CHART =====
function initEUIChart() {
  const ctx = document.getElementById('eui-chart')?.getContext('2d');
  if (!ctx) return;
  
  const buildings = dashboardData.buildings?.top_consumers || generateTopBuildings();
  
  euiChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: buildings.slice(0, 8).map(b => b.building_name.split(' ')[0]),
      datasets: [{
        label: 'EUI (kWh/sqft)',
        data: buildings.slice(0, 8).map(b => b.mean_eui || 25),
        backgroundColor: buildings.slice(0, 8).map(b => {
          const eui = b.mean_eui || 25;
          if (eui > 40) return 'rgba(255, 107, 53, 0.7)';
          if (eui > 30) return 'rgba(251, 191, 36, 0.7)';
          return 'rgba(0, 255, 136, 0.7)';
        }),
        borderRadius: 4
      }]
    },
    options: {
      ...getChartOptions('kWh/sqft'),
      indexAxis: 'y'
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
  
  let html = '<div class="heatmap-label"></div>';
  days.forEach(day => { html += `<div class="heatmap-label">${day}</div>`; });
  
  for (let hour = 0; hour < 24; hour++) {
    html += `<div class="heatmap-label">${hour.toString().padStart(2, '0')}</div>`;
    for (let dow = 0; dow < 7; dow++) {
      const cell = heatmapData.find(d => d.hour === hour && d.day_of_week === dow);
      const value = cell ? cell.energy_kwh : 0;
      const normalized = (value - minVal) / (maxVal - minVal);
      const color = getHeatmapColor(normalized);
      html += `<div class="heatmap-cell" style="background: ${color}" 
               title="${days[dow]} ${hour}:00 - ${formatNumber(value)} kWh"></div>`;
    }
  }
  
  container.innerHTML = html;
}

function getHeatmapColor(normalized) {
  if (normalized < 0.33) return `hsl(200, ${50 + normalized * 50}%, ${18 + normalized * 20}%)`;
  if (normalized < 0.66) return `hsl(${190 - (normalized - 0.33) * 20}, 100%, ${38 + normalized * 12}%)`;
  return `hsl(${170 - (normalized - 0.66) * 150}, 100%, 50%)`;
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

function setupSimulator() {
  // Slider event listeners
  ['temp', 'hour', 'cloud', 'humidity'].forEach(id => {
    const slider = document.getElementById(`sim-${id}`);
    if (slider) {
      slider.addEventListener('input', updateSimulation);
    }
  });
  
  // Toggle buttons
  document.querySelectorAll('.toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      document.querySelectorAll('.toggle').forEach(t => t.classList.remove('active'));
      toggle.classList.add('active');
      updateSimulation();
    });
  });
  
  // Initial calculation
  updateSimulation();
}

function updateSimulation() {
  const temp = parseInt(document.getElementById('sim-temp')?.value || 65);
  const hour = parseInt(document.getElementById('sim-hour')?.value || 12);
  const cloud = parseInt(document.getElementById('sim-cloud')?.value || 30);
  const humidity = parseInt(document.getElementById('sim-humidity')?.value || 50);
  const isWeekend = document.querySelector('.toggle.active')?.dataset.value === 'weekend';
  
  // Update display values
  document.getElementById('sim-temp-val').textContent = `${temp}°F`;
  document.getElementById('sim-hour-val').textContent = formatHour(hour);
  document.getElementById('sim-cloud-val').textContent = `${cloud}%`;
  document.getElementById('sim-humidity-val').textContent = `${humidity}%`;
  
  // Calculate prediction using simplified model
  let baseLoad = 2800;
  
  // Weekend/weekday factor
  if (isWeekend) baseLoad *= 0.55;
  
  // Temperature impact (U-shaped curve)
  let weatherImpact = 0;
  if (temp < 55) {
    weatherImpact = (55 - temp) * 35; // Heating
  } else if (temp > 70) {
    weatherImpact = (temp - 70) * 40; // Cooling
  }
  
  // Humidity adds to cooling load
  if (temp > 70) {
    weatherImpact += (humidity - 50) * 8;
  }
  
  // Cloud cover reduces solar gain (less cooling in summer)
  if (temp > 70) {
    weatherImpact -= cloud * 3;
  }
  
  // Time of day factor
  let timeImpact = 0;
  if (!isWeekend) {
    if (hour >= 9 && hour <= 17) {
      timeImpact = 800 + Math.sin((hour - 9) / 8 * Math.PI) * 400;
    } else {
      timeImpact = Math.sin((hour - 6) / 24 * Math.PI * 2) * 300;
    }
  } else {
    timeImpact = Math.sin((hour - 8) / 24 * Math.PI * 2) * 200;
  }
  
  const totalPrediction = Math.max(1500, baseLoad + weatherImpact + timeImpact);
  
  // Update display
  document.getElementById('sim-result').textContent = formatNumber(totalPrediction);
  document.getElementById('sim-base').textContent = `${formatNumber(baseLoad)} kWh`;
  document.getElementById('sim-weather').textContent = `${weatherImpact >= 0 ? '+' : ''}${formatNumber(weatherImpact)} kWh`;
  document.getElementById('sim-time').textContent = `${timeImpact >= 0 ? '+' : ''}${formatNumber(timeImpact)} kWh`;
  
  // Update gauge
  const gaugePercent = Math.min(100, Math.max(0, (totalPrediction - 1500) / 4500 * 100));
  document.getElementById('sim-gauge-fill').style.width = `${gaugePercent}%`;
}

function formatHour(hour) {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`;
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

function getChartOptions(yLabel) {
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
        ticks: { color: '#8899a6', font: { family: 'Space Mono', size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { 
          color: '#8899a6', 
          font: { family: 'Space Mono', size: 10 },
          callback: v => formatNumber(v)
        }
      }
    }
  };
}

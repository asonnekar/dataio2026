"""
OSU Energy Hackathon - Dashboard Data Export
Prepares all data for interactive dashboard visualization
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
from datetime import datetime

# Paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "analysis" / "processed_data"
MODEL_DIR = BASE_DIR / "analysis" / "model_outputs"
OUTPUT_DIR = BASE_DIR / "dashboard" / "data"
OUTPUT_DIR.mkdir(exist_ok=True, parents=True)

def load_all_data():
    """Load all processed data"""
    print("Loading processed data...")
    
    data = {}
    
    # Processed data
    data['daily'] = pd.read_parquet(DATA_DIR / "daily_energy.parquet")
    data['hourly'] = pd.read_parquet(DATA_DIR / "hourly_campus.parquet")
    data['buildings'] = pd.read_parquet(DATA_DIR / "building_stats.parquet")
    data['buildings_meta'] = pd.read_parquet(DATA_DIR / "buildings_clean.parquet")
    data['weather'] = pd.read_parquet(DATA_DIR / "weather_clean.parquet")
    
    # Model outputs
    if (MODEL_DIR / "xgboost_forecast.parquet").exists():
        data['xgb_forecast'] = pd.read_parquet(MODEL_DIR / "xgboost_forecast.parquet")
    if (MODEL_DIR / "feature_importance.parquet").exists():
        data['feature_importance'] = pd.read_parquet(MODEL_DIR / "feature_importance.parquet")
    if (MODEL_DIR / "model_comparison.parquet").exists():
        data['model_comparison'] = pd.read_parquet(MODEL_DIR / "model_comparison.parquet")
    
    return data

def prepare_campus_overview(data):
    """Campus-wide energy summary by utility"""
    print("Preparing campus overview...")
    
    daily = data['daily'].copy()
    
    # Total by utility
    utility_totals = daily.groupby('utility').agg({
        'energy_kwh': 'sum',
        'date': 'nunique'
    }).reset_index()
    utility_totals['energy_mwh'] = utility_totals['energy_kwh'] / 1000
    utility_totals.columns = ['utility', 'total_kwh', 'days', 'total_mwh']
    
    # Monthly trends by utility
    daily['month'] = pd.to_datetime(daily['date']).dt.to_period('M').astype(str)
    monthly = daily.groupby(['month', 'utility']).agg({
        'energy_kwh': 'sum'
    }).reset_index()
    monthly['energy_mwh'] = monthly['energy_kwh'] / 1000
    
    return {
        'utility_totals': utility_totals.to_dict('records'),
        'monthly_trends': monthly.to_dict('records')
    }

def prepare_building_data(data):
    """Building-level analysis data"""
    print("Preparing building data...")
    
    buildings = data['buildings'].copy()
    
    # Clean up for JSON export
    buildings = buildings.fillna({
        'building_name': 'Unknown',
        'site_name': 'Unknown',
        'gross_area': 0,
        'building_age': 0,
        'latitude': 40.0,
        'longitude': -83.0
    })
    
    # Top 20 by consumption
    top_consumers = buildings.nlargest(20, 'total_energy').copy()
    
    # Top 20 by EUI (least efficient)
    buildings_with_eui = buildings[buildings['mean_eui'] > 0]
    least_efficient = buildings_with_eui.nlargest(20, 'mean_eui').copy()
    
    # Retrofit candidates (high priority score)
    retrofit = buildings.nlargest(15, 'retrofit_priority').copy()
    
    # All buildings for map
    map_data = buildings[['simscode', 'building_name', 'site_name', 
                          'total_energy', 'mean_eui', 'latitude', 'longitude',
                          'gross_area', 'building_age', 'retrofit_priority']].copy()
    
    return {
        'top_consumers': top_consumers.to_dict('records'),
        'least_efficient': least_efficient.to_dict('records'),
        'retrofit_candidates': retrofit.to_dict('records'),
        'map_data': map_data.to_dict('records'),
        'total_buildings': len(buildings)
    }

def prepare_weather_correlation(data):
    """Weather impact analysis"""
    print("Preparing weather correlation...")
    
    hourly = data['hourly'].copy()
    
    # Filter electricity
    elec = hourly[hourly['utility'] == 'ELECTRICITY'].copy()
    elec = elec.dropna(subset=['temperature_2m', 'energy_kwh'])
    
    # Bin temperature for scatter
    elec['temp_bin'] = pd.cut(elec['temperature_2m'], bins=20)
    temp_energy = elec.groupby('temp_bin', observed=True).agg({
        'temperature_2m': 'mean',
        'energy_kwh': ['mean', 'std', 'count']
    }).reset_index()
    temp_energy.columns = ['temp_bin', 'avg_temp', 'avg_energy', 'std_energy', 'count']
    temp_energy = temp_energy.dropna()
    
    # HDD/CDD correlation
    hdd_cdd = elec.groupby(elec['datetime'].dt.date).agg({
        'hdd': 'sum',
        'cdd': 'sum',
        'energy_kwh': 'sum'
    }).reset_index()
    hdd_cdd.columns = ['date', 'hdd', 'cdd', 'energy_kwh']
    
    return {
        'temp_vs_energy': temp_energy[['avg_temp', 'avg_energy']].to_dict('records'),
        'hdd_cdd': hdd_cdd.tail(60).to_dict('records')  # Last 60 days
    }

def prepare_time_patterns(data):
    """Temporal consumption patterns"""
    print("Preparing time patterns...")
    
    hourly = data['hourly'].copy()
    elec = hourly[hourly['utility'] == 'ELECTRICITY'].copy()
    
    # Hourly profile
    hourly_profile = elec.groupby('hour')['energy_kwh'].mean().reset_index()
    hourly_profile.columns = ['hour', 'avg_energy']
    
    # Day of week profile
    dow_profile = elec.groupby('day_of_week')['energy_kwh'].mean().reset_index()
    dow_profile.columns = ['day_of_week', 'avg_energy']
    dow_map = {0: 'Monday', 1: 'Tuesday', 2: 'Wednesday', 3: 'Thursday', 
               4: 'Friday', 5: 'Saturday', 6: 'Sunday'}
    dow_profile['day_name'] = dow_profile['day_of_week'].map(dow_map)
    
    # Monthly profile
    monthly_profile = elec.groupby('month')['energy_kwh'].sum().reset_index()
    monthly_profile.columns = ['month', 'total_energy']
    month_map = {1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
                 7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'}
    monthly_profile['month_name'] = monthly_profile['month'].map(month_map)
    
    # Heatmap data (hour x day of week)
    heatmap = elec.groupby(['day_of_week', 'hour'])['energy_kwh'].mean().reset_index()
    heatmap_pivot = heatmap.pivot(index='hour', columns='day_of_week', values='energy_kwh')
    
    return {
        'hourly_profile': hourly_profile.to_dict('records'),
        'dow_profile': dow_profile.to_dict('records'),
        'monthly_profile': monthly_profile.to_dict('records'),
        'heatmap': heatmap.to_dict('records')
    }

def prepare_model_results(data):
    """Model predictions and comparisons"""
    print("Preparing model results...")
    
    results = {}
    
    if 'xgb_forecast' in data:
        forecast = data['xgb_forecast'].copy()
        forecast['datetime'] = pd.to_datetime(forecast['datetime']).astype(str)
        # Sample for performance
        results['predictions'] = forecast.iloc[::6].to_dict('records')  # Every 6 hours
    
    if 'feature_importance' in data:
        results['feature_importance'] = data['feature_importance'].head(10).to_dict('records')
    
    if 'model_comparison' in data:
        results['model_comparison'] = data['model_comparison'].to_dict('records')
    
    return results

def prepare_summary_stats(data):
    """Key summary statistics for dashboard header"""
    print("Preparing summary statistics...")
    
    daily = data['daily']
    buildings = data['buildings']
    
    # Total electricity
    total_elec = daily[daily['utility'] == 'ELECTRICITY']['energy_kwh'].sum()
    
    # Date range
    min_date = pd.to_datetime(daily['date']).min()
    max_date = pd.to_datetime(daily['date']).max()
    
    # Average EUI
    avg_eui = buildings[buildings['mean_eui'] > 0]['mean_eui'].mean()
    
    # Potential savings (top 10 inefficient buildings improving to average)
    top_inefficient = buildings.nlargest(10, 'mean_eui')
    potential_savings_kwh = (top_inefficient['mean_eui'] - avg_eui) * top_inefficient['gross_area']
    annual_savings = potential_savings_kwh.sum() * 365
    
    # Cost savings estimate ($0.10/kWh average)
    cost_savings = annual_savings * 0.10
    
    return {
        'total_electricity_mwh': round(total_elec / 1000, 1),
        'total_buildings': len(buildings),
        'date_range': f"{min_date.strftime('%b %Y')} - {max_date.strftime('%b %Y')}",
        'avg_eui': round(avg_eui, 3) if not np.isnan(avg_eui) else 0,
        'potential_annual_savings_mwh': round(annual_savings / 1000, 1),
        'potential_cost_savings': round(cost_savings, 0)
    }

def main():
    """Export all dashboard data"""
    print("="*60)
    print("OSU ENERGY DASHBOARD DATA EXPORT")
    print("="*60)
    
    # Load data
    data = load_all_data()
    
    # Prepare all dashboard data
    dashboard_data = {
        'generated_at': datetime.now().isoformat(),
        'summary': prepare_summary_stats(data),
        'campus_overview': prepare_campus_overview(data),
        'buildings': prepare_building_data(data),
        'weather': prepare_weather_correlation(data),
        'time_patterns': prepare_time_patterns(data),
        'models': prepare_model_results(data)
    }
    
    # Save main dashboard data
    with open(OUTPUT_DIR / "dashboard_data.json", 'w') as f:
        json.dump(dashboard_data, f, indent=2, default=str)
    print(f"\nSaved: dashboard_data.json")
    
    # Save smaller focused files for lazy loading
    with open(OUTPUT_DIR / "summary.json", 'w') as f:
        json.dump(dashboard_data['summary'], f, indent=2)
    
    with open(OUTPUT_DIR / "buildings.json", 'w') as f:
        json.dump(dashboard_data['buildings'], f, indent=2, default=str)
    
    with open(OUTPUT_DIR / "time_patterns.json", 'w') as f:
        json.dump(dashboard_data['time_patterns'], f, indent=2)
    
    print(f"\n{'='*60}")
    print("DASHBOARD DATA EXPORT COMPLETE!")
    print(f"{'='*60}")
    
    return dashboard_data

if __name__ == "__main__":
    main()

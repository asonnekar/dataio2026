"""
OSU Energy Hackathon - Data Processing Pipeline
Loads raw CSVs, performs feature engineering, and exports processed data
"""

import pandas as pd
import numpy as np
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# Paths
BASE_DIR = Path(__file__).parent.parent
DATA_CORE = BASE_DIR / "advanced_core"
DATA_BONUS = BASE_DIR / "advanced_bonus"
OUTPUT_DIR = BASE_DIR / "analysis" / "processed_data"
OUTPUT_DIR.mkdir(exist_ok=True, parents=True)

def load_building_metadata():
    """Load and clean building metadata"""
    print("Loading building metadata...")
    df = pd.read_csv(DATA_CORE / "building_metadata.csv")
    
    # Clean column names
    df.columns = df.columns.str.lower().str.replace('"', '')
    
    # Convert numeric columns
    df['grossarea'] = pd.to_numeric(df['grossarea'], errors='coerce')
    df['floorsaboveground'] = pd.to_numeric(df['floorsaboveground'], errors='coerce')
    df['floorsbelowground'] = pd.to_numeric(df['floorsbelowground'], errors='coerce')
    df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
    df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')
    
    # Parse construction date
    df['constructiondate'] = pd.to_datetime(df['constructiondate'], errors='coerce')
    df['building_age_years'] = (pd.Timestamp('2025-01-01') - df['constructiondate']).dt.days / 365.25
    
    # Clean building number for joining
    df['buildingnumber'] = df['buildingnumber'].astype(str).str.strip().str.replace('"', '')
    
    print(f"  Loaded {len(df)} buildings")
    return df

def load_weather_data():
    """Load and process hourly weather data"""
    print("Loading weather data...")
    df = pd.read_csv(DATA_CORE / "weather_data_hourly_2025.csv")
    
    # Clean column names
    df.columns = df.columns.str.lower().str.replace('"', '')
    
    # Parse datetime
    df['date'] = pd.to_datetime(df['date'])
    df['hour'] = df['date'].dt.hour
    df['day_of_week'] = df['date'].dt.dayofweek
    df['month'] = df['date'].dt.month
    df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
    
    # Calculate Heating Degree Days (HDD) and Cooling Degree Days (CDD)
    BASE_TEMP = 65  # Fahrenheit
    df['hdd'] = np.maximum(0, BASE_TEMP - df['temperature_2m'])
    df['cdd'] = np.maximum(0, df['temperature_2m'] - BASE_TEMP)
    
    # Solar features
    df['is_daylight'] = (df['shortwave_radiation'] > 0).astype(int)
    
    print(f"  Loaded {len(df)} hourly weather records")
    return df

def load_meter_data_chunked(sample_frac=1.0):
    """Load all meter data from raw CSVs with optional sampling"""
    print("Loading meter data from raw CSVs...")
    
    # Get all meter files from both directories
    core_files = sorted(DATA_CORE.glob("meter-readings-*.csv"))
    bonus_files = sorted(DATA_BONUS.glob("meter-readings-*.csv"))
    all_files = core_files + bonus_files
    
    print(f"  Found {len(all_files)} meter data files")
    
    dfs = []
    for f in all_files:
        print(f"  Loading {f.name}...")
        df = pd.read_csv(f)
        if sample_frac < 1.0:
            df = df.sample(frac=sample_frac, random_state=42)
        dfs.append(df)
    
    meter_df = pd.concat(dfs, ignore_index=True)
    
    # Clean column names
    meter_df.columns = meter_df.columns.str.lower().str.replace('"', '')
    
    # Parse datetime
    meter_df['readingtime'] = pd.to_datetime(meter_df['readingtime'])
    meter_df['hour'] = meter_df['readingtime'].dt.hour
    meter_df['day_of_week'] = meter_df['readingtime'].dt.dayofweek
    meter_df['month'] = meter_df['readingtime'].dt.month
    meter_df['date'] = meter_df['readingtime'].dt.date
    meter_df['is_weekend'] = meter_df['day_of_week'].isin([5, 6]).astype(int)
    
    # Clean simscode for joining
    meter_df['simscode'] = meter_df['simscode'].astype(str).str.strip().str.replace('"', '')
    
    # Convert reading values
    meter_df['readingvalue'] = pd.to_numeric(meter_df['readingvalue'], errors='coerce')
    meter_df['readingwindowsum'] = pd.to_numeric(meter_df['readingwindowsum'], errors='coerce')
    meter_df['readingwindowmean'] = pd.to_numeric(meter_df['readingwindowmean'], errors='coerce')
    
    print(f"  Total: {len(meter_df):,} meter readings")
    return meter_df

def create_daily_aggregates(meter_df, weather_df, buildings_df):
    """Create daily energy aggregates with weather and building features"""
    print("Creating daily aggregates...")
    
    # Aggregate meter data to daily level per building and utility
    daily_energy = meter_df.groupby(['simscode', 'utility', 'readingtime']).agg({
        'readingvalue': 'sum',
        'readingwindowsum': 'sum',
        'readingwindowmean': 'mean',
        'sitename': 'first',
        'meterid': 'nunique'
    }).reset_index()
    
    daily_energy.columns = ['simscode', 'utility', 'datetime', 'energy_kwh', 
                            'window_sum', 'window_mean', 'site_name', 'meter_count']
    
    daily_energy['date'] = pd.to_datetime(daily_energy['datetime']).dt.floor('d')
    
    # Aggregate to daily
    daily_agg = daily_energy.groupby(['simscode', 'utility', 'date']).agg({
        'energy_kwh': 'sum',
        'site_name': 'first',
        'meter_count': 'max'
    }).reset_index()
    
    # Merge with weather (daily averages)
    weather_daily = weather_df.groupby(weather_df['date'].dt.date).agg({
        'temperature_2m': 'mean',
        'apparent_temperature': 'mean',
        'relative_humidity_2m': 'mean',
        'precipitation': 'sum',
        'shortwave_radiation': 'sum',
        'direct_radiation': 'sum',
        'wind_speed_10m': 'mean',
        'cloud_cover': 'mean',
        'hdd': 'sum',
        'cdd': 'sum'
    }).reset_index()
    weather_daily.columns = ['date'] + ['weather_' + c if c != 'date' else c 
                                         for c in weather_daily.columns[1:]]
    weather_daily['date'] = pd.to_datetime(weather_daily['date'])
    
    daily_agg = daily_agg.merge(weather_daily, on='date', how='left')
    
    # Merge with building metadata
    daily_agg = daily_agg.merge(
        buildings_df[['buildingnumber', 'buildingname', 'campusname', 'grossarea', 
                      'floorsaboveground', 'building_age_years', 'latitude', 'longitude']],
        left_on='simscode', right_on='buildingnumber', how='left'
    )
    
    # Calculate EUI (Energy Use Intensity)
    daily_agg['eui'] = daily_agg['energy_kwh'] / daily_agg['grossarea'].replace(0, np.nan)
    
    # Time features
    daily_agg['day_of_week'] = daily_agg['date'].dt.dayofweek
    daily_agg['month'] = daily_agg['date'].dt.month
    daily_agg['is_weekend'] = daily_agg['day_of_week'].isin([5, 6]).astype(int)
    
    print(f"  Created {len(daily_agg):,} daily aggregated records")
    return daily_agg

def create_hourly_aggregates(meter_df, weather_df):
    """Create hourly aggregates for time-series modeling"""
    print("Creating hourly aggregates...")
    
    # Floor to hour
    meter_df['hour_timestamp'] = meter_df['readingtime'].dt.floor('h')
    
    # Aggregate by utility type (campus-wide)
    hourly_campus = meter_df.groupby(['utility', 'hour_timestamp']).agg({
        'readingvalue': 'sum',
        'meterid': 'nunique'
    }).reset_index()
    hourly_campus.columns = ['utility', 'datetime', 'energy_kwh', 'meter_count']
    
    # Merge with weather
    weather_hourly = weather_df.copy()
    weather_hourly['datetime'] = weather_hourly['date'].dt.floor('h')
    
    hourly_campus = hourly_campus.merge(
        weather_hourly[['datetime', 'temperature_2m', 'apparent_temperature', 
                        'relative_humidity_2m', 'shortwave_radiation', 'hdd', 'cdd']],
        on='datetime', how='left'
    )
    
    # Time features
    hourly_campus['hour'] = hourly_campus['datetime'].dt.hour
    hourly_campus['day_of_week'] = hourly_campus['datetime'].dt.dayofweek
    hourly_campus['month'] = hourly_campus['datetime'].dt.month
    hourly_campus['is_weekend'] = hourly_campus['day_of_week'].isin([5, 6]).astype(int)
    
    print(f"  Created {len(hourly_campus):,} hourly campus records")
    return hourly_campus

def calculate_building_stats(daily_agg, buildings_df):
    """Calculate building-level statistics for dashboard"""
    print("Calculating building statistics...")
    
    # Focus on electricity for main building stats
    elec_data = daily_agg[daily_agg['utility'] == 'ELECTRICITY'].copy()
    
    building_stats = elec_data.groupby('simscode').agg({
        'energy_kwh': ['sum', 'mean', 'std', 'max'],
        'eui': 'mean',
        'site_name': 'first',
        'buildingname': 'first',
        'grossarea': 'first',
        'building_age_years': 'first',
        'latitude': 'first',
        'longitude': 'first',
        'date': ['min', 'max', 'nunique']
    }).reset_index()
    
    building_stats.columns = ['simscode', 'total_energy', 'mean_daily_energy', 
                               'std_daily_energy', 'max_daily_energy', 'mean_eui',
                               'site_name', 'building_name', 'gross_area', 
                               'building_age', 'latitude', 'longitude',
                               'first_date', 'last_date', 'days_with_data']
    
    # Calculate efficiency score (lower is better)
    building_stats['efficiency_score'] = building_stats['mean_eui'].rank(pct=True)
    
    # Variability ratio (high = poor control/inefficient)
    building_stats['variability_ratio'] = (building_stats['std_daily_energy'] / 
                                            building_stats['mean_daily_energy'].replace(0, np.nan))
    
    # Retrofit priority score (higher = more urgent)
    building_stats['retrofit_priority'] = (
        building_stats['efficiency_score'] * 0.4 +
        building_stats['variability_ratio'].rank(pct=True) * 0.3 +
        (building_stats['building_age'] / building_stats['building_age'].max()) * 0.3
    )
    
    print(f"  Calculated stats for {len(building_stats)} buildings")
    return building_stats

def main():
    """Main data processing pipeline"""
    print("="*60)
    print("OSU ENERGY DATA PROCESSING PIPELINE")
    print("="*60)
    
    # Load raw data
    buildings_df = load_building_metadata()
    weather_df = load_weather_data()
    meter_df = load_meter_data_chunked(sample_frac=1.0)  # Full data
    
    # Create aggregates
    daily_agg = create_daily_aggregates(meter_df, weather_df, buildings_df)
    hourly_campus = create_hourly_aggregates(meter_df, weather_df)
    building_stats = calculate_building_stats(daily_agg, buildings_df)
    
    # Save processed data
    print("\nSaving processed data...")
    
    daily_agg.to_parquet(OUTPUT_DIR / "daily_energy.parquet", index=False)
    print(f"  Saved daily_energy.parquet")
    
    hourly_campus.to_parquet(OUTPUT_DIR / "hourly_campus.parquet", index=False)
    print(f"  Saved hourly_campus.parquet")
    
    building_stats.to_parquet(OUTPUT_DIR / "building_stats.parquet", index=False)
    print(f"  Saved building_stats.parquet")
    
    buildings_df.to_parquet(OUTPUT_DIR / "buildings_clean.parquet", index=False)
    print(f"  Saved buildings_clean.parquet")
    
    weather_df.to_parquet(OUTPUT_DIR / "weather_clean.parquet", index=False)
    print(f"  Saved weather_clean.parquet")
    
    # Export key stats for dashboard
    dashboard_data = {
        'total_buildings': len(building_stats),
        'total_readings': len(meter_df),
        'date_range': {
            'start': str(meter_df['readingtime'].min()),
            'end': str(meter_df['readingtime'].max())
        },
        'utilities': meter_df['utility'].unique().tolist(),
        'total_energy_mwh': float(meter_df['readingvalue'].sum() / 1000),
    }
    
    import json
    with open(OUTPUT_DIR / "data_summary.json", 'w') as f:
        json.dump(dashboard_data, f, indent=2, default=str)
    print(f"  Saved data_summary.json")
    
    print("\n" + "="*60)
    print("PIPELINE COMPLETE!")
    print("="*60)
    
    return daily_agg, hourly_campus, building_stats

if __name__ == "__main__":
    main()

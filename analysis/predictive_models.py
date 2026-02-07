"""
OSU Energy Hackathon - Predictive Models
Prophet, LSTM, and XGBoost for energy forecasting
"""

import pandas as pd
import numpy as np
from pathlib import Path
import json
import warnings
warnings.filterwarnings('ignore')

# Paths
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "analysis" / "processed_data"
OUTPUT_DIR = BASE_DIR / "analysis" / "model_outputs"
OUTPUT_DIR.mkdir(exist_ok=True, parents=True)

def load_processed_data():
    """Load processed data from parquet files"""
    print("Loading processed data...")
    
    hourly = pd.read_parquet(DATA_DIR / "hourly_campus.parquet")
    daily = pd.read_parquet(DATA_DIR / "daily_energy.parquet")
    buildings = pd.read_parquet(DATA_DIR / "building_stats.parquet")
    weather = pd.read_parquet(DATA_DIR / "weather_clean.parquet")
    
    return hourly, daily, buildings, weather

# ============================================================
# PROPHET MODEL
# ============================================================

def train_prophet_model(hourly_data, utility='ELECTRICITY'):
    """Train Prophet model for energy forecasting"""
    from prophet import Prophet
    
    print(f"\n{'='*60}")
    print(f"PROPHET MODEL - {utility}")
    print(f"{'='*60}")
    
    # Filter for utility and prepare data
    df = hourly_data[hourly_data['utility'] == utility].copy()
    df = df.sort_values('datetime').dropna(subset=['energy_kwh', 'datetime'])
    
    # Prophet requires 'ds' and 'y' columns
    prophet_df = pd.DataFrame({
        'ds': df['datetime'],
        'y': df['energy_kwh']
    })
    
    # Add regressors
    if 'temperature_2m' in df.columns:
        prophet_df['temperature'] = df['temperature_2m'].values
        prophet_df['temperature'] = prophet_df['temperature'].fillna(prophet_df['temperature'].mean())
    
    # Train/test split (last 30 days for testing)
    train_end = prophet_df['ds'].max() - pd.Timedelta(days=30)
    train = prophet_df[prophet_df['ds'] <= train_end]
    test = prophet_df[prophet_df['ds'] > train_end]
    
    print(f"  Training samples: {len(train):,}")
    print(f"  Test samples: {len(test):,}")
    
    # Build model
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=True,
        changepoint_prior_scale=0.1
    )
    
    if 'temperature' in train.columns:
        model.add_regressor('temperature')
    
    model.fit(train)
    
    # Predictions
    future = model.make_future_dataframe(periods=len(test), freq='h')
    if 'temperature' in prophet_df.columns:
        future = future.merge(
            prophet_df[['ds', 'temperature']], 
            on='ds', 
            how='left'
        )
        future['temperature'] = future['temperature'].fillna(future['temperature'].mean())
    
    forecast = model.predict(future)
    
    # Calculate metrics
    test_forecast = forecast[forecast['ds'] > train_end]
    if len(test_forecast) > 0 and len(test) > 0:
        merged = test.merge(test_forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']], on='ds')
        mae = np.mean(np.abs(merged['y'] - merged['yhat']))
        mape = np.mean(np.abs((merged['y'] - merged['yhat']) / merged['y'].replace(0, np.nan))) * 100
        rmse = np.sqrt(np.mean((merged['y'] - merged['yhat'])**2))
        
        print(f"\n  METRICS:")
        print(f"    MAE: {mae:,.2f} kWh")
        print(f"    MAPE: {mape:.2f}%")
        print(f"    RMSE: {rmse:,.2f} kWh")
    else:
        mae, mape, rmse = 0, 0, 0
    
    # Save forecast data for dashboard
    forecast_export = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper', 'trend', 
                                 'weekly', 'yearly']].copy()
    forecast_export.columns = ['datetime', 'predicted', 'lower_bound', 'upper_bound',
                                'trend', 'weekly_pattern', 'yearly_pattern']
    forecast_export['utility'] = utility
    forecast_export['model'] = 'prophet'
    
    return {
        'model': model,
        'forecast': forecast_export,
        'metrics': {'mae': mae, 'mape': mape, 'rmse': rmse}
    }

# ============================================================
# LSTM MODEL
# ============================================================

def train_lstm_model(hourly_data, utility='ELECTRICITY', seq_length=168, epochs=50):
    """Train LSTM model for energy forecasting using PyTorch"""
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, TensorDataset
    from sklearn.preprocessing import MinMaxScaler
    
    print(f"\n{'='*60}")
    print(f"LSTM MODEL (PyTorch) - {utility}")
    print(f"{'='*60}")
    
    # Filter and prepare data
    df = hourly_data[hourly_data['utility'] == utility].copy()
    df = df.sort_values('datetime').dropna(subset=['energy_kwh'])
    
    # Features for LSTM
    feature_cols = ['energy_kwh', 'hour', 'day_of_week', 'is_weekend']
    if 'temperature_2m' in df.columns:
        df['temperature_2m'] = df['temperature_2m'].fillna(df['temperature_2m'].mean())
        feature_cols.append('temperature_2m')
    
    data = df[feature_cols].values
    
    # Scale data
    scaler = MinMaxScaler()
    data_scaled = scaler.fit_transform(data)
    
    # Create sequences
    def create_sequences(data, seq_length):
        X, y = [], []
        for i in range(len(data) - seq_length):
            X.append(data[i:i+seq_length])
            y.append(data[i+seq_length, 0])  # energy_kwh is target
        return np.array(X), np.array(y)
    
    X, y = create_sequences(data_scaled, seq_length)
    
    # Train/test split
    split_idx = int(len(X) * 0.85)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]
    
    print(f"  Training samples: {len(X_train):,}")
    print(f"  Test samples: {len(X_test):,}")
    print(f"  Sequence length: {seq_length} hours (1 week)")
    
    # Convert to PyTorch tensors
    X_train_t = torch.FloatTensor(X_train)
    y_train_t = torch.FloatTensor(y_train).unsqueeze(1)
    X_test_t = torch.FloatTensor(X_test)
    y_test_t = torch.FloatTensor(y_test).unsqueeze(1)
    
    # DataLoader
    train_dataset = TensorDataset(X_train_t, y_train_t)
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
    
    # Define LSTM model
    class LSTMModel(nn.Module):
        def __init__(self, input_size, hidden_size=64, num_layers=2):
            super(LSTMModel, self).__init__()
            self.lstm = nn.LSTM(input_size, hidden_size, num_layers, 
                               batch_first=True, dropout=0.2)
            self.fc = nn.Sequential(
                nn.Linear(hidden_size, 16),
                nn.ReLU(),
                nn.Linear(16, 1)
            )
        
        def forward(self, x):
            lstm_out, _ = self.lstm(x)
            out = self.fc(lstm_out[:, -1, :])
            return out
    
    model = LSTMModel(input_size=len(feature_cols))
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    
    # Training
    print(f"  Training LSTM ({epochs} epochs)...")
    model.train()
    best_loss = float('inf')
    patience_counter = 0
    
    for epoch in range(epochs):
        epoch_loss = 0
        for batch_X, batch_y in train_loader:
            optimizer.zero_grad()
            outputs = model(batch_X)
            loss = criterion(outputs, batch_y)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item()
        
        avg_loss = epoch_loss / len(train_loader)
        if avg_loss < best_loss:
            best_loss = avg_loss
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= 5:
                print(f"  Early stopping at epoch {epoch+1}")
                break
    
    # Predictions
    model.eval()
    with torch.no_grad():
        y_pred = model(X_test_t).numpy().flatten()
    
    # Inverse scale predictions
    dummy = np.zeros((len(y_pred), len(feature_cols)))
    dummy[:, 0] = y_pred
    y_pred_inv = scaler.inverse_transform(dummy)[:, 0]
    
    dummy[:, 0] = y_test
    y_test_inv = scaler.inverse_transform(dummy)[:, 0]
    
    # Metrics
    mae = np.mean(np.abs(y_test_inv - y_pred_inv))
    mape = np.mean(np.abs((y_test_inv - y_pred_inv) / np.where(y_test_inv == 0, 1, y_test_inv))) * 100
    rmse = np.sqrt(np.mean((y_test_inv - y_pred_inv)**2))
    
    print(f"\n  METRICS:")
    print(f"    MAE: {mae:,.2f} kWh")
    print(f"    MAPE: {mape:.2f}%")
    print(f"    RMSE: {rmse:,.2f} kWh")
    
    # Create forecast dataframe
    test_dates = df['datetime'].iloc[split_idx + seq_length:split_idx + seq_length + len(y_pred)]
    forecast_export = pd.DataFrame({
        'datetime': test_dates.values,
        'actual': y_test_inv,
        'predicted': y_pred_inv,
        'utility': utility,
        'model': 'lstm'
    })
    
    return {
        'model': model,
        'scaler': scaler,
        'forecast': forecast_export,
        'metrics': {'mae': mae, 'mape': mape, 'rmse': rmse}
    }

# ============================================================
# XGBOOST MODEL
# ============================================================

def train_xgboost_model(hourly_data, utility='ELECTRICITY'):
    """Train XGBoost model for energy forecasting with weather features"""
    import xgboost as xgb
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_absolute_error, mean_squared_error
    
    print(f"\n{'='*60}")
    print(f"XGBOOST MODEL - {utility}")
    print(f"{'='*60}")
    
    # Filter and prepare data
    df = hourly_data[hourly_data['utility'] == utility].copy()
    df = df.sort_values('datetime').dropna(subset=['energy_kwh'])
    
    # Feature engineering
    df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
    df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
    df['dow_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
    df['dow_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
    df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
    df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
    
    # Lag features
    df['lag_1h'] = df['energy_kwh'].shift(1)
    df['lag_24h'] = df['energy_kwh'].shift(24)
    df['lag_168h'] = df['energy_kwh'].shift(168)  # 1 week
    df['rolling_24h_mean'] = df['energy_kwh'].rolling(24).mean()
    df['rolling_168h_mean'] = df['energy_kwh'].rolling(168).mean()
    
    # Drop NaN from lag features
    df = df.dropna()
    
    # Define features
    feature_cols = [
        'hour', 'day_of_week', 'month', 'is_weekend',
        'hour_sin', 'hour_cos', 'dow_sin', 'dow_cos', 'month_sin', 'month_cos',
        'lag_1h', 'lag_24h', 'lag_168h', 'rolling_24h_mean', 'rolling_168h_mean'
    ]
    
    # Add weather features if available
    weather_cols = ['temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 
                    'shortwave_radiation', 'hdd', 'cdd']
    for col in weather_cols:
        if col in df.columns:
            df[col] = df[col].fillna(df[col].mean())
            feature_cols.append(col)
    
    X = df[feature_cols]
    y = df['energy_kwh']
    dates = df['datetime']
    
    # Time-based train/test split
    split_idx = int(len(X) * 0.85)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    dates_test = dates.iloc[split_idx:]
    
    print(f"  Training samples: {len(X_train):,}")
    print(f"  Test samples: {len(X_test):,}")
    print(f"  Features: {len(feature_cols)}")
    
    # Train XGBoost
    model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=8,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False
    )
    
    # Predictions
    y_pred = model.predict(X_test)
    
    # Metrics
    mae = mean_absolute_error(y_test, y_pred)
    mape = np.mean(np.abs((y_test.values - y_pred) / np.where(y_test.values == 0, 1, y_test.values))) * 100
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    print(f"\n  METRICS:")
    print(f"    MAE: {mae:,.2f} kWh")
    print(f"    MAPE: {mape:.2f}%")
    print(f"    RMSE: {rmse:,.2f} kWh")
    
    # Feature importance
    importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\n  TOP 10 FEATURE IMPORTANCE:")
    for _, row in importance.head(10).iterrows():
        print(f"    {row['feature']}: {row['importance']:.4f}")
    
    # Create forecast dataframe
    forecast_export = pd.DataFrame({
        'datetime': dates_test.values,
        'actual': y_test.values,
        'predicted': y_pred,
        'utility': utility,
        'model': 'xgboost'
    })
    
    return {
        'model': model,
        'forecast': forecast_export,
        'metrics': {'mae': mae, 'mape': mape, 'rmse': rmse},
        'feature_importance': importance
    }

# ============================================================
# ANOMALY DETECTION
# ============================================================

def detect_anomalies(daily_data):
    """Detect energy consumption anomalies using Isolation Forest"""
    from sklearn.ensemble import IsolationForest
    
    print(f"\n{'='*60}")
    print("ANOMALY DETECTION")
    print(f"{'='*60}")
    
    # Focus on electricity
    df = daily_data[daily_data['utility'] == 'ELECTRICITY'].copy()
    
    # Features for anomaly detection
    features = ['energy_kwh', 'eui']
    if 'weather_temperature_2m' in df.columns:
        features.append('weather_temperature_2m')
    
    df_clean = df.dropna(subset=features)
    X = df_clean[features]
    
    # Fit Isolation Forest
    iso_forest = IsolationForest(
        contamination=0.05,  # Expect 5% anomalies
        random_state=42,
        n_jobs=-1
    )
    
    df_clean['anomaly'] = iso_forest.fit_predict(X)
    df_clean['anomaly_score'] = iso_forest.decision_function(X)
    
    # Anomalies are labeled as -1
    anomalies = df_clean[df_clean['anomaly'] == -1]
    
    print(f"  Total records: {len(df_clean):,}")
    print(f"  Anomalies detected: {len(anomalies):,} ({len(anomalies)/len(df_clean)*100:.1f}%)")
    
    # Group anomalies by building
    anomaly_summary = anomalies.groupby('simscode').agg({
        'date': 'count',
        'energy_kwh': 'mean',
        'site_name': 'first',
        'buildingname': 'first'
    }).reset_index()
    anomaly_summary.columns = ['simscode', 'anomaly_count', 'avg_anomaly_energy', 
                                'site_name', 'building_name']
    anomaly_summary = anomaly_summary.sort_values('anomaly_count', ascending=False)
    
    print(f"\n  TOP 10 BUILDINGS WITH MOST ANOMALIES:")
    for _, row in anomaly_summary.head(10).iterrows():
        print(f"    {row['building_name']}: {row['anomaly_count']} anomalies")
    
    return {
        'anomaly_data': df_clean,
        'anomaly_summary': anomaly_summary
    }

# ============================================================
# MAIN EXECUTION
# ============================================================

def main():
    """Run all predictive models"""
    print("="*60)
    print("OSU ENERGY PREDICTIVE MODELS")
    print("="*60)
    
    # Load data
    hourly, daily, buildings, weather = load_processed_data()
    
    results = {}
    
    # 1. Prophet Model
    try:
        prophet_result = train_prophet_model(hourly, 'ELECTRICITY')
        results['prophet'] = prophet_result
        prophet_result['forecast'].to_parquet(OUTPUT_DIR / "prophet_forecast.parquet", index=False)
    except Exception as e:
        print(f"  Prophet model error: {e}")
    
    # 2. LSTM Model
    try:
        lstm_result = train_lstm_model(hourly, 'ELECTRICITY', seq_length=168, epochs=30)
        results['lstm'] = lstm_result
        lstm_result['forecast'].to_parquet(OUTPUT_DIR / "lstm_forecast.parquet", index=False)
    except Exception as e:
        print(f"  LSTM model error: {e}")
    
    # 3. XGBoost Model
    try:
        xgb_result = train_xgboost_model(hourly, 'ELECTRICITY')
        results['xgboost'] = xgb_result
        xgb_result['forecast'].to_parquet(OUTPUT_DIR / "xgboost_forecast.parquet", index=False)
        xgb_result['feature_importance'].to_parquet(OUTPUT_DIR / "feature_importance.parquet", index=False)
    except Exception as e:
        print(f"  XGBoost model error: {e}")
    
    # 4. Anomaly Detection
    try:
        anomaly_result = detect_anomalies(daily)
        results['anomalies'] = anomaly_result
        anomaly_result['anomaly_data'].to_parquet(OUTPUT_DIR / "anomaly_data.parquet", index=False)
        anomaly_result['anomaly_summary'].to_parquet(OUTPUT_DIR / "anomaly_summary.parquet", index=False)
    except Exception as e:
        print(f"  Anomaly detection error: {e}")
    
    # Save model comparison
    model_comparison = []
    for model_name in ['prophet', 'xgboost', 'lstm']:
        if model_name in results:
            metrics = results[model_name]['metrics']
            model_comparison.append({
                'model': model_name,
                'mae': metrics['mae'],
                'mape': metrics['mape'],
                'rmse': metrics['rmse']
            })
    
    comparison_df = pd.DataFrame(model_comparison)
    comparison_df.to_parquet(OUTPUT_DIR / "model_comparison.parquet", index=False)
    
    print(f"\n{'='*60}")
    print("MODEL COMPARISON")
    print(f"{'='*60}")
    print(comparison_df.to_string(index=False))
    
    print(f"\n{'='*60}")
    print("ALL MODELS COMPLETE!")
    print(f"{'='*60}")
    
    return results

if __name__ == "__main__":
    main()

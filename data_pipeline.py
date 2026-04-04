import json
import os
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler

def generate_synthetic_data():
    years = np.arange(1990, 2026)
    n = len(years)
    
    population = np.linspace(5.3, 8.1, n) + np.random.normal(0, 0.05, n)
    gdp = np.linspace(22.8, 105.0, n) + np.random.normal(0, 2.0, n)
    
    renewable_share = 15 + (years - 1990) ** 1.5 * 0.1 + np.random.normal(0, 0.5, n)
    renewable_share = np.clip(renewable_share, 0, 100)
    
    base_co2 = 22000 + (gdp * 150) + (population * 1000)
    co2_emissions = base_co2 - (renewable_share * 450) + np.random.normal(0, 500, n)
    
    df = pd.DataFrame({
        'Year': years,
        'Population_Billions': population,
        'GDP_Trillions': gdp,
        'Renewable_Energy_Share': renewable_share,
        'CO2_Emissions_Mt': co2_emissions
    })
    
    return df

def perform_eda(df):
    correlations = df.corr()['CO2_Emissions_Mt'].drop('CO2_Emissions_Mt').to_dict()
    
    last_year = df.iloc[-1]
    prev_year = df.iloc[-2]
    
    yoy_co2 = ((last_year['CO2_Emissions_Mt'] - prev_year['CO2_Emissions_Mt']) / prev_year['CO2_Emissions_Mt']) * 100
    yoy_renewable = last_year['Renewable_Energy_Share'] - prev_year['Renewable_Energy_Share']
    
    return {
        'correlations': {k: float(v) for k, v in correlations.items()},
        'yoy_co2_change_percent': float(yoy_co2),
        'yoy_renewable_change_points': float(yoy_renewable),
        'current_co2': float(last_year['CO2_Emissions_Mt']),
        'current_renewable': float(last_year['Renewable_Energy_Share'])
    }

def train_and_predict(df):
    features = ['Population_Billions', 'GDP_Trillions', 'Renewable_Energy_Share']
    X = df[features]
    y = df['CO2_Emissions_Mt']
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    future_years = np.arange(2026, 2036)
    n_future = len(future_years)
    
    last_pop = df['Population_Billions'].iloc[-1]
    future_pop = np.linspace(last_pop, last_pop + 0.5, n_future)
    
    last_gdp = df['GDP_Trillions'].iloc[-1]
    future_gdp = np.linspace(last_gdp, last_gdp + 20, n_future)
    
    last_renew = df['Renewable_Energy_Share'].iloc[-1]
    
    # 3 Scenarios for Renewable Growth
    baseline_renew = np.linspace(last_renew, last_renew + 15, n_future)
    optimistic_renew = np.linspace(last_renew, last_renew + 30, n_future)
    pessimistic_renew = np.linspace(last_renew, last_renew + 5, n_future)
    
    scenarios = {
        'baseline': baseline_renew,
        'optimistic': optimistic_renew,
        'pessimistic': pessimistic_renew
    }
    
    predictions_output = {'Year': future_years.tolist()}
    
    for name, renew_future in scenarios.items():
        future_X = pd.DataFrame({
            'Population_Billions': future_pop,
            'GDP_Trillions': future_gdp,
            'Renewable_Energy_Share': renew_future
        })
        preds = model.predict(future_X)
        predictions_output[name] = preds.tolist()
    
    float_importances = {k: float(v) for k, v in zip(features, model.feature_importances_)}
    return predictions_output, float_importances

def main():
    os.makedirs('public/data', exist_ok=True)
    
    df = generate_synthetic_data()
    eda_insights = perform_eda(df)
    predictions_output, feature_importances = train_and_predict(df)
    
    eda_insights['feature_importances'] = feature_importances
    
    # Export to JSON
    df.to_json('public/data/historical_data.json', orient='records')
    
    with open('public/data/predictions.json', 'w') as f:
        json.dump(predictions_output, f, indent=4)
        
    with open('public/data/eda_insights.json', 'w') as f:
        json.dump(eda_insights, f, indent=4)
        
    print("Pipeline completed successfully. Multi-scenario data exported.")

if __name__ == "__main__":
    main()

# prediction_server.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import logging
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import MinMaxScaler
import requests
import json
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Define model as a global variable
model = None
crypto_models = {}
scaler = MinMaxScaler(feature_range=(0, 1))

# Try multiple possible paths for the model
possible_paths = [
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'crypto_price_model.pkl'),
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'crypto_price_prediction_model.pkl'),
    'crypto_price_model.pkl',
    'crypto_price_prediction_model.pkl'
]

for model_path in possible_paths:
    logger.info(f"Trying to load model from: {model_path}")
    try:
        if os.path.exists(model_path):
            with open(model_path, 'rb') as file:
                model = pickle.load(file)
            logger.info(f"Model loaded successfully from {model_path}")
            break
    except Exception as e:
        logger.error(f"Error loading model from {model_path}: {str(e)}")

if model is None:
    logger.error("Failed to load model from any path")
    # Initialize a simple model to avoid fallback errors
    model = np.array([1.0, 1.01, 1.02, 1.03, 1.04, 1.05, 1.06, 1.07, 1.08, 1.09, 1.1], dtype=np.float64)
    logger.info("Initialized a simple model to avoid fallback errors")

# Define base prices for different cryptocurrencies in USD
CRYPTO_BASE_PRICES = {
    'BTC': 30000.0,
    'ETH': 2000.0,
    'FTT': 25.0,
    'FXS': 8.0,
    'GALA': 0.02,
    'SOL': 120.0,
    'ADA': 0.4,
    'DOT': 6.0,
    'AVAX': 30.0,
    'MATIC': 0.7,
    'LINK': 15.0,
    'XRP': 0.5,
    'DOGE': 0.1,
    'SHIB': 0.00001,
    'UNI': 7.0,
    'LTC': 70.0,
    'BCH': 250.0,
    'XLM': 0.1,
    'ATOM': 9.0,
    'ALGO': 0.15
}

# Currency conversion rates (relative to USD)
CURRENCY_RATES = {
    'USD': 1.0,
    'EUR': 0.92,  # 1 USD = 0.92 EUR
    'GBP': 0.79,  # 1 USD = 0.79 GBP
    'JPY': 151.0, # 1 USD = 151 JPY
    'INR': 83.5,  # 1 USD = 83.5 INR
    'AUD': 1.52,  # 1 USD = 1.52 AUD
    'CAD': 1.37,  # 1 USD = 1.37 CAD
    'CHF': 0.90,  # 1 USD = 0.90 CHF
    'CNY': 7.23,  # 1 USD = 7.23 CNY
    'HKD': 7.82,  # 1 USD = 7.82 HKD
}

def fetch_historical_data(crypto_symbol, days=60):
    """Fetch historical price data for a cryptocurrency"""
    try:
        # Use CoinGecko API to get historical data
        # This is a placeholder - in production, you should use a proper API key
        url = f"https://api.coingecko.com/api/v3/coins/{crypto_symbol.lower()}/market_chart"
        params = {
            'vs_currency': 'usd',
            'days': days,
            'interval': 'daily'
        }
        
        # Add a delay to avoid rate limiting
        time.sleep(1)
        
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            prices = data.get('prices', [])
            
            # Convert to DataFrame
            df = pd.DataFrame(prices, columns=['timestamp', 'price'])
            df['date'] = pd.to_datetime(df['timestamp'], unit='ms')
            df = df.drop('timestamp', axis=1)
            return df
        else:
            logger.error(f"Failed to fetch data from CoinGecko: {response.status_code}")
            return None
    except Exception as e:
        logger.error(f"Error fetching historical data: {str(e)}")
        return None

def create_features(df):
    """Create features for the model from time series data"""
    # Add lag features
    for i in range(1, 8):  # 7 days of lag features
        df[f'lag_{i}'] = df['price'].shift(i)
    
    # Add rolling mean features
    for window in [3, 7, 14]:
        df[f'rolling_mean_{window}'] = df['price'].rolling(window=window).mean()
    
    # Add rolling standard deviation
    for window in [7, 14]:
        df[f'rolling_std_{window}'] = df['price'].rolling(window=window).std()
    
    # Add momentum indicators
    df['momentum_3'] = df['price'] - df['price'].shift(3)
    df['momentum_7'] = df['price'] - df['price'].shift(7)
    
    # Drop rows with NaN values
    df = df.dropna()
    
    return df

def train_model_for_crypto(crypto_symbol):
    """Train a Linear Regression model for a specific cryptocurrency"""
    try:
        # Fetch historical data
        df = fetch_historical_data(crypto_symbol)
        
        if df is None or len(df) < 30:  # Need at least 30 days of data
            logger.warning(f"Not enough historical data for {crypto_symbol}")
            return None
        
        # Create features
        df = create_features(df)
        
        # Prepare data for training
        X = df.drop(['price', 'date'], axis=1)
        y = df['price']
        
        # Scale features
        X_scaled = scaler.fit_transform(X)
        
        # Train model
        lr_model = LinearRegression()
        lr_model.fit(X_scaled, y)
        
        logger.info(f"Successfully trained Linear Regression model for {crypto_symbol}")
        return {
            'model': lr_model,
            'scaler': scaler,
            'last_features': X.iloc[-1].values,
            'last_price': y.iloc[-1]
        }
    except Exception as e:
        logger.error(f"Error training model for {crypto_symbol}: {str(e)}")
        return None

def predict_with_linear_regression(crypto_symbol, days, base_price):
    """Make predictions using Linear Regression model"""
    # Check if we have a trained model for this crypto
    if crypto_symbol not in crypto_models:
        # Train a new model
        crypto_models[crypto_symbol] = train_model_for_crypto(crypto_symbol)
    
    # If we couldn't train a model, use a simple trend-based prediction
    if crypto_models[crypto_symbol] is None:
        trend = np.linspace(0, 0.2, days)  # Slight upward trend
        noise = np.random.normal(0, 0.01, days)  # Small random noise
        return np.array(base_price * (1 + trend + noise), dtype=np.float64)
    
    # Get the model and last features
    model_data = crypto_models[crypto_symbol]
    lr_model = model_data['model']
    scaler = model_data['scaler']
    last_features = model_data['last_features']
    last_price = model_data['last_price']
    
    # Make predictions
    predictions = [last_price]
    current_features = last_features.copy()
    
    for i in range(days):
        # Scale the features
        scaled_features = scaler.transform([current_features])[0]
        
        # Predict the next price
        next_price = lr_model.predict([scaled_features])[0]
        predictions.append(next_price)
        
        # Update features for the next prediction
        # Shift lag features
        for j in range(6, 0, -1):
            current_features[j] = current_features[j-1]
        current_features[0] = next_price
        
        # Update other features (simplified)
        # In a real implementation, you would update all features properly
        
    # Return only the future predictions (excluding the last known price)
    return np.array(predictions[1:days+1], dtype=np.float64)

@app.route('/predict', methods=['POST'])
def predict():
    # Access the global model variable
    global model
    
    try:
        data = request.json
        crypto_symbol = data.get('symbol', 'BTC')
        days = int(data.get('days', 30))
        currency = data.get('currency', 'USD')
        
        logger.info(f"Prediction request for {crypto_symbol} for {days} days in {currency}")
        
        # Create date range for prediction
        dates = [(datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(days)]
        
        # Get base price for the cryptocurrency (in USD)
        base_price_usd = float(CRYPTO_BASE_PRICES.get(crypto_symbol, 1.0))
        
        # Convert base price to requested currency
        currency_rate = CURRENCY_RATES.get(currency, 1.0)
        base_price = base_price_usd * currency_rate
        
        logger.info(f"Base price for {crypto_symbol}: ${base_price_usd} USD, converted to {currency}: {base_price}")
        
        try:
            # Try to use the Linear Regression model first
            predictions_usd = predict_with_linear_regression(crypto_symbol, days, base_price_usd)
            
            # Convert predictions to requested currency
            predictions = predictions_usd * currency_rate
            
            logger.info(f"Made predictions using Linear Regression model for {crypto_symbol}")
        except Exception as e:
            logger.error(f"Error using Linear Regression model: {str(e)}")
            
            # Fall back to the original model if Linear Regression fails
            if hasattr(model, 'predict'):
                # Generate features for prediction
                features = np.array([[float(i)] for i in range(days)], dtype=np.float64)
                
                predictions_usd = model.predict(features)
                # Ensure predictions are float64
                predictions_usd = np.array(predictions_usd, dtype=np.float64)
                
                # Convert predictions to requested currency
                predictions = predictions_usd * currency_rate
            else:
                # If model is a numpy array, use it directly
                logger.info("Model is a numpy array, using it directly")
                # Just use the first few values from the array as predictions
                if isinstance(model, np.ndarray):
                    # If model array is too small, repeat it
                    if len(model) < days:
                        model_array = np.tile(model, (days // len(model) + 1))
                    else:
                        model_array = model.copy()
                    
                    # Ensure model_array is float64
                    model_array = np.array(model_array[:days], dtype=np.float64)
                    
                    # Calculate mean safely
                    mean_val = np.mean(model_array)
                    if mean_val == 0 or np.isnan(mean_val):
                        scale_factor = base_price_usd
                    else:
                        scale_factor = base_price_usd / mean_val
                    
                    # Scale predictions (in USD)
                    predictions_usd = model_array * scale_factor
                    
                    # Convert to requested currency
                    predictions = predictions_usd * currency_rate
                else:
                    # Create a simple trend-based prediction
                    trend = np.linspace(0, 0.2, days)  # Slight upward trend
                    noise = np.random.normal(0, 0.01, days)  # Small random noise
                    
                    # Generate predictions in USD first
                    predictions_usd = np.array(base_price_usd * (1 + trend + noise), dtype=np.float64)
                    
                    # Convert to requested currency
                    predictions = predictions_usd * currency_rate
        
        # Ensure all predictions are valid numbers
        predictions = np.nan_to_num(predictions, nan=base_price)
        
        # Format response
        result = {
            'symbol': crypto_symbol,
            'currency': currency,
            'predictions': [
                {'date': date, 'price': float(price)} 
                for date, price in zip(dates, predictions)
            ],
            'model_type': 'linear_regression' if crypto_symbol in crypto_models and crypto_models[crypto_symbol] is not None else 'fallback'
        }
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error during prediction: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "model_loaded": model is not None})

@app.route('/supported_coins', methods=['GET'])
def supported_coins():
    return jsonify({"supported_coins": list(CRYPTO_BASE_PRICES.keys())})

@app.route('/supported_currencies', methods=['GET'])
def supported_currencies():
    return jsonify({"supported_currencies": list(CURRENCY_RATES.keys())})

@app.route('/train', methods=['POST'])
def train_models():
    try:
        data = request.json
        symbols = data.get('symbols', list(CRYPTO_BASE_PRICES.keys())[:5])  # Default to first 5 cryptos
        
        results = {}
        for symbol in symbols:
            logger.info(f"Training model for {symbol}")
            crypto_models[symbol] = train_model_for_crypto(symbol)
            results[symbol] = "Success" if crypto_models[symbol] is not None else "Failed"
        
        return jsonify({"status": "success", "results": results})
    except Exception as e:
        logger.error(f"Error during training: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting prediction server on port 5000")
    app.run(port=5000, debug=True)
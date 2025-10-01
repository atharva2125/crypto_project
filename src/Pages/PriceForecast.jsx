
// src/Componets/PriceForecast.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  TimeScale
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { 
  CircularProgress, 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Alert, 
  Card, 
  CardContent, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Slider, 
  Paper,
  Chip,
  Divider
} from '@mui/material';
import { useCrypto } from '../CryptoContext';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const PriceForecast = () => {
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const { currency, symbol } = useCrypto();
  const [selectedCrypto, setSelectedCrypto] = useState('BTC');
  const [error, setError] = useState(null);
  const [supportedCoins, setSupportedCoins] = useState([]);
  const [loadingCoins, setLoadingCoins] = useState(true);
  const [priceChange, setPriceChange] = useState({ amount: 0, percentage: 0 });
  const [modelType, setModelType] = useState('');
  const chartRef = useRef(null);

  // Fetch supported coins from the backend
  useEffect(() => {
    const fetchSupportedCoins = async () => {
      try {
        setLoadingCoins(true);
        const response = await fetch('http://localhost:5000/supported_coins');
        const data = await response.json();
        
        if (data.supported_coins) {
          setSupportedCoins(data.supported_coins);
        }
      } catch (error) {
        console.error('Error fetching supported coins:', error);
        // Fallback list in case the backend is not available
        setSupportedCoins(['BTC', 'ETH', 'FTT', 'FXS', 'GALA', 'SOL', 'ADA', 'DOT']);
      } finally {
        setLoadingCoins(false);
      }
    };

    fetchSupportedCoins();
  }, []);

  // Fetch forecast data when component mounts or when currency changes
  useEffect(() => {
    if (!loadingCoins) {
      fetchForecastData();
    }
  }, [loadingCoins, currency]);

  const fetchForecastData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: selectedCrypto,
          days: days,
          currency: currency,
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      setForecastData(data);
      
      // Set model type - check if it exists in the response
      if (data.model_type) {
        setModelType(data.model_type);
      } else {
        setModelType('fallback');
      }
      
      // Calculate price change
      if (data.predictions && data.predictions.length > 0) {
        const startPrice = data.predictions[0].price;
        const endPrice = data.predictions[data.predictions.length - 1].price;
        const changeAmount = endPrice - startPrice;
        const changePercentage = ((endPrice / startPrice) - 1) * 100;
        
        setPriceChange({
          amount: changeAmount,
          percentage: changePercentage
        });
      }
    } catch (error) {
      console.error('Error fetching forecast data:', error);
      setError('Failed to connect to prediction server. Please make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoChange = (event) => {
    setSelectedCrypto(event.target.value);
  };

  const handleDaysChange = (event, newValue) => {
    setDays(newValue);
  };

  const handleForecastClick = () => {
    fetchForecastData();
  };

  const chartData = {
    labels: forecastData?.predictions.map(p => p.date) || [],
    datasets: [
      {
        label: `${selectedCrypto} Price Forecast (${currency})`,
        data: forecastData?.predictions.map(p => p.price) || [],
        borderColor: 'rgba(238, 188, 29, 1)',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(238, 188, 29, 0.5)');
          gradient.addColorStop(1, 'rgba(238, 188, 29, 0.05)');
          return gradient;
        },
        borderWidth: 4,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#EEBC1D',
        pointBorderColor: '#121212',
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#FFFFFF',
        pointHoverBorderColor: '#EEBC1D',
        pointHoverBorderWidth: 2,
        // 3D effect for line
        borderCapStyle: 'round',
        borderJoinStyle: 'round',
        shadowOffsetX: 3,
        shadowOffsetY: 3,
        shadowBlur: 10,
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        segment: {
          borderColor: (ctx) => {
            // Create a gradient that changes along the line for 3D effect
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, ctx.chart.width, 0);
            gradient.addColorStop(0, 'rgba(238, 188, 29, 0.8)');
            gradient.addColorStop(0.5, 'rgba(255, 215, 0, 1)');
            gradient.addColorStop(1, 'rgba(238, 188, 29, 0.8)');
            return gradient;
          },
        },
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 2000,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'white',
          font: {
            family: 'Montserrat',
            size: 12,
            weight: 'bold',
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      title: {
        display: true,
        text: 'Cryptocurrency Price Forecast (3D)',
        color: '#EEBC1D',
        font: {
          family: 'Montserrat',
          size: 20,
          weight: 'bold',
        },
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(25, 25, 25, 0.9)',
        titleFont: {
          family: 'Montserrat',
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          family: 'Montserrat',
          size: 13,
        },
        borderColor: '#EEBC1D',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `${symbol}${context.parsed.y.toLocaleString()} ${currency}`;
          }
        }
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date',
          color: '#EEBC1D',
          font: {
            family: 'Montserrat',
            size: 14,
            weight: 'bold',
          },
          padding: {top: 10, bottom: 10},
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            family: 'Montserrat',
            size: 11,
          },
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
      },
      y: {
        title: {
          display: true,
          text: `Price (${currency})`,
          color: '#EEBC1D',
          font: {
            family: 'Montserrat',
            size: 14,
            weight: 'bold',
          },
          padding: {top: 0, bottom: 10},
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            family: 'Montserrat',
            size: 11,
          },
          callback: function(value) {
            return `${symbol}${value.toLocaleString()}`;
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(25, 25, 25, 0.9)',
        titleFont: {
          family: 'Montserrat',
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          family: 'Montserrat',
          size: 13,
        },
        borderColor: '#EEBC1D',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `${symbol}${context.parsed.y.toLocaleString()} ${currency}`;
          }
        }
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date',
          color: '#EEBC1D',
          font: {
            family: 'Montserrat',
            size: 14,
            weight: 'bold',
          },
          padding: {top: 10, bottom: 10},
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            family: 'Montserrat',
            size: 11,
          },
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
      },
      y: {
        title: {
          display: true,
          text: `Price (${currency})`,
          color: '#EEBC1D',
          font: {
            family: 'Montserrat',
            size: 14,
            weight: 'bold',
          },
          padding: {top: 0, bottom: 10},
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            family: 'Montserrat',
            size: 11,
          },
          callback: function(value) {
            return `${symbol}${value.toLocaleString()}`;
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
      },
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 4,
        borderCapStyle: 'round',
        fill: true,
        // Enhanced 3D effect
        z: 10,
      },
      point: {
        radius: 5,
        hoverRadius: 7,
        borderWidth: 2,
      }
    },
  };

  return (
    <Container maxWidth="xl" style={{ padding: 0 }}>
      <Typography 
        variant="h4" 
        style={{ 
          margin: '10px 0', 
          fontFamily: 'Montserrat', 
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#EEBC1D',
          textShadow: '0px 2px 4px rgba(0,0,0,0.5)',
        }}
      >
        Cryptocurrency Price Forecast
      </Typography>
      
      {error && (
        <Alert severity="error" style={{ marginBottom: 10 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={0}>
        {/* Left sidebar with forecast controls */}
        <Grid item xs={12} md={3}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: 3, 
              backgroundColor: 'rgba(20, 20, 20, 0.95)',
              borderRadius: 2,
              height: '100%',
              border: '1px solid rgba(238, 188, 29, 0.2)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 3, color: '#EEBC1D', fontFamily: 'Montserrat', fontWeight: 'bold' }}>
              Forecast Settings
            </Typography>
            
            {/* Days to Forecast Slider - Moved more to the left with better styling */}
            <Box sx={{ mb: 4, mt: 2, pl: 0 }}>
              <Typography id="days-slider" gutterBottom sx={{ 
                color: 'white', 
                fontFamily: 'Montserrat', 
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>Days to Forecast:</span>
                <Chip 
                  label={days} 
                  size="small" 
                  sx={{ 
                    backgroundColor: '#EEBC1D', 
                    color: 'black', 
                    fontWeight: 'bold',
                    ml: 1,
                  }} 
                />
              </Typography>
              <Slider
                value={days}
                onChange={handleDaysChange}
                aria-labelledby="days-slider"
                valueLabelDisplay="auto"
                step={5}
                marks
                min={5}
                max={90}
                sx={{
                  ml: -1.5,
                  width: 'calc(100% + 12px)',
                  color: '#EEBC1D',
                  height: 8,
                  '& .MuiSlider-track': {
                    border: 'none',
                    backgroundColor: '#EEBC1D',
                  },
                  '& .MuiSlider-thumb': {
                    height: 20,
                    width: 20,
                    backgroundColor: '#EEBC1D',
                    border: '2px solid #121212',
                    '&:hover, &.Mui-focusVisible': {
                      boxShadow: '0px 0px 0px 8px rgba(238, 188, 29, 0.16)',
                    },
                  },
                  '& .MuiSlider-valueLabel': {
                    backgroundColor: '#EEBC1D',
                    color: 'black',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    padding: '2px 6px',
                  },
                  '& .MuiSlider-rail': {
                    opacity: 0.5,
                    backgroundColor: '#555',
                  },
                  '& .MuiSlider-mark': {
                    backgroundColor: '#777',
                    height: 4,
                    width: 4,
                    borderRadius: '50%',
                  },
                  '& .MuiSlider-markActive': {
                    backgroundColor: '#EEBC1D',
                    opacity: 1,
                  },
                }}
              />
            </Box>
            
            <Divider sx={{ my: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
            
            {/* Cryptocurrency Selector */}
            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom sx={{ color: 'white', fontFamily: 'Montserrat', mb: 1, fontWeight: 'bold' }}>
                Cryptocurrency
              </Typography>
              <FormControl fullWidth variant="outlined" sx={{ mb: 1 }}>
                <Select
                  id="crypto-select"
                  value={selectedCrypto}
                  onChange={handleCryptoChange}
                  sx={{ 
                    color: 'white',
                    backgroundColor: 'rgba(30, 30, 30, 0.9)',
                    height: '48px',
                    '.MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#EEBC1D',
                    },
                    '.MuiSvgIcon-root': {
                      color: 'white',
                    }
                  }}
                  disabled={loadingCoins}
                >
                  {supportedCoins.map((coin) => (
                    <MenuItem key={coin} value={coin}>
                      {coin}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            {/* Currency Display */}
            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom sx={{ color: 'white', fontFamily: 'Montserrat', mb: 1, fontWeight: 'bold' }}>
                Currency: {currency}
              </Typography>
              <Box 
                sx={{ 
                  backgroundColor: '#EEBC1D', 
                  color: 'black',
                  fontWeight: 'bold',
                  fontFamily: 'Montserrat',
                  py: 1,
                  px: 2,
                  borderRadius: '30px',
                  display: 'inline-block'
                }}
              >
                Current: {currency}
              </Box>
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'rgba(255,255,255,0.7)', fontFamily: 'Montserrat' }}>
                Change currency in the header to update forecast
              </Typography>
            </Box>
            
            {/* Generate Forecast Button */}
            <Button
              variant="contained"
              fullWidth
              onClick={handleForecastClick}
              sx={{ 
                backgroundColor: '#EEBC1D',
                color: 'black',
                '&:hover': {
                  backgroundColor: '#D4A913',
                },
                fontFamily: 'Montserrat',
                fontWeight: 'bold',
                py: 1.5,
                fontSize: '1rem',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
              disabled={loading || loadingCoins}
            >
              {loading ? 'Forecasting...' : 'Generate Forecast'}
            </Button>
            
            {/* Current Forecast Info */}
            {forecastData && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ my: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                <Typography variant="body1" sx={{ color: 'white', fontFamily: 'Montserrat', mb: 1, fontWeight: 'bold' }}>
                  Current Forecast:
                </Typography>
                <Typography variant="body2" sx={{ color: '#EEBC1D', fontFamily: 'Montserrat', mb: 1 }}>
                  {selectedCrypto} for {days} days in {currency}
                </Typography>
                <Box 
                  sx={{ 
                    backgroundColor: modelType === 'linear_regression' ? '#4caf50' : '#ff9800',
                    color: 'white',
                    fontFamily: 'Montserrat',
                    fontSize: '0.8rem',
                    py: 0.5,
                    px: 2,
                    borderRadius: '30px',
                    display: 'inline-block'
                  }}
                >
                  Model: {modelType === 'linear_regression' ? 'Linear Regression' : 'Fallback'}
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* Main content area with chart */}
        <Grid item xs={12} md={9}>
          <Paper 
            elevation={3} 
            sx={{ 
              p: { xs: 0, sm: 0, md: 0 }, 
              backgroundColor: 'rgba(25, 25, 25, 0.95)',
              borderRadius: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 650,
              border: '1px solid rgba(238, 188, 29, 0.2)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              m: 0,
              pt: 0,
              pb: 0
            }}
          >
            {loading ? (
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress style={{ color: '#EEBC1D' }} size={80} thickness={1} />
                <Typography variant="body1" sx={{ color: 'white', mt: 2, fontFamily: 'Montserrat' }}>
                  Generating forecast...
                </Typography>
              </Box>
            ) : loadingCoins ? (
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress style={{ color: '#EEBC1D' }} size={40} thickness={1} />
                <Typography variant="body1" sx={{ color: 'white', mt: 2, fontFamily: 'Montserrat' }}>
                  Loading supported cryptocurrencies...
                </Typography>
              </Box>
            ) : forecastData ? (
              <Box 
                sx={{ 
                  width: '100%', 
                  height: { xs: 550, sm: 600, md: 650, lg: 700 }, 
                  p: 0,
                  m: 0,
                  perspective: '800px',
                  transform: 'rotateX(5deg)',
                  '& canvas': {
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                    background: 'linear-gradient(180deg, rgba(40,40,40,0.7) 0%, rgba(20,20,20,0.9) 100%)',
                  }
                }}
              >
                <Box
                  ref={chartRef}
                  sx={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    transformStyle: 'preserve-3d',
                    '&:after': {
                      content: '""',
                      position: 'absolute',
                      bottom: '-15px',
                      left: '5%',
                      width: '90%',
                      height: '20px',
                      background: 'rgba(0,0,0,0.2)',
                      filter: 'blur(15px)',
                      borderRadius: '50%',
                      zIndex: -1,
                      opacity: 0.7
                    }
                  }}
                >
                  <Line data={chartData} options={chartOptions} />
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', p: 3 }}>
                <Typography variant="body1" sx={{ color: 'white', fontFamily: 'Montserrat', mb: 2 }}>
                  No forecast data available. Click "Generate Forecast" to get started.
                </Typography>
                <Button
                  variant="outlined"
                  onClick={handleForecastClick}
                  sx={{ 
                    borderColor: '#EEBC1D',
                    color: '#EEBC1D',
                    '&:hover': {
                      borderColor: '#D4A913',
                      backgroundColor: 'rgba(238, 188, 29, 0.1)',
                    },
                    fontFamily: 'Montserrat',
                  }}
                  disabled={loading || loadingCoins}
                >
                  Generate Forecast
                </Button>
              </Box>
            )}
          </Paper>
          
          {/* Forecast details below the chart */}
          {forecastData && (
            <Paper 
              elevation={3} 
              sx={{ 
                p: { xs: 2, sm: 3, md: 4 }, 
                mt: 0, 
                backgroundColor: 'rgba(33, 33, 33, 0.9)',
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, color: '#EEBC1D', fontFamily: 'Montserrat' }}>
                Forecast Details
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" sx={{ color: 'white', fontFamily: 'Montserrat', mb: 1 }}>
                    Starting Price: {symbol}{forecastData.predictions[0]?.price.toLocaleString()} {currency}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'white', fontFamily: 'Montserrat', mb: 1 }}>
                    Ending Price: {symbol}{forecastData.predictions[forecastData.predictions.length - 1]?.price.toLocaleString()} {currency}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: priceChange.amount >= 0 ? '#4caf50' : '#f44336', 
                      fontFamily: 'Montserrat', 
                      mb: 1,
                      fontWeight: 'bold'
                    }}
                  >
                    Price Change: {symbol}{Math.abs(priceChange.amount).toLocaleString()} {currency} {priceChange.amount >= 0 ? '↑' : '↓'}
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: priceChange.percentage >= 0 ? '#4caf50' : '#f44336', 
                      fontFamily: 'Montserrat', 
                      mb: 1,
                      fontWeight: 'bold'
                    }}
                  >
                    Percentage Change: {priceChange.percentage.toFixed(2)}% {priceChange.percentage >= 0 ? '↑' : '↓'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default PriceForecast;
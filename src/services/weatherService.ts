
export interface WeatherData {
  current: {
    temp: number;
    weatherCode: number;
    windSpeed: number;
    humidity: number;
    apparentTemp: number;
    time: string;
  };
  daily: {
    time: string[];
    weatherCode: number[];
    tempMax: number[];
    tempMin: number[];
    precipitationSum: number[];
  };
  trend: {
    time: string[];
    tempMax: number[];
    tempMin: number[];
  };
}

const WEATHER_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: 'Sonnig', icon: 'Sun' },
  1: { label: 'Sonnig', icon: 'Sun' },
  2: { label: 'Leicht bewölkt', icon: 'CloudSun' },
  3: { label: 'Wolkig', icon: 'Cloud' },
  45: { label: 'Nebel', icon: 'CloudFog' },
  48: { label: 'Reifnebel', icon: 'CloudFog' },
  51: { label: 'Leichter Niesel', icon: 'CloudDrizzle' },
  53: { label: 'Mäßiger Niesel', icon: 'CloudDrizzle' },
  55: { label: 'Dichter Niesel', icon: 'CloudDrizzle' },
  56: { label: 'Gefrierender Niesel', icon: 'CloudDrizzle' },
  57: { label: 'Starker gefrierender Niesel', icon: 'CloudDrizzle' },
  61: { label: 'Leichter Regen', icon: 'CloudRain' },
  63: { label: 'Mäßiger Regen', icon: 'CloudRain' },
  65: { label: 'Starker Regen', icon: 'CloudRain' },
  66: { label: 'Gefrierender Regen', icon: 'CloudRain' },
  67: { label: 'Starker gefrierender Regen', icon: 'CloudRain' },
  71: { label: 'Leichter Schneefall', icon: 'CloudSnow' },
  73: { label: 'Mäßiger Schneefall', icon: 'CloudSnow' },
  75: { label: 'Starker Schneefall', icon: 'CloudSnow' },
  77: { label: 'Schneegriesel', icon: 'CloudSnow' },
  80: { label: 'Leichte Regenschauer', icon: 'CloudRain' },
  81: { label: 'Mäßige Regenschauer', icon: 'CloudRain' },
  82: { label: 'Heftige Regenschauer', icon: 'CloudRain' },
  85: { label: 'Leichte Schneeschauer', icon: 'CloudSnow' },
  86: { label: 'Starke Schneeschauer', icon: 'CloudSnow' },
  95: { label: 'Gewitter', icon: 'CloudLightning' },
  96: { label: 'Gewitter mit Hagel', icon: 'CloudLightning' },
  99: { label: 'Schweres Gewitter mit Hagel', icon: 'CloudLightning' },
};

export function getWeatherInfo(code: number) {
  return WEATHER_CODES[code] || { label: 'Unbekannt', icon: 'Cloud' };
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=14`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn('Wetter API Error:', response.status);
      throw new Error('Wetterdaten konnten nicht geladen werden');
    }
    
    const data = await response.json();
    
    return {
      current: {
        temp: data.current.temperature_2m,
        weatherCode: data.current.weather_code,
        windSpeed: data.current.wind_speed_10m,
        humidity: data.current.relative_humidity_2m,
        apparentTemp: data.current.apparent_temperature,
        time: data.current.time,
      },
      daily: {
        time: data.daily.time.slice(0, 8),
        weatherCode: data.daily.weather_code.slice(0, 8),
        tempMax: data.daily.temperature_2m_max.slice(0, 8),
        tempMin: data.daily.temperature_2m_min.slice(0, 8),
        precipitationSum: data.daily.precipitation_sum.slice(0, 8),
      },
      trend: {
        time: data.daily.time,
        tempMax: data.daily.temperature_2m_max,
        tempMin: data.daily.temperature_2m_min,
      }
    };
  } catch (error) {
    console.error('Failed to fetch weather data:', error);
    throw error;
  }
}

export async function fetchCityName(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
      headers: {
        'Accept-Language': 'de',
        'User-Agent': 'RoPro-OS/1.0'
      }
    });
    if (!response.ok) return 'Dein Standort';
    const data = await response.json();
    return data.address?.city || data.address?.town || data.address?.village || data.address?.suburb || 'Dein Standort';
  } catch (error) {
    console.warn('City name fetch failed:', error);
    return 'Dein Standort';
  }
}

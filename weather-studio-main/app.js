const { createApp, reactive, computed, onMounted } = Vue;

const WEATHER_CODE_MAP = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail"
};

const WEATHER_ICON_MAP = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  53: "🌦️",
  55: "🌧️",
  56: "🌧️",
  57: "🌧️",
  61: "🌧️",
  63: "🌧️",
  65: "🌧️",
  66: "🌧️",
  67: "🌧️",
  71: "🌨️",
  73: "🌨️",
  75: "❄️",
  77: "❄️",
  80: "🌧️",
  81: "🌧️",
  82: "⛈️",
  85: "🌨️",
  86: "🌨️",
  95: "⛈️",
  96: "⛈️",
  99: "⛈️"
};

function classifyAqi(aqi) {
  if (aqi === null || aqi === undefined || Number.isNaN(aqi)) {
    return {
      label: "AQI unavailable",
      className: "aqi-moderate",
      advice: "Unable to evaluate air quality right now."
    };
  }

  if (aqi <= 50) {
    return {
      label: "Good",
      className: "aqi-good",
      advice: "Air is clean. Outdoor activities are great right now."
    };
  }

  if (aqi <= 100) {
    return {
      label: "Moderate",
      className: "aqi-moderate",
      advice: "Air quality is acceptable for most people."
    };
  }

  if (aqi <= 150) {
    return {
      label: "Unhealthy for Sensitive Groups",
      className: "aqi-sensitive",
      advice: "Sensitive groups should limit prolonged outdoor exertion."
    };
  }

  if (aqi <= 200) {
    return {
      label: "Unhealthy",
      className: "aqi-unhealthy",
      advice: "Consider reducing outdoor exposure if possible."
    };
  }

  if (aqi <= 300) {
    return {
      label: "Very Unhealthy",
      className: "aqi-very-unhealthy",
      advice: "Avoid heavy outdoor activity and consider protection."
    };
  }

  return {
    label: "Hazardous",
    className: "aqi-hazardous",
    advice: "Stay indoors and avoid outdoor exertion."
  };
}

function roundNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  return Math.round(value);
}

function weatherDescription(code) {
  if (code === null || code === undefined) {
    return "Condition unavailable";
  }
  return WEATHER_CODE_MAP[code] || "Condition unavailable";
}

function weatherIcon(code, themePeriod = "day") {
  if (code === null || code === undefined) {
    return "🌡️";
  }

  if (themePeriod === "night") {
    if (code === 0 || code === 1) {
      return "🌙";
    }
    if (code === 2) {
      return "☁️";
    }
  }

  return WEATHER_ICON_MAP[code] || "🌤️";
}

function formatForecastDay(dateText, index) {
  if (index === 0) {
    return "Today";
  }
  const date = new Date(dateText);
  return date.toLocaleDateString([], { weekday: "short" });
}

function resolveLocalHour(currentTime, timezone) {
  if (typeof currentTime === "string") {
    const match = currentTime.match(/T(\d{2}):/);
    if (match) {
      return Number(match[1]);
    }
  }

  if (timezone) {
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone
    }).formatToParts(new Date());
    const hourPart = parts.find((part) => part.type === "hour");
    if (hourPart) {
      return Number(hourPart.value);
    }
  }

  return new Date().getHours();
}

function getThemePeriodByHour(hour) {
  if (hour >= 6 && hour < 12) {
    return "day";
  }
  if (hour >= 12 && hour < 17) {
    return "afternoon";
  }
  if (hour >= 17 && hour < 20) {
    return "evening";
  }
  return "night";
}

function applyBodyTheme(period) {
  const classes = ["theme-day", "theme-afternoon", "theme-evening", "theme-night"];
  document.body.classList.remove(...classes);
  document.body.classList.add(`theme-${period}`);
}

function toFahrenheit(celsius) {
  if (celsius === null || celsius === undefined || Number.isNaN(celsius)) {
    return null;
  }
  return (celsius * 9) / 5 + 32;
}

function toMph(kmh) {
  if (kmh === null || kmh === undefined || Number.isNaN(kmh)) {
    return null;
  }
  return kmh * 0.621371;
}

function buildWeatherUrl(latitude, longitude) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,pressure_msl,cloud_cover"
  );
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  url.searchParams.set("forecast_days", "5");
  url.searchParams.set("timezone", "auto");
  return url;
}

function buildAirUrl(latitude, longitude) {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide");
  url.searchParams.set("timezone", "auto");
  return url;
}

function buildReverseGeocodeUrl(latitude, longitude) {
  const url = new URL("https://api.bigdatacloud.net/data/reverse-geocode-client");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("localityLanguage", "en");
  return url;
}

function buildReverseGeocodeFallbackUrl(latitude, longitude) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("accept-language", "en");
  return url;
}

function getLocationName(reverseGeo, timezone) {
  if (!reverseGeo) {
    if (timezone && String(timezone).includes("/")) {
      return String(timezone).split("/").pop().replace(/_/g, " ");
    }
    return "Current Location";
  }

  const hit = reverseGeo.results && reverseGeo.results.length > 0 ? reverseGeo.results[0] : reverseGeo;
  const address = hit.address || {};

  const placeName =
    hit.city ||
    hit.locality ||
    hit.town ||
    hit.village ||
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    hit.name;

  const state = hit.principalSubdivision || hit.admin1 || address.state;
  const country = hit.countryName || hit.country || address.country;

  const parts = [placeName, state, country].filter(Boolean);
  if (parts.length) {
    return parts.join(", ");
  }

  if (hit.display_name) {
    return String(hit.display_name).split(",")[0].trim();
  }

  if (timezone && String(timezone).includes("/")) {
    return String(timezone).split("/").pop().replace(/_/g, " ");
  }

  return "Current Location";
}

async function fetchJson(url, options) {
  const maxRetries = 2;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff: 1s, 2s)
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
      }
    }
  }

  throw lastError || new Error("Fetch failed after retries");
}

async function fetchReverseGeocode(latitude, longitude) {
  try {
    return await fetchJson(buildReverseGeocodeUrl(latitude, longitude));
  } catch (_primaryError) {
    try {
      return await fetchJson(buildReverseGeocodeFallbackUrl(latitude, longitude), {
        headers: {
          Accept: "application/json"
        }
      });
    } catch (_fallbackError) {
      return null;
    }
  }
}

function getPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 180000
    });
  });
}

function geolocationErrorMessage(error) {
  if (!error) {
    return "Unable to detect location.";
  }

  if (error.code === 1) {
    return "Location access denied. Please allow location permission and refresh.";
  }

  if (error.code === 2) {
    return "Location information is unavailable.";
  }

  if (error.code === 3) {
    return "Location request timed out. Please try again.";
  }

  return "Unable to detect location.";
}

createApp({
  setup() {
    const state = reactive({
      loading: false,
      error: "",
      status: "",
      unitSystem: "metric",
      locationName: "Current Location",
      current: null,
      currentUnits: null,
      air: null,
      airUnits: null,
      daily: null,
      dailyUnits: null,
      selectedForecastIndex: 0,
      updatedAt: null,
      weatherTimezone: "",
      themePeriod: "day"
    });

    const currentWeatherText = computed(() => weatherDescription(state.current?.weather_code));
    const currentWeatherIcon = computed(() => weatherIcon(state.current?.weather_code, state.themePeriod));

    const currentTemp = computed(() => {
      const value = state.current?.temperature_2m;
      if (value === null || value === undefined) {
        return "--";
      }

      if (state.unitSystem === "imperial") {
        const f = roundNumber(toFahrenheit(value));
        return f === null ? "--" : `${f}°F`;
      }

      const c = roundNumber(value);
      return c === null ? "--" : `${c}°C`;
    });

    const feelsLikeTemp = computed(() => {
      const value = state.current?.apparent_temperature;
      if (value === null || value === undefined) {
        return "--";
      }

      if (state.unitSystem === "imperial") {
        const f = roundNumber(toFahrenheit(value));
        return f === null ? "--" : `${f}°F`;
      }

      const c = roundNumber(value);
      return c === null ? "--" : `${c}°C`;
    });

    const humidityText = computed(() => {
      const value = roundNumber(state.current?.relative_humidity_2m);
      return value === null ? "--" : `${value}%`;
    });

    const windText = computed(() => {
      const value = state.current?.wind_speed_10m;
      if (value === null || value === undefined) {
        return "--";
      }

      if (state.unitSystem === "imperial") {
        const mph = roundNumber(toMph(value));
        return mph === null ? "--" : `${mph} mph`;
      }

      const kmh = roundNumber(value);
      return kmh === null ? "--" : `${kmh} km/h`;
    });

    const pressureText = computed(() => {
      const value = roundNumber(state.current?.pressure_msl);
      return value === null ? "--" : `${value} hPa`;
    });

    const cloudCoverText = computed(() => {
      const value = roundNumber(state.current?.cloud_cover);
      return value === null ? "--" : `${value}%`;
    });

    const aqiMeta = computed(() => classifyAqi(state.air?.us_aqi));

    const aqiValueText = computed(() => {
      const value = roundNumber(state.air?.us_aqi);
      return value === null ? "--" : String(value);
    });

    const aqiProgress = computed(() => {
      const value = state.air?.us_aqi;
      if (value === null || value === undefined || Number.isNaN(value)) {
        return 0;
      }
      const bounded = Math.min(Math.max(value, 0), 300);
      return Math.round((bounded / 300) * 100);
    });

    const forecastDays = computed(() => {
      if (!state.daily || !state.daily.time || !state.daily.time.length) {
        return [];
      }

      const days = [];
      const count = Math.min(5, state.daily.time.length);
      for (let i = 0; i < count; i += 1) {
        const maxTemp = state.daily.temperature_2m_max?.[i];
        const minTemp = state.daily.temperature_2m_min?.[i];

        const formattedMax = state.unitSystem === "imperial" ? roundNumber(toFahrenheit(maxTemp)) : roundNumber(maxTemp);
        const formattedMin = state.unitSystem === "imperial" ? roundNumber(toFahrenheit(minTemp)) : roundNumber(minTemp);

        const unit = state.unitSystem === "imperial" ? "°F" : "°C";

        days.push({
          date: state.daily.time[i],
          label: formatForecastDay(state.daily.time[i], i),
          icon: weatherIcon(state.daily.weather_code?.[i]),
          description: weatherDescription(state.daily.weather_code?.[i]),
          max: formattedMax === null ? "--" : `${formattedMax}${unit}`,
          min: formattedMin === null ? "--" : `${formattedMin}${unit}`,
          rainChance:
            state.daily.precipitation_probability_max?.[i] === null ||
            state.daily.precipitation_probability_max?.[i] === undefined
              ? "--"
              : `${roundNumber(state.daily.precipitation_probability_max[i])}%`
        });
      }

      return days;
    });

    const selectedForecast = computed(() => {
      if (!forecastDays.value.length) {
        return null;
      }

      const index = Math.min(state.selectedForecastIndex, forecastDays.value.length - 1);
      return forecastDays.value[index];
    });

    const updatedAtText = computed(() => {
      if (!state.updatedAt) {
        return "--";
      }
      return state.updatedAt.toLocaleString();
    });

    function pollutantText(value, unit) {
      const rounded = roundNumber(value);
      if (rounded === null) {
        return "--";
      }
      return `${rounded}${unit || ""}`;
    }

    function setUnit(unit) {
      state.unitSystem = unit;
    }

    async function refreshWeather() {
      state.loading = true;
      state.error = "";
      state.status = "";

      try {
        if (!navigator.geolocation) {
          throw new Error("Geolocation is not supported by this browser.");
        }

        const position = await getPosition();
        const { latitude, longitude } = position.coords;

        const [weatherData, airData, reverseGeo] = await Promise.all([
          fetchJson(buildWeatherUrl(latitude, longitude)),
          fetchJson(buildAirUrl(latitude, longitude)),
          fetchReverseGeocode(latitude, longitude)
        ]);

        state.current = weatherData.current;
        state.currentUnits = weatherData.current_units;
        state.daily = weatherData.daily;
        state.dailyUnits = weatherData.daily_units;
        state.air = airData.current;
        state.airUnits = airData.current_units;
        state.locationName = getLocationName(reverseGeo, weatherData.timezone);
        state.weatherTimezone = weatherData.timezone || "";
        const localHour = resolveLocalHour(weatherData.current?.time, state.weatherTimezone);
        state.themePeriod = getThemePeriodByHour(localHour);
        applyBodyTheme(state.themePeriod);
        state.selectedForecastIndex = 0;
        state.updatedAt = new Date();
        state.status = "";
      } catch (error) {
        const message = error && typeof error.code === "number" ? geolocationErrorMessage(error) : error.message;
        state.error = message || "Something went wrong while loading weather data.";
        state.status = state.error;
      } finally {
        state.loading = false;
      }
    }

    onMounted(() => {
      applyBodyTheme(state.themePeriod);
      refreshWeather();
    });

    return {
      state,
      currentWeatherText,
      currentWeatherIcon,
      currentTemp,
      feelsLikeTemp,
      humidityText,
      windText,
      pressureText,
      cloudCoverText,
      aqiMeta,
      aqiValueText,
      aqiProgress,
      forecastDays,
      selectedForecast,
      updatedAtText,
      pollutantText,
      setUnit,
      refreshWeather
    };
  }
}).mount("#app");
















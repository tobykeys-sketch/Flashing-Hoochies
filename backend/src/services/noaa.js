const axios = require('axios');

const BASE = 'https://api.weather.gov';
const HEADERS = { 'User-Agent': 'PugetFishingApp/1.0 contact@example.com', Accept: 'application/geo+json' };

// Marine zones for each area
const ZONES = {
  10: { code: 'PZZ134', label: 'Admiralty Inlet & Seattle' },
  11: { code: 'PZZ135', label: 'Puget Sound & Hood Canal' },
};

// Grid points for each area (used for hourly wind data)
// SEW = Seattle/Puget Sound NWS office
const GRIDPOINTS = {
  10: { wfo: 'SEW', x: 124, y: 61 }, // Seattle area
  11: { wfo: 'SEW', x: 120, y: 55 }, // Tacoma/South Sound
};

async function getMarineForecast(areaNum) {
  const zone = ZONES[areaNum];
  try {
    const { data } = await axios.get(`${BASE}/zones/marine/${zone.code}/forecast`, { headers: HEADERS });
    const periods = data.properties?.periods || [];
    return periods.slice(0, 4); // next 4 forecast periods
  } catch (err) {
    console.error(`NOAA zone forecast error for area ${areaNum}:`, err.message);
    return [];
  }
}

async function getActiveAdvisories(areaNum) {
  const zone = ZONES[areaNum];
  try {
    const { data } = await axios.get(`${BASE}/alerts/active?zone=${zone.code}`, { headers: HEADERS });
    const features = data.features || [];
    return features.map(f => ({
      event: f.properties.event,
      headline: f.properties.headline,
      severity: f.properties.severity,
      onset: f.properties.onset,
      expires: f.properties.expires,
      description: f.properties.description?.slice(0, 300),
    }));
  } catch (err) {
    console.error(`NOAA alerts error for area ${areaNum}:`, err.message);
    return [];
  }
}

async function getHourlyWind(areaNum) {
  const gp = GRIDPOINTS[areaNum];
  try {
    const { data } = await axios.get(
      `${BASE}/gridpoints/${gp.wfo}/${gp.x},${gp.y}/forecast/hourly`,
      { headers: HEADERS }
    );
    const periods = data.properties?.periods || [];
    // Return next 48 hours (2 days)
    return periods.slice(0, 48).map(p => ({
      time: p.startTime,
      windSpeed: p.windSpeed,
      windDirection: p.windDirection,
      shortForecast: p.shortForecast,
      temperature: p.temperature,
      temperatureUnit: p.temperatureUnit,
    }));
  } catch (err) {
    console.error(`NOAA hourly wind error for area ${areaNum}:`, err.message);
    return [];
  }
}

// Daily (day/night) 2-day forecast from gridpoint — gives temperature + conditions summary
async function getDailyForecast(areaNum) {
  const gp = GRIDPOINTS[areaNum];
  try {
    const { data } = await axios.get(
      `${BASE}/gridpoints/${gp.wfo}/${gp.x},${gp.y}/forecast`,
      { headers: HEADERS }
    );
    const periods = data.properties?.periods || [];
    // Return next 4 periods (today, tonight, tomorrow, tomorrow night)
    return periods.slice(0, 4).map(p => ({
      name:            p.name,
      isDaytime:       p.isDaytime,
      temperature:     p.temperature,
      temperatureUnit: p.temperatureUnit,
      windSpeed:       p.windSpeed,
      windDirection:   p.windDirection,
      shortForecast:   p.shortForecast,
      detailedForecast: p.detailedForecast,
      icon:            p.icon,
      startTime:       p.startTime,
    }));
  } catch (err) {
    console.error(`NOAA daily forecast error for area ${areaNum}:`, err.message);
    return [];
  }
}

// Parse wind speed string like "15 mph" -> number in knots
function parseWindKnots(windSpeedStr) {
  if (!windSpeedStr) return null;
  const match = windSpeedStr.match(/(\d+)/);
  if (!match) return null;
  const mph = parseInt(match[1], 10);
  return Math.round(mph * 0.868976); // mph to knots
}

module.exports = { getMarineForecast, getActiveAdvisories, getHourlyWind, getDailyForecast, parseWindKnots, ZONES };

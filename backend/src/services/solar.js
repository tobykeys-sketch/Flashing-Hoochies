const axios = require('axios');

// Representative coordinates for each marine area
const COORDS = {
  10: { lat: 47.60, lng: -122.33 }, // Seattle / Shilshole
  11: { lat: 47.25, lng: -122.44 }, // Tacoma / Redondo
};

/**
 * Fetch sunrise, sunset, and civil twilight for a marine area.
 * Uses api.sunrise-sunset.org — free, no key required.
 * Returns times as local ISO strings (converted from UTC).
 */
async function getSolarTimes(areaNum) {
  const coord = COORDS[areaNum];
  if (!coord) return null;

  try {
    const { data } = await axios.get('https://api.sunrise-sunset.org/json', {
      params: { lat: coord.lat, lng: coord.lng, date: 'today', formatted: 0 },
      headers: { 'User-Agent': 'PugetFishingApp/1.0' },
    });

    if (data.status !== 'OK') return null;
    const r = data.results;

    return {
      civilTwilightBegin: r.civil_twilight_begin, // first light — good to launch
      sunrise:            r.sunrise,
      solarNoon:          r.solar_noon,
      sunset:             r.sunset,
      civilTwilightEnd:   r.civil_twilight_end,   // last light
      dayLengthSec:       r.day_length,
    };
  } catch (err) {
    console.error(`Solar times error for area ${areaNum}:`, err.message);
    return null;
  }
}

/**
 * Human-readable summary for the card:
 *   { firstLight, sunrise, sunset, lastLight, isBeforeSunrise, isAfterSunset, minutesToSunrise }
 */
function summarizeSolar(solar) {
  if (!solar) return null;
  const now = Date.now();
  const srMs = new Date(solar.sunrise).getTime();
  const ssMs = new Date(solar.sunset).getTime();
  const flMs = new Date(solar.civilTwilightBegin).getTime();

  const isBeforeSunrise = now < srMs;
  const isAfterSunset   = now > ssMs;
  const minutesToSunrise = isBeforeSunrise ? Math.round((srMs - now) / 60000) : null;
  const minutesToFirstLight = (now < flMs) ? Math.round((flMs - now) / 60000) : null;

  // Day length in h m
  const hrs = Math.floor(solar.dayLengthSec / 3600);
  const mins = Math.floor((solar.dayLengthSec % 3600) / 60);

  return {
    firstLight:           solar.civilTwilightBegin,
    sunrise:              solar.sunrise,
    sunset:               solar.sunset,
    lastLight:            solar.civilTwilightEnd,
    dayLength:            `${hrs}h ${mins}m`,
    isBeforeSunrise,
    isAfterSunset,
    minutesToSunrise,
    minutesToFirstLight,
  };
}

module.exports = { getSolarTimes, summarizeSolar };

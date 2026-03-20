const express = require('express');
const router = express.Router();
const { getMarineForecast, getActiveAdvisories, getHourlyWind, getDailyForecast } = require('../services/noaa');
const { getCreelData } = require('../services/wdfw');
const { scoreFishingConditions } = require('../services/fishingScore');
const { getTides, nextEvent } = require('../services/tides');
const { getSolarTimes, summarizeSolar } = require('../services/solar');
const { fetchRssRules, getEmergencyRules } = require('../services/emergencyRules');

// In-memory cache (refreshed by cron every 30 min)
let cache = {};
let lastFetch = null;

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function fetchAllConditions() {
  const areas = [10, 11];
  const results = {};

  // Fetch RSS once — shared across all areas (avoids 3x hitting the same feed)
  const rssItems = await fetchRssRules();

  await Promise.all(areas.map(async (areaNum) => {
    const [marineForecast, advisories, hourlyWind, dailyForecast, creel, tideData, solarRaw, emergency] = await Promise.all([
      getMarineForecast(areaNum),
      getActiveAdvisories(areaNum),
      getHourlyWind(areaNum),
      getDailyForecast(areaNum),
      getCreelData(areaNum, 5),
      getTides(areaNum),
      getSolarTimes(areaNum),
      getEmergencyRules(areaNum, rssItems),
    ]);

    const scoring = scoreFishingConditions({ advisories, hourlyWind, creel, emergency });

    results[areaNum] = {
      areaNum,
      areaName: getAreaName(areaNum),
      scoring,
      emergency,
      advisories,
      forecast: marineForecast.slice(0, 6),   // marine zone forecast (~3 days)
      dailyForecast,                           // gridpoint day/night (2 days)
      hourlyWind: hourlyWind.slice(0, 48),     // 48-hour hourly wind
      creel,
      tides: {
        station:        tideData.station,
        stationId:      tideData.stationId,
        events:         tideData.events,
        next:           nextEvent(tideData.events),
        optimalWindows: tideData.optimalWindows,
        isOptimalNow:   tideData.isOptimalNow,
        nextOptimal:    tideData.nextOptimal,
      },
      solar:    summarizeSolar(solarRaw),
      fetchedAt: new Date().toISOString(),
    };
  }));

  return results;
}

function getAreaName(n) {
  return { 10: 'Seattle/Bremerton (Area 10)', 11: 'Tacoma/Vashon Island (Area 11)' }[n];
}

// GET /api/conditions
router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    if (!lastFetch || now - lastFetch > CACHE_TTL_MS || Object.keys(cache).length === 0) {
      cache = await fetchAllConditions();
      lastFetch = now;
    }
    res.json({ areas: cache, cachedAt: new Date(lastFetch).toISOString() });
  } catch (err) {
    console.error('Conditions fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch conditions' });
  }
});

// GET /api/conditions/refresh — force refresh (useful for dev)
router.get('/refresh', async (req, res) => {
  try {
    cache = await fetchAllConditions();
    lastFetch = Date.now();
    res.json({ areas: cache, cachedAt: new Date(lastFetch).toISOString() });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Refresh failed' });
  }
});

module.exports = router;

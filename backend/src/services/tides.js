const axios = require('axios');

const BASE = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

// NOAA tide gauge stations closest to each marine area
const STATIONS = {
  10: { id: '9447130', name: 'Seattle' },
  11: { id: '9446484', name: 'Tacoma'  },
};

function yyyymmdd(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * Fetch today + tomorrow high/low tide predictions for a marine area.
 * Returns an array of events: { time, type, heightFt, label }
 * plus calculated slack events inserted between each H/L pair.
 */
async function getTides(areaNum) {
  const station = STATIONS[areaNum];
  if (!station) return { station: null, events: [] };

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const params = {
    product:      'predictions',
    application:  'puget_fishing_app',
    begin_date:   yyyymmdd(today),
    end_date:     yyyymmdd(tomorrow),
    datum:        'MLLW',
    station:      station.id,
    time_zone:    'lst_ldt',
    interval:     'hilo',
    units:        'english',
    format:       'json',
  };

  try {
    const { data } = await axios.get(BASE, { params });
    const raw = data.predictions || [];
    const hilo = parseHilo(raw);
    const events = buildEvents(hilo);
    const optimalWindows = buildOptimalWindows(hilo);
    const isOptimalNow = optimalWindows.some(w =>
      Date.now() >= new Date(w.start).getTime() && Date.now() <= new Date(w.end).getTime()
    );
    const nextOptimal = optimalWindows.find(w => new Date(w.end).getTime() > Date.now()) || null;
    return { station: station.name, stationId: station.id, events, optimalWindows, isOptimalNow, nextOptimal };
  } catch (err) {
    console.error(`NOAA tides error for area ${areaNum}:`, err.message);
    return { station: station.name, stationId: station.id, events: [], optimalWindows: [], isOptimalNow: false, nextOptimal: null };
  }
}

/** Parse raw NOAA predictions into sorted hilo objects */
function parseHilo(raw) {
  return raw.map(p => ({
    time:     new Date(p.t),
    type:     p.type === 'H' ? 'high' : 'low',
    heightFt: parseFloat(p.v),
  })).sort((a, b) => a.time - b.time);
}

/**
 * Optimal fishing windows: ±2 hours around each high or low tide change.
 * Tidal current runs strongest in the 2 hours before/after the turn,
 * activating baitfish and making predators feed aggressively.
 */
function buildOptimalWindows(hilo) {
  const TWO_HOURS = 2 * 60 * 60 * 1000;
  return hilo.map(e => ({
    start:    new Date(e.time.getTime() - TWO_HOURS).toISOString(),
    peak:     e.time.toISOString(),
    end:      new Date(e.time.getTime() + TWO_HOURS).toISOString(),
    peakType: e.type,
    heightFt: e.heightFt,
  }));
}

/**
 * Convert raw NOAA hilo predictions into events with slack tides inserted.
 * Slack tide = midpoint in time between adjacent high and low.
 */
function buildEvents(hilo) {

  const events = [];

  for (let i = 0; i < hilo.length; i++) {
    // Insert slack before this event (midpoint between previous and current)
    if (i > 0) {
      const prev = hilo[i - 1];
      const curr = hilo[i];
      const slackTime = new Date((prev.time.getTime() + curr.time.getTime()) / 2);
      events.push({
        time:     slackTime.toISOString(),
        type:     'slack',
        heightFt: null,
        // Slack is flooding if current is heading toward high, ebbing toward low
        label:    curr.type === 'high' ? 'Slack (flood starts)' : 'Slack (ebb starts)',
      });
    }

    events.push({
      time:     hilo[i].time.toISOString(),
      type:     hilo[i].type,
      heightFt: hilo[i].heightFt,
      label:    hilo[i].type === 'high' ? 'High Tide' : 'Low Tide',
    });
  }

  return events;
}

/** Return the next upcoming tide event from the full list */
function nextEvent(events) {
  const now = Date.now();
  return events.find(e => new Date(e.time).getTime() > now) || null;
}

module.exports = { getTides, nextEvent };

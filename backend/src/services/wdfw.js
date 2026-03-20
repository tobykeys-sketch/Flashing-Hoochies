const axios = require('axios');

const SOCRATA_BASE = 'https://data.wa.gov/resource';
const CREEL_CATCH_DATASET = '6y4e-8ftk';

// All ramps across both areas — WDFW dataset names (try multiple spellings)
const ALL_RAMPS = [
  'Shilshole Bay',
  'Redondo', 'Redondo Beach',
  'Armeni', 'Armeni Boat Ramp', 'West Duwamish',
  'Saltwater State Park', 'Saltwater Park', 'Saltwater',
  'Commencement Bay',
  'Tacoma Narrows',
  'Henderson Bay',
];

// Maps raw WDFW water_body values → display name shown in UI
// Multiple WDFW spellings can map to the same display name (they get merged)
const DISPLAY_NAME = {
  'Shilshole Bay':       'Shilshole Bay',
  'Redondo':             'Redondo Ramp',
  'Redondo Beach':       'Redondo Ramp',
  'Armeni':              'Armeni Boat Ramp',
  'Armeni Boat Ramp':    'Armeni Boat Ramp',
  'West Duwamish':       'Armeni Boat Ramp',
  'Saltwater State Park':'Saltwater Park',
  'Saltwater Park':      'Saltwater Park',
  'Saltwater':           'Saltwater Park',
  'Commencement Bay':    'Commencement Bay',
  'Tacoma Narrows':      'Tacoma Narrows',
  'Henderson Bay':       'Henderson Bay',
};

// Which display-name ramps belong to which marine area (for grouping in the card)
const RAMPS_BY_AREA = {
  10: ['Shilshole Bay', 'Redondo Ramp', 'Armeni Boat Ramp'],
  11: ['Commencement Bay', 'Tacoma Narrows', 'Henderson Bay'],
};

// Per-angler rating thresholds per target species
const THRESHOLDS = {
  chinook: [
    { max: 0.20,     rating: 'low',       color: 'red'    },
    { max: 0.40,     rating: 'medium',    color: 'yellow' },
    { max: 0.50,     rating: 'good',      color: 'green'  },
    { max: Infinity, rating: 'excellent', color: 'green'  },
  ],
  coho: [
    { max: 0.40,     rating: 'low',       color: 'red'    },
    { max: 0.60,     rating: 'medium',    color: 'yellow' },
    { max: 0.80,     rating: 'good',      color: 'green'  },
    { max: Infinity, rating: 'excellent', color: 'green'  },
  ],
  pink: [
    { max: 0.80,     rating: 'low',       color: 'red'    },
    { max: 1.50,     rating: 'good',      color: 'green'  },
    { max: Infinity, rating: 'excellent', color: 'green'  },
  ],
};

function rateSpecies(species, rate) {
  const thresholds = THRESHOLDS[species];
  if (!thresholds) return { rating: 'unknown', color: 'yellow' };
  for (const t of thresholds) {
    if (rate <= t.max) return { rating: t.rating, color: t.color };
  }
  return { rating: 'excellent', color: 'green' };
}

function normalizeTargetSpecies(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('chinook'))                     return 'chinook';
  if (n.includes('coho'))                        return 'coho';
  if (n.includes('pink') || n.includes('humpy')) return 'pink';
  return null;
}

function emptyAcc() {
  return {
    chinook: { fish: 0, anglers: 0 },
    coho:    { fish: 0, anglers: 0 },
    pink:    { fish: 0, anglers: 0 },
    total:   0,
    hasAnglerData: false,
  };
}

function buildRampSummary(acc) {
  const perAnglerRates = {};
  const speciesRatings = {};
  for (const sp of ['chinook', 'coho', 'pink']) {
    const d = acc[sp];
    if (d.fish > 0 || d.anglers > 0) {
      if (d.anglers > 0) {
        const rate = d.fish / d.anglers;
        perAnglerRates[sp] = parseFloat(rate.toFixed(2));
        speciesRatings[sp] = rateSpecies(sp, rate);
      } else {
        perAnglerRates[sp] = null;
        speciesRatings[sp] = { rating: 'unknown', color: 'yellow' };
      }
    }
  }
  return {
    perAnglerRates,
    speciesRatings,
    targetCounts: { chinook: acc.chinook.fish, coho: acc.coho.fish, pink: acc.pink.fish },
    totalCaught:  acc.total,
    hasAnglerData: acc.hasAnglerData,
    hasData: acc.total > 0 || acc.chinook.fish > 0 || acc.coho.fish > 0 || acc.pink.fish > 0,
  };
}

// Single query for all ramps — split results by ramp afterwards
async function getCreelData(areaNum, days = 30) {
  const areaRamps  = RAMPS_BY_AREA[areaNum] || [];
  const allBodies  = ALL_RAMPS;
  const cutoff     = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr  = cutoff.toISOString().split('T')[0];

  const bodyFilter = allBodies.map(b => `water_body='${b}'`).join(' OR ');

  const params = {
    $where: `(${bodyFilter}) AND event_date >= '${cutoffStr}'`,
    $select: 'event_date,water_body,species,fish_count',
    $order:  'event_date DESC',
    $limit:  1000,
  };

  let records = [];
  try {
    const { data } = await axios.get(`${SOCRATA_BASE}/${CREEL_CATCH_DATASET}.json`, { params });
    records = data;
  } catch (err) {
    console.error(`WDFW creel error for area ${areaNum}:`, err.message);
  }

  // Accumulate per display-name ramp
  const rampAcc = {}; // displayName → acc

  for (const r of records) {
    const displayName = DISPLAY_NAME[r.water_body] || r.water_body;
    if (!rampAcc[displayName]) rampAcc[displayName] = emptyAcc();

    const count   = parseInt(r.fish_count, 10) || 0;
    const anglers = parseInt(r.anglers,    10) || 0;
    const target  = normalizeTargetSpecies(r.species);

    rampAcc[displayName].total += count;
    if (target) {
      rampAcc[displayName][target].fish    += count;
      rampAcc[displayName][target].anglers += anglers;
      if (anglers > 0) rampAcc[displayName].hasAnglerData = true;
    }
  }

  // Build per-ramp summaries for this area's ramps
  const byRamp = {};
  for (const rampName of areaRamps) {
    byRamp[rampName] = rampAcc[rampName]
      ? buildRampSummary(rampAcc[rampName])
      : { perAnglerRates: {}, speciesRatings: {}, targetCounts: { chinook: 0, coho: 0, pink: 0 }, totalCaught: 0, hasAnglerData: false, hasData: false };
  }

  // Overall aggregate across this area's ramps (used for scoring)
  const overallAcc = emptyAcc();
  for (const rampName of areaRamps) {
    const a = rampAcc[rampName];
    if (!a) continue;
    for (const sp of ['chinook', 'coho', 'pink']) {
      overallAcc[sp].fish    += a[sp].fish;
      overallAcc[sp].anglers += a[sp].anglers;
    }
    overallAcc.total += a.total;
    if (a.hasAnglerData) overallAcc.hasAnglerData = true;
  }
  const overall = buildRampSummary(overallAcc);

  return {
    byRamp,                             // per-ramp data for display
    ramps: areaRamps,                   // ordered list of ramp names for this area
    hasData:       records.length > 0,
    hasAnglerData: overall.hasAnglerData,
    // Overall fields used by fishingScore.js
    perAnglerRates:  overall.perAnglerRates,
    speciesRatings:  overall.speciesRatings,
    salmonCount:     overall.targetCounts.chinook + overall.targetCounts.coho + overall.targetCounts.pink,
    totalCaught:     overall.totalCaught,
  };
}

module.exports = { getCreelData, RAMPS_BY_AREA, THRESHOLDS };

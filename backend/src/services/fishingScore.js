const { parseWindKnots } = require('./noaa');

/**
 * Score fishing conditions for a single marine area (0-100).
 *
 * Scoring:
 *   40 pts  — No active small craft advisory or higher
 *   30 pts  — Wind speed (graduated)
 *   20 pts  — Per-angler creel rates (species-specific thresholds)
 *   Override — Emergency closure sets score=0, label='Closed'
 */

// Rating priority for choosing "best" species
const RATING_ORDER = ['excellent', 'good', 'medium', 'low', 'unknown'];

// Per-angler rating → score points (out of 20)
const RATING_PTS = { excellent: 20, good: 15, medium: 8, low: 3, unknown: 10 };

function scoreFishingConditions({ advisories, hourlyWind, creel, emergency }) {
  let score = 0;
  const breakdown = {};

  // --- Emergency closure override ---
  if (emergency?.hasClosure) {
    return {
      score: 0,
      label: 'Closed',
      color: 'red',
      breakdown: {
        closure: {
          pts: 0,
          color: 'red',
          note: 'Emergency closure in effect — verify at wdfw.wa.gov before fishing',
        },
      },
    };
  }

  // --- Advisory score (40 pts) ---
  const dangerousAdvisories = advisories.filter(a =>
    /small craft|gale|storm|hurricane|special marine/i.test(a.event)
  );
  if (dangerousAdvisories.length === 0) {
    score += 40;
    breakdown.advisory = { pts: 40, color: 'green', note: 'No small craft advisories active' };
  } else {
    breakdown.advisory = { pts: 0, color: 'red', note: dangerousAdvisories.map(a => a.event).join(', ') };
  }

  // --- Wind score (30 pts) ---
  const windKnots = getAverageWindKnots(hourlyWind);
  let windPts = 0;
  let windNote = '';
  let windColor = 'yellow';
  if (windKnots === null) {
    windPts = 15;
    windNote = 'Wind data unavailable';
    windColor = 'yellow';
  } else if (windKnots < 10) {
    windPts = 30;
    windNote = `${windKnots} kt — calm`;
    windColor = 'green';
  } else if (windKnots < 15) {
    windPts = 20;
    windNote = `${windKnots} kt — light breeze`;
    windColor = 'green';
  } else if (windKnots < 20) {
    windPts = 10;
    windNote = `${windKnots} kt — moderate wind`;
    windColor = 'yellow';
  } else {
    windPts = 0;
    windNote = `${windKnots} kt — strong wind`;
    windColor = 'red';
  }
  score += windPts;
  breakdown.wind = { pts: windPts, color: windColor, note: windNote, knots: windKnots };

  // --- Creel score (20 pts) using per-angler thresholds ---
  let creelPts = 0;
  let creelNote = '';
  let creelColor = 'yellow';

  if (!creel.hasData) {
    creelPts = 10;
    creelNote = 'No recent creel survey data';
    creelColor = 'yellow';

  } else if (creel.hasAnglerData && Object.keys(creel.speciesRatings).length > 0) {
    // Pick best-rated species
    let bestRating = 'low';
    let bestColor  = 'red';

    for (const { rating, color } of Object.values(creel.speciesRatings)) {
      if (RATING_ORDER.indexOf(rating) < RATING_ORDER.indexOf(bestRating)) {
        bestRating = rating;
        bestColor  = color;
      }
    }

    creelPts  = RATING_PTS[bestRating] ?? 3;
    creelColor = bestColor;

    // Build per-species note string
    const parts = Object.entries(creel.perAnglerRates)
      .filter(([, rate]) => rate !== null)
      .map(([sp, rate]) => {
        const r = creel.speciesRatings[sp];
        return `${capitalize(sp)}: ${rate}/angler (${r?.rating ?? '?'})`;
      });
    creelNote = parts.length ? parts.join(' · ') : `Best: ${bestRating}`;

  } else if (creel.salmonCount > 0) {
    // Fallback: dataset has no angler count — use raw totals
    creelPts  = 20;
    creelNote = `${creel.salmonCount} salmon reported (no angler count in dataset)`;
    creelColor = 'green';

  } else if (creel.totalCaught > 0) {
    creelPts  = 10;
    creelNote = `${creel.totalCaught} fish reported (no salmon)`;
    creelColor = 'yellow';

  } else {
    creelPts  = 0;
    creelNote = 'No fish reported in last 30 days';
    creelColor = 'red';
  }

  score += creelPts;
  breakdown.creel = { pts: creelPts, color: creelColor, note: creelNote };

  return {
    score,
    label: scoreLabel(score),
    color: scoreColor(score),
    breakdown,
  };
}

function getAverageWindKnots(hourlyWind) {
  if (!hourlyWind || hourlyWind.length === 0) return null;
  const knots = hourlyWind
    .slice(0, 6)
    .map(h => parseWindKnots(h.windSpeed))
    .filter(k => k !== null);
  if (knots.length === 0) return null;
  return Math.round(knots.reduce((a, b) => a + b, 0) / knots.length);
}

function scoreLabel(score) {
  if (score >= 70) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

function scoreColor(score) {
  if (score >= 70) return 'green';
  if (score >= 40) return 'yellow';
  return 'red';
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = { scoreFishingConditions };

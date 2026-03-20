const axios = require('axios');

const RSS_URL = 'https://wdfw.wa.gov/fishing/regulations/emergency-rules/rss';
const CLOSURE_DATASET = 'https://data.wa.gov/resource/6zm6-iep6.json';

// Patterns that identify rules relevant to each marine area
const AREA_PATTERNS = {
  10: [/marine\s+area\s+10/i, /\bMA[-\s]?10\b/i, /seattle[- ]bremerton/i, /elliott\s+bay/i, /shilshole/i, /redondo/i, /armeni/i, /duwamish/i],
  11: [/marine\s+area\s+11/i, /\bMA[-\s]?11\b/i, /tacoma/i, /vashon/i, /commencement\s+bay/i],
};

// Patterns that flag an actual closure vs just a restriction or info update
const CLOSURE_KEYWORDS     = /\bclosed?\b|\bclosure\b|\bprohibited?\b|\bno\s+retention\b|\bemergency\s+close/i;
const RESTRICTION_KEYWORDS = /\brestrict|reduced|limit|size\s+limit|bag\s+limit|gear\s+restriction/i;

// Patterns to classify fishing vs shellfishing rules
const SHELLFISH_KEYWORDS = /\bdungeness\b|\bcrab\b|\bclam\b|\brazor\s+clam|\bmanila\b|\boyster\b|\bgeoduck\b|\bshrimp\b|\bshellfish\b|\bbiotoxin\b|\bPSP\b|\bparalytic\s+shellfish/i;
const FINFISH_KEYWORDS   = /\bsalmon\b|\bchinook\b|\bcoho\b|\bpink\b|\bhalibut\b|\blingcod\b|\brockfish\b|\bsole\b|\bsteelhead\b|\btrout\b|\bbass\b/i;

function classifyCategory(title, description) {
  const text = `${title} ${description}`;
  const isShellfish = SHELLFISH_KEYWORDS.test(text);
  const isFinfish   = FINFISH_KEYWORDS.test(text);
  if (isShellfish && !isFinfish) return 'shellfish';
  if (isShellfish && isFinfish)  return 'both';
  return 'fishing';
}

/** Strip HTML tags and decode basic entities */
function stripHtml(str = '') {
  return str
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Parse RSS XML into an array of item objects without external libraries */
function parseRssItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch;

  while ((itemMatch = itemRegex.exec(xml)) !== null) {
    const block = itemMatch[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? (m[1] ?? m[2] ?? '').trim() : '';
    };

    items.push({
      title:       stripHtml(get('title')),
      link:        get('link').trim(),
      description: stripHtml(get('description')),
      pubDate:     get('pubDate'),
    });
  }
  return items;
}

/**
 * Classify a rule item by severity.
 * Returns 'closure' | 'restriction' | 'info'
 */
function classifySeverity(title, description) {
  const text = `${title} ${description}`;
  if (CLOSURE_KEYWORDS.test(text))     return 'closure';
  if (RESTRICTION_KEYWORDS.test(text)) return 'restriction';
  return 'info';
}

/**
 * Check whether an RSS item is relevant to a given marine area.
 * Checks title + description against area-specific patterns.
 * Also returns true if the item mentions all Puget Sound areas broadly.
 */
function matchesArea(item, areaNum) {
  const text = `${item.title} ${item.description}`;
  const patterns = AREA_PATTERNS[areaNum] || [];
  if (patterns.some(p => p.test(text))) return true;
  // Broad Puget Sound match catches basin-wide closures
  if (/puget\s+sound/i.test(text) && /marine\s+area/i.test(text)) return true;
  return false;
}

/** Fetch and parse the WDFW emergency rules RSS feed */
async function fetchRssRules() {
  try {
    const { data } = await axios.get(RSS_URL, {
      headers: { 'User-Agent': 'PugetFishingApp/1.0', Accept: 'application/rss+xml, application/xml, text/xml' },
      timeout: 8000,
    });
    return parseRssItems(data);
  } catch (err) {
    console.error('WDFW RSS fetch error:', err.message);
    return [];
  }
}

/** Fetch recent closures from data.wa.gov Socrata dataset */
async function fetchSocrataClosures(areaNum) {
  try {
    const { data } = await axios.get(CLOSURE_DATASET, {
      params: {
        $where: `marine_area='${areaNum}'`,
        $order: 'closure_date DESC',
        $limit: 10,
      },
      timeout: 8000,
    });
    return data;
  } catch (err) {
    // Dataset schema may vary; fail silently
    return [];
  }
}

/**
 * Main export — returns emergency rule data for a single marine area.
 *
 * Returns:
 *   {
 *     hasClosure: boolean,       // true if any active closure found
 *     hasRestriction: boolean,   // true if any restriction (not full closure)
 *     rules: Array<{
 *       title, description, link, pubDate, severity
 *     }>,
 *     lastChecked: ISO string,
 *   }
 */
async function getEmergencyRules(areaNum, allRssItems) {
  const relevant = allRssItems
    .filter(item => matchesArea(item, areaNum))
    .map(item => ({
      ...item,
      severity:    classifySeverity(item.title, item.description),
      category:    classifyCategory(item.title, item.description),
      pubDate:     item.pubDate ? new Date(item.pubDate).toISOString() : null,
      description: item.description.slice(0, 400) + (item.description.length > 400 ? '…' : ''),
    }));

  const fishingRules   = relevant.filter(r => r.category === 'fishing' || r.category === 'both');
  const shellfishRules = relevant.filter(r => r.category === 'shellfish' || r.category === 'both');

  const hasClosure            = relevant.some(r => r.severity === 'closure');
  const hasRestriction        = relevant.some(r => r.severity === 'restriction');
  const hasShellfishClosure   = shellfishRules.some(r => r.severity === 'closure');
  const hasShellfishRestriction = shellfishRules.some(r => r.severity === 'restriction');

  return {
    hasClosure,
    hasRestriction,
    hasShellfishClosure,
    hasShellfishRestriction,
    rules:         relevant,        // all rules combined
    fishingRules,                   // fishing-only rules
    shellfishRules,                 // shellfish-only rules
    lastChecked:   new Date().toISOString(),
  };
}

module.exports = { fetchRssRules, getEmergencyRules };

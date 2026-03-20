import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { parseWindKnots } from '../utils/wind';
import FishingReports from './FishingReports';

// ── Fish Gods (shared, persists 10 h) ─────────────────────────────────────────
const FISH_GODS = [
  { key: 'outraged',   emoji: '⚡', label: 'Outraged',   message: "The fish gods demand sacrifice. It's you today.",      color: 'text-red-400'     },
  { key: 'displeased', emoji: '😤', label: 'Displeased', message: 'The fish gods are testing your patience.',             color: 'text-orange-400'  },
  { key: 'neutral',    emoji: '⚖️', label: 'Neutral',    message: 'The fish gods are indifferent. Fair trade possible.',  color: 'text-amber-400'   },
  { key: 'favorable',  emoji: '🎣', label: 'Favorable',  message: 'The fish gods are intrigued.',                         color: 'text-lime-400'    },
  { key: 'blessed',    emoji: '✨', label: 'Blessed',    message: 'The fish gods are amused by your efforts.',            color: 'text-green-400'   },
  { key: 'benevolent', emoji: '🌟', label: 'Benevolent', message: 'You are favored. Rejoice.',                            color: 'text-emerald-300' },
];
const GODS_INTERVAL = 10 * 60 * 60 * 1000;
const GODS_KEY = 'fishGods_shared';

function loadOrRollGods() {
  try {
    const s = JSON.parse(localStorage.getItem(GODS_KEY));
    if (s && Date.now() - s.setAt < GODS_INTERVAL) {
      const found = FISH_GODS.find(l => l.key === s.key);
      if (found) return found;
    }
  } catch {}
  const level = FISH_GODS[Math.floor(Math.random() * FISH_GODS.length)];
  localStorage.setItem(GODS_KEY, JSON.stringify({ key: level.key, setAt: Date.now() }));
  return level;
}

// ── 8-hour wind aggregation ───────────────────────────────────────────────────
function aggregate8h(hourlyWind) {
  const buckets = [];
  const hours = hourlyWind.slice(0, 48);
  for (let i = 0; i < hours.length; i += 8) {
    const chunk = hours.slice(i, i + 8);
    if (!chunk.length) continue;
    let peak = chunk[0], maxKt = parseWindKnots(chunk[0].windSpeed) ?? 0;
    for (const w of chunk) {
      const kt = parseWindKnots(w.windSpeed) ?? 0;
      if (kt > maxKt) { maxKt = kt; peak = w; }
    }
    buckets.push({
      ...peak,
      startLabel: new Date(chunk[0].time),
      endLabel:   new Date(chunk[chunk.length - 1].time),
      peakKnots:  maxKt,
    });
  }
  return buckets;
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const ACCENT = {
  green:  { strip: 'bg-emerald-500', badge: 'bg-emerald-700 text-emerald-50' },
  yellow: { strip: 'bg-amber-500',   badge: 'bg-amber-700 text-amber-50'     },
  red:    { strip: 'bg-red-600',     badge: 'bg-red-800 text-red-50'         },
};

const PILL_COLOR = {
  green:  'bg-emerald-900/40 border-emerald-700/60 text-emerald-300 hover:bg-emerald-800/50',
  yellow: 'bg-amber-900/30 border-amber-700/60 text-amber-300 hover:bg-amber-800/40',
  red:    'bg-red-900/40 border-red-700/60 text-red-300 hover:bg-red-800/50',
  slate:  'bg-slate-700/40 border-slate-600/60 text-slate-300 hover:bg-slate-600/50',
};

const RATING_COLOR = {
  excellent: 'bg-emerald-900/50 border-emerald-600/60 text-emerald-200',
  good:      'bg-emerald-900/30 border-emerald-700/50 text-emerald-300',
  medium:    'bg-amber-900/40 border-amber-700/50 text-amber-200',
  low:       'bg-red-900/40 border-red-700/50 text-red-300',
  unknown:   'bg-slate-800/60 border-slate-600/40 text-slate-300',
};

const RATING_BADGE = {
  excellent: 'bg-emerald-700 text-emerald-100',
  good:      'bg-emerald-800 text-emerald-200',
  medium:    'bg-amber-700 text-amber-100',
  low:       'bg-red-800 text-red-200',
  unknown:   'bg-slate-700 text-slate-300',
};

const SP_LABELS    = { chinook: 'Chinook', coho: 'Coho', pink: 'Pink' };
const SP_THRESHOLD = {
  chinook: '0–.2 low · .21–.4 med · .41–.5 good · .51+',
  coho:    '0–.4 low · .41–.6 med · .61–.8 good · .8+',
  pink:    '0–.8 low · .8–1.5 good · 1.5+',
};

function fmt(isoStr) {
  return new Date(isoStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function windColor(knots) {
  if (knots == null) return 'text-slate-400';
  if (knots < 10)   return 'text-emerald-400 font-semibold';
  if (knots < 20)   return 'text-amber-400 font-semibold';
  return 'text-red-400 font-semibold';
}

// ══════════════════════════════════════════════════════════════════════════════
export default function RampCard({
  rampName, displayName, areaLabel, creel, scoring, tides, solar,
  advisories, hourlyWind, dailyForecast, forecast, emergency, fetchedAt,
  expanded, onToggle,
}) {
  const [reportCount, setReportCount]   = useState(null);
  const [gods, setGods]                 = useState(() => loadOrRollGods());
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    axios.get('/api/reports', { params: { ramp: displayName || rampName } })
      .then(r => setReportCount(r.data.length))
      .catch(() => setReportCount(0));
  }, [displayName, rampName]);

  useEffect(() => {
    const id = setInterval(() => setGods(loadOrRollGods()), 60_000);
    return () => clearInterval(id);
  }, []);

  const color    = scoring?.color || 'red';
  const accent   = ACCENT[color] || ACCENT.red;
  const bd       = scoring?.breakdown || {};
  const rampData = creel?.byRamp?.[rampName] || {};
  const hasAdvisory = advisories?.some(a => /small craft|gale|storm|hurricane/i.test(a.event));

  const bestRating = (() => {
    const ORDER = ['excellent', 'good', 'medium', 'low'];
    const vals = Object.values(rampData.speciesRatings || {})
      .map(r => r.rating).filter(r => ORDER.includes(r));
    return vals.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))[0] || null;
  })();

  const pillDefs = [
    {
      key: 'creel',
      label: 'Creel Counts',
      color: bestRating === 'excellent' || bestRating === 'good' ? 'green'
           : bestRating === 'medium' ? 'yellow'
           : bestRating === 'low' ? 'red' : 'slate',
      value: bestRating
        ? bestRating.charAt(0).toUpperCase() + bestRating.slice(1)
        : rampData.hasData ? 'Activity' : 'No data',
    },
    {
      key: 'wind',
      label: 'Wind',
      color: bd.wind?.color || 'slate',
      value: bd.wind?.knots != null ? `${bd.wind.knots} kt` : '—',
    },
    ...(tides ? [{
      key:   'tides',
      label: 'Upcoming Tides',
      color: tides.isOptimalNow ? 'green' : 'slate',
      value: null,
    }] : []),
    ...(hasAdvisory ? [{ key: 'advisory', label: 'Weather Advisory', color: 'red', value: null }] : []),
    {
      key:   'reports',
      label: 'Reports',
      color: 'slate',
      value: reportCount == null ? '…' : reportCount > 0 ? String(reportCount) : 'Be first',
    },
  ];

  const toggleSection = (key) => setActiveSection(prev => prev === key ? null : key);
  const showSection   = (key) => expanded || activeSection === key;
  const hasContent    = expanded || activeSection !== null;

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700/50 shadow-lg bg-slate-800/40">

      {/* Emergency closure */}
      {emergency?.hasClosure && (
        <div className="bg-red-900/80 border-b border-red-700/80 px-4 py-2 flex items-center gap-2">
          <span className="text-sm">🚫</span>
          <p className="text-red-200 text-xs font-bold flex-1 min-w-0 truncate">
            Emergency Closure — {emergency.rules[0]?.title || 'Check WDFW'}
          </p>
          <a href="https://wdfw.wa.gov/fishing/regulations/emergency-rules"
            target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-xs bg-red-700 hover:bg-red-600 text-red-100 px-2 py-1 rounded flex-shrink-0">
            Verify ↗
          </a>
        </div>
      )}
      {!emergency?.hasClosure && emergency?.hasRestriction && (
        <div className="bg-orange-900/50 border-b border-orange-800/60 px-4 py-2 flex items-center gap-2">
          <span className="text-sm">⚠️</span>
          <p className="text-orange-200 text-xs flex-1 min-w-0 truncate">
            <span className="font-semibold">Restriction in effect</span> —{' '}
            {emergency.rules.find(r => r.severity === 'restriction')?.title || 'Check WDFW'}
          </p>
        </div>
      )}

      {/* Card layout: colored left strip + content */}
      <div className="flex">
        <div className={`w-1 flex-shrink-0 ${accent.strip}`} />

        <div className="flex-1 min-w-0">

          {/* Clickable header — name + status */}
          <button
            className="w-full text-left px-4 pt-3 pb-2 hover:bg-white/[0.03] transition-colors"
            onClick={onToggle}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-white text-base leading-tight tracking-tight">
                  {displayName || rampName}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{areaLabel}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                <span className="text-slate-600 text-xs">{expanded ? '▲' : '▼'}</span>
              </div>
            </div>
          </button>

          {/* Pills — each is an independent toggle button */}
          <div className="px-4 pb-2 flex gap-2 flex-wrap">
            {pillDefs.map(p => (
              <button
                key={p.key}
                onClick={() => toggleSection(p.key)}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                  PILL_COLOR[p.color]
                } ${activeSection === p.key && !expanded ? 'ring-1 ring-white/20 brightness-125' : ''}`}
              >
                {p.label}
                {p.value && <span className="font-bold opacity-80">{p.value}</span>}
              </button>
            ))}
          </div>

          {/* Fish Gods strip */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2.5 rounded-lg bg-slate-900/50 border border-slate-700/40 px-3 py-1.5">
              <span className="text-sm">{gods.emoji}</span>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs text-slate-500 font-medium">Fish Gods:</span>
                <span className={`text-xs font-bold ${gods.color}`}>{gods.label}</span>
                <span className={`text-xs italic ${gods.color} opacity-40 hidden sm:inline truncate`}>
                  — "{gods.message}"
                </span>
              </div>
            </div>
          </div>

          {/* Conditional section content */}
          {hasContent && (
            <div className="border-t border-slate-700/40 px-4 py-4 space-y-5">

              {showSection('creel') && (
                <Section title="Creel Counts — Last 5 Days">
                  <CreelDetail ramp={rampData} />
                </Section>
              )}

              {showSection('tides') && tides?.events?.length > 0 && (
                <Section title={`Upcoming Tides — ${tides.station}`}>
                  <TideSection tides={tides} />
                </Section>
              )}

              {showSection('wind') && hourlyWind?.length > 0 && (() => {
                const buckets = aggregate8h(hourlyWind);
                return (
                  <Section title="Wind Forecast — 8-Hour Periods">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-500 text-xs border-b border-slate-700/50">
                            <th className="text-left pb-2 pr-4 font-medium">Period</th>
                            <th className="text-left pb-2 pr-4 font-medium">Peak Wind</th>
                            <th className="text-left pb-2 font-medium">Direction</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {buckets.map((b, i) => {
                            const dt   = b.startLabel;
                            const prev = i > 0 ? buckets[i - 1].startLabel : null;
                            const isNewDay = !prev || prev.getDate() !== dt.getDate();
                            return (
                              <React.Fragment key={i}>
                                {isNewDay && (
                                  <tr>
                                    <td colSpan={3} className="pt-3 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                      {dt.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                                    </td>
                                  </tr>
                                )}
                                <tr>
                                  <td className="py-2 text-slate-400 pr-4 text-xs">
                                    {dt.toLocaleTimeString([], { hour: 'numeric' })}
                                    {' – '}
                                    {b.endLabel.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                  </td>
                                  <td className={`py-2 pr-4 text-xs ${windColor(b.peakKnots)}`}>{b.windSpeed}</td>
                                  <td className="py-2 text-slate-400 text-xs">{b.windDirection}</td>
                                </tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="text-emerald-600">● &lt;10 kt calm</span>
                      <span className="text-amber-600">● 10–20 kt moderate</span>
                      <span className="text-red-600">● &gt;20 kt rough</span>
                    </div>
                  </Section>
                );
              })()}

              {showSection('advisory') && (
                <Section title="Marine Advisories">
                  {advisories?.length > 0 ? (
                    <div className="space-y-2">
                      {advisories.map((a, i) => (
                        <div key={i} className="bg-orange-900/30 border border-orange-800/50 rounded-lg p-3 text-sm">
                          <p className="font-semibold text-orange-300">{a.event}</p>
                          <p className="text-orange-200/70 text-xs mt-1">{a.headline}</p>
                          {a.expires && (
                            <p className="text-orange-400/60 text-xs mt-1">
                              Expires: {new Date(a.expires).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-emerald-500">No active advisories</p>
                  )}
                </Section>
              )}

              {showSection('reports') && (
                <Section title="">
                  <FishingReports rampName={displayName || rampName} />
                </Section>
              )}

              {/* Full-expand-only sections */}
              {expanded && (
                <>
                  {solar && (
                    <Section title="Sun & First Light">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <SolarStat icon="🌄" label="First Light" time={solar.firstLight}
                          highlight={solar.minutesToFirstLight != null}
                          note={solar.minutesToFirstLight != null ? `In ${solar.minutesToFirstLight}m` : null} />
                        <SolarStat icon="🌅" label="Sunrise" time={solar.sunrise}
                          highlight={solar.isBeforeSunrise}
                          note={solar.minutesToSunrise != null ? `In ${solar.minutesToSunrise}m` : null} />
                        <SolarStat icon="🌇" label="Sunset" time={solar.sunset} />
                        <SolarStat icon="🌙" label="Last Light" time={solar.lastLight} note={solar.dayLength} />
                      </div>
                    </Section>
                  )}

                  {dailyForecast?.length > 0 && (
                    <Section title="2-Day Weather Outlook">
                      <div className="grid grid-cols-2 gap-2">
                        {dailyForecast.map((p, i) => {
                          const kt = parseWindKnots(p.windSpeed);
                          const wc = kt == null ? 'text-slate-400' : kt < 15 ? 'text-emerald-400' : kt < 25 ? 'text-amber-400' : 'text-red-400';
                          return (
                            <div key={i} className="bg-slate-900/50 border border-slate-700/40 rounded-lg p-3 text-sm">
                              <p className="font-semibold text-slate-400 text-xs mb-1">{p.name}</p>
                              <p className="text-2xl font-bold text-white">{p.temperature}°{p.temperatureUnit}</p>
                              <p className={`text-xs font-medium mt-1 ${wc}`}>💨 {p.windSpeed} {p.windDirection}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{p.shortForecast}</p>
                            </div>
                          );
                        })}
                      </div>
                    </Section>
                  )}

                  {emergency?.rules?.length > 0 && (
                    <Section title="Emergency Rules">
                      <div className="space-y-2">
                        {emergency.rules.map((rule, i) => (
                          <div key={i} className={`rounded-lg p-3 border text-sm ${
                            rule.severity === 'closure'     ? 'bg-red-900/30 border-red-700/60' :
                            rule.severity === 'restriction' ? 'bg-orange-900/20 border-orange-800/50' :
                                                              'bg-slate-900/50 border-slate-700/40'
                          }`}>
                            <p className={`font-semibold ${
                              rule.severity === 'closure' ? 'text-red-300' :
                              rule.severity === 'restriction' ? 'text-orange-300' : 'text-slate-300'
                            }`}>
                              {rule.severity === 'closure' ? '🚫 ' : rule.severity === 'restriction' ? '⚠️ ' : ''}
                              {rule.title}
                            </p>
                            {rule.link && (
                              <a href={rule.link} target="_blank" rel="noreferrer"
                                className="text-xs text-blue-400 underline mt-1 inline-block">
                                Details on WDFW ↗
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  <p className="text-xs text-slate-700">
                    Data: {areaLabel} · {new Date(fetchedAt).toLocaleString()}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div>
      {title && (
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2.5">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function CreelDetail({ ramp }) {
  const hasAnyData = ramp?.hasData || ramp?.totalCaught > 0;

  if (!hasAnyData) {
    return (
      <p className="text-sm text-slate-500">
        No WDFW creel surveys at this ramp in the last 5 days.
      </p>
    );
  }

  if (!ramp?.hasAnglerData) {
    return (
      <p className="text-sm text-slate-300">
        {ramp?.totalCaught ?? 0} fish reported · no angler count in dataset
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {['chinook', 'coho', 'pink'].map(sp => {
        const rate  = ramp.perAnglerRates?.[sp];
        const rObj  = ramp.speciesRatings?.[sp];
        const count = ramp.targetCounts?.[sp] ?? 0;

        if (rate == null && count === 0) {
          return (
            <div key={sp} className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-2 text-center">
              <p className="text-xs text-slate-500 font-medium">{SP_LABELS[sp]}</p>
              <p className="text-xs text-slate-700 mt-1">—</p>
            </div>
          );
        }

        const rating = rObj?.rating || 'unknown';
        return (
          <div key={sp} className={`rounded-lg border p-2 ${RATING_COLOR[rating]}`}>
            <div className="flex items-center justify-between gap-1 mb-1">
              <p className="text-xs font-semibold truncate">{SP_LABELS[sp]}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-bold capitalize flex-shrink-0 ${RATING_BADGE[rating]}`}>
                {rating}
              </span>
            </div>
            {rate != null ? (
              <p className="text-lg font-bold tabular-nums leading-tight">
                {rate.toFixed(2)}<span className="text-xs font-normal ml-0.5 opacity-50">/ang</span>
              </p>
            ) : (
              <p className="text-sm font-bold">{count} caught</p>
            )}
            <p className="text-xs opacity-30 mt-0.5 leading-tight truncate">{SP_THRESHOLD[sp]}</p>
          </div>
        );
      })}
    </div>
  );
}

function fmtWithDate(isoStr) {
  const d = new Date(isoStr);
  const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return { date, time };
}

function TideSection({ tides }) {
  const now = Date.now();
  const events = (tides.events || []).filter(e => e.type !== 'slack');
  return (
    <>
      <div className="space-y-1.5">
        {events.map((evt, i) => {
          const STYLE = {
            high: { badge: 'bg-blue-900/50 border-blue-700/60 text-blue-300', icon: '▲', label: 'High' },
            low:  { badge: 'bg-slate-800 border-slate-600/60 text-slate-300',  icon: '▼', label: 'Low'  },
          };
          const style    = STYLE[evt.type] || { badge: 'bg-slate-700 border-slate-600 text-slate-300', icon: '—', label: evt.type };
          const upcoming = new Date(evt.time).getTime() > now;
          const isNext   = tides.next?.time === evt.time;
          const { date, time } = fmtWithDate(evt.time);
          return (
            <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm border ${
              isNext    ? 'bg-slate-700/60 border-slate-500/60'
            : upcoming ? 'bg-slate-800/40 border-slate-700/40'
                       : 'bg-slate-800/20 border-slate-700/20 opacity-40'
            }`}>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded border flex-shrink-0 ${style.badge}`}>
                {style.icon} {style.label}
              </span>
              <span className={`text-xs text-slate-500 flex-shrink-0`}>{date}</span>
              <span className={upcoming ? 'text-white font-medium' : 'text-slate-400'}>
                {time}
              </span>
              {evt.heightFt != null && (
                <span className={`font-bold tabular-nums ${evt.type === 'high' ? 'text-blue-300' : 'text-slate-300'}`}>
                  {evt.heightFt.toFixed(1)} ft
                </span>
              )}
              {isNext && (
                <span className="ml-auto text-xs text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded border border-slate-600/40">
                  NEXT
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-600 mt-2">
        Station: {tides.station} ·{' '}
        <a href={`https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=${tides.stationId}`}
          target="_blank" rel="noreferrer" className="underline hover:text-slate-400">
          NOAA tides ↗
        </a>
      </p>
    </>
  );
}

function SolarStat({ icon, label, time, note, highlight }) {
  return (
    <div className={`rounded-lg p-3 text-center border ${
      highlight ? 'bg-amber-900/20 border-amber-800/50' : 'bg-slate-900/40 border-slate-700/40'
    }`}>
      <p className="text-lg mb-0.5">{icon}</p>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-amber-300' : 'text-slate-200'}`}>{fmt(time)}</p>
      {note && <p className="text-xs text-slate-600 mt-0.5">{note}</p>}
    </div>
  );
}

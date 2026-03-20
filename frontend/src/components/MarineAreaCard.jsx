import React from 'react';
import { parseWindKnots } from '../utils/wind';

// ── Palette ──────────────────────────────────────────────────────────────────
const CARD = {
  green:  { bg: 'bg-green-900/30',  border: 'border-green-700',  badge: 'bg-green-700 text-green-100' },
  yellow: { bg: 'bg-yellow-900/30', border: 'border-yellow-700', badge: 'bg-yellow-700 text-yellow-100' },
  red:    { bg: 'bg-red-900/30',    border: 'border-red-700',    badge: 'bg-red-800 text-red-100' },
};

// Metric pill colors (compact indicators in the header)
const PILL = {
  green:  'bg-green-700/60 text-green-200 border border-green-600',
  yellow: 'bg-yellow-700/60 text-yellow-200 border border-yellow-600',
  red:    'bg-red-800/60 text-red-200 border border-red-700',
};

// Breakdown card accent colors
const METRIC_CARD = {
  green:  'bg-green-900/40 border border-green-800',
  yellow: 'bg-yellow-900/30 border border-yellow-800',
  red:    'bg-red-900/40 border border-red-800',
};

// Wind row text color by knots
function windRowColor(knots) {
  if (knots === null) return 'text-slate-300';
  if (knots < 10)  return 'text-green-400 font-semibold';
  if (knots < 20)  return 'text-yellow-400 font-semibold';
  return 'text-red-400 font-semibold';
}

// Per-species rating colors
const RATING_COLOR = {
  excellent: 'bg-green-900/50 border-green-600 text-green-200',
  good:      'bg-green-900/30 border-green-700 text-green-300',
  medium:    'bg-yellow-900/40 border-yellow-700 text-yellow-200',
  low:       'bg-red-900/40 border-red-700 text-red-300',
  unknown:   'bg-slate-800 border-slate-600 text-slate-300',
};
const RATING_BADGE = {
  excellent: 'bg-green-700 text-green-100',
  good:      'bg-green-800 text-green-200',
  medium:    'bg-yellow-700 text-yellow-100',
  low:       'bg-red-800 text-red-200',
  unknown:   'bg-slate-700 text-slate-300',
};

// Tide event styling
const TIDE_STYLE = {
  high:  { badge: 'bg-blue-800 text-blue-100',  icon: '▲', label: 'High' },
  low:   { badge: 'bg-cyan-900 text-cyan-200',   icon: '▼', label: 'Low'  },
  slack: { badge: 'bg-green-800 text-green-100', icon: '⟺', label: 'Slack' },
};

function tideTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function isUpcoming(isoStr) {
  return new Date(isoStr).getTime() > Date.now();
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MarineAreaCard({ area, expanded, onToggle }) {
  const { scoring, advisories, forecast, dailyForecast, hourlyWind, creel, tides, solar, emergency, areaName, fetchedAt } = area;
  const card = CARD[scoring?.color] || CARD.red;
  const bd = scoring?.breakdown || {};

  const hasAdvisory = advisories?.some(a => /small craft|gale|storm|hurricane/i.test(a.event));
  const nextTide = tides?.next;

  // Mini pill data for collapsed header
  const pills = [
    {
      label: '💨 Wind',
      color: bd.wind?.color || 'yellow',
      value: bd.wind?.knots != null ? `${bd.wind.knots} kt` : '—',
    },
    {
      label: '🐟 Fish',
      color: bd.creel?.color || 'yellow',
      value: (() => {
        if (!creel?.hasData) return 'No data';
        if (creel.hasAnglerData && Object.keys(creel.speciesRatings || {}).length > 0) {
          const ORDER = ['excellent', 'good', 'medium', 'low'];
          const best = Object.values(creel.speciesRatings)
            .map(r => r.rating)
            .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))[0];
          return best ? best.charAt(0).toUpperCase() + best.slice(1) : 'No data';
        }
        return creel.salmonCount > 0 ? `${creel.salmonCount} salmon` : 'No salmon';
      })(),
    },
    {
      label: '⚠️ Advisory',
      color: bd.advisory?.color || 'yellow',
      value: hasAdvisory ? 'Active' : 'Clear',
    },
    // Tide pill: green when currently in a prime window, otherwise show when next prime opens
    ...(tides ? [{
      label: '🎣 Fishing',
      color: tides.isOptimalNow ? 'green' : 'yellow',
      value: tides.isOptimalNow
        ? 'Prime Now'
        : tides.nextOptimal
          ? `Prime ${tideTime(tides.nextOptimal.start)}`
          : nextTide
            ? `${TIDE_STYLE[nextTide.type]?.label ?? nextTide.type} ${tideTime(nextTide.time)}`
            : '—',
    }] : []),
    // Sunrise pill: shows first light or time-until if before sunrise
    ...(solar ? [{
      label: '🌅 Sunrise',
      color: 'yellow',
      value: solar.minutesToFirstLight != null
        ? `First light in ${solar.minutesToFirstLight}m`
        : solar.minutesToSunrise != null
          ? `In ${solar.minutesToSunrise}m`
          : tideTime(solar.sunrise),
    }] : []),
  ];

  return (
    <div className={`rounded-xl border ${card.bg} ${card.border} overflow-hidden transition-all`}>

      {/* ── Emergency closure banner — shown even when collapsed ── */}
      {emergency?.hasClosure && (
        <div className="bg-red-900 border-b border-red-700 px-5 py-3 flex items-center gap-3">
          <span className="text-xl flex-shrink-0">🚫</span>
          <div className="min-w-0">
            <p className="text-red-200 font-bold text-sm">Emergency Closure in Effect</p>
            <p className="text-red-300 text-xs mt-0.5 truncate">
              {emergency.rules[0]?.title || 'Check WDFW before fishing'}
            </p>
          </div>
          <a
            href="https://wdfw.wa.gov/fishing/regulations/emergency-rules"
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="ml-auto flex-shrink-0 text-xs bg-red-700 hover:bg-red-600 text-red-100 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            Verify ↗
          </a>
        </div>
      )}

      {/* ── Restriction notice (non-closure) ── */}
      {!emergency?.hasClosure && emergency?.hasRestriction && (
        <div className="bg-orange-900/60 border-b border-orange-800 px-5 py-2 flex items-center gap-2">
          <span className="text-base flex-shrink-0">⚠️</span>
          <p className="text-orange-200 text-xs">
            <span className="font-semibold">Restriction in effect</span> —{' '}
            {emergency.rules.find(r => r.severity === 'restriction')?.title || 'Check WDFW for details'}
          </p>
          <a
            href="https://wdfw.wa.gov/fishing/regulations/emergency-rules"
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="ml-auto flex-shrink-0 text-xs text-orange-300 underline hover:text-orange-200"
          >
            Details ↗
          </a>
        </div>
      )}

      {/* ── Collapsed header ── */}
      <button
        className="w-full text-left px-5 py-4 hover:bg-white/5 transition-colors"
        onClick={onToggle}
      >
        {/* Top row: name + overall badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <ScoreDial score={scoring?.score} color={scoring?.color} />
            <div>
              <h2 className="font-semibold text-white text-lg leading-tight">{areaName}</h2>
              <p className="text-xs text-slate-400">Combined score: {scoring?.score}/100</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${card.badge}`}>
              {scoring?.label}
            </span>
            <span className="text-slate-500 text-sm ml-1">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>

        {/* Bottom row: mini metric pills — always visible */}
        <div className="flex gap-2 flex-wrap">
          {pills.map(p => (
            <span key={p.label} className={`text-xs px-2.5 py-1 rounded-full ${PILL[p.color]}`}>
              {p.label} <span className="font-semibold ml-1">{p.value}</span>
            </span>
          ))}
        </div>
      </button>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-700/50 pt-5 space-y-5">

          {/* Emergency rules */}
          {emergency?.rules?.length > 0 && (
            <Section title="WDFW Emergency Rules">
              <div className="space-y-2">
                {emergency.rules.map((rule, i) => {
                  const isClosure     = rule.severity === 'closure';
                  const isRestriction = rule.severity === 'restriction';
                  return (
                    <div
                      key={i}
                      className={`rounded-lg p-3 border text-sm ${
                        isClosure
                          ? 'bg-red-900/40 border-red-700'
                          : isRestriction
                          ? 'bg-orange-900/30 border-orange-800'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`font-semibold ${isClosure ? 'text-red-300' : isRestriction ? 'text-orange-300' : 'text-slate-200'}`}>
                          {isClosure ? '🚫 ' : isRestriction ? '⚠️ ' : 'ℹ️ '}{rule.title}
                        </p>
                        {rule.pubDate && (
                          <span className="text-xs text-slate-500 flex-shrink-0">
                            {new Date(rule.pubDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {rule.description && (
                        <p className="text-xs text-slate-400 leading-relaxed">{rule.description}</p>
                      )}
                      {rule.link && (
                        <a
                          href={rule.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 underline mt-1.5 inline-block"
                        >
                          Full rule on WDFW ↗
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-red-400 mt-2 font-medium">
                Always verify current rules at{' '}
                <a href="https://wdfw.wa.gov/fishing/regulations/emergency-rules" target="_blank" rel="noreferrer" className="underline">
                  wdfw.wa.gov/fishing/regulations/emergency-rules
                </a>{' '}
                before fishing. Emergency rules can change daily.
              </p>
            </Section>
          )}

          {/* Score breakdown — each metric card is color-coded */}
          <Section title="Score Breakdown">
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(bd).map(([key, val]) => (
                <div key={key} className={`rounded-lg p-3 ${METRIC_CARD[val.color] || METRIC_CARD.yellow}`}>
                  <p className="text-xs text-slate-400 capitalize mb-1">{key}</p>
                  <p className={`text-xl font-bold ${textColor(val.color)}`}>
                    {val.pts}
                    <span className="text-xs font-normal text-slate-400 ml-1">pts</span>
                  </p>
                  <p className="text-xs text-slate-300 mt-1 leading-snug">{val.note}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Solar times */}
          {solar && (
            <Section title="Sun & Daylight">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <SolarStat
                  icon="🌄"
                  label="First Light"
                  time={solar.firstLight}
                  note="Civil twilight"
                  highlight={solar.minutesToFirstLight != null}
                />
                <SolarStat
                  icon="🌅"
                  label="Sunrise"
                  time={solar.sunrise}
                  note={solar.minutesToSunrise != null ? `In ${solar.minutesToSunrise} min` : null}
                  highlight={solar.isBeforeSunrise}
                />
                <SolarStat
                  icon="🌇"
                  label="Sunset"
                  time={solar.sunset}
                  note={solar.isAfterSunset ? 'Passed' : null}
                />
                <SolarStat
                  icon="🌙"
                  label="Last Light"
                  time={solar.lastLight}
                  note={`${solar.dayLength} of daylight`}
                />
              </div>
            </Section>
          )}

          {/* Advisories */}
          {advisories?.length > 0 ? (
            <Section title="Active Marine Advisories">
              {advisories.map((a, i) => (
                <div key={i} className="bg-orange-900/40 border border-orange-700 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-orange-300">{a.event}</p>
                  <p className="text-orange-200 mt-1">{a.headline}</p>
                  {a.expires && (
                    <p className="text-orange-400 text-xs mt-1">
                      Expires: {new Date(a.expires).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </Section>
          ) : (
            <Section title="Marine Advisories">
              <p className="text-sm text-green-400">✓ No active advisories</p>
            </Section>
          )}

          {/* 2-day weather outlook — day/night cards */}
          {dailyForecast?.length > 0 && (
            <Section title="2-Day Weather Outlook">
              <div className="grid grid-cols-2 gap-2">
                {dailyForecast.map((period, i) => {
                  const knots = parseWindKnots(period.windSpeed);
                  const wColor = knots == null ? 'text-slate-300' : knots < 15 ? 'text-green-400' : knots < 25 ? 'text-yellow-400' : 'text-red-400';
                  return (
                    <div key={i} className="bg-slate-800 rounded-lg p-3 text-sm">
                      <p className="font-semibold text-blue-300 text-xs mb-1">{period.name}</p>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-2xl font-bold text-white">{period.temperature}°{period.temperatureUnit}</span>
                      </div>
                      <p className={`text-xs font-medium mb-1 ${wColor}`}>
                        💨 {period.windSpeed} {period.windDirection}
                        {knots != null && <span className="text-slate-500 ml-1">({knots} kt)</span>}
                      </p>
                      <p className="text-xs text-slate-300 leading-snug">{period.shortForecast}</p>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Wind forecast — hourly, color-coded by speed */}
          {hourlyWind?.length > 0 && (
            <Section title="Wind Forecast (Next 48 Hours)">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs border-b border-slate-700">
                      <th className="text-left pb-2 pr-4">Time</th>
                      <th className="text-left pb-2 pr-4">Wind</th>
                      <th className="text-left pb-2 pr-4">Direction</th>
                      <th className="text-left pb-2 hidden sm:table-cell">Conditions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {hourlyWind.slice(0, 48).map((w, i) => {
                      const knots = parseWindKnots(w.windSpeed);
                      const dt = new Date(w.time);
                      const isNewDay = i === 0 || new Date(hourlyWind[i - 1].time).getDate() !== dt.getDate();
                      return (
                        <React.Fragment key={i}>
                          {isNewDay && (
                            <tr>
                              <td colSpan={4} className="pt-3 pb-1">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                  {dt.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                                </p>
                              </td>
                            </tr>
                          )}
                        <tr>
                          <td className="py-2 text-slate-300 pr-4">
                            {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className={`py-2 pr-4 ${windRowColor(knots)}`}>{w.windSpeed}</td>
                          <td className="py-2 text-slate-300 pr-4">{w.windDirection}</td>
                          <td className="py-2 text-slate-400 hidden sm:table-cell">{w.shortForecast}</td>
                        </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-3 mt-2 text-xs text-slate-500">
                <span className="text-green-500">● &lt;15 kt calm</span>
                <span className="text-yellow-500">● 15–20 kt moderate</span>
                <span className="text-red-500">● &gt;20 kt rough</span>
              </div>
            </Section>
          )}

          {/* Tide schedule */}
          {tides?.events?.length > 0 && (
            <Section title={`Tides — ${tides.station}`}>

              {/* Optimal fishing windows strip */}
              {tides.optimalWindows?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-green-400 font-semibold mb-1.5">
                    🎣 Optimal fishing windows (±2 hr around each tide change)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tides.optimalWindows.map((w, i) => {
                      const now = Date.now();
                      const active = now >= new Date(w.start).getTime() && now <= new Date(w.end).getTime();
                      const past   = now > new Date(w.end).getTime();
                      return (
                        <span
                          key={i}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border ${
                            active
                              ? 'bg-green-700 border-green-500 text-green-100 ring-1 ring-green-400'
                              : past
                              ? 'bg-slate-800 border-slate-700 text-slate-500 line-through'
                              : 'bg-green-900/40 border-green-800 text-green-300'
                          }`}
                        >
                          {active && <span className="mr-1">●</span>}
                          {tideTime(w.start)} – {tideTime(w.end)}
                          <span className="ml-1.5 opacity-70">
                            ({w.peakType === 'high' ? '▲ High' : '▼ Low'} {w.heightFt?.toFixed(1)} ft)
                          </span>
                          {active && <span className="ml-1.5 font-bold">PRIME</span>}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="space-y-1.5">
                {tides.events.map((evt, i) => {
                  const style = TIDE_STYLE[evt.type] || TIDE_STYLE.slack;
                  const upcoming = isUpcoming(evt.time);
                  const isNext   = tides.next && evt.time === tides.next.time;
                  // Is this event's time inside any optimal window?
                  const evtMs  = new Date(evt.time).getTime();
                  const inPrime = tides.optimalWindows?.some(
                    w => evtMs >= new Date(w.start).getTime() && evtMs <= new Date(w.end).getTime()
                  );

                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        isNext
                          ? 'bg-slate-700 ring-1 ring-slate-500'
                          : inPrime && upcoming
                          ? 'bg-green-900/25 border border-green-900'
                          : upcoming
                          ? 'bg-slate-800/60'
                          : 'bg-slate-800/30 opacity-40'
                      }`}
                    >
                      {/* Connector dot + line */}
                      <div className="flex flex-col items-center self-stretch w-4 flex-shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                          evt.type === 'high'  ? 'bg-blue-500' :
                          evt.type === 'low'   ? 'bg-cyan-500' :
                                                 'bg-green-500'
                        }`} />
                        {i < tides.events.length - 1 && (
                          <div className="w-px flex-1 bg-slate-700 mt-1" />
                        )}
                      </div>

                      {/* Type badge */}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0 ${style.badge}`}>
                        {style.icon} {style.label}
                      </span>

                      {/* Time */}
                      <span className={upcoming ? 'text-white font-medium' : 'text-slate-400'}>
                        {tideTime(evt.time)}
                      </span>

                      {/* Height for high/low */}
                      {evt.heightFt != null && (
                        <span className={`font-bold tabular-nums ${evt.type === 'high' ? 'text-blue-300' : 'text-cyan-400'}`}>
                          {evt.heightFt.toFixed(1)} ft
                        </span>
                      )}

                      {/* Slack direction label */}
                      {evt.type === 'slack' && (
                        <span className="text-xs text-green-400">{evt.label}</span>
                      )}

                      <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                        {inPrime && upcoming && (
                          <span className="text-xs bg-green-800 text-green-200 px-1.5 py-0.5 rounded font-semibold">
                            🎣 Prime
                          </span>
                        )}
                        {isNext && (
                          <span className="text-xs bg-white/10 text-slate-300 px-1.5 py-0.5 rounded">
                            NEXT
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                <span className="text-blue-400">▲ High</span>
                <span className="text-cyan-400">▼ Low</span>
                <span className="text-green-500">⟺ Slack</span>
                <span className="text-green-400">🎣 Prime = within 2 hr of tide change</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Station: {tides.station} ·{' '}
                <a
                  href={`https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=${tides.stationId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-slate-400"
                >
                  NOAA tides
                </a>
              </p>
            </Section>
          )}

          {/* Marine forecast text */}
          {forecast?.length > 0 && (
            <Section title="Marine Forecast">
              <div className="space-y-2">
                {forecast.map((period, i) => (
                  <div key={i} className="bg-slate-800 rounded-lg p-3 text-sm">
                    <p className="font-semibold text-blue-300 mb-1">{period.name}</p>
                    <p className="text-slate-300">{period.detailedForecast}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Creel data — per-ramp, per-species ratings */}
          <Section title="WDFW Creel Data by Ramp (Last 5 Days)">
            {creel?.ramps?.length > 0 ? (
              <div className="space-y-4">
                {creel.ramps.map(rampName => {
                  const ramp = creel.byRamp?.[rampName];
                  return (
                    <RampCreelCard key={rampName} rampName={rampName} ramp={ramp} />
                  );
                })}
                {!creel.hasData && (
                  <p className="text-xs text-slate-500 mt-1">
                    No WDFW creel surveys reported for these ramps in the last 30 days.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No creel data available.</p>
            )}
          </Section>

          <p className="text-xs text-slate-600">Data fetched: {new Date(fetchedAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreDial({ score, color }) {
  const ring = { green: 'text-green-400', yellow: 'text-yellow-400', red: 'text-red-400' };
  return (
    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
      color === 'green' ? 'border-green-500' : color === 'yellow' ? 'border-yellow-500' : 'border-red-500'
    }`}>
      <span className={`text-sm font-bold ${ring[color] || 'text-slate-300'}`}>{score ?? '?'}</span>
    </div>
  );
}

function CreelStat({ label, value, color }) {
  const numColor = { green: 'text-green-400', yellow: 'text-yellow-400', red: 'text-red-400' };
  return (
    <div className="bg-slate-800 rounded-lg p-3">
      <p className={`text-2xl font-bold ${numColor[color] || 'text-white'}`}>{value ?? '—'}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

function textColor(color) {
  return { green: 'text-green-300', yellow: 'text-yellow-300', red: 'text-red-300' }[color] || 'text-white';
}

const SP_LABELS    = { chinook: 'Chinook', coho: 'Coho', pink: 'Pink / Humpy' };
const SP_THRESHOLD = {
  chinook: '0–.2 low · .21–.4 med · .41–.5 good · .51+',
  coho:    '0–.4 low · .41–.6 med · .61–.8 good · .8+',
  pink:    '0–.8 low · .8–1.5 good · 1.5+',
};

function RampCreelCard({ rampName, ramp }) {
  const hasAnyData = ramp?.hasData || ramp?.totalCaught > 0;
  const speciesWithData = ['chinook', 'coho', 'pink'].filter(sp =>
    (ramp?.targetCounts?.[sp] ?? 0) > 0 || ramp?.perAnglerRates?.[sp] != null
  );

  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
      {/* Ramp header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-700/50 border-b border-slate-700">
        <p className="text-sm font-semibold text-white">📍 {rampName}</p>
        {!hasAnyData && (
          <span className="text-xs text-slate-500">No reports this period</span>
        )}
      </div>

      {hasAnyData ? (
        <div className="p-3">
          {ramp?.hasAnglerData && speciesWithData.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {['chinook', 'coho', 'pink'].map(sp => {
                const rate  = ramp.perAnglerRates?.[sp];
                const rObj  = ramp.speciesRatings?.[sp];
                const count = ramp.targetCounts?.[sp] ?? 0;

                if (rate == null && count === 0) {
                  return (
                    <div key={sp} className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-center">
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
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold capitalize flex-shrink-0 ${RATING_BADGE[rating]}`}>
                        {rating}
                      </span>
                    </div>
                    {rate != null ? (
                      <p className="text-lg font-bold tabular-nums leading-tight">
                        {rate.toFixed(2)}
                        <span className="text-xs font-normal ml-0.5 opacity-60">/ang</span>
                      </p>
                    ) : (
                      <p className="text-sm font-bold">{count} caught</p>
                    )}
                    <p className="text-xs opacity-40 mt-0.5 leading-tight truncate">{SP_THRESHOLD[sp]}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            /* No angler count in dataset — show raw total */
            <p className="text-sm text-slate-300">
              {ramp?.totalCaught ?? 0} fish reported · no angler count in dataset
            </p>
          )}
        </div>
      ) : (
        <div className="px-3 py-2">
          <p className="text-xs text-slate-600">No WDFW creel surveys at this ramp in the last 30 days.</p>
        </div>
      )}
    </div>
  );
}

function SolarStat({ icon, label, time, note, highlight }) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? 'bg-amber-900/30 border border-amber-800' : 'bg-slate-800'}`}>
      <p className="text-lg mb-0.5">{icon}</p>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-amber-300' : 'text-white'}`}>
        {tideTime(time)}
      </p>
      {note && <p className="text-xs text-slate-500 mt-0.5">{note}</p>}
    </div>
  );
}

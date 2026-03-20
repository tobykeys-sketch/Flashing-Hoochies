import React, { useState } from 'react';

const AREA_NUMS = [10, 11];

const STATUS_STYLE = {
  open:   'bg-green-800 text-green-100',
  closed: 'bg-red-800 text-red-100',
  check:  'bg-yellow-800 text-yellow-100',
};

const STATUS_LABEL = {
  open:   'Open',
  closed: 'Closed',
  check:  'Verify',
};

export default function RegulationsPanel({ regulations }) {
  const [activeArea, setActiveArea] = useState(10);
  const { areas, lastUpdated } = regulations;
  const area = areas[activeArea];

  if (!area) return null;

  return (
    <div>
      {/* Area selector */}
      <div className="flex gap-1 mb-5 bg-slate-800 p-1 rounded-xl w-fit">
        {AREA_NUMS.map(n => (
          <button
            key={n}
            onClick={() => setActiveArea(n)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeArea === n
                ? 'bg-slate-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Area {n}
          </button>
        ))}
      </div>

      {/* Area name + warning */}
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">{area.name}</h2>
        <p className="text-xs text-yellow-400 mt-1">
          ⚠️ These are general summaries only. Always verify current rules at official sources before fishing or harvesting.
        </p>
      </div>

      {/* ── Emergency Rules Quick Links ── */}
      <div className="mb-6 rounded-xl border border-red-800/60 bg-red-900/20 p-4">
        <h3 className="text-sm font-bold text-red-300 mb-3">🚨 Emergency Rules — Check Before You Go</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <EmergencyLink
            href={area.emergencyFishingUrl}
            label="Emergency Fishing Rules"
            sub="Salmon, Halibut, Finfish"
            color="red"
          />
          <EmergencyLink
            href={area.emergencyShellUrl}
            label="Emergency Shellfishing Rules"
            sub="Crab, Clams, Oysters, Shrimp"
            color="orange"
          />
          <EmergencyLink
            href={area.shellfishStatusUrl}
            label="Dungeness Crab Season Status"
            sub="Open/closed status by area"
            color="orange"
          />
          <EmergencyLink
            href={area.biotoxinUrl}
            label="Biotoxin (PSP) Closures"
            sub="Check before harvesting shellfish"
            color="orange"
          />
        </div>
      </div>

      {/* ── Finfish Regulations ── */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">🐟 Finfish</h3>
        <div className="space-y-3">
          {(area.finfish || area.species || []).map((sp, i) => (
            <SpeciesCard key={i} sp={sp} />
          ))}
        </div>
      </div>

      {/* ── Shellfish Regulations ── */}
      {area.shellfish?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">🦀 Shellfishing</h3>
          <div className="bg-orange-900/10 border border-orange-900/40 rounded-xl p-3 mb-3">
            <p className="text-xs text-orange-300 leading-relaxed">
              <span className="font-bold">⚠️ Biotoxin Warning:</span> Paralytic Shellfish Poison (PSP) can be present year-round in Puget Sound.
              Always check the{' '}
              <a href={area.biotoxinUrl} target="_blank" rel="noreferrer" className="underline text-orange-200 hover:text-white">
                WDFW biotoxin hotline
              </a>{' '}
              and the{' '}
              <a href={area.emergencyShellUrl} target="_blank" rel="noreferrer" className="underline text-orange-200 hover:text-white">
                current shellfish rules
              </a>{' '}
              before harvesting.
            </p>
          </div>
          <div className="space-y-3">
            {area.shellfish.map((sp, i) => (
              <SpeciesCard key={i} sp={sp} shellfish />
            ))}
          </div>
        </div>
      )}

      {/* ── Official Sources ── */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">📋 Official Sources</h3>
        <div className="space-y-2">
          <RegLink href={area.officialUrl}         label="WDFW Fishing Regulations (Sport)" />
          <RegLink href={area.eRegulationsUrl}     label={`eRegulations — ${area.name}`} />
          <RegLink href={area.emergencyFishingUrl} label="WDFW Emergency Fishing Rules" />
          <RegLink href={area.emergencyShellUrl}   label="WDFW Emergency Shellfishing Rules" />
          <RegLink href={area.biotoxinUrl}         label="WDFW Biotoxin/PSP Closure Map" />
        </div>
      </div>

      <p className="text-xs text-slate-600 mt-4">
        Regulation data last reviewed: {lastUpdated} · Regulations change frequently — always check official sources.
      </p>
    </div>
  );
}

function SpeciesCard({ sp, shellfish }) {
  return (
    <div className={`rounded-xl p-4 border ${shellfish ? 'bg-slate-800 border-orange-900/40' : 'bg-slate-800 border-slate-700'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white">{sp.name}</h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLE[sp.status] || STATUS_STYLE.check}`}>
          {STATUS_LABEL[sp.status] || 'Check'}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-3">
        <RegDetail label="Open Dates" value={sp.openDates} />
        <RegDetail label="Bag Limit"  value={sp.bagLimit} />
        <RegDetail label="Size Limit" value={sp.sizeLimit} />
      </div>
      {sp.notes && (
        <p className={`text-xs rounded-lg px-3 py-2 border ${
          shellfish
            ? 'text-orange-300 bg-orange-900/20 border-orange-900/50'
            : 'text-yellow-300 bg-yellow-900/20 border-yellow-900/50'
        }`}>
          {sp.notes}
        </p>
      )}
    </div>
  );
}

function EmergencyLink({ href, label, sub, color }) {
  const styles = {
    red:    'bg-red-900/30 border-red-800 hover:bg-red-900/50 text-red-200',
    orange: 'bg-orange-900/20 border-orange-800/60 hover:bg-orange-900/40 text-orange-200',
  };
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`flex items-start gap-2 rounded-lg border p-2.5 transition-colors ${styles[color] || styles.red}`}
    >
      <span className="text-sm mt-0.5">↗</span>
      <div>
        <p className="text-sm font-semibold leading-tight">{label}</p>
        <p className="text-xs opacity-70 mt-0.5">{sub}</p>
      </div>
    </a>
  );
}

function RegDetail({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className="text-slate-200">{value}</p>
    </div>
  );
}

function RegLink({ href, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
    >
      <span>↗</span>
      <span className="underline">{label}</span>
    </a>
  );
}

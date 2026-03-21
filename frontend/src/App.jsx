import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import RampCard from './components/RampCard';
import RegulationsPanel from './components/RegulationsPanel';

const RAMPS = [
  { display: 'Shilshole Public Ramp', key: 'Shilshole Bay',    areaNum: 10 },
  { display: 'Redondo Ramp',          key: 'Redondo Ramp',     areaNum: 10 },
  { display: 'Armeni Public Ramp',    key: 'Armeni Boat Ramp', areaNum: 10 },
];

export default function App() {
  const [conditions, setConditions] = useState(null);
  const [regulations, setRegulations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('conditions');
  const [selectedArea, setSelectedArea] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConditions = useCallback(async (forceRefresh = false) => {
    try {
      const url = forceRefresh ? '/api/conditions/refresh' : '/api/conditions';
      const { data } = await axios.get(url);
      setConditions(data);
      setError(null);
    } catch (err) {
      setError('Failed to load fishing conditions. Make sure the backend is running.');
    }
  }, []);

  const fetchRegulations = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/regulations');
      setRegulations(data);
    } catch (err) {
      console.error('Failed to load regulations:', err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchConditions(), fetchRegulations()]).finally(() => setLoading(false));
  }, [fetchConditions, fetchRegulations]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchConditions(true);
    setRefreshing(false);
  };

  const goodRamps = conditions
    ? RAMPS.filter(r => conditions.areas[r.areaNum]?.scoring?.color === 'green')
    : [];

  return (
    <div className="min-h-screen" style={{background:'#080e1a'}}>

      {/* Header */}
      <header className="header-texture border-b border-blue-900/30 px-6 py-5 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <div className="w-6 h-0.5 bg-blue-400 rounded-full" />
              <div className="w-4 h-0.5 bg-blue-500/60 rounded-full" />
              <div className="w-5 h-0.5 bg-blue-600/40 rounded-full" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none">
                Flashing Hoochie
              </h1>
              <p className="text-xs text-blue-400/60 mt-1.5 tracking-[0.2em] uppercase font-medium">
                Shilshole · Redondo · Armeni
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {conditions?.cachedAt && (
              <div className="hidden sm:flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" />
                <span className="text-xs text-slate-500">
                  {new Date(conditions.cachedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-xs font-semibold bg-blue-600/80 hover:bg-blue-500 disabled:opacity-40 px-4 py-2 rounded-lg text-white transition-all border border-blue-500/30 hover:border-blue-400/50"
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">

        {/* Good conditions banner */}
        {!loading && goodRamps.length > 0 && (
          <div className="mb-6 rounded-2xl border border-emerald-700/40 bg-gradient-to-r from-emerald-950/60 to-emerald-900/20 px-5 py-4 flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-emerald-400 live-dot flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-300 tracking-wide">Good conditions right now</p>
              <p className="text-xs text-emerald-600 mt-0.5 font-medium">{goodRamps.map(r => r.display).join(' · ')}</p>
            </div>
          </div>
        )}

        {/* Tab nav */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)'}}>
          {['conditions', 'regulations'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'conditions' ? 'Conditions' : 'Regulations'}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32 text-slate-600">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-slate-800 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-medium">Loading conditions…</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-2xl border border-red-800/50 bg-red-950/30 p-5 text-red-300">
            <p className="font-bold text-sm">Connection Error</p>
            <p className="text-xs mt-1 text-red-400/70">{error}</p>
          </div>
        )}

        {/* Conditions tab */}
        {activeTab === 'conditions' && !loading && !error && conditions && (
          <div className="grid gap-3">
            {RAMPS.map(ramp => {
              const area = conditions.areas[ramp.areaNum];
              if (!area) return null;
              return (
                <RampCard
                  key={ramp.display}
                  rampName={ramp.key}
                  displayName={ramp.display}
                  areaLabel={area.areaName}
                  creel={area.creel}
                  scoring={area.scoring}
                  tides={area.tides}
                  solar={area.solar}
                  advisories={area.advisories}
                  hourlyWind={area.hourlyWind}
                  dailyForecast={area.dailyForecast}
                  forecast={area.forecast}
                  emergency={area.emergency}
                  fetchedAt={area.fetchedAt}
                  expanded={selectedArea === ramp.display}
                  onToggle={() => setSelectedArea(selectedArea === ramp.display ? null : ramp.display)}
                />
              );
            })}
          </div>
        )}

        {/* Regulations tab */}
        {activeTab === 'regulations' && !loading && regulations && (
          <RegulationsPanel regulations={regulations} />
        )}
      </main>

      <footer className="text-center text-xs text-slate-700 py-8 border-t border-slate-800/50">
        Data: NOAA api.weather.gov · WDFW data.wa.gov · Always verify at{' '}
        <a href="https://wdfw.wa.gov/fishing/regulations" target="_blank" rel="noreferrer"
          className="underline hover:text-slate-500">
          wdfw.wa.gov
        </a>
      </footer>
    </div>
  );
}

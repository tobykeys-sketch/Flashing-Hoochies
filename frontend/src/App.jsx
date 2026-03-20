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
    <div className="min-h-screen bg-slate-950">

      {/* Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-7 bg-blue-500 rounded-full" />
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight leading-none">
                Puget Sound Fishing
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Shilshole · Redondo · Armeni</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {conditions?.cachedAt && (
              <span className="text-xs text-slate-600 hidden sm:block">
                Updated {new Date(conditions.cachedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-40 px-3 py-1.5 rounded-lg text-white transition-colors"
            >
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5">

        {/* Good conditions banner */}
        {!loading && goodRamps.length > 0 && (
          <div className="mb-5 rounded-xl border border-emerald-700/50 bg-emerald-950/40 px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">Good conditions right now</p>
              <p className="text-xs text-emerald-600 mt-0.5">{goodRamps.map(r => r.display).join(' · ')}</p>
            </div>
          </div>
        )}

        {/* Tab nav */}
        <div className="flex gap-1 mb-5 bg-slate-800/60 border border-slate-700/50 p-1 rounded-xl w-fit">
          {['conditions', 'regulations'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'conditions' ? 'Conditions' : 'Regulations'}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24 text-slate-500">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm">Loading conditions…</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-950/50 border border-red-800/60 rounded-xl p-5 text-red-300">
            <p className="font-semibold text-sm">Connection Error</p>
            <p className="text-xs mt-1 text-red-400/80">{error}</p>
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

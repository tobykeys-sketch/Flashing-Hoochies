import React, { useState, useEffect } from 'react';

const STORAGE_KEY   = 'fishGodsLevel';
const INTERVAL_MS   = 10 * 60 * 60 * 1000; // 10 hours

const LEVELS = [
  {
    key:   'outraged',
    min:   0,
    emoji: '⚡',
    label: 'Outraged',
    message: 'The fish gods demand sacrifice. It\'s you today.',
    bg:    'bg-red-950',
    border:'border-red-800',
    text:  'text-red-300',
    glow:  'shadow-red-900/60',
    bar:   'bg-red-700',
  },
  {
    key:   'displeased',
    min:   20,
    emoji: '😤',
    label: 'Displeased',
    message: 'The fish gods are testing your patience.',
    bg:    'bg-orange-950',
    border:'border-orange-800',
    text:  'text-orange-300',
    glow:  'shadow-orange-900/60',
    bar:   'bg-orange-600',
  },
  {
    key:   'neutral',
    min:   35,
    emoji: '⚖️',
    label: 'Neutral',
    message: 'The fish gods are indifferent. Fair trade possible.',
    bg:    'bg-yellow-950',
    border:'border-yellow-800',
    text:  'text-yellow-300',
    glow:  'shadow-yellow-900/60',
    bar:   'bg-yellow-600',
  },
  {
    key:   'favorable',
    min:   50,
    emoji: '🎣',
    label: 'Favorable',
    message: 'The fish gods are intrigued.',
    bg:    'bg-lime-950',
    border:'border-lime-800',
    text:  'text-lime-300',
    glow:  'shadow-lime-900/60',
    bar:   'bg-lime-600',
  },
  {
    key:   'blessed',
    min:   65,
    emoji: '✨',
    label: 'Blessed',
    message: 'The fish gods are amused by your efforts.',
    bg:    'bg-green-950',
    border:'border-green-800',
    text:  'text-green-300',
    glow:  'shadow-green-900/60',
    bar:   'bg-green-600',
  },
  {
    key:   'benevolent',
    min:   80,
    emoji: '🌟',
    label: 'Benevolent',
    message: 'You are favored. Rejoice.',
    bg:    'bg-emerald-950',
    border:'border-emerald-700',
    text:  'text-emerald-200',
    glow:  'shadow-emerald-900/80',
    bar:   'bg-emerald-500',
  },
];

function pickRandom() {
  return LEVELS[Math.floor(Math.random() * LEVELS.length)];
}

function loadOrRoll() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && Date.now() - stored.setAt < INTERVAL_MS) {
      const found = LEVELS.find(l => l.key === stored.key);
      if (found) return found;
    }
  } catch {}
  const level = pickRandom();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: level.key, setAt: Date.now() }));
  return level;
}

export default function FishGodsMeter() {
  const [current, setCurrent] = useState(() => loadOrRoll());

  // Re-roll when the 10-hour window expires
  useEffect(() => {
    function checkRoll() {
      try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!stored || Date.now() - stored.setAt >= INTERVAL_MS) {
          const level = pickRandom();
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: level.key, setAt: Date.now() }));
          setCurrent(level);
        }
      } catch {}
    }
    const id = setInterval(checkRoll, 60 * 1000); // check every minute
    return () => clearInterval(id);
  }, []);

  const idx = LEVELS.indexOf(current);

  return (
    <div className={`mb-6 rounded-xl border ${current.bg} ${current.border} shadow-lg ${current.glow} overflow-hidden`}>
      {/* Title row */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{current.emoji}</span>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Fish Gods Meter</p>
            <p className={`text-lg font-bold ${current.text}`}>{current.label}</p>
          </div>
        </div>
        <p className={`text-sm italic ${current.text} opacity-80 text-right max-w-xs hidden sm:block`}>
          "{current.message}"
        </p>
      </div>

      {/* Mobile message */}
      <p className={`px-5 pb-3 text-sm italic ${current.text} opacity-80 sm:hidden`}>
        "{current.message}"
      </p>

      {/* Meter bar — 6 segments */}
      <div className="px-5 pb-4">
        <div className="flex gap-1 items-end">
          {LEVELS.map((lvl, i) => (
            <div key={lvl.key} className="flex-1 flex flex-col items-center gap-1">
              {/* Active marker */}
              {i === idx && (
                <span className="text-xs">{lvl.emoji}</span>
              )}
              {/* Segment bar — active is taller */}
              <div
                className={`w-full rounded-sm transition-all ${lvl.bar} ${
                  i === idx
                    ? 'h-4 ring-2 ring-white/30'
                    : i < idx
                    ? 'h-2 opacity-40'
                    : 'h-2 opacity-15'
                }`}
              />
              {/* Label (only on larger screens) */}
              <p className={`text-xs hidden md:block ${i === idx ? current.text + ' font-bold' : 'text-slate-600'}`}>
                {lvl.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

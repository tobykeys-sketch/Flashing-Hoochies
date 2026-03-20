import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const RATINGS = [
  { value: 'hot',     emoji: '🔥', label: 'Hot',     sub: 'Fish are biting!' },
  { value: 'good',    emoji: '👍', label: 'Good',    sub: 'Decent action'    },
  { value: 'slow',    emoji: '😐', label: 'Slow',    sub: 'Not much happening' },
  { value: 'skunked', emoji: '🚫', label: 'Skunked', sub: 'Nothing caught'   },
];

const RATING_STYLE = {
  hot:     'bg-orange-900/50 border-orange-600 text-orange-200',
  good:    'bg-green-900/40 border-green-700 text-green-300',
  slow:    'bg-yellow-900/30 border-yellow-700 text-yellow-300',
  skunked: 'bg-slate-800 border-slate-600 text-slate-400',
};

const SPECIES_OPTIONS = ['Chinook', 'Coho', 'Pink', 'Halibut', 'Rockfish', 'Lingcod', 'Other'];

function formatDate(isoStr) {
  const d = new Date(isoStr);
  const now = new Date();
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);

  const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  let ago;
  if (days > 0)   ago = `${days}d ago`;
  else if (hrs > 0)  ago = `${hrs}h ago`;
  else if (mins > 0) ago = `${mins}m ago`;
  else               ago = 'just now';

  return `${dateStr} at ${timeStr} · ${ago}`;
}

export default function FishingReports({ rampName }) {
  const [reports, setReports]       = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileRef = useRef(null);
  const [form, setForm] = useState({
    rating: '', species: '', count: '', notes: '', angler: '',
  });

  useEffect(() => {
    axios.get('/api/reports', { params: { ramp: rampName } })
      .then(r => setReports(r.data))
      .catch(() => {});
  }, [rampName]);

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) { setPhotoPreview(null); return; }
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.rating) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('ramp',    rampName);
      fd.append('rating',  form.rating);
      if (form.species) fd.append('species', form.species);
      if (form.count)   fd.append('count',   form.count);
      if (form.notes)   fd.append('notes',   form.notes);
      if (form.angler)  fd.append('angler',  form.angler);
      const photoFile = fileRef.current?.files?.[0];
      if (photoFile)    fd.append('photo', photoFile);

      const { data } = await axios.post('/api/reports', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setReports(prev => [data, ...prev]);
      setForm({ rating: '', species: '', count: '', notes: '', angler: '' });
      setPhotoPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      setShowForm(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      console.error('Failed to submit report', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          🎣 Community Reports
        </h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            + Share Your Report
          </button>
        )}
      </div>

      {/* Success toast */}
      {submitted && (
        <div className="mb-3 bg-green-900/50 border border-green-700 rounded-lg px-3 py-2 text-xs text-green-300 font-medium">
          ✓ Your report was submitted — thanks for sharing!
        </div>
      )}

      {/* Submission form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 bg-slate-800/80 border border-slate-600 rounded-xl p-4 space-y-4">

          {/* Rating picker */}
          <div>
            <p className="text-xs text-slate-400 mb-2 font-medium">How was the fishing? <span className="text-red-400">*</span></p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RATINGS.map(r => (
                <button key={r.value} type="button" onClick={() => set('rating', r.value)}
                  className={`rounded-lg border p-2 text-center transition-all ${
                    form.rating === r.value
                      ? 'ring-2 ring-blue-400 ' + RATING_STYLE[r.value]
                      : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}>
                  <p className="text-xl">{r.emoji}</p>
                  <p className="text-xs font-semibold mt-0.5">{r.label}</p>
                  <p className="text-xs opacity-60 leading-tight">{r.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Species + Count */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Species caught</label>
              <select value={form.species} onChange={e => set('species', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
                <option value="">None / select</option>
                {SPECIES_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">How many?</label>
              <input type="number" min="0" max="999" value={form.count}
                onChange={e => set('count', e.target.value)} placeholder="0"
                className="w-full bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Notes <span className="opacity-50">(bait, depth, time, tips…)</span></label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="e.g. Caught 2 coho at 40ft on hoochies around 6am…"
              rows={2} maxLength={500}
              className="w-full bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 resize-none" />
          </div>

          {/* Photo upload */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Photo <span className="opacity-50">(optional — show off your catch!)</span></label>
            <div className="flex items-start gap-3">
              <label className="cursor-pointer flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 text-slate-300 text-xs px-3 py-2 rounded-lg transition-colors">
                📷 Choose photo
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
              {photoPreview && (
                <div className="relative">
                  <img src={photoPreview} alt="preview" className="h-16 w-16 object-cover rounded-lg border border-slate-600" />
                  <button type="button"
                    onClick={() => { setPhotoPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                    className="absolute -top-1.5 -right-1.5 bg-red-700 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Angler name */}
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Your name / handle <span className="opacity-50">(optional)</span></label>
            <input type="text" value={form.angler} onChange={e => set('angler', e.target.value)}
              placeholder="Anonymous" maxLength={50}
              className="w-full bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={!form.rating || submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 rounded-lg transition-colors">
              {submitting ? 'Submitting…' : 'Submit Report'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setPhotoPreview(null); }}
              className="px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Existing reports */}
      {reports.length > 0 ? (
        <div className="space-y-3">
          {reports.slice(0, 5).map(r => {
            const rating = RATINGS.find(x => x.value === r.rating);
            return (
              <div key={r.id} className={`rounded-lg border px-3 py-2.5 text-sm ${RATING_STYLE[r.rating] || 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                <div className="flex items-start gap-3">
                  {/* Photo thumbnail */}
                  {r.photo && (
                    <a href={r.photo} target="_blank" rel="noreferrer" className="flex-shrink-0">
                      <img src={r.photo} alt="catch" className="w-14 h-14 object-cover rounded-lg border border-white/10" />
                    </a>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{rating?.emoji}</span>
                        <span className="font-semibold">{rating?.label}</span>
                        {r.species && (
                          <span className="text-xs opacity-70">
                            · {r.count != null ? `${r.count}× ` : ''}{r.species}
                          </span>
                        )}
                      </div>
                    </div>
                    {r.notes && <p className="text-xs opacity-80 leading-snug">{r.notes}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <p className="text-xs opacity-40">— {r.angler}</p>
                      <span className="text-xs opacity-30">·</span>
                      <p className="text-xs opacity-40">{formatDate(r.timestamp)}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {reports.length > 5 && (
            <p className="text-xs text-slate-600 text-center pt-1">+ {reports.length - 5} more reports</p>
          )}
        </div>
      ) : (
        !showForm && (
          <p className="text-xs text-slate-600 italic">
            No reports yet — be the first to share conditions at this ramp!
          </p>
        )
      )}
    </div>
  );
}

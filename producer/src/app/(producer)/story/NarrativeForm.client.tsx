'use client';

import { useId, useMemo, useState, useEffect } from 'react';
import { submitNarrative, loadNarrative } from './actions';
import { nanoid } from 'nanoid';

const STRUCTURES = ['3-act','4-act','8-sequence','webtoon-episodic'] as const;

type Beat = { id: string; label: string; purpose: 'setup'|'conflict'|'climax'; targetLength: number };

export default function NarrativeForm() {
  const idSynopsis = useId();
  const idStructure = useId();
  const [synopsis, setSynopsis] = useState('');
  const [structure, setStructure] = useState<(typeof STRUCTURES)[number]>('3-act');
  const [beats, setBeats] = useState<Beat[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const narrative = await loadNarrative();
        if (narrative) {
          setSynopsis(narrative.synopsis);
          setStructure(narrative.structure);
          setBeats(narrative.beats || []);
        }
      } catch (error) {
        console.error('Failed to load narrative data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const addBeat = () => {
    setBeats(prev => [...prev, { id: nanoid(6), label: 'Beat', purpose: 'setup', targetLength: 200 }]);
  };
  const updateBeat = (id: string, patch: Partial<Beat>) => {
    setBeats(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  };
  const removeBeat = (id: string) => setBeats(prev => prev.filter(b => b.id !== id));

  const estimatedWords = useMemo(() => beats.reduce((s,b)=>s + (b.targetLength||0), 0), [beats]);
  const estimatedDurationSec = Math.round((estimatedWords / 150) * 60);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setMessage(null); setErrors(null);
    const res = await submitNarrative({ synopsis, structure, beats });
    if (res.ok) setMessage('Saved narrative successfully.');
    else setErrors(res.faults.map(f => `${f.path?.join('.') ?? ''}: ${f.message}`));
    setSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor={idSynopsis} className="form-label">Synopsis</label>
        <textarea id={idSynopsis} value={synopsis} onChange={e=>setSynopsis(e.target.value)} rows={6} className="form-textarea" placeholder="High-level story synopsis" />
      </div>
      <div>
        <label htmlFor={idStructure} className="form-label">Structure</label>
        <select id={idStructure} value={structure} onChange={e=>setStructure(e.target.value as (typeof STRUCTURES)[number])} className="form-select">
          {STRUCTURES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-700">Beats</div>
          <button type="button" onClick={addBeat} className="h-10 px-3 bg-gray-900 text-white rounded-xl hover:bg-black">Add beat</button>
        </div>
        <div className="space-y-2">
          {beats.map(b => (
            <div key={b.id} className="grid grid-cols-[1fr_140px_140px_40px] gap-2 items-center">
              <input value={b.label} onChange={e=>updateBeat(b.id,{label:e.target.value})} className="form-input" placeholder="Beat label" />
              <select value={b.purpose} onChange={e=>updateBeat(b.id,{purpose:e.target.value as 'setup'|'conflict'|'climax'})} className="form-select">
                <option value="setup">setup</option>
                <option value="conflict">conflict</option>
                <option value="climax">climax</option>
              </select>
              <input type="number" value={b.targetLength} onChange={e=>updateBeat(b.id,{targetLength:Number(e.target.value)})} className="form-input" min={20} max={1500} />
              <button type="button" onClick={()=>removeBeat(b.id)} className="text-red-600 hover:underline">×</button>
            </div>
          ))}
        </div>
      </div>

      {message && <div className="text-green-700 bg-green-50 border border-green-200 rounded p-2">{message}</div>}
      {errors && <div className="text-red-700 bg-red-50 border border-red-200 rounded p-2 space-y-1">{errors.map((e)=>(<div key={e}>{e}</div>))}</div>}

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-gray-600">≈ {estimatedWords} words • ≈ {estimatedDurationSec}s video</div>
        <button disabled={submitting || loading} type="submit" className="h-11 px-5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-70">
          {loading ? 'Loading...' : submitting ? 'Saving...' : 'Save Narrative'}
        </button>
      </div>
    </form>
  );
}



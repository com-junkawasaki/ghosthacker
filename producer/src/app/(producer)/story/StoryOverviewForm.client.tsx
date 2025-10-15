'use client';

import { useState, useId } from 'react';
import { submitOverview } from './actions';

const GENRES = ['horror','mystery','thriller','romance','sci-fi','fantasy'] as const;
const TONES = ['atmospheric','comedic','dark','hopeful'] as const;

export default function StoryOverviewForm() {
  const idTitle = useId();
  const idLogline = useId();
  const idTone = useId();
  const idKeywords = useId();
  const [title, setTitle] = useState('');
  const [logline, setLogline] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [tone, setTone] = useState<'atmospheric'|'comedic'|'dark'|'hopeful'>('atmospheric');
  const [keywords, setKeywords] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleGenre = (g: string) => {
    setGenres((prev) => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setErrors(null);
    const input = {
      title, logline, genres: genres as Readonly<typeof GENRES>[number][], tone,
      audienceRating: 'PG-13' as const,
      language: 'en' as const,
      keywords: keywords.split(',').map(s=>s.trim()).filter(Boolean),
    };
    const res = await submitOverview(input);
    if (res.ok) {
      setMessage('Saved overview successfully.');
    } else {
      setErrors(res.faults.map(f => `${f.path?.join('.') ?? ''}: ${f.message}`));
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor={idTitle} className="block text-sm font-medium text-gray-700">Title</label>
        <input id={idTitle} value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Project title"/>
      </div>
      <div>
        <label htmlFor={idLogline} className="block text-sm font-medium text-gray-700">Logline</label>
        <input id={idLogline} value={logline} onChange={e=>setLogline(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" placeholder="One-sentence hook"/>
      </div>
      <div>
        <div className="block text-sm font-medium text-gray-700 mb-1">Genres</div>
        <div className="flex flex-wrap gap-2">
          {GENRES.map(g => (
            <button key={g} type="button" onClick={()=>toggleGenre(g)} className={`px-3 py-1 rounded-full border ${genres.includes(g)?'bg-blue-600 text-white border-blue-600':'border-gray-300 text-gray-700 hover:bg-gray-100'}`}>{g}</button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor={idTone} className="block text-sm font-medium text-gray-700">Tone</label>
        <select id={idTone} value={tone} onChange={e=>setTone(e.target.value as (typeof TONES)[number])} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
          {TONES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={idKeywords} className="block text-sm font-medium text-gray-700">Keywords (comma separated)</label>
        <input id={idKeywords} value={keywords} onChange={e=>setKeywords(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" placeholder="ghost, alley, rain"/>
      </div>

      {message && <div className="text-green-700 bg-green-50 border border-green-200 rounded p-2">{message}</div>}
      {errors && <div className="text-red-700 bg-red-50 border border-red-200 rounded p-2 space-y-1">{errors.map((e)=>(<div key={e}>{e}</div>))}</div>}

      <div className="pt-2">
        <button disabled={submitting} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-70">{submitting? 'Saving...':'Save Overview'}</button>
      </div>
    </form>
  );
}



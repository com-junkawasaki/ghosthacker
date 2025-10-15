'use client';

import { useState, useId, useEffect } from 'react';
import { submitOverview, loadProject } from './actions';

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
  const [loading, setLoading] = useState(true);

  // Load existing data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const project = await loadProject();
        if (project) {
          setTitle(project.title);
          setLogline(project.logline);
          setGenres(project.genres);
          setTone(project.tone);
          setKeywords(project.keywords?.join(', ') || '');
        }
      } catch (error) {
        console.error('Failed to load project data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

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
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label htmlFor={idTitle} className="form-label">Title</label>
        <input id={idTitle} value={title} onChange={e=>setTitle(e.target.value)} className="form-input" placeholder="Project title"/>
      </div>
      <div>
        <label htmlFor={idLogline} className="form-label">Logline</label>
        <input id={idLogline} value={logline} onChange={e=>setLogline(e.target.value)} className="form-input" placeholder="One-sentence hook"/>
      </div>
      <div>
        <div className="form-label mb-1">Genres</div>
        <div className="flex flex-wrap gap-2">
          {GENRES.map(g => (
            <button
              key={g}
              type="button"
              onClick={()=>toggleGenre(g)}
              className={`chip ${genres.includes(g) ? 'chip--selected' : ''}`}
            >{g}</button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor={idTone} className="form-label">Tone</label>
        <select id={idTone} value={tone} onChange={e=>setTone(e.target.value as (typeof TONES)[number])} className="form-select">
          {TONES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor={idKeywords} className="form-label">Keywords (comma separated)</label>
        <input id={idKeywords} value={keywords} onChange={e=>setKeywords(e.target.value)} className="form-input" placeholder="ghost, alley, rain"/>
      </div>

      {message && <div className="text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">{message}</div>}
      {errors && <div className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">{errors.map((e)=>(<div key={e}>{e}</div>))}</div>}

      <div className="pt-2">
        <button disabled={submitting || loading} type="submit" className="h-11 px-5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-70">
          {loading ? 'Loading...' : submitting ? 'Saving...' : 'Save Overview'}
        </button>
      </div>
    </form>
  );
}



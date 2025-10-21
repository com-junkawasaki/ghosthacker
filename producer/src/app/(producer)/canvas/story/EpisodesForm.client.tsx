'use client';

import { useId, useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { submitEpisodes, loadEpisodes } from './actions';

type Episode = { id: string; episodeId: string; sourcePath: string };

function EpisodeRow({ e, onUpdate, onRemove }: { e: Episode; onUpdate: (id: string, patch: Partial<Episode>) => void; onRemove: (id: string) => void }) {
  const idEp = useId();
  const idPath = useId();
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr] gap-3 border border-gray-200 rounded-xl p-3 bg-white">
      <div>
        <label htmlFor={idEp} className="block text-[15px] leading-5 font-medium text-gray-900">Episode ID</label>
        <input id={idEp} value={e.episodeId} onChange={ev=>onUpdate(e.id,{episodeId:ev.target.value})} className="mt-1 w-full h-11 rounded-xl border border-gray-300 bg-white px-4 text-[16px] leading-[44px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label htmlFor={idPath} className="block text-[15px] leading-5 font-medium text-gray-900">Source Path</label>
        <input id={idPath} value={e.sourcePath} onChange={ev=>onUpdate(e.id,{sourcePath:ev.target.value})} className="mt-1 w-full h-11 rounded-xl border border-gray-300 bg-white px-4 text-[16px] leading-[44px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={()=>onRemove(e.id)} className="text-red-600 hover:underline">Remove</button>
      </div>
    </div>
  );
}

export default function EpisodesForm() {
  const [list, setList] = useState<Episode[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEpisodes().then(eps => {
      if (eps.length > 0) setList(eps.map(e => ({ id: nanoid(6), ...e })));
    }).catch(()=>{});
  }, []);

  const add = () => setList(prev => [...prev, { id: nanoid(6), episodeId: '', sourcePath: '' }]);
  const remove = (id: string) => setList(prev => prev.filter(e => e.id !== id));
  const update = (id: string, patch: Partial<Episode>) => setList(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setMessage(null); setErrors(null);
    const payload = list.map(({id, ...rest}) => rest);
    const res = await submitEpisodes(payload);
    if (res.ok) setMessage('Saved episodes successfully.');
    else setErrors(res.faults.map(f => `${f.path?.join('.') ?? ''}: ${f.message}`));
    setSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">Episodes</div>
        <button type="button" onClick={add} className="px-3 py-1.5 bg-gray-800 text-white rounded-md hover:bg-gray-900">Add Episode</button>
      </div>

      <div className="space-y-2">
        {list.map((e) => (
          <EpisodeRow key={e.id} e={e} onUpdate={update} onRemove={remove} />)
        )}
      </div>

      {message && <div className="text-green-700 bg-green-50 border border-green-200 rounded p-2">{message}</div>}
      {errors && <div className="text-red-700 bg-red-50 border border-red-200 rounded p-2 space-y-1">{errors.map((er)=>(<div key={er}>{er}</div>))}</div>}

      <div className="pt-1">
        <button disabled={submitting} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-70">{submitting? 'Saving...':'Save Episodes'}</button>
      </div>
    </form>
  );
}



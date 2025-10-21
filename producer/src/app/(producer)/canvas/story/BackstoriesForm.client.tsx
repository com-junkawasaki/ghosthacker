'use client';

import { useId, useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { submitBackstories, loadBackstories } from './actions';

type Backstory = { id: string; origin: string; motivation?: string; conflict?: string; characterName?: string };

function BackstoryRow({ b, onUpdate, onRemove }: { b: Backstory; onUpdate: (id: string, patch: Partial<Backstory>) => void; onRemove: (id: string) => void }) {
  const idOrigin = useId();
  const idMot = useId();
  const idCon = useId();
  const idChar = useId();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-gray-200 rounded-xl p-3 bg-white">
      <div>
        <label htmlFor={idOrigin} className="block text-[15px] leading-5 font-medium text-gray-900">Origin</label>
        <input id={idOrigin} value={b.origin} onChange={e=>onUpdate(b.id,{origin:e.target.value})} className="mt-1 w-full h-11 rounded-xl border border-gray-300 bg-white px-4 text-[16px] leading-[44px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label htmlFor={idChar} className="block text-[15px] leading-5 font-medium text-gray-900">Character (optional)</label>
        <input id={idChar} value={b.characterName ?? ''} onChange={e=>onUpdate(b.id,{characterName:e.target.value})} className="mt-1 w-full h-11 rounded-xl border border-gray-300 bg-white px-4 text-[16px] leading-[44px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label htmlFor={idMot} className="block text-[15px] leading-5 font-medium text-gray-900">Motivation</label>
        <input id={idMot} value={b.motivation ?? ''} onChange={e=>onUpdate(b.id,{motivation:e.target.value})} className="mt-1 w-full h-11 rounded-xl border border-gray-300 bg-white px-4 text-[16px] leading-[44px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label htmlFor={idCon} className="block text-[15px] leading-5 font-medium text-gray-900">Conflict</label>
        <input id={idCon} value={b.conflict ?? ''} onChange={e=>onUpdate(b.id,{conflict:e.target.value})} className="mt-1 w-full h-11 rounded-xl border border-gray-300 bg-white px-4 text-[16px] leading-[44px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="flex items-center justify-between md:col-span-2">
        <button type="button" onClick={()=>onRemove(b.id)} className="text-red-600 hover:underline">Remove</button>
      </div>
    </div>
  );
}

export default function BackstoriesForm() {
  const [list, setList] = useState<Backstory[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBackstories().then(bs => {
      if (bs.length > 0) setList(bs.map(b => ({ id: nanoid(6), ...b })));
    }).catch(()=>{});
  }, []);

  const add = () => setList(prev => [...prev, { id: nanoid(6), origin: '' }]);
  const remove = (id: string) => setList(prev => prev.filter(b => b.id !== id));
  const update = (id: string, patch: Partial<Backstory>) => setList(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setMessage(null); setErrors(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const payload = list.map(({ id, ...rest }) => rest);
    const res = await submitBackstories(payload);
    if (res.ok) setMessage('Saved backstories successfully.');
    else setErrors(res.faults.map(f => `${f.path?.join('.') ?? ''}: ${f.message}`));
    setSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">Backstories</div>
        <button type="button" onClick={add} className="px-3 py-1.5 bg-gray-800 text-white rounded-md hover:bg-gray-900">Add Backstory</button>
      </div>

      <div className="space-y-2">
        {list.map((b) => (
          <BackstoryRow key={b.id} b={b} onUpdate={update} onRemove={remove} />)
        )}
      </div>

      {message && <div className="text-green-700 bg-green-50 border border-green-200 rounded p-2">{message}</div>}
      {errors && <div className="text-red-700 bg-red-50 border border-red-200 rounded p-2 space-y-1">{errors.map((er)=>(<div key={er}>{er}</div>))}</div>}

      <div className="pt-1">
        <button disabled={submitting} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-70">{submitting? 'Saving...':'Save Backstories'}</button>
      </div>
    </form>
  );
}



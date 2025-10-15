'use client';

import { useId, useState } from 'react';
import { nanoid } from 'nanoid';
import { submitCharacters } from './actions';

type Role = 'protagonist' | 'antagonist' | 'support';
type Character = { id: string; name: string; role: Role; motivation?: string; conflict?: string; voice?: string };

function CharacterRow({
  c,
  onUpdate,
  onRemove,
}: { c: Character; onUpdate: (id: string, patch: Partial<Character>) => void; onRemove: (id: string) => void }) {
  const idName = useId();
  const idRole = useId();
  const idMot = useId();
  const idCon = useId();
  const idVoice = useId();
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 border border-gray-200 rounded-md p-3 bg-white">
      <div className="space-y-2">
        <div>
          <label htmlFor={idName} className="block text-xs font-medium text-gray-700">Name</label>
          <input id={idName} value={c.name} onChange={e=>onUpdate(c.id,{name:e.target.value})} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label htmlFor={idMot} className="block text-xs font-medium text-gray-700">Motivation</label>
          <input id={idMot} value={c.motivation ?? ''} onChange={e=>onUpdate(c.id,{motivation:e.target.value})} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label htmlFor={idCon} className="block text-xs font-medium text-gray-700">Conflict</label>
          <input id={idCon} value={c.conflict ?? ''} onChange={e=>onUpdate(c.id,{conflict:e.target.value})} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label htmlFor={idVoice} className="block text-xs font-medium text-gray-700">Voice (style)</label>
          <input id={idVoice} value={c.voice ?? ''} onChange={e=>onUpdate(c.id,{voice:e.target.value})} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
        </div>
      </div>
      <div>
        <label htmlFor={idRole} className="block text-xs font-medium text-gray-700">Role</label>
        <select id={idRole} value={c.role} onChange={e=>onUpdate(c.id,{role:e.target.value as Role})} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
          <option value="protagonist">protagonist</option>
          <option value="antagonist">antagonist</option>
          <option value="support">support</option>
        </select>
        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={()=>onRemove(c.id)} className="text-red-600 hover:underline">Remove</button>
        </div>
      </div>
    </div>
  );
}

export default function CharactersForm() {
  const [list, setList] = useState<Character[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const add = () => setList(prev => [...prev, { id: nanoid(6), name: '', role: 'support' }]);
  const remove = (id: string) => setList(prev => prev.filter(c => c.id !== id));
  const update = (id: string, patch: Partial<Character>) => setList(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setMessage(null); setErrors(null);
    const payload = list.map(({id, ...rest}) => rest);
    const res = await submitCharacters(payload);
    if (res.ok) setMessage('Saved characters successfully.');
    else setErrors(res.faults.map(f => `${f.path?.join('.') ?? ''}: ${f.message}`));
    setSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">Characters</div>
        <button type="button" onClick={add} className="px-3 py-1.5 bg-gray-800 text-white rounded-md hover:bg-gray-900">Add</button>
      </div>

      <div className="space-y-2">
        {list.map((c) => (
          <CharacterRow key={c.id} c={c} onUpdate={update} onRemove={remove} />
        ))}
      </div>

      {message && <div className="text-green-700 bg-green-50 border border-green-200 rounded p-2">{message}</div>}
      {errors && <div className="text-red-700 bg-red-50 border border-red-200 rounded p-2 space-y-1">{errors.map((e)=>(<div key={e}>{e}</div>))}</div>}

      <div className="pt-1">
        <button disabled={submitting} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-70">{submitting? 'Saving...':'Save Characters'}</button>
      </div>
    </form>
  );
}



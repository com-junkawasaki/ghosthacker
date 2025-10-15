'use client';

import { useId, useState } from 'react';
import { submitStyles } from './actions';

const ART_STYLES = ['anime','semi-realistic','painterly','minimal'] as const;
const PALETTES = ['cool','warm','monochrome','high-contrast'] as const;
const VOICES = ['alloy','verse','aria'] as const;
const TEMPOS = ['calm','neutral','fast'] as const;
const MUSIC = ['eerie','tense','melancholic','uplifting'] as const;

export default function StyleForm() {
  const idArt = useId();
  const idPalette = useId();
  const idVoice = useId();
  const idTempo = useId();
  const idMusic = useId();
  const [artStyle, setArtStyle] = useState<(typeof ART_STYLES)[number]>('anime');
  const [palette, setPalette] = useState<(typeof PALETTES)[number]>('cool');
  const [voice, setVoice] = useState<(typeof VOICES)[number]>('alloy');
  const [tempo, setTempo] = useState<(typeof TEMPOS)[number]>('neutral');
  const [musicMood, setMusicMood] = useState<(typeof MUSIC)[number]>('eerie');
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setMessage(null); setErrors(null);
    const res = await submitStyles({
      visual: { artStyle, palette, nsfwAllowed: false },
      audio: { voice, tempo, musicMood },
    });
    if (res.ok) setMessage('Saved styles successfully.');
    else setErrors(res.faults.map(f => `${f.path?.join('.') ?? ''}: ${f.message}`));
    setSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <div className="text-sm font-medium text-gray-700 mb-2">Visual</div>
        <label htmlFor={idArt} className="block text-xs text-gray-600">Art style</label>
        <select id={idArt} value={artStyle} onChange={e=>setArtStyle(e.target.value as (typeof ART_STYLES)[number])} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
          {ART_STYLES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <label htmlFor={idPalette} className="block text-xs text-gray-600 mt-3">Palette</label>
        <select id={idPalette} value={palette} onChange={e=>setPalette(e.target.value as (typeof PALETTES)[number])} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
          {PALETTES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <div className="text-sm font-medium text-gray-700 mb-2">Audio</div>
        <label htmlFor={idVoice} className="block text-xs text-gray-600">Voice</label>
        <select id={idVoice} value={voice} onChange={e=>setVoice(e.target.value as (typeof VOICES)[number])} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
          {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <label htmlFor={idTempo} className="block text-xs text-gray-600 mt-3">Tempo</label>
        <select id={idTempo} value={tempo} onChange={e=>setTempo(e.target.value as (typeof TEMPOS)[number])} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
          {TEMPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <label htmlFor={idMusic} className="block text-xs text-gray-600 mt-3">Music mood</label>
        <select id={idMusic} value={musicMood} onChange={e=>setMusicMood(e.target.value as (typeof MUSIC)[number])} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
          {MUSIC.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {message && <div className="md:col-span-2 text-green-700 bg-green-50 border border-green-200 rounded p-2">{message}</div>}
      {errors && <div className="md:col-span-2 text-red-700 bg-red-50 border border-red-200 rounded p-2 space-y-1">{errors.map((e)=>(<div key={e}>{e}</div>))}</div>}

      <div className="md:col-span-2 pt-1">
        <button disabled={submitting} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-70">{submitting? 'Saving...':'Save Styles'}</button>
      </div>
    </form>
  );
}



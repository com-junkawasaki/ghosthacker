'use client';

import { useId, useState } from 'react';
import { submitPlatforms } from './actions';

export default function PlatformsForm() {
  const idWpCh = useId();
  const idWpLenMin = useId();
  const idWpLenMax = useId();
  const idWpInclude = useId();
  const idWbPanels = useId();
  const idWbSfx = useId();
  const idWbBubbles = useId();
  const idWbPace = useId();
  const idYtDuration = useId();
  const idYtAspect = useId();
  const idYtCap = useId();
  const [wattpad, setWattpad] = useState({ chapterCount: 10, includeImages: true, chapterLengthWords: [800, 1500] as [number, number], imageFrequency: 'inline-1' as const });
  const [webtoon, setWebtoon] = useState({ episodePanels: 40, bubbleDensity: 'medium' as const, readingPace: 'standard' as const, soundEffects: true });
  const [youtube, setYoutube] = useState({ targetDurationSec: 300, aspectRatio: '9:16' as const, captions: true, brollRatio: 0.3 });
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setMessage(null); setErrors(null);
    const res = await submitPlatforms({ wattpad, webtoon, youtube });
    if (res.ok) setMessage('Saved platforms successfully.');
    else setErrors(res.faults.map(f => `${f.path?.join('.') ?? ''}: ${f.message}`));
    setSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 p-3 bg-white">
          <div className="font-medium text-sm text-gray-900 mb-2">Wattpad</div>
          <label htmlFor={idWpCh} className="block text-[15px] leading-5 font-medium text-gray-900 dark:text-gray-100">Chapters</label>
          <input id={idWpCh} type="number" value={wattpad.chapterCount} onChange={e=>setWattpad({...wattpad, chapterCount:Number(e.target.value)})} className="mt-1 w-full h-11 rounded-xl border border-gray-300 bg-white px-4 text-[16px] leading-[44px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" min={1} max={30} />
          <div className="mt-3 text-xs text-gray-600">Chapter length (words)</div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <input id={idWpLenMin} type="number" value={wattpad.chapterLengthWords?.[0] ?? 800} onChange={e=>setWattpad({...wattpad, chapterLengthWords:[Number(e.target.value), wattpad.chapterLengthWords?.[1] ?? 1500]})} className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-[16px] leading-[44px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
            <input id={idWpLenMax} type="number" value={wattpad.chapterLengthWords?.[1] ?? 1500} onChange={e=>setWattpad({...wattpad, chapterLengthWords:[wattpad.chapterLengthWords?.[0] ?? 800, Number(e.target.value)]})} className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-[16px] leading-[44px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="mt-2">
            <label htmlFor={idWpInclude} className="block text-[15px] leading-5 font-medium text-gray-900 dark:text-gray-100">Images</label>
            <select value={wattpad.imageFrequency} onChange={e=>setWattpad({...wattpad, imageFrequency:e.target.value as 'none'|'cover'|'inline-1'|'inline-3'})} className="mt-1 w-full h-11 rounded-xl border border-gray-300 bg-white px-4 pr-9 text-[16px] leading-[44px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
              <option value="none">none</option>
              <option value="cover">cover</option>
              <option value="inline-1">inline-1</option>
              <option value="inline-3">inline-3</option>
            </select>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <input id={idWpInclude} type="checkbox" checked={wattpad.includeImages} onChange={e=>setWattpad({...wattpad, includeImages:e.target.checked})} />
              <label htmlFor={idWpInclude}>Include images</label>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-3 bg-white">
          <div className="font-medium text-sm text-gray-900 mb-2">Webtoon</div>
          <label htmlFor={idWbPanels} className="block text-[15px] leading-5 font-medium text-gray-900 dark:text-gray-100">Panels</label>
          <input id={idWbPanels} type="number" value={webtoon.episodePanels} onChange={e=>setWebtoon({...webtoon, episodePanels:Number(e.target.value)})} className="mt-1 w-full h-11 rounded-xl border border-gray-300 bg-white px-4 text-[16px] leading-[44px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" min={8} max={80} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={idWbBubbles} className="block text-[15px] leading-5 font-medium text-gray-900 dark:text-gray-100">Bubbles</label>
              <select id={idWbBubbles} value={webtoon.bubbleDensity} onChange={e=>setWebtoon({...webtoon, bubbleDensity:e.target.value as 'low'|'medium'|'high'})} className="mt-1 w-full h-11 rounded-xl border border-gray-300 bg-white px-4 pr-9 text-[16px] leading-[44px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>
            <div>
              <label htmlFor={idWbPace} className="block text-[15px] leading-5 font-medium text-gray-900 dark:text-gray-100">Pace</label>
              <select id={idWbPace} value={webtoon.readingPace} onChange={e=>setWebtoon({...webtoon, readingPace:e.target.value as 'slow'|'standard'|'fast'})} className="mt-1 w-full h-11 rounded-xl border border-gray-300 bg-white px-4 pr-9 text-[16px] leading-[44px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
                <option value="slow">slow</option>
                <option value="standard">standard</option>
                <option value="fast">fast</option>
              </select>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <input id={idWbSfx} type="checkbox" checked={webtoon.soundEffects} onChange={e=>setWebtoon({...webtoon, soundEffects:e.target.checked})} />
            <label htmlFor={idWbSfx}>Sound effects</label>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-3 bg-white">
          <div className="font-medium text-sm text-gray-900 mb-2">YouTube</div>
          <label htmlFor={idYtDuration} className="block text-[15px] leading-5 font-medium text-gray-900 dark:text-gray-100">Duration (sec)</label>
          <input id={idYtDuration} type="number" value={youtube.targetDurationSec} onChange={e=>setYoutube({...youtube, targetDurationSec:Number(e.target.value)})} className="mt-1 w-full h-11 rounded-xl border border-gray-300 bg-white px-4 text-[16px] leading-[44px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" min={60} max={900} />
          <label htmlFor={idYtAspect} className="block text-[15px] leading-5 font-medium text-gray-900 dark:text-gray-100 mt-2">Aspect</label>
          <select id={idYtAspect} value={youtube.aspectRatio} onChange={e=>setYoutube({...youtube, aspectRatio:e.target.value as '9:16'|'16:9'})} className="mt-1 w-full h-11 rounded-xl border border-gray-300 bg-white px-4 pr-9 text-[16px] leading-[44px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500">
            <option value="9:16">9:16</option>
            <option value="16:9">16:9</option>
          </select>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <input id={idYtCap} type="checkbox" checked={youtube.captions} onChange={e=>setYoutube({...youtube, captions:e.target.checked})} />
            <label htmlFor={idYtCap}>Captions</label>
          </div>
          <div className="mt-2">
            <label htmlFor={idYtAspect} className="block text-[15px] leading-5 font-medium text-gray-900 dark:text-gray-100">B-roll ratio</label>
            <input id={idYtAspect} type="range" min={0} max={1} step={0.05} value={youtube.brollRatio} onChange={e=>setYoutube({...youtube, brollRatio:Number(e.target.value)})} className="w-full" />
          </div>
        </div>
      </div>

      {message && <div className="text-green-700 bg-green-50 border border-green-200 rounded p-2">{message}</div>}
      {errors && <div className="text-red-700 bg-red-50 border border-red-200 rounded p-2 space-y-1">{errors.map((e)=>(<div key={e}>{e}</div>))}</div>}

      <div>
        <button disabled={submitting} type="submit" className="h-11 px-5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-70">{submitting? 'Saving...':'Save Platforms'}</button>
      </div>
    </form>
  );
}



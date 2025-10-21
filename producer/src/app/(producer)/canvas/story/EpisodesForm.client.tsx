'use client';

import { useId, useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { submitEpisodes, loadEpisodes } from './actions';
import type { Episode, MediaObject } from './types';

// Frontend-specific types for state management
type MediaObjectState = MediaObject & { uiId: string };
type EpisodeState = Omit<Episode, 'gh:hasPart'> & { 
  uiId: string;
  'gh:hasPart'?: MediaObjectState[];
};

// Data loaded from server might not have `@type` yet for older records
type LoadedEpisode = Omit<Episode, '@type'> & { '@type'?: "gh:Episode" };

const MEDIA_TYPES = [
  "schema:TextDigitalDocument",
  "schema:ImageObject",
  "schema:VideoObject",
  "schema:AudioObject",
] as const;


function MediaObjectRow({
  media,
  onUpdate,
  onRemove,
}: {
  media: MediaObjectState;
  onUpdate: (patch: Partial<MediaObject>) => void;
  onRemove: () => void;
}) {
  const idType = useId();
  const idUrl = useId();
  const idName = useId();

  return (
    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={idType} className="block text-xs font-medium text-gray-600">Type</label>
          <select
            id={idType}
            value={media['@type']}
            onChange={(e) => onUpdate({ '@type': e.target.value as MediaObject['@type'] })}
            className="mt-1 w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {MEDIA_TYPES.map(t => <option key={t} value={t}>{t.replace('schema:', '')}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={idName} className="block text-xs font-medium text-gray-600">Name</label>
          <input
            id={idName}
            value={media['schema:name'] ?? ''}
            onChange={(e) => onUpdate({ 'schema:name': e.target.value })}
            className="mt-1 w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      <div>
        <label htmlFor={idUrl} className="block text-xs font-medium text-gray-600">Content URL / Path</label>
        <input
          id={idUrl}
          value={media['schema:contentUrl'] ?? ''}
          onChange={(e) => onUpdate({ 'schema:contentUrl': e.target.value })}
          className="mt-1 w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="text-right">
        <button type="button" onClick={onRemove} className="text-red-600 hover:underline text-xs">Remove Media</button>
      </div>
    </div>
  );
}


function EpisodeEditor({ 
  episode, 
  onUpdate, 
  onRemove 
}: { 
  episode: EpisodeState; 
  onUpdate: (patch: Partial<EpisodeState>) => void;
  onRemove: () => void;
}) {
  const idName = useId();
  const idNumber = useId();

  const addMedia = () => {
    const newMedia: MediaObjectState = {
      uiId: nanoid(6),
      '@type': 'schema:TextDigitalDocument',
      'schema:contentUrl': '',
      'schema:name': '',
    };
    const updatedParts = [...(episode['gh:hasPart'] ?? []), newMedia];
    onUpdate({ 'gh:hasPart': updatedParts });
  };

  const removeMedia = (mediaUiId: string) => {
    const updatedParts = (episode['gh:hasPart'] ?? []).filter(m => m.uiId !== mediaUiId);
    onUpdate({ 'gh:hasPart': updatedParts });
  };

  const updateMedia = (mediaUiId: string, patch: Partial<MediaObject>) => {
    const updatedParts = (episode['gh:hasPart'] ?? []).map(m =>
      m.uiId === mediaUiId ? { ...m, ...patch } : m
    );
    onUpdate({ 'gh:hasPart': updatedParts });
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr] gap-3 border border-gray-200 rounded-xl p-4 bg-white">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={idName} className="block text-[15px] leading-5 font-medium text-gray-900">Episode Title</label>
          <input id={idName} value={episode['schema:name'] ?? ''} onChange={ev=> onUpdate({'schema:name': ev.target.value})} className="mt-1 w-full h-11 rounded-xl border border-gray-300 bg-white px-4 text-[16px] leading-[44px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label htmlFor={idNumber} className="block text-[15px] leading-5 font-medium text-gray-900">Episode Number/ID</label>
          <input id={idNumber} value={episode['schema:episodeNumber'] ?? ''} onChange={ev=> onUpdate({'schema:episodeNumber': ev.target.value})} className="mt-1 w-full h-11 rounded-xl border border-gray-300 bg-white px-4 text-[16px] leading-[44px] text-gray-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      
      <div className="space-y-2 pt-2">
        <div className="flex justify-between items-center">
          <div className="block text-sm font-medium text-gray-700">Media Assets</div>
          <button type="button" onClick={addMedia} className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm">Add Media</button>
        </div>
        {(episode['gh:hasPart'] ?? []).map((media) => (
          <MediaObjectRow
            key={media.uiId}
            media={media}
            onUpdate={(patch) => updateMedia(media.uiId, patch)}
            onRemove={() => removeMedia(media.uiId)}
          />
        ))}
      </div>

      <div className="flex items-center justify-end pt-2">
        <button type="button" onClick={onRemove} className="text-red-600 hover:underline">Remove Episode</button>
      </div>
    </div>
  );
}

export default function EpisodesForm() {
  const [list, setList] = useState<EpisodeState[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEpisodes().then(eps => {
      if (eps && eps.length > 0) {
        const episodesWithUiId = (eps as LoadedEpisode[]).map(e => ({
          ...e,
          '@type': e['@type'] ?? 'gh:Episode', // Ensure @type exists
          uiId: nanoid(6),
          'gh:hasPart': (e['gh:hasPart'] ?? []).map(p => ({ ...p, uiId: nanoid(6) })),
        }));
        setList(episodesWithUiId);
      }
    }).catch(()=>{});
  }, []);

  const add = () => {
    const newEpisode: EpisodeState = {
      uiId: nanoid(6),
      '@id': `urn:gh:episode:${nanoid(8)}`,
      '@type': 'gh:Episode',
      'schema:name': '',
      'schema:episodeNumber': '',
      'gh:hasPart': [],
    };
    setList(prev => [...prev, newEpisode]);
  };
  
  const remove = (uiId: string) => setList(prev => prev.filter(e => e.uiId !== uiId));
  
  const update = (uiId: string, patch: Partial<EpisodeState>) => {
    setList(prev => prev.map(e => e.uiId === uiId ? { ...e, ...patch } : e));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSubmitting(true); setMessage(null); setErrors(null);
    
    // Strip frontend-only uiId before submitting
    const payload = list.map(ep => {
      // biome-ignore lint/correctness/noUnusedVariables: uiId is intentionally destructured to exclude it from the payload.
      const { uiId, ...rest } = ep;
      const parts = (rest['gh:hasPart'] ?? []).map(p => {
        // biome-ignore lint/correctness/noUnusedVariables: uiId is intentionally destructured to exclude it from the payload.
        const { uiId: mediaUiId, ...mediaRest } = p;
        return mediaRest;
      });
      return { ...rest, 'gh:hasPart': parts };
    });

    const res = await submitEpisodes(payload);
    if (res.ok) setMessage('Saved episodes successfully.');
    else setErrors(res.faults.map(f => `${f.path?.join('.') ?? 'error'}: ${f.message}`));
    setSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">Episodes</div>
        <button type="button" onClick={add} className="px-3 py-1.5 bg-gray-800 text-white rounded-md hover:bg-gray-900">Add Episode</button>
      </div>

      <div className="space-y-4">
        {list.map((e) => (
          <EpisodeEditor
            key={e.uiId} 
            episode={e}
            onUpdate={(patch) => update(e.uiId, patch)}
            onRemove={() => remove(e.uiId)}
          />)
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



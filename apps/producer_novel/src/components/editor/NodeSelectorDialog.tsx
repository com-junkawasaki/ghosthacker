/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/node-selector-dialog
 * 
 * ノード選択ダイアログ
 */
'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  GET_CHARACTERS,
  GET_GHOSTS,
  GET_LOCATIONS,
  GET_ORGANIZATIONS,
  GET_COMPANIES,
  GET_TECHNOLOGIES,
  GET_EPISODES,
  GET_SCENES,
  GET_ARCS,
  GET_MOTIFS,
  GET_SEASONS,
  GET_TIMELINES,
  GET_EVENTS,
} from '@/lib/graphql/queries';

interface NodeSelectorDialogProps {
  nodeType: string;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (node: Record<string, unknown>) => void;
}

const QUERY_MAP: Record<string, typeof GET_CHARACTERS> = {
  character: GET_CHARACTERS,
  ghost: GET_GHOSTS,
  location: GET_LOCATIONS,
  organization: GET_ORGANIZATIONS,
  company: GET_COMPANIES,
  technology: GET_TECHNOLOGIES,
  episode: GET_EPISODES,
  scene: GET_SCENES,
  arc: GET_ARCS,
  motif: GET_MOTIFS,
  season: GET_SEASONS,
  timeline: GET_TIMELINES,
  event: GET_EVENTS,
};

const DATA_KEY_MAP: Record<string, string> = {
  character: 'characters',
  ghost: 'ghosts',
  location: 'locations',
  organization: 'organizations',
  company: 'companies',
  technology: 'technologies',
  episode: 'episodes',
  scene: 'scenes',
  arc: 'arcs',
  motif: 'motifs',
  season: 'seasons',
  timeline: 'timelines',
  event: 'events',
};

export function NodeSelectorDialog({ nodeType, isOpen, onClose, onSelect }: NodeSelectorDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const query = QUERY_MAP[nodeType];
  const dataKey = DATA_KEY_MAP[nodeType];

  const { data, loading, error } = useQuery(query || GET_CHARACTERS, {
    skip: !isOpen || !query,
  });

  if (!isOpen) {
    return null;
  }

  const nodes = (dataKey ? (data?.[dataKey] as Array<Record<string, unknown>>) : []) || [];
  const filteredNodes = nodes.filter((node) => {
    const name = (node.name as string) || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Select {nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading && <div className="text-center py-4">Loading...</div>}
          {error && <div className="text-center py-4 text-red-500">Error: {error.message}</div>}
          {!loading && !error && filteredNodes.length === 0 && (
            <div className="text-center py-4 text-gray-500">No {nodeType}s found</div>
          )}
          {!loading && !error && filteredNodes.map((node, index) => {
            const description = typeof node.description === 'string' ? node.description : null;
            return (
              <div
                key={index}
                onClick={() => {
                  onSelect(node);
                  onClose();
                }}
                className="p-3 mb-2 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
              >
                <div className="font-semibold">{String(node.name || '')}</div>
                {description && (
                  <div className="text-sm text-gray-500 mt-1">{description}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


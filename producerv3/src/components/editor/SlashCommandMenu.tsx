/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/slash-command-menu
 * 
 * スラッシュコマンドメニューコンポーネント
 */
'use client';

import { useEffect, useState, useRef } from 'react';
import { useEditor } from '@tiptap/react';
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

interface MenuItem {
  title: string;
  command: () => void;
  type: string;
}

interface SlashCommandMenuProps {
  editor: ReturnType<typeof useEditor>;
  query: string;
  onSelect: (item: MenuItem) => void;
}

const COMMAND_TYPES = [
  { key: 'character', label: 'Character', query: GET_CHARACTERS },
  { key: 'ghost', label: 'Ghost', query: GET_GHOSTS },
  { key: 'location', label: 'Location', query: GET_LOCATIONS },
  { key: 'organization', label: 'Organization', query: GET_ORGANIZATIONS },
  { key: 'company', label: 'Company', query: GET_COMPANIES },
  { key: 'technology', label: 'Technology', query: GET_TECHNOLOGIES },
  { key: 'episode', label: 'Episode', query: GET_EPISODES },
  { key: 'scene', label: 'Scene', query: GET_SCENES },
  { key: 'arc', label: 'Arc', query: GET_ARCS },
  { key: 'motif', label: 'Motif', query: GET_MOTIFS },
  { key: 'season', label: 'Season', query: GET_SEASONS },
  { key: 'timeline', label: 'Timeline', query: GET_TIMELINES },
  { key: 'event', label: 'Event', query: GET_EVENTS },
] as const;

export function SlashCommandMenu({ editor, query, onSelect }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [items, setItems] = useState<MenuItem[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  // クエリに基づいてコマンドタイプを決定
  const commandType = COMMAND_TYPES.find((type) => type.key.startsWith(query.toLowerCase())) || COMMAND_TYPES[0];

  // GraphQLクエリを実行（簡略化版 - 実際には動的にクエリを選択）
  const { data, loading } = useQuery(commandType.query, {
    skip: !query || query.length < 2,
  });

  useEffect(() => {
    if (loading || !data) {
      return;
    }

    const dataKey = commandType.key + 's' as keyof typeof data;
    const nodes = data[dataKey] || [];

    const menuItems: MenuItem[] = nodes.map((node: Record<string, unknown>) => ({
      title: (node.name as string) || (node[`${commandType.key}Id`] as string) || 'Untitled',
      command: () => {
        const { from, to } = editor.state.selection;
        const range = { from: from - query.length - 1, to };

        // ノードを挿入
        editor.chain().focus().deleteRange(range).run();

        switch (commandType.key) {
          case 'character':
            editor.chain().insertCharacter({ characterId: node.id, name: node.name as string }).run();
            break;
          case 'ghost':
            editor.chain().insertGhost({ ghostId: node.id, name: node.name as string }).run();
            break;
          case 'location':
            editor.chain().insertLocation({ locationId: node.id, name: node.name as string }).run();
            break;
          case 'organization':
            editor.chain().insertOrganization({ organizationId: node.id, name: node.name as string }).run();
            break;
          case 'company':
            editor.chain().insertCompany({ companyId: node.id, name: node.name as string }).run();
            break;
          case 'technology':
            editor.chain().insertTechnology({ technologyId: node.id, name: node.name as string }).run();
            break;
          case 'episode':
            editor.chain().insertEpisode({ episodeId: node.id, name: node.name as string }).run();
            break;
          case 'scene':
            editor.chain().insertScene({ sceneId: node.id, name: node.name as string }).run();
            break;
          case 'arc':
            editor.chain().insertArc({ arcId: node.id, name: node.name as string }).run();
            break;
          case 'motif':
            editor.chain().insertMotif({ motifId: node.id, name: node.name as string }).run();
            break;
          case 'season':
            editor.chain().insertSeason({ seasonId: node.id, name: node.name as string }).run();
            break;
          case 'timeline':
            editor.chain().insertTimeline({ timelineId: node.id, name: node.name as string }).run();
            break;
          case 'event':
            editor.chain().insertEvent({ eventId: node.id, name: node.name as string }).run();
            break;
        }

        onSelect({ title: node.name as string, command: () => {}, type: commandType.key });
      },
      type: commandType.key,
    }));

    // クエリでフィルタリング
    const filteredItems = menuItems.filter((item) =>
      item.title.toLowerCase().includes(query.toLowerCase())
    );

    setItems(filteredItems.length > 0 ? filteredItems : menuItems);
    setSelectedIndex(0);
  }, [data, loading, query, commandType, editor, onSelect]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        if (items[selectedIndex]) {
          items[selectedIndex].command();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [items, selectedIndex]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="slash-command-menu absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto"
      style={{ top: '100%', left: 0 }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={`px-4 py-2 cursor-pointer ${
            index === selectedIndex ? 'bg-blue-100' : 'hover:bg-gray-100'
          }`}
          onClick={() => {
            item.command();
            onSelect(item);
          }}
        >
          <div className="font-semibold">{item.title}</div>
          <div className="text-sm text-gray-500">{item.type}</div>
        </div>
      ))}
    </div>
  );
}


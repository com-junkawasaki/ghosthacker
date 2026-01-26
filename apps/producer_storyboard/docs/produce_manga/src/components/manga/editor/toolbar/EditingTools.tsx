/**
 * @context https://gftd.ai/ontology/manga-editor#
 * @type cpm:Resource
 * @id https://gftd.ai/resource/editing-tools
 * 
 * Editing tools component
 */
'use client';

interface EditingToolsProps {
  selectedTool?: string;
  onToolSelect?: (tool: string) => void;
}

const tools = [
  { id: 'select', icon: '🖱', label: '選択' },
  { id: 'rect', icon: '□', label: '四角' },
  { id: 'pen', icon: '✏️', label: 'ペン' },
  { id: 'scissors', icon: '✂️', label: 'はさみ' },
  { id: 'person', icon: '👤', label: '人物' },
  { id: 'square', icon: '■', label: '四角形' },
  { id: 'text', icon: 'T', label: 'テキスト' },
];

export function EditingTools({ selectedTool, onToolSelect }: EditingToolsProps) {
  return (
    <div className="flex items-center gap-2">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolSelect?.(tool.id)}
          className={`w-10 h-10 flex items-center justify-center rounded hover:bg-gray-300 ${
            selectedTool === tool.id ? 'bg-primary-100 text-primary-600' : 'text-gray-700'
          }`}
          title={tool.label}
        >
          <span className="text-lg">{tool.icon}</span>
        </button>
      ))}
    </div>
  );
}


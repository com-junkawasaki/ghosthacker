/**
 * Graph Management Page
 * RDFグラフ管理ページ
 * 
 * @context {
 *   "@id": "ex:GraphManagementPage",
 *   "@type": "ex:Activity",
 *   "ex:provides": "ex:GraphManagementView"
 * }
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import GraphVisualization from './components/GraphVisualization';
import SemanticSearch from './components/SemanticSearch';
import RagChat from './components/RagChat';
import JsonLdEditor from './components/JsonLdEditor';
import QueryEditor from './components/QueryEditor';
import VectorSearch from './components/VectorSearch';
import ImportExport from './components/ImportExport';

interface GraphPageProps {
  params: { projectId: string };
}

type TabType = 'visualization' | 'search' | 'rag' | 'editor' | 'query' | 'vector' | 'import';

export default function GraphPage({ params }: GraphPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('visualization');

  const tabs = [
    { id: 'visualization' as TabType, label: 'Visualization', icon: '📊' },
    { id: 'search' as TabType, label: 'Semantic Search', icon: '🔍' },
    { id: 'rag' as TabType, label: 'Graph RAG', icon: '💬' },
    { id: 'editor' as TabType, label: 'JSON-LD Editor', icon: '✏️' },
    { id: 'query' as TabType, label: 'Query', icon: '🔎' },
    { id: 'vector' as TabType, label: 'Vector Search', icon: '🎯' },
    { id: 'import' as TabType, label: 'Import/Export', icon: '📥' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/projects/${params.projectId}`}
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4 inline-block"
        >
          ← Back to Project
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Graph Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage RDF graph data with Graph RAG and vector search
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {activeTab === 'visualization' && (
          <GraphVisualization projectId={params.projectId} />
        )}
        {activeTab === 'search' && (
          <SemanticSearch projectId={params.projectId} />
        )}
        {activeTab === 'rag' && (
          <RagChat projectId={params.projectId} />
        )}
        {activeTab === 'editor' && (
          <JsonLdEditor projectId={params.projectId} />
        )}
        {activeTab === 'query' && (
          <QueryEditor projectId={params.projectId} />
        )}
        {activeTab === 'vector' && (
          <VectorSearch projectId={params.projectId} />
        )}
        {activeTab === 'import' && (
          <ImportExport projectId={params.projectId} />
        )}
      </div>
    </div>
  );
}


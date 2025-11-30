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

import { useSearchParams } from 'next/navigation';
import GraphVisualization from './components/GraphVisualizationReactFlow';
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
  const searchParams = useSearchParams();
  const activeTab = (searchParams?.get('tab') as TabType) || 'visualization';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Graph Management
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage RDF graph data with Graph RAG and vector search
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
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
    </div>
  );
}


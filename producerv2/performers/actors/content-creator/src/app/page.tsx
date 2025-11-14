/**
 * AV-1: Overview and Summary Information
 * DoDAF All Viewpoint - プロジェクト全体の概要と要約情報を表示
 * 
 * @context {
 *   "@id": "ex:AV1Overview",
 *   "@type": "dodaf:Model",
 *   "dodaf:model": "AV-1"
 * }
 */

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface ProjectInfo {
  name: string;
  description: string;
  goal: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Capability {
  id: string;
  name: string;
  description: string;
}

interface Activity {
  id: string;
  name: string;
  description: string;
  usesCapability?: string;
  dependsOn: Array<{ '@id': string }>;
  produces: Array<{ '@id': string }>;
}

interface Performer {
  id: string;
  type: string;
  name: string;
}

export default function Home() {
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [performers, setPerformers] = useState<Performer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // PROJECT.jsonldを読み込む
        const projectRes = await fetch('/PROJECT.jsonld');
        const projectData = await projectRes.json();
        setProjectInfo({
          name: projectData.name,
          description: projectData.description,
          goal: projectData.goal,
          status: projectData.status,
          createdAt: projectData.createdAt,
          updatedAt: projectData.updatedAt,
        });

        // capabilities.jsonldを読み込む
        const capabilitiesRes = await fetch('/capabilities.jsonld');
        const capabilitiesData = await capabilitiesRes.json();
        setCapabilities(capabilitiesData['@graph'] || []);

        // activities.jsonldを読み込む
        const activitiesRes = await fetch('/activities.jsonld');
        const activitiesData = await activitiesRes.json();
        setActivities(activitiesData['@graph'] || []);

        // PROJECT.jsonldからperformersを取得
        setPerformers(projectData.performers || []);
      } catch (error) {
        console.error('Failed to load DoDAF data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-lg">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* AV-1 Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="border-b border-gray-200 pb-4 mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              AV-1: Overview and Summary Information
            </h1>
            <p className="text-sm text-gray-500 mt-1">DoDAF 2.0 All Viewpoint</p>
          </div>

          {/* プロジェクト概要 */}
          {projectInfo && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                プロジェクト概要
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div>
                  <span className="font-medium text-gray-700">名称:</span>{' '}
                  <span className="text-gray-900">{projectInfo.name}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">説明:</span>{' '}
                  <span className="text-gray-900">{projectInfo.description}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">目標:</span>{' '}
                  <span className="text-gray-900">{projectInfo.goal}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">ステータス:</span>{' '}
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                    {projectInfo.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  作成日: {new Date(projectInfo.createdAt).toLocaleDateString('ja-JP')} | 
                  更新日: {new Date(projectInfo.updatedAt).toLocaleDateString('ja-JP')}
                </div>
              </div>
            </div>
          )}

          {/* CV-2: 能力分類 */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              CV-2: Capability Taxonomy (能力分類)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {capabilities.map((capability) => (
                <div
                  key={capability.id}
                  className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                >
                  <h3 className="font-semibold text-blue-900 mb-2">
                    {capability.name}
                  </h3>
                  <p className="text-sm text-blue-700">{capability.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* OV-5b: 運用活動モデル */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              OV-5b: Operational Activity Model (運用活動モデル)
            </h2>
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div
                  key={activity.id}
                  className="bg-green-50 border border-green-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900 mb-1">
                        {index + 1}. {activity.name}
                      </h3>
                      <p className="text-sm text-green-700 mb-2">
                        {activity.description}
                      </p>
                      {activity.usesCapability && (
                        <div className="text-xs text-green-600">
                          使用能力: {activity.usesCapability}
                        </div>
                      )}
                    </div>
                  </div>
                  {activity.dependsOn && activity.dependsOn.length > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      依存: {activity.dependsOn.map((d) => d['@id']).join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SV-1: システム構成 */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              SV-1: Systems Interface Description (システム構成)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {performers
                .filter((p) => p.type === 'ex:System')
                .map((performer) => (
                  <div
                    key={performer.id}
                    className="bg-purple-50 border border-purple-200 rounded-lg p-4"
                  >
                    <h3 className="font-semibold text-purple-900">
                      {performer.name}
                    </h3>
                  </div>
                ))}
            </div>
          </div>

          {/* SvcV-1: サービス構成 */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              SvcV-1: Services Context Description (サービス構成)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {performers
                .filter((p) => p.type === 'ex:Service')
                .map((performer) => (
                  <div
                    key={performer.id}
                    className="bg-orange-50 border border-orange-200 rounded-lg p-4"
                  >
                    <h3 className="font-semibold text-orange-900">
                      {performer.name}
                    </h3>
                  </div>
                ))}
            </div>
          </div>

          {/* DIV-1: 概念データモデル */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              DIV-1: Conceptual Data Model (概念データモデル)
            </h2>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <p className="text-indigo-900">
                TerminusDBベースのOWL/RDFデータモデル
              </p>
              <ul className="list-disc list-inside mt-2 text-sm text-indigo-700 space-y-1">
                <li>Story, Script, EPUBDocument, KindleDocument</li>
                <li>Chapter, Section, Paragraph, TextNode</li>
                <li>Metadata (Dublin Core), Style</li>
              </ul>
            </div>
          </div>

          {/* StdV-1: 標準プロファイル */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">
              StdV-1: Standards Profile (標準プロファイル)
            </h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <ul className="list-disc list-inside text-yellow-900 space-y-1">
                <li>RDF 1.2, RDFS, OWL 2</li>
                <li>JSON-LD 1.1</li>
                <li>GraphQL</li>
                <li>DoDAF 2.0</li>
                <li>Dublin Core Metadata</li>
                <li>EPUB 3.x, Kindle Format</li>
              </ul>
            </div>
          </div>

          {/* ナビゲーション */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              プロジェクト
            </h2>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/projects/default"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                プロジェクトを開く
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

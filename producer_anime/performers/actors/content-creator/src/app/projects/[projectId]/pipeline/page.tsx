/**
 * パイプライン実行・監視画面
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { graphqlRequest } from '@/internal/graphql/client';
import { GetStoryDocument, GetStoryQuery, CreateScriptDocument, CreateScriptMutation } from '@/generated/graphql';

type PipelineStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
type PipelineStep = 'ingest_story' | 'generate_script' | 'generate_image' | 'generate_audio' | 'compose_video' | 'upload_youtube';

interface PipelineContext {
  storyId: string;
  scriptId?: string;
  imageAssetId?: string;
  audioAssetId?: string;
  videoAssetId?: string;
  youtubePublicationId?: string;
  status: PipelineStatus;
  currentStep: PipelineStep;
  error?: string;
}

export default function PipelineMonitorPage({ params }: { params: { projectId: string } }) {
  const searchParams = useSearchParams();
  const storyId = searchParams.get('storyId') ?? '';

  const [context, setContext] = useState<PipelineContext | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubeDescription, setYoutubeDescription] = useState('');

  const executePipeline = async () => {
    if (!storyId) {
      alert('Story ID is required');
      return;
    }

    setIsRunning(true);
    setContext({
      storyId,
      status: 'running',
      currentStep: 'ingest_story',
    });

    try {
      // Step 1: Storyを取得
      const storyResult = await graphqlRequest<GetStoryQuery>(GetStoryDocument, {
        variables: { id: storyId },
      });

      if (!storyResult.story) {
        throw new Error('Story not found');
      }

      setContext((prev) => ({
        ...(prev ?? { storyId, status: 'running', currentStep: 'ingest_story' }),
        currentStep: 'generate_script',
      }));

      // Step 2: Scriptを生成（仮実装 - 実際のLLM処理は後で実装）
      const scriptText = `Script generated from story: ${storyResult.story.title}\n\n${storyResult.story.content.substring(0, 500)}...`;

      const scriptResult = await graphqlRequest<CreateScriptMutation>(CreateScriptDocument, {
        variables: {
          scriptText,
          derivedFromStory: storyId,
          status: 'draft',
        },
      });

      if (!scriptResult.createScript) {
        throw new Error('Failed to create script');
      }

      setContext((prev) => ({
        ...(prev ?? { storyId, status: 'running', currentStep: 'generate_script' }),
        scriptId: scriptResult.createScript.id,
        currentStep: 'generate_image',
        status: 'completed', // 仮実装のため、ここで完了とする
      }));
    } catch (error) {
      setContext((prev) => ({
        ...(prev ?? { storyId, status: 'failed', currentStep: 'ingest_story' }),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    } finally {
      setIsRunning(false);
    }
  };

  const stepLabels: Record<PipelineStep, string> = {
    ingest_story: 'Story Ingestion',
    generate_script: 'Script Generation',
    generate_image: 'Image Generation',
    generate_audio: 'Audio Generation',
    compose_video: 'Video Composition',
    upload_youtube: 'YouTube Upload',
  };

  const getStepStatus = (step: PipelineStep): 'pending' | 'active' | 'completed' | 'failed' => {
    if (!context) return 'pending';

    const stepOrder: PipelineStep[] = [
      'ingest_story',
      'generate_script',
      'generate_image',
      'generate_audio',
      'compose_video',
      'upload_youtube',
    ];

    const currentIndex = stepOrder.indexOf(context.currentStep);
    const stepIndex = stepOrder.indexOf(step);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) {
      if (context.status === 'failed') return 'failed';
      return 'active';
    }
    return 'pending';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Pipeline Monitor</h1>

      {!storyId && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Story ID is required. Please go back to the story input page.
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">YouTube Settings (Optional)</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="youtubeTitle" className="block text-sm font-medium mb-2">
              YouTube Title
            </label>
            <input
              type="text"
              id="youtubeTitle"
              value={youtubeTitle}
              onChange={(e) => setYoutubeTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter YouTube video title"
            />
          </div>
          <div>
            <label htmlFor="youtubeDescription" className="block text-sm font-medium mb-2">
              YouTube Description
            </label>
            <textarea
              id="youtubeDescription"
              value={youtubeDescription}
              onChange={(e) => setYoutubeDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter YouTube video description"
            />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <button
          onClick={executePipeline}
          disabled={isRunning || !storyId}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Running...' : 'Execute Pipeline'}
        </button>
      </div>

      {context && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Pipeline Status</h2>
          <div className="bg-gray-100 p-4 rounded-md">
            <div className="mb-2">
              <span className="font-medium">Status: </span>
              <span className={`font-bold ${
                context.status === 'completed' ? 'text-green-600' :
                context.status === 'failed' ? 'text-red-600' :
                'text-blue-600'
              }`}>
                {context.status.toUpperCase()}
              </span>
            </div>
            {context.error && (
              <div className="text-red-600 mb-2">Error: {context.error}</div>
            )}
          </div>

          <div className="space-y-2">
            {Object.entries(stepLabels).map(([step, label]) => {
              const status = getStepStatus(step as PipelineStep);
              return (
                <div
                  key={step}
                  className={`p-4 border rounded-md ${
                    status === 'completed' ? 'bg-green-50 border-green-200' :
                    status === 'active' ? 'bg-blue-50 border-blue-200' :
                    status === 'failed' ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{label}</span>
                    <span className={`text-sm ${
                      status === 'completed' ? 'text-green-600' :
                      status === 'active' ? 'text-blue-600' :
                      status === 'failed' ? 'text-red-600' :
                      'text-gray-500'
                    }`}>
                      {status === 'completed' ? '✓ Completed' :
                       status === 'active' ? '→ Running' :
                       status === 'failed' ? '✗ Failed' :
                       '○ Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {context.status === 'completed' && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Generated Assets</h3>
              <div className="space-y-2">
                {context.scriptId && (
                  <div>Script ID: {context.scriptId}</div>
                )}
                {context.imageAssetId && (
                  <div>Image Asset ID: {context.imageAssetId}</div>
                )}
                {context.audioAssetId && (
                  <div>Audio Asset ID: {context.audioAssetId}</div>
                )}
                {context.videoAssetId && (
                  <div>Video Asset ID: {context.videoAssetId}</div>
                )}
                {context.youtubePublicationId && (
                  <div>YouTube Publication ID: {context.youtubePublicationId}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <Link
          href={`/projects/${params.projectId}/story`}
          className="text-blue-600 hover:underline"
        >
          ← Back to Story Input
        </Link>
      </div>
    </div>
  );
}


/**
 * パイプライン実行API
 */

import { NextResponse } from 'next/server';
import { PipelineEngine } from '@/internal/pipeline/engine';
import type { PipelineConfig } from '@/internal/pipeline/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      story,
      youtubeTitle,
      youtubeDescription,
      config,
    }: {
      story: { title: string; content: string };
      youtubeTitle?: string;
      youtubeDescription?: string;
      config?: PipelineConfig;
    } = body;

    if (!story || !story.title || !story.content) {
      return NextResponse.json(
        { error: 'Story title and content are required' },
        { status: 400 }
      );
    }

    const engine = new PipelineEngine(config);
    const context = await engine.executePipeline(story, youtubeTitle, youtubeDescription);

    return NextResponse.json({ success: true, context });
  } catch (error) {
    console.error('Pipeline execution error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute pipeline' },
      { status: 500 }
    );
  }
}


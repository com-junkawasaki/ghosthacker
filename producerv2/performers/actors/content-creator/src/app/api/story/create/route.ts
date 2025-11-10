/**
 * Story作成API
 */

import { NextResponse } from 'next/server';
import { createStory } from '@/internal/terminusdb/crud';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, story }: { projectId: string; story: { title: string; content: string } } = body;

    if (!story || !story.title || !story.content) {
      return NextResponse.json(
        { error: 'Story title and content are required' },
        { status: 400 }
      );
    }

    const storyDoc = await createStory({
      '@type': 'ex:Story',
      'ex:title': story.title,
      'ex:content': story.content,
    });

    return NextResponse.json({ success: true, storyId: storyDoc['@id'] });
  } catch (error) {
    console.error('Story creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create story' },
      { status: 500 }
    );
  }
}


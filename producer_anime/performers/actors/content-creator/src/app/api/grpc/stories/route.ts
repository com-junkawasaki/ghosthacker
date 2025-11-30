/**
 * Stories gRPC API Route
 * Next.js API route for story operations via gRPC
 */

import { NextRequest, NextResponse } from 'next/server';
import { StoryServiceClient } from '@/internal/grpc/generated/producer.grpc-client';
import * as grpc from '@grpc/grpc-js';
import type {
  CreateStoryRequest,
  CreateStoryResponse,
} from '@/internal/grpc/generated/producer';

const GRPC_API_URL =
  process.env.GRPC_API_URL || 
  (process.env.NEXT_PUBLIC_GRPC_API_URL?.replace('http://', '').replace('https://', '') || 'localhost:50051');

function getClient(): StoryServiceClient {
  const credentials = grpc.credentials.createInsecure();
  return new StoryServiceClient(GRPC_API_URL, credentials);
}

function convertTimestamp(ts: any): string {
  if (!ts) return new Date().toISOString();
  return new Date(
    Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1000000)
  ).toISOString();
}

// Create story
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const client = getClient();
    const req = { title, content };

    return new Promise<NextResponse>((resolve) => {
      client.createStory(req, (err: grpc.ServiceError | null, response?: CreateStoryResponse) => {
        if (err) {
          console.error('gRPC error:', err);
          resolve(
            NextResponse.json(
              { error: err.message || 'Failed to create story' },
              { status: 500 }
            )
          );
          return;
        }

        if (!response || !response.story) {
          resolve(
            NextResponse.json(
              { error: 'No story returned from gRPC service' },
              { status: 500 }
            )
          );
          return;
        }

        const story = {
          id: response.story.id,
          title: response.story.title,
          content: response.story.content,
          createdAt: convertTimestamp(response.story.created_at),
          updatedAt: convertTimestamp(response.story.updated_at),
        };

        resolve(NextResponse.json({ story }, { status: 201 }));
      });
    });
  } catch (error) {
    console.error('Error in POST /api/grpc/stories:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


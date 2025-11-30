/**
 * Story gRPC API Route (by ID)
 * Next.js API route for individual story operations via gRPC
 */

import { NextRequest, NextResponse } from 'next/server';
import { StoryServiceClient } from '@/internal/grpc/generated/producer.grpc-client';
import * as grpc from '@grpc/grpc-js';
import type {
  GetStoryRequest,
  GetStoryResponse,
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

// Get story
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = getClient();
    const req = { id: params.id };

    return new Promise<NextResponse>((resolve) => {
      client.getStory(req, (err: grpc.ServiceError | null, response?: GetStoryResponse) => {
        if (err) {
          console.error('gRPC error:', err);
          resolve(
            NextResponse.json(
              { error: err.message || 'Failed to get story' },
              { status: 500 }
            )
          );
          return;
        }

        if (!response || !response.story) {
          resolve(
            NextResponse.json(
              { error: 'Story not found' },
              { status: 404 }
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

        resolve(NextResponse.json({ story }));
      });
    });
  } catch (error) {
    console.error('Error in GET /api/grpc/stories/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


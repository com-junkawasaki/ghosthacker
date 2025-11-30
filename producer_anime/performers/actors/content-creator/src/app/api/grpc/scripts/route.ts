/**
 * Scripts gRPC API Route
 * Next.js API route for script operations via gRPC
 */

import { NextRequest, NextResponse } from 'next/server';
import { ScriptServiceClient } from '@/internal/grpc/generated/producer.grpc-client';
import * as grpc from '@grpc/grpc-js';
import type {
  CreateScriptRequest,
  CreateScriptResponse,
} from '@/internal/grpc/generated/producer';

const GRPC_API_URL =
  process.env.GRPC_API_URL || 
  (process.env.NEXT_PUBLIC_GRPC_API_URL?.replace('http://', '').replace('https://', '') || 'localhost:50051');

function getClient(): ScriptServiceClient {
  const credentials = grpc.credentials.createInsecure();
  return new ScriptServiceClient(GRPC_API_URL, credentials);
}

function convertTimestamp(ts: any): string {
  if (!ts) return new Date().toISOString();
  return new Date(
    Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1000000)
  ).toISOString();
}

// Create script
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { script_text, derived_from_story, status } = body;

    if (!script_text || !derived_from_story) {
      return NextResponse.json(
        { error: 'script_text and derived_from_story are required' },
        { status: 400 }
      );
    }

    const client = getClient();
    const req = {
      script_text,
      derived_from_story,
      status: status || 'draft',
    };

    return new Promise<NextResponse>((resolve) => {
      client.createScript(req, (err: grpc.ServiceError | null, response?: CreateScriptResponse) => {
        if (err) {
          console.error('gRPC error:', err);
          resolve(
            NextResponse.json(
              { error: err.message || 'Failed to create script' },
              { status: 500 }
            )
          );
          return;
        }

        if (!response || !response.script) {
          resolve(
            NextResponse.json(
              { error: 'No script returned from gRPC service' },
              { status: 500 }
            )
          );
          return;
        }

        const script = {
          id: response.script.id,
          script_text: response.script.script_text,
          derived_from_story: response.script.derived_from_story,
          status: response.script.status,
          createdAt: convertTimestamp(response.script.created_at),
          updatedAt: convertTimestamp(response.script.updated_at),
        };

        resolve(NextResponse.json({ script }, { status: 201 }));
      });
    });
  } catch (error) {
    console.error('Error in POST /api/grpc/scripts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


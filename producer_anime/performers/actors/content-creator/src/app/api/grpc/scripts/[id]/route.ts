/**
 * Script gRPC API Route (by ID)
 * Next.js API route for individual script operations via gRPC
 */

import { NextRequest, NextResponse } from 'next/server';
import { ScriptServiceClient } from '@/internal/grpc/generated/producer.grpc-client';
import * as grpc from '@grpc/grpc-js';
import type {
  GetScriptRequest,
  GetScriptResponse,
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

// Get script
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = getClient();
    const req = { id: params.id };

    return new Promise<NextResponse>((resolve) => {
      client.getScript(req, (err: grpc.ServiceError | null, response?: GetScriptResponse) => {
        if (err) {
          console.error('gRPC error:', err);
          resolve(
            NextResponse.json(
              { error: err.message || 'Failed to get script' },
              { status: 500 }
            )
          );
          return;
        }

        if (!response || !response.script) {
          resolve(
            NextResponse.json(
              { error: 'Script not found' },
              { status: 404 }
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

        resolve(NextResponse.json({ script }));
      });
    });
  } catch (error) {
    console.error('Error in GET /api/grpc/scripts/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


/**
 * EPUB Documents gRPC API Route
 * Next.js API route for EPUB document operations via gRPC
 */

import { NextRequest, NextResponse } from 'next/server';
import { DocumentServiceClient } from '@/internal/grpc/generated/producer.grpc-client';
import * as grpc from '@grpc/grpc-js';
import type {
  CreateEPUBDocumentRequest,
  CreateEPUBDocumentResponse,
  UpdateEPUBDocumentRequest,
  UpdateEPUBDocumentResponse,
} from '@/internal/grpc/generated/producer';

const GRPC_API_URL =
  process.env.GRPC_API_URL || 
  (process.env.NEXT_PUBLIC_GRPC_API_URL?.replace('http://', '').replace('https://', '') || 'localhost:50051');

function getClient(): DocumentServiceClient {
  const credentials = grpc.credentials.createInsecure();
  return new DocumentServiceClient(GRPC_API_URL, credentials);
}

function convertTimestamp(ts: any): string {
  if (!ts) return new Date().toISOString();
  return new Date(
    Number(ts.seconds) * 1000 + Math.floor(ts.nanos / 1000000)
  ).toISOString();
}

// Create EPUB document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, metadata_id, tiptap_content } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const client = getClient();
    const req: CreateEPUBDocumentRequest = {
      title,
      metadataId: metadata_id,
      tiptapContent: tiptap_content ? JSON.stringify(tiptap_content) : undefined,
    };

    return new Promise<NextResponse>((resolve) => {
      client.createEPUBDocument(req, (err: grpc.ServiceError | null, response?: CreateEPUBDocumentResponse) => {
        if (err) {
          console.error('gRPC error:', err);
          resolve(
            NextResponse.json(
              { error: err.message || 'Failed to create EPUB document' },
              { status: 500 }
            )
          );
          return;
        }

        if (!response || !response.document) {
          resolve(
            NextResponse.json(
              { error: 'No document returned from gRPC service' },
              { status: 500 }
            )
          );
          return;
        }

        const document = {
          id: response.document.id,
          title: response.document.title,
          metadata_id: response.document.metadataId,
          tiptap_content: response.document.tiptapContent,
          createdAt: convertTimestamp(response.document.createdAt),
          updatedAt: convertTimestamp(response.document.updatedAt),
        };

        resolve(NextResponse.json({ epubDocument: document }, { status: 201 }));
      });
    });
  } catch (error) {
    console.error('Error in POST /api/grpc/epub:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


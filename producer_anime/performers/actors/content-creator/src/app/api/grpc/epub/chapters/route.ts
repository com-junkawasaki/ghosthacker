/**
 * Chapters gRPC API Route
 * Next.js API route for chapter operations via gRPC
 */

import { NextRequest, NextResponse } from 'next/server';
import { DocumentServiceClient } from '@/internal/grpc/generated/producer.grpc-client';
import * as grpc from '@grpc/grpc-js';
import type {
  GetChaptersRequest,
  GetChaptersResponse,
  CreateChapterRequest,
  CreateChapterResponse,
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

// Get chapters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('document_id');
    const isEpub = searchParams.get('is_epub') === 'true';

    if (!documentId) {
      return NextResponse.json(
        { error: 'document_id is required' },
        { status: 400 }
      );
    }

    const client = getClient();
    const req: GetChaptersRequest = {
      documentId,
      isEpub,
    };

    return new Promise<NextResponse>((resolve) => {
      client.getChapters(req, (err: grpc.ServiceError | null, response?: GetChaptersResponse) => {
        if (err) {
          console.error('gRPC error:', err);
          resolve(
            NextResponse.json(
              { error: err.message || 'Failed to get chapters' },
              { status: 500 }
            )
          );
          return;
        }

        if (!response) {
          resolve(
            NextResponse.json(
              { error: 'No response from gRPC service' },
              { status: 500 }
            )
          );
          return;
        }

        const chapters = (response.chapters || []).map((c) => ({
          id: c.id,
          epub_document_id: c.epubDocumentId,
          kindle_document_id: c.kindleDocumentId,
          title: c.title,
          order: c.order,
          createdAt: convertTimestamp(c.createdAt),
          updatedAt: convertTimestamp(c.updatedAt),
        }));

        resolve(NextResponse.json({ chapters }));
      });
    });
  } catch (error) {
    console.error('Error in GET /api/grpc/epub/chapters:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Create chapter
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { epub_document_id, kindle_document_id, title, order } = body;

    if (!title || order === undefined) {
      return NextResponse.json(
        { error: 'Title and order are required' },
        { status: 400 }
      );
    }

    const client = getClient();
    const req: CreateChapterRequest = {
      epubDocumentId: epub_document_id,
      kindleDocumentId: kindle_document_id,
      title,
      order,
    };

    return new Promise<NextResponse>((resolve) => {
      client.createChapter(req, (err: grpc.ServiceError | null, response?: CreateChapterResponse) => {
        if (err) {
          console.error('gRPC error:', err);
          resolve(
            NextResponse.json(
              { error: err.message || 'Failed to create chapter' },
              { status: 500 }
            )
          );
          return;
        }

        if (!response || !response.chapter) {
          resolve(
            NextResponse.json(
              { error: 'No chapter returned from gRPC service' },
              { status: 500 }
            )
          );
          return;
        }

        const chapter = {
          id: response.chapter.id,
          epub_document_id: response.chapter.epubDocumentId,
          kindle_document_id: response.chapter.kindleDocumentId,
          title: response.chapter.title,
          order: response.chapter.order,
          createdAt: convertTimestamp(response.chapter.createdAt),
          updatedAt: convertTimestamp(response.chapter.updatedAt),
        };

        resolve(NextResponse.json({ chapter }, { status: 201 }));
      });
    });
  } catch (error) {
    console.error('Error in POST /api/grpc/epub/chapters:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


/**
 * Project gRPC API Route (by ID)
 * Next.js API route for individual project operations via gRPC
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProjectServiceClient } from '@/internal/grpc/generated/producer.grpc-client';
import * as grpc from '@grpc/grpc-js';
import type {
  GetProjectRequest,
  GetProjectResponse,
  UpdateProjectRequest,
  UpdateProjectResponse,
  DeleteProjectRequest,
  DeleteProjectResponse,
} from '@/internal/grpc/generated/producer';

const GRPC_API_URL =
  process.env.GRPC_API_URL || 
  (process.env.NEXT_PUBLIC_GRPC_API_URL?.replace('http://', '').replace('https://', '') || 'localhost:50051');

function getClient(): ProjectServiceClient {
  const credentials = grpc.credentials.createInsecure();
  return new ProjectServiceClient(GRPC_API_URL, credentials);
}

function convertProject(p: any) {
  return {
    id: p.id,
    name: p.name,
    author: p.author,
    description: p.description,
    status: p.status,
    createdAt: p.createdAt
      ? new Date(
          Number(p.createdAt.seconds) * 1000 +
            Math.floor(p.createdAt.nanos / 1000000)
        ).toISOString()
      : new Date().toISOString(),
    updatedAt: p.updatedAt
      ? new Date(
          Number(p.updatedAt.seconds) * 1000 +
            Math.floor(p.updatedAt.nanos / 1000000)
        ).toISOString()
      : new Date().toISOString(),
  };
}

// Get project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = getClient();
    const req: GetProjectRequest = { id: params.id };

    return new Promise<NextResponse>((resolve, reject) => {
      client.getProject(req, (err, response) => {
        if (err) {
          console.error('gRPC error:', err);
          resolve(
            NextResponse.json(
              { error: err.message || 'Failed to get project' },
              { status: 500 }
            )
          );
          return;
        }

        if (!response || !response.project) {
          resolve(
            NextResponse.json(
              { error: 'Project not found' },
              { status: 404 }
            )
          );
          return;
        }

        resolve(NextResponse.json({ project: convertProject(response.project) }));
      });
    });
  } catch (error) {
    console.error('Error in GET /api/grpc/projects/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Update project
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, status } = body;

    const client = getClient();
    const req: UpdateProjectRequest = {
      id: params.id,
      name,
      description,
      status,
    };

    return new Promise<NextResponse>((resolve, reject) => {
      client.updateProject(req, (err, response) => {
        if (err) {
          console.error('gRPC error:', err);
          resolve(
            NextResponse.json(
              { error: err.message || 'Failed to update project' },
              { status: 500 }
            )
          );
          return;
        }

        if (!response || !response.project) {
          resolve(
            NextResponse.json(
              { error: 'No project returned from gRPC service' },
              { status: 500 }
            )
          );
          return;
        }

        resolve(NextResponse.json({ project: convertProject(response.project) }));
      });
    });
  } catch (error) {
    console.error('Error in PUT /api/grpc/projects/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = getClient();
    const req: DeleteProjectRequest = { id: params.id };

    return new Promise<NextResponse>((resolve, reject) => {
      client.deleteProject(req, (err, response) => {
        if (err) {
          console.error('gRPC error:', err);
          resolve(
            NextResponse.json(
              { error: err.message || 'Failed to delete project' },
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

        resolve(NextResponse.json({ success: response.success }));
      });
    });
  } catch (error) {
    console.error('Error in DELETE /api/grpc/projects/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


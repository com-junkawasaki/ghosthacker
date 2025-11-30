/**
 * Projects gRPC API Route
 * Next.js API route for project operations via gRPC
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProjectServiceClient } from '@/internal/grpc/generated/producer.grpc-client';
import * as grpc from '@grpc/grpc-js';
import type {
  ListProjectsRequest,
  ListProjectsResponse,
  CreateProjectRequest,
  CreateProjectResponse,
} from '@/internal/grpc/generated/producer';

const GRPC_API_URL =
  process.env.GRPC_API_URL || 
  (process.env.NEXT_PUBLIC_GRPC_API_URL?.replace('http://', '').replace('https://', '') || 'localhost:50051');

function getClient(): ProjectServiceClient {
  const credentials = grpc.credentials.createInsecure();
  return new ProjectServiceClient(GRPC_API_URL, credentials);
}

// List projects
export async function GET(request: NextRequest) {
  try {
    const client = getClient();
    const req: ListProjectsRequest = {};

    return new Promise<NextResponse>((resolve, reject) => {
      client.listProjects(req, (err, response) => {
        if (err) {
          console.error('gRPC error:', err);
          resolve(
            NextResponse.json(
              { error: err.message || 'Failed to list projects' },
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

        // Convert protobuf Timestamp to ISO string
        const projects = response.projects.map((p) => ({
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
        }));

        resolve(NextResponse.json({ projects }));
      });
    });
  } catch (error) {
    console.error('Error in GET /api/grpc/projects:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Create project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    const client = getClient();
    const req: CreateProjectRequest = {
      name,
      description,
    };

    return new Promise<NextResponse>((resolve, reject) => {
      client.createProject(req, (err, response) => {
        if (err) {
          console.error('gRPC error:', err);
          resolve(
            NextResponse.json(
              { error: err.message || 'Failed to create project' },
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

        const project = {
          id: response.project.id,
          name: response.project.name,
          author: response.project.author,
          description: response.project.description,
          status: response.project.status,
          createdAt: response.project.createdAt
            ? new Date(
                Number(response.project.createdAt.seconds) * 1000 +
                  Math.floor(response.project.createdAt.nanos / 1000000)
              ).toISOString()
            : new Date().toISOString(),
          updatedAt: response.project.updatedAt
            ? new Date(
                Number(response.project.updatedAt.seconds) * 1000 +
                  Math.floor(response.project.updatedAt.nanos / 1000000)
              ).toISOString()
            : new Date().toISOString(),
        };

        resolve(NextResponse.json({ project }, { status: 201 }));
      });
    });
  } catch (error) {
    console.error('Error in POST /api/grpc/projects:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


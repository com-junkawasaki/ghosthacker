/**
 * MSW Server Setup
 * GraphQL API のモックサーバー
 */

import { setupServer } from 'msw/node';
import { graphql } from 'msw';

export const server = setupServer(
  // GraphQL エンドポイントのモック
  graphql.query('GetStories', (req, res, ctx) => {
    return res(
      ctx.data({
        stories: [
          {
            id: 'Story_1',
            title: 'Test Story 1',
            content: 'Content 1',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z',
          },
        ],
      })
    );
  }),

  graphql.query('GetStory', (req, res, ctx) => {
    return res(
      ctx.data({
        story: {
          id: req.variables.id,
          title: 'Test Story',
          content: 'Test Content',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
      })
    );
  }),

  graphql.mutation('CreateStory', (req, res, ctx) => {
    return res(
      ctx.data({
        createStory: {
          id: 'Story_new',
          title: req.variables.title,
          content: req.variables.content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      })
    );
  }),

  graphql.mutation('CreateProject', (req, res, ctx) => {
    return res(
      ctx.data({
        createProject: {
          id: 'Project_new',
          name: req.variables.name,
          description: req.variables.description || null,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      })
    );
  })
);


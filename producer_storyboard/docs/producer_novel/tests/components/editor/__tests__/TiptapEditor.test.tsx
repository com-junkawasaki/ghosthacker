/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/test-tiptap-editor
 * 
 * Tests for TiptapEditor component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import { GET_CHAPTER } from '@/lib/graphql/queries';

const mocks = [
  {
    request: {
      query: GET_CHAPTER,
      variables: { id: 'test-chapter-id' },
    },
    result: {
      data: {
        chapter: {
          __typename: 'Chapter',
          id: 'test-chapter-id',
          title: 'Test Chapter',
          order: 1,
          content_html: '<p>Test content</p>',
          paragraphs: [],
          media: [],
        },
      },
    },
  },
];

describe('TiptapEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(
      <MockedProvider mocks={[]}>
        <TiptapEditor projectId="test-project" chapterId="test-chapter-id" />
      </MockedProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders editor when chapter data is loaded', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <TiptapEditor projectId="test-project" chapterId="test-chapter-id" />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  it('renders toolbar buttons', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <TiptapEditor projectId="test-project" chapterId="test-chapter-id" />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Bold')).toBeInTheDocument();
      expect(screen.getByText('Italic')).toBeInTheDocument();
      expect(screen.getByText('H1')).toBeInTheDocument();
      expect(screen.getByText('H2')).toBeInTheDocument();
    });
  });

  it('handles missing chapterId gracefully', () => {
    render(
      <MockedProvider mocks={[]}>
        <TiptapEditor projectId="test-project" />
      </MockedProvider>
    );

    // Should not crash when chapterId is not provided
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});


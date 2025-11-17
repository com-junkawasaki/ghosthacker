/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/test-chapter-tree
 * 
 * Tests for ChapterTree component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { ChapterTree } from '../ChapterTree';
import { GET_CHAPTERS } from '../../../lib/graphql/queries';

const mocks = [
  {
    request: {
      query: GET_CHAPTERS,
      variables: { epubId: 'test-epub-id' },
    },
    result: {
      data: {
        chapters: [
          { __typename: 'Chapter', id: 'chapter-1', title: 'Chapter 1', order: 1, content_html: '' },
          { __typename: 'Chapter', id: 'chapter-2', title: 'Chapter 2', order: 2, content_html: '' },
        ],
      },
    },
  },
];

describe('ChapterTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(
      <MockedProvider mocks={[]}>
        <ChapterTree epubId="test-epub-id" />
      </MockedProvider>
    );

    expect(screen.getByText('Loading chapters...')).toBeInTheDocument();
  });

  it('renders chapters when data is loaded', async () => {
    render(
      <MockedProvider mocks={mocks}>
        <ChapterTree epubId="test-epub-id" />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Chapters')).toBeInTheDocument();
      expect(screen.getByText('1. Chapter 1')).toBeInTheDocument();
      expect(screen.getByText('2. Chapter 2')).toBeInTheDocument();
    });
  });

  it('handles empty chapters list', async () => {
    const emptyMocks = [
      {
        request: {
          query: GET_CHAPTERS,
          variables: { epubId: 'test-epub-id' },
        },
        result: {
          data: {
            chapters: [],
          },
        },
      },
    ];

    render(
      <MockedProvider mocks={emptyMocks}>
        <ChapterTree epubId="test-epub-id" />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Chapters')).toBeInTheDocument();
    });
  });

  it('calls onChapterSelect when chapter is clicked', async () => {
    const onChapterSelect = vi.fn();

    render(
      <MockedProvider mocks={mocks}>
        <ChapterTree epubId="test-epub-id" onChapterSelect={onChapterSelect} />
      </MockedProvider>
    );

    await waitFor(() => {
      const chapter1 = screen.getByText('1. Chapter 1');
      chapter1.click();
      expect(onChapterSelect).toHaveBeenCalledWith('chapter-1');
    });
  });
});


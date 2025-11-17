/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/manage-metadata
 * 
 * Metadata form component for editing EPUB metadata
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_EPUB } from '@/lib/graphql/queries';
import { UPDATE_METADATA } from '@/lib/graphql/mutations';

interface MetadataFormProps {
  epubId: string;
}

export function MetadataForm({ epubId }: MetadataFormProps) {
  const { data } = useQuery(GET_EPUB, {
    variables: { id: epubId },
  });

  const [updateMetadata] = useMutation(UPDATE_METADATA);
  const [title, setTitle] = useState(data?.epub?.title || '');
  const [author, setAuthor] = useState(
    data?.epub?.metadata?.find((m: { key: string }) => m.key === 'author')?.value || ''
  );
  const [isbn, setIsbn] = useState(
    data?.epub?.metadata?.find((m: { key: string }) => m.key === 'isbn')?.value || ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (author) {
      await updateMetadata({
        variables: {
          input: {
            epubId: epubId,
            key: 'author',
            value: author,
          },
        },
      });
    }
    if (isbn) {
      await updateMetadata({
        variables: {
          input: {
            epubId: epubId,
            key: 'isbn',
            value: isbn,
          },
        },
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="metadata-form mb-4">
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Title:</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-1 border border-gray-300 rounded"
        />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">Author:</label>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="w-full p-1 border border-gray-300 rounded"
        />
      </div>
      <div className="mb-2">
        <label className="block text-sm font-medium mb-1">ISBN:</label>
        <input
          type="text"
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          className="w-full p-1 border border-gray-300 rounded"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Save Metadata
      </button>
    </form>
  );
}


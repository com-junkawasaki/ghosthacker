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
            epub_id: epubId,
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
            epub_id: epubId,
            key: 'isbn',
            value: isbn,
          },
        },
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="metadata-form">
      <div>
        <label>Title:</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label>Author:</label>
        <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} />
      </div>
      <div>
        <label>ISBN:</label>
        <input type="text" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
      </div>
      <button type="submit">Save Metadata</button>
    </form>
  );
}


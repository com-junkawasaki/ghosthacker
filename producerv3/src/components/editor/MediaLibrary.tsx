/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/manage-media
 * 
 * Media library component for managing EPUB media assets
 */
'use client';

import { useMutation } from '@apollo/client';
import { CREATE_MEDIA } from '@/lib/graphql/mutations';
import { useState } from 'react';

interface MediaLibraryProps {
  chapterId: string;
}

export function MediaLibrary({ chapterId }: MediaLibraryProps) {
  const [createMedia] = useMutation(CREATE_MEDIA);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // TODO: Upload file to storage service and get URL
      const url = URL.createObjectURL(file);
      
      await createMedia({
        variables: {
          input: {
            chapter_id: chapterId,
            type: 'image',
            url,
            mime_type: file.type,
            file_size: file.size,
          },
        },
      });
    } catch (error) {
      console.error('Error uploading media:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="media-library">
      <h3>Media Library</h3>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        disabled={uploading}
      />
      {uploading && <div>Uploading...</div>}
    </div>
  );
}


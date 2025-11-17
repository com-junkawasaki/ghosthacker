/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/import-epub-content
 * 
 * EPUB import functionality - imports EPUB content from JSON
 */
import { ApolloClient } from '@apollo/client';
import { CREATE_CHAPTER, UPDATE_CHAPTER, UPDATE_EPUB } from '@/lib/graphql/mutations';
import { normalizeProjectId } from '@/lib/utils/uuid';
import type { ExportFile, ExportChapter, TiptapJSON } from '@/types/export';
import type {
  CreateChapterMutation,
  CreateChapterMutationVariables,
  UpdateChapterMutation,
  UpdateChapterMutationVariables,
  UpdateEpubMutation,
  UpdateEpubMutationVariables,
} from '@/generated/graphql';
import { generateHTML } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import Code from '@tiptap/extension-code';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Blockquote from '@tiptap/extension-blockquote';
import HardBreak from '@tiptap/extension-hard-break';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { CharacterNode } from '@/components/editor/extensions/CharacterNode';
import { GhostNode } from '@/components/editor/extensions/GhostNode';
import { LocationNode } from '@/components/editor/extensions/LocationNode';
import { OrganizationNode } from '@/components/editor/extensions/OrganizationNode';
import { TechnologyNode } from '@/components/editor/extensions/TechnologyNode';
import { ChapterLinkNode } from '@/components/editor/extensions/ChapterLinkNode';
import {
  EpisodeNode,
  SceneNode,
  ArcNode,
  MotifNode,
  SeasonNode,
  TimelineNode,
} from '@/components/editor/extensions/StoryNode';
import {
  SourceRefNode,
  EventNode,
  OccupationNode,
  SettingNode,
} from '@/components/editor/extensions/MetaNode';
import { MaskExtension } from '@/components/editor/extensions/MaskExtension';
import { EmotionAnalysisExtension } from '@/components/editor/extensions/EmotionAnalysisExtension';

/**
 * Tiptap extensions used for converting JSON to HTML
 */
const extensions = [
  Document.configure({
    content: 'block+',
  }),
  Paragraph,
  Text,
  Heading.configure({
    levels: [1, 2, 3, 4, 5, 6],
  }),
  Bold,
  Italic,
  Strike,
  Code,
  BulletList,
  OrderedList,
  ListItem,
  Blockquote,
  HardBreak,
  Image.configure({
    inline: true,
    allowBase64: true,
  }),
  Link.configure({
    openOnClick: false,
  }),
  CharacterNode,
  GhostNode,
  LocationNode,
  OrganizationNode,
  TechnologyNode,
  ChapterLinkNode,
  EpisodeNode,
  SceneNode,
  ArcNode,
  MotifNode,
  SeasonNode,
  TimelineNode,
  SourceRefNode,
  EventNode,
  OccupationNode,
  SettingNode,
  MaskExtension,
  EmotionAnalysisExtension,
];

/**
 * Convert Tiptap JSON to HTML
 */
function jsonToHtml(json: TiptapJSON): string {
  try {
    return generateHTML(json, extensions);
  } catch (error) {
    console.error('Error converting JSON to HTML:', error);
    throw new Error('Failed to convert JSON content to HTML');
  }
}

/**
 * Validate export file structure
 */
function validateExportFile(data: unknown): data is ExportFile {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const file = data as Partial<ExportFile>;

  if (
    typeof file.version !== 'string' ||
    typeof file.exportedAt !== 'string' ||
    !file.epub
  ) {
    return false;
  }

  const epub = file.epub as Partial<ExportFile['epub']>;

  if (
    typeof epub.id !== 'string' ||
    typeof epub.title !== 'string' ||
    typeof epub.language !== 'string' ||
    !Array.isArray(epub.chapters) ||
    !Array.isArray(epub.metadata)
  ) {
    return false;
  }

  // Validate chapters
  for (const chapter of epub.chapters) {
    if (
      typeof chapter.id !== 'string' ||
      typeof chapter.title !== 'string' ||
      typeof chapter.order !== 'number' ||
      !chapter.contentJson
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Read and parse JSON file
 */
export async function readExportFile(file: File): Promise<ExportFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') {
          reject(new Error('Failed to read file'));
          return;
        }

        const data = JSON.parse(text);

        if (!validateExportFile(data)) {
          reject(new Error('Invalid export file format'));
          return;
        }

        resolve(data);
      } catch (error) {
        reject(new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Import EPUB content from JSON file
 */
export async function importEpub(
  client: ApolloClient<unknown>,
  epubId: string,
  exportFile: ExportFile
): Promise<void> {
  try {
    const { epub } = exportFile;
    const normalizedEpubId = normalizeProjectId(epubId);

    // Update EPUB metadata
    if (epub.metadata.length > 0) {
      await client.mutate<UpdateEpubMutation, UpdateEpubMutationVariables>({
        mutation: UPDATE_EPUB,
        variables: {
          input: {
            id: normalizedEpubId,
            title: epub.title,
            language: epub.language,
          },
        },
      });
    }

    // Import chapters
    // Sort by order to maintain sequence
    const sortedChapters = [...epub.chapters].sort((a, b) => a.order - b.order);

    for (const exportChapter of sortedChapters) {
      // Convert JSON to HTML
      const contentHtml = jsonToHtml(exportChapter.contentJson);

      try {
        // Try to update existing chapter first
        await client.mutate<UpdateChapterMutation, UpdateChapterMutationVariables>({
          mutation: UPDATE_CHAPTER,
          variables: {
            input: {
              id: exportChapter.id,
              title: exportChapter.title,
              order: exportChapter.order,
              contentHtml,
            },
          },
        });
      } catch (updateError) {
        // If update fails, try to create new chapter
        // Note: This assumes the chapter doesn't exist
        // In a real scenario, you might want to check if chapter exists first
        try {
          await client.mutate<CreateChapterMutation, CreateChapterMutationVariables>({
            mutation: CREATE_CHAPTER,
            variables: {
              input: {
                epubId: normalizedEpubId,
                title: exportChapter.title,
                order: exportChapter.order,
                contentHtml,
              },
            },
          });
        } catch (createError) {
          console.error(`Failed to import chapter ${exportChapter.title}:`, createError);
          // Continue with next chapter instead of failing completely
        }
      }
    }
  } catch (error) {
    console.error('Import error:', error);
    throw error;
  }
}


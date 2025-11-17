/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/export-epub-content
 * 
 * EPUB export functionality - exports EPUB content as JSON
 */
import { ApolloClient } from '@apollo/client';
import { GET_EPUB } from '@/lib/graphql/queries';
import type { ExportFile, ExportEpub, ExportChapter, TiptapJSON } from '@/types/export';
import type { GetEpubQuery, GetEpubQueryVariables } from '@/generated/graphql';
import { generateHTML, generateJSON } from '@tiptap/core';
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
 * Tiptap extensions used for parsing HTML to JSON
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
 * Convert HTML content to Tiptap JSON format
 */
function htmlToJson(html: string): TiptapJSON {
  try {
    const json = generateJSON(html, extensions);
    return json as TiptapJSON;
  } catch (error) {
    console.error('Error converting HTML to JSON:', error);
    // Fallback to minimal structure if conversion fails
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: html.replace(/<[^>]*>/g, ''), // Strip HTML tags as fallback
            },
          ],
        },
      ],
    };
  }
}

/**
 * Export EPUB content as JSON file
 */
export async function exportEpub(
  client: ApolloClient<unknown>,
  epubId: string
): Promise<void> {
  try {
    // Fetch EPUB data
    const { data, error } = await client.query<GetEpubQuery, GetEpubQueryVariables>({
      query: GET_EPUB,
      variables: { id: epubId },
      fetchPolicy: 'network-only', // Always fetch fresh data
    });

    if (error) {
      throw new Error(`Failed to fetch EPUB: ${error.message}`);
    }

    if (!data?.epub) {
      throw new Error('EPUB not found');
    }

    const epub = data.epub;

    // Convert chapters to export format
    const exportChapters: ExportChapter[] = epub.chapters
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
        contentJson: htmlToJson(chapter.contentHtml),
        media: chapter.media.map((media) => ({
          id: media.id,
          type: media.type,
          url: media.url,
          mimeType: media.mimeType,
          fileSize: media.fileSize,
        })),
      }));

    // Build export structure
    const exportData: ExportFile = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      epub: {
        id: epub.id,
        title: epub.title,
        language: epub.language,
        metadata: epub.metadata.map((meta) => ({
          key: meta.key,
          value: meta.value,
        })),
        chapters: exportChapters,
      },
    };

    // Create JSON blob and download
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${epub.title.replace(/[^a-z0-9]/gi, '_')}_export_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export error:', error);
    throw error;
  }
}


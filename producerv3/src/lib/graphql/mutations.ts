/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/manage-chapters
 * 
 * GraphQL mutations for EPUB operations
 */
import gql from 'graphql-tag';

export const CREATE_EPUB = gql`
  mutation CreateEpub($input: CreateEpubInput!) {
    createEpub(input: $input) {
      id
      title
      language
      created_at
      updated_at
    }
  }
`;

export const UPDATE_EPUB = gql`
  mutation UpdateEpub($input: UpdateEpubInput!) {
    updateEpub(input: $input) {
      id
      title
      language
      updated_at
    }
  }
`;

export const DELETE_EPUB = gql`
  mutation DeleteEpub($id: ID!) {
    deleteEpub(id: $id)
  }
`;

export const CREATE_CHAPTER = gql`
  mutation CreateChapter($input: CreateChapterInput!) {
    createChapter(input: $input) {
      id
      title
      order
      content_html
    }
  }
`;

export const UPDATE_CHAPTER = gql`
  mutation UpdateChapter($input: UpdateChapterInput!) {
    updateChapter(input: $input) {
      id
      title
      order
      content_html
    }
  }
`;

export const DELETE_CHAPTER = gql`
  mutation DeleteChapter($id: ID!) {
    deleteChapter(id: $id)
  }
`;

export const CREATE_MEDIA = gql`
  mutation CreateMedia($input: CreateMediaInput!) {
    createMedia(input: $input) {
      id
      type
      url
      mime_type
      file_size
    }
  }
`;

export const UPDATE_METADATA = gql`
  mutation UpdateMetadata($input: UpdateMetadataInput!) {
    updateMetadata(input: $input) {
      key
      value
    }
  }
`;


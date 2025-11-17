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
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_EPUB = gql`
  mutation UpdateEpub($input: UpdateEpubInput!) {
    updateEpub(input: $input) {
      id
      title
      language
      updatedAt
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
      contentHtml
    }
  }
`;

export const UPDATE_CHAPTER = gql`
  mutation UpdateChapter($input: UpdateChapterInput!) {
    updateChapter(input: $input) {
      id
      title
      order
      contentHtml
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
      mimeType
      fileSize
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

export const GENERATE_TEXT = gql`
  mutation GenerateText($input: GenerateTextInput!) {
    generateText(input: $input) {
      text
      confidence
    }
  }
`;

export const SUMMARIZE_CHAPTER = gql`
  mutation SummarizeChapter($input: SummarizeInput!) {
    summarizeChapter(input: $input) {
      text
      confidence
    }
  }
`;

export const PROOFREAD_CHAPTER = gql`
  mutation ProofreadChapter($input: ProofreadInput!) {
    proofreadChapter(input: $input) {
      text
      confidence
    }
  }
`;

export const TRANSLATE_CHAPTER = gql`
  mutation TranslateChapter($input: TranslateInput!) {
    translateChapter(input: $input) {
      text
      confidence
    }
  }
`;

export const ANALYZE_EMOTIONS = gql`
  mutation AnalyzeEmotions($input: AnalyzeEmotionsInput!) {
    analyzeEmotions(input: $input) {
      emotionVector {
        emotion
        score
      }
      createdAt
      language
    }
  }
`;


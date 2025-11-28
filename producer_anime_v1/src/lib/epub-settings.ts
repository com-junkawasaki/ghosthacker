/**
 * ePub設定管理ユーティリティ
 * 
 * 型定義とCSS変換関数を提供
 * 
 * ⚠️ File I/O operations are handled via Server Actions (see editor/epub/actions.ts).
 * This module only provides type definitions and utility functions that can be used on both client and server.
 * 
 * @context https://ghosthacker.gftd.co.jp/ontology#
 */

export interface JsonLdDocument {
  '@context'?: Record<string, unknown>;
  '@id'?: string;
  '@type'?: string;
  [key: string]: unknown;
}

export interface EpubEditorSettings extends JsonLdDocument {
  '@id': string;
  '@type': 'gh:EpubEditorSettings';
  'gh:fontFamily': 'serif' | 'sans-serif' | 'monospace';
  'gh:fontSize': string;
  'gh:lineHeight'?: number;
  'gh:letterSpacing'?: string;
  'gh:pageWidth'?: string;
  'gh:pageHeight'?: string;
  'gh:margin'?: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  'gh:textColor'?: string;
  'gh:backgroundColor'?: string;
  'gh:linkColor'?: string;
}

export interface EpubDocument extends JsonLdDocument {
  '@id': string;
  '@type': 'gh:EpubDocument';
  'schema:title': string;
  'gh:hasChapter'?: Array<{ '@id': string }>;
}

const DEFAULT_SETTINGS: EpubEditorSettings = {
  '@context': {
    '@base': 'https://ghosthacker.gftd.co.jp/',
    '@vocab': 'https://ghosthacker.gftd.co.jp/ontology#',
    'gh': 'https://ghosthacker.gftd.co.jp/ontology#',
    'schema': 'http://schema.org/',
  },
  '@id': 'epub:editor-settings-default',
  '@type': 'gh:EpubEditorSettings',
  'gh:fontFamily': 'serif',
  'gh:fontSize': '16px',
  'gh:lineHeight': 1.6,
  'gh:letterSpacing': '0.05em',
  'gh:pageWidth': '800px',
  'gh:pageHeight': '1200px',
  'gh:margin': {
    top: '40px',
    right: '40px',
    bottom: '40px',
    left: '40px',
  },
  'gh:textColor': '#333333',
  'gh:backgroundColor': '#FFFFFF',
  'gh:linkColor': '#0066cc',
};

/**
 * デフォルト設定を取得
 * 
 * クライアント側で使用する場合は、この関数を使用してデフォルト値を取得できます。
 * ファイルから読み込む場合は、Server Actions (loadEpubSettingsAction) を使用してください。
 */
export function getDefaultEpubSettings(): EpubEditorSettings {
  return DEFAULT_SETTINGS;
}

/**
 * @deprecated Use loadEpubSettingsAction from '@/app/(producer)/editor/epub/actions' instead.
 * File I/O operations should be handled via Server Actions.
 */
export function loadEpubSettings(filename: string = 'epub-settings.jsonld'): EpubEditorSettings {
  console.warn('loadEpubSettings is deprecated. Use loadEpubSettingsAction from editor/epub/actions.ts instead.');
  return DEFAULT_SETTINGS;
}

/**
 * @deprecated Use saveEpubSettingsAction from '@/app/(producer)/editor/epub/actions' instead.
 * File I/O operations should be handled via Server Actions.
 */
export function saveEpubSettings(
  settings: EpubEditorSettings,
  filename: string = 'epub-settings.jsonld'
): void {
  console.warn('saveEpubSettings is deprecated. Use saveEpubSettingsAction from editor/epub/actions.ts instead.');
}

/**
 * ePub設定をCSSに変換
 */
export function settingsToCss(settings: EpubEditorSettings): string {
  const {
    'gh:fontFamily': fontFamily,
    'gh:fontSize': fontSize,
    'gh:lineHeight': lineHeight,
    'gh:letterSpacing': letterSpacing,
    'gh:textColor': textColor,
    'gh:backgroundColor': backgroundColor,
    'gh:linkColor': linkColor,
    'gh:margin': margin,
  } = settings;

  return `
    body {
      font-family: ${fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif' : fontFamily === 'sans-serif' ? 'Arial, sans-serif' : 'monospace'};
      font-size: ${fontSize};
      line-height: ${lineHeight || 1.6};
      letter-spacing: ${letterSpacing || '0.05em'};
      color: ${textColor || '#333333'};
      background-color: ${backgroundColor || '#FFFFFF'};
      margin: ${margin?.top || '40px'} ${margin?.right || '40px'} ${margin?.bottom || '40px'} ${margin?.left || '40px'};
    }
    a {
      color: ${linkColor || '#0066cc'};
    }
    h1, h2, h3, h4, h5, h6 {
      font-family: ${fontFamily === 'serif' ? 'Georgia, serif' : fontFamily === 'sans-serif' ? 'Arial, sans-serif' : 'monospace'};
    }
  `.trim();
}

/**
 * @deprecated Use loadEpubDocumentAction from '@/app/(producer)/editor/epub/actions' instead.
 * File I/O operations should be handled via Server Actions.
 */
export function loadEpubDocument(filename: string = 'epub-document.jsonld'): EpubDocument | null {
  console.warn('loadEpubDocument is deprecated. Use loadEpubDocumentAction from editor/epub/actions.ts instead.');
  return null;
}

/**
 * @deprecated Use saveEpubDocumentAction from '@/app/(producer)/editor/epub/actions' instead.
 * File I/O operations should be handled via Server Actions.
 */
export function saveEpubDocument(
  document: EpubDocument,
  filename: string = 'epub-document.jsonld'
): void {
  console.warn('saveEpubDocument is deprecated. Use saveEpubDocumentAction from editor/epub/actions.ts instead.');
}


/**
 * ePub設定管理ユーティリティ
 * 
 * JSON-LDファイルへの保存・読み込み
 * SHACL検証統合
 * 
 * @context https://ghosthacker.gftd.co.jp/ontology#
 */
// Note: jsonld-storage uses node:fs, so we use localStorage for client-side
// For server-side, use API routes or server actions

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
 * ePub設定を読み込む（クライアント側: localStorage使用）
 */
export function loadEpubSettings(filename: string = 'epub-settings.jsonld'): EpubEditorSettings {
  if (typeof window === 'undefined') {
    // Server-side: return default
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(`epub-settings:${filename}`);
    if (stored) {
      return JSON.parse(stored) as EpubEditorSettings;
    }
  } catch (error) {
    console.error('Failed to load ePub settings from localStorage:', error);
  }

  return DEFAULT_SETTINGS;
}

/**
 * ePub設定を保存する（クライアント側: localStorage使用）
 */
export function saveEpubSettings(
  settings: EpubEditorSettings,
  filename: string = 'epub-settings.jsonld'
): void {
  if (typeof window === 'undefined') {
    // Server-side: no-op
    return;
  }

  try {
    localStorage.setItem(`epub-settings:${filename}`, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save ePub settings to localStorage:', error);
  }
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
 * ePubドキュメントを読み込む（クライアント側: localStorage使用）
 */
export function loadEpubDocument(filename: string = 'epub-document.jsonld'): EpubDocument | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(`epub-document:${filename}`);
    if (stored) {
      return JSON.parse(stored) as EpubDocument;
    }
  } catch (error) {
    console.error('Failed to load ePub document from localStorage:', error);
  }

  return null;
}

/**
 * ePubドキュメントを保存する（クライアント側: localStorage使用）
 */
export function saveEpubDocument(
  document: EpubDocument,
  filename: string = 'epub-document.jsonld'
): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(`epub-document:${filename}`, JSON.stringify(document));
  } catch (error) {
    console.error('Failed to save ePub document to localStorage:', error);
  }
}


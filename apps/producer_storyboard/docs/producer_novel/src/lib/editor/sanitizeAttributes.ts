/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/sanitize-attributes
 * 
 * Tiptapノードのattributesを型安全にサニタイズするユーティリティ
 * renderSpecは配列やオブジェクトを受け付けないため、プリミティブ型のみ許可
 */
import { match } from 'ts-pattern';

/**
 * Tiptapノードのattributesとして許可される型（union型）
 * renderSpecは配列やオブジェクトを受け付けないため、プリミティブ型のみ許可
 */
export type TiptapAttributeValue = string | number | boolean | null | undefined;

/**
 * ts-patternを使用して型安全にattributesをサニタイズする関数
 * ビルド時に型チェック可能で、実行時に配列やオブジェクトを適切に変換
 * 
 * @param value - ノードの属性値（unknown型で受け取り、型ガードで絞り込む）
 * @returns TiptapAttributeValue - サニタイズされた値
 */
export function sanitizeAttributeValue(value: unknown): TiptapAttributeValue {
  return match(value)
    .with(null, undefined, (v) => v)
    .when(
      (v): v is string => typeof v === 'string',
      (v) => v
    )
    .when(
      (v): v is number => typeof v === 'number',
      (v) => v
    )
    .when(
      (v): v is boolean => typeof v === 'boolean',
      (v) => v
    )
    .when(
      (v): v is string[] => Array.isArray(v) && v.length > 0 && typeof v[0] === 'string',
      (v) => v.join(', ')
    )
    .when(
      (v): v is Array<{ '@id': string }> => 
        Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null && '@id' in v[0],
      (v) => v[0]?.['@id'] ?? undefined
    )
    .when(
      (v): v is { '@id': string } => 
        typeof v === 'object' && v !== null && '@id' in v && typeof (v as { '@id': unknown })['@id'] === 'string',
      (v) => v['@id']
    )
    .when(
      (v): v is unknown[] => Array.isArray(v),
      () => undefined // 空配列や未知の配列型は無視
    )
    .otherwise(() => undefined); // その他の型は無視
}

/**
 * ノードのattributesをTiptap用にサニタイズする関数
 * ビルド時に型チェック可能で、配列やオブジェクトを適切に変換
 * 
 * @param attributes - ノードのattributes（Partial<T>型）
 * @returns Record<string, TiptapAttributeValue> - サニタイズされたattributes
 */
export function sanitizeNodeAttributes<T extends Record<string, unknown>>(
  attributes: Partial<T>
): Record<string, TiptapAttributeValue> {
  const sanitized: Record<string, TiptapAttributeValue> = {};
  
  for (const [key, value] of Object.entries(attributes)) {
    const sanitizedValue = sanitizeAttributeValue(value);
    if (sanitizedValue !== undefined) {
      sanitized[key] = sanitizedValue;
    }
  }
  
  return sanitized;
}


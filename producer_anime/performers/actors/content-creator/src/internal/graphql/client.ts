/**
 * GraphQL Client
 * 
 * @context {
 *   "@id": "ex:GraphQLClient",
 *   "@type": "ex:Service",
 *   "ex:provides": "ex:GraphQLAPI"
 * }
 */

import { GraphQLClient } from 'graphql-request';
import { TypedDocumentNode } from '@graphql-typed-document-node/core';

const GRAPHQL_API_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_API_URL ||
  process.env.GRAPHQL_API_URL ||
  'http://localhost:8080/graphql';

// GraphQLクライアントインスタンス
let client: GraphQLClient | null = null;

function getClient(): GraphQLClient {
  if (!client) {
    client = new GraphQLClient(GRAPHQL_API_URL, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  return client;
}

export interface GraphQLRequestOptions {
  variables?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/**
 * GraphQLリクエストを実行
 * 
 * @context {
 *   "@id": "ex:graphqlRequest",
 *   "@type": "ex:Activity",
 *   "ex:consumes": "ex:GraphQLDocument",
 *   "ex:produces": "ex:GraphQLResult"
 * }
 */
export async function graphqlRequest<TResult>(
  document: TypedDocumentNode<TResult, any>,
  options?: { variables?: Record<string, unknown> | undefined; headers?: Record<string, string> | undefined }
): Promise<TResult> {
  const { variables, headers = {} } = options || {};
  const gqlClient = getClient();

  // カスタムヘッダーがある場合は一時的に設定
  if (Object.keys(headers).length > 0) {
    Object.entries(headers).forEach(([key, value]) => {
      gqlClient.setHeader(key, value);
    });
  }

  try {
    const result = await gqlClient.request<TResult>(document, variables);
    return result;
  } finally {
    // カスタムヘッダーをクリア
    if (Object.keys(headers).length > 0) {
      Object.keys(headers).forEach((key) => {
        gqlClient.setHeader(key, '');
      });
    }
  }
}

/**
 * 文字列クエリを実行（動的クエリ用）
 */
export async function graphqlRequestString<TResult = any>(
  query: string,
  variables?: Record<string, unknown>
): Promise<TResult> {
  const gqlClient = getClient();
  return gqlClient.request<TResult>(query, variables);
}


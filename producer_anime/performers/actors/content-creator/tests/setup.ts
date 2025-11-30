/**
 * Vitest Setup
 * テスト環境のセットアップ
 */

import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

// MSW サーバーのセットアップ（ブラウザ環境でも動作するように）
if (typeof window !== 'undefined') {
  // ブラウザ環境
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
} else {
  // Node環境
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}

// 環境変数の設定
if (typeof process !== 'undefined') {
  process.env.NEXT_PUBLIC_GRAPHQL_API_URL = 'http://localhost:8080/graphql';
  process.env.GRAPHQL_API_URL = 'http://localhost:8080/graphql';
}

// ブラウザ環境でのグローバル設定
if (typeof window !== 'undefined') {
  // ブラウザ環境でのDOMテスト用の設定
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}


/**
 * Vitest Setup
 * テスト環境のセットアップ
 */

import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

// MSW サーバーのセットアップ
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// 環境変数の設定
process.env.NEXT_PUBLIC_GRAPHQL_API_URL = 'http://localhost:8080/graphql';
process.env.GRAPHQL_API_URL = 'http://localhost:8080/graphql';


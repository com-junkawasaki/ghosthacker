/**
 * Test setup file
 * Configures testing environment
 */
import { vi } from 'vitest';

// Mock $app/environment
vi.mock('$app/environment', () => ({
	browser: false,
}));

// Mock Houdini client for component tests
vi.mock('$houdini', () => {
	const mockClient = {
		url: 'http://localhost:25325/graphql',
		fetchParams: vi.fn(({ session }) => ({
			headers: {
				'Content-Type': 'application/json',
			},
		})),
		fetch: vi.fn(),
	};

	return {
		HoudiniClient: vi.fn().mockImplementation((config) => {
			mockClient.url = config.url;
			mockClient.fetchParams = config.fetchParams || mockClient.fetchParams;
			return mockClient;
		}),
		setClient: vi.fn(),
		query: vi.fn(() => ({
			subscribe: vi.fn((callback: any) => {
				callback({ data: null, loading: false, error: null });
				return () => {};
			}),
		})),
		mutation: vi.fn(() => ({
			mutate: vi.fn(),
			fetching: false,
		})),
		setEnvironment: vi.fn(),
		ListProjectsStore: vi.fn(() => ({
			loading: false,
			fetching: false,
			error: null,
			data: null,
			fetch: vi.fn(),
			subscribe: vi.fn((callback: any) => {
				callback({ loading: false, fetching: false, error: null, data: null });
				return () => {};
			}),
		})),
	};
});


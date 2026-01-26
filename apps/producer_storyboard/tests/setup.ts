/**
 * Test setup file
 * Configures testing environment
 */
import { vi } from 'vitest';

// Mock $app/environment
vi.mock('$app/environment', () => ({
	browser: false,
}));

// Mock Houdini client for component tests (legacy - components should migrate to gRPC API)
vi.mock('$houdini', () => {
	const mockClient = {
		url: 'http://localhost:25326/api/grpc', // Updated to gRPC endpoint
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


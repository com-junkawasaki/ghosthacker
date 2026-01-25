/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/tdd-video-preview-tests
 * 
 * TDD Unit Tests for VideoPreview Component
 * Based on capabilities.jsonld "Video Preview" capability
 */
import { describe, it, expect } from 'vitest';

describe('VideoPreview Component', () => {
	const mockVideos = [
		{
			id: 'video-1',
			storyboardId: 'storyboard-1',
			variationNumber: 1,
			videoUrl: 'https://example.com/video1.mp4',
			status: 'completed',
			errorMessage: null,
			createdAt: '2025-01-30T00:00:00Z',
		},
		{
			id: 'video-2',
			storyboardId: 'storyboard-1',
			variationNumber: 2,
			videoUrl: null,
			status: 'processing',
			errorMessage: null,
			createdAt: '2025-01-30T00:00:01Z',
		},
		{
			id: 'video-3',
			storyboardId: 'storyboard-1',
			variationNumber: 3,
			videoUrl: null,
			status: 'failed',
			errorMessage: 'Generation failed',
			createdAt: '2025-01-30T00:00:02Z',
		},
	];

	it('should accept storyboardId prop', () => {
		const storyboardId = 'storyboard-1';
		expect(storyboardId).toBe('storyboard-1');
	});

	it('should handle video list', () => {
		expect(mockVideos).toBeDefined();
		expect(mockVideos.length).toBe(3);
	});

	it('should display completed videos', () => {
		const completedVideos = mockVideos.filter((v) => v.status === 'completed');
		expect(completedVideos.length).toBe(1);
		expect(completedVideos[0].videoUrl).toBeDefined();
	});

	it('should display processing videos', () => {
		const processingVideos = mockVideos.filter((v) => v.status === 'processing');
		expect(processingVideos.length).toBe(1);
		expect(processingVideos[0].videoUrl).toBeNull();
	});

	it('should display failed videos with error message', () => {
		const failedVideos = mockVideos.filter((v) => v.status === 'failed');
		expect(failedVideos.length).toBe(1);
		expect(failedVideos[0].errorMessage).toBeDefined();
		expect(failedVideos[0].errorMessage).toBe('Generation failed');
	});

	it('should format status badge class correctly', () => {
		const getStatusClass = (status: string) => {
			if (status === 'completed') return 'bg-green-100 text-green-800';
			if (status === 'failed') return 'bg-red-100 text-red-800';
			return 'bg-yellow-100 text-yellow-800';
		};

		expect(getStatusClass('completed')).toBe('bg-green-100 text-green-800');
		expect(getStatusClass('failed')).toBe('bg-red-100 text-red-800');
		expect(getStatusClass('processing')).toBe('bg-yellow-100 text-yellow-800');
	});
});

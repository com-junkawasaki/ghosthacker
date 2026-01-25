/**
 * @context https://gftd.ai/ontology/storyboard-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/tdd-format-utils-tests
 * 
 * TDD Unit Tests for Format Utilities
 */
import { describe, it, expect } from 'vitest';
import {
	formatDuration,
	formatTime,
	parseAspectRatio,
	parseResolution,
	validateProjectData,
} from '$lib/utils/format';

describe('Format Utilities', () => {
	describe('formatDuration', () => {
		it('should format seconds less than 60', () => {
			expect(formatDuration(0)).toBe('0.0s');
			expect(formatDuration(30.5)).toBe('30.5s');
			expect(formatDuration(59.9)).toBe('59.9s');
		});

		it('should format minutes and seconds', () => {
			expect(formatDuration(60)).toBe('1m 0.0s');
			expect(formatDuration(90)).toBe('1m 30.0s');
			expect(formatDuration(125.5)).toBe('2m 5.5s');
		});

		it('should handle large durations', () => {
			expect(formatDuration(3661)).toBe('61m 1.0s');
		});
	});

	describe('formatTime', () => {
		it('should format time without hours', () => {
			expect(formatTime(0)).toBe('0:00');
			expect(formatTime(30)).toBe('0:30');
			expect(formatTime(90)).toBe('1:30');
			expect(formatTime(3599)).toBe('59:59');
		});

		it('should format time with hours', () => {
			expect(formatTime(3600)).toBe('1:00:00');
			expect(formatTime(3661)).toBe('1:01:01');
			expect(formatTime(7323)).toBe('2:02:03');
		});

		it('should pad minutes and seconds', () => {
			expect(formatTime(65)).toBe('1:05');
			expect(formatTime(3665)).toBe('1:01:05');
		});
	});

	describe('parseAspectRatio', () => {
		it('should parse valid aspect ratios', () => {
			expect(parseAspectRatio('16:9')).toEqual({ width: 16, height: 9 });
			expect(parseAspectRatio('4:3')).toEqual({ width: 4, height: 3 });
			expect(parseAspectRatio('1:1')).toEqual({ width: 1, height: 1 });
		});

		it('should return null for invalid formats', () => {
			expect(parseAspectRatio('16x9')).toBeNull();
			expect(parseAspectRatio('invalid')).toBeNull();
			expect(parseAspectRatio('')).toBeNull();
			expect(parseAspectRatio('16:')).toBeNull();
		});
	});

	describe('parseResolution', () => {
		it('should parse valid resolutions', () => {
			expect(parseResolution('1920x1080')).toEqual({ width: 1920, height: 1080 });
			expect(parseResolution('1280x720')).toEqual({ width: 1280, height: 720 });
			expect(parseResolution('3840x2160')).toEqual({ width: 3840, height: 2160 });
		});

		it('should return null for invalid formats', () => {
			expect(parseResolution('1920:1080')).toBeNull();
			expect(parseResolution('invalid')).toBeNull();
			expect(parseResolution('')).toBeNull();
			expect(parseResolution('1920x')).toBeNull();
		});
	});

	describe('validateProjectData', () => {
		it('should validate correct project data', () => {
			const result = validateProjectData({
				title: 'Test Project',
				description: 'Test Description',
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toEqual([]);
		});

		it('should reject missing title', () => {
			const result = validateProjectData({
				description: 'Test Description',
			});
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Title is required');
		});

		it('should reject empty title', () => {
			const result = validateProjectData({
				title: '   ',
				description: 'Test Description',
			});
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Title is required');
		});

		it('should reject title that is too long', () => {
			const result = validateProjectData({
				title: 'a'.repeat(201),
			});
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Title must be less than 200 characters');
		});

		it('should reject description that is too long', () => {
			const result = validateProjectData({
				title: 'Test Project',
				description: 'a'.repeat(1001),
			});
			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Description must be less than 1000 characters');
		});

		it('should accept valid long title', () => {
			const result = validateProjectData({
				title: 'a'.repeat(200),
			});
			expect(result.valid).toBe(true);
		});

		it('should accept valid long description', () => {
			const result = validateProjectData({
				title: 'Test Project',
				description: 'a'.repeat(1000),
			});
			expect(result.valid).toBe(true);
		});
	});
});

/**
 * Formatting utilities
 */

export function formatDuration(seconds: number): string {
	if (seconds < 60) {
		return `${seconds.toFixed(1)}s`;
	}
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
}

export function formatTime(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);
	
	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	}
	return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function parseAspectRatio(ratio: string): { width: number; height: number } | null {
	const match = ratio.match(/^(\d+):(\d+)$/);
	if (!match) {
		return null;
	}
	return {
		width: parseInt(match[1], 10),
		height: parseInt(match[2], 10),
	};
}

export function parseResolution(resolution: string): { width: number; height: number } | null {
	const match = resolution.match(/^(\d+)x(\d+)$/);
	if (!match) {
		return null;
	}
	return {
		width: parseInt(match[1], 10),
		height: parseInt(match[2], 10),
	};
}

export function validateProjectData(data: {
	title?: string;
	description?: string;
}): { valid: boolean; errors: string[] } {
	const errors: string[] = [];
	
	if (!data.title || data.title.trim().length === 0) {
		errors.push('Title is required');
	}
	
	if (data.title && data.title.length > 200) {
		errors.push('Title must be less than 200 characters');
	}
	
	if (data.description && data.description.length > 1000) {
		errors.push('Description must be less than 1000 characters');
	}
	
	return {
		valid: errors.length === 0,
		errors,
	};
}

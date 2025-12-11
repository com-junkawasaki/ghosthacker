/**
 * Composer Store - State management for the video/audio composer
 * Inspired by twick's timeline management approach
 */

export interface Clip {
	id: string;
	trackId: string;
	startTime: number; // in seconds
	duration: number; // in seconds
	type: 'audio' | 'video' | 'image' | 'text';
	name: string;
	url?: string;
	metadata?: Record<string, unknown>;
}

export interface Track {
	id: string;
	composerId: string;
	type: 'audio' | 'video' | 'overlay';
	name: string;
	number: number;
	muted: boolean;
	locked: boolean;
	visible: boolean;
	clips: Clip[];
}

export interface ComposerState {
	composerId: string | null;
	tracks: Track[];
	currentTime: number;
	duration: number;
	isPlaying: boolean;
	zoom: number; // pixels per second
	scrollX: number;
	selectedClipId: string | null;
	selectedTrackId: string | null;
}

interface HistoryEntry {
	tracks: Track[];
	description: string;
}

// Create a simple reactive store
function createComposerStore() {
	const state = $state<ComposerState>({
		composerId: null,
		tracks: [],
		currentTime: 0,
		duration: 60, // default 60 seconds
		isPlaying: false,
		zoom: 10, // 10 pixels per second
		scrollX: 0,
		selectedClipId: null,
		selectedTrackId: null,
	});

	let history = $state<HistoryEntry[]>([]);
	let historyIndex = $state(-1);
	const maxHistorySize = 50;

	// Save state to history for undo/redo
	function saveToHistory(description: string) {
		// Remove any future history if we're not at the end
		if (historyIndex < history.length - 1) {
			history = history.slice(0, historyIndex + 1);
		}

		// Add new entry
		history = [...history, {
			tracks: JSON.parse(JSON.stringify(state.tracks)),
			description,
		}];

		// Limit history size
		if (history.length > maxHistorySize) {
			history = history.slice(history.length - maxHistorySize);
		}

		historyIndex = history.length - 1;
	}

	return {
		get state() {
			return state;
		},

		get canUndo() {
			return historyIndex > 0;
		},

		get canRedo() {
			return historyIndex < history.length - 1;
		},

		// Initialize composer
		initialize(composerId: string, tracks: Track[] = []) {
			state.composerId = composerId;
			state.tracks = tracks;
			state.currentTime = 0;
			state.isPlaying = false;
			state.selectedClipId = null;
			state.selectedTrackId = null;
			
			// Calculate duration from tracks
			let maxDuration = 60;
			for (const track of tracks) {
				for (const clip of track.clips) {
					const clipEnd = clip.startTime + clip.duration;
					if (clipEnd > maxDuration) {
						maxDuration = clipEnd;
					}
				}
			}
			state.duration = Math.max(maxDuration, 60);

			// Clear history
			history = [{
				tracks: JSON.parse(JSON.stringify(tracks)),
				description: 'Initial state',
			}];
			historyIndex = 0;
		},

		// Playback controls
		play() {
			state.isPlaying = true;
		},

		pause() {
			state.isPlaying = false;
		},

		togglePlay() {
			state.isPlaying = !state.isPlaying;
		},

		seek(time: number) {
			state.currentTime = Math.max(0, Math.min(time, state.duration));
		},

		setDuration(duration: number) {
			state.duration = Math.max(duration, 1);
		},

		// Zoom and scroll
		setZoom(zoom: number) {
			state.zoom = Math.max(1, Math.min(zoom, 100));
		},

		setScrollX(scrollX: number) {
			state.scrollX = Math.max(0, scrollX);
		},

		// Track operations
		addTrack(track: Omit<Track, 'clips'>) {
			const newTrack: Track = { ...track, clips: [] };
			state.tracks = [...state.tracks, newTrack];
			saveToHistory(`Add track: ${track.name}`);
		},

		removeTrack(trackId: string) {
			const track = state.tracks.find(t => t.id === trackId);
			state.tracks = state.tracks.filter(t => t.id !== trackId);
			if (track) {
				saveToHistory(`Remove track: ${track.name}`);
			}
		},

		updateTrack(trackId: string, updates: Partial<Track>) {
			state.tracks = state.tracks.map(track =>
				track.id === trackId ? { ...track, ...updates } : track
			);
		},

		toggleTrackMute(trackId: string) {
			state.tracks = state.tracks.map(track =>
				track.id === trackId ? { ...track, muted: !track.muted } : track
			);
		},

		toggleTrackLock(trackId: string) {
			state.tracks = state.tracks.map(track =>
				track.id === trackId ? { ...track, locked: !track.locked } : track
			);
		},

		toggleTrackVisibility(trackId: string) {
			state.tracks = state.tracks.map(track =>
				track.id === trackId ? { ...track, visible: !track.visible } : track
			);
		},

		// Clip operations
		addClip(trackId: string, clip: Omit<Clip, 'trackId'>) {
			const newClip: Clip = { ...clip, trackId };
			state.tracks = state.tracks.map(track =>
				track.id === trackId
					? { ...track, clips: [...track.clips, newClip] }
					: track
			);
			saveToHistory(`Add clip: ${clip.name}`);
			
			// Update duration if needed
			const clipEnd = clip.startTime + clip.duration;
			if (clipEnd > state.duration) {
				state.duration = clipEnd + 10; // Add some buffer
			}
		},

		removeClip(clipId: string) {
			let clipName = '';
			state.tracks = state.tracks.map(track => {
				const clip = track.clips.find(c => c.id === clipId);
				if (clip) clipName = clip.name;
				return {
					...track,
					clips: track.clips.filter(c => c.id !== clipId),
				};
			});
			if (clipName) {
				saveToHistory(`Remove clip: ${clipName}`);
			}
			if (state.selectedClipId === clipId) {
				state.selectedClipId = null;
			}
		},

		updateClip(clipId: string, updates: Partial<Clip>) {
			state.tracks = state.tracks.map(track => ({
				...track,
				clips: track.clips.map(clip =>
					clip.id === clipId ? { ...clip, ...updates } : clip
				),
			}));
		},

		moveClip(clipId: string, newStartTime: number, newTrackId?: string) {
			let movedClip: Clip | null = null;
			
			// Remove clip from current track
			state.tracks = state.tracks.map(track => {
				const clip = track.clips.find(c => c.id === clipId);
				if (clip) {
					movedClip = { ...clip, startTime: Math.max(0, newStartTime) };
					if (newTrackId) {
						movedClip.trackId = newTrackId;
					}
					return {
						...track,
						clips: track.clips.filter(c => c.id !== clipId),
					};
				}
				return track;
			});

			// Add clip to target track
			if (movedClip) {
				const clipToAdd = movedClip;
				const targetTrackId = newTrackId || clipToAdd.trackId;
				state.tracks = state.tracks.map(track =>
					track.id === targetTrackId
						? { ...track, clips: [...track.clips, clipToAdd] }
						: track
				);
				saveToHistory(`Move clip: ${clipToAdd.name}`);
			}
		},

		resizeClip(clipId: string, newDuration: number, edge: 'start' | 'end' = 'end') {
			state.tracks = state.tracks.map(track => ({
				...track,
				clips: track.clips.map(clip => {
					if (clip.id === clipId) {
						if (edge === 'end') {
							return { ...clip, duration: Math.max(0.1, newDuration) };
						} else {
							const diff = clip.duration - newDuration;
							return {
								...clip,
								startTime: Math.max(0, clip.startTime + diff),
								duration: Math.max(0.1, newDuration),
							};
						}
					}
					return clip;
				}),
			}));
			saveToHistory('Resize clip');
		},

		// Selection
		selectClip(clipId: string | null) {
			state.selectedClipId = clipId;
		},

		selectTrack(trackId: string | null) {
			state.selectedTrackId = trackId;
		},

		// Undo/Redo
		undo() {
			if (historyIndex > 0) {
				historyIndex--;
				const entry = history[historyIndex];
				if (entry) {
					state.tracks = JSON.parse(JSON.stringify(entry.tracks));
				}
			}
		},

		redo() {
			if (historyIndex < history.length - 1) {
				historyIndex++;
				const entry = history[historyIndex];
				if (entry) {
					state.tracks = JSON.parse(JSON.stringify(entry.tracks));
				}
			}
		},

		// Get clip by ID
		getClip(clipId: string): Clip | null {
			for (const track of state.tracks) {
				const clip = track.clips.find(c => c.id === clipId);
				if (clip) return clip;
			}
			return null;
		},

		// Get track by ID
		getTrack(trackId: string): Track | null {
			return state.tracks.find(t => t.id === trackId) || null;
		},
	};
}

// Export singleton instance
export const composerStore = createComposerStore();

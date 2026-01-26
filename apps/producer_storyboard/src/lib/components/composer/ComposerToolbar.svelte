<script lang="ts">
	import { composerStore } from '$lib/stores/composerStore.svelte';

	type Props = {
		onAddTrack: () => void;
		onExport: () => void;
		onSave: () => void;
	};

	let { onAddTrack, onExport, onSave }: Props = $props();

	const state = $derived(composerStore.state);
	const isPlaying = $derived(state.isPlaying);
	const currentTime = $derived(state.currentTime);
	const duration = $derived(state.duration);
	const canUndo = $derived(composerStore.canUndo);
	const canRedo = $derived(composerStore.canRedo);

	function formatTimecode(seconds: number): string {
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);
		const frames = Math.floor((seconds % 1) * 30);
		return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
	}

	function handleKeyDown(e: KeyboardEvent) {
		// Global keyboard shortcuts
		if (e.key === ' ') {
			e.preventDefault();
			composerStore.togglePlay();
		} else if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			if (e.shiftKey) {
				composerStore.redo();
			} else {
				composerStore.undo();
			}
		} else if (e.key === 'Home') {
			e.preventDefault();
			composerStore.seek(0);
		} else if (e.key === 'End') {
			e.preventDefault();
			composerStore.seek(duration);
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			composerStore.seek(Math.max(0, currentTime - (e.shiftKey ? 5 : 1)));
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			composerStore.seek(Math.min(duration, currentTime + (e.shiftKey ? 5 : 1)));
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="composer-toolbar">
	<!-- Left section: File operations -->
	<div class="toolbar-section left">
		<button class="toolbar-btn" title="Save (Ctrl+S)" onclick={onSave}>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
				<polyline points="17 21 17 13 7 13 7 21"></polyline>
				<polyline points="7 3 7 8 15 8"></polyline>
			</svg>
		</button>
		<button class="toolbar-btn" title="Undo (Ctrl+Z)" onclick={() => composerStore.undo()} disabled={!canUndo}>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="1 4 1 10 7 10"></polyline>
				<path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
			</svg>
		</button>
		<button class="toolbar-btn" title="Redo (Ctrl+Shift+Z)" onclick={() => composerStore.redo()} disabled={!canRedo}>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<polyline points="23 4 23 10 17 10"></polyline>
				<path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"></path>
			</svg>
		</button>
		<div class="toolbar-divider"></div>
		<button class="toolbar-btn primary" title="Add Track" onclick={onAddTrack}>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="12" y1="5" x2="12" y2="19"></line>
				<line x1="5" y1="12" x2="19" y2="12"></line>
			</svg>
			<span>Add Track</span>
		</button>
	</div>

	<!-- Center section: Playback controls -->
	<div class="toolbar-section center">
		<button class="playback-btn" title="Go to Start (Home)" onclick={() => composerStore.seek(0)}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
				<path d="M19 5v14l-7-7 7-7zm-7 0v14l-7-7 7-7zM5 5h2v14H5V5z"></path>
			</svg>
		</button>
		<button class="playback-btn" title="Step Back (←)" onclick={() => composerStore.seek(Math.max(0, currentTime - 1))}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
				<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"></path>
			</svg>
		</button>
		<button class="playback-btn play" title="Play/Pause (Space)" onclick={() => composerStore.togglePlay()}>
			{#if isPlaying}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
					<rect x="6" y="4" width="4" height="16"></rect>
					<rect x="14" y="4" width="4" height="16"></rect>
				</svg>
			{:else}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
					<polygon points="5 3 19 12 5 21 5 3"></polygon>
				</svg>
			{/if}
		</button>
		<button class="playback-btn" title="Step Forward (→)" onclick={() => composerStore.seek(Math.min(duration, currentTime + 1))}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
				<path d="M8 5v14l11-7z"></path>
				<path d="M16 5h2v14h-2z"></path>
			</svg>
		</button>
		<button class="playback-btn" title="Go to End (End)" onclick={() => composerStore.seek(duration)}>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
				<path d="M5 5v14l7-7-7-7zm7 0v14l7-7-7-7zM17 5h2v14h-2V5z"></path>
			</svg>
		</button>
		<div class="timecode">
			<span class="timecode-current">{formatTimecode(currentTime)}</span>
			<span class="timecode-separator">/</span>
			<span class="timecode-duration">{formatTimecode(duration)}</span>
		</div>
	</div>

	<!-- Right section: Export -->
	<div class="toolbar-section right">
		<button class="toolbar-btn export" title="Export Video" onclick={onExport}>
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
				<polyline points="17 8 12 3 7 8"></polyline>
				<line x1="12" y1="3" x2="12" y2="15"></line>
			</svg>
			<span>Export</span>
		</button>
	</div>
</div>

<style>
	.composer-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 52px;
		background: #0d0d0d;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		padding: 0 12px;
		gap: 16px;
	}

	.toolbar-section {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.toolbar-section.center {
		flex: 1;
		justify-content: center;
	}

	.toolbar-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: rgba(255, 255, 255, 0.8);
		cursor: pointer;
		font-size: 13px;
		transition: all 0.15s;
	}

	.toolbar-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.toolbar-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.toolbar-btn.primary {
		background: rgba(59, 130, 246, 0.15);
		border-color: rgba(59, 130, 246, 0.3);
		color: #3b82f6;
	}

	.toolbar-btn.primary:hover {
		background: rgba(59, 130, 246, 0.25);
	}

	.toolbar-btn.export {
		background: rgba(34, 197, 94, 0.15);
		border-color: rgba(34, 197, 94, 0.3);
		color: #22c55e;
	}

	.toolbar-btn.export:hover {
		background: rgba(34, 197, 94, 0.25);
	}

	.toolbar-divider {
		width: 1px;
		height: 24px;
		background: rgba(255, 255, 255, 0.1);
		margin: 0 4px;
	}

	.playback-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 6px;
		color: rgba(255, 255, 255, 0.8);
		cursor: pointer;
		transition: all 0.15s;
	}

	.playback-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
	}

	.playback-btn.play {
		width: 44px;
		height: 44px;
		background: #3b82f6;
		border-color: #3b82f6;
		color: white;
		border-radius: 50%;
	}

	.playback-btn.play:hover {
		background: #2563eb;
	}

	.timecode {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-left: 16px;
		font-family: 'SF Mono', 'Menlo', monospace;
		font-size: 13px;
	}

	.timecode-current {
		color: white;
		font-weight: 500;
	}

	.timecode-separator {
		color: rgba(255, 255, 255, 0.3);
	}

	.timecode-duration {
		color: rgba(255, 255, 255, 0.5);
	}
</style>


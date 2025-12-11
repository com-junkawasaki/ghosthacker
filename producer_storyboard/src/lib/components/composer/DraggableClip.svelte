<script lang="ts">
	import type { Clip } from '$lib/stores/composerStore';
	import { composerStore } from '$lib/stores/composerStore';

	type Props = {
		clip: Clip;
		zoom: number;
		trackHeight: number;
		onSelect: (clipId: string) => void;
	};

	let { clip, zoom, trackHeight, onSelect }: Props = $props();

	let isDragging = $state(false);
	let isResizing = $state<'start' | 'end' | null>(null);
	let dragStartX = $state(0);
	let dragStartTime = $state(0);
	let dragStartDuration = $state(0);

	const clipWidth = $derived(clip.duration * zoom);
	const clipLeft = $derived(clip.startTime * zoom);
	const isSelected = $derived(composerStore.state.selectedClipId === clip.id);

	function getClipColor(type: string): string {
		switch (type) {
			case 'audio':
				return 'rgba(59, 130, 246, 0.6)';
			case 'video':
				return 'rgba(34, 197, 94, 0.6)';
			case 'image':
				return 'rgba(168, 85, 247, 0.6)';
			case 'text':
				return 'rgba(251, 191, 36, 0.6)';
			default:
				return 'rgba(107, 114, 128, 0.6)';
		}
	}

	function handleMouseDown(e: MouseEvent) {
		if (isResizing) return;
		e.preventDefault();
		e.stopPropagation();

		isDragging = true;
		dragStartX = e.clientX;
		dragStartTime = clip.startTime;

		onSelect(clip.id);

		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging && !isResizing) return;

		const deltaX = e.clientX - dragStartX;
		const deltaTime = deltaX / zoom;

		if (isDragging) {
			const newStartTime = Math.max(0, dragStartTime + deltaTime);
			composerStore.updateClip(clip.id, { startTime: newStartTime });
		} else if (isResizing === 'end') {
			const newDuration = Math.max(0.5, dragStartDuration + deltaTime);
			composerStore.updateClip(clip.id, { duration: newDuration });
		} else if (isResizing === 'start') {
			const newDuration = Math.max(0.5, dragStartDuration - deltaTime);
			const newStartTime = Math.max(0, dragStartTime + deltaTime);
			if (newDuration >= 0.5) {
				composerStore.updateClip(clip.id, { 
					startTime: newStartTime, 
					duration: newDuration 
				});
			}
		}
	}

	function handleMouseUp() {
		if (isDragging) {
			composerStore.moveClip(clip.id, clip.startTime);
		}
		isDragging = false;
		isResizing = null;
		window.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('mouseup', handleMouseUp);
	}

	function handleResizeStart(e: MouseEvent, edge: 'start' | 'end') {
		e.preventDefault();
		e.stopPropagation();

		isResizing = edge;
		dragStartX = e.clientX;
		dragStartTime = clip.startTime;
		dragStartDuration = clip.duration;

		onSelect(clip.id);

		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);
	}

	function handleDoubleClick(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		// TODO: Open clip properties dialog
		console.log('Edit clip:', clip);
	}
</script>

<div
	class="draggable-clip"
	class:selected={isSelected}
	class:dragging={isDragging}
	style="
		left: {clipLeft}px;
		width: {clipWidth}px;
		height: {trackHeight - 8}px;
		background: {getClipColor(clip.type)};
	"
	role="button"
	tabindex="0"
	onmousedown={handleMouseDown}
	ondblclick={handleDoubleClick}
	onkeydown={(e) => {
		if (e.key === 'Delete' || e.key === 'Backspace') {
			composerStore.removeClip(clip.id);
		}
	}}
>
	<!-- Resize handle left -->
	<div
		class="resize-handle left"
		role="slider"
		tabindex="-1"
		aria-label="Resize clip start"
		onmousedown={(e) => handleResizeStart(e, 'start')}
	></div>

	<!-- Clip content -->
	<div class="clip-content">
		{#if clip.type === 'audio'}
			<div class="waveform"></div>
		{:else if clip.type === 'video'}
			<div class="thumbnails">
				{#each Array(Math.max(1, Math.floor(clipWidth / 60))) as _, i}
					<div class="thumbnail" style="background: rgba(255,255,255,0.1)"></div>
				{/each}
			</div>
		{/if}
		<span class="clip-name">{clip.name}</span>
	</div>

	<!-- Resize handle right -->
	<div
		class="resize-handle right"
		role="slider"
		tabindex="-1"
		aria-label="Resize clip end"
		onmousedown={(e) => handleResizeStart(e, 'end')}
	></div>
</div>

<style>
	.draggable-clip {
		position: absolute;
		top: 4px;
		border-radius: 4px;
		cursor: grab;
		display: flex;
		align-items: stretch;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.2);
		transition: box-shadow 0.15s ease;
		user-select: none;
	}

	.draggable-clip:hover {
		border-color: rgba(255, 255, 255, 0.4);
	}

	.draggable-clip.selected {
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
	}

	.draggable-clip.dragging {
		cursor: grabbing;
		opacity: 0.8;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.resize-handle {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 8px;
		cursor: ew-resize;
		background: transparent;
		z-index: 10;
	}

	.resize-handle:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.resize-handle.left {
		left: 0;
		border-radius: 4px 0 0 4px;
	}

	.resize-handle.right {
		right: 0;
		border-radius: 0 4px 4px 0;
	}

	.clip-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 4px 12px;
		min-width: 0;
		overflow: hidden;
	}

	.waveform {
		flex: 1;
		background: repeating-linear-gradient(
			90deg,
			rgba(255, 255, 255, 0.3) 0px,
			rgba(255, 255, 255, 0.3) 2px,
			transparent 2px,
			transparent 6px
		);
		border-radius: 2px;
		margin-bottom: 4px;
	}

	.thumbnails {
		flex: 1;
		display: flex;
		gap: 2px;
		margin-bottom: 4px;
	}

	.thumbnail {
		flex: 1;
		border-radius: 2px;
		min-width: 20px;
	}

	.clip-name {
		font-size: 11px;
		color: rgba(255, 255, 255, 0.9);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-weight: 500;
	}
</style>

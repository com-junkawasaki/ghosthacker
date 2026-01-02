<script lang="ts">
	type Props = {
		clip: {
			id: string;
			startTime: number;
			duration: number;
			name: string;
		};
	};

	let { clip }: Props = $props();
</script>

<div class="audio-clip-component">
	<div class="clip-waveform"></div>
	<span class="clip-label">{clip.name}</span>
</div>

<style>
	.audio-clip-component {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: rgba(59, 130, 246, 0.3);
		border: 1px solid rgba(59, 130, 246, 0.5);
		border-radius: 0.25rem;
		padding: 0.25rem;
		cursor: move;
	}

	.clip-waveform {
		flex: 1;
		background: repeating-linear-gradient(
			90deg,
			rgba(255, 255, 255, 0.2) 0px,
			rgba(255, 255, 255, 0.2) 2px,
			transparent 2px,
			transparent 4px
		);
		border-radius: 0.125rem;
		margin-bottom: 0.25rem;
	}

	.clip-label {
		font-size: 0.7rem;
		color: rgba(255, 255, 255, 0.8);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>



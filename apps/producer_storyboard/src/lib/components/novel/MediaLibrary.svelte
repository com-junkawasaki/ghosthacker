<script lang="ts">
	type Props = {
		chapterId: string;
	};

	let { chapterId }: Props = $props();

	// TODO: Implement media library with gRPC
	// For now, just a placeholder
</script>

<div class="media-library">
	<h3 class="media-library-title">Media Library</h3>
	<div class="media-library-placeholder">
		<p class="placeholder-text">Media library will be implemented here</p>
		<p class="placeholder-note">Chapter ID: {chapterId || 'None selected'}</p>
	</div>
</div>

<style>
	.media-library {
		margin-bottom: 1rem;
	}

	.media-library-title {
		margin: 0 0 0.5rem 0;
		font-weight: 600;
		font-size: 1rem;
	}

	.media-library-placeholder {
		padding: 1rem;
		background-color: var(--bg-tertiary, #f3f4f6);
		border-radius: 0.375rem;
		text-align: center;
	}

	.placeholder-text {
		margin: 0 0 0.5rem 0;
		color: var(--text-secondary, #6b7280);
		font-size: 0.875rem;
	}

	.placeholder-note {
		margin: 0;
		color: var(--text-tertiary, #9ca3af);
		font-size: 0.75rem;
	}
</style>

<script lang="ts">
	import StoryboardEditor from '$components/Storyboard/StoryboardEditor.svelte';
</script>

<main class="ios-shell">
	<div class="ios-device">
		<StoryboardEditor />
	</div>
</main>

<style>
	.ios-shell {
		width: 100%;
		min-height: 100vh;
		display: flex;
		justify-content: center;
		align-items: stretch;
		padding: 0.5rem;
		background:
			radial-gradient(1200px 600px at 50% -200px, #d8e6ff 0%, transparent 60%),
			linear-gradient(180deg, #edf2ff 0%, #f4f6fb 40%, #eef2f7 100%);
	}

	.ios-device {
		width: min(100vw - 1rem, 430px);
		height: calc(100vh - 1rem);
		border-radius: 28px;
		overflow: hidden;
		background: #f2f2f7;
		box-shadow:
			0 28px 60px rgba(25, 35, 55, 0.22),
			0 2px 0 rgba(255, 255, 255, 0.85) inset;
		border: 1px solid rgba(255, 255, 255, 0.65);
	}
</style>

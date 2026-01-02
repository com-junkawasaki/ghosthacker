<script lang="ts">
	let showHelp = $state(false);

	function toggleHelp() {
		showHelp = !showHelp;
	}
</script>

<div class="help-button-container">
	<button
		type="button"
		onclick={toggleHelp}
		class="help-btn"
		title="Help"
	>
		?
	</button>

	{#if showHelp}
		<div class="help-dialog">
			<div class="help-content">
				<h4>Manga Editor Help</h4>
				<ul>
					<li>Select tool: Click to select panels and bubbles</li>
					<li>Pen tool: Draw on the canvas</li>
					<li>Eraser tool: Erase drawings</li>
					<li>Shape tool: Add shapes</li>
					<li>Text tool: Add text</li>
				</ul>
				<button type="button" onclick={toggleHelp} class="close-btn">Close</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.help-button-container {
		position: relative;
	}

	.help-btn {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background-color: #3b82f6;
		color: white;
		border: none;
		cursor: pointer;
		font-size: 1rem;
		font-weight: bold;
		transition: background-color 0.2s;
	}

	.help-btn:hover {
		background-color: #2563eb;
	}

	.help-dialog {
		position: absolute;
		bottom: 2.5rem;
		right: 0;
		width: 300px;
		background-color: white;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 0.375rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		z-index: 1000;
	}

	.help-content {
		padding: 1rem;
	}

	.help-content h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.help-content ul {
		margin: 0 0 1rem 0;
		padding-left: 1.5rem;
		font-size: 0.875rem;
	}

	.help-content li {
		margin-bottom: 0.25rem;
	}

	.close-btn {
		width: 100%;
		padding: 0.5rem;
		background-color: #3b82f6;
		color: white;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.close-btn:hover {
		background-color: #2563eb;
	}
</style>

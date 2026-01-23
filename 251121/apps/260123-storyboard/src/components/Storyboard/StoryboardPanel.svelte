<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Panel, PanelData, Dialogue } from '$lib/gen/proto/storyboard_pb';
	import { create, PanelDataSchema, DialogueSchema } from '$lib/gen/proto/storyboard_pb';

	export let panel: Panel;

	const dispatch = createEventDispatcher();

	let editing = false;
	let cutNumber = panel.cutNumber || '';
	let visualNote = panel.data?.visualNote || '';
	let cameraDirection = panel.data?.cameraDirection || '';
	let durationSeconds = panel.data?.durationSeconds || 0;
	let dialogues: Dialogue[] = panel.data?.dialogue || [];
	let characters = panel.data?.characters || [];
	let environment = panel.data?.environment || '';

	function startEdit() {
		editing = true;
	}

	function saveEdit() {
		const updatedData = create(PanelDataSchema, {
			characters: characters,
			dialogue: dialogues,
			environment: environment,
			visualNote: visualNote,
			cameraDirection: cameraDirection,
			durationSeconds: durationSeconds,
			cutNumber: cutNumber,
		});

		dispatch('update', updatedData);
		editing = false;
	}

	function cancelEdit() {
		editing = false;
		// Reset to original values
		cutNumber = panel.cutNumber || '';
		visualNote = panel.data?.visualNote || '';
		cameraDirection = panel.data?.cameraDirection || '';
		durationSeconds = panel.data?.durationSeconds || 0;
		dialogues = panel.data?.dialogue || [];
		characters = panel.data?.characters || [];
		environment = panel.data?.environment || '';
	}

	function addDialogue() {
		const newDialogue = create(DialogueSchema, { speaker: '', text: '' });
		dialogues = [...dialogues, newDialogue];
	}

	function removeDialogue(index: number) {
		dialogues = dialogues.filter((_, i) => i !== index);
	}
</script>

<div class="storyboard-panel-row">
	<!-- カット列 -->
	<div class="col-cut">
		{#if editing}
			<input
				type="text"
				bind:value={cutNumber}
				placeholder="76"
				class="cut-input"
			/>
		{:else}
			<div class="cut-number" on:click={startEdit}>
				{cutNumber || panel.panel}
			</div>
		{/if}
	</div>

	<!-- 画列 -->
	<div class="col-picture">
		<div class="picture-frame">
			{#if editing}
				<textarea
					bind:value={visualNote}
					placeholder="Visual description..."
					class="visual-note-input"
				></textarea>
				{#if cameraDirection}
					<div class="camera-note">{cameraDirection}</div>
				{/if}
				<input
					type="text"
					bind:value={cameraDirection}
					placeholder="Camera direction (e.g., Followカメラ)"
					class="camera-input"
				/>
			{:else}
				<div class="visual-placeholder">
					{#if visualNote}
						<div class="visual-note">{visualNote}</div>
					{:else}
						<div class="placeholder-text">画</div>
					{/if}
					{#if cameraDirection}
						<div class="camera-note">{cameraDirection}</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- 内容列 -->
	<div class="col-content">
		{#if editing}
			<div class="content-editor">
				<div class="characters-section">
					<label>Characters:</label>
					<input
						type="text"
						value={characters.join(', ')}
						on:input={(e) => {
							characters = (e.target as HTMLInputElement).value
								.split(',')
								.map((s) => s.trim())
								.filter((s) => s);
						}}
						placeholder="character:Ren, character:Nei"
					/>
				</div>
				<div class="environment-section">
					<label>Environment:</label>
					<input
						type="text"
						bind:value={environment}
						placeholder="env:ren-office"
					/>
				</div>
				<div class="dialogue-section">
					<label>Dialogue:</label>
					{#each dialogues as dialogue, index}
						<div class="dialogue-item">
							<input
								type="text"
								bind:value={dialogue.speaker}
								placeholder="Speaker"
							/>
							<input
								type="text"
								bind:value={dialogue.text}
								placeholder="Text"
							/>
							<button
								type="button"
								on:click={() => removeDialogue(index)}
								class="remove-btn"
							>
								×
							</button>
						</div>
					{/each}
					<button type="button" on:click={addDialogue} class="add-btn">
						+ Add Dialogue
					</button>
				</div>
				<div class="actions">
					<button on:click={saveEdit} class="save-btn">Save</button>
					<button on:click={cancelEdit} class="cancel-btn">Cancel</button>
				</div>
			</div>
		{:else}
			<div class="content-display" on:dblclick={startEdit}>
				{#if characters.length > 0}
					<div class="characters">
						Characters: {characters.join(', ')}
					</div>
				{/if}
				{#if environment}
					<div class="environment">Env: {environment}</div>
				{/if}
				{#if dialogues.length > 0}
					<div class="dialogue">
						{#each dialogues as dialogue}
							<div class="dialogue-line">
								<strong>{dialogue.speaker}:</strong> {dialogue.text}
							</div>
						{/each}
					</div>
				{/if}
				{#if visualNote}
					<div class="visual-note-text">{visualNote}</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- 秒列 -->
	<div class="col-seconds">
		{#if editing}
			<input
				type="number"
				bind:value={durationSeconds}
				step="0.1"
				min="0"
				class="duration-input"
			/>
		{:else}
			<div class="duration" on:click={startEdit}>
				{durationSeconds > 0 ? durationSeconds.toFixed(1) : '-'}
			</div>
		{/if}
	</div>
</div>

<style>
	.storyboard-panel-row {
		display: grid;
		grid-template-columns: 80px 1fr 400px 60px;
		border-bottom: 1px solid #e0e0e0;
		min-height: 200px;
	}

	.storyboard-panel-row:hover {
		background: #fafafa;
	}

	.col-cut,
	.col-picture,
	.col-content,
	.col-seconds {
		padding: 1rem;
		border-right: 1px solid #e0e0e0;
		display: flex;
		align-items: flex-start;
	}

	.col-cut:last-child,
	.col-picture:last-child,
	.col-content:last-child,
	.col-seconds:last-child {
		border-right: none;
	}

	/* カット列 */
	.cut-number {
		font-size: 1.2rem;
		font-weight: 600;
		color: #333;
		cursor: pointer;
		text-align: center;
		width: 100%;
	}

	.cut-input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 1rem;
		text-align: center;
	}

	/* 画列 */
	.picture-frame {
		width: 100%;
		min-height: 150px;
		border: 2px solid #ccc;
		border-radius: 4px;
		background: #f9f9f9;
		position: relative;
		padding: 0.5rem;
	}

	.visual-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.placeholder-text {
		font-size: 3rem;
		color: #ccc;
		font-weight: 300;
	}

	.visual-note {
		font-size: 0.85rem;
		color: #555;
		line-height: 1.4;
		margin-bottom: 0.5rem;
	}

	.visual-note-input {
		width: 100%;
		min-height: 100px;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 0.85rem;
		resize: vertical;
		font-family: inherit;
	}

	.camera-note {
		font-size: 0.75rem;
		color: #888;
		font-style: italic;
		margin-top: 0.5rem;
		padding: 0.25rem 0.5rem;
		background: #fff3cd;
		border-radius: 3px;
	}

	.camera-input {
		width: 100%;
		margin-top: 0.5rem;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 0.85rem;
	}

	/* 内容列 */
	.content-display {
		width: 100%;
		cursor: pointer;
		font-size: 0.9rem;
		line-height: 1.6;
	}

	.content-display:hover {
		background: #f0f0f0;
		padding: 0.5rem;
		border-radius: 4px;
	}

	.characters {
		font-weight: 600;
		color: #555;
		margin-bottom: 0.5rem;
	}

	.environment {
		font-size: 0.85rem;
		color: #777;
		margin-bottom: 0.5rem;
	}

	.dialogue {
		margin-top: 0.5rem;
	}

	.dialogue-line {
		margin-bottom: 0.5rem;
		padding-left: 1rem;
		border-left: 2px solid #ddd;
	}

	.dialogue-line strong {
		color: #333;
	}

	.visual-note-text {
		margin-top: 0.5rem;
		font-size: 0.85rem;
		color: #666;
		font-style: italic;
	}

	.content-editor {
		width: 100%;
	}

	.content-editor label {
		display: block;
		font-weight: 600;
		margin-top: 0.75rem;
		margin-bottom: 0.25rem;
		font-size: 0.85rem;
		color: #555;
	}

	.content-editor input[type='text'] {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
	}

	.dialogue-item {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		align-items: center;
	}

	.dialogue-item input {
		flex: 1;
	}

	.remove-btn {
		padding: 0.25rem 0.5rem;
		background: #fee;
		border: 1px solid #fcc;
		border-radius: 4px;
		cursor: pointer;
		color: #c00;
	}

	.add-btn {
		padding: 0.5rem 1rem;
		background: #e8f5e9;
		border: 1px solid #c8e6c9;
		border-radius: 4px;
		cursor: pointer;
		color: #2e7d32;
		font-size: 0.85rem;
		margin-top: 0.5rem;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.save-btn,
	.cancel-btn {
		padding: 0.5rem 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
	}

	.save-btn {
		background: #4caf50;
		color: white;
		border-color: #4caf50;
	}

	.cancel-btn {
		background: #fff;
		color: #666;
	}

	/* 秒列 */
	.duration {
		text-align: center;
		font-size: 1rem;
		color: #666;
		cursor: pointer;
		width: 100%;
	}

	.duration-input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 1rem;
		text-align: center;
	}
</style>

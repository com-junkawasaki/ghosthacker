<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { novelStore } from '$lib/stores/novelStore.svelte';
	import { novelClient } from '$lib/grpc/novelClient';
	import { create } from '@bufbuild/protobuf';
	import {
		GetNovelProjectRequestSchema,
		UpdateNovelProjectRequestSchema,
	} from '$lib/grpc/generated/novel/v1/novel_pb';

	type Props = {
		novelId: string;
	};

	let { novelId }: Props = $props();

	let title = $state('');
	let description = $state('');
	let language = $state('ja');
	let loading = $state(true);
	let saving = $state(false);
	let error = $state<string | null>(null);

	onMount(() => {
		if (browser && novelId) {
			loadMetadata();
		}
	});

	async function loadMetadata() {
		if (!novelId) return;

		try {
			loading = true;
			error = null;

			const request = create(GetNovelProjectRequestSchema, {
				id: novelId,
			});

			const project = await novelClient.getNovelProject(request);
			if (project) {
				title = project.title || '';
				description = project.description || '';
				language = project.language || 'ja';
				novelStore.setNovelProject(project);
			}
		} catch (err) {
			console.error('Failed to load metadata:', err);
			error = err instanceof Error ? err.message : 'Failed to load metadata';
		} finally {
			loading = false;
		}
	}

	async function saveMetadata() {
		if (!novelId) return;

		try {
			saving = true;
			error = null;

			const request = create(UpdateNovelProjectRequestSchema, {
				id: novelId,
				title: title,
				description: description,
				language: language,
			});

			const updated = await novelClient.updateNovelProject(request);
			if (updated) {
				novelStore.setNovelProject(updated);
			}
		} catch (err) {
			console.error('Failed to save metadata:', err);
			error = err instanceof Error ? err.message : 'Failed to save metadata';
		} finally {
			saving = false;
		}
	}
</script>

<div class="metadata-form">
	<h3 class="metadata-title">Metadata</h3>

	{#if loading}
		<div class="loading">Loading metadata...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else}
		<form onsubmit={(e) => { e.preventDefault(); saveMetadata(); }}>
			<div class="form-group">
				<label for="title" class="form-label">Title</label>
				<input
					id="title"
					type="text"
					bind:value={title}
					class="form-input"
					placeholder="Novel title"
				/>
			</div>

			<div class="form-group">
				<label for="description" class="form-label">Description</label>
				<textarea
					id="description"
					bind:value={description}
					class="form-textarea"
					placeholder="Novel description"
					rows="3"
				></textarea>
			</div>

			<div class="form-group">
				<label for="language" class="form-label">Language</label>
				<select id="language" bind:value={language} class="form-select">
					<option value="ja">Japanese</option>
					<option value="en">English</option>
					<option value="zh">Chinese</option>
					<option value="ko">Korean</option>
				</select>
			</div>

			<button
				type="submit"
				disabled={saving}
				class="save-btn"
			>
				{saving ? 'Saving...' : 'Save'}
			</button>
		</form>
	{/if}
</div>

<style>
	.metadata-form {
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-color, #e5e7eb);
	}

	.metadata-title {
		margin: 0 0 1rem 0;
		font-weight: 600;
		font-size: 1rem;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-label {
		display: block;
		margin-bottom: 0.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #111827);
	}

	.form-input,
	.form-textarea,
	.form-select {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid var(--border-color, #d1d5db);
		border-radius: 0.375rem;
		font-size: 0.875rem;
	}

	.form-input:focus,
	.form-textarea:focus,
	.form-select:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.form-textarea {
		resize: vertical;
		min-height: 60px;
	}

	.save-btn {
		width: 100%;
		padding: 0.5rem;
		background-color: #3b82f6;
		color: white;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		font-size: 0.875rem;
		transition: background-color 0.2s;
	}

	.save-btn:hover:not(:disabled) {
		background-color: #2563eb;
	}

	.save-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.loading,
	.error {
		padding: 0.5rem;
		font-size: 0.875rem;
	}

	.error {
		color: var(--error-color, #ef4444);
	}
</style>


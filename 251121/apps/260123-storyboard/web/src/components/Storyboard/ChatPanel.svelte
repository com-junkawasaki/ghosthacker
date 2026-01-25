<script lang="ts">
	import { storyboardClient } from '$lib/client/storyboard-client';

	let { selectedEpisode, storyboardPath } = $props<{
		selectedEpisode: string;
		storyboardPath: string;
	}>();

	let messages = $state<{ role: 'user' | 'assistant', content: string, context?: any }[]>([]);
	let inputValue = $state('');
	let loading = $state(false);
	let dropContext = $state<any[]>([]);

	async function sendMessage() {
		if (!inputValue && dropContext.length === 0) return;

		const userMessage = inputValue;
		const currentContext = [...dropContext];
		
		messages = [...messages, { role: 'user', content: userMessage, context: currentContext }];
		inputValue = '';
		dropContext = [];
		loading = true;

		try {
			const res = await storyboardClient.interactWithAI({
				filePath: storyboardPath,
				episodeId: selectedEpisode,
				message: userMessage,
				context: currentContext.map(ctx => ({
					type: ctx.type,
					id: ctx.id || '',
					pageNumber: ctx.pageNumber || 0,
					panel: ctx.panel || 0,
					jsonContent: ctx.data ? JSON.stringify(ctx.data) : ''
				}))
			});

			if (res.success) {
				messages = [...messages, { 
					role: 'assistant', 
					content: res.aiResponse 
				}];
				
				// Handle patches if any
				if (res.patches && res.patches.length > 0) {
					console.log('[ChatPanel] Received patches:', res.patches);
					// TODO: Apply patches to the storyboard
				}
			} else {
				messages = [...messages, { role: 'assistant', content: `Error: ${res.message}` }];
			}
		} catch (err) {
			messages = [...messages, { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : String(err)}` }];
		} finally {
			loading = false;
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		const data = e.dataTransfer?.getData('application/json');
		if (data) {
			const parsed = JSON.parse(data);
			if (!dropContext.find(item => JSON.stringify(item) === JSON.stringify(parsed))) {
				dropContext = [...dropContext, parsed];
			}
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
	}

	function removeContext(index: number) {
		dropContext = dropContext.filter((_, i) => i !== index);
	}
</script>

<div class="chat-panel">
	<div class="chat-header">AI STORY ASSISTANT</div>
	
	<div class="chat-messages">
		{#if messages.length === 0}
			<div class="empty-state">
				<p>Drag nodes from the left tree here to add them to context, then ask me to edit or generate content.</p>
			</div>
		{/if}
		{#each messages as msg}
			<div class="message" class:user={msg.role === 'user'}>
				<div class="message-content">{msg.content}</div>
				{#if msg.context && msg.context.length > 0}
					<div class="message-context">
						{#each msg.context as ctx}
							<span class="context-tag">{ctx.type}: {ctx.panel ?? ctx.pageNumber ?? ctx.id}</span>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
		{#if loading}
			<div class="message assistant loading">Thinking...</div>
		{/if}
	</div>

	<div 
		class="chat-input-area"
		ondrop={handleDrop}
		ondragover={handleDragOver}
	>
		{#if dropContext.length > 0}
			<div class="drop-context-preview">
				{#each dropContext as ctx, i}
					<span class="context-tag">
						{ctx.type}: {ctx.panel ?? ctx.pageNumber ?? ctx.id}
						<button onclick={() => removeContext(i)}>×</button>
					</span>
				{/each}
			</div>
		{/if}
		
		<div class="input-wrapper">
			<textarea 
				bind:value={inputValue} 
				placeholder="Ask AI to edit JSON-LD... (Drop nodes here)"
				onkeydown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
			></textarea>
			<button onclick={sendMessage} disabled={loading || (!inputValue && dropContext.length === 0)}>
				Send
			</button>
		</div>
	</div>
</div>

<style>
	.chat-panel {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: #1e1e1e;
		color: #d4d4d4;
		font-family: 'Segoe UI', sans-serif;
	}

	.chat-header {
		padding: 0.75rem 1rem;
		font-size: 0.7rem;
		font-weight: bold;
		color: #888;
		letter-spacing: 0.1em;
		background: #252526;
		border-bottom: 1px solid #333;
	}

	.chat-messages {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.empty-state {
		text-align: center;
		color: #666;
		font-size: 0.8rem;
		margin-top: 2rem;
	}

	.message {
		padding: 0.75rem;
		border-radius: 6px;
		max-width: 90%;
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.message.user {
		align-self: flex-end;
		background: #007acc;
		color: white;
	}

	.message.assistant {
		align-self: flex-start;
		background: #2d2d2d;
		border: 1px solid #444;
	}

	.message-context {
		margin-top: 0.5rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.context-tag {
		font-size: 0.7rem;
		background: rgba(255,255,255,0.1);
		padding: 2px 6px;
		border-radius: 3px;
		color: #aaa;
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.context-tag button {
		background: none;
		border: none;
		color: #f44;
		cursor: pointer;
		padding: 0;
		font-size: 0.8rem;
	}

	.chat-input-area {
		padding: 1rem;
		background: #252526;
		border-top: 1px solid #333;
	}

	.drop-context-preview {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		padding: 0.5rem;
		background: #1e1e1e;
		border: 1px dashed #444;
		border-radius: 4px;
		min-height: 2rem;
	}

	.input-wrapper {
		display: flex;
		gap: 0.5rem;
	}

	textarea {
		flex: 1;
		background: #3c3c3c;
		color: white;
		border: 1px solid #555;
		border-radius: 4px;
		padding: 0.5rem;
		font-size: 0.9rem;
		resize: none;
		height: 60px;
	}

	button {
		background: #007acc;
		color: white;
		border: none;
		border-radius: 4px;
		padding: 0 1rem;
		cursor: pointer;
		font-weight: bold;
	}

	button:disabled {
		background: #444;
		color: #888;
		cursor: not-allowed;
	}
</style>

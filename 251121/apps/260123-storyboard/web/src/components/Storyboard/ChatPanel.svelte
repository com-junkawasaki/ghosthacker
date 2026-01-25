<script lang="ts">
	import { storyboardClient } from '$lib/client/storyboard-client';

	let { selectedEpisode, storyboardPath, onApplyPatches } = $props<{
		selectedEpisode: string;
		storyboardPath: string;
		onApplyPatches?: (patches: any[]) => void;
	}>();

	let messages = $state<{ role: 'user' | 'assistant', content: string, context?: any, agent?: string, patches?: any[] }[]>([]);
	let inputValue = $state('');
	let loading = $state(false);
	let dropContext = $state<any[]>([]);
	let currentAgentMode = $state<'general' | 'scenario' | 'episode' | 'character' | 'cinematic' | 'dialogue'>('general');
	let isAutoPilot = $state(false);

	// Expose a method to trigger agent commands from outside
	export function triggerAgent(agent: typeof currentAgentMode, initialPrompt?: string) {
		currentAgentMode = agent;
		if (initialPrompt) {
			inputValue = initialPrompt;
		}
		// Focus the textarea
		const textarea = document.querySelector('.chat-input-area textarea') as HTMLTextAreaElement;
		if (textarea) textarea.focus();
	}

	async function sendMessage() {
		if (!inputValue && dropContext.length === 0) return;

		const userMessage = inputValue;
		const currentContext = [...dropContext];
		const agentMode = currentAgentMode;
		
		messages = [...messages, { role: 'user', content: userMessage, context: currentContext, agent: agentMode }];
		inputValue = '';
		dropContext = [];
		loading = true;

		console.log('[ChatPanel] Sending message to AI...', { userMessage, contextCount: currentContext.length, agentMode });

		try {
			const res = await storyboardClient.interactWithAI({
				filePath: storyboardPath,
				episodeId: selectedEpisode,
				message: userMessage,
				agentMode: agentMode,
				context: currentContext.map(ctx => ({
					type: ctx.type,
					id: String(ctx.id || ''),
					pageNumber: Number(ctx.pageNumber || 0),
					panel: Number(ctx.panel || 0),
					jsonContent: ctx.data ? JSON.stringify(ctx.data) : (ctx.type === 'page' ? '{"info": "page context"}' : '')
				}))
			});

			console.log('[ChatPanel] AI Response received:', res);

			if (res.success) {
				messages = [...messages, { 
					role: 'assistant', 
					content: res.aiResponse,
					patches: res.patches
				}];
				
				if (res.patches && res.patches.length > 0) {
					console.log('[ChatPanel] AI suggested patches:', res.patches);
				}
			} else {
				messages = [...messages, { role: 'assistant', content: `AI Error: ${res.message}` }];
			}
		} catch (err) {
			console.error('[ChatPanel] RPC Error:', err);
			messages = [...messages, { role: 'assistant', content: `Connection Error: ${err instanceof Error ? err.message : String(err)}` }];
		} finally {
			loading = false;
		}
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		const data = e.dataTransfer?.getData('application/json');
		if (data) {
			try {
				const parsed = JSON.parse(data);
				console.log('[ChatPanel] Node dropped:', parsed);
				if (!dropContext.find(item => JSON.stringify(item) === JSON.stringify(parsed))) {
					dropContext = [...dropContext, parsed];
				}
			} catch (err) {
				console.error('[ChatPanel] Failed to parse dropped data:', err);
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

	function applyPatches(patches: any[]) {
		if (onApplyPatches) {
			onApplyPatches(patches);
		}
	}

	async function startAutoPilot() {
		if (!selectedEpisode) return;
		isAutoPilot = true;
		const goal = inputValue || "Advance the story naturally";
		inputValue = '';
		
		messages = [...messages, { 
			role: 'user', 
			content: `[AUTO-PILOT START] Goal: ${goal}`,
			context: [...dropContext]
		}];

		try {
			const res = await storyboardClient.startAutonomousGeneration({
				filePath: storyboardPath,
				episodeId: selectedEpisode,
				goal: goal,
				initialContext: dropContext.map(ctx => ({
					type: ctx.type,
					id: String(ctx.id || ''),
					pageNumber: Number(ctx.pageNumber || 0),
					panel: Number(ctx.panel || 0),
					jsonContent: ctx.data ? JSON.stringify(ctx.data) : ''
				}))
			});

			if (res.success) {
				messages = [...messages, { 
					role: 'assistant', 
					content: `Autonomous generation started. Workflow ID: ${res.workflowId}. Agents are now collaborating...` 
				}];
				
				// Start polling for workflow status or listen to stream updates
				// For now, we'll simulate the agent collaboration in the chat
				simulateAgentCollaboration();
			} else {
				messages = [...messages, { role: 'assistant', content: `Failed to start Auto-Pilot: ${res.message}` }];
				isAutoPilot = false;
			}
		} catch (err) {
			messages = [...messages, { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : String(err)}` }];
			isAutoPilot = false;
		}
	}

	function simulateAgentCollaboration() {
		const agents = [
			{ name: 'scenario', msg: 'Planning the next narrative beats based on the goal...' },
			{ name: 'episode', msg: 'Generating detailed scenes and dialogue exchanges...' },
			{ name: 'character', msg: 'Verifying character voices and emotional consistency...' },
			{ name: 'cinematic', msg: 'Finalizing visual composition and camera directions.' }
		];

		let delay = 2000;
		agents.forEach((agent, i) => {
			setTimeout(() => {
				messages = [...messages, { 
					role: 'assistant', 
					agent: agent.name,
					content: agent.msg 
				}];
				if (i === agents.length - 1) {
					isAutoPilot = false;
					messages = [...messages, { 
						role: 'assistant', 
						content: 'Autonomous generation complete. You can review the changes in the Story Editor.' 
					}];
				}
			}, delay);
			delay += 3000;
		});
	}
</script>

<div class="chat-panel">
	<div class="chat-header">
		<div class="header-top">
			<span>AI STORY ASSISTANT (LIVE)</span>
			<button 
				class="autopilot-btn" 
				class:active={isAutoPilot}
				onclick={startAutoPilot}
				disabled={isAutoPilot || !selectedEpisode}
			>
				{isAutoPilot ? 'AUTO-PILOT ON' : 'START AUTO-PILOT'}
			</button>
		</div>
		<div class="agent-mode-selector">
			<button 
				class="mode-btn general" 
				class:active={currentAgentMode === 'general'} 
				onclick={() => currentAgentMode = 'general'}
			>General</button>
			<button 
				class="mode-btn scenario" 
				class:active={currentAgentMode === 'scenario'} 
				onclick={() => currentAgentMode = 'scenario'}
			>Scenario</button>
			<button 
				class="mode-btn episode" 
				class:active={currentAgentMode === 'episode'} 
				onclick={() => currentAgentMode = 'episode'}
			>Episode</button>
			<button 
				class="mode-btn character" 
				class:active={currentAgentMode === 'character'} 
				onclick={() => currentAgentMode = 'character'}
			>Character</button>
			<button 
				class="mode-btn cinematic" 
				class:active={currentAgentMode === 'cinematic'} 
				onclick={() => currentAgentMode = 'cinematic'}
			>Cinematic</button>
			<button 
				class="mode-btn dialogue" 
				class:active={currentAgentMode === 'dialogue'} 
				onclick={() => currentAgentMode = 'dialogue'}
			>Dialogue</button>
		</div>
	</div>
	
	<div class="chat-messages">
		{#if messages.length === 0}
			<div class="empty-state">
				<p>Drag nodes (Episodes, Pages, Panels) from the left tree here to add them to context.</p>
				<p>Then ask me to rewrite dialogue, suggest visual notes, or update the story structure.</p>
			</div>
		{/if}
		{#each messages as msg}
			<div class="message" class:user={msg.role === 'user'}>
				{#if msg.agent && msg.agent !== 'general'}
					<span class="message-agent-tag" class:scenario={msg.agent === 'scenario'} class:episode={msg.agent === 'episode'} class:character={msg.agent === 'character'} class:cinematic={msg.agent === 'cinematic'} class:dialogue={msg.agent === 'dialogue'}>
						{msg.agent.toUpperCase()}
					</span>
				{/if}
				{#if msg.context && msg.context.length > 0}
					<div class="message-context">
						{#each msg.context as ctx}
							<span class="context-tag">{ctx.type}: {ctx.panel ?? ctx.pageNumber ?? ctx.id}</span>
						{/each}
					</div>
				{/if}
				<div class="message-content">{msg.content}</div>
				{#if msg.patches && msg.patches.length > 0}
					<div class="patch-actions">
						<button class="apply-btn" onclick={() => applyPatches(msg.patches!)}>
							Apply {msg.patches.length} Changes
						</button>
					</div>
				{/if}
			</div>
		{/each}
		{#if loading}
			<div class="message assistant loading">
				<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
			</div>
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
				placeholder="Ask AI to edit... (Drop nodes here)"
				onkeydown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
			></textarea>
			<button class="send-btn" onclick={sendMessage} disabled={loading || (!inputValue && dropContext.length === 0)}>
				{loading ? '...' : 'Send'}
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
		padding: 0.5rem 1rem;
		font-size: 0.7rem;
		font-weight: bold;
		color: #aaa;
		letter-spacing: 0.1em;
		background: #252526;
		border-bottom: 1px solid #333;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.header-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}

	.autopilot-btn {
		background: #333;
		color: #aaa;
		border: 1px solid #444;
		padding: 2px 8px;
		border-radius: 4px;
		font-size: 0.6rem;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.3s;
	}

	.autopilot-btn:hover:not(:disabled) {
		background: #444;
		color: white;
	}

	.autopilot-btn.active {
		background: #e74c3c;
		color: white;
		border-color: transparent;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0% { opacity: 1; }
		50% { opacity: 0.7; }
		100% { opacity: 1; }
	}

	.agent-mode-selector {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		width: 100%;
	}

	.mode-btn {
		padding: 2px 6px;
		border-radius: 3px;
		font-size: 0.6rem;
		background: #333;
		color: #888;
		border: 1px solid #444;
		cursor: pointer;
		transition: all 0.2s;
	}

	.mode-btn:hover {
		background: #444;
		color: #ccc;
	}

	.mode-btn.active {
		color: white;
		border-color: transparent;
	}

	.mode-btn.active.general { background: #555; }
	.mode-btn.active.scenario { background: #4a90e2; }
	.mode-btn.active.episode { background: #2ecc71; }
	.mode-btn.active.character { background: #9b59b6; }
	.mode-btn.active.cinematic { background: #e67e22; }
	.mode-btn.active.dialogue { background: #e74c3c; }

	.chat-messages {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.empty-state {
		text-align: center;
		color: #666;
		font-size: 0.85rem;
		margin-top: 3rem;
		padding: 0 1rem;
		line-height: 1.5;
	}

	.message {
		padding: 0.8rem 1rem;
		border-radius: 8px;
		max-width: 90%;
		font-size: 0.9rem;
		line-height: 1.5;
		position: relative;
	}

	.message.user {
		align-self: flex-end;
		background: #007acc;
		color: white;
		border-bottom-right-radius: 2px;
	}

	.message.assistant {
		align-self: flex-start;
		background: #2d2d2d;
		border: 1px solid #444;
		border-bottom-left-radius: 2px;
	}

	.message-agent-tag {
		font-size: 0.55rem;
		font-weight: bold;
		padding: 1px 4px;
		border-radius: 3px;
		margin-bottom: 0.25rem;
		display: inline-block;
		color: white;
	}

	.message-agent-tag.scenario { background: #4a90e2; }
	.message-agent-tag.episode { background: #2ecc71; }
	.message-agent-tag.character { background: #9b59b6; }
	.message-agent-tag.cinematic { background: #e67e22; }
	.message-agent-tag.dialogue { background: #e74c3c; }

	.message-context {
		margin-bottom: 0.5rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.context-tag {
		font-size: 0.65rem;
		background: rgba(255,255,255,0.1);
		padding: 2px 8px;
		border-radius: 10px;
		color: #bbb;
		display: flex;
		align-items: center;
		gap: 4px;
		border: 1px solid rgba(255,255,255,0.05);
	}

	.context-tag button {
		background: none;
		border: none;
		color: #ff5f56;
		cursor: pointer;
		padding: 0;
		font-size: 0.9rem;
		line-height: 1;
	}

	.patch-actions {
		margin-top: 0.75rem;
		display: flex;
		justify-content: flex-end;
	}

	.apply-btn {
		background: #2ecc71;
		color: white;
		border: none;
		border-radius: 4px;
		padding: 4px 12px;
		font-size: 0.75rem;
		font-weight: bold;
		cursor: pointer;
		transition: background 0.2s;
	}

	.apply-btn:hover {
		background: #27ae60;
	}

	.chat-input-area {
		padding: 1rem;
		background: #252526;
		border-top: 1px solid #333;
	}

	.drop-context-preview {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.75rem;
		padding: 0.5rem;
		background: #1e1e1e;
		border: 1px dashed #555;
		border-radius: 6px;
		min-height: 2.5rem;
	}

	.input-wrapper {
		display: flex;
		gap: 0.75rem;
		align-items: flex-end;
	}

	textarea {
		flex: 1;
		background: #3c3c3c;
		color: white;
		border: 1px solid #555;
		border-radius: 4px;
		padding: 0.6rem;
		font-size: 0.9rem;
		resize: none;
		height: 80px;
		outline: none;
	}

	textarea:focus {
		border-color: #007acc;
	}

	.send-btn {
		background: #007acc;
		color: white;
		border: none;
		border-radius: 6px;
		padding: 0.6rem 1.2rem;
		cursor: pointer;
		font-weight: bold;
		height: 40px;
		transition: background 0.2s;
	}

	.send-btn:hover:not(:disabled) {
		background: #0062a3;
	}

	.send-btn:disabled {
		background: #444;
		color: #888;
		cursor: not-allowed;
	}

	.loading .dot {
		animation: blink 1.4s infinite both;
		font-size: 1.5rem;
		line-height: 0;
	}

	.loading .dot:nth-child(2) { animation-delay: 0.2s; }
	.loading .dot:nth-child(3) { animation-delay: 0.4s; }

	@keyframes blink {
		0% { opacity: .2; }
		20% { opacity: 1; }
		100% { opacity: .2; }
	}
</style>

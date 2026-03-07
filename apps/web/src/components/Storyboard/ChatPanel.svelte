<script lang="ts">
	import { storyboardClient } from '$lib/client/storyboard-client';
	import { onMount } from 'svelte';
	import { marked } from 'marked';
	import { Plus, History, X, Send, Crown, Sparkles, Search, Palette, BarChart3 } from 'lucide-svelte';

	let { selectedEpisode, storyboardPath, onApplyPatches } = $props<{
		selectedEpisode: string;
		storyboardPath: string;
		onApplyPatches?: (patches: any[]) => void;
	}>();

	type Message = {
		role: 'user' | 'assistant' | 'system' | 'debug' | 'error', content: string, context?: any, agent?: string,
		patches?: any[], contextScope?: any, context_json?: string, resolvedIds?: string[]
	};
	type ChatSession = { id: string, title: string, messages: Message[], timestamp: number };

	let sessions = $state<ChatSession[]>([]);
	let currentSessionId = $state<string>(Math.random().toString(36).substring(2, 15));
	let messages = $state<Message[]>([]);
	let showHistory = $state(false);

	onMount(async () => { await loadAllSessions(); });

	async function loadAllSessions() {
		try {
			const res = await storyboardClient.getChatSessions({});
			if (res.sessions) {
				sessions = res.sessions.map(s => ({
					id: s.id, title: s.title,
					messages: s.messages.map(m => {
						let context = undefined;
						if (m.contextJson) { try { context = JSON.parse(m.contextJson); } catch {} }
						return { role: m.role as any, agent: m.agentMode, content: m.content, context, context_json: m.contextJson, resolvedIds: m.resolvedIds, patches: m.patches, contextScope: m.contextScope };
					}),
					timestamp: Number(s.timestamp)
				}));
				if (sessions.length > 0 && messages.length === 0) { const f = sessions[0]; if (f) loadSession(f.id); }
			}
		} catch (err) { console.error('Failed to load chat sessions:', err); }
	}

	async function saveCurrentSession() {
		const session = sessions.find(s => s.id === currentSessionId);
		if (!session) return;
		try {
			await storyboardClient.saveChatSession({
				session: { id: session.id, title: session.title, timestamp: BigInt(session.timestamp),
					messages: messages.map(m => ({ role: m.role, agentMode: m.agent ?? '', content: m.content, contextJson: m.context ? JSON.stringify(m.context) : (m.context_json ?? ''), resolvedIds: m.resolvedIds ?? [], patches: m.patches ?? [], contextScope: m.contextScope })) }
			});
		} catch (err) { console.error('Failed to save chat session:', err); }
	}

	let inputValue = $state('');
	let loading = $state(false);
	let dropContext = $state<any[]>([]);
	let currentAgentMode = $state<string>('general');
	let isAutoPilot = $state(false);
	let activeWorkflowId = $state<string | null>(null);
	let metrics = $state<any | null>(null);

	async function runAnalysis() {
		if (!selectedEpisode) return;
		try { const res = await storyboardClient.analyzeStructure({ filePath: storyboardPath, episodeId: selectedEpisode }); if (res.success) metrics = res.metrics; } catch (err) { console.error('Analysis failed:', err); }
	}

	$effect(() => {
		if (sessions.length === 0) sessions = [{ id: currentSessionId, title: 'New Conversation', messages: [], timestamp: Date.now() }];
	});

	$effect(() => {
		const session = sessions.find(s => s.id === currentSessionId);
		if (session && messages.length > 0) {
			session.messages = messages;
			const first = messages[0];
			if (first && (session.title === 'New Conversation' || session.title === '')) {
				session.title = first.content.substring(0, 30) + (first.content.length > 30 ? '...' : '');
				saveCurrentSession();
			}
		}
	});

	async function createNewSession() {
		const newId = Math.random().toString(36).substring(2, 15);
		sessions = [{ id: newId, title: 'New Conversation', messages: [], timestamp: Date.now() }, ...sessions];
		currentSessionId = newId; messages = []; currentAgentMode = 'general'; isAutoPilot = false; showHistory = false;
		await saveCurrentSession();
	}

	function loadSession(id: string) {
		const session = sessions.find(s => s.id === id);
		if (session) {
			currentSessionId = id;
			messages = session.messages.map(m => {
				let context = undefined;
				if (m.context_json) { try { context = JSON.parse(m.context_json); } catch {} }
				return { role: m.role as any, content: m.content, agent: m.agent ?? 'general', context: context || m.context, patches: m.patches ?? [], contextScope: m.contextScope, resolvedIds: m.resolvedIds ?? [] };
			});
			showHistory = false;
		}
	}

	export function triggerAgent(agent: typeof currentAgentMode, initialPrompt?: string) {
		currentAgentMode = agent;
		if (initialPrompt) inputValue = initialPrompt;
		const textarea = document.querySelector('.chat-textarea') as HTMLTextAreaElement;
		if (textarea) textarea.focus();
	}

	export async function addMessage(msg: { role: 'user' | 'assistant', content: string, agent?: string }) {
		messages = [...messages, msg];
		await saveCurrentSession();
	}

	export function addContext(type: string, data: any) {
		const item = { type, ...data };
		if (!dropContext.find(existing => JSON.stringify(existing) === JSON.stringify(item))) {
			dropContext = [...dropContext, item];
		}
	}

	async function sendMessage() {
		if (!inputValue && dropContext.length === 0) return;
		const userMessage = inputValue;
		const currentContext = [...dropContext];
		const agentMode = currentAgentMode;

		if (userMessage.startsWith('/avatar ')) {
			const charId = userMessage.replace('/avatar ', '').trim();
			if (charId) {
				messages = [...messages, { role: 'user', content: userMessage, context: currentContext, agent: agentMode }];
				inputValue = ''; loading = true;
				try {
					const res = await storyboardClient.generatePanelImage({ filePath: storyboardPath, episodeId: selectedEpisode || 'system', pageNumber: 0, panel: 0, panelData: { visualNote: `CHARACTER_AVATAR:${charId}`, characters: [charId.startsWith('character:') ? charId : `character:${charId}`] } });
					messages = [...messages, { role: 'assistant', content: res.success ? `Avatar for ${charId} generated.` : `Failed: ${res.message}` }];
				} catch (err) { messages = [...messages, { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : String(err)}` }]; }
				finally { loading = false; await saveCurrentSession(); }
				return;
			}
		}

		messages = [...messages, { role: 'user', content: userMessage, context: currentContext, agent: agentMode }];
		inputValue = ''; dropContext = []; loading = true;
		await saveCurrentSession();
		try {
			const res = await storyboardClient.interactWithAI({
				filePath: storyboardPath, episodeId: selectedEpisode, message: userMessage, agentMode,
				history: messages.slice(0, -1).map(m => ({ role: m.role, agentMode: m.agent ?? '', content: m.content, contextJson: m.context ? JSON.stringify(m.context) : (m.context_json ?? ''), resolvedIds: m.resolvedIds ?? [], patches: m.patches ?? [], contextScope: m.contextScope })),
				context: currentContext.map(ctx => ({ type: ctx.type, id: String(ctx.id || ''), pageNumber: Number(ctx.pageNumber || 0), panel: Number(ctx.panel || 0), jsonContent: ctx.data ? JSON.stringify(ctx.data) : (ctx.type === 'page' ? '{"info": "page context"}' : '') }))
			});
			if (res.success) {
				messages = [...messages, { role: 'assistant', content: res.aiResponse, patches: res.patches, contextScope: res.contextScope, resolvedIds: res.resolvedIds }];
				await saveCurrentSession();
			} else messages = [...messages, { role: 'assistant', content: `Error: ${res.message}` }];
		} catch (err) { messages = [...messages, { role: 'assistant', content: `Connection Error: ${err instanceof Error ? err.message : String(err)}` }]; }
		finally { loading = false; }
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		const data = e.dataTransfer?.getData('application/json');
		if (data) {
			try { const parsed = JSON.parse(data); if (!dropContext.find(item => JSON.stringify(item) === JSON.stringify(parsed))) dropContext = [...dropContext, parsed]; }
			catch (err) { console.error('Failed to parse drop:', err); }
		}
	}

	function handleDragOver(e: DragEvent) { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; }
	function removeContext(index: number) { dropContext = dropContext.filter((_, i) => i !== index); }
	function applyPatches(patches: any[]) { if (onApplyPatches) onApplyPatches(patches); }

	async function startAutoPilot() {
		if (!selectedEpisode) return;
		isAutoPilot = true;
		const goal = inputValue || "Advance the story naturally";
		inputValue = '';
		messages = [...messages, { role: 'user', content: `[AUTO-PILOT] Goal: ${goal}`, context: [...dropContext] }];
		await saveCurrentSession();
		try {
			const res = await storyboardClient.startAutonomousGeneration({ filePath: storyboardPath, episodeId: selectedEpisode, goal, initialContext: dropContext.map(ctx => ({ type: ctx.type, id: String(ctx.id || ''), pageNumber: Number(ctx.pageNumber || 0), panel: Number(ctx.panel || 0), jsonContent: ctx.data ? JSON.stringify(ctx.data) : '' })) });
			if (res.success) { activeWorkflowId = res.workflowId; messages = [...messages, { role: 'assistant', content: `Auto-pilot started. Workflow: ${res.workflowId}` }]; }
			else { messages = [...messages, { role: 'assistant', content: `Failed: ${res.message}` }]; isAutoPilot = false; }
		} catch (err) { messages = [...messages, { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : String(err)}` }]; isAutoPilot = false; }
	}

	async function stopAutoPilot() {
		if (!activeWorkflowId) return;
		try { const res = await storyboardClient.terminateAutonomousGeneration({ workflowId: activeWorkflowId, reason: "User terminated" }); if (res.success) { isAutoPilot = false; activeWorkflowId = null; } }
		catch (err) { console.error('Failed to stop:', err); }
	}

	function triggerA2APattern(pattern: 'polish' | 'consistency' | 'visuals' | 'master') {
		currentAgentMode = 'a2a';
		const goals: Record<string, string> = {
			polish: "Evaluate and polish the current story.",
			consistency: "Check for character/setting inconsistencies and fix them.",
			visuals: "Generate cinematic sketches for panels missing them.",
			master: "Comprehensively evaluate and enhance the entire episode.",
		};
		inputValue = goals[pattern] ?? '';
		startAutoPilot();
	}

	const agentModes = [
		{ value: 'general', label: 'General' }, { value: 'scenario', label: 'Scenario' },
		{ value: 'episode', label: 'Episode' }, { value: 'character', label: 'Character' },
		{ value: 'cinematic', label: 'Cinematic' }, { value: 'dialogue', label: 'Dialogue' },
		{ value: 'a2a', label: 'A2A' }, { value: 'environment', label: 'Env' },
		{ value: 'prop', label: 'Prop' }, { value: 'ghost', label: 'Ghost' },
	];
</script>

<div class="chat-root">
	<!-- Header -->
	<div class="chat-header">
		<div class="flex items-center justify-between">
			<span class="text-[11px] font-bold uppercase tracking-wider text-zinc-400">AI Assistant</span>
			<div class="flex items-center gap-1.5">
				<button class="header-btn" onclick={() => showHistory = !showHistory} title="History">
					{#if showHistory}<X size={16} />{:else}<History size={16} />{/if}
				</button>
				<button class="header-btn" onclick={createNewSession} title="New Chat">
					<Plus size={16} />
				</button>
				{#if isAutoPilot}
					<button class="btn btn-sm preset-filled-error-500 text-[11px] font-bold" onclick={stopAutoPilot}>Stop</button>
				{:else}
					<button class="btn btn-sm preset-tonal-primary text-[11px] font-bold" onclick={startAutoPilot} disabled={!selectedEpisode}>Auto-Pilot</button>
				{/if}
			</div>
		</div>

		{#if showHistory}
			<div class="history-list">
				{#each sessions as session}
					<button class="history-item" class:active={session.id === currentSessionId} onclick={() => loadSession(session.id)}>
						<span class="truncate">{session.title}</span>
						<span class="shrink-0 text-[10px] text-zinc-400">{new Date(session.timestamp).toLocaleTimeString()}</span>
					</button>
				{/each}
			</div>
		{/if}

		<!-- Quick Actions -->
		<div class="quick-actions">
			<button class="quick-btn master" onclick={() => triggerA2APattern('master')} disabled={isAutoPilot}><Crown size={12} /> Master</button>
			<button class="quick-btn" onclick={() => triggerA2APattern('polish')} disabled={isAutoPilot}><Sparkles size={12} /> Polish</button>
			<button class="quick-btn" onclick={() => triggerA2APattern('consistency')} disabled={isAutoPilot}><Search size={12} /> Check</button>
			<button class="quick-btn" onclick={() => triggerA2APattern('visuals')} disabled={isAutoPilot}><Palette size={12} /> Visuals</button>
			<button class="quick-btn" onclick={runAnalysis} disabled={isAutoPilot}><BarChart3 size={12} /> Metrics</button>
		</div>

		{#if metrics}
			<div class="metrics-bar">
				<span>RU: <strong class:warn={metrics.readingUnits < 600 || metrics.readingUnits > 1500}>{metrics.readingUnits}</strong></span>
				<span>Dialogue: <strong>{Math.round(metrics.dialogueRatio * 100)}%</strong></span>
				<span>Beats: <strong>{metrics.beatCount}</strong></span>
			</div>
		{/if}

		<!-- Agent Mode Selector -->
		<div class="agent-scroll">
			{#each agentModes as mode}
				<button
					class="agent-chip"
					class:active={currentAgentMode === mode.value}
					onclick={() => currentAgentMode = mode.value}
				>{mode.label}</button>
			{/each}
		</div>
	</div>

	<!-- Messages -->
	<div class="messages-area">
		{#if messages.length === 0}
			<div class="empty-chat">
				<p class="text-[14px] text-zinc-400">Drop nodes from Structure, then ask AI to edit.</p>
			</div>
		{/if}
		{#each messages as msg}
			<div class="msg" class:msg-user={msg.role === 'user'} class:msg-debug={msg.role === 'debug'} class:msg-error={msg.role === 'error'} class:msg-system={msg.role === 'system'}>
				{#if msg.agent && msg.agent !== 'general'}
					<span class="agent-tag">{msg.agent.toUpperCase()}</span>
				{/if}
				{#if msg.context && msg.context.length > 0}
					<div class="msg-context">
						{#each msg.context as ctx}
							<span class="ctx-chip">{ctx.type}: {ctx.panel ?? ctx.pageNumber ?? ctx.id}</span>
						{/each}
					</div>
				{/if}
				<div class="msg-body">
					{#if msg.role === 'debug'}<pre>{msg.content}</pre>
					{:else}{@html marked.parse(msg.content)}{/if}
				</div>
				{#if msg.contextScope}
					<div class="scope-info">
						<span class="scope-label">Context loaded</span>
						{#if msg.contextScope.episodes?.length > 0}<span>Episodes: {msg.contextScope.episodes.join(', ')}</span>{/if}
						{#if msg.contextScope.characters?.length > 0}<span>Characters: {msg.contextScope.characters.join(', ')}</span>{/if}
					</div>
				{/if}
				{#if msg.resolvedIds && msg.resolvedIds.length > 0}
					<div class="resolved-info">
						<span class="scope-label">Auto-resolved</span>
						<div class="flex flex-wrap gap-1">{#each msg.resolvedIds as id}<span class="ctx-chip">{id}</span>{/each}</div>
					</div>
				{/if}
				{#if msg.patches && msg.patches.length > 0}
					<div class="mt-2 flex justify-end">
						<button class="btn btn-sm preset-filled-success-500 text-[12px] font-semibold" onclick={() => applyPatches(msg.patches!)}>
							Apply {msg.patches.length} Changes
						</button>
					</div>
				{/if}
			</div>
		{/each}
		{#if loading}
			<div class="msg loading-msg">
				<span class="dot"></span><span class="dot"></span><span class="dot"></span>
			</div>
		{/if}
	</div>

	<!-- Input Area -->
	<div class="input-area" role="region" aria-label="Chat input" ondrop={handleDrop} ondragover={handleDragOver}>
		{#if dropContext.length > 0}
			<div class="context-preview">
				<div class="flex items-center justify-between mb-1">
					<span class="text-[10px] font-bold uppercase text-zinc-400">Context ({dropContext.length})</span>
					<button class="text-[11px] text-zinc-400 underline" onclick={() => dropContext = []}>Clear</button>
				</div>
				<div class="flex flex-wrap gap-1">
					{#each dropContext as ctx, i}
						<span class="ctx-chip">
							{ctx.type}: {ctx.panel ?? ctx.pageNumber ?? ctx.id}
							<button class="ml-1 text-red-400" onclick={() => removeContext(i)}><X size={10} /></button>
						</span>
					{/each}
				</div>
			</div>
		{/if}
		<div class="input-row">
			<textarea
				class="chat-textarea"
				bind:value={inputValue}
				placeholder="Ask AI..."
				onkeydown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
			></textarea>
			<button class="send-btn" onclick={sendMessage} disabled={loading || (!inputValue && dropContext.length === 0)}>
				<Send size={18} />
			</button>
		</div>
	</div>
</div>

<style>
	@reference "tailwindcss";

	.chat-root {
		@apply flex h-full flex-col bg-white;
	}

	/* Header */
	.chat-header {
		@apply flex flex-col gap-2 border-b border-zinc-100 px-4 py-3;
	}

	.header-btn {
		@apply flex h-[32px] w-[32px] items-center justify-center rounded-full text-zinc-500 transition;
		background: rgba(118, 118, 128, 0.12);
	}
	.header-btn:active { @apply scale-95; }

	.history-list {
		@apply max-h-[200px] overflow-y-auto rounded-xl border border-zinc-100 bg-zinc-50;
	}
	.history-item {
		@apply flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] text-zinc-600 transition;
	}
	.history-item:hover { @apply bg-zinc-100; }
	.history-item.active { @apply bg-[#007aff]/10 font-semibold text-[#007aff]; }

	.quick-actions {
		@apply flex gap-1.5 overflow-x-auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}
	.quick-actions::-webkit-scrollbar { display: none; }

	.quick-btn {
		@apply flex shrink-0 items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-600 transition active:scale-95 disabled:opacity-40;
	}
	.quick-btn.master {
		@apply border-amber-300 bg-amber-50 text-amber-700;
	}

	.metrics-bar {
		@apply flex gap-4 rounded-lg bg-zinc-50 px-3 py-2 text-[11px] text-zinc-500;
	}
	.metrics-bar strong { @apply text-emerald-600; }
	.metrics-bar strong.warn { @apply text-red-500; }

	.agent-scroll {
		@apply flex gap-1 overflow-x-auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}
	.agent-scroll::-webkit-scrollbar { display: none; }

	.agent-chip {
		@apply shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-zinc-500 transition;
		background: rgba(118, 118, 128, 0.08);
	}
	.agent-chip.active {
		@apply bg-[#007aff] text-white;
	}

	/* Messages */
	.messages-area {
		@apply flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4;
		-webkit-overflow-scrolling: touch;
	}

	.empty-chat {
		@apply mt-12 text-center;
	}

	.msg {
		@apply max-w-[90%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed;
	}
	.msg:not(.msg-user):not(.msg-debug):not(.msg-error):not(.msg-system) {
		@apply self-start bg-zinc-100 text-zinc-800;
	}
	.msg-user {
		@apply self-end text-white;
		background: #007aff;
		border-bottom-right-radius: 6px;
	}
	.msg-debug {
		@apply self-start border border-dashed border-zinc-200 bg-zinc-50 font-mono text-[12px] text-zinc-500;
	}
	.msg-error {
		@apply self-center border border-red-200 bg-red-50 text-[13px] font-semibold text-red-600;
	}
	.msg-system {
		@apply self-center border border-zinc-200 bg-transparent text-[12px] italic text-zinc-400;
	}

	.agent-tag {
		@apply mb-1 inline-block rounded-full bg-[#007aff] px-2 py-0.5 text-[10px] font-bold text-white;
	}

	.msg-context {
		@apply mb-2 flex flex-wrap gap-1;
	}

	.ctx-chip {
		@apply inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-zinc-600;
	}

	.msg-body { @apply break-words; }
	.msg-body :global(p) { @apply mb-2 last:mb-0; }
	.msg-body :global(code) { @apply rounded bg-black/5 px-1 py-0.5 font-mono text-[13px]; }
	.msg-body :global(pre) { @apply my-2 overflow-x-auto rounded-lg bg-zinc-900 p-3 text-[12px] text-zinc-100; }
	.msg-body :global(pre code) { @apply bg-transparent p-0; }
	.msg-body :global(h1), .msg-body :global(h2), .msg-body :global(h3) { @apply mb-2 mt-3 text-[15px] font-semibold; }
	.msg-body :global(ul), .msg-body :global(ol) { @apply mb-2 ml-4; }

	.scope-info, .resolved-info {
		@apply mt-2 rounded-lg bg-black/5 p-2 text-[11px] text-zinc-500;
	}
	.scope-label {
		@apply mb-1 block text-[10px] font-bold uppercase tracking-wider text-zinc-400;
	}

	.loading-msg {
		@apply flex gap-1 self-start bg-zinc-100 text-zinc-500;
	}
	.dot {
		@apply inline-block h-2 w-2 animate-bounce rounded-full bg-zinc-400;
	}
	.dot:nth-child(2) { animation-delay: 0.15s; }
	.dot:nth-child(3) { animation-delay: 0.3s; }

	/* Input Area */
	.input-area {
		@apply border-t border-zinc-100 px-4 py-3;
		padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
	}

	.context-preview {
		@apply mb-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-2;
	}

	.input-row {
		@apply flex items-end gap-2;
	}

	.chat-textarea {
		@apply flex-1 resize-none rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-[14px] outline-none transition;
		min-height: 40px;
		max-height: 120px;
	}
	.chat-textarea:focus {
		@apply border-[#007aff] bg-white;
		box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
	}

	.send-btn {
		@apply flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-full text-white transition active:scale-95 disabled:opacity-40;
		background: #007aff;
	}
</style>

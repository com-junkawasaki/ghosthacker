<script lang="ts">
	import { storyboardClient } from '$lib/client/storyboard-client';
	import { marked } from 'marked';
	import { Plus, Send } from 'lucide-svelte';

	// Cleanup note (2026-07-14, ADR-2607131400 addenda): this panel used to
	// call storyboardClient.{getChatSessions,saveChatSession,analyzeStructure,
	// interactWithAI,startAutonomousGeneration,terminateAutonomousGeneration} —
	// none of which exist on the fetch-based client that replaced the
	// generated ConnectRPC client (apps/server's Dapr/ConnectRPC backing them
	// was retired as unreachable, see README). Every button/handler that
	// called those has been removed rather than left to throw at runtime.
	// What's kept because it's real: the `/avatar <characterId>` shortcut
	// (storyboardClient.generatePanelImage, a working method) and the
	// message-list UI shell. Chat history is in-memory only for this page
	// load — there is no session persistence backend anymore.

	let { selectedEpisode, storyboardPath } = $props<{
		selectedEpisode: string;
		storyboardPath: string;
	}>();

	type Message = { role: 'user' | 'assistant' | 'error', content: string };

	let messages = $state<Message[]>([]);
	let inputValue = $state('');
	let loading = $state(false);

	function createNewSession() {
		messages = [];
		inputValue = '';
	}

	// Imperative methods called by StoryboardEditor.svelte via bind:this.
	// addContext/triggerAgent are kept as safe no-ops (the multi-agent
	// context-feeding UI they backed is itself broken, see cleanup note
	// above); addMessage still works since callers just append a message.
	export function triggerAgent(_agent: unknown, prompt?: string) {
		if (prompt) inputValue = prompt;
	}

	export function addMessage(msg: { role: string; agent?: string; content: string }) {
		messages = [...messages, { role: msg.role === 'assistant' ? 'assistant' : msg.role === 'error' ? 'error' : 'user', content: msg.content }];
	}

	export function addContext(_type: string, _data: unknown) {}

	async function sendMessage() {
		if (!inputValue) return;
		const userMessage = inputValue;
		inputValue = '';

		if (userMessage.startsWith('/avatar ')) {
			const charId = userMessage.replace('/avatar ', '').trim();
			if (charId) {
				messages = [...messages, { role: 'user', content: userMessage }];
				loading = true;
				try {
					const res = await storyboardClient.generatePanelImage({
						filePath: storyboardPath,
						episodeId: selectedEpisode || 'system',
						pageNumber: 0,
						panel: 0,
						panelData: {
							visualNote: `CHARACTER_AVATAR:${charId}`,
							characters: [charId.startsWith('character:') ? charId : `character:${charId}`]
						}
					});
					messages = [...messages, { role: 'assistant', content: res.success ? `Avatar for ${charId} generated.` : `Failed: ${res.message}` }];
				} catch (err) {
					messages = [...messages, { role: 'error', content: `Error: ${err instanceof Error ? err.message : String(err)}` }];
				} finally {
					loading = false;
				}
				return;
			}
		}

		messages = [
			...messages,
			{ role: 'user', content: userMessage },
			{ role: 'error', content: 'The AI chat agent is not currently available — its backend (Dapr/ConnectRPC) was retired. Only the `/avatar <characterId>` shortcut works here today.' }
		];
	}
</script>

<div class="chat-root">
	<div class="chat-header">
		<div class="flex items-center justify-between">
			<span class="text-[11px] font-bold uppercase tracking-wider text-zinc-400">AI Assistant</span>
			<button class="header-btn" onclick={createNewSession} title="New Chat">
				<Plus size={16} />
			</button>
		</div>
	</div>

	<div class="messages-area">
		{#if messages.length === 0}
			<div class="empty-chat">
				<p class="text-[14px] text-zinc-400">Try <code>/avatar &lt;characterId&gt;</code> to generate a character avatar.</p>
			</div>
		{/if}
		{#each messages as msg}
			<div class="msg" class:msg-user={msg.role === 'user'} class:msg-error={msg.role === 'error'}>
				<div class="msg-body">
					{#if msg.role === 'error'}{msg.content}{:else}{@html marked.parse(msg.content)}{/if}
				</div>
			</div>
		{/each}
		{#if loading}
			<div class="msg loading-msg">
				<span class="dot"></span><span class="dot"></span><span class="dot"></span>
			</div>
		{/if}
	</div>

	<div class="input-area">
		<div class="input-row">
			<textarea
				class="chat-textarea"
				bind:value={inputValue}
				placeholder="/avatar characterId ..."
				onkeydown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
			></textarea>
			<button class="send-btn" onclick={sendMessage} disabled={loading || !inputValue}>
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

	.chat-header {
		@apply flex flex-col gap-2 border-b border-zinc-100 px-4 py-3;
	}

	.header-btn {
		@apply flex h-[32px] w-[32px] items-center justify-center rounded-full text-zinc-500 transition;
		background: rgba(118, 118, 128, 0.12);
	}
	.header-btn:active { @apply scale-95; }

	.messages-area {
		@apply flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4;
		-webkit-overflow-scrolling: touch;
	}

	.empty-chat {
		@apply mt-12 text-center;
	}
	.empty-chat code {
		@apply rounded bg-black/5 px-1 py-0.5 font-mono text-[12px];
	}

	.msg {
		@apply max-w-[90%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed;
	}
	.msg:not(.msg-user):not(.msg-error) {
		@apply self-start bg-zinc-100 text-zinc-800;
	}
	.msg-user {
		@apply self-end text-white;
		background: #007aff;
		border-bottom-right-radius: 6px;
	}
	.msg-error {
		@apply self-center border border-red-200 bg-red-50 text-[13px] font-semibold text-red-600;
	}

	.msg-body { @apply break-words; }
	.msg-body :global(p) { @apply mb-2 last:mb-0; }
	.msg-body :global(code) { @apply rounded bg-black/5 px-1 py-0.5 font-mono text-[13px]; }

	.loading-msg {
		@apply flex gap-1 self-start bg-zinc-100 text-zinc-500;
	}
	.dot {
		@apply inline-block h-2 w-2 animate-bounce rounded-full bg-zinc-400;
	}
	.dot:nth-child(2) { animation-delay: 0.15s; }
	.dot:nth-child(3) { animation-delay: 0.3s; }

	.input-area {
		@apply border-t border-zinc-100 px-4 py-3;
		padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
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

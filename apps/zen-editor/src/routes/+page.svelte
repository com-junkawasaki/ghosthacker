<script lang="ts">
  import Editor from '../components/Editor.svelte';
  import Topology from '../components/TopologyWebGPU.svelte';
  import { onMount } from 'svelte';
  import { client } from '../lib/api';

  let selectedNode = $state<any>(null);
  let isSidebarOpen = $state(false);
  let isChatOpen = $state(false);
  let messages = $state<{role: string, name: string, text: string, emotions?: any}[]>([]);
  let chatInput = $state("");
  let projectTitle = $state("GhostHacker Zen Editor");

  onMount(() => {
    (async () => {
        try {
          const resp = await client.getProjectMetadata({ projectId: "251022" });
          projectTitle = resp?.title || "GhostHacker Zen Editor";
        } catch (err) {
          console.error("Failed to fetch metadata:", err);
        }
    })();
  });

  function handleNodeSelect(node: any) {
    selectedNode = node;
    isSidebarOpen = true;
  }

  function openChat() {
    isChatOpen = true;
    isSidebarOpen = false;
    if (messages.length === 0 && selectedNode) {
      messages.push({
        role: "assistant",
        name: selectedNode.label,
        text: `Hello, I am ${selectedNode.label}. How can I help you?`,
        emotions: { Calm: 0.8 }
      });
    }
  }

  async function handleChatSubmit() {
    if (!chatInput.trim() || !selectedNode) return;
    
    const userMsg = chatInput;
    messages.push({ role: "user", name: "You", text: userMsg });
    chatInput = "";

    try {
      // Use callTool as a proxy for chat functionality if the backend supports it
      const resp = await client.callTool({
        projectId: "251022",
        toolName: "chat_with_node",
        arguments: JSON.stringify({
          nodeId: selectedNode.id,
          message: userMsg
        })
      });
      
      if (resp && resp.result) {
        const resultData = JSON.parse(resp.result);
        messages.push({
          role: "assistant",
          name: selectedNode.label,
          text: resultData.reply || "Thinking...",
          emotions: resultData.emotions || {}
        });
      }
    } catch (err) {
      console.error("Chat failed:", err);
    }
  }
</script>

<div class="app-layout">
  <header class="main-header">
    <button class="menu-trigger">☰</button>
    <h1 class="project-title">{projectTitle}</h1>
  </header>

  <div class="main-content" class:dim={isChatOpen}>
      <Topology onSelect={handleNodeSelect} />
  </div>
  
  {#if isSidebarOpen && selectedNode}
    <div class="sidebar">
      <h2>{selectedNode.label}</h2>
      <button class="action-btn" onclick={openChat}>Chat with Node</button>
      <button onclick={() => isSidebarOpen = false}>Close</button>
    </div>
  {/if}

  {#if isChatOpen}
    <div class="chat-overlay">
      <div class="chat-panel">
        <div class="chat-header">
          <h3>Chatting with {selectedNode?.label}</h3>
          <button onclick={() => isChatOpen = false}>✕</button>
        </div>
        
        <div class="message-list">
          {#each messages as m}
            <div class="message" class:user={m.role === 'user'}>
              <span class="speaker">{m.name}</span>
              <div class="msg-bubble">{m.text}</div>
            </div>
          {/each}
        </div>

        <form class="chat-input-area" onsubmit={(e) => { e.preventDefault(); handleChatSubmit(); }}>
          <input type="text" data-testid="chat-input" placeholder="Communicate..." bind:value={chatInput} />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(body) { margin: 0; padding: 0; background: #000; color: #fff; font-family: sans-serif; overflow: hidden; }
  .app-layout { width: 100vw; height: 100vh; background: #000; position: relative; display: flex; flex-direction: column; }
  .main-header { height: 60px; display: flex; align-items: center; padding: 0 1.5rem; gap: 1rem; border-bottom: 1px solid #333; }
  .main-content { flex: 1; position: relative; transition: opacity 0.3s; }
  .main-content.dim { opacity: 0.3; }
  .sidebar { position: absolute; top: 60px; right: 0; width: 300px; height: calc(100% - 60px); background: #111; color: #fff; padding: 2rem; z-index: 100; border-left: 1px solid #333; }
  .chat-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 200; }
  .chat-panel { background: #fff; color: #000; border-radius: 12px; width: 500px; height: 600px; display: flex; flex-direction: column; overflow: hidden; }
  .chat-header { padding: 1rem 1.5rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
  .message-list { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
  .message { display: flex; flex-direction: column; }
  .message.user { align-items: flex-end; }
  .speaker { font-size: 0.7rem; font-weight: bold; color: #666; margin-bottom: 0.2rem; }
  .msg-bubble { background: #f0f0f0; padding: 0.8rem 1rem; border-radius: 12px; max-width: 80%; }
  .user .msg-bubble { background: #0071e3; color: white; }
  .chat-input-area { padding: 1rem; border-top: 1px solid #eee; display: flex; gap: 0.5rem; }
  .chat-input-area input { flex: 1; padding: 0.6rem; border: 1px solid #ccc; border-radius: 4px; }
  .action-btn { background: #0071e3; color: white; padding: 0.5rem 1rem; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 1rem; display: block; width: 100%; }
</style>

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
  let isEditorOpen = $state(false);
  let currentFilePath = $state("");
  let projectTitle = $state("GhostHacker Zen Editor");
  let episodes = $state<any[]>([]);

  onMount(() => {
    (async () => {
        try {
          const resp = await client.getProjectMetadata({ projectId: "251022" });
          projectTitle = resp?.title || "GhostHacker Zen Editor";
          episodes = resp?.episodes || [];
        } catch (err) {
          console.error("Failed to fetch metadata:", err);
        }
    })();
  });

  function handleNodeSelect(node: any) {
    selectedNode = node;
    isSidebarOpen = true;
    
    // If it's a content node, suggest opening the editor
    if (node.group === 'content' || node.type === 'file') {
        currentFilePath = node.id; // Assuming ID is the path for content nodes
    }
  }

  function openEditor() {
    isEditorOpen = true;
    isSidebarOpen = false;
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
        name: "chat_with_node",
        argumentsJson: JSON.stringify({
          node_id: selectedNode.id,
          message: userMsg
        })
      });
      
      if (resp && resp.resultJson) {
        const resultData = JSON.parse(resp.resultJson);
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

  <div class="main-content" class:dim={isChatOpen || isEditorOpen}>
      <Topology onSelect={handleNodeSelect} selectedId={selectedNode?.id} />
  </div>
  
  {#if isSidebarOpen && selectedNode}
    <div class="sidebar">
      <header class="sidebar-header">
          <h2>{selectedNode.label}</h2>
          <span class="node-type-tag">{selectedNode.group || selectedNode.type}</span>
      </header>
      
      <div class="sidebar-actions">
          <button class="action-btn primary" onclick={openChat}>
            <span class="icon">💬</span> Chat with Node
          </button>
          
          {#if selectedNode.group === 'content' || selectedNode.type === 'file' || currentFilePath}
            <button class="action-btn secondary" onclick={openEditor}>
              <span class="icon">✍️</span> Open in Zen Editor
            </button>
          {/if}
      </div>

      <div class="sidebar-footer">
          <button class="close-btn" onclick={() => isSidebarOpen = false}>Close</button>
      </div>
    </div>
  {/if}

  {#if isEditorOpen}
    <div class="editor-overlay">
        <div class="editor-container">
            <header class="editor-header">
                <button class="back-btn" onclick={() => isEditorOpen = false}>← Back to Graph</button>
                <div class="editor-status">Zen Mode Active</div>
            </header>
            <Editor bind:filePath={currentFilePath} />
        </div>
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
  .app-layout { width: 100vw; height: 100vh; background: #000; position: relative; display: flex; flex-direction: column; overflow: hidden; }
  .main-header { height: 64px; display: flex; align-items: center; padding: 0 1.5rem; gap: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); z-index: 10; }
  .menu-trigger { background: transparent; border: none; color: #fff; font-size: 1.2rem; cursor: pointer; padding: 0.5rem; border-radius: 8px; transition: background 0.2s; }
  .menu-trigger:hover { background: rgba(255,255,255,0.1); }
  .project-title { font-size: 1rem; font-weight: 500; letter-spacing: -0.01em; color: rgba(255,255,255,0.9); }
  
  .main-content { flex: 1; position: relative; transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), filter 0.4s; }
  .main-content.dim { opacity: 0.2; filter: blur(10px); }

  .sidebar { position: absolute; top: 0; right: 0; width: 360px; height: 100%; background: rgba(20, 20, 25, 0.95); backdrop-filter: blur(30px); color: #fff; padding: 2rem; z-index: 150; border-left: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; box-shadow: -20px 0 50px rgba(0,0,0,0.5); }
  .sidebar-header { margin-bottom: 2.5rem; }
  .sidebar-header h2 { font-size: 1.5rem; font-weight: 600; margin: 0 0 0.5rem 0; letter-spacing: -0.02em; }
  .node-type-tag { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: #0071e3; font-weight: 700; background: rgba(0, 113, 227, 0.1); padding: 0.2rem 0.6rem; border-radius: 4px; }
  
  .sidebar-actions { flex: 1; display: flex; flex-direction: column; gap: 1rem; }
  .action-btn { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.2rem; border-radius: 12px; border: none; font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.2s; text-align: left; }
  .action-btn .icon { font-size: 1.2rem; }
  .action-btn.primary { background: #0071e3; color: white; }
  .action-btn.primary:hover { background: #0077ed; transform: translateY(-1px); }
  .action-btn.secondary { background: rgba(255,255,255,0.1); color: white; }
  .action-btn.secondary:hover { background: rgba(255,255,255,0.15); transform: translateY(-1px); }
  
  .sidebar-footer { margin-top: auto; padding-top: 2rem; }
  .close-btn { width: 100%; padding: 0.8rem; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: rgba(255,255,255,0.6); border-radius: 10px; cursor: pointer; font-size: 0.85rem; }

  .editor-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #fff; z-index: 300; display: flex; flex-direction: column; }
  .editor-container { width: 100%; height: 100%; display: flex; flex-direction: column; }
  .editor-header { height: 60px; display: flex; align-items: center; justify-content: space-between; padding: 0 2rem; border-bottom: 1px solid #f5f5f7; background: #fff; }
  .back-btn { background: transparent; border: none; color: #0071e3; font-weight: 500; cursor: pointer; font-size: 0.9rem; }
  .editor-status { font-size: 0.75rem; color: #86868b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }

  .chat-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 400; backdrop-filter: blur(10px); }
  .chat-panel { background: #fff; color: #000; border-radius: 20px; width: 540px; height: 700px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,0.4); }
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

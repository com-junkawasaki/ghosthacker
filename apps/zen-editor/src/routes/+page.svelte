<script lang="ts">
  console.log("+page script evaluated");
  import Editor from '../components/Editor.svelte';
  import Topology from '../components/Topology.svelte';
  import { onMount } from 'svelte';
  import { client } from '../lib/api';

  // Svelte 5 Runes
  let viewMode = $state('topology');
  let metadata = $state({ title: "Ghost Hacker", description: "", episodes: [] });
  let selectedNode = $state(null);
  let multiSelection = $state([]);
  let isEditorOpen = $state(false);
  let isChatOpen = $state(false);
  
  let chatMessages = $state([]);
  let chatInput = $state("");

  $effect(() => {
    console.log("+page $effect started");
    client.getProjectMetadata({ projectId: "251022" })
      .then(resp => {
        metadata = {
          title: resp.title,
          description: resp.description,
          episodes: resp.episodes.map(ep => ({
            id: ep.id,
            title: ep.title,
            files: [...ep.files]
          }))
        };
      })
      .catch(err => {
        console.error("Failed to load project metadata:", err);
      });
  });

  function handleNodeSelect(node, allSelected) {
    selectedNode = node;
    multiSelection = allSelected;
  }

  async function sendChatMessage() {
    if (!chatInput) return;
    
    const msg = chatInput;
    chatInput = "";
    chatMessages = [...chatMessages, { role: 'user', text: msg }];

    try {
      const stream = client.interact();
      await stream.requests.send({
        nodeIds: multiSelection.map(n => n.id),
        userMessage: msg
      });
      await stream.requests.complete();

      for await (const response of stream.responses) {
        chatMessages = [...chatMessages, { 
          role: 'assistant', 
          name: response.nodeName,
          text: response.message,
          emotions: response.emotionVector
        }];
      }
    } catch (err) {
      console.error("Interaction failed:", err);
    }
  }

  function closeChat() { isChatOpen = false; }
  function closeEditor() { isEditorOpen = false; }
</script>

<div class="app-layout">
  <nav class="sidebar">
    <div class="sidebar-header">
      <h1 class="app-title">{metadata.title}</h1>
      <p class="app-desc">MCP + A2A Interaction Engine</p>
    </div>
    
    <div class="nav-group">
      <button class:active={viewMode === 'topology'} onclick={() => viewMode = 'topology'}>
        <span class="icon">⬢</span> Graph Topology
      </button>
    </div>

    <div class="selection-detail">
      {#if multiSelection.length > 1}
        <div class="detail-card interaction">
          <h3>A2A Mode Active</h3>
          <p>{multiSelection.length} Entities Selected</p>
          <button class="action-btn" onclick={() => isChatOpen = true}>Start Multi-Agent Chat</button>
        </div>
      {:else if selectedNode}
        <div class="detail-card">
          <h3>Selected Node</h3>
          <p class="node-label">{selectedNode.label}</p>
          <p class="node-type">{selectedNode.type}</p>
          <div class="card-actions">
            {#if selectedNode.filePath || selectedNode.type === 'manuscript'}
              <button class="action-btn" onclick={() => isEditorOpen = true}>Edit Content</button>
            {/if}
            <button class="action-btn secondary" onclick={() => isChatOpen = true}>Chat with Node</button>
          </div>
        </div>
      {:else}
        <p class="hint">Select nodes in the graph to interact or edit.</p>
      {/if}
    </div>

    <div class="sidebar-footer">
      <span class="status-dot online"></span> 2065 Tokyo Connectivity
    </div>
  </nav>

  <main class="content">
    <div class="topology-wrapper" class:dimmed={isEditorOpen || isChatOpen}>
      <header class="view-header">
        <h1>Topology Mode</h1>
        <p>Interactive world graph. Shift+Click for Multi-Agent A2A.</p>
      </header>
      <div class="topology-canvas">
        <Topology onSelect={handleNodeSelect} />
      </div>
    </div>

    {#if isEditorOpen && selectedNode}
      <div class="overlay editor-overlay">
        <button class="close-overlay" onclick={closeEditor}>✕ Close Zen Mode</button>
        <div class="overlay-content">
          <Editor bind:filePath={selectedNode.filePath} />
        </div>
      </div>
    {/if}

    {#if isChatOpen}
      <div class="overlay chat-overlay">
        <div class="chat-header">
          <h2>Interaction: {multiSelection.map(n => n.label).join(', ')}</h2>
          <button class="close-btn" onclick={closeChat}>✕</button>
        </div>
        <div class="chat-history">
          {#each chatMessages as m}
            <div class="message" class:user={m.role === 'user'}>
              {#if m.role !== 'user'}<span class="speaker">{m.name}</span>{/if}
              <div class="msg-bubble">
                {m.text}
                {#if m.emotions}
                  <div class="msg-emotions">
                    {#each Object.entries(m.emotions) as [e, v]}
                      {#if v > 0.1}<span class="e-tag">{e}: {v.toFixed(1)}</span>{/if}
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
        <div class="chat-input-area">
          <input 
            type="text" 
            bind:value={chatInput} 
            placeholder="Send message to participating nodes..." 
            onkeydown={e => e.key === 'Enter' && sendChatMessage()}
          />
          <button onclick={sendChatMessage}>Send</button>
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
    background: #ffffff;
    color: #1d1d1f;
    -webkit-font-smoothing: antialiased;
  }
  .app-layout { display: flex; height: 100vh; overflow: hidden; }
  
  .sidebar { 
    width: 300px; 
    background: #f5f5f7; 
    border-right: 1px solid #d2d2d7; 
    display: flex; 
    flex-direction: column; 
    padding: 1.5rem;
    z-index: 20;
  }

  .sidebar-header { margin-bottom: 2rem; }
  .app-title { font-weight: 700; font-size: 1.1rem; margin: 0; }
  .app-desc { font-size: 0.75rem; color: #86868b; margin: 0.2rem 0 0 0; }

  .nav-group { margin-bottom: 2rem; }
  .sidebar button { 
    width: 100%;
    background: transparent; 
    border: none; 
    text-align: left; 
    padding: 0.6rem 0.8rem; 
    cursor: pointer; 
    border-radius: 8px; 
    font-size: 0.9rem; 
    display: flex; 
    align-items: center; 
    gap: 0.6rem; 
    color: #1d1d1f;
    transition: all 0.2s;
  }
  .sidebar button.active { background: #0071e3; color: white; }

  .selection-detail { flex: 1; margin-top: 1rem; }
  .detail-card { 
    background: white; 
    padding: 1.2rem; 
    border-radius: 14px; 
    border: 1px solid #d2d2d7;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }
  .detail-card h3 { font-size: 0.7rem; text-transform: uppercase; color: #86868b; margin: 0 0 0.8rem 0; letter-spacing: 0.05em; }
  .node-label { font-weight: 700; font-size: 1.1rem; margin: 0; }
  .node-type { font-size: 0.75rem; color: #0071e3; margin: 0.2rem 0 1.2rem 0; font-weight: 600; text-transform: capitalize; }
  
  .card-actions { display: flex; flex-direction: column; gap: 0.6rem; }
  .action-btn { 
    width: 100%; 
    background: #0071e3; 
    color: white; 
    border: none;
    padding: 0.7rem;
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    justify-content: center;
    transition: background 0.2s;
  }
  .action-btn.secondary { background: #e8e8ed; color: #1d1d1f; }
  .action-btn:hover { opacity: 0.9; }

  .hint { font-size: 0.8rem; color: #86868b; line-height: 1.5; text-align: center; margin-top: 2rem; }

  .sidebar-footer { padding-top: 1rem; font-size: 0.75rem; color: #86868b; display: flex; align-items: center; gap: 0.5rem; }
  .status-dot.online { width: 6px; height: 6px; background: #34c759; border-radius: 50%; }

  .content { flex: 1; height: 100%; overflow: hidden; background: #fff; position: relative; }

  .topology-wrapper { height: 100%; display: flex; flex-direction: column; padding: 2rem 3rem; box-sizing: border-box; transition: filter 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
  .topology-wrapper.dimmed { filter: blur(15px) grayscale(0.8); pointer-events: none; }

  .view-header { margin-bottom: 1.5rem; }
  .view-header h1 { font-size: 1.8rem; font-weight: 800; margin: 0; letter-spacing: -0.02em; }
  .view-header p { color: #86868b; font-size: 1rem; margin-top: 0.4rem; }
  .topology-canvas { flex: 1; border: 1px solid #f5f5f7; border-radius: 20px; overflow: hidden; background: #fafafa; }

  .overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(10px);
    z-index: 100;
    display: flex;
    flex-direction: column;
    animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  @keyframes fadeIn { from { opacity: 0; transform: scale(1.02); } to { opacity: 1; transform: scale(1); } }

  .chat-overlay {
    width: 480px;
    left: auto;
    border-left: 1px solid #d2d2d7;
    box-shadow: -15px 0 40px rgba(0,0,0,0.08);
  }

  .chat-header { padding: 1.5rem; border-bottom: 1px solid #f5f5f7; display: flex; justify-content: space-between; align-items: center; background: white; }
  .chat-header h2 { font-size: 0.95rem; margin: 0; font-weight: 700; color: #1d1d1f; }
  .close-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #86868b; }

  .chat-history { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.2rem; }
  .message { display: flex; flex-direction: column; max-width: 88%; }
  .message.user { align-self: flex-end; align-items: flex-end; }
  .speaker { font-size: 0.65rem; font-weight: 800; color: #0071e3; margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.03em; }
  .msg-bubble { background: #f5f5f7; padding: 0.9rem 1.1rem; border-radius: 20px; font-size: 0.92rem; line-height: 1.6; color: #1d1d1f; }
  .user .msg-bubble { background: #0071e3; color: white; border-bottom-right-radius: 4px; }
  .assistant .msg-bubble { border-bottom-left-radius: 4px; }

  .msg-emotions { margin-top: 0.6rem; display: flex; gap: 0.4rem; flex-wrap: wrap; }
  .e-tag { font-size: 0.6rem; background: white; border: 1px solid #d2d2d7; padding: 0.15rem 0.5rem; border-radius: 10px; font-weight: 600; color: #424245; }

  .chat-input-area { padding: 1.5rem; border-top: 1px solid #f5f5f7; display: flex; gap: 0.8rem; background: white; }
  .chat-input-area input { flex: 1; border: 1px solid #d2d2d7; border-radius: 24px; padding: 0.7rem 1.2rem; outline: none; font-size: 0.9rem; transition: border-color 0.2s; }
  .chat-input-area input:focus { border-color: #0071e3; }
  .chat-input-area button { background: #0071e3; color: white; border: none; padding: 0 1.4rem; border-radius: 24px; font-weight: 700; font-size: 0.85rem; cursor: pointer; }

  .close-overlay {
    position: absolute;
    top: 2rem; right: 2rem;
    background: #1d1d1f;
    color: white;
    border: none;
    padding: 0.7rem 1.4rem;
    border-radius: 24px;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    z-index: 110;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  .overlay-content { flex: 1; overflow: hidden; }
</style>

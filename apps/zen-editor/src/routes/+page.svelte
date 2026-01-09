<script lang="ts">
  console.log("+page script evaluated");
  import Editor from '../components/Editor.svelte';
  import Topology from '../components/TopologyWebGPU.svelte';
  import { onMount } from 'svelte';
  import { client } from '../lib/api';
  import { fly, fade } from 'svelte/transition';

  interface NodeData {
    id: string;
    label: string;
    type: string;
    content?: string;
    filePath?: string;
    group: string;
  }

  // Svelte 5 Runes
  let viewMode = $state('topology');
  let metadata = $state<{title: string, description: string, episodes: any[]}>({ title: "Ghost Hacker", description: "", episodes: [] });
  let selectedNode = $state<NodeData | null>(null);
  let multiSelection = $state<NodeData[]>([]);
  let isEditorOpen = $state(false);
  let isChatOpen = $state(false);
  let isSidebarOpen = $state(false);
  
  let chatMessages = $state<any[]>([]);
  let chatInput = $state("");

  $effect(() => {
    console.log("+page $effect started");
    client.getProjectMetadata({ projectId: "251022" })
      .then(resp => {
        console.log("Metadata received:", resp.title);
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

  function handleNodeSelect(node: any, allSelected: any[] = []) {
    console.log("Node selected:", node?.id, "Total selected:", allSelected?.length);
    selectedNode = node;
    multiSelection = allSelected || [];
    
    if (node) {
      const isContent = node.filePath || node.type === 'gh:Manuscript' || node.type === 'manuscript' || node.type === 'gh:Block';
      if (isContent) {
        isEditorOpen = true;
        isChatOpen = false;
      } else {
        isSidebarOpen = true;
      }
    }
  }

  async function sendChatMessage() {
    if (!chatInput) return;
    
    const msg = chatInput;
    chatInput = "";
      chatMessages = [...chatMessages, { role: 'user', text: msg }];

      try {
        const responseStream = client.interact({
          nodeIds: multiSelection.map(n => n.id),
          userMessage: msg,
          sessionId: "session-1",
          emotionBias: {}
        });

        for await (const response of responseStream) {
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
      {console.log("Rendering app-layout")}
      <button class="menu-trigger" onclick={() => isSidebarOpen = true} aria-label="Open Menu">
        <span class="icon">☰</span>
      </button>

      {#if isSidebarOpen}
        <div class="sidebar-backdrop" onclick={() => isSidebarOpen = false} onkeydown={e => e.key === 'Escape' && (isSidebarOpen = false)} role="button" tabindex="0" aria-label="Close sidebar" transition:fade={{ duration: 200 }}></div>
        <nav class="sidebar" transition:fly={{ x: -340, duration: 400, opacity: 1 }}>
          <div class="sidebar-header">
            <div class="title-stack">
              <h1 class="app-title">{metadata.title}</h1>
              <p class="app-desc">A2A Interaction Engine</p>
            </div>
            <button class="close-sidebar" onclick={() => isSidebarOpen = false}>✕</button>
          </div>
          
          <div class="nav-group index-group">
            <h2 class="group-title">Story Index</h2>
            <div class="episode-list">
              {#each metadata.episodes as ep}
                <div class="episode-item">
                  <span class="episode-name">{ep.title}</span>
                  <ul class="file-list">
                    {#each ep.files as file}
                      <li class="file-item">{file}</li>
                    {/each}
                  </ul>
                </div>
              {/each}
            </div>
          </div>

          <div class="selection-detail">
            {#if multiSelection.length > 1}
              <div class="detail-card interaction">
                <p class="mode-tag">A2A Mode Active</p>
                <p>{multiSelection.length} Entities Selected</p>
                <button class="action-btn" onclick={() => { isChatOpen = true; isSidebarOpen = false; }}>Start Multi-Agent Chat</button>
              </div>
            {:else if selectedNode}
              <div class="detail-card">
                <p class="node-type">{selectedNode.type}</p>
                <h3 class="node-label">{selectedNode.label}</h3>
                
                {#if selectedNode.content}
                  <div class="node-content-preview">
                    {selectedNode.content}
                  </div>
                {/if}

                <div class="card-actions">
                  {#if selectedNode.filePath || selectedNode.type === 'gh:Manuscript' || selectedNode.type === 'manuscript' || selectedNode.type === 'gh:Block'}
                    <button class="action-btn" onclick={() => { isEditorOpen = true; isSidebarOpen = false; }}>Edit Content</button>
                  {/if}
                  <button class="action-btn secondary" onclick={() => { isChatOpen = true; isSidebarOpen = false; }}>Chat with Node</button>
                </div>
              </div>
            {:else}
              <p class="hint">Select nodes in the graph to interact.</p>
            {/if}
          </div>

          <div class="sidebar-footer">
            <span class="status-dot online"></span> Tokyo 2065 Node
          </div>
        </nav>
      {/if}

      <main class="content" class:panel-open={isEditorOpen || isChatOpen}>
        <div class="topology-wrapper">
          <div class="topology-canvas">
            <Topology onSelect={handleNodeSelect} />
          </div>
        </div>

        {#if isEditorOpen && selectedNode}
          <div class="side-panel editor-panel" transition:fly={{ x: 600, duration: 400, opacity: 1 }}>
            <div class="panel-header">
              <h2 class="panel-title">Zen Edit: {selectedNode.label}</h2>
              <button class="close-panel" onclick={closeEditor}>✕</button>
            </div>
            <div class="panel-content">
              {#if selectedNode.filePath}
                <Editor bind:filePath={selectedNode.filePath} initialContent={selectedNode.content || ""} />
              {:else}
                <Editor initialContent={selectedNode.content || ""} />
              {/if}
            </div>
          </div>
        {/if}

        {#if isChatOpen}
          <div class="side-panel chat-panel" transition:fly={{ x: 480, duration: 400, opacity: 1 }}>
            <div class="panel-header">
              <h2 class="panel-title">Interaction: {multiSelection.map(n => n.label).join(', ')}</h2>
              <button class="close-panel" onclick={closeChat}>✕</button>
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
                          {#if Number(v) > 0.1}<span class="e-tag">{e}: {Number(v).toFixed(1)}</span>{/if}
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
                placeholder="Send message..." 
                data-testid="chat-input"
                onkeydown={e => e.key === 'Enter' && sendChatMessage()}
              />
              <button class="send-btn" onclick={sendChatMessage}>Send</button>
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
      .app-layout { display: flex; height: 100vh; overflow: hidden; position: relative; }
      
      .sidebar { 
        position: absolute;
        top: 0;
        left: 0;
        width: 340px; 
        height: 100%;
        background: rgba(255, 255, 255, 0.98); 
        backdrop-filter: blur(30px);
        border-right: 1px solid #d2d2d7; 
        display: flex; 
        flex-direction: column; 
        padding: 2rem;
        z-index: 1000;
        box-shadow: 20px 0 50px rgba(0,0,0,0.1);
      }

      .sidebar-backdrop {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.2);
        z-index: 999;
        backdrop-filter: blur(4px);
      }

      .menu-trigger {
        position: absolute;
        top: 2rem;
        left: 2rem;
        width: 56px;
        height: 56px;
        background: white;
        border: 1px solid #d2d2d7;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 500;
        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: 1.2rem;
      }
      .menu-trigger:active { transform: scale(0.92); background: #f5f5f7; }

      .sidebar-header { margin-bottom: 2.5rem; display: flex; justify-content: space-between; align-items: flex-start; }
      .close-sidebar { background: #f5f5f7; border: none; font-size: 1rem; color: #1d1d1f; cursor: pointer; padding: 0.6rem; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
      .app-title { font-weight: 800; font-size: 1.25rem; margin: 0; letter-spacing: -0.02em; }
      .app-desc { font-size: 0.8rem; color: #86868b; margin: 0.3rem 0 0 0; }

      .nav-group { margin-bottom: 2rem; }
      .group-title { font-size: 0.75rem; text-transform: uppercase; color: #86868b; margin-bottom: 1rem; letter-spacing: 0.1em; font-weight: 700; }

      .index-group { flex: 1; min-height: 0; overflow-y: auto; margin-bottom: 2rem; -webkit-overflow-scrolling: touch; }
      .episode-list { display: flex; flex-direction: column; gap: 1.2rem; }
      .episode-name { font-size: 0.9rem; font-weight: 700; color: #1d1d1f; display: block; margin-bottom: 0.6rem; }
      .file-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.4rem; }
      .file-item { font-size: 0.85rem; color: #424245; padding: 0.6rem 0.8rem; border-radius: 10px; cursor: pointer; transition: all 0.2s; background: #f5f5f7; }
      .file-item:active { background: #e8e8ed; transform: scale(0.98); }

      .selection-detail { margin-top: 1rem; }
      .detail-card { 
        background: white; 
        padding: 1.5rem; 
        border-radius: 20px; 
        border: 1px solid #d2d2d7;
        box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      }
      .mode-tag { font-size: 0.7rem; text-transform: uppercase; color: #0071e3; font-weight: 800; margin-bottom: 0.5rem; }
      .node-label { font-weight: 800; font-size: 1.2rem; margin: 0; }
      .node-type { font-size: 0.75rem; color: #86868b; margin: 0 0 0.4rem 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
      
      .node-content-preview {
        font-size: 0.95rem;
        color: #1d1d1f;
        background: #f5f5f7;
        padding: 1rem;
        border-radius: 12px;
        margin: 1rem 0 1.5rem 0;
        max-height: 200px;
        overflow-y: auto;
        line-height: 1.6;
        border: 1px solid #d2d2d7;
      }

      .card-actions { display: flex; flex-direction: column; gap: 0.8rem; }
      .action-btn { 
        width: 100%; 
        background: #0071e3; 
        color: white; 
        border: none;
        padding: 1rem;
        border-radius: 14px;
        font-size: 0.95rem;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        justify-content: center;
        transition: all 0.2s;
      }
      .action-btn:active { transform: scale(0.96); opacity: 0.9; }
      .action-btn.secondary { background: #e8e8ed; color: #1d1d1f; }

      .topology-wrapper { height: 100%; display: flex; flex-direction: column; padding: 0; box-sizing: border-box; transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
      .panel-open .topology-wrapper { transform: scale(0.98); opacity: 0.8; filter: blur(4px); pointer-events: none; }
      .topology-canvas { flex: 1; border: none; border-radius: 0; overflow: hidden; background: #fff; }

      .side-panel {
        position: absolute;
        top: 0;
        right: 0;
        height: 100%;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        border-left: 1px solid #d2d2d7;
        z-index: 100;
        display: flex;
        flex-direction: column;
        box-shadow: -20px 0 50px rgba(0,0,0,0.1);
      }

      .editor-panel { width: 600px; }
      .chat-panel { width: 480px; }

      .panel-header {
        padding: 1.5rem 2rem;
        border-bottom: 1px solid #f5f5f7;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: white;
      }
      .panel-title { font-size: 1rem; font-weight: 700; margin: 0; color: #1d1d1f; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .close-panel { background: #f5f5f7; border: none; font-size: 1.2rem; cursor: pointer; color: #86868b; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
      .close-panel:hover { background: #e8e8ed; color: #1d1d1f; }

      .panel-content { flex: 1; overflow: hidden; }

      .chat-history { flex: 1; overflow-y: auto; padding: 2rem; display: flex; flex-direction: column; gap: 1.5rem; }
      .message { display: flex; flex-direction: column; max-width: 85%; }
      .message.user { align-self: flex-end; align-items: flex-end; }
      .speaker { font-size: 0.7rem; font-weight: 800; color: #0071e3; margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em; }
      .msg-bubble { background: #f5f5f7; padding: 1rem 1.2rem; border-radius: 20px; font-size: 0.95rem; line-height: 1.6; color: #1d1d1f; }
      .user .msg-bubble { background: #0071e3; color: white; border-bottom-right-radius: 4px; }

      .msg-emotions { margin-top: 0.8rem; display: flex; gap: 0.5rem; flex-wrap: wrap; }
      .e-tag { font-size: 0.65rem; background: white; border: 1px solid #d2d2d7; padding: 0.2rem 0.6rem; border-radius: 12px; font-weight: 600; color: #424245; }

      .chat-input-area { padding: 1.5rem 2rem; border-top: 1px solid #f5f5f7; display: flex; gap: 1rem; background: white; }
      .chat-input-area input { flex: 1; border: 1px solid #d2d2d7; border-radius: 24px; padding: 0.8rem 1.4rem; outline: none; font-size: 0.95rem; transition: border-color 0.2s; }
      .chat-input-area input:focus { border-color: #0071e3; }
      .send-btn { background: #0071e3; color: white; border: none; padding: 0 1.6rem; border-radius: 24px; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; }
      .send-btn:active { transform: scale(0.95); opacity: 0.9; }
</style>

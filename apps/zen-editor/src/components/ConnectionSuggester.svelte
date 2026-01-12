<script lang="ts">
  import { getClient } from '../lib/api';
  import { onMount } from 'svelte';

  let { node, projectId, onConnect = () => {} } = $props<{
    node: any;
    projectId: string;
    onConnect?: (fromId: string, toId: string, relation: string) => void;
  }>();

  let suggestions = $state<any[]>([]);
  let isAnalyzing = $state(false);
  let error = $state("");

  async function analyzeConnections() {
    isAnalyzing = true;
    error = "";
    try {
      const client = await getClient();
      if (!client) return;

      const result = await client.callTool({
        name: "analyze_links",
        argumentsJson: JSON.stringify({
          node_ids: [node.id],
          project_id: projectId
        })
      });

      if (result.isError) {
        error = result.resultJson;
      } else {
        const data = JSON.parse(result.resultJson);
        // The tool returns a text result in result.content[0].text if using MCP directly
        // but our backend wrapper might have already parsed it.
        // Let's assume it's raw text for now based on backend code.
        const content = data.content?.[0]?.text || data;
        try {
          // Attempt to extract JSON from AI response
          const jsonMatch = content.match(/\[.*\]/s);
          if (jsonMatch) {
            suggestions = JSON.parse(jsonMatch[0]);
          } else {
            suggestions = [];
            error = "No structured suggestions found in AI response.";
          }
        } catch (e) {
          error = "Failed to parse AI suggestions.";
          console.error(e, content);
        }
      }
    } catch (err: any) {
      error = err.message;
    } finally {
      isAnalyzing = false;
    }
  }

  async function handleConnect(suggestion: any) {
    try {
      const client = await getClient();
      if (!client) return;

      // In a real implementation, we would add this to the JSON-LD graph.
      // For now, we'll notify the parent to update the UI.
      onConnect(suggestion.from, suggestion.to, suggestion.relation);
      alert(`Connected ${suggestion.from} to ${suggestion.to} via ${suggestion.relation}`);
    } catch (err) {
      console.error(err);
    }
  }

  onMount(() => {
    analyzeConnections();
  });
</script>

<div class="suggester-container">
  <header>
    <h3>Connection Suggestions</h3>
    <p>LLM analysis for unlinked node: <strong>{node.label}</strong></p>
  </header>

  {#if isAnalyzing}
    <div class="loading">
      <div class="spinner"></div>
      <span>Analyzing story context...</span>
    </div>
  {:else if error}
    <div class="error">
      {error}
      <button onclick={analyzeConnections}>Retry</button>
    </div>
  {:else if suggestions.length > 0}
    <div class="suggestion-list">
      {#each suggestions as s}
        <div class="suggestion-card">
          <div class="rel-badge">{s.relation}</div>
          <h4>To: {s.to}</h4>
          <p>{s.description}</p>
          <button class="connect-btn" onclick={() => handleConnect(s)}>Connect Node</button>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty">No suggestions found.</div>
  {/if}
</div>

<style>
  .suggester-container {
    padding: 1.5rem;
    color: white;
    height: 100%;
    overflow-y: auto;
    background: #0a0a0f;
  }

  header h3 { margin: 0 0 0.5rem 0; color: #ff9500; }
  header p { font-size: 0.9rem; color: #888; margin-bottom: 1.5rem; }

  .loading, .error, .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
    color: #666;
  }

  .spinner {
    width: 30px;
    height: 30px;
    border: 2px solid rgba(255, 149, 0, 0.1);
    border-top-color: #ff9500;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .suggestion-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .suggestion-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 1rem;
    transition: transform 0.2s;
  }

  .suggestion-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 149, 0, 0.3);
  }

  .rel-badge {
    display: inline-block;
    padding: 2px 8px;
    background: rgba(255, 149, 0, 0.1);
    color: #ff9500;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
  }

  h4 { margin: 0 0 0.5rem 0; font-size: 1rem; }
  p { font-size: 0.85rem; color: #aaa; margin-bottom: 1rem; line-height: 1.4; }

  .connect-btn {
    width: 100%;
    padding: 8px;
    background: #ff9500;
    color: black;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    font-size: 0.85rem;
  }

  .connect-btn:hover { background: #ffaa33; }

  .error button {
    margin-top: 1rem;
    padding: 6px 12px;
    background: #333;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
</style>


<script lang="ts">
  import { client } from '../lib/api';

  let { } = $props<{}>();

  type Scene = {
    id: number;
    visual: string;
    description: string;
    audio: string;
    timing: string;
    fps: number;
    isGenerating?: boolean;
  };

  let scenes = $state<Scene[]>([]);
  let isGenerating = $state(false);
  let prompt = $state("Generate a high-tension confrontation scene between Kaede and the antagonist in an abandoned server room.");

  async function generateWithAI() {
    if (isGenerating) return;
    isGenerating = true;
    
    // Clear existing scenes or start from where we are
    // For now, let's start fresh for the generation demo
    scenes = [];

    try {
      const it = client.interact({
        sessionId: "storyboard-gen-" + Date.now(),
        userMessage: `Please generate a detailed storyboard for the following prompt: "${prompt}". 
        Format each scene as follows:
        [SCENE]
        VISUAL: (Describe the visual sketch/shot)
        DESC: (Describe what is happening)
        AUDIO: (Dialogue and sound effects)
        TIME: (Duration in seconds, e.g., 5s)
        [END_SCENE]
        Provide at least 3-5 scenes.`,
      });

      let currentScene: Partial<Scene> | null = null;
      let buffer = "";

      for await (const resp of it) {
        buffer += resp.message;
        
        // Simple parser for the custom format
        if (buffer.includes("[SCENE]")) {
          buffer = buffer.split("[SCENE]")[1] || "";
          currentScene = {
            id: scenes.length + 1,
            visual: "Generating...",
            description: "",
            audio: "",
            timing: "0s",
            fps: 24,
            isGenerating: true
          };
          scenes.push(currentScene as Scene);
        }

        if (currentScene && buffer.includes("[END_SCENE]")) {
          const content = buffer.split("[END_SCENE]")[0] || "";
          parseSceneContent(content, currentScene);
          currentScene.isGenerating = false;
          currentScene = null;
          buffer = buffer.split("[END_SCENE]")[1] || "";
        } else if (currentScene) {
          parseSceneContent(buffer, currentScene);
        }
      }
    } catch (err) {
      console.error("AI Generation failed:", err);
    } finally {
      isGenerating = false;
    }
  }

  function parseSceneContent(text: string, scene: Partial<Scene>) {
    const visualMatch = text.match(/VISUAL:\s*(.*?)(?=\n|DESC:|$)/s);
    const descMatch = text.match(/DESC:\s*(.*?)(?=\n|AUDIO:|$)/s);
    const audioMatch = text.match(/AUDIO:\s*(.*?)(?=\n|TIME:|$)/s);
    const timeMatch = text.match(/TIME:\s*(.*?)(?=\n|$)/s);

    if (visualMatch?.[1]) scene.visual = visualMatch[1].trim();
    if (descMatch?.[1]) scene.description = descMatch[1].trim();
    if (audioMatch?.[1]) scene.audio = audioMatch[1].trim();
    if (timeMatch?.[1]) scene.timing = timeMatch[1].trim();
  }

  function addScene() {
    const nextId = scenes.length > 0 ? Math.max(...scenes.map(s => s.id)) : 0;
    scenes.push({
      id: nextId + 1,
      visual: "",
      description: "",
      audio: "",
      timing: "0s",
      fps: 24
    });
  }

  function removeScene(id: number) {
    scenes = scenes.filter(s => s.id !== id);
  }
</script>

<div class="storyboard-container">
  <div class="storyboard-controls">
    <div class="prompt-box">
      <input type="text" bind:value={prompt} placeholder="Enter story prompt..." />
      <button class="ai-gen-btn" onclick={generateWithAI} disabled={isGenerating}>
        {isGenerating ? "Generating..." : "Generate with AI"}
      </button>
    </div>
  </div>

  <div class="storyboard-view">
    <div class="storyboard-header">
      <div class="col-no">No.</div>
      <div class="col-visual">画面 (Visual)</div>
      <div class="col-desc">説明 (Description)</div>
      <div class="col-audio">音声 (Audio)</div>
      <div class="col-time">尺 (Time)</div>
    </div>

    <div class="scene-list">
      {#each scenes as scene (scene.id)}
        <div class="scene-row" class:generating={scene.isGenerating}>
          <div class="col-no">
            <span class="scene-number">{scene.id}</span>
            <button class="delete-btn" onclick={() => removeScene(scene.id)}>✕</button>
            <div class="camera-indicator">
              <span class="arrow">↓</span>
              <span class="arrow">↘</span>
            </div>
          </div>
          
          <div class="col-visual">
            <div class="visual-container">
              {#if scene.visual && !scene.visual.startsWith("Generating")}
                <div class="sketch-area">
                  <div class="sketch-content">
                    {scene.visual}
                  </div>
                  <div class="sketch-footer">T.B.</div>
                </div>
              {:else}
                <div class="sketch-placeholder">
                  {#if scene.isGenerating}
                    <div class="loading-spinner"></div>
                  {:else}
                    <span class="icon">✎</span>
                    <span>No Sketch</span>
                  {/if}
                </div>
              {/if}
            </div>
          </div>

          <div class="col-desc">
            <textarea bind:value={scene.description} placeholder="Describe the scene..."></textarea>
          </div>

          <div class="col-audio">
            <textarea bind:value={scene.audio} placeholder="Dialogue & SE..."></textarea>
          </div>

          <div class="col-time">
            <input type="text" bind:value={scene.timing} class="time-input" />
            <div class="fps-select">
              <select bind:value={scene.fps}>
                <option value={24}>24 fps</option>
                <option value={30}>30 fps</option>
                <option value={60}>60 fps</option>
              </select>
            </div>
          </div>
        </div>
      {/each}

      <button class="add-scene-btn" onclick={addScene}>
        <span class="plus">+</span> Add Manual Scene
      </button>
    </div>
  </div>
</div>

<style>
  .storyboard-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #000;
  }

  .storyboard-controls {
    padding: 1.5rem;
    background: rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .prompt-box {
    display: flex;
    gap: 1rem;
    max-width: 900px;
    margin: 0 auto;
  }

  .prompt-box input {
    flex: 1;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    padding: 0.8rem 1.2rem;
    border-radius: 12px;
    font-size: 0.9rem;
  }

  .ai-gen-btn {
    background: #0071e3;
    color: white;
    border: none;
    padding: 0 1.5rem;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .ai-gen-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .storyboard-view {
    flex: 1;
    overflow-y: auto;
    background: #f5f5f7;
    color: #1d1d1f;
  }

  .storyboard-header {
    display: flex;
    background: #fff;
    padding: 0.8rem 1rem;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #d2d2d7;
    position: sticky;
    top: 0;
    z-index: 10;
    color: #86868b;
  }

  .scene-row {
    display: flex;
    background: #fff;
    border-bottom: 1px solid #d2d2d7;
    min-height: 220px;
    transition: background 0.3s;
  }

  .scene-row.generating { background: rgba(0, 113, 227, 0.02); }

  .col-no { width: 60px; display: flex; flex-direction: column; align-items: center; padding-top: 1.5rem; border-right: 1px solid #d2d2d7; position: relative; }
  .scene-number { font-size: 1.4rem; font-weight: 200; color: #ff3b30; }
  .delete-btn { margin-top: 1.5rem; background: transparent; border: none; color: #d2d2d7; cursor: pointer; }
  .delete-btn:hover { color: #ff3b30; }
  .camera-indicator { margin-top: auto; padding-bottom: 1rem; display: flex; flex-direction: column; color: #ff3b30; font-weight: bold; font-size: 1.2rem; }

  .col-visual { width: 320px; padding: 1rem; border-right: 1px solid #d2d2d7; }
  .visual-container { width: 100%; aspect-ratio: 16/9; background: #fff; border: 1px solid #d2d2d7; border-radius: 6px; overflow: hidden; box-shadow: inset 0 0 10px rgba(0,0,0,0.05); }
  .sketch-area { width: 100%; height: 100%; position: relative; background: #fff; background-image: 
    linear-gradient(#f0f0f0 1px, transparent 1px),
    linear-gradient(90deg, #f0f0f0 1px, transparent 1px);
    background-size: 20px 20px;
    display: flex; flex-direction: column; }
  .sketch-content { flex: 1; padding: 1rem; font-size: 0.7rem; color: #333; font-style: italic; line-height: 1.4; overflow: hidden; }
  .sketch-footer { padding: 0.2rem 0.5rem; font-size: 0.6rem; color: #999; border-top: 1px dashed #eee; text-align: right; font-family: monospace; }
  .sketch-placeholder { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #d2d2d7; gap: 0.5rem; }
  
  .col-desc, .col-audio { flex: 1; padding: 0.5rem; border-right: 1px solid #d2d2d7; }
  textarea { width: 100%; height: 100%; border: none; resize: none; background: transparent; padding: 0.8rem; font-size: 0.9rem; line-height: 1.6; color: #1d1d1f; }
  textarea:focus { outline: none; }

  .col-time { width: 100px; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
  .time-input { width: 100%; border: none; border-bottom: 1px solid #d2d2d7; font-size: 1.2rem; text-align: right; color: #ff3b30; padding: 0.2rem; background: transparent; }
  .fps-select select { width: 100%; border: none; font-size: 0.7rem; color: #86868b; background: transparent; }

  .add-scene-btn {
    display: block;
    margin: 3rem auto;
    padding: 1rem 3rem;
    border-radius: 20px;
    border: 1px dashed #d2d2d7;
    background: transparent;
    color: #0071e3;
    font-weight: 500;
    cursor: pointer;
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(0, 113, 227, 0.1);
    border-top-color: #0071e3;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
</style>


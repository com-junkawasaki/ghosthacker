<script lang="ts">
  import { onMount } from 'svelte';
  import { getClient } from '../lib/api';

  type Scene = {
    id: number;
    visual: string;
    description: string;
    audio: string;
    timing: string;
    fps: number;
    isGenerating?: boolean;
    // New fields for entities
    persons: string[];
    places: string[];
    items: string[];
    emotions: string[];
  };

  let { 
    scenes: initialScenes = [],
    projectId = "251121"
  } = $props<{ 
    scenes?: Scene[],
    projectId?: string
  }>();

  let scenes = $state<Scene[]>(initialScenes);
  let isGenerating = $state(false);
  let prompt = $state("");

  // Auto-save logic
  $effect(() => {
    // This effect runs whenever 'scenes' changes
    const timeout = setTimeout(() => {
      if (scenes.length > 0) {
        saveStoryboard();
      }
    }, 1000); // Debounce save by 1 second
    return () => clearTimeout(timeout);
  });

  onMount(async () => {
    if (scenes.length === 0) {
      await loadStoryboard();
    }
  });

  $effect(() => {
    if (projectId) {
      loadStoryboard();
    }
  });

  async function saveStoryboard() {
    console.log("saveStoryboard (auto-save)");
    try {
      const client = await getClient();
      if (!client) return;
      
      await client.saveStoryboard({
        projectId,
        scenes: scenes.map(s => ({
          id: s.id,
          visual: s.visual,
          description: s.description,
          audio: s.audio,
          timing: s.timing,
          fps: s.fps,
          persons: s.persons,
          places: s.places,
          items: s.items,
          emotions: s.emotions
        }))
      });
    } catch (err) {
      console.error("Failed to auto-save storyboard:", err);
    }
  }

  async function loadStoryboard() {
    try {
      const client = await getClient();
      if (!client) return;
      const resp = await client.getStoryboard({ projectId });
      if (resp && resp.scenes && resp.scenes.length > 0) {
        scenes = resp.scenes.map((s: any) => ({
          ...s,
          isGenerating: false
        }));
      }
    } catch (err) {
      console.error("Failed to load storyboard:", err);
    }
  }

  async function generateWithAI() {
    if (isGenerating) return;
    isGenerating = true;
    
    // Clear existing scenes or start from where we are
    // For now, let's start fresh for the generation demo
    scenes = [];

    try {
      const client = await getClient();
      if (!client) return;
      
      // Collect all entities from scenes if they exist, or use default prompt
      const allPersons = [...new Set(scenes.flatMap(s => s.persons))];
      const allPlaces = [...new Set(scenes.flatMap(s => s.places))];
      const allItems = [...new Set(scenes.flatMap(s => s.items))];
      const allEmotions = [...new Set(scenes.flatMap(s => s.emotions))];

      let contextInfo = "";
      if (allPersons.length > 0) contextInfo += `\nCharacters involved: ${allPersons.join(', ')}`;
      if (allPlaces.length > 0) contextInfo += `\nSetting: ${allPlaces.join(', ')}`;
      if (allItems.length > 0) contextInfo += `\nImportant Items: ${allItems.join(', ')}`;
      if (allEmotions.length > 0) contextInfo += `\nDominant Emotions: ${allEmotions.join(', ')}`;

      const it = client.interact({
        sessionId: "storyboard-gen-" + Date.now(),
        userMessage: `Please generate a detailed storyboard for the following prompt: "${prompt}". ${contextInfo}
        
        Format each scene as follows:
        [SCENE]
        VISUAL: (Describe the visual sketch/shot)
        DESC: (Describe what is happening)
        AUDIO: (Dialogue and sound effects)
        TIME: (Duration in seconds, e.g., 5s)
        [END_SCENE]
        Provide at least 3-5 scenes.`,
        nodeIds: [...allPersons, ...allPlaces, ...allItems],
        emotionBias: Object.fromEntries(allEmotions.map(em => [em, 1.0]))
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
            isGenerating: true,
            persons: [],
            places: [],
            items: [],
            emotions: []
          };
          scenes = [...scenes, currentScene as Scene];
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
    const newScene: Scene = {
      id: nextId + 1,
      visual: "",
      description: "",
      audio: "",
      timing: "0s",
      fps: 24,
      persons: [],
      places: [],
      items: [],
      emotions: []
    };
    scenes = [...scenes, newScene];
    console.log("Scene added, total:", scenes.length);
  }

  function removeScene(id: number) {
    scenes = scenes.filter(s => s.id !== id);
  }

  function handleDrop(e: DragEvent, scene: Scene, type: 'persons' | 'places' | 'items' | 'emotions') {
    e.preventDefault();
    const data = e.dataTransfer?.getData('application/json');
    if (data) {
      try {
        const node = JSON.parse(data);
        if (node.label && !scene[type].includes(node.label)) {
          scene[type].push(node.label);
        }
      } catch (err) {
        console.error("Failed to parse drop data:", err);
      }
    }
  }
</script>

<div class="storyboard-container">
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
          
          <div 
            class="col-visual"
            draggable="true"
            ondragstart={(e) => {
              e.dataTransfer?.setData('application/json', JSON.stringify({
                type: 'storyboard-scene',
                id: scene.id,
                visual: scene.visual,
                description: scene.description,
                image: scene.visual.startsWith("http") || scene.visual.startsWith("/") ? scene.visual : null
              }));
            }}
          >
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
            
            <div class="entity-slots" role="group" aria-label="Scene entities">
              <div 
                role="region" 
                aria-label="Characters"
                class="entity-slot" 
                ondragover={(e) => e.preventDefault()} 
                ondrop={(e) => handleDrop(e, scene, 'persons')}
              >
                <span class="label">人物:</span>
                <div class="entity-tags">
                  {#each scene.persons as p}
                    <span class="tag person">{p} <button onclick={() => scene.persons = scene.persons.filter(x => x !== p)}>×</button></span>
                  {/each}
                  {#if scene.persons.length === 0}
                    <span class="placeholder">Drop characters</span>
                  {/if}
                </div>
              </div>
              <div 
                role="region" 
                aria-label="Places"
                class="entity-slot" 
                ondragover={(e) => e.preventDefault()} 
                ondrop={(e) => handleDrop(e, scene, 'places')}
              >
                <span class="label">背景:</span>
                <div class="entity-tags">
                  {#each scene.places as p}
                    <span class="tag place">{p} <button onclick={() => scene.places = scene.places.filter(x => x !== p)}>×</button></span>
                  {/each}
                  {#if scene.places.length === 0}
                    <span class="placeholder">Drop places</span>
                  {/if}
                </div>
              </div>
              <div 
                role="region" 
                aria-label="Items"
                class="entity-slot" 
                ondragover={(e) => e.preventDefault()} 
                ondrop={(e) => handleDrop(e, scene, 'items')}
              >
                <span class="label">小物:</span>
                <div class="entity-tags">
                  {#each scene.items as i}
                    <span class="tag item">{i} <button onclick={() => scene.items = scene.items.filter(x => x !== i)}>×</button></span>
                  {/each}
                  {#if scene.items.length === 0}
                    <span class="placeholder">Drop items</span>
                  {/if}
                </div>
              </div>
              <div 
                role="region" 
                aria-label="Emotions"
                class="entity-slot" 
                ondragover={(e) => e.preventDefault()} 
                ondrop={(e) => handleDrop(e, scene, 'emotions')}
              >
                <span class="label">感情:</span>
                <div class="entity-tags">
                  {#each scene.emotions as em}
                    <span class="tag emotion">{em} <button onclick={() => scene.emotions = scene.emotions.filter(x => x !== em)}>×</button></span>
                  {/each}
                  {#if scene.emotions.length === 0}
                    <span class="placeholder">Drop emotions</span>
                  {/if}
                </div>
              </div>
            </div>
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
    background: var(--system-background);
  }

  .storyboard-controls {
    padding: 12px 20px;
    background: rgba(0, 0, 0, 0.5);
    border-bottom: 1px solid var(--tertiary-label);
  }

  .prompt-box {
    display: flex;
    gap: 8px;
    max-width: 800px;
    margin: 0 auto;
  }

  .prompt-box input {
    flex: 1;
    background: var(--tertiary-background);
    border: 1px solid var(--tertiary-label);
    color: var(--system-label);
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 0.85rem;
  }

  .ai-gen-btn {
    background: var(--accent-blue);
    color: white;
    padding: 0 16px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .save-btn {
    background: var(--accent-green);
    color: white;
    padding: 0 16px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .storyboard-view {
    flex: 1;
    overflow-y: auto;
    background: #000;
    padding: 20px;
  }

  .storyboard-header {
    display: none; /* Hide header in card layout */
  }

  .scene-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 900px;
    margin: 0 auto;
  }

  .scene-row {
    display: grid;
    grid-template-columns: 60px 320px 1fr 120px;
    background: var(--secondary-background);
    border: 1px solid var(--tertiary-label);
    border-radius: 12px;
    overflow: hidden;
    min-height: 200px;
    transition: transform 0.2s;
  }

  .scene-row:hover {
    transform: translateY(-2px);
    border-color: var(--secondary-label);
  }

  .col-no { display: flex; flex-direction: column; align-items: center; padding-top: 1rem; border-right: 1px solid var(--tertiary-label); background: rgba(0,0,0,0.2); }
  .scene-number { font-size: 1.2rem; font-weight: 700; color: var(--accent-red); }
  .delete-btn { margin-top: 1rem; color: var(--tertiary-label); }
  .delete-btn:hover { color: var(--accent-red); }

  .col-visual { padding: 12px; border-right: 1px solid var(--tertiary-label); }
  .visual-container { width: 100%; aspect-ratio: 16/9; background: #000; border: 1px solid var(--tertiary-label); border-radius: 8px; overflow: hidden; }
  
  .col-desc, .col-audio { padding: 8px; border-right: 1px solid var(--tertiary-label); display: flex; flex-direction: column; }
  textarea { width: 100%; flex: 1; border: none; background: transparent; padding: 8px; font-size: 0.85rem; line-height: 1.4; color: var(--system-label); }
  
  .entity-slots {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
    margin-top: 4px;
  }

  .entity-slot {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border: 1px solid var(--tertiary-label);
    border-radius: 4px;
    background: var(--tertiary-background);
  }

  .entity-slot .label {
    font-size: 0.7rem;
    color: #86868b;
    white-space: nowrap;
  }

  .entity-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    flex: 1;
  }

  .placeholder {
    font-size: 0.65rem;
    color: #d2d2d7;
    font-style: italic;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.75rem;
    color: white;
  }

  .tag.person { background: #0071e3; }
  .tag.place { background: #34c759; }
  .tag.item { background: #ff9500; }
  .tag.emotion { background: #af52de; }

  .tag button {
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .tag button:hover { opacity: 1; }

  .col-time { width: 120px; padding: 12px; display: flex; flex-direction: column; gap: 8px; background: rgba(0,0,0,0.1); }
  .time-input { width: 100%; border: 1px solid var(--tertiary-label); font-size: 1rem; text-align: right; color: var(--accent-red); padding: 4px; border-radius: 4px; }
  .fps-select select { width: 100%; border: 1px solid var(--tertiary-label); font-size: 0.7rem; color: var(--secondary-label); background: var(--tertiary-background); padding: 2px; border-radius: 4px; }

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


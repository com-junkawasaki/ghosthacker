<script lang="ts">
  let emotions = { Calm: 1.0, Joy: 0.2, Sadness: 0.1 };
  let content = "";

  $: backgroundColor = emotions.Joy > 0.5 ? 'rgba(255, 250, 230, 0.5)' : (emotions.Sadness > 0.5 ? 'rgba(230, 240, 255, 0.5)' : 'rgba(250, 250, 250, 1.0)');
</script>

<div class="zen-editor-container" style="background: {backgroundColor};">
  <textarea 
    class="zen-textarea" 
    placeholder="Write your story here..."
    bind:value={content}
  ></textarea>

  <div class="emotion-indicator">
    {#each Object.entries(emotions) as [name, score]}
      <div class="emotion-tag">
        <span class="dot" style="opacity: {score};"></span>
        {name}
      </div>
    {/each}
  </div>
</div>

<style>
  .zen-editor-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4rem 2rem;
    transition: background 2s ease-in-out;
  }

  .zen-textarea {
    width: 100%;
    max-width: 700px;
    min-height: 60vh;
    background: transparent;
    border: none;
    padding: 1rem;
    outline: none;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", serif;
    line-height: 1.8;
    font-size: 1.2rem;
    color: #1d1d1f;
    resize: none;
  }

  .emotion-indicator {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    display: flex;
    gap: 1rem;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }

  .emotion-tag {
    font-size: 0.8rem;
    color: #86868b;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    background: #0071e3;
    border-radius: 50%;
  }
</style>

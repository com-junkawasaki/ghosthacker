<script lang="ts">
  import Editor from '../components/Editor.svelte';
  import Topology from '../components/TopologyWebGPU.svelte';
</script>

<div class="app-layout">
  <div class="main-content">
      <Topology onSelect={() => {}} />
  </div>
</div>

<style>
  .app-layout { width: 100vw; height: 100vh; background: #000; }
  .main-content { width: 100%; height: 100%; }
</style>

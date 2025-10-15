{
  // Ghost Hacker Producer Pipeline Topology
  // Merkle DAG: pipeline nodes -> dependencies -> execution order

  pipeline: [
    // Lore: Protagonist Node
    {
      id: 'lore-protagonist',
      type: 'Protagonist',
      label: 'Protagonist',
      // UI integration
      ui: { route: '/canvas/lore/protagonist' },
      config: {
        name: 'Akito',
        role: 'Hacker',
        traits: 'Stoic, Empathic',
      },
      outputs: ['name', 'role', 'traits'],
    },

    // Lore: Backstory Node
    {
      id: 'lore-backstory',
      type: 'Backstory',
      label: 'Backstory',
      // UI integration
      ui: { route: '/canvas/lore/backstory' },
      config: {
        origin: 'Tokyo underground',
        motivation: 'Find lost sister',
        conflict: 'Corporate AI',
      },
      outputs: ['origin', 'motivation', 'conflict'],
    },

    // Lore: World Node
    {
      id: 'lore-world',
      type: 'World',
      label: 'World',
      // UI integration
      ui: { route: '/canvas/lore/world' },
      config: {
        setting: 'Near-future Tokyo',
        era: '2042',
        rules: 'Ghost-net protocols',
      },
      outputs: ['setting', 'era', 'rules'],
    },
    // Source Document Node
    {
      id: 'source-ep1',
      type: 'SourceDoc',
      label: 'Episode 1 Source',
      // UI integration
      ui: { route: '/canvas/source-ep1' },
      config: {
        episodeId: 'ja_Episode_01_Masterpiece',
        sourcePath: '../250806/episodes/ja_Episode_01_Masterpiece.md',
      },
      outputs: ['draft'],
    },

    // Prompt Composition Node
    {
      id: 'prompt-story',
      type: 'Prompt',
      label: 'Story Prompt',
      dependsOn: ['source-ep1', 'lore-protagonist', 'lore-backstory', 'lore-world'],
      // UI integration
      ui: { route: '/canvas/prompt-story' },
      config: {
        promptType: 'story',
        style: 'atmospheric',
        genre: 'ghost-horror',
      },
      outputs: ['prompt'],
    },

    // AI Writer Node
    {
      id: 'writer-content',
      type: 'Writer',
      label: 'Content Writer',
      dependsOn: ['prompt-story'],
      // UI integration
      ui: { route: '/canvas/writer-content' },
      config: {
        model: 'gpt-4o-mini',
        maxTokens: 2000,
        temperature: 0.7,
      },
      outputs: ['script', 'metadata'],
    },

    // Image Generation Node (parallel with TTS)
    {
      id: 'image-gen',
      type: 'ImageGen',
      label: 'Scene Images',
      dependsOn: ['writer-content', 'lore-world'],
      // UI integration
      ui: { route: '/canvas/image-gen' },
      config: {
        model: 'flux-1.1-pro',
        style: 'atmospheric-horror',
        count: 5,
      },
      outputs: ['images', 'prompts'],
    },

    // Webtoon Panel Generation Node
    {
      id: 'webtoon-panel-gen',
      type: 'WebtoonPanelGen',
      label: 'Panel Generator',
      dependsOn: ['image-gen'],
      // UI integration
      ui: { route: '/canvas/webtoon-panel-gen' },
      config: {
        panelCount: 8,
        style: 'vertical-scroll',
        aspectRatio: '9:16',
      },
      outputs: ['panels', 'panelData'],
    },

    // Webtoon Layout Node
    {
      id: 'webtoon-layout',
      type: 'WebtoonLayout',
      label: 'Layout Designer',
      dependsOn: ['webtoon-panel-gen'],
      // UI integration
      ui: { route: '/canvas/webtoon-layout' },
      config: {
        layoutStyle: 'korean-style',
        textPosition: 'overlay',
        readingDirection: 'vertical',
      },
      outputs: ['layout', 'layoutData'],
    },

    // Webtoon Export Node
    {
      id: 'webtoon-export',
      type: 'WebtoonExport',
      label: 'Webtoon Export',
      dependsOn: ['webtoon-layout'],
      // UI integration
      ui: { route: '/canvas/webtoon-export' },
      config: {
        format: 'webp-sequence',
        platform: 'webtoon',
        quality: 'high',
      },
      outputs: ['episode', 'assets', 'download_url'],
    },

    // Text-to-Speech Node (parallel with Image Gen)
    {
      id: 'tts-narration',
      type: 'TTS',
      label: 'Narration TTS',
      dependsOn: ['writer-content'],
      // UI integration
      ui: { route: '/canvas/tts-narration' },
      config: {
        voice: 'alloy',
        speed: 1.0,
        format: 'mp3',
      },
      outputs: ['audio', 'timestamps'],
    },

    // Video Generation Node
    {
      id: 'video-gen',
      type: 'VideoGen',
      label: 'Video Generation',
      dependsOn: ['image-gen', 'tts-narration', 'writer-content'],
      // UI integration
      ui: { route: '/canvas/video-gen' },
      config: {
        preferredRenderer: 'sora',
        resolution: '1080p',
        duration: 300, // 5 minutes
      },
      outputs: ['video', 'script'],
    },

    // Video Render Node (fallback)
    {
      id: 'render-video',
      type: 'Render',
      label: 'Video Render',
      dependsOn: ['video-gen'],
      // UI integration
      ui: { route: '/canvas/render-video' },
      config: {
        renderer: 'ffmpeg',
        format: 'mp4',
        quality: 'high',
      },
      outputs: ['rendered_video', 'thumbnails'],
    },

    // Wattpad Export Node
    {
      id: 'export-wattpad',
      type: 'ExportWattpad',
      label: 'Wattpad Package',
      dependsOn: ['writer-content', 'image-gen'],
      // UI integration
      ui: { route: '/canvas/export-wattpad' },
      config: {
        format: 'markdown',
        includeImages: true,
        includeMetadata: true,
      },
      outputs: ['wattpad_package', 'download_url'],
    },

    // YouTube Upload Node (optional)
    {
      id: 'publish-youtube',
      type: 'PublishYouTube',
      label: 'YouTube Upload',
      dependsOn: ['render-video'],
      // UI integration
      ui: { route: '/canvas/publish-youtube' },
      config: {
        privacy: 'unlisted',
        title: 'Ghost Hacker - Episode 1',
        description: 'Atmospheric ghost story adaptation',
        tags: ['ghost', 'horror', 'supernatural'],
      },
      outputs: ['youtube_id', 'upload_url'],
    },
  ],

  // Execution topology (topological sort order)
  executionOrder: [
    'source-ep1',
    ['lore-protagonist', 'lore-backstory', 'lore-world'],
    'prompt-story',
    'writer-content',
    ['image-gen', 'tts-narration'], // Parallel execution
    'webtoon-panel-gen',
    'webtoon-layout',
    'webtoon-export',
    'video-gen',
    'render-video',
    ['export-wattpad', 'publish-youtube'], // Parallel execution
  ],

  // Resource requirements per node type
  resources: {
    SourceDoc: { cpu: 0.1, memory: '128MB', timeout: '5m' },
    Prompt: { cpu: 0.1, memory: '256MB', timeout: '2m' },
    Writer: { cpu: 1, memory: '1GB', timeout: '10m' },
    Protagonist: { cpu: 0.05, memory: '64MB', timeout: '1m' },
    Backstory: { cpu: 0.05, memory: '64MB', timeout: '1m' },
    World: { cpu: 0.05, memory: '64MB', timeout: '1m' },
    ImageGen: { cpu: 2, memory: '2GB', timeout: '15m' },
    WebtoonPanelGen: { cpu: 2, memory: '2GB', timeout: '12m' },
    WebtoonLayout: { cpu: 1, memory: '1GB', timeout: '8m' },
    WebtoonExport: { cpu: 1, memory: '512MB', timeout: '5m' },
    TTS: { cpu: 1, memory: '512MB', timeout: '8m' },
    VideoGen: { cpu: 4, memory: '8GB', timeout: '30m' },
    Render: { cpu: 2, memory: '4GB', timeout: '20m' },
    ExportWattpad: { cpu: 0.5, memory: '256MB', timeout: '5m' },
    PublishYouTube: { cpu: 0.5, memory: '256MB', timeout: '10m' },
  },

  // Validation rules
  validation: {
    requiredOutputs: {
      'writer-content': ['script'],
      'image-gen': ['images'],
      'webtoon-panel-gen': ['panels'],
      'webtoon-layout': ['layout'],
      'webtoon-export': ['episode'],
      'video-gen': ['video'],
      'export-wattpad': ['wattpad_package'],
    },
    maxRetries: 3,
    timeoutBuffer: '2m',
  },

  // Monitoring and observability
  observability: {
    metrics: ['execution_time', 'success_rate', 'resource_usage'],
    logs: ['node_start', 'node_complete', 'node_error'],
    traces: ['pipeline_execution', 'node_execution'],
  },

  // Storage boundary (Neo4j)
  storage: {
    type: 'neo4j',
    nodeLabel: 'PipelineNode',
    idProp: 'id',
    typeProp: 'type',
    labelProp: 'label',
    configProp: 'config',
  },

  // Output specifications
  outputs: {
    webtoon: {
      format: 'webp-sequence',
      platform: 'webtoon',
      aspectRatio: '9:16',
      episodeLength: '40-60 panels',
    },
    wattpad: {
      format: 'zip',
      contents: ['story.md', 'images/', 'manifest.json'],
      maxSize: '100MB',
    },
    youtube: {
      format: 'mp4',
      resolution: '1080p',
      duration: '5m',
      thumbnail: 'required',
    },
  },
}

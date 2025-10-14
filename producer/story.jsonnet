{
  // Ghost Hacker Producer Pipeline Topology
  // Merkle DAG: pipeline nodes -> dependencies -> execution order

  pipeline: [
    // Source Document Node
    {
      id: 'source-ep1',
      type: 'SourceDoc',
      label: 'Episode 1 Source',
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
      dependsOn: ['source-ep1'],
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
      dependsOn: ['writer-content'],
      config: {
        model: 'flux-1.1-pro',
        style: 'atmospheric-horror',
        count: 5,
      },
      outputs: ['images', 'prompts'],
    },

    // Text-to-Speech Node (parallel with Image Gen)
    {
      id: 'tts-narration',
      type: 'TTS',
      label: 'Narration TTS',
      dependsOn: ['writer-content'],
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
    'prompt-story',
    'writer-content',
    ['image-gen', 'tts-narration'], // Parallel execution
    'video-gen',
    'render-video',
    ['export-wattpad', 'publish-youtube'], // Parallel execution
  ],

  // Resource requirements per node type
  resources: {
    SourceDoc: { cpu: 0.1, memory: '128MB', timeout: '5m' },
    Prompt: { cpu: 0.1, memory: '256MB', timeout: '2m' },
    Writer: { cpu: 1, memory: '1GB', timeout: '10m' },
    ImageGen: { cpu: 2, memory: '2GB', timeout: '15m' },
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

  // Output specifications
  outputs: {
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

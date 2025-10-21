import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const providers = {
  text: {
    async generate(n: unknown, ctx?: unknown) {
      const system = "You are a world-consistent writer. Use given lore and constraints.";
      const user = JSON.stringify({ prompt: (n as any)?.config, context: ctx });
      const r = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
      });
      return { script: r.choices[0]?.message?.content ?? "" };
    },
  },
  image: { async generate(_n?: unknown, _ctx?: unknown) { return { images: [], prompts: [] }; } },
  audio: { async generate(_n?: unknown, _ctx?: unknown) { return { audio: null, timestamps: [] }; } },
  video: { async generate(_n?: unknown, _ctx?: unknown) { return { video: null, script: "" }; }, async render(_n?: unknown, _ctx?: unknown) { return { rendered_video: null, thumbnails: [] }; } },
  panel: { async generate(_n?: unknown, _ctx?: unknown) { return { panels: [], panelData: {} }; } },
  layout: { async generate(_n?: unknown, _ctx?: unknown) { return { layout: {}, layoutData: {} }; } },
  export: {
    async webtoon(_n?: unknown, _ctx?: unknown) { return { episode: {}, assets: [], download_url: "" }; },
    async wattpad(_n?: unknown, _ctx?: unknown) { return { wattpad_package: {}, download_url: "" }; },
  },
  publish: {
    async youtube(_n?: unknown, _ctx?: unknown) { return { youtube_id: "", upload_url: "" }; },
  },
};



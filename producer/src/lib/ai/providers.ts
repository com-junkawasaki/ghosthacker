import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const providers = {
  text: {
    async generate(n: any, ctx: any) {
      const system = "You are a world-consistent writer. Use given lore and constraints.";
      const user = JSON.stringify({ prompt: n.config, context: ctx });
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
  image: { async generate() { return { images: [], prompts: [] }; } },
  audio: { async generate() { return { audio: null, timestamps: [] }; } },
  video: { async generate() { return { video: null, script: "" }; }, async render() { return { rendered_video: null, thumbnails: [] }; } },
  panel: { async generate() { return { panels: [], panelData: {} }; } },
  layout: { async generate() { return { layout: {}, layoutData: {} }; } },
  export: {
    async webtoon() { return { episode: {}, assets: [], download_url: "" }; },
    async wattpad() { return { wattpad_package: {}, download_url: "" }; },
  },
  publish: {
    async youtube() { return { youtube_id: "", upload_url: "" }; },
  },
};



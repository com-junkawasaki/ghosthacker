import * as fs from "fs";
import * as path from "path";

type ShotProperties = Record<string, unknown>;

interface Panel {
  panel: number;
  shot: string;
  "gh:shotProperties"?: ShotProperties;
  "gh:runwayPrompt": string;
}

interface Page {
  "gh:pageNumber": number;
  "gh:panels": Panel[];
}

interface Episode {
  "gh:episode": number;
  "gh:pages": Page[];
}

interface Storyboard {
  "gh:episodes": Episode[];
}

type Provider = "openai" | "openrouter";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

function pad(num: number, width = 2) {
  return String(num).padStart(width, "0");
}

function parseArgs(argv: string[]) {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function sizeToAspect(size: string): "1:1" | "16:9" | "9:16" {
  // Accept common OpenAI DALL·E size strings and map to aspect ratio
  if (size === "1024x1792") return "9:16";
  if (size === "1792x1024") return "16:9";
  return "1:1";
}

function extractBase64FromDataUrl(dataUrl: string): { mime: string; b64: string } {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) throw new Error("OpenRouter returned non-data-url image.");
  return { mime: m[1], b64: m[2] };
}

async function generateImageOpenAI(prompt: string, outputPath: string, size: string) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set.");

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size,
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    let err: any = null;
    try {
      err = await response.json();
    } catch (_) {}
    throw new Error(`OpenAI API error (${response.status}): ${JSON.stringify(err)}`);
  }

  const result = (await response.json()) as any;
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from OpenAI.");

  const buf = Buffer.from(b64, "base64");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buf);
}

async function generateImageOpenRouter(
  prompt: string,
  outputPath: string,
  opts: { model: string; aspectRatio: string; imageSize: string }
) {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set.");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      // Optional but recommended by OpenRouter for attribution/limits in some setups:
      "HTTP-Referer": "https://ghosthacker.gftd.ai",
      "X-Title": "ghosthacker-panel-images",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [{ role: "user", content: prompt }],
      modalities: ["text", "image"],
      image_config: {
        aspect_ratio: opts.aspectRatio,
        image_size: opts.imageSize,
      },
      stream: false,
    }),
  });

  if (!response.ok) {
    let err: any = null;
    try {
      err = await response.json();
    } catch (_) {}
    throw new Error(`OpenRouter API error (${response.status}): ${JSON.stringify(err)}`);
  }

  const result = (await response.json()) as any;

  // OpenRouter image output is typically a data URL under:
  // choices[0].message.images[0].image_url.url
  const dataUrl =
    result?.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
    result?.choices?.[0]?.message?.images?.[0]?.image_url ??
    null;

  if (!dataUrl || typeof dataUrl !== "string") {
    throw new Error("No image returned from OpenRouter (missing choices[0].message.images[0]).");
  }

  const { b64 } = extractBase64FromDataUrl(dataUrl);
  const buf = Buffer.from(b64, "base64");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buf);
}

async function rewritePromptWithOpenRouter(prompt: string, model: string) {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set.");
  if (!model) throw new Error("rewrite model is empty");

  const system = [
    "You rewrite story panel prompts for an image generation model.",
    "Return ONLY the rewritten prompt, no quotes, no markdown.",
    "Rules:",
    "- No dialogue or captions.",
    "- Keep entities <= 3 (people/props/places total).",
    "- Preserve camera intent (distance/angle/composition/lens/focus/lighting) from the input.",
    "- Keep it concrete and visual; avoid meta-instructions.",
  ].join("\n");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://ghosthacker.gftd.ai",
      "X-Title": "ghosthacker-panel-images-rewriter",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      stream: false,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    let err: any = null;
    try {
      err = await response.json();
    } catch (_) {}
    throw new Error(`OpenRouter (rewrite) API error (${response.status}): ${JSON.stringify(err)}`);
  }

  const result = (await response.json()) as any;
  const text = result?.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") throw new Error("No rewritten prompt returned from OpenRouter.");
  return text.trim();
}

function panelOutPath(baseDir: string, ep: number, page: number, panel: number) {
  const epDir = `episode-${pad(ep, 2)}`;
  const pageDir = `page-${pad(page, 3)}`;
  const file = `panel-${pad(panel, 3)}.png`;
  return path.join(baseDir, epDir, pageDir, file);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const storyboardPath = (args["storyboard"] as string) || path.join(process.cwd(), "260125-jump", "storyboard.jsonld");
  const outDir = (args["out"] as string) || path.join(process.cwd(), "260125-jump", "panel_images");
  const size = (args["size"] as string) || "1024x1024";
  const provider = ((args["provider"] as string) || "openai") as Provider;
  const model = (args["model"] as string) || "";
  const dryRun = Boolean(args["dry-run"]);
  const imageSize = (args["image-size"] as string) || "1K";
  const aspectRatio = (args["aspect-ratio"] as string) || sizeToAspect(size);
  const rewriteModel = (args["rewrite-model"] as string) || "";

  const episodeFilter = args["episode"] ? Number(args["episode"]) : null;
  const pageFilter = args["page"] ? Number(args["page"]) : null;
  const max = args["max"] ? Number(args["max"]) : null;

  if (!fs.existsSync(storyboardPath)) {
    throw new Error(`Storyboard file not found: ${storyboardPath}`);
  }

  const data = JSON.parse(fs.readFileSync(storyboardPath, "utf-8")) as Storyboard;
  const episodes = data["gh:episodes"] || [];

  let count = 0;
  for (const ep of episodes) {
    if (episodeFilter !== null && ep["gh:episode"] !== episodeFilter) continue;
    for (const page of ep["gh:pages"]) {
      if (pageFilter !== null && page["gh:pageNumber"] !== pageFilter) continue;
      for (const pnl of page["gh:panels"]) {
        const outPath = panelOutPath(outDir, ep["gh:episode"], page["gh:pageNumber"], pnl.panel);

        if (fs.existsSync(outPath)) {
          continue; // resume-friendly
        }

        let prompt = pnl["gh:runwayPrompt"];
        if (!prompt || typeof prompt !== "string") continue;

        count++;
        console.log(`[${count}] E${ep["gh:episode"]} P${page["gh:pageNumber"]} panel ${pnl.panel} -> ${outPath}`);

        if (dryRun) {
          if (max !== null && count >= max) return;
          continue;
        }

        if (provider === "openai") {
          await generateImageOpenAI(prompt, outPath, size);
        } else if (provider === "openrouter") {
          if (!model) {
            throw new Error("For --provider openrouter, you must pass --model (an image-capable model on OpenRouter).");
          }
          if (rewriteModel) {
            prompt = await rewritePromptWithOpenRouter(prompt, rewriteModel);
          }
          await generateImageOpenRouter(prompt, outPath, { model, aspectRatio, imageSize });
        } else {
          throw new Error(`Unknown provider: ${provider}`);
        }

        if (max !== null && count >= max) return;
      }
    }
  }
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});


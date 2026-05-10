/**
 * OpenAI image API wrappers (generations + edits + vision critic).
 */
import * as fs from "node:fs";

const GEN_URL = "https://api.openai.com/v1/images/generations";
const EDIT_URL = "https://api.openai.com/v1/images/edits";
const CHAT_URL = "https://api.openai.com/v1/chat/completions";

export const MODEL = process.env.LG_IMAGE_MODEL ?? "gpt-image-2";
export const SIZE = process.env.LG_IMAGE_SIZE ?? "1024x1536";
export const QUALITY = process.env.LG_IMAGE_QUALITY ?? "low";
export const VISION_MODEL = process.env.LG_VISION_MODEL ?? "gpt-4o-mini";

if (MODEL.startsWith("gpt-image-1")) throw new Error("gpt-image-1 is forbidden");

function key(): string {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error("OPENAI_API_KEY not set");
  return k;
}

export async function generate(prompt: string, opts: { size?: string; quality?: string } = {}): Promise<string> {
  const r = await fetch(GEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key()}` },
    body: JSON.stringify({ model: MODEL, prompt: prompt.slice(0, 32000), size: opts.size ?? SIZE, quality: opts.quality ?? QUALITY, n: 1 }),
  });
  if (!r.ok) throw new Error(`generate HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j: any = await r.json();
  if (j.error) throw new Error(`generate: ${j.error.message}`);
  const b64 = j.data?.[0]?.b64_json;
  if (!b64) throw new Error("generate: no b64");
  return b64;
}

export async function edit(prompt: string, imagePaths: string[], opts: { size?: string; quality?: string } = {}): Promise<string> {
  const fd = new FormData();
  fd.append("model", MODEL);
  fd.append("prompt", prompt.slice(0, 32000));
  fd.append("size", opts.size ?? SIZE);
  fd.append("quality", opts.quality ?? QUALITY);
  fd.append("n", "1");
  for (const p of imagePaths) {
    const buf = fs.readFileSync(p);
    fd.append("image[]", new Blob([buf as any], { type: "image/png" }), p.split("/").pop()!);
  }
  const r = await fetch(EDIT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}` },
    body: fd as any,
  });
  if (!r.ok) throw new Error(`edit HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j: any = await r.json();
  if (j.error) throw new Error(`edit: ${j.error.message}`);
  const b64 = j.data?.[0]?.b64_json;
  if (!b64) throw new Error("edit: no b64");
  return b64;
}

/**
 * Vision critic: returns a JSON-ish score + diagnosis given an image and expected description.
 */
export async function critique(imagePath: string, expectedSetting: string, expectedCharacters: string[], shot: string): Promise<{ score: number; settingMatch: boolean; charactersMatch: boolean; hasUnwantedText: boolean; notes: string }> {
  const buf = fs.readFileSync(imagePath);
  const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  const sys = "You are a strict art director critiquing a manga panel for a publishing pipeline. Respond with VALID JSON only. No prose.";
  const user = `Evaluate this generated panel against the spec:\n- Expected setting: ${expectedSetting}\n- Expected characters: ${expectedCharacters.join(", ") || "none"}\n- Shot: ${shot}\n\nReturn JSON: {"score": <1-10>, "settingMatch": <bool>, "charactersMatch": <bool>, "hasUnwantedText": <bool, true if speech bubbles or labels appear in the image>, "notes": "<2 sentences max>"}`;
  const r = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key()}` },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: [{ type: "text", text: user }, { type: "image_url", image_url: { url: dataUrl } }] },
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    }),
  });
  if (!r.ok) throw new Error(`critique HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j: any = await r.json();
  const txt = j.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(txt);
    return {
      score: Number(parsed.score) || 0,
      settingMatch: Boolean(parsed.settingMatch),
      charactersMatch: Boolean(parsed.charactersMatch),
      hasUnwantedText: Boolean(parsed.hasUnwantedText),
      notes: String(parsed.notes ?? ""),
    };
  } catch {
    return { score: 0, settingMatch: false, charactersMatch: false, hasUnwantedText: false, notes: `parse-fail: ${txt.slice(0, 100)}` };
  }
}

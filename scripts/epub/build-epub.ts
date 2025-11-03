/*
  Ghost Hacker - EPUB builder (English edition)
  - Scans 251022/wattpad/episodes/epXX/partY.en.md in order
  - Strips JSON-LD fenced blocks ```json ... ``` and leading meta lines
  - Converts Markdown → HTML (marked)
  - Generates EPUB via epub-gen
  - Output: dist/ghost-hacker.en.epub
*/
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import Epub from "epub-gen";

type EpisodePart = {
  episode: number;
  part: number;
  filePath: string;
};

function listEnglishParts(rootDir: string): EpisodePart[] {
  const episodesDir = path.resolve(rootDir, "251022/wattpad/episodes");
  const entries = fs.readdirSync(episodesDir, { withFileTypes: true });
  const eps = entries
    .filter((e) => e.isDirectory() && /^ep\d+$/i.test(e.name))
    .map((e) => ({ name: e.name, num: Number(e.name.replace(/\D/g, "")) }))
    .sort((a, b) => a.num - b.num);

  const results: EpisodePart[] = [];
  for (const ep of eps) {
    const epDir = path.join(episodesDir, ep.name);
    const files = fs
      .readdirSync(epDir, { withFileTypes: true })
      .filter((f) => f.isFile() && /^part\d+\.en\.md$/i.test(f.name))
      .map((f) => ({ name: f.name, num: Number(f.name.replace(/\D/g, "")) }))
      .sort((a, b) => a.num - b.num);
    for (const f of files) {
      results.push({ episode: ep.num, part: f.num, filePath: path.join(epDir, f.name) });
    }
  }
  return results;
}

function stripJsonLd(md: string): string {
  // Remove fenced code blocks labeled json (```json ... ```), anywhere in document
  const withoutJson = md.replace(/```json[\s\S]*?```/gim, "\n");
  // Remove leading meta lines like `- POV:` or bullet lines right under H1
  const lines = withoutJson.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;
  // keep H1 and then skip immediate bullet-ish meta lines
  while (i < lines.length) {
    out.push(lines[i]);
    if (/^#\s+/.test(lines[i])) {
      i += 1;
      while (i < lines.length && (lines[i].trim() === "" || /^[-*]\s|^-\s*POV:|^-\s*Beat:/i.test(lines[i].trim()))) {
        i += 1;
      }
      // continue writing from the first non-meta line
      continue;
    }
    i += 1;
  }
  return out.join("\n");
}

function mdToHtml(md: string): { title: string; html: string } {
  const lines = md.replace(/^\uFEFF/, "").split(/\r?\n/);
  // Extract and remove the first H1 to avoid duplication with section title
  let title = "";
  let removed = false;
  const kept: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^#\s+(.+)$/);
    if (!removed && m) {
      title = m[1].trim();
      removed = true; // skip this H1 line
      continue;
    }
    kept.push(lines[i]);
  }
  const rendered = kept.join("\n");
  const html = marked.parse(rendered);
  return { title: title || "Untitled", html: String(html) };
}

async function main() {
  const root = process.cwd();
  const outDir = path.resolve(root, "dist");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const parts = listEnglishParts(root);
  if (parts.length === 0) {
    console.error("No English parts found (part*.en.md)");
    process.exit(1);
  }

  const sections: Array<{ title: string; data: string }> = [];

  // Front matter (title page)
  const bookTitle = "Ghost Hacker";
  const subTitle = "Healing Connections in a Disconnected World";
  sections.push({
    title: bookTitle,
    data: `<h1 style="text-align:center;margin-top:3em;">${bookTitle}</h1>
           <h2 style="text-align:center;color:#666;">${subTitle}</h2>
           <p style="text-align:center;margin-top:2em;">© 2025 GFTD.ai</p>`,
  });

  for (const p of parts) {
    const raw = fs.readFileSync(p.filePath, "utf8");
    const cleaned = stripJsonLd(raw);
    const { title, html } = mdToHtml(cleaned);
    const epTitle = `EP${p.episode}-P${p.part} — ${title}`;
    sections.push({ title: epTitle, data: html });
  }

  const output = path.join(outDir, "ghost-hacker.en.epub");
  const epubOptions = {
    title: bookTitle,
    author: "GFTD.ai / Ghost Hacker",
    publisher: "GFTD.ai",
    cover: undefined as string | undefined, // set if available
    content: sections,
    lang: "en",
    customOpfTemplatePath: undefined as string | undefined,
    version: 3,
    css: `html,body{font-family: Georgia, 'Times New Roman', serif; line-height:1.4}
          h1,h2,h3{font-family: Georgia, serif}
          blockquote{color:#555}
          img{max-width:100%;height:auto}`,
    verbose: false,
    output,
  } as const;

  await new Epub(epubOptions).promise;
  console.log(`EPUB generated: ${output}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});



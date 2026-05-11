/**
 * Manga page SVG renderer.
 *
 * Composes panel images + bubbles + SFX + manuscript frame into a Jump-style manga page SVG.
 *
 * Coordinate system: viewBox uses plain numbers where 1 user unit = 1mm.
 * SVG root width/height in "mm" so browsers display at correct physical size.
 *
 * Usage:
 *   npx tsx src/render-page.ts --page 1
 *   npx tsx src/render-page.ts --all --show-frame
 */
import * as fs from "node:fs";

const REPO = "/Users/junkawasaki/github/ghosthacker/260123-jump";
const EPISODE_PATH = `${REPO}/resources/episodes/arc0-1-origin/episode.jsonld`;
const OUTPUT_DIR = `${REPO}/resources/episodes/arc0-1-origin/rendered-pages`;

interface CliArgs { pages?: number[]; all: boolean; showFrame: boolean }
function parseArgs(): CliArgs {
  const a = process.argv.slice(2);
  const o: CliArgs = { all: false, showFrame: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--page" && a[i+1]) { (o.pages = o.pages ?? []).push(Number(a[++i])); }
    else if (a[i] === "--all") o.all = true;
    else if (a[i] === "--show-frame") o.showFrame = true;
  }
  return o;
}

const TRIM = { width: 210, height: 297 };
const BLEED = 3;
const INNER = { x: 15, y: 15, w: 180, h: 270 };

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// === Bubble sizing ===
// Manga convention: TALL vertical bubbles (writing-mode: vertical-rl, right-to-left columns)
// width corresponds to number of columns (= line count), height = chars per column
function estimateBubbleSizeVertical(text: string, fontSize: number, maxW: number, maxH: number): { w: number; h: number; lines: string[] } {
  const charHeight = fontSize * 1.0;
  const colWidth = fontSize * 1.4;
  // Strip explicit newlines (we re-flow); preserve hard breaks via splitting first
  const hardLines = text.split("\n").filter((l) => l.length > 0);
  // For each hard line, wrap if too long for max height
  const charsPerCol = Math.max(1, Math.floor(maxH * 0.88 / charHeight));
  const cols: string[] = [];
  for (const hl of hardLines) {
    let buf = "";
    for (const ch of hl) {
      buf += ch;
      if ([...buf].length >= charsPerCol) { cols.push(buf); buf = ""; }
    }
    if (buf) cols.push(buf);
  }
  if (cols.length === 0) cols.push(" ");
  const longest = Math.max(1, ...cols.map((l) => [...l].length));
  // Width capped by max width
  const maxCols = Math.max(1, Math.floor(maxW * 0.85 / colWidth));
  const useCols = cols.slice(0, maxCols);
  const w = Math.min(maxW, useCols.length * colWidth + 4);
  const h = Math.min(maxH, longest * charHeight + 4);
  return { w, h, lines: useCols };
}

// Legacy horizontal sizer (kept for narration/telop which are typically horizontal)
function estimateBubbleSize(text: string, fontSize: number, maxW: number, maxH: number): { w: number; h: number; lines: string[] } {
  const charWidth = fontSize * 0.95;
  const lineHeight = fontSize * 1.4;
  const charsPerLine = Math.max(1, Math.floor(maxW * 0.85 / charWidth));
  const lines: string[] = [];
  let buf = "";
  for (const ch of text) {
    if (ch === "\n") { lines.push(buf); buf = ""; continue; }
    buf += ch;
    if ([...buf].length >= charsPerLine) { lines.push(buf); buf = ""; }
  }
  if (buf) lines.push(buf);
  const longest = Math.max(1, ...lines.map((l) => [...l].length));
  const w = Math.min(maxW, longest * charWidth + 5);
  const h = Math.min(maxH, lines.length * lineHeight + 4);
  return { w, h, lines };
}

function bubblePathEllipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${cx-rx},${cy} A${rx},${ry} 0 1,0 ${cx+rx},${cy} A${rx},${ry} 0 1,0 ${cx-rx},${cy} Z`;
}

function bubblePathRoundedRect(x: number, y: number, w: number, h: number, r: number = 2): string {
  return `M${x+r},${y} L${x+w-r},${y} Q${x+w},${y} ${x+w},${y+r} L${x+w},${y+h-r} Q${x+w},${y+h} ${x+w-r},${y+h} L${x+r},${y+h} Q${x},${y+h} ${x},${y+h-r} L${x},${y+r} Q${x},${y} ${x+r},${y} Z`;
}

function bubblePathJagged(x: number, y: number, w: number, h: number, spikes: number = 24): string {
  const cx = x + w/2, cy = y + h/2;
  const rxO = w/2, ryO = h/2;
  const rxI = rxO * 0.86, ryI = ryO * 0.86;
  let d = "";
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i / (spikes * 2)) * 2 * Math.PI - Math.PI/2;
    const rx = i % 2 === 0 ? rxO : rxI;
    const ry = i % 2 === 0 ? ryO : ryI;
    d += (i === 0 ? "M" : "L") + (cx + rx * Math.cos(angle)).toFixed(2) + "," + (cy + ry * Math.sin(angle)).toFixed(2) + " ";
  }
  return d + "Z";
}

function bubblePathThought(x: number, y: number, w: number, h: number): string {
  const cx = x + w/2, cy = y + h/2;
  const bumps = 14;
  const rxO = w/2, ryO = h/2;
  let d = "";
  for (let i = 0; i <= bumps; i++) {
    const a = (i / bumps) * 2 * Math.PI;
    const px = cx + rxO * Math.cos(a);
    const py = cy + ryO * Math.sin(a);
    if (i === 0) d += `M${px.toFixed(2)},${py.toFixed(2)} `;
    else {
      const prevA = ((i-1)/bumps) * 2 * Math.PI;
      const midA = (a + prevA) / 2;
      const cpx = cx + rxO * 1.15 * Math.cos(midA);
      const cpy = cy + ryO * 1.15 * Math.sin(midA);
      d += `Q${cpx.toFixed(2)},${cpy.toFixed(2)} ${px.toFixed(2)},${py.toFixed(2)} `;
    }
  }
  return d + "Z";
}

function renderBubbleSvg(bubble: any, panelBounds: any, bubbleIndex: number): string {
  const text = bubble["gh:text"] ?? "";
  const speaker = bubble["gh:speaker"] ?? "";
  const style = bubble["gh:style"] ?? "round";
  const fontSizeKey = bubble["gh:fontSize"] ?? "M";
  const fontSize = ({ S: 2.5, M: 3.2, L: 4.0, XL: 5.0 } as any)[fontSizeKey] ?? 3.2;
  const maxWFrac = bubble["gh:maxWidthFraction"] ?? 0.5;
  const maxHFrac = bubble["gh:maxHeightFraction"] ?? 0.6; // taller for vertical text
  const maxW = panelBounds.wMm * maxWFrac;
  const maxH = panelBounds.hMm * maxHFrac;

  // narration / telop = horizontal at bottom; everything else = vertical Japanese (manga standard)
  const isHorizontal = style === "narration" || style === "telop";
  const sized = isHorizontal
    ? estimateBubbleSize(text, fontSize, maxW, maxH)
    : estimateBubbleSizeVertical(text, fontSize, maxW, maxH);
  const w = sized.w, h = sized.h, lines = sized.lines;

  const padding = 2;
  // Manga convention: stack vertical bubbles right-to-left (newer bubble = further left), top of panel
  // Multiple bubbles in same panel: arrange RIGHT to LEFT (right is most-recent reading order start)
  const bx = panelBounds.wMm - w - padding - bubbleIndex * (w + 1.5);
  const by = padding;

  let bubblePath = "";
  switch (style) {
    case "jagged": bubblePath = bubblePathJagged(bx, by, w, h); break;
    case "thought": bubblePath = bubblePathThought(bx, by, w, h); break;
    case "narration": case "telop": bubblePath = bubblePathRoundedRect(bx, by, w, h, 1); break;
    case "round": default: bubblePath = bubblePathEllipse(bx + w/2, by + h/2, w/2, h/2); break;
  }

  let tailPath = "";
  if (style === "round" || style === "jagged" || style === "thought") {
    const tailLen = bubble["gh:tail"]?.["lengthMm"] ?? 4;
    const t1x = bx + w * 0.4, t1y = by + h * 0.9;
    const t2x = bx + w * 0.25, t2y = by + h * 0.95;
    const ttx = bx + w * 0.3, tty = by + h + tailLen;
    tailPath = `M${t1x.toFixed(2)},${t1y.toFixed(2)} L${ttx.toFixed(2)},${tty.toFixed(2)} L${t2x.toFixed(2)},${t2y.toFixed(2)} Z`;
  }

  let textBlocks = "";
  if (isHorizontal) {
    // Horizontal layout (narration/telop)
    const lineHeight = fontSize * 1.4;
    const textStartY = by + (h - lines.length * lineHeight) / 2 + fontSize * 0.9;
    textBlocks = lines.map((line, idx) =>
      `<text x="${(bx + w/2).toFixed(2)}" y="${(textStartY + idx * lineHeight).toFixed(2)}" text-anchor="middle" font-family="'Noto Serif JP','Hiragino Mincho ProN','Yu Mincho',serif" font-size="${fontSize}" fill="#000">${escapeXml(line)}</text>`
    ).join("\n  ");
  } else {
    // Vertical layout: each "line" is a COLUMN, rendered right-to-left
    // Use writing-mode: vertical-rl on each text element
    const colWidth = fontSize * 1.4;
    const startX = bx + w - padding/2 - colWidth/2; // right edge first
    const startY = by + padding/2;
    textBlocks = lines.map((col, idx) =>
      `<text x="${(startX - idx * colWidth).toFixed(2)}" y="${(startY + fontSize).toFixed(2)}" writing-mode="vertical-rl" font-family="'Noto Serif JP','Hiragino Mincho ProN','Yu Mincho',serif" font-size="${fontSize}" fill="#000" letter-spacing="0">${escapeXml(col)}</text>`
    ).join("\n  ");
  }

  const speakerLabel = speaker ? `<text x="${(bx + 1).toFixed(2)}" y="${(by + 2.2).toFixed(2)}" font-family="sans-serif" font-size="1.6" fill="#888">${escapeXml(speaker)}</text>` : "";

  return `<g class="bubble bubble-${style}">
  <path d="${bubblePath}" fill="#fff" stroke="#000" stroke-width="0.35"/>
  ${tailPath ? `<path d="${tailPath}" fill="#fff" stroke="#000" stroke-width="0.35"/>` : ""}
  ${speakerLabel}
  ${textBlocks}
</g>`;
}

// === SFX ===
function renderSfxSvg(sfx: any): string {
  const text = sfx["gh:text"] ?? "";
  const font = sfx["gh:font"] ?? "impact";
  const sizeKey = sfx["gh:size"] ?? "M";
  const size = ({ S: 5, M: 8, L: 12, XL: 18, spread: 28 } as any)[sizeKey] ?? 8;
  const x = sfx["gh:position"]?.["xMm"] ?? 30;
  const y = sfx["gh:position"]?.["yMm"] ?? 30;
  const rot = sfx["gh:rotation"] ?? 0;
  const skew = sfx["gh:skew"] ?? 0;
  const strokeW = sfx["gh:strokeWidth"] ?? Math.max(0.5, size * 0.08);
  const strokeColor = sfx["gh:strokeColor"] ?? "#fff";
  const fillColor = sfx["gh:fillColor"] ?? "#000";

  const fontMap: Record<string, string> = {
    "impact": "'Bebas Neue','Impact','Yu Gothic UI Heavy',sans-serif",
    "brush": "'Yu Mincho','Hiragino Mincho ProN',serif",
    "hand-drawn": "'Comic Sans MS','Hiragino Maru Gothic Pro',sans-serif",
    "rough": "'Impact','Yu Gothic UI Heavy',sans-serif",
  };
  const fontFamily = fontMap[font] ?? fontMap["impact"];
  return `<g class="sfx" transform="translate(${x},${y}) rotate(${rot}) skewX(${skew})">
  <text text-anchor="middle" font-family="${fontFamily}" font-size="${size}" font-weight="900"
        stroke="${strokeColor}" stroke-width="${strokeW}" stroke-linejoin="round" paint-order="stroke fill"
        fill="${fillColor}">${escapeXml(text)}</text>
</g>`;
}

// === Panel ===
function getPanelImagePath(panel: any): string | null {
  const url = panel["gh:generatedImageUrl"];
  if (!url) return null;
  return `${REPO}/resources${url}`;
}

function panelShape(slot: any): { d: string; bounds: { xMm: number; yMm: number; wMm: number; hMm: number } } {
  // Field names in episode.jsonld are gh:-prefixed
  const shape = slot["gh:shape"] ?? slot.shape;
  const bounds = slot["gh:bounds"] ?? slot.bounds;
  const vertices = slot["gh:vertices"] ?? slot.vertices;
  const skewDeg = slot["gh:skewDeg"] ?? slot.skewDeg ?? 0;

  if ((shape === "rect" || shape === "rect-soft") && bounds) {
    const b = bounds;
    const d = `M${b.xMm},${b.yMm} L${b.xMm + b.wMm},${b.yMm} L${b.xMm + b.wMm},${b.yMm + b.hMm} L${b.xMm},${b.yMm + b.hMm} Z`;
    return { d, bounds: { xMm: b.xMm, yMm: b.yMm, wMm: b.wMm, hMm: b.hMm } };
  }
  if (shape === "polygon" && vertices) {
    const vs = vertices as number[][];
    const d = vs.map((v, i) => `${i === 0 ? "M" : "L"}${v[0]},${v[1]}`).join(" ") + " Z";
    const xs = vs.map((v) => v[0]), ys = vs.map((v) => v[1]);
    const xMm = Math.min(...xs), yMm = Math.min(...ys);
    const wMm = Math.max(...xs) - xMm, hMm = Math.max(...ys) - yMm;
    return { d, bounds: { xMm, yMm, wMm, hMm } };
  }
  if (shape === "parallelogram" && bounds) {
    const b = bounds;
    const skewRad = skewDeg * Math.PI / 180;
    const dx = b.hMm * Math.tan(skewRad);
    const d = `M${b.xMm + dx},${b.yMm} L${b.xMm + b.wMm + dx},${b.yMm} L${b.xMm + b.wMm},${b.yMm + b.hMm} L${b.xMm},${b.yMm + b.hMm} Z`;
    return { d, bounds: { xMm: b.xMm, yMm: b.yMm, wMm: b.wMm + Math.abs(dx), hMm: b.hMm } };
  }
  const b = bounds ?? { xMm: 0, yMm: 0, wMm: 60, hMm: 60 };
  const d = `M${b.xMm},${b.yMm} L${b.xMm + b.wMm},${b.yMm} L${b.xMm + b.wMm},${b.yMm + b.hMm} L${b.xMm},${b.yMm + b.hMm} Z`;
  return { d, bounds: b };
}

function renderPanel(panel: any, idx: number): string {
  const slot = panel["gh:panelSlot"];
  if (!slot) return "";
  const shape = panelShape(slot);
  const clipId = `panel-clip-${idx}`;
  const imagePath = getPanelImagePath(panel);

  let imageEl = "";
  if (imagePath && fs.existsSync(imagePath)) {
    const buf = fs.readFileSync(imagePath);
    // Detect MIME from magic bytes
    let mime = "image/png";
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) mime = "image/jpeg";
    else if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) mime = "image/gif";
    else if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[8] === 0x57) mime = "image/webp";
    const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
    imageEl = `<image href="${dataUrl}" x="${shape.bounds.xMm}" y="${shape.bounds.yMm}" width="${shape.bounds.wMm}" height="${shape.bounds.hMm}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`;
  } else {
    imageEl = `<rect x="${shape.bounds.xMm}" y="${shape.bounds.yMm}" width="${shape.bounds.wMm}" height="${shape.bounds.hMm}" fill="#eee" stroke="#999" clip-path="url(#${clipId})"/>
    <text x="${shape.bounds.xMm + shape.bounds.wMm/2}" y="${shape.bounds.yMm + shape.bounds.hMm/2}" text-anchor="middle" font-size="3" fill="#666">[${escapeXml(panel["@id"])}]</text>`;
  }

  const bubbles = panel["gh:bubbles"] ?? [];
  let bubblesSvg = "";
  bubbles.forEach((b: any, bIdx: number) => {
    const svg = renderBubbleSvg(b, shape.bounds, bIdx);
    bubblesSvg += `<g transform="translate(${shape.bounds.xMm},${shape.bounds.yMm})">${svg}</g>\n`;
  });

  const sfxArr = panel["gh:sfx"] ?? [];
  let sfxSvg = "";
  sfxArr.forEach((s: any) => {
    sfxSvg += `<g transform="translate(${shape.bounds.xMm},${shape.bounds.yMm})">${renderSfxSvg(s)}</g>\n`;
  });

  const borderEl = `<path d="${shape.d}" fill="none" stroke="#000" stroke-width="0.5"/>`;

  return `<g class="panel panel-${idx}">
  <defs><clipPath id="${clipId}"><path d="${shape.d}"/></clipPath></defs>
  ${imageEl}
  ${borderEl}
  ${bubblesSvg}
  ${sfxSvg}
</g>`;
}

function renderPage(page: any, options: { showFrame: boolean }): string {
  const pageNum = page["gh:pageNumber"];
  const title = page["gh:pageTitle"] ?? "";
  const isSpread = page["gh:pageLayoutV3"]?.["gh:pageType"] === "double-page-spread";

  const canvasW = isSpread ? TRIM.width * 2 : TRIM.width;
  const canvasH = TRIM.height;
  const innerX = INNER.x;
  const innerY = INNER.y;
  const innerW = isSpread ? INNER.w * 2 : INNER.w;

  const frameSvg = options.showFrame ? `
  <g class="manuscript-frame" fill="none" stroke-width="0.2" stroke-dasharray="2,1" opacity="0.6">
    <rect x="${-BLEED}" y="${-BLEED}" width="${canvasW + 2*BLEED}" height="${canvasH + 2*BLEED}" stroke="#cc0000"/>
    <rect x="0" y="0" width="${canvasW}" height="${canvasH}" stroke="#0066cc"/>
    <rect x="${innerX}" y="${innerY}" width="${innerW}" height="${INNER.h}" stroke="#0066cc"/>
    <text x="${innerX}" y="${innerY - 1}" font-size="2" fill="#0066cc">基本枠 ${innerW}×${INNER.h}mm / Trim ${canvasW}×${canvasH} / Bleed ±${BLEED}</text>
  </g>` : "";

  const panels = page["gh:panels"] ?? [];
  let panelsSvg = "";
  panels.forEach((panel: any, idx: number) => {
    const panelSvg = renderPanel(panel, idx);
    panelsSvg += `<g transform="translate(${innerX},${innerY})">${panelSvg}</g>\n`;
  });

  const pageNumSvg = `<text x="${canvasW - 5}" y="${canvasH - 8}" text-anchor="end" font-family="sans-serif" font-size="2.5" fill="#000">— ${pageNum} —</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${canvasW}mm" height="${canvasH}mm"
     viewBox="${-BLEED} ${-BLEED} ${canvasW + 2*BLEED} ${canvasH + 2*BLEED}">
  <title>${escapeXml(title)} (p${pageNum})</title>
  <rect x="${-BLEED}" y="${-BLEED}" width="${canvasW + 2*BLEED}" height="${canvasH + 2*BLEED}" fill="#fff"/>
  ${frameSvg}
  ${panelsSvg}
  ${pageNumSvg}
</svg>`;
}

async function main() {
  const cli = parseArgs();
  const ep = JSON.parse(fs.readFileSync(EPISODE_PATH, "utf-8"));
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const pages: any[] = ep["gh:pages"] ?? [];
  const targets = cli.all ? pages : pages.filter((p) => cli.pages?.includes(p["gh:pageNumber"]));
  if (!targets.length) { console.log("No matching pages."); return; }

  for (const page of targets) {
    const pn = page["gh:pageNumber"];
    const svg = renderPage(page, { showFrame: cli.showFrame });
    const outPath = `${OUTPUT_DIR}/page-${pn.toString().padStart(2, "0")}.svg`;
    fs.writeFileSync(outPath, svg);
    console.log(`p${pn}: ${page["gh:pageTitle"]} → ${outPath}`);
  }
  console.log(`\nDone. ${targets.length} page(s) rendered to ${OUTPUT_DIR}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

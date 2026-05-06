<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { X, Brush, Eraser, Undo2, Trash2, Sparkles, Save } from 'lucide-svelte';

	export let baseImageUrl: string = '';
	export let episodeId: string;
	export let pageNumber: number;
	export let panelIndex: number;
	export let initialAiStrength: number = 60;
	export let tags: string[] = [];

	const dispatch = createEventDispatcher();
	const STYLES = ['Default', 'None', 'Lineart', 'Watercolor', 'Oil painting', 'Anime', '3D render', 'Photoreal', 'Pencil sketch'];

	let bgCanvas: HTMLCanvasElement;
	let drawCanvas: HTMLCanvasElement;
	let bgCtx: CanvasRenderingContext2D | null = null;
	let drawCtx: CanvasRenderingContext2D | null = null;
	let canvasSize = 480;
	const RES = 1024;

	function recomputeCanvasSize() {
		if (typeof window === 'undefined') return;
		const horizontalChrome = 64;
		const verticalChrome = 320;
		const w = Math.max(240, window.innerWidth - horizontalChrome);
		const h = Math.max(240, window.innerHeight - verticalChrome);
		canvasSize = Math.min(w, h, 720);
	}

	let aiStrength = initialAiStrength;
	let overlayOpacity = 80;
	let style = 'Default';
	let tool: 'brush' | 'eraser' = 'brush';
	let brushSize = 4;
	let brushColor = '#111111';
	let drawing = false;
	let lastPoint: { x: number; y: number } | null = null;

	let busy = false;
	let errMsg = '';
	let aiPreviewUrl = '';
	let strokeStack: ImageData[] = [];
	let currentTags: string[] = [...tags];
	let regenSeq = 0;
	let pendingRegen: number | null = null;

	async function loadBaseImage(url: string) {
		if (!bgCtx) return;
		bgCtx.clearRect(0, 0, RES, RES);
		bgCtx.fillStyle = '#ffffff';
		bgCtx.fillRect(0, 0, RES, RES);
		if (!url) return;
		await new Promise<void>((resolve) => {
			const img = new Image();
			const isSameOrigin = url.startsWith('/') || url.startsWith(window.location.origin);
			if (!isSameOrigin) img.crossOrigin = 'anonymous';
			img.onload = () => {
				if (!bgCtx) return resolve();
				const r = Math.min(RES / img.naturalWidth, RES / img.naturalHeight);
				const w = img.naturalWidth * r;
				const h = img.naturalHeight * r;
				bgCtx.drawImage(img, (RES - w) / 2, (RES - h) / 2, w, h);
				resolve();
			};
			img.onerror = () => resolve();
			img.src = url;
		});
	}

	function pointFromEvent(e: PointerEvent): { x: number; y: number } {
		const rect = drawCanvas.getBoundingClientRect();
		const x = ((e.clientX - rect.left) / rect.width) * RES;
		const y = ((e.clientY - rect.top) / rect.height) * RES;
		return { x, y };
	}

	function pushUndoSnapshot() {
		if (!drawCtx) return;
		try {
			strokeStack.push(drawCtx.getImageData(0, 0, RES, RES));
			if (strokeStack.length > 30) strokeStack.shift();
		} catch {}
	}

	function startStroke(e: PointerEvent) {
		if (!drawCtx) {
			drawCtx = drawCanvas?.getContext('2d') ?? null;
			bgCtx = bgCanvas?.getContext('2d') ?? null;
			if (!drawCtx) return;
		}
		e.preventDefault();
		drawing = true;
		pushUndoSnapshot();
		lastPoint = pointFromEvent(e);
		drawCtx.lineCap = 'round';
		drawCtx.lineJoin = 'round';
		drawCtx.lineWidth = brushSize * 2;
		if (tool === 'eraser') {
			drawCtx.globalCompositeOperation = 'destination-out';
			drawCtx.strokeStyle = 'rgba(0,0,0,1)';
		} else {
			drawCtx.globalCompositeOperation = 'source-over';
			drawCtx.strokeStyle = brushColor;
		}
		drawCtx.beginPath();
		drawCtx.arc(lastPoint.x, lastPoint.y, drawCtx.lineWidth / 2, 0, Math.PI * 2);
		drawCtx.fillStyle = drawCtx.strokeStyle as string;
		drawCtx.fill();
		try { (e.target as Element).setPointerCapture(e.pointerId); } catch {}
	}

	function continueStroke(e: PointerEvent) {
		if (!drawing || !drawCtx || !lastPoint) return;
		e.preventDefault();
		const p = pointFromEvent(e);
		drawCtx.beginPath();
		drawCtx.moveTo(lastPoint.x, lastPoint.y);
		drawCtx.lineTo(p.x, p.y);
		drawCtx.stroke();
		lastPoint = p;
	}

	function endStroke(e: PointerEvent) {
		const wasDrawing = drawing;
		drawing = false;
		lastPoint = null;
		try { (e.target as Element).releasePointerCapture(e.pointerId); } catch {}
		if (wasDrawing) scheduleRegen();
	}

	function undo() {
		if (!drawCtx || !strokeStack.length) return;
		drawCtx.putImageData(strokeStack.pop()!, 0, 0);
		scheduleRegen();
	}

	function clearStrokes() {
		if (!drawCtx) return;
		pushUndoSnapshot();
		drawCtx.clearRect(0, 0, RES, RES);
		scheduleRegen();
	}

	function flatten(): Promise<Blob> {
		const out = document.createElement('canvas');
		out.width = RES; out.height = RES;
		const ctx = out.getContext('2d')!;
		ctx.drawImage(bgCanvas, 0, 0);
		ctx.drawImage(drawCanvas, 0, 0);
		return new Promise((resolve, reject) => out.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png'));
	}

	function scribbleOnWhite(): Promise<Blob> {
		const out = document.createElement('canvas');
		out.width = RES; out.height = RES;
		const ctx = out.getContext('2d')!;
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, RES, RES);
		ctx.drawImage(drawCanvas, 0, 0);
		return new Promise((resolve, reject) => out.toBlob((b) => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png'));
	}

	function hasStrokes(): boolean {
		if (!drawCtx) return false;
		try {
			const data = drawCtx.getImageData(0, 0, RES, RES).data;
			for (let i = 3; i < data.length; i += 4) if (data[i] > 0) return true;
		} catch {}
		return false;
	}

	async function blobToBase64(b: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			const r = new FileReader();
			r.onload = () => resolve(String(r.result));
			r.onerror = () => reject(r.error);
			r.readAsDataURL(b);
		});
	}

	function scheduleRegen() {
		if (pendingRegen !== null) clearTimeout(pendingRegen);
		pendingRegen = window.setTimeout(() => {
			pendingRegen = null;
			runRegen();
		}, 400);
	}

	async function runRegen() {
		if (busy) {
			scheduleRegen();
			return;
		}
		const mySeq = ++regenSeq;
		busy = true; errMsg = '';
		try {
			const flatBlob = await flatten();
			const flatUrl = await blobToBase64(flatBlob);
			let scribbleUrl: string | undefined;
			if (hasStrokes()) {
				const scribBlob = await scribbleOnWhite();
				scribbleUrl = await blobToBase64(scribBlob);
			}
			const extra = currentTags.length ? currentTags.join(', ') : undefined;
			const res = await fetch('/api/panels/sdxl-sketch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					episodeId, pageNumber, panelIndex,
					image: flatUrl,
					scribble: scribbleUrl,
					aiStrength,
					style,
					extraPositive: extra,
					persist: false
				})
			});
			if (!res.ok) {
				const t = await res.text();
				throw new Error(`HTTP ${res.status}: ${t.slice(0, 300)}`);
			}
			const buf = await res.arrayBuffer();
			if (mySeq !== regenSeq) return;
			const previewBlob = new Blob([buf], { type: 'image/png' });
			if (aiPreviewUrl) URL.revokeObjectURL(aiPreviewUrl);
			aiPreviewUrl = URL.createObjectURL(previewBlob);
		} catch (err) {
			if (mySeq !== regenSeq) return;
			errMsg = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			busy = false;
		}
	}

	async function persistCurrent() {
		if (busy) return;
		busy = true; errMsg = '';
		try {
			const flatBlob = await flatten();
			const flatUrl = await blobToBase64(flatBlob);
			let scribbleUrl: string | undefined;
			if (hasStrokes()) {
				const scribBlob = await scribbleOnWhite();
				scribbleUrl = await blobToBase64(scribBlob);
			}
			const extra = currentTags.length ? currentTags.join(', ') : undefined;
			const res = await fetch('/api/panels/sdxl-sketch', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					episodeId, pageNumber, panelIndex,
					image: flatUrl,
					scribble: scribbleUrl,
					aiStrength,
					style,
					extraPositive: extra,
					persist: true
				})
			});
			if (!res.ok) {
				const t = await res.text();
				throw new Error(`HTTP ${res.status}: ${t.slice(0, 300)}`);
			}
			const data = await res.json();
			if (!data.success) throw new Error(data.message || 'Generation failed');
			dispatch('saved', data);
			close();
		} catch (err) {
			errMsg = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			busy = false;
		}
	}

	function bakePreviewIntoBase() {
		if (!aiPreviewUrl) return;
		loadBaseImage(aiPreviewUrl).then(() => {
			if (drawCtx) drawCtx.clearRect(0, 0, RES, RES);
			strokeStack = [];
			URL.revokeObjectURL(aiPreviewUrl);
			aiPreviewUrl = '';
		});
	}

	function removeTag(t: string) {
		currentTags = currentTags.filter((x) => x !== t);
		if (aiPreviewUrl) scheduleRegen();
	}

	function close() {
		if (aiPreviewUrl) { try { URL.revokeObjectURL(aiPreviewUrl); } catch {} }
		dispatch('close');
	}

	function onParamChange() {
		if (aiPreviewUrl) scheduleRegen();
	}

	onMount(async () => {
		recomputeCanvasSize();
		window.addEventListener('resize', recomputeCanvasSize);
		bgCtx = bgCanvas.getContext('2d');
		drawCtx = drawCanvas.getContext('2d');
		await loadBaseImage(baseImageUrl);
		return () => {
			window.removeEventListener('resize', recomputeCanvasSize);
			if (pendingRegen !== null) clearTimeout(pendingRegen);
			if (aiPreviewUrl) { try { URL.revokeObjectURL(aiPreviewUrl); } catch {} }
		};
	});
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4" role="dialog" aria-modal="true">
	<div class="flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
		<div class="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
			<div class="flex items-center gap-2">
				<Sparkles size={16} class="text-purple-600" />
				<span class="text-[14px] font-semibold text-zinc-800">Sketch + AI</span>
				{#if busy}
					<span class="ml-2 inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
						<span class="h-2 w-2 animate-pulse rounded-full bg-purple-500"></span>
						generating
					</span>
				{/if}
			</div>
			<button type="button" onclick={close} class="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100" aria-label="Close"><X size={18} /></button>
		</div>

		<div class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-zinc-200 px-4 py-2 text-[12px] text-zinc-700">
			<label class="flex flex-1 min-w-[180px] items-center gap-2">
				<span class="font-semibold whitespace-nowrap">AI Strength</span>
				<input type="range" min="10" max="95" bind:value={aiStrength} oninput={onParamChange} class="flex-1 accent-purple-600" />
				<span class="w-10 text-right tabular-nums">{aiStrength}%</span>
			</label>
			<label class="flex flex-1 min-w-[180px] items-center gap-2">
				<span class="font-semibold whitespace-nowrap">Overlay</span>
				<input type="range" min="0" max="100" bind:value={overlayOpacity} class="flex-1 accent-purple-600" />
				<span class="w-10 text-right tabular-nums">{overlayOpacity}%</span>
			</label>
		</div>

		<div class="relative mx-auto flex w-full justify-center overflow-auto bg-zinc-50 p-2 sm:p-4">
			<div class="relative" style="width: {canvasSize}px; height: {canvasSize}px;">
				<canvas bind:this={bgCanvas} width={RES} height={RES} class="absolute inset-0 h-full w-full rounded-lg border border-zinc-200 bg-white"></canvas>
				{#if aiPreviewUrl}
					<img
						src={aiPreviewUrl}
						alt="AI preview"
						class="pointer-events-none absolute inset-0 h-full w-full rounded-lg object-contain"
						style="opacity: {overlayOpacity / 100};"
					/>
				{/if}
				<canvas
					bind:this={drawCanvas} width={RES} height={RES}
					class="absolute inset-0 h-full w-full touch-none rounded-lg"
					style="cursor: {tool === 'eraser' ? 'cell' : 'crosshair'};"
					onpointerdown={startStroke}
					onpointermove={continueStroke}
					onpointerup={endStroke}
					onpointercancel={endStroke}
				></canvas>
				{#if aiPreviewUrl}
					<button
						type="button"
						onclick={bakePreviewIntoBase}
						class="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-[11px] font-semibold text-purple-700 shadow"
						title="Bake preview into base, clear strokes"
					>
						<Save size={12} /> Bake
					</button>
				{/if}
			</div>
		</div>
		{#if errMsg}<div class="border-t border-red-200 bg-red-50 px-3 py-1.5 text-[12px] text-red-600">{errMsg}</div>{/if}

		<div class="flex items-center gap-2 border-t border-zinc-200 px-4 py-2">
			<div class="flex gap-1">
				<button type="button" onclick={() => tool = 'brush'} class="flex h-8 w-8 items-center justify-center rounded-lg border {tool === 'brush' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-zinc-200 text-zinc-600'}" aria-label="Brush"><Brush size={14} /></button>
				<button type="button" onclick={() => tool = 'eraser'} class="flex h-8 w-8 items-center justify-center rounded-lg border {tool === 'eraser' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-zinc-200 text-zinc-600'}" aria-label="Eraser"><Eraser size={14} /></button>
				<button type="button" onclick={undo} class="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600" aria-label="Undo"><Undo2 size={14} /></button>
				<button type="button" onclick={clearStrokes} class="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600" aria-label="Clear"><Trash2 size={14} /></button>
			</div>
			<input type="color" bind:value={brushColor} class="h-8 w-8 cursor-pointer rounded border border-zinc-200" disabled={tool === 'eraser'} />
			<label class="ml-2 flex items-center gap-1 text-[11px] text-zinc-600">
				Size <input type="range" min="1" max="40" bind:value={brushSize} class="w-20 accent-purple-600" />
				<span class="w-6 tabular-nums">{brushSize}</span>
			</label>
		</div>

		<div class="flex flex-wrap gap-1.5 border-t border-zinc-200 px-4 py-2">
			{#each STYLES as s}
				<button
					type="button"
					onclick={() => { style = s; onParamChange(); }}
					class="rounded-full border px-3 py-1 text-[12px] {style === s ? 'border-purple-600 bg-purple-600 text-white' : 'border-zinc-200 bg-white text-zinc-700'}"
				>{s}</button>
			{/each}
		</div>

		{#if currentTags.length}
			<div class="flex max-h-[80px] flex-wrap gap-1 overflow-auto border-t border-zinc-200 bg-zinc-50 px-4 py-2">
				{#each currentTags as t}
					<button type="button" onclick={() => removeTag(t)} class="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] text-purple-800 hover:bg-red-100 hover:text-red-700">
						<span class="text-zinc-500">×</span> {t}
					</button>
				{/each}
			</div>
		{/if}

		<div class="flex items-center justify-between gap-2 border-t border-zinc-200 px-4 py-3">
			<span class="text-[11px] text-zinc-500">
				{#if busy}Generating preview…{:else if aiPreviewUrl}Auto-updates after each stroke{:else}Draw to start{/if}
			</span>
			<div class="flex gap-2">
				<button type="button" onclick={close} class="rounded-lg border border-zinc-200 px-3 py-2 text-[12px] font-semibold text-zinc-700">Cancel</button>
				<button type="button" onclick={persistCurrent} disabled={busy} class="rounded-lg bg-purple-600 px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50">Save as new version</button>
			</div>
		</div>
	</div>
</div>

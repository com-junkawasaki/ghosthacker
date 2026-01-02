<script lang="ts">
	type Props = {
		storyboardId: string;
		sceneDescription?: string;
		sceneImageUrl?: string;
		onVideoGenerated?: (videoUrl: string, videoId: string) => void;
		onClose?: () => void;
	};

	let { storyboardId, sceneDescription, sceneImageUrl, onVideoGenerated, onClose }: Props =
		$props();

	let promptText = $state(sceneDescription || '');
	let promptImageUrl = $state(sceneImageUrl || '');
	let model = $state<'gen3a_turbo' | 'gen3a'>('gen3a_turbo');
	let duration = $state<5 | 10>(5);
	let aspectRatio = $state<'16:9' | '9:16' | '1:1'>('16:9');
	let isGenerating = $state(false);
	let progress = $state<string>('');
	let error = $state<string>('');

	async function handleGenerate() {
		if (!promptText.trim()) {
			error = 'Please provide a description for the video';
			return;
		}

		isGenerating = true;
		error = '';
		progress = 'Starting video generation...';

		try {
			// Step 1: Start generation
			const response = await fetch('/api/runway/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					storyboardId,
					promptText,
					promptImageUrl: promptImageUrl || undefined,
					model,
					duration,
					aspectRatio
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to start video generation');
			}

			const data = await response.json();
			progress = 'Video generation in progress...';

			// Step 2: Poll for status
			await pollTaskStatus(data.taskId);
		} catch (err: any) {
			error = err.message || 'Failed to generate video';
			isGenerating = false;
		}
	}

	async function pollTaskStatus(taskId: string) {
		const maxAttempts = 120; // 10 minutes maximum (120 * 5 seconds)
		let attempts = 0;

		const poll = async () => {
			try {
				const response = await fetch(`/api/runway/status/${taskId}`);
				if (!response.ok) {
					throw new Error('Failed to check status');
				}

				const data = await response.json();

				if (data.status === 'completed') {
					progress = 'Video generated successfully!';
					isGenerating = false;
					if (data.videoUrls && data.videoUrls.length > 0) {
						onVideoGenerated?.(data.videoUrls[0], data.taskId);
					}
					return;
				} else if (data.status === 'failed') {
					error = data.errorMessage || 'Video generation failed';
					isGenerating = false;
					return;
				} else {
					// Still processing
					progress = `Generating video... (${Math.floor((attempts / maxAttempts) * 100)}%)`;
					attempts++;

					if (attempts < maxAttempts) {
						setTimeout(poll, 5000); // Poll every 5 seconds
					} else {
						error = 'Video generation timed out';
						isGenerating = false;
					}
				}
			} catch (err: any) {
				error = err.message || 'Failed to check generation status';
				isGenerating = false;
			}
		};

		poll();
	}

	function handleClose() {
		if (!isGenerating) {
			onClose?.();
		}
	}

	function handleBackgroundClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
	onclick={handleBackgroundClick}
	role="dialog"
	aria-modal="true"
	aria-labelledby="runway-generator-title"
>
	<div class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-2xl dark:bg-gray-800">
		<div class="mb-4 flex items-center justify-between">
			<h2 id="runway-generator-title" class="text-2xl font-bold text-gray-900 dark:text-white">
				Generate Video with Runway ML
			</h2>
			<button
				onclick={handleClose}
				disabled={isGenerating}
				class="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-700"
				aria-label="Close dialog"
			>
				<svg
					class="h-6 w-6 text-gray-600 dark:text-gray-300"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>

		<div class="space-y-4">
			<!-- Prompt Text -->
			<div>
				<label for="promptText" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
					Video Description *
				</label>
				<textarea
					id="promptText"
					bind:value={promptText}
					placeholder="Describe the video scene you want to generate..."
					class="w-full rounded-lg border border-gray-300 p-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					rows="4"
					disabled={isGenerating}
				></textarea>
			</div>

			<!-- Prompt Image (Optional) -->
			<div>
				<label for="promptImageUrl" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
					Reference Image URL (Optional)
				</label>
				<input
					id="promptImageUrl"
					type="text"
					bind:value={promptImageUrl}
					placeholder="https://example.com/image.jpg or base64..."
					class="w-full rounded-lg border border-gray-300 p-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					disabled={isGenerating}
				/>
			</div>

			<!-- Settings Row -->
			<div class="grid grid-cols-3 gap-4">
				<!-- Model Selection -->
				<div>
					<label for="model" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
						Model
					</label>
					<select
						id="model"
						bind:value={model}
						class="w-full rounded-lg border border-gray-300 p-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
						disabled={isGenerating}
					>
						<option value="gen3a_turbo">Gen-3 Alpha Turbo (Fast)</option>
						<option value="gen3a">Gen-3 Alpha (High Quality)</option>
					</select>
				</div>

				<!-- Duration -->
				<div>
					<label for="duration" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
						Duration
					</label>
					<select
						id="duration"
						bind:value={duration}
						class="w-full rounded-lg border border-gray-300 p-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
						disabled={isGenerating}
					>
						<option value={5}>5 seconds</option>
						<option value={10}>10 seconds</option>
					</select>
				</div>

				<!-- Aspect Ratio -->
				<div>
					<label for="aspectRatio" class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
						Aspect Ratio
					</label>
					<select
						id="aspectRatio"
						bind:value={aspectRatio}
						class="w-full rounded-lg border border-gray-300 p-3 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
						disabled={isGenerating}
					>
						<option value="16:9">16:9 (Landscape)</option>
						<option value="9:16">9:16 (Portrait)</option>
						<option value="1:1">1:1 (Square)</option>
					</select>
				</div>
			</div>

			<!-- Progress/Error Messages -->
			{#if progress}
				<div class="rounded-lg bg-blue-50 p-4 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
					<div class="flex items-center gap-2">
						{#if isGenerating}
							<svg
								class="h-5 w-5 animate-spin"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						{/if}
						<span>{progress}</span>
					</div>
				</div>
			{/if}

			{#if error}
				<div class="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900 dark:text-red-200">
					{error}
				</div>
			{/if}

			<!-- Action Buttons -->
			<div class="flex justify-end gap-3">
				<button
					onclick={handleClose}
					disabled={isGenerating}
					class="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
				>
					{isGenerating ? 'Generating...' : 'Cancel'}
				</button>
				<button
					onclick={handleGenerate}
					disabled={isGenerating || !promptText.trim()}
					class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
				>
					{isGenerating ? 'Generating...' : 'Generate Video'}
				</button>
			</div>
		</div>
	</div>
</div>


<script lang="ts">
	type Props = {
		selectedType: string;
		onSelectType: (type: string) => void;
		onSelectAsset: (asset: any) => void;
	};

	let { selectedType, onSelectType, onSelectAsset }: Props = $props();

	const assetCategories = [
		{ id: 'media', label: 'Media', icon: '📁' },
		{ id: 'audio', label: 'Audio', icon: '🎵' },
		{ id: 'characters', label: 'Characters', icon: '👤' },
		{ id: 'backgrounds', label: 'Backgrounds', icon: '🏞️' },
		{ id: 'props', label: 'Props', icon: '🎭' },
		{ id: 'pieces', label: 'Pieces', icon: '🧩' },
		{ id: 'locations', label: 'Locations', icon: '📍' },
		{ id: 'dialogs', label: 'Dialogs', icon: '💬' },
		{ id: 'environments', label: 'Environments', icon: '🌤️' },
		{ id: 'worlds', label: 'Worlds', icon: '🌍' },
		{ id: 'titles', label: 'Titles', icon: '📝' },
		{ id: 'transitions', label: 'Transitions', icon: '↔️' },
		{ id: 'effects', label: 'Effects', icon: '✨' },
		{ id: 'overlays', label: 'Overlays', icon: '🖼️' },
		{ id: 'subtitles', label: 'Subtitles', icon: '💭' },
		{ id: 'templates', label: 'Templates', icon: '📋' },
	];

	const audioSubcategories = [
		{ id: 'my-audio', label: 'My Audio', expanded: false },
		{ id: 'ai-generation', label: 'AI Generation', expanded: true, children: [
			{ id: 'ai-music', label: 'AI Music', icon: '🎼' },
			{ id: 'subtitle-read-aloud', label: 'Subtitle Read Aloud', icon: '🗣️' },
		]},
		{ id: 'bgm', label: 'BGM', expanded: false },
		{ id: 'sound-effects', label: 'Sound Effects', icon: '🔊' },
	];
</script>

<div class="asset-library">
	<div class="asset-categories">
		{#each assetCategories as category}
			<button
				class="category-button"
				class:active={selectedType === category.id}
				onclick={() => onSelectType(category.id)}
			>
				<span class="category-icon">{category.icon}</span>
				<span class="category-label">{category.label}</span>
			</button>
		{/each}
	</div>

	{#if selectedType === 'audio'}
		<div class="audio-subcategories">
			{#each audioSubcategories as subcategory}
				<div class="subcategory">
					<button
						class="subcategory-header"
						onclick={() => {
							if (subcategory.children) {
								subcategory.expanded = !subcategory.expanded;
							}
						}}
					>
						<span class="subcategory-icon">
							{#if subcategory.expanded}▼{:else}▶{/if}
						</span>
						<span class="subcategory-label">{subcategory.label}</span>
					</button>
					{#if subcategory.expanded && subcategory.children}
						<div class="subcategory-children">
							{#each subcategory.children as child}
								<button
									class="subcategory-item"
									onclick={() => onSelectAsset({ type: child.id, label: child.label })}
								>
									<span class="item-icon">{child.icon || '🎵'}</span>
									<span class="item-label">{child.label}</span>
								</button>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
			<button class="ai-generate-button" onclick={() => {
				if (onSelectAsset) {
					onSelectAsset({ type: 'suno-generator', label: 'Generate Music' });
				}
			}}>
				<span class="ai-icon">🤖</span>
				<span>Music Generation AI</span>
			</button>
		</div>
	{/if}
</div>

<style>
	.asset-library {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: #1a1a1a;
	}

	.asset-categories {
		display: flex;
		flex-direction: column;
		padding: 0.5rem;
		gap: 0.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
	}

	.category-button {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		border-radius: 0.25rem;
		text-align: left;
		transition: all 0.2s;
	}

	.category-button:hover {
		background: rgba(255, 255, 255, 0.05);
		color: white;
	}

	.category-button.active {
		background: rgba(59, 130, 246, 0.15);
		color: #3b82f6;
	}

	.category-icon {
		font-size: 1.25rem;
	}

	.category-label {
		font-size: 0.875rem;
	}

	.audio-subcategories {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.subcategory {
		margin-bottom: 0.5rem;
	}

	.subcategory-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		text-align: left;
		font-size: 0.875rem;
	}

	.subcategory-header:hover {
		color: white;
	}

	.subcategory-icon {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.subcategory-children {
		margin-left: 1.5rem;
		margin-top: 0.25rem;
	}

	.subcategory-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.7);
		cursor: pointer;
		text-align: left;
		font-size: 0.875rem;
		border-radius: 0.25rem;
	}

	.subcategory-item:hover {
		background: rgba(255, 255, 255, 0.05);
		color: white;
	}

	.item-icon {
		font-size: 1rem;
	}

	.ai-generate-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.75rem;
		background: rgba(59, 130, 246, 0.2);
		border: 1px solid rgba(59, 130, 246, 0.4);
		color: #3b82f6;
		cursor: pointer;
		border-radius: 0.25rem;
		font-size: 0.875rem;
		margin-top: 0.5rem;
	}

	.ai-generate-button:hover {
		background: rgba(59, 130, 246, 0.3);
	}

	.ai-icon {
		font-size: 1rem;
	}
</style>

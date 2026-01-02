<script lang="ts">
	import type { TeamMember } from '$lib/types/organization';

	interface Props {
		teamMembers: TeamMember[];
		roleId: string;
		onAssign: (memberId: string) => void;
		onClose: () => void;
	}

	let { teamMembers, roleId, onAssign, onClose }: Props = $props();

	let searchQuery = $state('');

	const filteredMembers = $derived(
		teamMembers.filter(member => 
			member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(member.email && member.email.toLowerCase().includes(searchQuery.toLowerCase()))
		)
	);

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map(part => part[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div 
	class="dialog-backdrop" 
	onclick={handleBackdropClick}
	role="dialog"
	aria-modal="true"
	aria-labelledby="dialog-title"
>
	<div class="dialog">
		<header class="dialog-header">
			<h3 id="dialog-title">メンバーをアサイン</h3>
			<button class="close-btn" onclick={onClose} aria-label="閉じる">×</button>
		</header>

		<div class="search-box">
			<input
				type="text"
				placeholder="メンバーを検索..."
				bind:value={searchQuery}
			/>
		</div>

		<div class="members-list">
			{#each filteredMembers as member}
				<button
					class="member-item"
					onclick={() => onAssign(member.id)}
				>
					{#if member.avatarUrl}
						<img 
							src={member.avatarUrl} 
							alt={member.name}
							class="member-avatar"
						/>
					{:else}
						<div class="member-initials">
							{getInitials(member.name)}
						</div>
					{/if}
					<div class="member-info">
						<span class="member-name">{member.name}</span>
						{#if member.email}
							<span class="member-email">{member.email}</span>
						{/if}
					</div>
				</button>
			{:else}
				<p class="no-results">
					{#if searchQuery}
						検索結果がありません
					{:else}
						メンバーがいません
					{/if}
				</p>
			{/each}
		</div>
	</div>
</div>

<style>
	.dialog-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.dialog {
		background: var(--bg-primary, #1a1a2e);
		border-radius: 12px;
		width: 100%;
		max-width: 400px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--border-color, #2a2a4a);
	}

	.dialog-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border-color, #2a2a4a);
	}

	.dialog-header h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary, #fff);
		margin: 0;
	}

	.close-btn {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: var(--bg-secondary, #16213e);
		border: none;
		color: var(--text-secondary, #a0a0a0);
		font-size: 1.25rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		background: var(--bg-tertiary, #0f0f23);
		color: var(--text-primary, #fff);
	}

	.search-box {
		padding: 0.75rem 1.25rem;
	}

	.search-box input {
		width: 100%;
		padding: 0.625rem 0.875rem;
		border-radius: 8px;
		border: 1px solid var(--border-color, #2a2a4a);
		background: var(--bg-secondary, #16213e);
		color: var(--text-primary, #fff);
		font-size: 0.875rem;
	}

	.search-box input::placeholder {
		color: var(--text-tertiary, #6b7280);
	}

	.search-box input:focus {
		outline: none;
		border-color: var(--accent-color, #6366f1);
	}

	.members-list {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.member-item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: transparent;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		text-align: left;
		color: inherit;
	}

	.member-item:hover {
		background: var(--bg-secondary, #16213e);
	}

	.member-avatar {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		object-fit: cover;
	}

	.member-initials {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		background: var(--accent-color, #6366f1);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.member-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.member-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #fff);
	}

	.member-email {
		font-size: 0.75rem;
		color: var(--text-secondary, #a0a0a0);
	}

	.no-results {
		text-align: center;
		padding: 2rem;
		color: var(--text-secondary, #a0a0a0);
		font-size: 0.875rem;
		margin: 0;
	}
</style>

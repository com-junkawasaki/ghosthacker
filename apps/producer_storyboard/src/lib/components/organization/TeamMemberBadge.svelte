<script lang="ts">
	import type { TeamMember } from '$lib/types/organization';

	interface Props {
		member: TeamMember;
		onRemove?: () => void;
		showRemove?: boolean;
	}

	let { member, onRemove, showRemove = true }: Props = $props();

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map(part => part[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}
</script>

<div class="member-badge">
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
	<span class="member-name">{member.name}</span>
	{#if showRemove && onRemove}
		<button 
			class="remove-btn"
			onclick={onRemove}
			aria-label="Remove {member.name}"
		>
			×
		</button>
	{/if}
</div>

<style>
	.member-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		background: var(--bg-secondary, #16213e);
		border-radius: 9999px;
		padding: 0.25rem 0.5rem 0.25rem 0.25rem;
		font-size: 0.75rem;
	}

	.member-avatar {
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		object-fit: cover;
	}

	.member-initials {
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		background: var(--accent-color, #6366f1);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.5rem;
		font-weight: 600;
	}

	.member-name {
		color: var(--text-primary, #fff);
		white-space: nowrap;
	}

	.remove-btn {
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		background: var(--bg-tertiary, #0f0f23);
		border: none;
		color: var(--text-secondary, #a0a0a0);
		font-size: 0.75rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-left: 0.125rem;
	}

	.remove-btn:hover {
		background: var(--danger-color, #ef4444);
		color: white;
	}
</style>

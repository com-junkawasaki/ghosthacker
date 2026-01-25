<script lang="ts">
	import TeamMemberBadge from './TeamMemberBadge.svelte';
	import PermissionBadge from './PermissionBadge.svelte';
	import type { Role, TeamMember } from '$lib/types/organization';

	interface Props {
		role: Role;
		members: TeamMember[];
		onAddMember?: () => void;
		onRemoveMember?: (memberId: string) => void;
	}

	let { role, members = [], onAddMember, onRemoveMember }: Props = $props();

	let expanded = $state(false);
</script>

<div class="role-card">
	<button 
		class="role-header"
		onclick={() => expanded = !expanded}
		aria-expanded={expanded}
	>
		<div class="role-info">
			<span class="role-name">{role.nameJa}</span>
			<span class="role-name-en">{role.name}</span>
		</div>
		<div class="role-meta">
			<span class="member-count">{members.length}人</span>
			<span class="expand-icon" class:expanded>{expanded ? '▲' : '▼'}</span>
		</div>
	</button>

	{#if expanded}
		<div class="role-content">
			{#if role.description}
				<p class="role-description">{role.description}</p>
			{/if}

			{#if role.permissions && role.permissions.length > 0}
				<div class="permissions-list">
					{#each role.permissions as permission}
						<PermissionBadge scope={permission.scope} level={permission.level} />
					{/each}
				</div>
			{/if}

			<div class="members-section">
				<h4 class="members-title">アサイン済みメンバー</h4>
				<div class="members-list">
					{#each members as member}
						<TeamMemberBadge
							{member}
							onRemove={() => onRemoveMember?.(member.id)}
						/>
					{:else}
						<p class="no-members">メンバーがアサインされていません</p>
					{/each}
				</div>
				<button class="add-member-btn" onclick={onAddMember}>
					+ メンバーを追加
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.role-card {
		background: var(--bg-tertiary, #0f0f23);
		border-radius: 8px;
		overflow: hidden;
	}

	.role-header {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		color: inherit;
	}

	.role-header:hover {
		background: var(--bg-hover, rgba(255, 255, 255, 0.05));
	}

	.role-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.role-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #fff);
	}

	.role-name-en {
		font-size: 0.75rem;
		color: var(--text-tertiary, #6b7280);
	}

	.role-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.member-count {
		font-size: 0.75rem;
		color: var(--text-secondary, #a0a0a0);
		background: var(--bg-secondary, #16213e);
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
	}

	.expand-icon {
		font-size: 0.625rem;
		color: var(--text-secondary, #a0a0a0);
		transition: transform 0.2s;
	}

	.role-content {
		padding: 0.75rem 1rem 1rem;
		border-top: 1px solid var(--border-color, #2a2a4a);
	}

	.role-description {
		font-size: 0.75rem;
		color: var(--text-secondary, #a0a0a0);
		margin: 0 0 0.75rem 0;
	}

	.permissions-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-bottom: 0.75rem;
	}

	.members-section {
		margin-top: 0.75rem;
	}

	.members-title {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary, #a0a0a0);
		margin: 0 0 0.5rem 0;
	}

	.members-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.no-members {
		font-size: 0.75rem;
		color: var(--text-tertiary, #6b7280);
		margin: 0;
	}

	.add-member-btn {
		font-size: 0.75rem;
		color: var(--accent-color, #6366f1);
		background: transparent;
		border: 1px dashed var(--accent-color, #6366f1);
		border-radius: 6px;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.add-member-btn:hover {
		background: var(--accent-color-alpha, rgba(99, 102, 241, 0.1));
	}
</style>

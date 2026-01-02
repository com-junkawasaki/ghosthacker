<script lang="ts">
	import RoleCard from './RoleCard.svelte';
	import type { Department, RoleAssignment } from '$lib/types/organization';

	interface Props {
		department: Department;
		assignments: RoleAssignment[];
		onAddMember?: (roleId: string) => void;
		onRemoveMember?: (assignmentId: string) => void;
	}

	let { department, assignments = [], onAddMember, onRemoveMember }: Props = $props();

	const departmentTypeLabels: Record<string, { en: string; ja: string }> = {
		production_leadership: { en: 'Production Leadership', ja: '制作統括' },
		creative_leadership: { en: 'Creative Leadership', ja: 'クリエイティブ統括' },
		script: { en: 'Script', ja: '脚本' },
		visual: { en: 'Visual', ja: 'ビジュアル' },
		direction: { en: 'Direction/Photography', ja: '演出・撮影' },
		audio: { en: 'Audio', ja: '音響' },
		post_production: { en: 'Post-Production', ja: '編集・仕上げ' },
	};

	const typeLabel = $derived(
		departmentTypeLabels[department.type] || { en: department.name, ja: department.nameJa }
	);
</script>

<div class="department-card">
	<header class="department-header">
		<h3 class="department-name">{department.nameJa}</h3>
		<span class="department-name-en">{department.name}</span>
	</header>

	<div class="roles-list">
		{#each assignments as assignment}
			<RoleCard
				role={assignment.role}
				members={assignment.members}
				onAddMember={() => onAddMember?.(assignment.role.id)}
				onRemoveMember={onRemoveMember}
			/>
		{:else}
			<p class="no-roles">役職が設定されていません</p>
		{/each}
	</div>
</div>

<style>
	.department-card {
		background: var(--bg-secondary, #16213e);
		border-radius: 12px;
		padding: 1.25rem;
		border: 1px solid var(--border-color, #2a2a4a);
	}

	.department-header {
		margin-bottom: 1rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-color, #2a2a4a);
	}

	.department-name {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary, #fff);
		margin: 0 0 0.25rem 0;
	}

	.department-name-en {
		font-size: 0.75rem;
		color: var(--text-tertiary, #6b7280);
	}

	.roles-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.no-roles {
		font-size: 0.875rem;
		color: var(--text-secondary, #a0a0a0);
		text-align: center;
		padding: 1rem;
		margin: 0;
	}
</style>

<script lang="ts">
	interface Props {
		scope: string;
		level: number;
	}

	let { scope, level }: Props = $props();

	const scopeLabels: Record<string, string> = {
		script: '脚本',
		storyboard: '絵コンテ',
		animation: '作画',
		audio: '音響',
		editing: '編集',
		assignment: 'アサイン',
		budget: '予算',
	};

	const levelLabels: Record<number, { label: string; color: string }> = {
		1: { label: 'View', color: '#6b7280' },
		2: { label: 'Edit', color: '#3b82f6' },
		3: { label: 'Review', color: '#8b5cf6' },
		4: { label: 'Approve', color: '#10b981' },
		5: { label: 'Admin', color: '#f59e0b' },
	};

	const scopeLabel = $derived(scopeLabels[scope] || scope);
	const levelInfo = $derived(levelLabels[level] || { label: 'L' + level, color: '#6b7280' });
</script>

<span 
	class="permission-badge"
	style="--badge-color: {levelInfo.color}"
>
	<span class="scope">{scopeLabel}</span>
	<span class="level">{levelInfo.label}</span>
</span>

<style>
	.permission-badge {
		display: inline-flex;
		align-items: center;
		font-size: 0.625rem;
		border-radius: 4px;
		overflow: hidden;
	}

	.scope {
		background: var(--bg-secondary, #16213e);
		color: var(--text-secondary, #a0a0a0);
		padding: 0.125rem 0.375rem;
	}

	.level {
		background: var(--badge-color);
		color: white;
		padding: 0.125rem 0.375rem;
		font-weight: 500;
	}
</style>

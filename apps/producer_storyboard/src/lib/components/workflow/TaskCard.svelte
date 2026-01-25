<script lang="ts">
	import type { Task } from '$lib/types/workflow';

	interface Props {
		task: Task;
		onClick?: () => void;
	}

	let { task, onClick }: Props = $props();

	const statusColors: Record<string, string> = {
		created: '#6b7280',
		assigned: '#3b82f6',
		in_progress: '#f59e0b',
		blocked: '#ef4444',
		review: '#8b5cf6',
		completed: '#10b981',
		cancelled: '#6b7280',
	};

	const statusColor = $derived(statusColors[task.status] || '#6b7280');

	function formatDeadline(deadline?: string): string {
		if (!deadline) return '';
		const date = new Date(deadline);
		const now = new Date();
		const diff = date.getTime() - now.getTime();
		const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
		
		if (days < 0) return '期限超過';
		if (days === 0) return '今日まで';
		if (days === 1) return '明日まで';
		return `${days}日後`;
	}

	const deadlineText = $derived(formatDeadline(task.deadline));
	const isOverdue = $derived(task.deadline ? new Date(task.deadline) < new Date() : false);
</script>

<button 
	class="task-card"
	onclick={onClick}
	style="--status-color: {statusColor}"
>
	<div class="task-status-indicator"></div>
	
	<div class="task-content">
		<h4 class="task-title">{task.title}</h4>
		
		{#if task.description}
			<p class="task-description">{task.description}</p>
		{/if}

		<div class="task-meta">
			{#if deadlineText}
				<span class="deadline" class:overdue={isOverdue}>
					{deadlineText}
				</span>
			{/if}

			{#if task.assigneeName}
				<span class="assignee">
					{task.assigneeName}
				</span>
			{/if}
		</div>
	</div>
</button>

<style>
	.task-card {
		width: 100%;
		background: var(--bg-tertiary, #0f0f23);
		border: 1px solid var(--border-color, #2a2a4a);
		border-radius: 8px;
		padding: 0.75rem;
		text-align: left;
		cursor: pointer;
		position: relative;
		overflow: hidden;
		transition: all 0.2s;
		color: inherit;
	}

	.task-card:hover {
		border-color: var(--status-color);
		transform: translateY(-2px);
	}

	.task-status-indicator {
		position: absolute;
		top: 0;
		left: 0;
		width: 3px;
		height: 100%;
		background: var(--status-color);
	}

	.task-content {
		padding-left: 0.5rem;
	}

	.task-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #fff);
		margin: 0 0 0.375rem 0;
		line-height: 1.3;
	}

	.task-description {
		font-size: 0.75rem;
		color: var(--text-secondary, #a0a0a0);
		margin: 0 0 0.5rem 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.task-meta {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.625rem;
	}

	.deadline {
		background: var(--bg-secondary, #16213e);
		color: var(--text-secondary, #a0a0a0);
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
	}

	.deadline.overdue {
		background: var(--danger-color-alpha, rgba(239, 68, 68, 0.2));
		color: var(--danger-color, #ef4444);
	}

	.assignee {
		background: var(--accent-color-alpha, rgba(99, 102, 241, 0.2));
		color: var(--accent-color, #6366f1);
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
	}
</style>

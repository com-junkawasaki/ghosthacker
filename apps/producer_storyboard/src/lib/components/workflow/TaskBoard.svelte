<script lang="ts">
	import TaskCard from './TaskCard.svelte';
	import type { Task, TaskStatus } from '$lib/types/workflow';

	interface Props {
		tasks: Task[];
		projectId: string;
		onUpdateStatus?: (taskId: string, status: TaskStatus) => void;
		onAssign?: (taskId: string, assigneeId: string) => void;
	}

	let { tasks = [], projectId, onUpdateStatus, onAssign }: Props = $props();

	const columns: { status: TaskStatus; label: string; labelJa: string }[] = [
		{ status: 'created', label: 'To Do', labelJa: '未着手' },
		{ status: 'assigned', label: 'Assigned', labelJa: 'アサイン済み' },
		{ status: 'in_progress', label: 'In Progress', labelJa: '進行中' },
		{ status: 'review', label: 'Review', labelJa: 'レビュー' },
		{ status: 'completed', label: 'Completed', labelJa: '完了' },
	];

	const tasksByStatus = $derived(
		columns.reduce((acc, col) => {
			acc[col.status] = tasks.filter(t => t.status === col.status);
			return acc;
		}, {} as Record<TaskStatus, Task[]>)
	);

	function handleDragStart(event: DragEvent, task: Task) {
		if (event.dataTransfer) {
			event.dataTransfer.setData('text/plain', task.id);
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}

	function handleDrop(event: DragEvent, status: TaskStatus) {
		event.preventDefault();
		const taskId = event.dataTransfer?.getData('text/plain');
		if (taskId && onUpdateStatus) {
			onUpdateStatus(taskId, status);
		}
	}
</script>

<div class="task-board">
	<header class="board-header">
		<h2>タスクボード / Task Board</h2>
	</header>

	<div class="columns">
		{#each columns as column}
			<div 
				class="column"
				ondragover={handleDragOver}
				ondrop={(e) => handleDrop(e, column.status)}
			>
				<header class="column-header">
					<span class="column-title">{column.labelJa}</span>
					<span class="column-title-en">{column.label}</span>
					<span class="task-count">{tasksByStatus[column.status]?.length || 0}</span>
				</header>

				<div class="column-content">
					{#each tasksByStatus[column.status] || [] as task}
						<div
							class="task-wrapper"
							draggable="true"
							ondragstart={(e) => handleDragStart(e, task)}
						>
							<TaskCard {task} />
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.task-board {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--bg-primary, #1a1a2e);
		padding: 1.5rem;
	}

	.board-header {
		margin-bottom: 1.5rem;
	}

	.board-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary, #fff);
		margin: 0;
	}

	.columns {
		flex: 1;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 1rem;
		overflow-x: auto;
	}

	.column {
		background: var(--bg-secondary, #16213e);
		border-radius: 12px;
		display: flex;
		flex-direction: column;
		min-width: 250px;
	}

	.column-header {
		padding: 1rem;
		border-bottom: 1px solid var(--border-color, #2a2a4a);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.column-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #fff);
	}

	.column-title-en {
		font-size: 0.75rem;
		color: var(--text-tertiary, #6b7280);
	}

	.task-count {
		margin-left: auto;
		background: var(--bg-tertiary, #0f0f23);
		color: var(--text-secondary, #a0a0a0);
		font-size: 0.75rem;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
	}

	.column-content {
		flex: 1;
		padding: 0.75rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.task-wrapper {
		cursor: grab;
	}

	.task-wrapper:active {
		cursor: grabbing;
	}
</style>

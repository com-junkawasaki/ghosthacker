<script lang="ts">
	import { page } from '$app/stores';
	import ProjectSidebar from '$lib/components/storyboard/ProjectSidebar.svelte';

	const { projectId } = $page.params;
	
	if (!projectId) {
		throw new Error('Project ID is required');
	}

	const workflowLinks = [
		{ 
			href: 'workflow/approvals', 
			title: '承認リクエスト', 
			titleEn: 'Approvals',
			description: '脚本、絵コンテ、作画などの承認を管理'
		},
		{ 
			href: 'workflow/production', 
			title: '制作進行', 
			titleEn: 'Production Progress',
			description: '各話の制作フェーズと進捗を追跡'
		},
		{ 
			href: 'workflow/tasks', 
			title: 'タスク管理', 
			titleEn: 'Task Board',
			description: '個別タスクのアサインと進捗を管理'
		},
	];
</script>

<div class="resource-page">
	<ProjectSidebar {projectId} />
	
	<div class="main-content">
		<header class="page-header">
			<h1 class="page-title">ワークフロー / Workflow</h1>
			<p class="page-description">承認フロー、制作進行、タスク管理</p>
		</header>

		<main class="page-content">
			<div class="workflow-grid">
				{#each workflowLinks as link}
					<a href={link.href} class="workflow-card">
						<h3 class="card-title">{link.title}</h3>
						<span class="card-title-en">{link.titleEn}</span>
						<p class="card-description">{link.description}</p>
					</a>
				{/each}
			</div>
		</main>
	</div>
</div>

<style>
	.resource-page {
		display: flex;
		flex-direction: row;
		height: 100vh;
		background-color: #1a1a1a;
		color: #ffffff;
		overflow: hidden;
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
		overflow: hidden;
	}

	.page-header {
		padding: 1.5rem 2rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		background-color: #1a1a1a;
	}

	.page-title {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
	}

	.page-description {
		font-size: 0.875rem;
		color: #a0a0a0;
		margin: 0;
	}

	.page-content {
		flex: 1;
		overflow-y: auto;
		padding: 1.5rem 2rem;
	}

	.workflow-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.workflow-card {
		background: #16213e;
		border-radius: 12px;
		padding: 1.5rem;
		border: 1px solid #2a2a4a;
		text-decoration: none;
		color: inherit;
		transition: all 0.2s;
	}

	.workflow-card:hover {
		border-color: #6366f1;
		transform: translateY(-2px);
	}

	.card-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #fff;
		margin: 0 0 0.25rem 0;
	}

	.card-title-en {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.card-description {
		font-size: 0.875rem;
		color: #a0a0a0;
		margin: 0.75rem 0 0 0;
		line-height: 1.5;
	}
</style>

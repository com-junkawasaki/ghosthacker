<script lang="ts">
	import DepartmentCard from './DepartmentCard.svelte';
	import AssignMemberDialog from './AssignMemberDialog.svelte';
	import type { ProjectOrganization, TeamMember, Role } from '$lib/types/organization';

	interface Props {
		organization: ProjectOrganization | null;
		teamMembers: TeamMember[];
		roles: Role[];
		projectId: string;
		onAssign?: (memberId: string, roleId: string, episodeId?: string) => void;
		onUnassign?: (assignmentId: string) => void;
	}

	let { 
		organization = null, 
		teamMembers = [], 
		roles = [],
		projectId,
		onAssign,
		onUnassign 
	}: Props = $props();

	let showAssignDialog = $state(false);
	let selectedRoleId = $state<string | null>(null);
	let selectedDepartmentId = $state<string | null>(null);

	function handleOpenAssignDialog(roleId: string, departmentId: string) {
		selectedRoleId = roleId;
		selectedDepartmentId = departmentId;
		showAssignDialog = true;
	}

	function handleCloseAssignDialog() {
		showAssignDialog = false;
		selectedRoleId = null;
		selectedDepartmentId = null;
	}

	function handleAssign(memberId: string) {
		if (selectedRoleId && onAssign) {
			onAssign(memberId, selectedRoleId);
		}
		handleCloseAssignDialog();
	}

	function handleUnassign(assignmentId: string) {
		if (onUnassign) {
			onUnassign(assignmentId);
		}
	}
</script>

<div class="organization-chart">
	<header class="chart-header">
		<h2>組織図 / Organization Chart</h2>
		<p class="project-id">Project: {projectId}</p>
	</header>

	{#if organization}
		<div class="departments-grid">
			{#each organization.departments as section}
				<DepartmentCard
					department={section.department}
					assignments={section.assignments}
					onAddMember={(roleId) => handleOpenAssignDialog(roleId, section.department.id)}
					onRemoveMember={handleUnassign}
				/>
			{/each}
		</div>
	{:else}
		<div class="empty-state">
			<p>組織図が設定されていません。</p>
			<p>Organization chart is not configured.</p>
		</div>
	{/if}

	{#if showAssignDialog && selectedRoleId}
		<AssignMemberDialog
			{teamMembers}
			roleId={selectedRoleId}
			onAssign={handleAssign}
			onClose={handleCloseAssignDialog}
		/>
	{/if}
</div>

<style>
	.organization-chart {
		padding: 1.5rem;
		background: var(--bg-primary, #1a1a2e);
		min-height: 100%;
	}

	.chart-header {
		margin-bottom: 2rem;
	}

	.chart-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary, #fff);
		margin: 0 0 0.5rem 0;
	}

	.project-id {
		font-size: 0.875rem;
		color: var(--text-secondary, #a0a0a0);
		margin: 0;
	}

	.departments-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		color: var(--text-secondary, #a0a0a0);
	}

	.empty-state p {
		margin: 0.5rem 0;
	}
</style>

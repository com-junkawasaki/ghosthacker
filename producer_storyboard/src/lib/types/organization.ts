// Organization types

export interface Department {
	id: string;
	name: string;
	nameJa: string;
	type: string;
	displayOrder: number;
	createdAt?: string;
}

export interface RolePermission {
	id: string;
	roleId: string;
	scope: string;
	level: number;
}

export interface Role {
	id: string;
	name: string;
	nameJa: string;
	departmentId: string;
	description?: string;
	displayOrder: number;
	permissions?: RolePermission[];
	createdAt?: string;
}

export interface TeamMember {
	id: string;
	orgId: string;
	userId: string;
	name: string;
	email?: string;
	avatarUrl?: string;
	createdAt?: string;
}

export interface ProjectTeamAssignment {
	id: string;
	projectId: string;
	teamMemberId: string;
	roleId: string;
	episodeId?: string;
	assignedAt: string;
	member?: TeamMember;
	role?: Role;
}

export interface RoleAssignment {
	role: Role;
	members: TeamMember[];
}

export interface DepartmentSection {
	department: Department;
	assignments: RoleAssignment[];
}

export interface EpisodeTeamMember {
	teamMemberId: string;
	roleId: string;
	member: TeamMember;
	role: Role;
}

export interface EpisodeTeam {
	id: string;
	projectId: string;
	episodeId: string;
	episodeNumber: string;
	episodeTitle: string;
	members: EpisodeTeamMember[];
}

export interface ProjectOrganization {
	projectId: string;
	departments: DepartmentSection[];
	episodeTeams?: EpisodeTeam[];
}

// Permission level constants
export const PermissionLevel = {
	VIEW: 1,
	EDIT: 2,
	REVIEW: 3,
	APPROVE: 4,
	ADMIN: 5,
} as const;

export type PermissionLevelType = typeof PermissionLevel[keyof typeof PermissionLevel];

// Permission scope constants
export const PermissionScope = {
	SCRIPT: 'script',
	STORYBOARD: 'storyboard',
	ANIMATION: 'animation',
	AUDIO: 'audio',
	EDITING: 'editing',
	ASSIGNMENT: 'assignment',
	BUDGET: 'budget',
} as const;

export type PermissionScopeType = typeof PermissionScope[keyof typeof PermissionScope];

// Department type constants
export const DepartmentType = {
	PRODUCTION_LEADERSHIP: 'production_leadership',
	CREATIVE_LEADERSHIP: 'creative_leadership',
	SCRIPT: 'script',
	VISUAL: 'visual',
	DIRECTION: 'direction',
	AUDIO: 'audio',
	POST_PRODUCTION: 'post_production',
} as const;

export type DepartmentTypeType = typeof DepartmentType[keyof typeof DepartmentType];

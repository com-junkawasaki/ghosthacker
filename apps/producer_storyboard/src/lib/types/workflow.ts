// Workflow types

export type ApprovalStatus = 
	| 'submitted' 
	| 'under_review' 
	| 'request_changes' 
	| 'approved' 
	| 'rejected';

export type ApprovalType = 
	| 'script' 
	| 'storyboard' 
	| 'key_animation' 
	| 'audio_mix' 
	| 'final_cut';

export type ProductionStatus = 
	| 'planning'
	| 'script'
	| 'storyboard'
	| 'layout'
	| 'key_animation'
	| 'in_between'
	| 'coloring'
	| 'compositing'
	| 'audio_recording'
	| 'audio_mix'
	| 'editing'
	| 'final_check'
	| 'delivered';

export type TaskStatus = 
	| 'created'
	| 'assigned'
	| 'in_progress'
	| 'blocked'
	| 'review'
	| 'completed'
	| 'cancelled';

export interface ApprovalRequest {
	id: string;
	projectId: string;
	episodeId?: string;
	type: ApprovalType;
	submitterId: string;
	submitterName?: string;
	resourceId: string;
	resourceType: string;
	status: ApprovalStatus;
	workflowId?: string;
	runId?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ApprovalAction {
	id: string;
	approvalId: string;
	reviewerId: string;
	reviewerName?: string;
	action: ApprovalStatus;
	comment?: string;
	createdAt: string;
}

export interface EpisodeProduction {
	id: string;
	projectId: string;
	episodeId: string;
	episodeTitle?: string;
	status: ProductionStatus;
	deadline?: string;
	progressPercent: number;
	workflowId?: string;
	runId?: string;
	createdAt: string;
	updatedAt: string;
}

export interface Task {
	id: string;
	projectId: string;
	episodeId?: string;
	title: string;
	description?: string;
	assigneeId?: string;
	assigneeName?: string;
	roleId?: string;
	roleName?: string;
	status: TaskStatus;
	deadline?: string;
	workflowId?: string;
	runId?: string;
	createdAt: string;
	updatedAt: string;
}

// Status labels
export const ApprovalStatusLabels: Record<ApprovalStatus, { en: string; ja: string }> = {
	submitted: { en: 'Submitted', ja: '提出済み' },
	under_review: { en: 'Under Review', ja: 'レビュー中' },
	request_changes: { en: 'Changes Requested', ja: '修正依頼' },
	approved: { en: 'Approved', ja: '承認済み' },
	rejected: { en: 'Rejected', ja: '却下' },
};

export const ApprovalTypeLabels: Record<ApprovalType, { en: string; ja: string }> = {
	script: { en: 'Script', ja: '脚本' },
	storyboard: { en: 'Storyboard', ja: '絵コンテ' },
	key_animation: { en: 'Key Animation', ja: '原画' },
	audio_mix: { en: 'Audio Mix', ja: '音響ミックス' },
	final_cut: { en: 'Final Cut', ja: '最終版' },
};

export const ProductionStatusLabels: Record<ProductionStatus, { en: string; ja: string }> = {
	planning: { en: 'Planning', ja: '企画' },
	script: { en: 'Script', ja: '脚本' },
	storyboard: { en: 'Storyboard', ja: '絵コンテ' },
	layout: { en: 'Layout', ja: 'レイアウト' },
	key_animation: { en: 'Key Animation', ja: '原画' },
	in_between: { en: 'In-between', ja: '動画' },
	coloring: { en: 'Coloring', ja: '仕上げ' },
	compositing: { en: 'Compositing', ja: '撮影' },
	audio_recording: { en: 'Audio Recording', ja: '収録' },
	audio_mix: { en: 'Audio Mix', ja: '音響' },
	editing: { en: 'Editing', ja: '編集' },
	final_check: { en: 'Final Check', ja: '最終チェック' },
	delivered: { en: 'Delivered', ja: '納品' },
};

export const TaskStatusLabels: Record<TaskStatus, { en: string; ja: string }> = {
	created: { en: 'Created', ja: '作成済み' },
	assigned: { en: 'Assigned', ja: 'アサイン済み' },
	in_progress: { en: 'In Progress', ja: '進行中' },
	blocked: { en: 'Blocked', ja: 'ブロック' },
	review: { en: 'Review', ja: 'レビュー' },
	completed: { en: 'Completed', ja: '完了' },
	cancelled: { en: 'Cancelled', ja: 'キャンセル' },
};

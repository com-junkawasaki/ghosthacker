-- Approval Requests

-- name: ListApprovalRequests :many
SELECT id, project_id, episode_id, type, submitter_id, resource_id, resource_type, status, workflow_id, run_id, created_at, updated_at
FROM approval_requests
WHERE project_id = $1
  AND ($2::uuid IS NULL OR episode_id = $2)
  AND ($3::text IS NULL OR status = $3)
  AND ($4::text IS NULL OR type = $4)
ORDER BY created_at DESC;

-- name: GetApprovalRequest :one
SELECT id, project_id, episode_id, type, submitter_id, resource_id, resource_type, status, workflow_id, run_id, created_at, updated_at
FROM approval_requests
WHERE id = $1;

-- name: CreateApprovalRequest :one
INSERT INTO approval_requests (project_id, episode_id, type, submitter_id, resource_id, resource_type, status, workflow_id, run_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, project_id, episode_id, type, submitter_id, resource_id, resource_type, status, workflow_id, run_id, created_at, updated_at;

-- name: UpdateApprovalRequestStatus :one
UPDATE approval_requests
SET status = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, project_id, episode_id, type, submitter_id, resource_id, resource_type, status, workflow_id, run_id, created_at, updated_at;

-- name: UpdateApprovalRequestWorkflow :one
UPDATE approval_requests
SET workflow_id = $2, run_id = $3, updated_at = NOW()
WHERE id = $1
RETURNING id, project_id, episode_id, type, submitter_id, resource_id, resource_type, status, workflow_id, run_id, created_at, updated_at;

-- Approval Actions

-- name: ListApprovalActions :many
SELECT id, approval_id, reviewer_id, action, comment, created_at
FROM approval_actions
WHERE approval_id = $1
ORDER BY created_at ASC;

-- name: CreateApprovalAction :one
INSERT INTO approval_actions (approval_id, reviewer_id, action, comment)
VALUES ($1, $2, $3, $4)
RETURNING id, approval_id, reviewer_id, action, comment, created_at;

-- Episode Productions

-- name: ListEpisodeProductions :many
SELECT id, project_id, episode_id, status, deadline, progress_percent, workflow_id, run_id, created_at, updated_at
FROM episode_productions
WHERE project_id = $1
ORDER BY created_at ASC;

-- name: GetEpisodeProduction :one
SELECT id, project_id, episode_id, status, deadline, progress_percent, workflow_id, run_id, created_at, updated_at
FROM episode_productions
WHERE project_id = $1 AND episode_id = $2;

-- name: CreateEpisodeProduction :one
INSERT INTO episode_productions (project_id, episode_id, status, deadline, workflow_id, run_id)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, project_id, episode_id, status, deadline, progress_percent, workflow_id, run_id, created_at, updated_at;

-- name: UpdateEpisodeProductionStatus :one
UPDATE episode_productions
SET status = $3, progress_percent = COALESCE($4, progress_percent), updated_at = NOW()
WHERE project_id = $1 AND episode_id = $2
RETURNING id, project_id, episode_id, status, deadline, progress_percent, workflow_id, run_id, created_at, updated_at;

-- name: UpdateEpisodeProductionWorkflow :one
UPDATE episode_productions
SET workflow_id = $3, run_id = $4, updated_at = NOW()
WHERE project_id = $1 AND episode_id = $2
RETURNING id, project_id, episode_id, status, deadline, progress_percent, workflow_id, run_id, created_at, updated_at;

-- Tasks

-- name: ListTasks :many
SELECT id, project_id, episode_id, title, description, assignee_id, role_id, status, deadline, workflow_id, run_id, created_at, updated_at
FROM tasks
WHERE project_id = $1
  AND ($2::uuid IS NULL OR episode_id = $2)
  AND ($3::uuid IS NULL OR assignee_id = $3)
  AND ($4::text IS NULL OR status = $4)
ORDER BY created_at DESC;

-- name: GetTask :one
SELECT id, project_id, episode_id, title, description, assignee_id, role_id, status, deadline, workflow_id, run_id, created_at, updated_at
FROM tasks
WHERE id = $1;

-- name: CreateTask :one
INSERT INTO tasks (project_id, episode_id, title, description, role_id, status, deadline, workflow_id, run_id)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, project_id, episode_id, title, description, assignee_id, role_id, status, deadline, workflow_id, run_id, created_at, updated_at;

-- name: UpdateTaskAssignee :one
UPDATE tasks
SET assignee_id = $2, status = CASE WHEN status = 'created' THEN 'assigned' ELSE status END, updated_at = NOW()
WHERE id = $1
RETURNING id, project_id, episode_id, title, description, assignee_id, role_id, status, deadline, workflow_id, run_id, created_at, updated_at;

-- name: UpdateTaskStatus :one
UPDATE tasks
SET status = $2, updated_at = NOW()
WHERE id = $1
RETURNING id, project_id, episode_id, title, description, assignee_id, role_id, status, deadline, workflow_id, run_id, created_at, updated_at;

-- name: UpdateTaskWorkflow :one
UPDATE tasks
SET workflow_id = $2, run_id = $3, updated_at = NOW()
WHERE id = $1
RETURNING id, project_id, episode_id, title, description, assignee_id, role_id, status, deadline, workflow_id, run_id, created_at, updated_at;

-- name: DeleteTask :exec
DELETE FROM tasks
WHERE id = $1;

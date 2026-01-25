package activities

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ActivityHandler contains dependencies for activities
type ActivityHandler struct {
	pool *pgxpool.Pool
}

// NewActivityHandler creates a new activity handler
func NewActivityHandler(pool *pgxpool.Pool) *ActivityHandler {
	return &ActivityHandler{pool: pool}
}

// NotifyUser sends a notification to a specific user
func (h *ActivityHandler) NotifyUser(ctx context.Context, userID string, notificationType string, data map[string]string) error {
	log.Printf("NotifyUser: userID=%s, type=%s, data=%v", userID, notificationType, data)

	// TODO: Implement actual notification (email, push, websocket, etc.)
	// For now, just log the notification

	// Could integrate with:
	// - Email service (SendGrid, SES)
	// - Push notifications (FCM, APNS)
	// - WebSocket for real-time updates
	// - Slack/Discord webhooks

	return nil
}

// NotifyRole sends a notification to all users with a specific role in a project
func (h *ActivityHandler) NotifyRole(ctx context.Context, projectID string, roleIdentifier string, notificationType string, data map[string]string) error {
	log.Printf("NotifyRole: projectID=%s, role=%s, type=%s, data=%v", projectID, roleIdentifier, notificationType, data)

	// Get all users with this role in the project
	query := `
		SELECT tm.user_id
		FROM project_team_assignments pta
		JOIN team_members tm ON tm.id = pta.team_member_id
		JOIN roles r ON r.id = pta.role_id
		WHERE pta.project_id = $1 AND r.name = $2
	`

	rows, err := h.pool.Query(ctx, query, projectID, roleIdentifier)
	if err != nil {
		return fmt.Errorf("failed to query role members: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			log.Printf("Failed to scan user ID: %v", err)
			continue
		}

		// Notify each user
		if err := h.NotifyUser(ctx, userID, notificationType, data); err != nil {
			log.Printf("Failed to notify user %s: %v", userID, err)
		}
	}

	return nil
}

// UpdateApprovalStatus updates the status of an approval request
func (h *ActivityHandler) UpdateApprovalStatus(ctx context.Context, approvalID string, status string) error {
	log.Printf("UpdateApprovalStatus: approvalID=%s, status=%s", approvalID, status)

	query := `
		UPDATE approval_requests
		SET status = $2, updated_at = NOW()
		WHERE id = $1
	`

	_, err := h.pool.Exec(ctx, query, approvalID, status)
	if err != nil {
		return fmt.Errorf("failed to update approval status: %w", err)
	}

	return nil
}

// UpdateProductionStatus updates the status of an episode production
func (h *ActivityHandler) UpdateProductionStatus(ctx context.Context, projectID string, episodeID string, status string, progressPercent float64) error {
	log.Printf("UpdateProductionStatus: projectID=%s, episodeID=%s, status=%s, progress=%.2f",
		projectID, episodeID, status, progressPercent)

	query := `
		UPDATE episode_productions
		SET status = $3, progress_percent = $4, updated_at = NOW()
		WHERE project_id = $1 AND episode_id = $2
	`

	_, err := h.pool.Exec(ctx, query, projectID, episodeID, status, progressPercent)
	if err != nil {
		return fmt.Errorf("failed to update production status: %w", err)
	}

	return nil
}

// UpdateTaskStatus updates the status of a task
func (h *ActivityHandler) UpdateTaskStatus(ctx context.Context, taskID string, status string) error {
	log.Printf("UpdateTaskStatus: taskID=%s, status=%s", taskID, status)

	query := `
		UPDATE tasks
		SET status = $2, updated_at = NOW()
		WHERE id = $1
	`

	_, err := h.pool.Exec(ctx, query, taskID, status)
	if err != nil {
		return fmt.Errorf("failed to update task status: %w", err)
	}

	return nil
}

// CheckPermission checks if a user has the required permission level for a scope
func (h *ActivityHandler) CheckPermission(ctx context.Context, userID string, projectID string, scope string, requiredLevel int) (bool, error) {
	log.Printf("CheckPermission: userID=%s, projectID=%s, scope=%s, requiredLevel=%d",
		userID, projectID, scope, requiredLevel)

	query := `
		SELECT COALESCE(MAX(rp.level), 0) as max_level
		FROM role_permissions rp
		JOIN project_team_assignments pta ON pta.role_id = rp.role_id
		JOIN team_members tm ON tm.id = pta.team_member_id
		WHERE pta.project_id = $1 
		  AND tm.user_id = $2 
		  AND rp.scope = $3
	`

	var maxLevel int
	err := h.pool.QueryRow(ctx, query, projectID, userID, scope).Scan(&maxLevel)
	if err != nil {
		return false, fmt.Errorf("failed to check permission: %w", err)
	}

	return maxLevel >= requiredLevel, nil
}

// GetReviewersByType returns the list of user IDs who can review a specific approval type
func (h *ActivityHandler) GetReviewersByType(ctx context.Context, projectID string, approvalType string) ([]string, error) {
	log.Printf("GetReviewersByType: projectID=%s, type=%s", projectID, approvalType)

	// Map approval type to required scope and level
	var scope string
	switch approvalType {
	case "script":
		scope = "script"
	case "storyboard":
		scope = "storyboard"
	case "key_animation":
		scope = "animation"
	case "audio_mix":
		scope = "audio"
	case "final_cut":
		scope = "editing"
	default:
		scope = "script"
	}

	// Get users with APPROVE level (4) or higher for this scope
	query := `
		SELECT DISTINCT tm.user_id
		FROM role_permissions rp
		JOIN project_team_assignments pta ON pta.role_id = rp.role_id
		JOIN team_members tm ON tm.id = pta.team_member_id
		WHERE pta.project_id = $1 
		  AND rp.scope = $2 
		  AND rp.level >= 4
	`

	rows, err := h.pool.Query(ctx, query, projectID, scope)
	if err != nil {
		return nil, fmt.Errorf("failed to get reviewers: %w", err)
	}
	defer rows.Close()

	var reviewers []string
	for rows.Next() {
		var userID string
		if err := rows.Scan(&userID); err != nil {
			log.Printf("Failed to scan user ID: %v", err)
			continue
		}
		reviewers = append(reviewers, userID)
	}

	return reviewers, nil
}

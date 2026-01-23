package temporal

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"

	"go.temporal.io/sdk/activity"
)

// SaveStoryboardActivity saves storyboard updates
func SaveStoryboardActivity(ctx context.Context, params StoryboardUpdateParams) (StoryboardUpdateResult, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Saving storyboard update", "file", params.FilePath)

	// Read existing storyboard
	content, err := os.ReadFile(params.FilePath)
	if err != nil {
		return StoryboardUpdateResult{
			Success: false,
			Message: fmt.Sprintf("failed to read storyboard: %v", err),
		}, err
	}

	var storyboard map[string]interface{}
	if err := json.Unmarshal(content, &storyboard); err != nil {
		return StoryboardUpdateResult{
			Success: false,
			Message: fmt.Sprintf("invalid JSON-LD: %v", err),
		}, err
	}

	// Update panel (simplified - actual implementation would match UpdatePanel logic)
	// This is a placeholder for async processing

	// Save updated storyboard
	updatedContent, err := json.MarshalIndent(storyboard, "", "  ")
	if err != nil {
		return StoryboardUpdateResult{
			Success: false,
			Message: fmt.Sprintf("failed to marshal JSON-LD: %v", err),
		}, err
	}

	if err := os.WriteFile(params.FilePath, updatedContent, fs.FileMode(0644)); err != nil {
		return StoryboardUpdateResult{
			Success: false,
			Message: fmt.Sprintf("failed to save storyboard: %v", err),
		}, err
	}

	return StoryboardUpdateResult{
		Success: true,
		Message: "Storyboard updated successfully",
	}, nil
}

package temporal

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"connectrpc.com/connect"
	"storyboard-editor/backend/proto/storyboardpbconnect"
	storyboardpb "storyboard-editor/backend/proto"
	"go.temporal.io/sdk/activity"
)

const openRouterAPIURL = "https://openrouter.ai/api/v1/chat/completions"

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

func callOpenRouter(ctx context.Context, model, systemPrompt, userPrompt string) (string, error) {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("OPENROUTER_API_KEY is not set")
	}

	requestBody := map[string]interface{}{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
		"temperature": 0.7,
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", openRouterAPIURL, strings.NewReader(string(jsonBody)))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("HTTP-Referer", "https://ghosthacker.gftd.ai")
	req.Header.Set("X-Title", "ghosthacker-storyboard-worker")

	client := &http.Client{Timeout: 90 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("OpenRouter API error (%d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if len(result.Choices) == 0 {
		return "", fmt.Errorf("no choices in response")
	}

	return strings.TrimSpace(result.Choices[0].Message.Content), nil
}

// ScenarioAgentActivity handles high-level plot planning in A2A
func ScenarioAgentActivity(ctx context.Context, params AutonomousGenerationParams) (string, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Scenario Agent working", "goal", params.Goal)

	systemPrompt := "You are a professional Scenario Writer for Ghost Hacker, a cinematic webtoon. Plan the next narrative beats."
	userPrompt := fmt.Sprintf("Goal: %s\nContext: %v", params.Goal, params.InitialContext)

	return callOpenRouter(ctx, "anthropic/claude-3.5-sonnet", systemPrompt, userPrompt)
}

// EpisodeAgentActivity handles detailed content generation in A2A
func EpisodeAgentActivity(ctx context.Context, scenarioOutput string) (string, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Episode Agent working", "input", scenarioOutput)

	systemPrompt := "You are a professional Episode Generator. Create detailed scenes and dialogue based on the scenario plan."
	userPrompt := fmt.Sprintf("Scenario Plan: %s", scenarioOutput)

	return callOpenRouter(ctx, "anthropic/claude-3.5-sonnet", systemPrompt, userPrompt)
}

// CharacterAgentActivity handles character consistency in A2A
func CharacterAgentActivity(ctx context.Context, draft episodeDraft) (string, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Character Agent working", "content", draft.Content)

	systemPrompt := "You are a Character Specialist. Ensure all dialogue and actions are consistent with character profiles."
	userPrompt := fmt.Sprintf("Draft Content: %s\nContext: %v", draft.Content, draft.Params.InitialContext)

	return callOpenRouter(ctx, "google/gemini-3-pro", systemPrompt, userPrompt)
}

// CinematicAgentActivity handles visual direction in A2A
func CinematicAgentActivity(ctx context.Context, episodeOutput string) (string, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Cinematic Agent working", "input", episodeOutput)

	systemPrompt := "You are a Cinematic Sketcher. Provide visual composition, camera work, and image prompts for each panel."
	userPrompt := fmt.Sprintf("Episode Content: %s", episodeOutput)

	return callOpenRouter(ctx, "openai/gpt-4o", systemPrompt, userPrompt)
}

type BroadcastParams struct {
	AgentMode string
	Content   string
}

// BroadcastAgentMessageActivity sends an agent's message to the frontend chat
func BroadcastAgentMessageActivity(ctx context.Context, params BroadcastParams) error {
	log.Printf("[A2A BROADCAST] %s: %s", params.AgentMode, params.Content)

	serverURL := os.Getenv("SERVER_URL")
	if serverURL == "" {
		serverURL = "http://server:8081" // Default in docker-compose
	}

	client := storyboardpbconnect.NewStoryboardServiceClient(
		http.DefaultClient,
		serverURL,
	)

	_, err := client.InternalBroadcastChatMessage(ctx, connect.NewRequest(&storyboardpb.InternalBroadcastChatMessageRequest{
		AgentMode: params.AgentMode,
		Content:   params.Content,
	}))

	return err
}

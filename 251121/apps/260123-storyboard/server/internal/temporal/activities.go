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

func callOpenRouter(ctx context.Context, agentMode, model, systemPrompt, userPrompt string) (string, error) {
	// Broadcast request info
	BroadcastAgentMessageActivity(ctx, BroadcastParams{
		AgentMode: agentMode,
		Role:      "debug",
		Content:   fmt.Sprintf("🚀 Requesting OpenRouter\nModel: %s\nPrompt Length: %d chars", model, len(systemPrompt)+len(userPrompt)),
	})

	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		err := fmt.Errorf("OPENROUTER_API_KEY is not set")
		BroadcastAgentMessageActivity(ctx, BroadcastParams{AgentMode: agentMode, Role: "error", Content: err.Error()})
		return "", err
	}

	startTime := time.Now()
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

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		BroadcastAgentMessageActivity(ctx, BroadcastParams{AgentMode: agentMode, Role: "error", Content: fmt.Sprintf("Fetch failed: %v", err)})
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		err := fmt.Errorf("OpenRouter API error (%d): %s", resp.StatusCode, string(body))
		BroadcastAgentMessageActivity(ctx, BroadcastParams{AgentMode: agentMode, Role: "error", Content: err.Error()})
		return "", err
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
		err := fmt.Errorf("no choices in response")
		BroadcastAgentMessageActivity(ctx, BroadcastParams{AgentMode: agentMode, Role: "error", Content: err.Error()})
		return "", err
	}

	duration := time.Since(startTime)
	content := strings.TrimSpace(result.Choices[0].Message.Content)
	
	BroadcastAgentMessageActivity(ctx, BroadcastParams{
		AgentMode: agentMode,
		Role:      "debug",
		Content:   fmt.Sprintf("✅ Response received in %v\nResponse Length: %d chars", duration.Round(time.Millisecond), len(content)),
	})

	return content, nil
}

// ScenarioAgentActivity handles high-level plot planning in A2A
func ScenarioAgentActivity(ctx context.Context, params AutonomousGenerationParams) (string, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Scenario Agent working", "goal", params.Goal)

	systemPrompt := "You are a professional Scenario Writer for Ghost Hacker, a cinematic webtoon. Plan the next narrative beats. Return a concise plot summary."
	userPrompt := fmt.Sprintf("Goal: %s\nContext: %v", params.Goal, params.InitialContext)

	return callOpenRouter(ctx, "scenario", "anthropic/claude-sonnet-4.5", systemPrompt, userPrompt)
}

// EpisodeAgentActivity handles detailed content generation in A2A
func EpisodeAgentActivity(ctx context.Context, scenarioOutput string) (string, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Episode Agent working", "input", scenarioOutput)

	systemPrompt := "You are a professional Episode Generator. Create detailed scenes and dialogue based on the scenario plan. Return a structured scene description."
	userPrompt := fmt.Sprintf("Scenario Plan: %s", scenarioOutput)

	return callOpenRouter(ctx, "episode", "anthropic/claude-sonnet-4.5", systemPrompt, userPrompt)
}

// CharacterAgentActivity handles character consistency in A2A
func CharacterAgentActivity(ctx context.Context, draft episodeDraft) (string, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Character Agent working", "content", draft.Content)

	systemPrompt := "You are a Character Specialist. Ensure all dialogue and actions are consistent with character profiles. Return a verification report or refined text."
	userPrompt := fmt.Sprintf("Draft Content: %s\nContext: %v", draft.Content, draft.Params.InitialContext)

	return callOpenRouter(ctx, "character", "anthropic/claude-sonnet-4.5", systemPrompt, userPrompt)
}

// CinematicAgentActivity handles visual direction in A2A
func CinematicAgentActivity(ctx context.Context, episodeOutput string) (string, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Cinematic Agent working", "input", episodeOutput)

	systemPrompt := "You are a Cinematic Sketcher. Provide visual composition, camera work, and image prompts for each panel based on the episode content."
	userPrompt := fmt.Sprintf("Episode Content: %s", episodeOutput)

	return callOpenRouter(ctx, "cinematic", "openai/gpt-4o", systemPrompt, userPrompt)
}

// ReviewerAgentActivity critiques and refines agent proposals
func ReviewerAgentActivity(ctx context.Context, input string) (string, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Reviewer Agent working", "input", input)

	systemPrompt := `You are a professional Story Editor and Critic for Ghost Hacker.
Your task is to review the proposed story content and provide constructive feedback.
Focus on:
1. Narrative tension and pacing.
2. Character consistency and voice.
3. Adherence to the Ghost Hacker lore.
4. Visual impact.

Return a critique and suggested refinements.`
	userPrompt := fmt.Sprintf("Proposed Content: %s", input)

	return callOpenRouter(ctx, "reviewer", "anthropic/claude-sonnet-4.5", systemPrompt, userPrompt)
}

// EvaluationAgentActivity provides a final quality and completion score for the episode
func EvaluationAgentActivity(ctx context.Context, episodeData string) (string, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Evaluation Agent working")

	systemPrompt := `You are the Final Quality Assurance Agent for Ghost Hacker.
Your task is to evaluate the entire episode and provide a detailed "Production Readiness Report".
You must output a Markdown report with:
1. **Completion Score** (0-100%)
2. **Narrative Flow & Pacing** (Review the beats and scene transitions)
3. **Character Integrity** (Do Ren, Nei, etc., sound like themselves?)
4. **Visual Production Readiness** (Are the cinematic prompts detailed enough for image generation?)
5. **Technical Compliance** (Check against SHACL principles: RU count, dialogue ratio)

Be critical but constructive. If the score is below 80%, suggest specific panels that need another A2A pass.`
	userPrompt := fmt.Sprintf("Episode Data (JSON-LD): %s", episodeData)

	return callOpenRouter(ctx, "evaluation", "anthropic/claude-sonnet-4.5", systemPrompt, userPrompt)
}

// VisionAnalysisActivity analyzes generated images to extract context
func VisionAnalysisActivity(ctx context.Context, imageURL string) (string, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Vision Analysis working", "imageURL", imageURL)

	// Placeholder for Vision LLM call (e.g. Gemini 1.5 Pro Vision)
	// In a real implementation, this would fetch the image and send it to the LLM.
	return "Vision Analysis: Detected Ren in a dark room, standing near a server rack with glowing blue lights.", nil
}

type BroadcastParams struct {
	AgentMode string
	Content   string
	Role      string // "user", "assistant", "system", "debug", "error"
}

// BroadcastAgentMessageActivity sends an agent's message to the frontend chat
func BroadcastAgentMessageActivity(ctx context.Context, params BroadcastParams) error {
	log.Printf("[A2A BROADCAST] [%s] %s: %s", params.Role, params.AgentMode, params.Content)

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
		Role:      params.Role,
	}))

	return err
}

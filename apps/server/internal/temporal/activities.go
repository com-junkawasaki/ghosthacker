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
func EpisodeAgentActivity(ctx context.Context, input episodeDraft) (string, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Episode Agent working", "input", input.Content)

	// Build context string from InitialContext
	contextStr := ""
	if len(input.Params.InitialContext) > 0 {
		contextBytes, _ := json.MarshalIndent(input.Params.InitialContext, "", "  ")
		contextStr = fmt.Sprintf("\n\nCurrent Storyboard Context:\n%s", string(contextBytes))
	}

	systemPrompt := `You are a professional Episode Generator for Ghost Hacker. Create detailed scenes and dialogue based on the scenario plan.

IMPORTANT: You must return your response in JSON format with the following structure:
{
  "panels": [
    {
      "episode_id": "episode:260123-cschool-privacy",
      "page_number": 1,
      "panel": 1,
      "updates": {
        "dialogue": [
          {
            "speaker": "Character Name",
            "text": "Dialogue text",
            "delivery": "How to say it",
            "subtext": "What they really mean",
            "emotion": "emotion_label"
          }
        ],
        "characters": ["character:Ren"],
        "environment": "env:cschool-classroom",
        "visual_note": "Visual description",
        "shot": "Shot type",
        "image_prompt": "Detailed image generation prompt"
      }
    }
  ],
  "summary": "Brief summary of what was generated"
}

Return ONLY valid JSON, no markdown formatting. Use the episode_id, page_number, and panel from the context provided.`
	userPrompt := fmt.Sprintf("Scenario Plan: %s%s", input.Content, contextStr)

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

// EnvironmentAgentActivity handles location and atmosphere details in A2A
func EnvironmentAgentActivity(ctx context.Context, input string) (string, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Environment Agent working")

	systemPrompt := "You are an Environment Specialist. Focus on location settings, atmosphere, and architectural details for the given scene."
	userPrompt := fmt.Sprintf("Scene Content: %s", input)

	return callOpenRouter(ctx, "environment", "anthropic/claude-sonnet-4.5", systemPrompt, userPrompt)
}

// PropAgentActivity handles tools and gadgets in A2A
func PropAgentActivity(ctx context.Context, input string) (string, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Prop Agent working")

	systemPrompt := "You are a Prop Specialist. Focus on identifying and detailing tools, hacker gadgets, and small objects in the scene."
	userPrompt := fmt.Sprintf("Scene Content: %s", input)

	return callOpenRouter(ctx, "prop", "anthropic/claude-sonnet-4.5", systemPrompt, userPrompt)
}

// GhostAgentActivity handles digital glitches and supernatural effects in A2A
func GhostAgentActivity(ctx context.Context, input string) (string, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Ghost Agent working")

	systemPrompt := "You are a Ghost Specialist. Focus on designing digital glitches, supernatural effects, and AXE-related visual phenomena."
	userPrompt := fmt.Sprintf("Scene Content: %s", input)

	return callOpenRouter(ctx, "ghost", "anthropic/claude-sonnet-4.5", systemPrompt, userPrompt)
}

// CinematicAgentActivity handles visual direction in A2A
func CinematicAgentActivity(ctx context.Context, input episodeDraft) (string, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Cinematic Agent working", "input", input.Content)

	// Build context string from InitialContext
	contextStr := ""
	if len(input.Params.InitialContext) > 0 {
		contextBytes, _ := json.MarshalIndent(input.Params.InitialContext, "", "  ")
		contextStr = fmt.Sprintf("\n\nCurrent Storyboard Context:\n%s", string(contextBytes))
	}

	systemPrompt := `You are a Cinematic Sketcher for Ghost Hacker. Provide visual composition, camera work, and image prompts for each panel.

IMPORTANT: You must return your response in JSON format with the following structure:
{
  "panels": [
    {
      "episode_id": "episode:260123-cschool-privacy",
      "page_number": 1,
      "panel": 1,
      "updates": {
        "shot": "Shot type (e.g., Close-up, Wide Shot, Insert Shot)",
        "camera_direction": "Camera movement instructions",
        "image_prompt": "Detailed ARIA-style image generation prompt",
        "runway_prompt": "Runway base prompt for live-action generation",
        "visual_note": "Visual description"
      }
    }
  ],
  "summary": "Brief summary of visual direction"
}

Return ONLY valid JSON, no markdown formatting. Use the episode_id, page_number, and panel from the context provided.`
	userPrompt := fmt.Sprintf("Episode Content: %s%s", input.Content, contextStr)

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

// ApplyEpisodeUpdatesActivity parses episode agent output and updates storyboard JSON-LD files
func ApplyEpisodeUpdatesActivity(ctx context.Context, params ApplyUpdatesParams) (ApplyUpdatesResult, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Applying episode updates", "episode_id", params.EpisodeID)

	serverURL := os.Getenv("SERVER_URL")
	if serverURL == "" {
		serverURL = "http://server:8081"
	}

	client := storyboardpbconnect.NewStoryboardServiceClient(
		http.DefaultClient,
		serverURL,
	)

	// Parse agent output as JSON
	var agentOutput struct {
		Panels  []struct {
			EpisodeID  string `json:"episode_id"`
			PageNumber int32  `json:"page_number"`
			Panel      int32  `json:"panel"`
			Updates    map[string]interface{} `json:"updates"`
		} `json:"panels"`
		Summary string `json:"summary"`
	}

	// Try to extract JSON from the output (may contain markdown)
	jsonStart := strings.Index(params.AgentOutput, "{")
	jsonEnd := strings.LastIndex(params.AgentOutput, "}")
	if jsonStart == -1 || jsonEnd == -1 || jsonEnd <= jsonStart {
		return ApplyUpdatesResult{
			Success: false,
			Message: "No valid JSON found in agent output",
		}, fmt.Errorf("no valid JSON found")
	}

	jsonStr := params.AgentOutput[jsonStart : jsonEnd+1]
	if err := json.Unmarshal([]byte(jsonStr), &agentOutput); err != nil {
		logger.Error("Failed to parse agent output", "error", err, "output", params.AgentOutput)
		return ApplyUpdatesResult{
			Success: false,
			Message: fmt.Sprintf("Failed to parse JSON: %v", err),
		}, err
	}

	updatedCount := 0
	for _, panelUpdate := range agentOutput.Panels {
		// Convert updates map to PanelData
		panelData := &storyboardpb.PanelData{}

		if chars, ok := panelUpdate.Updates["characters"].([]interface{}); ok {
			panelData.Characters = make([]string, len(chars))
			for i, ch := range chars {
				if str, ok := ch.(string); ok {
					panelData.Characters[i] = str
				}
			}
		}

		if dialogue, ok := panelUpdate.Updates["dialogue"].([]interface{}); ok {
			panelData.Dialogue = make([]*storyboardpb.Dialogue, 0, len(dialogue))
			for _, d := range dialogue {
				if dMap, ok := d.(map[string]interface{}); ok {
					dlg := &storyboardpb.Dialogue{}
					if speaker, ok := dMap["speaker"].(string); ok {
						dlg.Speaker = speaker
					}
					if text, ok := dMap["text"].(string); ok {
						dlg.Text = text
					}
					if delivery, ok := dMap["delivery"].(string); ok {
						dlg.Delivery = delivery
					}
					if subtext, ok := dMap["subtext"].(string); ok {
						dlg.Subtext = subtext
					}
					if emotion, ok := dMap["emotion"].(string); ok {
						dlg.Emotion = emotion
					}
					panelData.Dialogue = append(panelData.Dialogue, dlg)
				}
			}
		}

		if env, ok := panelUpdate.Updates["environment"].(string); ok {
			panelData.Environment = env
		}

		if visualNote, ok := panelUpdate.Updates["visual_note"].(string); ok {
			panelData.VisualNote = visualNote
		}

		if shot, ok := panelUpdate.Updates["shot"].(string); ok {
			panelData.Shot = shot
		}

		if imagePrompt, ok := panelUpdate.Updates["image_prompt"].(string); ok {
			panelData.ImagePrompt = imagePrompt
		}

		if runwayPrompt, ok := panelUpdate.Updates["runway_prompt"].(string); ok {
			panelData.RunwayPrompt = runwayPrompt
		}

		if cameraDirection, ok := panelUpdate.Updates["camera_direction"].(string); ok {
			panelData.CameraDirection = cameraDirection
		}

		// Call UpdatePanel
		episodeID := panelUpdate.EpisodeID
		if episodeID == "" {
			episodeID = params.EpisodeID
		}

		_, err := client.UpdatePanel(ctx, connect.NewRequest(&storyboardpb.UpdatePanelRequest{
			FilePath:   params.FilePath,
			EpisodeId:  episodeID,
			PageNumber: panelUpdate.PageNumber,
			Panel:      panelUpdate.Panel,
			PanelData:  panelData,
			SessionId:  params.SessionID,
		}))

		if err != nil {
			logger.Error("Failed to update panel", "error", err, "episode", episodeID, "page", panelUpdate.PageNumber, "panel", panelUpdate.Panel)
			continue
		}

		updatedCount++
		logger.Info("Updated panel", "episode", episodeID, "page", panelUpdate.PageNumber, "panel", panelUpdate.Panel)
	}

	return ApplyUpdatesResult{
		Success: true,
		Message: fmt.Sprintf("Updated %d panels", updatedCount),
		UpdatedCount: updatedCount,
	}, nil
}

// GeneratePanelImagesActivity generates images for panels based on cinematic agent output
func GeneratePanelImagesActivity(ctx context.Context, params GenerateImagesParams) (GenerateImagesResult, error) {
	logger := activity.GetLogger(ctx)
	logger.Info("Generating panel images", "episode_id", params.EpisodeID)

	serverURL := os.Getenv("SERVER_URL")
	if serverURL == "" {
		serverURL = "http://server:8081"
	}

	client := storyboardpbconnect.NewStoryboardServiceClient(
		http.DefaultClient,
		serverURL,
	)

	// Parse agent output to find panels with image prompts
	var agentOutput struct {
		Panels []struct {
			EpisodeID  string `json:"episode_id"`
			PageNumber int32  `json:"page_number"`
			Panel      int32  `json:"panel"`
			Updates    struct {
				ImagePrompt string `json:"image_prompt"`
			} `json:"updates"`
		} `json:"panels"`
	}

	jsonStart := strings.Index(params.CinematicOutput, "{")
	jsonEnd := strings.LastIndex(params.CinematicOutput, "}")
	if jsonStart == -1 || jsonEnd == -1 || jsonEnd <= jsonStart {
		return GenerateImagesResult{
			Success: false,
			Message: "No valid JSON found in cinematic output",
		}, fmt.Errorf("no valid JSON found")
	}

	jsonStr := params.CinematicOutput[jsonStart : jsonEnd+1]
	if err := json.Unmarshal([]byte(jsonStr), &agentOutput); err != nil {
		logger.Error("Failed to parse cinematic output", "error", err)
		return GenerateImagesResult{
			Success: false,
			Message: fmt.Sprintf("Failed to parse JSON: %v", err),
		}, err
	}

	generatedCount := 0
	for _, panel := range agentOutput.Panels {
		if panel.Updates.ImagePrompt == "" {
			continue
		}

		// Load current panel data
		episodeID := panel.EpisodeID
		if episodeID == "" {
			episodeID = params.EpisodeID
		}

		// Create panel data with image prompt
		panelData := &storyboardpb.PanelData{
			ImagePrompt: panel.Updates.ImagePrompt,
		}

		// Generate image
		_, err := client.GeneratePanelImage(ctx, connect.NewRequest(&storyboardpb.GeneratePanelImageRequest{
			FilePath:   params.FilePath,
			EpisodeId:  episodeID,
			PageNumber: panel.PageNumber,
			Panel:      panel.Panel,
			PanelData:  panelData,
		}))

		if err != nil {
			logger.Error("Failed to generate image", "error", err, "episode", episodeID, "page", panel.PageNumber, "panel", panel.Panel)
			continue
		}

		generatedCount++
		logger.Info("Generated image", "episode", episodeID, "page", panel.PageNumber, "panel", panel.Panel)
	}

	return GenerateImagesResult{
		Success: true,
		Message: fmt.Sprintf("Generated %d images", generatedCount),
		GeneratedCount: generatedCount,
	}, nil
}

// ApplyUpdatesParams contains parameters for applying agent updates
type ApplyUpdatesParams struct {
	FilePath    string
	EpisodeID   string
	AgentOutput string
	SessionID   string
}

// ApplyUpdatesResult contains the result of applying updates
type ApplyUpdatesResult struct {
	Success      bool
	Message      string
	UpdatedCount int
}

// GenerateImagesParams contains parameters for generating images
type GenerateImagesParams struct {
	FilePath       string
	EpisodeID      string
	CinematicOutput string
}

// GenerateImagesResult contains the result of image generation
type GenerateImagesResult struct {
	Success        bool
	Message        string
	GeneratedCount int
}

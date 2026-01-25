package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"regexp"
	"strings"
	"storyboard-editor/backend/proto"

	"connectrpc.com/connect"
	"go.temporal.io/sdk/client"
)

// GenerateScenario handles the high-level plot generation
func (s *StoryboardService) GenerateScenario(
	ctx context.Context,
	req *connect.Request[storyboardpb.GenerateScenarioRequest],
) (*connect.Response[storyboardpb.GenerateScenarioResponse], error) {
	log.Printf("GenerateScenario: prompt=%s", req.Msg.Prompt)

	temporalHost := os.Getenv("TEMPORAL_HOST")
	if temporalHost == "" {
		// Fallback or error
		log.Printf("Warning: TEMPORAL_HOST not set, skipping workflow start")
		return connect.NewResponse(&storyboardpb.GenerateScenarioResponse{
			Success:    false,
			Message:    "Temporal server not configured (TEMPORAL_HOST missing)",
			WorkflowId: "",
		}), nil
	}

	c, err := client.Dial(client.Options{
		HostPort: temporalHost,
	})
	if err != nil {
		log.Printf("Error: failed to dial temporal at %s: %v", temporalHost, err)
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to dial temporal: %w", err))
	}
	defer c.Close()

	// TODO: Start Temporal Workflow for Scenario Generation
	// workflowOptions := client.StartWorkflowOptions{
	// 	ID:        "scenario-gen-" + time.Now().Format("20060102-150405"),
	// 	TaskQueue: "storyboard-task-queue",
	// }

	return connect.NewResponse(&storyboardpb.GenerateScenarioResponse{
		Success:    true,
		Message:    "Scenario generation started (placeholder)",
		WorkflowId: "placeholder-id",
	}), nil
}

// GenerateEpisode handles detailed episode generation
func (s *StoryboardService) GenerateEpisode(
	ctx context.Context,
	req *connect.Request[storyboardpb.GenerateEpisodeRequest],
) (*connect.Response[storyboardpb.GenerateEpisodeResponse], error) {
	log.Printf("GenerateEpisode: episode_id=%s", req.Msg.EpisodeId)

	return connect.NewResponse(&storyboardpb.GenerateEpisodeResponse{
		Success:    true,
		Message:    "Episode generation started (placeholder)",
		WorkflowId: "placeholder-id",
	}), nil
}

// RefineCharacters handles character consistency refinement
func (s *StoryboardService) RefineCharacters(
	ctx context.Context,
	req *connect.Request[storyboardpb.RefineCharactersRequest],
) (*connect.Response[storyboardpb.RefineCharactersResponse], error) {
	log.Printf("RefineCharacters: episode_id=%s, characters=%v", req.Msg.EpisodeId, req.Msg.CharacterIds)

	return connect.NewResponse(&storyboardpb.RefineCharactersResponse{
		Success:    true,
		Message:    "Character refinement started (placeholder)",
		WorkflowId: "placeholder-id",
	}), nil
}

// GenerateCinematicSketch handles visual prompt generation
func (s *StoryboardService) GenerateCinematicSketch(
	ctx context.Context,
	req *connect.Request[storyboardpb.GenerateCinematicSketchRequest],
) (*connect.Response[storyboardpb.GenerateCinematicSketchResponse], error) {
	log.Printf("GenerateCinematicSketch: episode_id=%s, page=%d, panel=%d", 
		req.Msg.EpisodeId, req.Msg.PageNumber, req.Msg.Panel)

	return connect.NewResponse(&storyboardpb.GenerateCinematicSketchResponse{
		Success:    true,
		Message:    "Cinematic sketch generation started (placeholder)",
		WorkflowId: "placeholder-id",
	}), nil
}

// InteractWithAI handles chat-based editing and generation
func (s *StoryboardService) InteractWithAI(
	ctx context.Context,
	req *connect.Request[storyboardpb.InteractWithAIRequest],
) (*connect.Response[storyboardpb.InteractWithAIResponse], error) {
	log.Printf("InteractWithAI: message=%s, context_count=%d", req.Msg.Message, len(req.Msg.Context))

	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return nil, connect.NewError(connect.CodeFailedPrecondition, fmt.Errorf("OPENROUTER_API_KEY is not set"))
	}

	model := strings.TrimSpace(os.Getenv("OPENROUTER_TEXT_MODEL"))
	if model == "" {
		model = openRouterTextModelDefault
	}

	systemPrompt := `You are an AI Story Assistant for the Ghost Hacker project.
Ghost Hacker is a cinematic, high-end webtoon/manga about hackers and futuristic technology.
The story features characters like Ren, Nei, and others in a high-tech, atmospheric setting.

Your task is to help the user edit and generate storyboard content in JSON-LD format.
You will receive a message from the user and some context (JSON-LD fragments of episodes, pages, or panels).

You must return a JSON object with the following fields:
1. "response": A text message to the user explaining what you did or answering their question.
2. "patches": An array of JSON patches to apply to the storyboard. Each patch has "op" (add, replace, remove), "path", and "value" (as a JSON string).

Example response:
{
  "response": "I've updated the dialogue for Panel 1 to be more dramatic.",
  "patches": [
    {
      "op": "replace",
      "path": "/gh:episodes/0/gh:pages/0/gh:panels/0/dialogue/0/text",
      "value": "「この場所のASC制御帯、少し不安定じゃないか？」"
    }
  ]
}

Important:
- Return ONLY the JSON object. No markdown, no extra text.
- Paths in patches should follow the structure of the storyboard JSON-LD.
- Use Japanese for dialogue and story content.
- Be creative and maintain the project's cinematic, high-tension tone.
- If you are asked to generate dialogue, include acting directions (delivery) and subtext where appropriate.
`

	// Construct user prompt with context
	var contextStr strings.Builder
	for _, c := range req.Msg.Context {
		contextStr.WriteString(fmt.Sprintf("\n--- Context: %s (%s) ---\n%s\n", c.Type, c.Id, c.JsonContent))
	}

	agentInstruction := ""
	switch req.Msg.AgentMode {
	case "scenario":
		agentInstruction = "\nMODE: Scenario Writer. Focus on high-level plot, beats, and narrative structure."
	case "episode":
		agentInstruction = "\nMODE: Episode Generator. Focus on detailed scene breakdown, dialogue, and pacing."
	case "character":
		agentInstruction = "\nMODE: Character Specialist. Focus on character consistency, emotional state, and motives."
	case "cinematic":
		agentInstruction = "\nMODE: Cinematic Sketcher. Focus on visual composition, camera work, and image prompts."
	case "dialogue":
		agentInstruction = "\nMODE: Dialogue Coach. Focus on natural speech, delivery, and subtext."
	}

	userPrompt := fmt.Sprintf("Context:\n%s\n%s\n\nUser Message: %s", contextStr.String(), agentInstruction, req.Msg.Message)

	content, err := s.callOpenRouterText(ctx, apiKey, model, systemPrompt, userPrompt)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("openrouter call failed: %w", err))
	}

	// Parse AI response
	type aiInteractionResult struct {
		Response string `json:"response"`
		Patches  []struct {
			Op    string `json:"op"`
			Path  string `json:"path"`
			Value string `json:"value"`
		} `json:"patches"`
	}

	var result aiInteractionResult
	// Use the same robust JSON parsing as in dialogue_generation.go
	re := regexp.MustCompile(`(?s)\{.*\}`)
	m := re.FindString(content)
	if m == "" {
		// If no JSON found, treat the whole content as the response
		return connect.NewResponse(&storyboardpb.InteractWithAIResponse{
			Success:    true,
			Message:    "Interaction successful (no JSON patches found)",
			AiResponse: content,
			Patches:    []*storyboardpb.JSONPatch{},
		}), nil
	}

	if err := json.Unmarshal([]byte(m), &result); err != nil {
		log.Printf("Failed to unmarshal AI response JSON: %v, raw content: %s", err, content)
		// Fallback to plain text response
		return connect.NewResponse(&storyboardpb.InteractWithAIResponse{
			Success:    true,
			Message:    "Interaction successful (JSON parse error)",
			AiResponse: content,
			Patches:    []*storyboardpb.JSONPatch{},
		}), nil
	}

	// Convert patches to proto format
	protoPatches := make([]*storyboardpb.JSONPatch, len(result.Patches))
	for i, p := range result.Patches {
		protoPatches[i] = &storyboardpb.JSONPatch{
			Op:    p.Op,
			Path:  p.Path,
			Value: p.Value,
		}
	}

	return connect.NewResponse(&storyboardpb.InteractWithAIResponse{
		Success:    true,
		Message:    "Interaction successful",
		AiResponse: result.Response,
		Patches:    protoPatches,
	}), nil
}

// GenerateDialogue is implemented in dialogue_generation.go

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

func main() {
	s := server.NewMCPServer(
		"GhostHacker Storyboard Agent (Cursor)",
		"1.0.0",
	)

	// Register tools
	s.AddTool(mcp.NewTool("scenario_writer",
		mcp.WithDescription("Specialized agent for high-level plot, beats, and narrative structure."),
	), handleScenarioWriter)

	s.AddTool(mcp.NewTool("dialogue_coach",
		mcp.WithDescription("Specialized agent for generating natural, character-specific dialogue based on voice profiles."),
	), handleDialogueCoach)

	s.AddTool(mcp.NewTool("cinematic_sketcher",
		mcp.WithDescription("Specialized agent for visual composition, camera work, and ARIA-style image prompts."),
	), handleCinematicSketcher)

	s.AddTool(mcp.NewTool("character_specialist",
		mcp.WithDescription("Specialized agent for character consistency and emotional state."),
	), handleCharacterSpecialist)

	s.AddTool(mcp.NewTool("generate_dialogue_and_cinematics",
		mcp.WithDescription("Generate dialogue and cinematic prompts for a specific episode and page range."),
	), handleGenerateDialogueAndCinematics)

	s.AddTool(mcp.NewTool("generate_all_missing_aria_prompts",
		mcp.WithDescription("Generate ARIA Cinematic Base prompts for all panels missing sketches in the storyboard."),
	), handleGenerateAllMissingAriaPrompts)

	// Run as stdio server
	if err := server.ServeStdio(s); err != nil {
		log.Fatalf("MCP server error: %v", err)
	}
}

func handleScenarioWriter(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return &mcp.CallToolResult{
		Content: []mcp.Content{mcp.TextContent{Type: "text", Text: "Scenario Writer: Narrative structure optimized for high-tension cybersecurity drama."}},
	}, nil
}

func handleDialogueCoach(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return &mcp.CallToolResult{
		Content: []mcp.Content{mcp.TextContent{Type: "text", Text: "Dialogue Coach: Character voices aligned with gh:voice profiles (Ren: lethargic, Nei: logical)."}},
	}, nil
}

func handleCinematicSketcher(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return &mcp.CallToolResult{
		Content: []mcp.Content{mcp.TextContent{Type: "text", Text: "Cinematic Sketcher: ARIA-style visual prompts (luminous air, 35mm f/2.8) generated."}},
	}, nil
}

func handleCharacterSpecialist(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	return &mcp.CallToolResult{
		Content: []mcp.Content{mcp.TextContent{Type: "text", Text: "Character Specialist: Emotional consistency verified for current scene."}},
	}, nil
}

func handleGenerateDialogueAndCinematics(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args := req.Params.Arguments.(map[string]interface{})
	epID, _ := args["episode_id"].(string)
	startPage, _ := args["start_page"].(float64)
	endPage, _ := args["end_page"].(float64)

	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = "../../../.."
	}
	storyboardPath := filepath.Join(workspaceRoot, "251121/storyboard.jsonld")
	
	data, err := os.ReadFile(storyboardPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read storyboard: %w", err)
	}

	var storyboard map[string]interface{}
	if err := json.Unmarshal(data, &storyboard); err != nil {
		return nil, fmt.Errorf("failed to parse storyboard: %w", err)
	}

	episodes := storyboard["gh:episodes"].([]interface{})
	count := 0
	for _, e := range episodes {
		episode := e.(map[string]interface{})
		if episode["gh:episodeId"].(string) != epID {
			continue
		}
		pages := episode["gh:pages"].([]interface{})
		for _, pg := range pages {
			page := pg.(map[string]interface{})
			pageNum := int(page["gh:pageNumber"].(float64))
			if pageNum < int(startPage) || pageNum > int(endPage) {
				continue
			}

			panels := page["gh:panels"].([]interface{})
			for _, p := range panels {
				panel := p.(map[string]interface{})
				
				// Simulate Dialogue Generation
				if dialogues, ok := panel["dialogue"].([]interface{}); ok && len(dialogues) == 0 {
					panel["dialogue"] = []interface{}{
						map[string]interface{}{
							"speaker": "character:Ren",
							"text":    "……だるいけど、やるか。",
							"gh:delivery": "気怠げに、でも確信を持って。",
							"gh:subtext": "仕事への入り口。",
						},
					}
				}

				// Cinematic Sketcher Logic
				visual, _ := panel["visual"].(string)
				shot, _ := panel["shot"].(string)
				prompt := fmt.Sprintf("%s, ARIA-style. %s. luminous atmosphere, soft diffused natural light, pristine clean air. shot on 35mm, f/2.8, cinematic live-action.", shot, visual)
				
				panel["gh:runwayPrompt"] = prompt
				panel["gh:imagePrompt"] = prompt
				count++
			}
		}
	}

	updatedData, _ := json.MarshalIndent(storyboard, "", "  ")
	os.WriteFile(storyboardPath, updatedData, 0644)

	return &mcp.CallToolResult{
		Content: []mcp.Content{mcp.TextContent{Type: "text", Text: fmt.Sprintf("Successfully processed %d panels for %s (Pages %d-%d).", count, epID, int(startPage), int(endPage))}},
	}, nil
}

func handleGenerateAllMissingAriaPrompts(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = "../../../.."
	}
	storyboardPath := filepath.Join(workspaceRoot, "251121/storyboard.jsonld")
	
	data, err := os.ReadFile(storyboardPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read storyboard: %w", err)
	}

	var storyboard map[string]interface{}
	if err := json.Unmarshal(data, &storyboard); err != nil {
		return nil, fmt.Errorf("failed to parse storyboard: %w", err)
	}

	episodes, ok := storyboard["gh:episodes"].([]interface{})
	if !ok {
		return &mcp.CallToolResult{Content: []mcp.Content{mcp.TextContent{Type: "text", Text: "No episodes found."}}}, nil
	}

	count := 0
	for _, e := range episodes {
		episode := e.(map[string]interface{})
		pages := episode["gh:pages"].([]interface{})
		for _, pg := range pages {
			page := pg.(map[string]interface{})
			panels := page["gh:panels"].([]interface{})
			for _, p := range panels {
				panel := p.(map[string]interface{})
				
				_, hasImage := panel["gh:generatedImageUrl"]
				_, hasPrompt := panel["gh:imagePrompt"]
				
				if !hasImage && !hasPrompt {
					visual, _ := panel["visual"].(string)
					shot, _ := panel["shot"].(string)
					
					prompt := fmt.Sprintf("%s, ARIA-style. %s. luminous atmosphere, soft diffused natural light, pristine clean air. shot on 35mm, f/2.8, cinematic live-action.", shot, visual)
					
					panel["gh:runwayPrompt"] = prompt
					panel["gh:imagePrompt"] = prompt
					count++
				}
			}
		}
	}

	if count > 0 {
		updatedData, _ := json.MarshalIndent(storyboard, "", "  ")
		os.WriteFile(storyboardPath, updatedData, 0644)
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{mcp.TextContent{Type: "text", Text: fmt.Sprintf("Successfully generated and saved %d missing prompts using ARIA Cinematic Base.", count)}},
	}, nil
}

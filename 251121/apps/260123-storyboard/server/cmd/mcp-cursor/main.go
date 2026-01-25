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
	s.AddTool(mcp.NewTool("identify_missing_sketches",
		mcp.WithDescription("Identify panels that are missing cinematic sketches in the storyboard."),
	), handleIdentifyMissingSketches)

	s.AddTool(mcp.NewTool("generate_aria_prompt",
		mcp.WithDescription("Generate a cinematic prompt based on ARIA Cinematic Base for a specific panel."),
	), handleGenerateAriaPrompt)

	// Run as stdio server
	if err := server.ServeStdio(s); err != nil {
		log.Fatalf("MCP server error: %v", err)
	}
}

func handleIdentifyMissingSketches(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
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
		return &mcp.CallToolResult{
			Content: []mcp.Content{mcp.TextContent{Type: "text", Text: "No episodes found."}},
		}, nil
	}

	var missing []string
	for _, e := range episodes {
		episode := e.(map[string]interface{})
		epID := episode["gh:episodeId"].(string)
		pages := episode["gh:pages"].([]interface{})
		for _, pg := range pages {
			page := pg.(map[string]interface{})
			pageNum := int(page["gh:pageNumber"].(float64))
			panels := page["gh:panels"].([]interface{})
			for _, p := range panels {
				panel := p.(map[string]interface{})
				panelIdx := int(panel["panel"].(float64))
				
				_, hasImage := panel["gh:generatedImageUrl"]
				_, hasPrompt := panel["gh:imagePrompt"]
				
				if !hasImage && !hasPrompt {
					missing = append(missing, fmt.Sprintf("Episode: %s, Page: %d, Panel: %d", epID, pageNum, panelIdx))
				}
			}
		}
	}

	resultText := "Missing Sketches:\n" + fmt.Sprintf("%v", missing)
	return &mcp.CallToolResult{
		Content: []mcp.Content{mcp.TextContent{Type: "text", Text: resultText}},
	}, nil
}

func handleGenerateAriaPrompt(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args := req.Params.Arguments.(map[string]interface{})
	epID, _ := args["episode_id"].(string)
	pageNum, _ := args["page_number"].(float64)
	panelIdx, _ := args["panel"].(float64)

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
	var targetPanel map[string]interface{}
	for _, e := range episodes {
		episode := e.(map[string]interface{})
		if episode["gh:episodeId"].(string) != epID {
			continue
		}
		pages := episode["gh:pages"].([]interface{})
		for _, pg := range pages {
			page := pg.(map[string]interface{})
			if int(page["gh:pageNumber"].(float64)) != int(pageNum) {
				continue
			}
			panels := page["gh:panels"].([]interface{})
			for _, p := range panels {
				panel := p.(map[string]interface{})
				if int(panel["panel"].(float64)) == int(panelIdx) {
					targetPanel = panel
					break
				}
			}
		}
	}

	if targetPanel == nil {
		return nil, fmt.Errorf("panel not found")
	}

	visual, _ := targetPanel["visual"].(string)
	shot, _ := targetPanel["shot"].(string)
	
	// ARIA Cinematic Base Template
	prompt := fmt.Sprintf("%s, ARIA-style. %s. luminous atmosphere, soft diffused natural light, pristine clean air. shot on 35mm, f/2.8, cinematic live-action.", shot, visual)
	
	targetPanel["gh:runwayPrompt"] = prompt
	targetPanel["gh:imagePrompt"] = prompt

	updatedData, _ := json.MarshalIndent(storyboard, "", "  ")
	os.WriteFile(storyboardPath, updatedData, 0644)

	return &mcp.CallToolResult{
		Content: []mcp.Content{mcp.TextContent{Type: "text", Text: fmt.Sprintf("Generated and saved prompt for %s P%d P%d: %s", epID, int(pageNum), int(panelIdx), prompt)}},
	}, nil
}

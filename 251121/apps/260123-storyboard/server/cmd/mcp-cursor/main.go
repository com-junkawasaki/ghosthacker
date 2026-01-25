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

	s.AddTool(mcp.NewTool("generate_all_missing_aria_prompts",
		mcp.WithDescription("Generate ARIA Cinematic Base prompts for all panels missing sketches in the storyboard."),
	), handleGenerateAllMissingAriaPrompts)

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
					
					// ARIA Cinematic Base Template
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

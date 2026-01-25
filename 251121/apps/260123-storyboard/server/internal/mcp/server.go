package mcp

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

// StoryboardMCPServer manages specialized agents as MCP tools
type StoryboardMCPServer struct {
	server *server.MCPServer
}

func NewStoryboardMCPServer() *StoryboardMCPServer {
	s := server.NewMCPServer(
		"GhostHacker Storyboard Agent",
		"1.0.0",
		server.WithLogging(),
	)

	ms := &StoryboardMCPServer{server: s}
	ms.registerTools()
	return ms
}

func (s *StoryboardMCPServer) registerTools() {
	// Scenario Agent Tool
	s.server.AddTool(mcp.NewTool("scenario_writer",
		mcp.WithDescription("Specialized agent for high-level plot, beats, and narrative structure."),
		mcp.WithSchema(map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"instruction": map[string]interface{}{
					"type":        "string",
					"description": "Instruction for the scenario writer",
				},
				"context": map[string]interface{}{
					"type":        "string",
					"description": "JSON-LD context of the episode/beats",
				},
			},
			"required": []string{"instruction"},
		}),
	), s.handleScenarioWriter)

	// Cinematic Agent Tool
	s.server.AddTool(mcp.NewTool("cinematic_sketcher",
		mcp.WithDescription("Specialized agent for visual composition, camera work, and image prompts."),
		mcp.WithSchema(map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"instruction": map[string]interface{}{
					"type":        "string",
					"description": "Instruction for visual direction",
				},
				"panel_data": map[string]interface{}{
					"type":        "string",
					"description": "JSON-LD data of the target panel",
				},
			},
			"required": []string{"instruction"},
		}),
	), s.handleCinematicSketcher)

	// Character Agent Tool
	s.server.AddTool(mcp.NewTool("character_specialist",
		mcp.WithDescription("Specialized agent for character consistency, emotional state, and motives."),
		mcp.WithSchema(map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"character_id": map[string]interface{}{
					"type":        "string",
					"description": "ID of the character to focus on (e.g. character:Ren)",
				},
				"instruction": map[string]interface{}{
					"type":        "string",
					"description": "Instruction regarding the character",
				},
			},
			"required": []string{"character_id", "instruction"},
		}),
	), s.handleCharacterSpecialist)

	// Character Data Retrieval Tool (Character-specific MCP)
	s.server.AddTool(mcp.NewTool("get_character_profile",
		mcp.WithDescription("Retrieve detailed profile and voice guide for a specific character."),
		mcp.WithSchema(map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"character_id": map[string]interface{}{
					"type":        "string",
					"description": "ID of the character (e.g. character:Ren)",
				},
			},
			"required": []string{"character_id"},
		}),
	), s.handleGetCharacterProfile)
}

func (s *StoryboardMCPServer) handleScenarioWriter(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	instruction := req.Params.Arguments["instruction"].(string)
	log.Printf("[MCP] Scenario Writer called with: %s", instruction)
	
	// In a real implementation, this would call a sub-LLM or specialized logic
	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{
				Type: "text",
				Text: fmt.Sprintf("Scenario Agent processed: %s. (Logic pending)", instruction),
			},
		},
	}, nil
}

func (s *StoryboardMCPServer) handleCinematicSketcher(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	instruction := req.Params.Arguments["instruction"].(string)
	log.Printf("[MCP] Cinematic Sketcher called with: %s", instruction)
	
	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{
				Type: "text",
				Text: fmt.Sprintf("Cinematic Agent processed: %s. (Logic pending)", instruction),
			},
		},
	}, nil
}

func (s *StoryboardMCPServer) handleCharacterSpecialist(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	charID := req.Params.Arguments["character_id"].(string)
	instruction := req.Params.Arguments["instruction"].(string)
	log.Printf("[MCP] Character Specialist called for %s: %s", charID, instruction)
	
	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{
				Type: "text",
				Text: fmt.Sprintf("Character Agent for %s processed: %s. (Logic pending)", charID, instruction),
			},
		},
	}, nil
}

func (s *StoryboardMCPServer) handleGetCharacterProfile(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	charID := req.Params.Arguments["character_id"].(string)
	log.Printf("[MCP] Fetching profile for: %s", charID)

	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = "../../../.." // Default fallback
	}

	datastoreDir := filepath.Join(workspaceRoot, "251121", "datastore")
	encodedID := base64.URLEncoding.EncodeToString([]byte(charID))
	charFile := filepath.Join(datastoreDir, encodedID+".jsonld")

	data, err := os.ReadFile(charFile)
	if err != nil {
		return nil, fmt.Errorf("character profile not found for %s: %w", charID, err)
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{
				Type: "text",
				Text: string(data),
			},
		},
	}, nil
}

// GetTools returns the list of tools for the main agent to use
func (s *StoryboardMCPServer) GetTools() []mcp.Tool {
	// This is a simplified way to expose tools to the main agent logic
	// In a real MCP setup, the main agent would be an MCP client.
	return []mcp.Tool{
		// ... return tools
	}
}

func (s *StoryboardMCPServer) CallTool(ctx context.Context, name string, args map[string]interface{}) (*mcp.CallToolResult, error) {
	// Manual dispatch for internal use
	req := mcp.CallToolRequest{
		Params: struct {
			Name      string                 `json:"name"`
			Arguments map[string]interface{} `json:"arguments,omitempty"`
		}{
			Name:      name,
			Arguments: args,
		},
	}
	
	switch name {
	case "scenario_writer":
		return s.handleScenarioWriter(ctx, req)
	case "cinematic_sketcher":
		return s.handleCinematicSketcher(ctx, req)
	case "character_specialist":
		return s.handleCharacterSpecialist(ctx, req)
	case "get_character_profile":
		return s.handleGetCharacterProfile(ctx, req)
	default:
		return nil, fmt.Errorf("tool not found: %s", name)
	}
}

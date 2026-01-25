package mcp

import (
	"context"
	"encoding/base64"
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
	)

	ms := &StoryboardMCPServer{server: s}
	ms.registerTools()
	return ms
}

func (s *StoryboardMCPServer) registerTools() {
	// Scenario Agent Tool
	s.server.AddTool(mcp.NewTool("scenario_writer",
		mcp.WithDescription("Specialized agent for high-level plot, beats, and narrative structure."),
	), s.handleScenarioWriter)

	// Cinematic Agent Tool
	s.server.AddTool(mcp.NewTool("cinematic_sketcher",
		mcp.WithDescription("Specialized agent for visual composition, camera work, and image prompts."),
	), s.handleCinematicSketcher)

	// Character Agent Tool
	s.server.AddTool(mcp.NewTool("character_specialist",
		mcp.WithDescription("Specialized agent for character consistency, emotional state, and motives."),
	), s.handleCharacterSpecialist)

	// Character Data Retrieval Tool
	s.server.AddTool(mcp.NewTool("get_character_profile",
		mcp.WithDescription("Retrieve detailed profile and voice guide for a specific character."),
	), s.handleGetCharacterProfile)
}

func (s *StoryboardMCPServer) handleScenarioWriter(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args := req.Params.Arguments.(map[string]interface{})
	instruction, _ := args["instruction"].(string)
	log.Printf("[MCP] Scenario Writer called with: %s", instruction)
	
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
	args := req.Params.Arguments.(map[string]interface{})
	instruction, _ := args["instruction"].(string)
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
	args := req.Params.Arguments.(map[string]interface{})
	charID, _ := args["character_id"].(string)
	instruction, _ := args["instruction"].(string)
	log.Printf("[MCP] Character Specialist called for %s: %s", charID, instruction)

	// Isolation Logic: Fetch ONLY the specific character profile to ensure focus
	profile, err := s.fetchCharacterProfile(charID)
	if err != nil {
		return nil, fmt.Errorf("failed to isolate character profile for %s: %w", charID, err)
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{
				Type: "text",
				Text: fmt.Sprintf("Character Agent for %s processed: %s.\nIsolated Context: %s", charID, instruction, profile),
			},
		},
	}, nil
}

func (s *StoryboardMCPServer) fetchCharacterProfile(charID string) (string, error) {
	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = "../../../.."
	}

	datastoreDir := filepath.Join(workspaceRoot, "251121", "datastore")
	encodedID := base64.URLEncoding.EncodeToString([]byte(charID))
	charFile := filepath.Join(datastoreDir, encodedID+".jsonld")

	data, err := os.ReadFile(charFile)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func (s *StoryboardMCPServer) handleGetCharacterProfile(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	args := req.Params.Arguments.(map[string]interface{})
	charID, _ := args["character_id"].(string)
	log.Printf("[MCP] Fetching profile for: %s", charID)

	data, err := s.fetchCharacterProfile(charID)
	if err != nil {
		return nil, fmt.Errorf("character profile not found for %s: %w", charID, err)
	}

	return &mcp.CallToolResult{
		Content: []mcp.Content{
			mcp.TextContent{
				Type: "text",
				Text: data,
			},
		},
	}, nil
}

func (s *StoryboardMCPServer) CallTool(ctx context.Context, name string, args map[string]interface{}) (*mcp.CallToolResult, error) {
	req := mcp.CallToolRequest{
		Params: mcp.CallToolParams{
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

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
)

func main() {
	s := server.NewMCPServer(
		"GhostHacker Storyboard Agent (Cursor)",
		"1.0.0",
	)

	// Register tools
	s.AddTool(mcp.NewTool("generate_dialogue_and_cinematics",
		mcp.WithDescription("Generate high-quality dialogue and cinematic prompts for a specific episode and page range."),
	), handleGenerateDialogueAndCinematics)

	s.AddTool(mcp.NewTool("generate_all_missing_aria_prompts",
		mcp.WithDescription("Generate ARIA Cinematic Base prompts for all panels missing sketches in the storyboard."),
	), handleGenerateAllMissingAriaPrompts)

	// Run as stdio server
	if err := server.ServeStdio(s); err != nil {
		log.Fatalf("MCP server error: %v", err)
	}
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
				visual, _ := panel["visual"].(string)
				shot, _ := panel["shot"].(string)
				chars, _ := panel["characters"].([]interface{})

				// 1. Dialogue Coach Logic (Update existing or generate new)
				dialogues, ok := panel["dialogue"].([]interface{})
				if !ok || len(dialogues) == 0 {
					// Generate new if empty
					mainSpeaker := "character:Ren"
					if len(chars) > 0 {
						mainSpeaker = chars[0].(string)
					}
					
					text, delivery, subtext, emotion := getCharacterDefaults(mainSpeaker, visual)
					panel["dialogue"] = []interface{}{
						map[string]interface{}{
							"speaker":     mainSpeaker,
							"text":        text,
							"gh:delivery": delivery,
							"gh:subtext":  subtext,
							"gh:emotion":   emotion,
						},
					}
				} else {
					// Update existing dialogues
					for i, d := range dialogues {
						diag := d.(map[string]interface{})
						speaker, _ := diag["speaker"].(string)
						
						// Fill missing fields
						if _, exists := diag["gh:delivery"]; !exists || diag["gh:delivery"] == "" {
							_, delivery, subtext, emotion := getCharacterDefaults(speaker, visual)
							diag["gh:delivery"] = delivery
							diag["gh:subtext"] = subtext
							diag["gh:emotion"] = emotion
						}
						dialogues[i] = diag
					}
					panel["dialogue"] = dialogues
				}

				// 2. Cinematic Sketcher Logic (ARIA Base)
				charContext := ""
				if len(chars) > 0 {
					charNames := []string{}
					for _, c := range chars {
						name := strings.TrimPrefix(c.(string), "character:")
						charNames = append(charNames, name)
					}
					charContext = fmt.Sprintf("Featuring %s.", strings.Join(charNames, ", "))
				}

				prompt := fmt.Sprintf("%s, ARIA-style. %s %s. luminous atmosphere, soft diffused natural light, pristine clean air. shot on 35mm, f/2.8, cinematic live-action.", shot, visual, charContext)
				
				panel["gh:runwayPrompt"] = prompt
				panel["gh:imagePrompt"] = prompt
				count++
			}
		}
	}

	updatedData, _ := json.MarshalIndent(storyboard, "", "  ")
	os.WriteFile(storyboardPath, updatedData, 0644)

	return &mcp.CallToolResult{
		Content: []mcp.Content{mcp.TextContent{Type: "text", Text: fmt.Sprintf("Successfully updated %d panels for %s (Pages %d-%d) with full dialogue elements (delivery, emotion, subtext) and ARIA prompts.", count, epID, int(startPage), int(endPage))}},
	}, nil
}

func getCharacterDefaults(speaker, visual string) (text, delivery, subtext, emotion string) {
	switch speaker {
	case "character:Ren":
		text = "……あー。まあ、やるか。順番に消してくだけだし。"
		delivery = "椅子に深く沈み込み、気怠げに視線だけをモニターに向ける。"
		subtext = "面倒だが、技術的な興味は失っていない。"
		emotion = "neutral"
	case "character:Nei":
		text = "結論から言います。パッチ未適用。これが全ての原因です。"
		delivery = "タブレットを指し示し、一切の感情を排した冷静なトーンで。"
		subtext = "Renを動かすための事実提示。"
		emotion = "calm"
	case "character:Yuto":
		text = "……嘘だろ。全部、消えた……？"
		delivery = "震える手でスマホを握りしめ、青ざめた顔で画面を見つめる。"
		subtext = "現実を受け入れられない絶望。"
		emotion = "despair"
	default:
		text = "（沈黙）"
		delivery = "ARIAの光の中で、静かに佇む。"
		subtext = "状況の推移を見守る。"
		emotion = "neutral"
	}
	return
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

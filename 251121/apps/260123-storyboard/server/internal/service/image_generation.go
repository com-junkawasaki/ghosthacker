package service

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"connectrpc.com/connect"
	"storyboard-editor/backend/proto"
)

const (
	openRouterAPIURL = "https://openrouter.ai/api/v1/chat/completions"
	defaultModel      = "google/gemini-2.0-flash-001"
)

type OpenRouterImageResponse struct {
	Choices []struct {
		Message struct {
			Images []struct {
				ImageURL struct {
					URL string `json:"url"`
				} `json:"image_url"`
			} `json:"images"`
		} `json:"message"`
	} `json:"choices"`
}

// GeneratePanelImage generates an image for a panel using OpenRouter AI
func (s *StoryboardService) GeneratePanelImage(
	ctx context.Context,
	req *connect.Request[storyboardpb.GeneratePanelImageRequest],
) (*connect.Response[storyboardpb.GeneratePanelImageResponse], error) {
	filePath := req.Msg.FilePath
	if filePath == "" {
		filePath = s.storyboardPath
	}

	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return nil, connect.NewError(connect.CodeFailedPrecondition, fmt.Errorf("OPENROUTER_API_KEY is not set"))
	}

	// Build prompt from panel data
	prompt, err := s.buildImagePrompt(req.Msg.PanelData, filePath)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("failed to build prompt: %w", err))
	}

	log.Printf("Generating image with prompt: %s", prompt)

	// Call OpenRouter API
	imageDataURL, err := s.callOpenRouterAPI(ctx, apiKey, prompt)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to generate image: %w", err))
	}

	// Extract base64 data from data URL
	base64Data, err := extractBase64FromDataURL(imageDataURL)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to extract image data: %w", err))
	}

	// Decode base64
	imageBytes, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to decode image: %w", err))
	}

	// Save image to file
	imagePath, err := s.saveImage(filePath, req.Msg.EpisodeId, req.Msg.PageNumber, req.Msg.Panel, imageBytes)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to save image: %w", err))
	}

	// Create GeneratedImage
	generatedImage := &storyboardpb.GeneratedImage{
		ImageUrl:   imagePath,
		ImagePrompt: prompt,
		GeneratedAt: time.Now().Unix(),
		Model:      defaultModel,
	}

	return connect.NewResponse(&storyboardpb.GeneratePanelImageResponse{
		Success:        true,
		Message:        "Image generated successfully",
		GeneratedImage: generatedImage,
		ImageUrl:       imagePath,
	}), nil
}

func (s *StoryboardService) callOpenRouterAPI(ctx context.Context, apiKey, prompt string) (string, error) {
	requestBody := map[string]interface{}{
		"model": defaultModel,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
		"modalities": []string{"text", "image"},
		"image_config": map[string]string{
			"aspect_ratio": "16:9",
			"image_size":   "2K", // OpenRouter accepts: "1K", "2K", "4K"
		},
		"stream": false,
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", openRouterAPIURL, strings.NewReader(string(jsonBody)))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("HTTP-Referer", "https://ghosthacker.gftd.ai")
	httpReq.Header.Set("X-Title", "ghosthacker-storyboard-editor")

	client := &http.Client{Timeout: 120 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("failed to call OpenRouter API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("OpenRouter API error (%d): %s", resp.StatusCode, string(body))
	}

	var result OpenRouterImageResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	if len(result.Choices) == 0 || len(result.Choices[0].Message.Images) == 0 {
		return "", fmt.Errorf("no image in response")
	}

	imageURL := result.Choices[0].Message.Images[0].ImageURL.URL
	if imageURL == "" {
		return "", fmt.Errorf("empty image URL in response")
	}

	return imageURL, nil
}

func extractBase64FromDataURL(dataURL string) (string, error) {
	// Handle data:image/png;base64,<data> format
	parts := strings.Split(dataURL, ",")
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid data URL format")
	}
	return parts[1], nil
}

func (s *StoryboardService) saveImage(filePath, episodeID string, pageNumber, panel int32, imageBytes []byte) (string, error) {
	// Determine workspace root
	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = filepath.Dir(filepath.Dir(filepath.Dir(filepath.Dir(filePath))))
	}

	// Create images directory: 251121/images/episodes/{episode_id}/pages/{page_number}/
	imagesDir := filepath.Join(workspaceRoot, "251121", "images", "episodes", episodeID, "pages", fmt.Sprintf("%d", pageNumber))
	if err := os.MkdirAll(imagesDir, fs.FileMode(0755)); err != nil {
		return "", fmt.Errorf("failed to create images directory: %w", err)
	}

	// Generate filename: panel_{panel_number}_{timestamp}.png
	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("panel_%d_%s.png", panel, timestamp)
	imagePath := filepath.Join(imagesDir, filename)

	// Write image file
	if err := os.WriteFile(imagePath, imageBytes, fs.FileMode(0644)); err != nil {
		return "", fmt.Errorf("failed to write image file: %w", err)
	}

	log.Printf("Saved image to: %s", imagePath)

	// Return URL path for accessing the image via HTTP
	// Format: /images/episodes/{episode_id}/pages/{page_number}/panel_{panel}_{timestamp}.png
	urlPath := fmt.Sprintf("/images/episodes/%s/pages/%d/%s", episodeID, pageNumber, filename)
	return urlPath, nil
}

func (s *StoryboardService) buildImagePrompt(panelData *storyboardpb.PanelData, storyboardPath string) (string, error) {
	parts := []string{}

	// Visual note is primary
	if panelData.VisualNote != "" {
		parts = append(parts, panelData.VisualNote)
	}

	// Load character details
	if len(panelData.Characters) > 0 {
		charDetails, err := s.loadCharacterDetails(panelData.Characters, storyboardPath)
		if err != nil {
			log.Printf("Warning: failed to load character details: %v", err)
		} else if charDetails != "" {
			parts = append(parts, "Characters: "+charDetails)
		}
	}

	// Load environment details
	if panelData.Environment != "" {
		envDetails, err := s.loadEnvironmentDetails(panelData.Environment, storyboardPath)
		if err != nil {
			log.Printf("Warning: failed to load environment details: %v", err)
		} else if envDetails != "" {
			parts = append(parts, "Environment: "+envDetails)
		}
	}

	// Add shot type
	if panelData.Shot != "" {
		parts = append(parts, "Shot type: "+panelData.Shot)
	}

	// Add dialogue context
	if len(panelData.Dialogue) > 0 {
		dialogueText := ""
		for _, d := range panelData.Dialogue {
			dialogueText += fmt.Sprintf("%s: %s. ", d.Speaker, d.Text)
		}
		if dialogueText != "" {
			parts = append(parts, "Dialogue: "+strings.TrimSpace(dialogueText))
		}
	}

	// Add camera direction
	if panelData.CameraDirection != "" {
		parts = append(parts, "Camera: "+panelData.CameraDirection)
	}

	return strings.Join(parts, ". "), nil
}

func (s *StoryboardService) loadCharacterDetails(characterIDs []string, storyboardPath string) (string, error) {
	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = filepath.Dir(filepath.Dir(filepath.Dir(filepath.Dir(storyboardPath))))
	}

	datastoreDir := filepath.Join(workspaceRoot, "251121", "datastore")
	details := []string{}

	for _, charID := range characterIDs {
		// Character IDs are like "character:Ren", need to encode to base64
		encodedID := base64.URLEncoding.EncodeToString([]byte(charID))
		charFile := filepath.Join(datastoreDir, encodedID+".jsonld")

		data, err := os.ReadFile(charFile)
		if err != nil {
			continue // Skip if file not found
		}

		var charData map[string]interface{}
		if err := json.Unmarshal(data, &charData); err != nil {
			continue
		}

		// Extract character name and description
		name := ""
		if n, ok := charData["schema:name"].(string); ok {
			name = n
		} else if n, ok := charData["dct:title"].(string); ok {
			name = n
		}

		description := ""
		if d, ok := charData["schema:description"].(string); ok {
			description = d
		} else if d, ok := charData["dct:description"].(string); ok {
			description = d
		}

		if name != "" {
			charDetail := name
			if description != "" {
				charDetail += " (" + description + ")"
			}
			details = append(details, charDetail)
		}
	}

	return strings.Join(details, ", "), nil
}

func (s *StoryboardService) loadEnvironmentDetails(environmentID string, storyboardPath string) (string, error) {
	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = filepath.Dir(filepath.Dir(filepath.Dir(filepath.Dir(storyboardPath))))
	}

	datastoreDir := filepath.Join(workspaceRoot, "251121", "datastore")
	encodedID := base64.URLEncoding.EncodeToString([]byte(environmentID))
	envFile := filepath.Join(datastoreDir, encodedID+".jsonld")

	data, err := os.ReadFile(envFile)
	if err != nil {
		return "", err
	}

	var envData map[string]interface{}
	if err := json.Unmarshal(data, &envData); err != nil {
		return "", err
	}

	// Extract environment name and description
	name := ""
	if n, ok := envData["schema:name"].(string); ok {
		name = n
	} else if n, ok := envData["dct:title"].(string); ok {
		name = n
	}

	description := ""
	if d, ok := envData["schema:description"].(string); ok {
		description = d
	} else if d, ok := envData["dct:description"].(string); ok {
		description = d
	}

	result := name
	if description != "" {
		result += " (" + description + ")"
	}

	return result, nil
}

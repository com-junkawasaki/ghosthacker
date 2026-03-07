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
	"sort"
	"strings"
	"time"

	"connectrpc.com/connect"
	gonanoid "github.com/matoous/go-nanoid/v2"
	"storyboard-editor/backend/internal/jsonld"
	"storyboard-editor/backend/proto"
)

const (
	openRouterAPIURL = "https://openrouter.ai/api/v1/chat/completions"
	defaultModel     = "bytedance-seed/seedream-4.5"
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

	// Build prompt from panel data
	prompt, err := s.buildImagePrompt(req.Msg.PanelData, filePath)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("failed to build prompt: %w", err))
	}

	// Apply different styles based on purpose:
	// - Cinematic sketch: Rough compositional guide for animators/artists (faces intentionally simplified)
	// - Character avatar: Detailed portrait for character reference
	var stylePrefix, styleSuffix string
	if strings.HasPrefix(req.Msg.PanelData.VisualNote, "CHARACTER_AVATAR:") {
		// Character avatar: detailed portrait for reference
		stylePrefix = "Professional character portrait, headshot, Mai Yoneyama illustrator style, High-End Webtoon Aesthetic, Fine Line Art, Modern Manga Style, clean background. "
		styleSuffix = ". Sharp focus on face and expressive eyes, intricate iris detail, consistent facial features, clean white background, high resolution, 8k."
	} else {
		// Cinematic storyboard sketch: rough compositional guide for animators
		// Faces are intentionally simplified to allow artists freedom in final design
		stylePrefix = "Cinematic storyboard thumbnail sketch, rough compositional guide for animators, gestural figures with simplified facial features, focus on camera framing staging and body language, manga panel layout reference. "
		styleSuffix = ". Rough sketch aesthetic with loose confident linework, emphasis on lighting direction and silhouette shapes, atmospheric mood indicators, faces suggested through simple shapes rather than detailed features, director's visual notes style, monochrome with screen tones, cinematic composition."
	}
	fullPrompt := stylePrefix + prompt + styleSuffix

	log.Printf("Generating image with prompt: %s", fullPrompt)

	// Create images directory: {project}/resources/images/episodes/{episode_id}/pages/{page_number}/
	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = filepath.Dir(filepath.Dir(filepath.Dir(filepath.Dir(filePath))))
	}
	imagesDir := filepath.Join(workspaceRoot, s.projectDir, "resources/images", "episodes", req.Msg.EpisodeId, "pages", fmt.Sprintf("%d", req.Msg.PageNumber))
	if err := os.MkdirAll(imagesDir, fs.FileMode(0755)); err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to create images directory: %w", err))
	}

	// Get or generate stable panel ID (nanoid-based)
	panelID, imageVersion, err := s.getOrCreatePanelID(filePath, req.Msg.EpisodeId, req.Msg.PageNumber, req.Msg.Panel)
	if err != nil {
		log.Printf("Warning: failed to get panel ID, using fallback: %v", err)
		panelID = fmt.Sprintf("panel_%d_%d_%d", req.Msg.PageNumber, req.Msg.Panel, time.Now().Unix())
		imageVersion = 1
	}

	// Generate filename using stable panel ID and version: {panelID}_v{version}.png
	filename := fmt.Sprintf("%s_v%d.png", panelID, imageVersion)
	imagePath := filepath.Join(imagesDir, filename)

	// Return URL path for accessing the image via HTTP
	// Format: /images/episodes/{episode_id}/pages/{page_number}/{panelID}_v{version}.png
	urlPath := fmt.Sprintf("/images/episodes/%s/pages/%d/%s", req.Msg.EpisodeId, req.Msg.PageNumber, filename)

	// Update storyboard JSON-LD with the expected path before actual generation
	// This ensures the UI knows where the image will be even if generation takes time
	s.preUpdateStoryboard(filePath, req.Msg.EpisodeId, req.Msg.PageNumber, req.Msg.Panel, urlPath, fullPrompt)

	// Determine which model to use: request field > env var > default (openrouter)
	useLocal := req.Msg.Model == "local" || req.Msg.Model == "cinematic" || (req.Msg.Model == "" && os.Getenv("USE_LOCAL_IMAGE_GEN") == "true")

	// Generate image via local Diffusers service or OpenRouter API
	var imageBytes []byte
	if useLocal {
		if req.Msg.Model == "cinematic" {
			// 2-stage: photorealistic → anime style transfer
			imageBytes, err = s.callLocalCinematicGen(ctx, prompt, imagePath)
		} else {
			style := "cinematic_sketch"
			if strings.HasPrefix(req.Msg.PanelData.VisualNote, "CHARACTER_AVATAR:") {
				style = "character_avatar"
			}
			imageBytes, err = s.callLocalImageGen(ctx, prompt, style, imagePath, req.Msg.PanelData.Characters...)
		}
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to generate image locally: %w", err))
		}
	} else {
		apiKey := os.Getenv("OPENROUTER_API_KEY")
		if apiKey == "" {
			return nil, connect.NewError(connect.CodeFailedPrecondition, fmt.Errorf("OPENROUTER_API_KEY is not set"))
		}

		imageDataURL, err := s.callOpenRouterAPI(ctx, apiKey, fullPrompt)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to generate image: %w", err))
		}

		base64Data, err := extractBase64FromDataURL(imageDataURL)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to extract image data: %w", err))
		}

		imageBytes, err = base64.StdEncoding.DecodeString(base64Data)
		if err != nil {
			return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to decode image: %w", err))
		}
	}

	// Write image file
	if err := os.WriteFile(imagePath, imageBytes, fs.FileMode(0644)); err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to write image file: %w", err))
	}

	log.Printf("Saved image to: %s", imagePath)

	// If this was a character avatar generation, also save it to characters directory
	if strings.HasPrefix(req.Msg.PanelData.VisualNote, "CHARACTER_AVATAR:") {
		charID := strings.TrimPrefix(req.Msg.PanelData.VisualNote, "CHARACTER_AVATAR:")
		charAvatarDir := filepath.Join(workspaceRoot, s.projectDir, "resources/characters", charID)
		os.MkdirAll(charAvatarDir, 0755)
		charAvatarPath := filepath.Join(charAvatarDir, "avatar.png")
		os.WriteFile(charAvatarPath, imageBytes, 0644)

		// Also save as ID.png for backward compatibility in ScriptView
		legacyAvatarDir := filepath.Join(workspaceRoot, s.projectDir, "resources/images", "characters")
		os.MkdirAll(legacyAvatarDir, 0755)
		os.WriteFile(filepath.Join(legacyAvatarDir, charID+".png"), imageBytes, 0644)
		
		log.Printf("Saved character avatar to: %s", charAvatarPath)
	}

	// Create GeneratedImage
	model := defaultModel
	if req.Msg.Model == "cinematic" {
		model = "cyberrealistic-xl + animagine-xl-4.0 (cinematic)"
	} else if useLocal {
		model = "animagine-xl-4.0 (local)"
	}
	generatedImage := &storyboardpb.GeneratedImage{
		ImageUrl:    urlPath,
		ImagePrompt: prompt,
		GeneratedAt: time.Now().Unix(),
		Model:       model,
	}

	// Final update to storyboard JSON-LD to confirm the image is ready
	s.finalUpdateStoryboard(filePath, req.Msg.EpisodeId, req.Msg.PageNumber, req.Msg.Panel, generatedImage)

	return connect.NewResponse(&storyboardpb.GeneratePanelImageResponse{
		Success:        true,
		Message:        "Image generated successfully",
		GeneratedImage: generatedImage,
		ImageUrl:       urlPath,
	}), nil
}

func (s *StoryboardService) preUpdateStoryboard(filePath, episodeID string, pageNumber, panel int32, urlPath, prompt string) {
	// Find and update the individual episode file, not the master storyboard
	episodeFilePath, err := s.getEpisodeFilePath(filePath, episodeID)
	if err != nil {
		log.Printf("preUpdateStoryboard: failed to find episode file: %v", err)
		return
	}

	episodeData, err := s.loadEpisodeFile(episodeFilePath)
	if err != nil {
		log.Printf("preUpdateStoryboard: failed to load episode file %s: %v", episodeFilePath, err)
		return
	}

	updated := s.updatePanelInEpisode(episodeData, pageNumber, panel, func(p map[string]interface{}) {
		p["gh:generatedImageUrl"] = urlPath
		p["generatedImageUrl"] = urlPath
		p["gh:imagePrompt"] = prompt
	})

	if !updated {
		log.Printf("preUpdateStoryboard: panel not found (episode=%s, page=%d, panel=%d)", episodeID, pageNumber, panel)
		return
	}

	updatedContent, _ := json.MarshalIndent(episodeData, "", "  ")
	if err := os.WriteFile(episodeFilePath, updatedContent, fs.FileMode(0644)); err != nil {
		log.Printf("preUpdateStoryboard: failed to write episode file: %v", err)
	}
	log.Printf("preUpdateStoryboard: updated episode file %s", episodeFilePath)
}

func (s *StoryboardService) finalUpdateStoryboard(filePath, episodeID string, pageNumber, panel int32, genImg *storyboardpb.GeneratedImage) {
	// Find and update the individual episode file, not the master storyboard
	episodeFilePath, err := s.getEpisodeFilePath(filePath, episodeID)
	if err != nil {
		log.Printf("finalUpdateStoryboard: failed to find episode file: %v", err)
		return
	}

	episodeData, err := s.loadEpisodeFile(episodeFilePath)
	if err != nil {
		log.Printf("finalUpdateStoryboard: failed to load episode file %s: %v", episodeFilePath, err)
		return
	}

	updated := s.updatePanelInEpisode(episodeData, pageNumber, panel, func(p map[string]interface{}) {
		p["gh:generatedImageUrl"] = genImg.ImageUrl
		p["generatedImageUrl"] = genImg.ImageUrl
		
		// Add to history
		historyRaw, _ := p["gh:generatedImages"]
		history, _ := historyRaw.([]interface{})
		newImg := map[string]interface{}{
			"gh:imageUrl":    genImg.ImageUrl,
			"gh:imagePrompt": genImg.ImagePrompt,
			"gh:generatedAt": genImg.GeneratedAt,
			"gh:model":       genImg.Model,
		}
		
		// Check for duplicates before adding
		exists := false
		for _, img := range history {
			if m, ok := img.(map[string]interface{}); ok {
				if m["gh:imageUrl"] == genImg.ImageUrl {
					exists = true
					break
				}
			}
		}
		if !exists {
			history = append(history, newImg)
		}
		
		// Sort history by generatedAt
		sort.Slice(history, func(i, j int) bool {
			m1, _ := history[i].(map[string]interface{})
			m2, _ := history[j].(map[string]interface{})
			
			getTimestamp := func(m map[string]interface{}) float64 {
				if val, ok := m["gh:generatedAt"].(float64); ok {
					return val
				}
				if val, ok := m["gh:generatedAt"].(int64); ok {
					return float64(val)
				}
				return 0
			}
			
			return getTimestamp(m1) < getTimestamp(m2)
		})
		
		p["gh:generatedImages"] = history
		p["gh:currentImageIndex"] = len(history) - 1
	})

	if !updated {
		log.Printf("finalUpdateStoryboard: panel not found (episode=%s, page=%d, panel=%d)", episodeID, pageNumber, panel)
		return
	}

	updatedContent, _ := json.MarshalIndent(episodeData, "", "  ")
	if err := os.WriteFile(episodeFilePath, updatedContent, fs.FileMode(0644)); err != nil {
		log.Printf("finalUpdateStoryboard: failed to write episode file: %v", err)
	}
	log.Printf("finalUpdateStoryboard: updated episode file %s with generated image", episodeFilePath)
}

func (s *StoryboardService) updatePanelInMap(storyboard map[string]interface{}, episodeID string, pageNumber, panel int32, updateFn func(map[string]interface{})) {
	sb := jsonld.Wrap(storyboard)
	for _, ep := range sb.Slice("gh:episodes") {
		epID, _ := ep.Str("gh:episodeId")
		if epID != episodeID {
			continue
		}

		for _, page := range ep.Slice("gh:pages") {
			pNum, _ := page.Int32("gh:pageNumber")
			if pNum != pageNumber {
				continue
			}

			for _, p := range page.Slice("gh:panels") {
				pIdx, _ := p.Int32("gh:panelIndex", "panel")
				if pIdx == panel {
					updateFn(p.Raw())
					return
				}
			}
		}
	}
}

// getEpisodeFilePath finds the episode's source file path from the master storyboard
func (s *StoryboardService) getEpisodeFilePath(masterFilePath, episodeID string) (string, error) {
	content, err := os.ReadFile(masterFilePath)
	if err != nil {
		return "", fmt.Errorf("failed to read master storyboard: %w", err)
	}

	var master map[string]interface{}
	if err := json.Unmarshal(content, &master); err != nil {
		return "", fmt.Errorf("failed to parse master storyboard: %w", err)
	}

	episodes, ok := master["gh:episodes"].([]interface{})
	if !ok {
		return "", fmt.Errorf("master storyboard has no gh:episodes")
	}

	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = filepath.Dir(filepath.Dir(filepath.Dir(filepath.Dir(masterFilePath))))
	}

	for _, e := range episodes {
		episode, ok := e.(map[string]interface{})
		if !ok {
			continue
		}

		epID, _ := episode["gh:episodeId"].(string)
		if epID != episodeID {
			continue
		}

		sourceFile, ok := episode["gh:sourceFile"].(string)
		if !ok {
			return "", fmt.Errorf("episode %s has no gh:sourceFile", episodeID)
		}

		// sourceFile is relative to resources/ directory
		fullPath := filepath.Join(workspaceRoot, s.projectDir, "resources", sourceFile)
		return fullPath, nil
	}

	return "", fmt.Errorf("episode %s not found in master storyboard", episodeID)
}

// loadEpisodeFile loads an individual episode file
func (s *StoryboardService) loadEpisodeFile(filePath string) (map[string]interface{}, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read episode file: %w", err)
	}

	var data map[string]interface{}
	if err := json.Unmarshal(content, &data); err != nil {
		return nil, fmt.Errorf("failed to parse episode file: %w", err)
	}

	return data, nil
}

// updatePanelInEpisode updates a panel in an individual episode file
// Episode files have gh:pages at the root level (not inside gh:episodes)
func (s *StoryboardService) updatePanelInEpisode(episode map[string]interface{}, pageNumber, panel int32, updateFn func(map[string]interface{})) bool {
	ep := jsonld.Wrap(episode)
	pages := ep.Slice("gh:pages")
	if len(pages) == 0 {
		log.Printf("updatePanelInEpisode: no gh:pages found in episode")
		return false
	}

	for _, page := range pages {
		pNum, _ := page.Int32("gh:pageNumber")
		if pNum != pageNumber {
			continue
		}

		panels := page.Slice("gh:panels")
		if len(panels) == 0 {
			log.Printf("updatePanelInEpisode: no gh:panels found in page %d", pageNumber)
			continue
		}

		for _, p := range panels {
			pIdx, _ := p.Int32("gh:panelIndex", "panel")
			if pIdx == panel {
				updateFn(p.Raw())
				log.Printf("updatePanelInEpisode: updated panel %d on page %d", panel, pageNumber)
				return true
			}
		}
	}

	return false
}

// getOrCreatePanelID retrieves or creates a stable panel ID (nanoid-based)
// Returns: panelID, nextImageVersion, error
func (s *StoryboardService) getOrCreatePanelID(masterFilePath string, episodeID string, pageNumber, panel int32) (string, int, error) {
	episodeFilePath, err := s.getEpisodeFilePath(masterFilePath, episodeID)
	if err != nil {
		return "", 0, fmt.Errorf("failed to find episode file: %w", err)
	}

	episodeData, err := s.loadEpisodeFile(episodeFilePath)
	if err != nil {
		return "", 0, fmt.Errorf("failed to load episode file: %w", err)
	}

	ep := jsonld.Wrap(episodeData)
	epPages := ep.Slice("gh:pages")
	if len(epPages) == 0 {
		return "", 0, fmt.Errorf("no gh:pages found in episode")
	}

	for _, page := range epPages {
		pNum, _ := page.Int32("gh:pageNumber")
		if pNum != pageNumber {
			continue
		}

		for _, p := range page.Slice("gh:panels") {
			pIdx, _ := p.Int32("gh:panelIndex", "panel")
			if pIdx != panel {
				continue
			}

			pMap := p.Raw()

			// Check if panel already has an @id
			panelID, hasID := p.Str("@id")
			if !hasID || panelID == "" {
				// Generate new nanoid for this panel
				newID, err := gonanoid.New(12)
				if err != nil {
					return "", 0, fmt.Errorf("failed to generate nanoid: %w", err)
				}
				panelID = fmt.Sprintf("panel:%s", newID)
				pMap["@id"] = panelID

				// Save the updated episode file with the new panel ID
				updatedContent, _ := json.MarshalIndent(episodeData, "", "  ")
				if err := os.WriteFile(episodeFilePath, updatedContent, fs.FileMode(0644)); err != nil {
					log.Printf("Warning: failed to save panel ID to episode file: %v", err)
				} else {
					log.Printf("Created new panel ID: %s for page %d, panel %d", panelID, pageNumber, panel)
				}
			}

			// Calculate next version number based on existing generated images
			imageVersion := 1
			if history, ok := pMap["gh:generatedImages"].([]interface{}); ok {
				imageVersion = len(history) + 1
			}

			// Return just the ID part without "panel:" prefix for filename
			cleanID := strings.TrimPrefix(panelID, "panel:")
			return cleanID, imageVersion, nil
		}
	}

	return "", 0, fmt.Errorf("panel not found: page %d, panel %d", pageNumber, panel)
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

// callLocalImageGen sends a request to the local Diffusers image generation service.
// The service generates the image and writes it to outputPath directly.
// Returns the raw PNG bytes.
func (s *StoryboardService) callLocalImageGen(ctx context.Context, prompt, style, outputPath string, characterIDs ...string) ([]byte, error) {
	baseURL := os.Getenv("IMAGE_GEN_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8100"
	}

	requestBody := map[string]interface{}{
		"prompt":       prompt,
		"style":        style,
		"aspect_ratio": "16:9",
		"output_path":  outputPath,
	}

	// Resolve character reference images for IP-Adapter
	if len(characterIDs) > 0 {
		var refPaths []string
		imagesDir := filepath.Join(s.workspaceRoot, s.projectDir, "resources", "images", "characters")
		for _, cid := range characterIDs {
			// character IDs like "character:tamaki" → "tamaki"
			slug := strings.TrimPrefix(cid, "character:")
			imgPath := filepath.Join(imagesDir, slug+".png")
			if _, err := os.Stat(imgPath); err == nil {
				refPaths = append(refPaths, imgPath)
				log.Printf("IP-Adapter ref: %s -> %s", cid, imgPath)
			}
		}
		if len(refPaths) > 0 {
			requestBody["reference_image_paths"] = refPaths
			requestBody["ip_adapter_scale"] = 0.4
		}
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", baseURL+"/generate-panel", strings.NewReader(string(jsonBody)))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 600 * time.Second} // local gen can be slow (SDXL + IP-Adapter on MPS)
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to call local image gen: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("local image gen error (%d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		ImageBase64    string `json:"image_base64"`
		Seed           int    `json:"seed"`
		GenerationTime int    `json:"generation_time_ms"`
		OutputPath     string `json:"output_path"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// If the service already wrote the file, read it back
	if result.OutputPath != "" {
		imageBytes, err := os.ReadFile(result.OutputPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read generated image: %w", err)
		}
		log.Printf("Local image gen: %dx seed=%d in %dms -> %s", len(imageBytes), result.Seed, result.GenerationTime, result.OutputPath)
		return imageBytes, nil
	}

	// Otherwise decode from base64
	base64Data, err := extractBase64FromDataURL(result.ImageBase64)
	if err != nil {
		return nil, fmt.Errorf("failed to extract base64 from local gen response: %w", err)
	}
	imageBytes, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return nil, fmt.Errorf("failed to decode base64: %w", err)
	}

	log.Printf("Local image gen: seed=%d in %dms", result.Seed, result.GenerationTime)
	return imageBytes, nil
}

// callLocalCinematicGen sends a request for 2-stage cinematic generation
// (photorealistic → anime style transfer).
func (s *StoryboardService) callLocalCinematicGen(ctx context.Context, prompt, outputPath string) ([]byte, error) {
	baseURL := os.Getenv("IMAGE_GEN_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8100"
	}

	requestBody := map[string]interface{}{
		"prompt":      prompt,
		"aspect_ratio": "16:9",
		"output_path": outputPath,
	}

	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", baseURL+"/generate-cinematic", strings.NewReader(string(jsonBody)))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	// 2-stage takes roughly twice as long
	client := &http.Client{Timeout: 1200 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to call cinematic gen: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("cinematic gen error (%d): %s", resp.StatusCode, string(body))
	}

	var result struct {
		ImageBase64    string `json:"image_base64"`
		Seed           int    `json:"seed"`
		GenerationTime int    `json:"generation_time_ms"`
		OutputPath     string `json:"output_path"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if result.OutputPath != "" {
		imageBytes, err := os.ReadFile(result.OutputPath)
		if err != nil {
			return nil, fmt.Errorf("failed to read generated image: %w", err)
		}
		log.Printf("Cinematic gen: seed=%d in %dms -> %s", result.Seed, result.GenerationTime, result.OutputPath)
		return imageBytes, nil
	}

	base64Data, err := extractBase64FromDataURL(result.ImageBase64)
	if err != nil {
		return nil, fmt.Errorf("failed to extract base64: %w", err)
	}
	imageBytes, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return nil, fmt.Errorf("failed to decode base64: %w", err)
	}

	log.Printf("Cinematic gen: seed=%d in %dms", result.Seed, result.GenerationTime)
	return imageBytes, nil
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
	// This function is now partially integrated into GeneratePanelImage
	// but kept for compatibility if needed elsewhere.
	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = filepath.Dir(filepath.Dir(filepath.Dir(filepath.Dir(filePath))))
	}

	imagesDir := filepath.Join(workspaceRoot, s.projectDir, "resources/images", "episodes", episodeID, "pages", fmt.Sprintf("%d", pageNumber))
	if err := os.MkdirAll(imagesDir, fs.FileMode(0755)); err != nil {
		return "", fmt.Errorf("failed to create images directory: %w", err)
	}

	timestamp := time.Now().Format("20060102_150405")
	filename := fmt.Sprintf("panel_%d_%s.png", panel, timestamp)
	imagePath := filepath.Join(imagesDir, filename)

	if err := os.WriteFile(imagePath, imageBytes, fs.FileMode(0644)); err != nil {
		return "", fmt.Errorf("failed to write image file: %w", err)
	}

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
	// Try to load from the master storyboard first
	storyboard, err := s.validateAndLoad(storyboardPath)
	if err != nil {
		log.Printf("loadCharacterDetails: failed to load master storyboard: %v", err)
	}

	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = filepath.Dir(filepath.Dir(filepath.Dir(filepath.Dir(storyboardPath))))
	}

	charDir := filepath.Join(workspaceRoot, s.projectDir, "resources/characters")
	details := []string{}

	for _, charID := range characterIDs {
		var charData map[string]interface{}
		found := false

		// 1. Try master storyboard
		if storyboard != nil {
			if chars, ok := storyboard["gh:characters"].([]interface{}); ok {
				for _, c := range chars {
					if m, ok := c.(map[string]interface{}); ok && m["@id"] == charID {
						charData = m
						found = true
						break
					}
				}
			}
		}

		// 2. Try characters/ directory (new design: characters/ID/profile.jsonld)
		if !found {
			id := strings.TrimPrefix(charID, "character:")
			charFile := filepath.Join(charDir, id, "profile.jsonld")
			data, err := os.ReadFile(charFile)
			if err == nil {
				if err := json.Unmarshal(data, &charData); err == nil {
					found = true
				}
			}
		}

		if !found {
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

		// Extract appearance if available
		appearance := ""
		if app, ok := charData["gh:appearance"].(map[string]interface{}); ok {
			if prompt, ok := app["gh:generationPrompt"].(string); ok {
				appearance = prompt
			}
		}

		if name != "" {
			charDetail := name
			if description != "" {
				charDetail += " (" + description + ")"
			}
			if appearance != "" {
				charDetail += " Appearance: " + appearance
			}
			details = append(details, charDetail)
		}
	}

	return strings.Join(details, ", "), nil
}

func (s *StoryboardService) loadEnvironmentDetails(environmentID string, storyboardPath string) (string, error) {
	// Try to load from the master storyboard first
	storyboard, err := s.validateAndLoad(storyboardPath)
	if err != nil {
		log.Printf("loadEnvironmentDetails: failed to load master storyboard: %v", err)
	}

	var envData map[string]interface{}
	found := false

	if storyboard != nil {
		if envs, ok := storyboard["gh:environments"].([]interface{}); ok {
			for _, e := range envs {
				if m, ok := e.(map[string]interface{}); ok && m["@id"] == environmentID {
					envData = m
					found = true
					break
				}
			}
		}
	}

	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = filepath.Dir(filepath.Dir(filepath.Dir(filepath.Dir(storyboardPath))))
	}

	if !found {
		// Try environments/ directory (new design: environments/ID/profile.jsonld)
		envDir := filepath.Join(workspaceRoot, s.projectDir, "resources/environments")
		id := strings.TrimPrefix(environmentID, "env:")
		envFile := filepath.Join(envDir, id, "profile.jsonld")
		data, err := os.ReadFile(envFile)
		if err == nil {
			if err := json.Unmarshal(data, &envData); err == nil {
				found = true
			}
		}
	}

	if found {
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

	// Fallback to datastore (legacy)
	datastoreDir := filepath.Join(workspaceRoot, s.projectDir, "resources/datastore")
	encodedID := base64.URLEncoding.EncodeToString([]byte(environmentID))
	envFile := filepath.Join(datastoreDir, encodedID+".jsonld")

	data, err := os.ReadFile(envFile)
	if err != nil {
		return "", err
	}

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

// --- Job-based Generation RPCs ---

// SubmitGenerationJob enqueues a new image generation job.
func (s *StoryboardService) SubmitGenerationJob(
	ctx context.Context,
	req *connect.Request[storyboardpb.SubmitGenerationJobRequest],
) (*connect.Response[storyboardpb.SubmitGenerationJobResponse], error) {
	filePath := req.Msg.FilePath
	if filePath == "" {
		filePath = s.storyboardPath
	}

	prompt, err := s.buildImagePrompt(req.Msg.PanelData, filePath)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("failed to build prompt: %w", err))
	}

	job := &GenerationJob{
		EpisodeID:  req.Msg.EpisodeId,
		PageNumber: req.Msg.PageNumber,
		Panel:      req.Msg.Panel,
		Model:      req.Msg.Model,
		Prompt:     prompt,
		filePath:   filePath,
		panelData:  req.Msg.PanelData,
	}

	jobID := s.jobQueue.EnqueueJob(job)

	return connect.NewResponse(&storyboardpb.SubmitGenerationJobResponse{
		Success: true,
		Message: "Job submitted",
		JobId:   jobID,
	}), nil
}

// CancelGenerationJob cancels a queued or running generation job.
func (s *StoryboardService) CancelGenerationJob(
	ctx context.Context,
	req *connect.Request[storyboardpb.CancelGenerationJobRequest],
) (*connect.Response[storyboardpb.CancelGenerationJobResponse], error) {
	if err := s.jobQueue.CancelJob(req.Msg.JobId); err != nil {
		return connect.NewResponse(&storyboardpb.CancelGenerationJobResponse{
			Success: false,
			Message: err.Error(),
		}), nil
	}
	return connect.NewResponse(&storyboardpb.CancelGenerationJobResponse{
		Success: true,
		Message: "Job cancelled",
	}), nil
}

// ListGenerationJobs returns all generation jobs.
func (s *StoryboardService) ListGenerationJobs(
	ctx context.Context,
	req *connect.Request[storyboardpb.ListGenerationJobsRequest],
) (*connect.Response[storyboardpb.ListGenerationJobsResponse], error) {
	jobs := s.jobQueue.ListJobs()
	infos := make([]*storyboardpb.GenerationJobInfo, 0, len(jobs))
	for _, j := range jobs {
		infos = append(infos, &storyboardpb.GenerationJobInfo{
			JobId:                j.ID,
			Status:               j.Status,
			CurrentStep:          int32(j.Progress.CurrentStep),
			TotalSteps:           int32(j.Progress.TotalSteps),
			EstimatedRemainingMs: float32(j.Progress.EstimatedRemainMs),
			Error:                j.Error,
			ImageUrl:             j.ImageURL,
			EpisodeId:            j.EpisodeID,
			PageNumber:           j.PageNumber,
			Panel:                j.Panel,
			Model:                j.Model,
		})
	}
	return connect.NewResponse(&storyboardpb.ListGenerationJobsResponse{
		Jobs: infos,
	}), nil
}

// executeGenerationJob is the JobExecutor callback used by the queue.
// It reuses the existing GeneratePanelImage logic.
func (s *StoryboardService) executeGenerationJob(ctx context.Context, job *GenerationJob) error {
	filePath := job.filePath
	if filePath == "" {
		filePath = s.storyboardPath
	}

	// Style setup
	var stylePrefix, styleSuffix, style string
	if job.panelData != nil && strings.HasPrefix(job.panelData.VisualNote, "CHARACTER_AVATAR:") {
		stylePrefix = "Professional character portrait, headshot, Mai Yoneyama illustrator style, High-End Webtoon Aesthetic, Fine Line Art, Modern Manga Style, clean background. "
		styleSuffix = ". Sharp focus on face and expressive eyes, intricate iris detail, consistent facial features, clean white background, high resolution, 8k."
		style = "character_avatar"
	} else {
		stylePrefix = "Cinematic storyboard thumbnail sketch, rough compositional guide for animators, gestural figures with simplified facial features, focus on camera framing staging and body language, manga panel layout reference. "
		styleSuffix = ". Rough sketch aesthetic with loose confident linework, emphasis on lighting direction and silhouette shapes, atmospheric mood indicators, faces suggested through simple shapes rather than detailed features, director's visual notes style, monochrome with screen tones, cinematic composition."
		style = "cinematic_sketch"
	}
	fullPrompt := stylePrefix + job.Prompt + styleSuffix

	// Create images directory
	workspaceRoot := os.Getenv("WORKSPACE_ROOT")
	if workspaceRoot == "" {
		workspaceRoot = filepath.Dir(filepath.Dir(filepath.Dir(filepath.Dir(filePath))))
	}
	imagesDir := filepath.Join(workspaceRoot, s.projectDir, "resources/images", "episodes", job.EpisodeID, "pages", fmt.Sprintf("%d", job.PageNumber))
	if err := os.MkdirAll(imagesDir, fs.FileMode(0755)); err != nil {
		return fmt.Errorf("failed to create images directory: %w", err)
	}

	// Get panel ID
	panelID, imageVersion, err := s.getOrCreatePanelID(filePath, job.EpisodeID, job.PageNumber, job.Panel)
	if err != nil {
		panelID = fmt.Sprintf("panel_%d_%d_%d", job.PageNumber, job.Panel, time.Now().Unix())
		imageVersion = 1
	}

	filename := fmt.Sprintf("%s_v%d.png", panelID, imageVersion)
	imagePath := filepath.Join(imagesDir, filename)
	urlPath := fmt.Sprintf("/images/episodes/%s/pages/%d/%s", job.EpisodeID, job.PageNumber, filename)

	log.Printf("Job %s: generating image for page %d panel %d", job.ID, job.PageNumber, job.Panel)

	// Pre-update storyboard
	s.preUpdateStoryboard(filePath, job.EpisodeID, job.PageNumber, job.Panel, urlPath, fullPrompt)

	// Generate
	useLocal := job.Model == "local" || (job.Model == "" && os.Getenv("USE_LOCAL_IMAGE_GEN") == "true")

	var imageBytes []byte
	if useLocal {
		var charIDs []string
		if job.panelData != nil {
			charIDs = job.panelData.Characters
		}
		imageBytes, err = s.callLocalImageGen(ctx, job.Prompt, style, imagePath, charIDs...)
		if err != nil {
			return fmt.Errorf("failed to generate image locally: %w", err)
		}
	} else {
		apiKey := os.Getenv("OPENROUTER_API_KEY")
		if apiKey == "" {
			return fmt.Errorf("OPENROUTER_API_KEY is not set")
		}
		imageDataURL, err := s.callOpenRouterAPI(ctx, apiKey, fullPrompt)
		if err != nil {
			return fmt.Errorf("failed to generate image: %w", err)
		}
		base64Data, err := extractBase64FromDataURL(imageDataURL)
		if err != nil {
			return fmt.Errorf("failed to extract image data: %w", err)
		}
		imageBytes, err = base64.StdEncoding.DecodeString(base64Data)
		if err != nil {
			return fmt.Errorf("failed to decode image: %w", err)
		}
	}

	// Write image
	if err := os.WriteFile(imagePath, imageBytes, fs.FileMode(0644)); err != nil {
		return fmt.Errorf("failed to write image file: %w", err)
	}
	log.Printf("Job %s: saved image to %s", job.ID, imagePath)

	// Character avatar handling
	if job.panelData != nil && strings.HasPrefix(job.panelData.VisualNote, "CHARACTER_AVATAR:") {
		charID := strings.TrimPrefix(job.panelData.VisualNote, "CHARACTER_AVATAR:")
		charAvatarDir := filepath.Join(workspaceRoot, s.projectDir, "resources/characters", charID)
		os.MkdirAll(charAvatarDir, 0755)
		os.WriteFile(filepath.Join(charAvatarDir, "avatar.png"), imageBytes, 0644)
		legacyDir := filepath.Join(workspaceRoot, s.projectDir, "resources/images/characters")
		os.MkdirAll(legacyDir, 0755)
		os.WriteFile(filepath.Join(legacyDir, charID+".png"), imageBytes, 0644)
	}

	// Final storyboard update
	model := defaultModel
	if useLocal {
		model = "animagine-xl-4.0 (local)"
	}
	generatedImage := &storyboardpb.GeneratedImage{
		ImageUrl:    urlPath,
		ImagePrompt: job.Prompt,
		GeneratedAt: time.Now().Unix(),
		Model:       model,
	}
	s.finalUpdateStoryboard(filePath, job.EpisodeID, job.PageNumber, job.Panel, generatedImage)

	// Store image URL in job for broadcast
	s.jobQueue.mu.Lock()
	job.ImageURL = urlPath
	s.jobQueue.mu.Unlock()

	return nil
}

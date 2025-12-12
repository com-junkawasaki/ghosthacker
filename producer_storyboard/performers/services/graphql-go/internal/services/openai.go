package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

// OpenAIService provides access to OpenAI API for image generation
type OpenAIService struct {
	apiKey     string
	httpClient *http.Client
	baseURL    string
}

// ImageGenerationRequest represents a DALL-E image generation request
type ImageGenerationRequest struct {
	Model          string `json:"model"`
	Prompt         string `json:"prompt"`
	N              int    `json:"n"`
	Size           string `json:"size"`
	ResponseFormat string `json:"response_format"`
}

// ImageGenerationResponse represents the response from DALL-E
type ImageGenerationResponse struct {
	Created int64 `json:"created"`
	Data    []struct {
		URL           string `json:"url,omitempty"`
		B64JSON       string `json:"b64_json,omitempty"`
		RevisedPrompt string `json:"revised_prompt,omitempty"`
	} `json:"data"`
}

// GeneratedImageResult represents the result of image generation
type GeneratedImageResult struct {
	ImageData     []byte
	ImageFormat   string
	Prompt        string
	RevisedPrompt string
	Model         string
}

// NewOpenAIService creates a new OpenAI service client
func NewOpenAIService() (*OpenAIService, error) {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("OPENAI_API_KEY environment variable not set")
	}

	return &OpenAIService{
		apiKey:     apiKey,
		httpClient: &http.Client{},
		baseURL:    "https://api.openai.com/v1",
	}, nil
}

// GenerateImage generates an image using DALL-E
func (s *OpenAIService) GenerateImage(ctx context.Context, prompt, model, size string) (*GeneratedImageResult, error) {
	if model == "" {
		model = "dall-e-3"
	}
	if size == "" {
		size = "1024x1024"
	}

	reqBody := ImageGenerationRequest{
		Model:          model,
		Prompt:         prompt,
		N:              1,
		Size:           size,
		ResponseFormat: "b64_json",
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/images/generations", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to generate image: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("OpenAI API error: %s - %s", resp.Status, string(body))
	}

	var genResp ImageGenerationResponse
	if err := json.NewDecoder(resp.Body).Decode(&genResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if len(genResp.Data) == 0 {
		return nil, fmt.Errorf("no image data returned")
	}

	// Decode base64 image data
	imageData, err := base64.StdEncoding.DecodeString(genResp.Data[0].B64JSON)
	if err != nil {
		return nil, fmt.Errorf("failed to decode image data: %w", err)
	}

	return &GeneratedImageResult{
		ImageData:     imageData,
		ImageFormat:   "png",
		Prompt:        prompt,
		RevisedPrompt: genResp.Data[0].RevisedPrompt,
		Model:         model,
	}, nil
}

package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

// SunoService provides access to Suno AI music generation API
type SunoService struct {
	apiKey     string
	httpClient *http.Client
	baseURL    string
}

// SunoGenerateRequest represents a music generation request
type SunoGenerateRequest struct {
	Prompt string `json:"prompt"`
	Model  string `json:"model,omitempty"`
}

// SunoGenerateResponse represents the response from Suno API
type SunoGenerateResponse struct {
	TaskID string `json:"task_id"`
	Status string `json:"status"`
}

// SunoTaskStatusResponse represents the status of a generation task
type SunoTaskStatusResponse struct {
	TaskID   string  `json:"task_id"`
	Status   string  `json:"status"`
	AudioURL *string `json:"audio_url,omitempty"`
	Error    *string `json:"error,omitempty"`
}

// SunoMusicResult represents the result of music generation
type SunoMusicResult struct {
	TaskID   string
	Status   string
	AudioURL *string
	Error    *string
}

// NewSunoService creates a new Suno service client
func NewSunoService() (*SunoService, error) {
	apiKey := os.Getenv("SUNO_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("SUNO_API_KEY environment variable not set")
	}

	baseURL := os.Getenv("SUNO_API_URL")
	if baseURL == "" {
		baseURL = "https://api.suno.ai/v1"
	}

	return &SunoService{
		apiKey:     apiKey,
		httpClient: &http.Client{},
		baseURL:    baseURL,
	}, nil
}

// GenerateMusic starts a music generation task
func (s *SunoService) GenerateMusic(ctx context.Context, prompt string) (*SunoMusicResult, error) {
	reqBody := SunoGenerateRequest{
		Prompt: prompt,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/generate", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to generate music: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusAccepted {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Suno API error: %s - %s", resp.Status, string(body))
	}

	var genResp SunoGenerateResponse
	if err := json.NewDecoder(resp.Body).Decode(&genResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &SunoMusicResult{
		TaskID: genResp.TaskID,
		Status: genResp.Status,
	}, nil
}

// GetTaskStatus checks the status of a music generation task
func (s *SunoService) GetTaskStatus(ctx context.Context, taskID string) (*SunoMusicResult, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", s.baseURL+"/tasks/"+taskID, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get task status: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Suno API error: %s - %s", resp.Status, string(body))
	}

	var statusResp SunoTaskStatusResponse
	if err := json.NewDecoder(resp.Body).Decode(&statusResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &SunoMusicResult{
		TaskID:   statusResp.TaskID,
		Status:   statusResp.Status,
		AudioURL: statusResp.AudioURL,
		Error:    statusResp.Error,
	}, nil
}

// DownloadAudio downloads the generated audio file
func (s *SunoService) DownloadAudio(ctx context.Context, audioURL string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", audioURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to download audio: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to download audio: %s", resp.Status)
	}

	return io.ReadAll(resp.Body)
}

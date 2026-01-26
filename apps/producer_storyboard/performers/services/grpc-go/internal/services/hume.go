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

// HumeService provides access to Hume AI voice synthesis API
type HumeService struct {
	apiKey     string
	httpClient *http.Client
	baseURL    string
}

// HumeVoice represents a voice from Hume AI
type HumeVoice struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	Language    *string `json:"language,omitempty"`
}

// HumeTTSRequest represents a text-to-speech request
type HumeTTSRequest struct {
	Text    string `json:"text"`
	VoiceID string `json:"voice_id"`
}

// HumeTTSResponse represents the response from TTS API
type HumeTTSResponse struct {
	AudioData []byte  `json:"audio_data"`
	Duration  float64 `json:"duration"`
}

// NewHumeService creates a new Hume service client
func NewHumeService() (*HumeService, error) {
	apiKey := os.Getenv("HUME_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("HUME_API_KEY environment variable not set")
	}

	return &HumeService{
		apiKey:     apiKey,
		httpClient: &http.Client{},
		baseURL:    "https://api.hume.ai/v0",
	}, nil
}

// ListVoices retrieves available voices from Hume AI
func (s *HumeService) ListVoices(ctx context.Context) ([]HumeVoice, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", s.baseURL+"/evi/voices", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-Hume-Api-Key", s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to list voices: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("hume API error: %s - %s", resp.Status, string(body))
	}

	var voices []HumeVoice
	if err := json.NewDecoder(resp.Body).Decode(&voices); err != nil {
		return nil, fmt.Errorf("failed to decode voices: %w", err)
	}

	return voices, nil
}

// GenerateSpeech generates audio from text using Hume AI
func (s *HumeService) GenerateSpeech(ctx context.Context, text, voiceID string) (*HumeTTSResponse, error) {
	reqBody := HumeTTSRequest{
		Text:    text,
		VoiceID: voiceID,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/evi/tts", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-Hume-Api-Key", s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to generate speech: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("hume TTS API error: %s - %s", resp.Status, string(body))
	}

	audioData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read audio data: %w", err)
	}

	return &HumeTTSResponse{
		AudioData: audioData,
		Duration:  0, // Duration would need to be calculated from audio
	}, nil
}

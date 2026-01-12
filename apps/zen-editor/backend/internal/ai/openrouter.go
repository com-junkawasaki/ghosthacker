package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

type OpenRouterClient struct {
	ApiKey string
	Model  string
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Model     string    `json:"model"`
	Messages  []Message `json:"messages"`
	MaxTokens int       `json:"max_tokens,omitempty"`
}

type ChatResponse struct {
	Choices []struct {
		Message Message `json:"message"`
	} `json:"choices"`
}

func NewOpenRouterClient() *OpenRouterClient {
	return &OpenRouterClient{
		ApiKey: "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",
		Model:  "anthropic/claude-3.5-sonnet", // Use a powerful model for story gen
	}
}

func (c *OpenRouterClient) GenerateNextScene(ctx context.Context, contextTexts []string) (string, error) {
	combinedContext := ""
	for i, text := range contextTexts {
		combinedContext += fmt.Sprintf("--- Context Node %d ---\n%s\n\n", i+1, text)
	}

	prompt := fmt.Sprintf(`Based on the following context from the "Ghost Hacker" series, generate a new story scene.
The scene should maintain the first-person, present-tense, conversational style (Wattpad style).
Theme: Healing connections in 2065 Tokyo.

CONTEXT:
%s

Generate only the markdown content for the new scene.`, combinedContext)
	
	reqBody, _ := json.Marshal(ChatRequest{
		Model: c.Model,
		Messages: []Message{
			{Role: "system", Content: "You are a specialized creative writer for the Ghost Hacker series."},
			{Role: "user", Content: prompt},
		},
		MaxTokens: 8192, // Claude 3.5 Sonnet supports up to 8k output tokens. Context is 200k.
	})
	log.Printf("Sending request to OpenRouter: %s", string(reqBody))

	req, _ := http.NewRequestWithContext(ctx, "POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(reqBody))
	req.Header.Set("Authorization", "Bearer "+c.ApiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("OpenRouter Request failed: %v", err)
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		log.Printf("OpenRouter error response: %s", string(body))
		return "", fmt.Errorf("OpenRouter API error: %s (status %d)", string(body), resp.StatusCode)
	}

	var chatResp ChatResponse
	if err := json.Unmarshal(body, &chatResp); err != nil {
		log.Printf("Failed to decode OpenRouter response: %v", err)
		return "", err
	}

	if len(chatResp.Choices) > 0 {
		return chatResp.Choices[0].Message.Content, nil
	}

	log.Printf("OpenRouter returned no choices. Full response: %s", string(body))
	return "", fmt.Errorf("no response from OpenRouter")
}


package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
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
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

type ChatResponse struct {
	Choices []struct {
		Message Message `json:"message"`
	} `json:"choices"`
}

func NewOpenRouterClient() *OpenRouterClient {
	return &OpenRouterClient{
		ApiKey: os.Getenv("OPENROUTER_API_KEY"),
		Model:  "openai/gpt-4o-mini", // Default lightweight model for extraction
	}
}

func (c *OpenRouterClient) ExtractEntities(ctx context.Context, text string) (string, error) {
	prompt := fmt.Sprintf("Extract entities (characters, locations, key terms) from the following text and return as a story graph JSON-LD structure:\n\n%s", text)
	
	reqBody, _ := json.Marshal(ChatRequest{
		Model: c.Model,
		Messages: []Message{
			{Role: "system", Content: "You are a specialized story analyst for the Ghost Hacker series."},
			{Role: "user", Content: prompt},
		},
	})

	req, _ := http.NewRequestWithContext(ctx, "POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(reqBody))
	req.Header.Set("Authorization", "Bearer "+c.ApiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var chatResp ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return "", err
	}

	if len(chatResp.Choices) > 0 {
		return chatResp.Choices[0].Message.Content, nil
	}

	return "", fmt.Errorf("no response from AI")
}


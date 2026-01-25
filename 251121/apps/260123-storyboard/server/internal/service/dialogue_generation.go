package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strings"
	"time"

	"connectrpc.com/connect"
	storyboardpb "storyboard-editor/backend/proto"
)

const (
	openRouterTextModelDefault = "openai/gpt-4o-mini"
)

type openRouterTextResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

type generateDialogueJSON struct {
	Dialogue []struct {
		Speaker       string `json:"speaker"`
		Text          string `json:"text"`
		Delivery      string `json:"delivery,omitempty"`
		Subtext       string `json:"subtext,omitempty"`
		Emotion       string `json:"emotion,omitempty"`
		PauseBeforeMs int32  `json:"pauseBeforeMs,omitempty"`
		PauseAfterMs  int32  `json:"pauseAfterMs,omitempty"`
	} `json:"dialogue"`
}

// GenerateDialogue generates dialogue lines for the specified panel using OpenRouter text models.
// It is designed to avoid "unknown facts": it only provides prior context up to the requested panel.
func (s *StoryboardService) GenerateDialogue(
	ctx context.Context,
	req *connect.Request[storyboardpb.GenerateDialogueRequest],
) (*connect.Response[storyboardpb.GenerateDialogueResponse], error) {
	filePath := req.Msg.FilePath
	if filePath == "" {
		filePath = s.storyboardPath
	}
	if req.Msg.EpisodeId == "" || req.Msg.PageNumber <= 0 || req.Msg.Panel <= 0 {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("episode_id, page_number, panel are required"))
	}

	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		return nil, connect.NewError(connect.CodeFailedPrecondition, fmt.Errorf("OPENROUTER_API_KEY is not set"))
	}

	storyboard, err := s.validateAndLoad(filePath)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid storyboard: %w", err))
	}

	// Build a strict context window: only panels up to (page, panel-1) and previous pages.
	contextBlock, allowedSpeakers := s.buildDialogueContext(storyboard, req.Msg.EpisodeId, req.Msg.PageNumber, req.Msg.Panel, 14)

	// Build character voice guide from storyboard gh:characters for the characters in this panel.
	charVoice := s.buildCharacterVoiceGuide(storyboard, req.Msg.PanelData.GetCharacters())

	maxLines := req.Msg.MaxLines
	if maxLines <= 0 {
		// Heuristic: prefer short, drama-like exchanges; default up to existing line count, else 2-4.
		if req.Msg.PanelData != nil && len(req.Msg.PanelData.Dialogue) > 0 {
			maxLines = int32(len(req.Msg.PanelData.Dialogue))
		} else {
			maxLines = 3
		}
	}
	if maxLines > 8 {
		maxLines = 8
	}

	style := strings.TrimSpace(req.Msg.Style)
	if style == "" {
		style = "cinematic drama, Japanese, short lines, natural teen speech"
	}

	systemPrompt := strings.TrimSpace(`
You are a professional screenplay dialogue writer and dialogue coach.
Return JSON only. No markdown. No extra commentary.
You must NOT introduce any new facts, new characters, new organizations, or new plot events that are not present in the provided context.
If unsure, keep it vague and emotionally grounded instead of inventing details.
`)

	userPrompt := s.buildDialogueUserPrompt(style, maxLines, req.Msg.StrictKnownFacts, allowedSpeakers, charVoice, contextBlock, req.Msg.PanelData)

	model := strings.TrimSpace(os.Getenv("OPENROUTER_TEXT_MODEL"))
	if model == "" {
		model = openRouterTextModelDefault
	}

	content, err := s.callOpenRouterText(ctx, apiKey, model, systemPrompt, userPrompt)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("openrouter call failed: %w", err))
	}

	parsed, err := parseDialogueJSON(content)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to parse generated JSON: %w", err))
	}

	out := make([]*storyboardpb.Dialogue, 0, len(parsed.Dialogue))
	for _, d := range parsed.Dialogue {
		speaker := strings.TrimSpace(d.Speaker)
		text := strings.TrimSpace(d.Text)
		if speaker == "" || text == "" {
			continue
		}
		// Strict speaker allow-list (best-effort). If empty allow-list, skip this check.
		if req.Msg.StrictKnownFacts && len(allowedSpeakers) > 0 {
			if _, ok := allowedSpeakers[speaker]; !ok {
				continue
			}
		}
		out = append(out, &storyboardpb.Dialogue{
			Speaker:       speaker,
			Text:          text,
			Delivery:      strings.TrimSpace(d.Delivery),
			Subtext:       strings.TrimSpace(d.Subtext),
			Emotion:       strings.TrimSpace(d.Emotion),
			PauseBeforeMs: d.PauseBeforeMs,
			PauseAfterMs:  d.PauseAfterMs,
		})
	}

	if len(out) == 0 {
		return connect.NewResponse(&storyboardpb.GenerateDialogueResponse{
			Success: false,
			Message: "No valid dialogue was generated (filtered by constraints). Try relaxing strict_known_facts or adding speaker hints.",
			Model:   model,
		}), nil
	}

	return connect.NewResponse(&storyboardpb.GenerateDialogueResponse{
		Success:  true,
		Message:  "Dialogue generated successfully",
		Dialogue: out,
		Model:    model,
	}), nil
}

func (s *StoryboardService) callOpenRouterText(ctx context.Context, apiKey, model, systemPrompt, userPrompt string) (string, error) {
	requestBody := map[string]interface{}{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userPrompt},
		},
		"temperature": 0.7,
		"stream":      false,
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

	client := &http.Client{Timeout: 90 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("failed to call OpenRouter API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("OpenRouter API error (%d): %s", resp.StatusCode, string(body))
	}

	var result openRouterTextResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}
	if len(result.Choices) == 0 {
		return "", fmt.Errorf("no choices in response")
	}
	content := strings.TrimSpace(result.Choices[0].Message.Content)
	if content == "" {
		return "", fmt.Errorf("empty content in response")
	}
	return content, nil
}

func parseDialogueJSON(raw string) (*generateDialogueJSON, error) {
	// Try direct parse first.
	var parsed generateDialogueJSON
	if err := json.Unmarshal([]byte(raw), &parsed); err == nil {
		return &parsed, nil
	}
	// Fallback: extract first JSON object.
	re := regexp.MustCompile(`(?s)\{.*\}`)
	m := re.FindString(raw)
	if m == "" {
		return nil, fmt.Errorf("no JSON object found in model output")
	}
	if err := json.Unmarshal([]byte(m), &parsed); err != nil {
		return nil, err
	}
	return &parsed, nil
}

func (s *StoryboardService) buildDialogueUserPrompt(
	style string,
	maxLines int32,
	strict bool,
	allowedSpeakers map[string]struct{},
	charVoice string,
	contextBlock string,
	panelData *storyboardpb.PanelData,
) string {
	allowed := make([]string, 0, len(allowedSpeakers))
	for k := range allowedSpeakers {
		allowed = append(allowed, k)
	}
	sort.Strings(allowed)

	seedDialogue := ""
	if panelData != nil && len(panelData.Dialogue) > 0 {
		lines := make([]string, 0, len(panelData.Dialogue))
		for _, d := range panelData.Dialogue {
			if strings.TrimSpace(d.Speaker) == "" && strings.TrimSpace(d.Text) == "" {
				continue
			}
			lines = append(lines, fmt.Sprintf("%s: %s", d.Speaker, d.Text))
		}
		if len(lines) > 0 {
			seedDialogue = strings.Join(lines, "\n")
		}
	}

	strictLine := "OFF"
	if strict {
		strictLine = "ON"
	}

	return strings.TrimSpace(fmt.Sprintf(`
## Task
Generate panel dialogue in Japanese.

## Style
%s

## Constraints (VERY IMPORTANT)
- StrictKnownFacts: %s
- Use ONLY these speaker names (no new speakers): %s
- Keep it short and performable. Natural teen speech. No exposition dump.
- Do NOT add new events, new backstory, new named entities, new organizations, new tech not mentioned in context.
- If you need to reference something, reference only what is already in the context.
- Output JSON ONLY with this schema:
{
  "dialogue": [
    {
      "speaker": "string",
      "text": "string",
      "delivery": "string (optional actor direction)",
      "subtext": "string (optional)",
      "emotion": "string (optional label)",
      "pauseBeforeMs": 0,
      "pauseAfterMs": 0
    }
  ]
}

## Panel data (current)
- Characters: %v
- Environment: %s
- Shot: %s
- VisualNote: %s
- CameraDirection: %s
- SeedDialogue (if any):
%s

## Character voice (use as hard constraints)
%s

## Known context up to this panel (do NOT exceed this)
%s
`, style, strictLine, strings.Join(allowed, ", "), panelData.GetCharacters(), panelData.GetEnvironment(), panelData.GetShot(), panelData.GetVisualNote(), panelData.GetCameraDirection(), seedDialogue, charVoice, contextBlock))
}

func (s *StoryboardService) buildDialogueContext(storyboard map[string]interface{}, episodeID string, pageNumber, panel int32, maxPanels int) (string, map[string]struct{}) {
	allowedSpeakers := map[string]struct{}{}

	episode := findEpisode(storyboard, episodeID)
	if episode == nil {
		return "(episode not found)", allowedSpeakers
	}

	pages, _ := episode["gh:pages"].([]interface{})
	type ctxItem struct {
		Page  int32
		Panel int32
		Text  string
	}
	items := make([]ctxItem, 0, 64)

	for _, pg := range pages {
		pageMap, ok := pg.(map[string]interface{})
		if !ok {
			continue
		}
		pn, _ := pageMap["gh:pageNumber"].(float64)
		pn32 := int32(pn)
		if pn32 > pageNumber {
			continue
		}
		panels, _ := pageMap["gh:panels"].([]interface{})
		for _, p := range panels {
			panelMap, ok := p.(map[string]interface{})
			if !ok {
				continue
			}
			pidx, _ := panelMap["panel"].(float64)
			pidx32 := int32(pidx)
			if pn32 == pageNumber && pidx32 >= panel {
				continue // only prior panels
			}

			visual, _ := panelMap["visual"].(string)
			if visual != "" {
				items = append(items, ctxItem{Page: pn32, Panel: pidx32, Text: "VISUAL: " + visual})
			}

			if ds, ok := panelMap["dialogue"].([]interface{}); ok {
				for _, di := range ds {
					dm, ok := di.(map[string]interface{})
					if !ok {
						continue
					}
					speaker, _ := dm["speaker"].(string)
					text, _ := dm["text"].(string)
					if strings.TrimSpace(speaker) != "" {
						allowedSpeakers[speaker] = struct{}{}
					}
					if strings.TrimSpace(text) != "" {
						items = append(items, ctxItem{Page: pn32, Panel: pidx32, Text: fmt.Sprintf("%s: %s", speaker, text)})
					}
				}
			}
		}
	}

	// If we didn't capture speakers from prior panels, allow speakers from panel characters (by id).
	if len(allowedSpeakers) == 0 {
		allowedSpeakers["Narration"] = struct{}{}
	}

	if len(items) > maxPanels {
		items = items[len(items)-maxPanels:]
	}

	lines := make([]string, 0, len(items)+4)
	for _, it := range items {
		lines = append(lines, fmt.Sprintf("P%d-%d %s", it.Page, it.Panel, it.Text))
	}

	return strings.Join(lines, "\n"), allowedSpeakers
}

func (s *StoryboardService) buildCharacterVoiceGuide(storyboard map[string]interface{}, characterIDs []string) string {
	if len(characterIDs) == 0 {
		return "(no character IDs provided)"
	}
	chars, _ := storyboard["gh:characters"].([]interface{})
	if len(chars) == 0 {
		return "(no gh:characters in storyboard)"
	}

	want := map[string]struct{}{}
	for _, id := range characterIDs {
		want[id] = struct{}{}
	}

	blocks := make([]string, 0, len(characterIDs))
	for _, c := range chars {
		cm, ok := c.(map[string]interface{})
		if !ok {
			continue
		}
		id, _ := cm["@id"].(string)
		if _, ok := want[id]; !ok {
			continue
		}
		name, _ := cm["schema:name"].(string)
		desc, _ := cm["dct:description"].(string)
		voice := ""
		if v, ok := cm["gh:voice"]; ok {
			b, _ := json.Marshal(v)
			voice = string(b)
		}
		line := fmt.Sprintf("- %s (%s)\n  desc: %s", name, id, desc)
		if voice != "" {
			line += "\n  voice: " + voice
		}
		blocks = append(blocks, line)
	}
	if len(blocks) == 0 {
		return "(no matching character voice entries found)"
	}
	return strings.Join(blocks, "\n")
}

func findEpisode(storyboard map[string]interface{}, episodeID string) map[string]interface{} {
	eps, _ := storyboard["gh:episodes"].([]interface{})
	for _, e := range eps {
		ep, ok := e.(map[string]interface{})
		if !ok {
			continue
		}
		if ep["gh:episodeId"] == episodeID {
			return ep
		}
	}
	return nil
}


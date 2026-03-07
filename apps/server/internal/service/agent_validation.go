package service

import (
	"fmt"
	"strings"
	"unicode/utf8"

	"storyboard-editor/backend/internal/jsonld"
)

// ValidationResult represents the findings of an agent output validation
type ValidationResult struct {
	Valid   bool
	Errors  []string
	Metrics map[string]interface{}
}

// ValidateEpisodeStructure performs a lightweight validation based on SHACL principles
func ValidateEpisodeStructure(episode map[string]interface{}) ValidationResult {
	result := ValidationResult{Valid: true, Metrics: make(map[string]interface{})}

	// 1. Word Count (Reading Units) check
	// ja: 600-1500, others: 800-1500
	text := extractAllText(episode)
	ru := calculateReadingUnits(text)
	result.Metrics["readingUnits"] = ru

	lang, _ := episode["gh:language"].(string)
	if lang == "ja" {
		if ru < 600 || ru > 1500 {
			result.Valid = false
			result.Errors = append(result.Errors, fmt.Sprintf("Word count (%d RU) is outside the allowed range for Japanese (600-1500)", ru))
		}
	} else {
		if ru < 800 || ru > 1500 {
			result.Valid = false
			result.Errors = append(result.Errors, fmt.Sprintf("Word count (%d RU) is outside the allowed range (800-1500)", ru))
		}
	}

	// 2. Dialogue Ratio check (Target: 50-75%)
	dialogueCount := countDialogueLines(episode)
	totalPanels := countTotalPanels(episode)
	if totalPanels > 0 {
		ratio := float64(dialogueCount) / float64(totalPanels) // Simplified ratio
		result.Metrics["dialogueRatio"] = ratio
		// Note: Actual SHACL uses character count ratio, this is a proxy
	}

	// 3. Beat Check
	beats, ok := episode["gh:beats"].([]interface{})
	if !ok || len(beats) == 0 {
		result.Valid = false
		result.Errors = append(result.Errors, "Episode must have at least one plot beat (gh:beats)")
	}

	return result
}

// calculateReadingUnits: CJK approx 2 chars = 1 unit, non-CJK space separated
func calculateReadingUnits(text string) int {
	if text == "" {
		return 0
	}
	
	// Simplified RU calculation
	cjkCount := 0
	nonCjkWords := 0
	
	for _, r := range text {
		if isCJK(r) {
			cjkCount++
		}
	}
	
	// Remove CJK and count remaining words
	remaining := text
	// This is a rough estimation
	words := strings.Fields(remaining)
	for _, w := range words {
		hasCjk := false
		for _, r := range w {
			if isCJK(r) {
				hasCjk = true
				break
			}
		}
		if !hasCjk {
			nonCjkWords++
		}
	}

	return (cjkCount / 2) + nonCjkWords
}

func isCJK(r rune) bool {
	return (r >= 0x4E00 && r <= 0x9FFF) || // Kanji
		(r >= 0x3040 && r <= 0x309F) || // Hiragana
		(r >= 0x30A0 && r <= 0x30FF)    // Katakana
}

func extractAllText(episode map[string]interface{}) string {
	var sb strings.Builder
	ep := jsonld.Wrap(episode)
	for _, page := range ep.Slice("gh:pages") {
		for _, panel := range page.Slice("gh:panels") {
			if visual, ok := panel.Str("gh:visual", "visual"); ok {
				sb.WriteString(visual + " ")
			}
			for _, d := range panel.Slice("gh:dialogue", "dialogue") {
				if text, ok := d.Str("en", "text"); ok {
					sb.WriteString(text + " ")
				}
			}
		}
	}
	return sb.String()
}

func countDialogueLines(episode map[string]interface{}) int {
	count := 0
	ep := jsonld.Wrap(episode)
	for _, page := range ep.Slice("gh:pages") {
		for _, panel := range page.Slice("gh:panels") {
			count += len(panel.Slice("gh:dialogue", "dialogue"))
		}
	}
	return count
}

func countTotalPanels(episode map[string]interface{}) int {
	count := 0
	ep := jsonld.Wrap(episode)
	for _, page := range ep.Slice("gh:pages") {
		count += len(page.Slice("gh:panels"))
	}
	return count
}

// ValidatePanelConstraints checks constraints for a single panel
func ValidatePanelConstraints(panel map[string]interface{}) []string {
	var errors []string
	n := jsonld.Wrap(panel)

	// 1. Visual note presence
	visual, _ := n.Str("gh:visual", "visual")
	if strings.TrimSpace(visual) == "" {
		errors = append(errors, "Panel must have a visual description (visual)")
	}

	// 2. Character presence
	chars := n.StringSlice("gh:characters", "characters")
	if len(chars) == 0 {
		// Not strictly an error but often a warning
	}

	// 3. Dialogue length check
	for _, d := range n.Slice("gh:dialogue", "dialogue") {
		text, _ := d.Str("en", "text")
		if utf8.RuneCountInString(text) > 200 {
			errors = append(errors, "Dialogue line is too long (>200 chars)")
		}
	}

	return errors
}

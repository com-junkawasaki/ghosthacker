package service

import (
	"fmt"
	"strings"
	"unicode/utf8"
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
	pages, _ := episode["gh:pages"].([]interface{})
	for _, pg := range pages {
		page, _ := pg.(map[string]interface{})
		panels, _ := page["gh:panels"].([]interface{})
		for _, p := range panels {
			panel, _ := p.(map[string]interface{})
			if visual, ok := panel["visual"].(string); ok {
				sb.WriteString(visual + " ")
			}
			if dialogues, ok := panel["dialogue"].([]interface{}); ok {
				for _, d := range dialogues {
					dm, _ := d.(map[string]interface{})
					if text, ok := dm["text"].(string); ok {
						sb.WriteString(text + " ")
					}
				}
			}
		}
	}
	return sb.String()
}

func countDialogueLines(episode map[string]interface{}) int {
	count := 0
	pages, _ := episode["gh:pages"].([]interface{})
	for _, pg := range pages {
		page, _ := pg.(map[string]interface{})
		panels, _ := page["gh:panels"].([]interface{})
		for _, p := range panels {
			panel, _ := p.(map[string]interface{})
			if dialogues, ok := panel["dialogue"].([]interface{}); ok {
				count += len(dialogues)
			}
		}
	}
	return count
}

func countTotalPanels(episode map[string]interface{}) int {
	count := 0
	pages, _ := episode["gh:pages"].([]interface{})
	for _, pg := range pages {
		page, _ := pg.(map[string]interface{})
		panels, _ := page["gh:panels"].([]interface{})
		count += len(panels)
	}
	return count
}

// ValidatePanelConstraints checks constraints for a single panel
func ValidatePanelConstraints(panel map[string]interface{}) []string {
	var errors []string
	
	// 1. Visual note presence
	visual, _ := panel["visual"].(string)
	if strings.TrimSpace(visual) == "" {
		errors = append(errors, "Panel must have a visual description (visual)")
	}

	// 2. Character presence
	chars, _ := panel["characters"].([]interface{})
	if len(chars) == 0 {
		// Not strictly an error but often a warning
	}

	// 3. Dialogue length check
	if dialogues, ok := panel["dialogue"].([]interface{}); ok {
		for _, d := range dialogues {
			dm, _ := d.(map[string]interface{})
			text, _ := dm["text"].(string)
			if utf8.RuneCountInString(text) > 200 {
				errors = append(errors, "Dialogue line is too long (>200 chars)")
			}
		}
	}

	return errors
}

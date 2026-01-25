package service

import (
	"fmt"
	"strings"
)

// AgentScope defines the allowed JSON paths for each agent mode
var AgentScope = map[string][]string{
	"scenario": {
		"/gh:episodes",
		"/gh:beats",
		"/dct:title",
		"/dct:description",
	},
	"episode": {
		"/gh:pages",
		"/gh:panels",
		"/gh:sceneDescription",
	},
	"character": {
		"/dialogue",
		"/characters",
	},
	"cinematic": {
		"/visual",
		"/gh:cameraDirection",
		"/gh:runwayPrompt",
		"/shot",
	},
	"dialogue": {
		"/dialogue",
	},
}

// ValidatePatchScope checks if a patch is within the agent's responsibility
func ValidatePatchScope(agentMode string, path string) error {
	allowedPaths, ok := AgentScope[agentMode]
	if !ok {
		return fmt.Errorf("unknown agent mode: %s", agentMode)
	}

	// General mode has no restrictions for now (or we can define a limited set)
	if agentMode == "general" {
		return nil
	}

	for _, allowed := range allowedPaths {
		// Check if the patch path starts with an allowed path
		// e.g., "/gh:episodes/0/gh:beats/1" starts with "/gh:episodes"
		if strings.HasPrefix(path, allowed) {
			return nil
		}
	}

	return fmt.Errorf("agent %s is not authorized to modify path: %s", agentMode, path)
}

// FilterPatchesByScope removes patches that are outside the agent's responsibility
func FilterPatchesByScope(agentMode string, patches []struct {
	Op    string `json:"op"`
	Path  string `json:"path"`
	Value string `json:"value"`
}) ([]struct {
	Op    string `json:"op"`
	Path  string `json:"path"`
	Value string `json:"value"`
}, []string) {
	var filtered []struct {
		Op    string `json:"op"`
		Path  string `json:"path"`
		Value string `json:"value"`
	}
	var violations []string

	for _, p := range patches {
		if err := ValidatePatchScope(agentMode, p.Path); err != nil {
			violations = append(violations, err.Error())
		} else {
			filtered = append(filtered, p)
		}
	}

	return filtered, violations
}

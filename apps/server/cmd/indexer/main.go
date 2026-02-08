package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	gonanoid "github.com/matoous/go-nanoid/v2"
	"storyboard-editor/backend/internal/index"
)

func main() {
	var (
		resourcesDir string
		command      string
		dryRun       bool
	)

	flag.StringVar(&resourcesDir, "dir", "", "Path to resources directory")
	flag.StringVar(&command, "cmd", "index", "Command: index, add-nanoid, list")
	flag.BoolVar(&dryRun, "dry-run", false, "Dry run (don't write files)")
	flag.Parse()

	if resourcesDir == "" {
		// Default to relative path
		resourcesDir = "../resources"
		if _, err := os.Stat(resourcesDir); os.IsNotExist(err) {
			resourcesDir = "resources"
		}
	}

	absDir, err := filepath.Abs(resourcesDir)
	if err != nil {
		log.Fatalf("Failed to resolve path: %v", err)
	}
	resourcesDir = absDir

	switch command {
	case "index":
		runIndex(resourcesDir)
	case "add-nanoid":
		runAddNanoid(resourcesDir, dryRun)
	case "list":
		runList(resourcesDir)
	default:
		log.Fatalf("Unknown command: %s", command)
	}
}

// runIndex builds and saves the index
func runIndex(resourcesDir string) {
	log.Printf("Building index for %s", resourcesDir)

	idx, err := index.NewLiveIndex(resourcesDir)
	if err != nil {
		log.Fatalf("Failed to create index: %v", err)
	}
	defer idx.Stop()

	if err := idx.SaveToFile(); err != nil {
		log.Fatalf("Failed to save index: %v", err)
	}

	log.Printf("Index saved to %s/_index.jsonld", resourcesDir)
	log.Printf("  - %d documents indexed", len(idx.IDToPath))
	log.Printf("  - %d slugs indexed", len(idx.SlugToID))
	log.Printf("  - %d number keys indexed", len(idx.NumberToID))
}

// runAddNanoid adds nanoid to documents that don't have one
func runAddNanoid(resourcesDir string, dryRun bool) {
	log.Printf("Scanning for documents without nanoid in %s", resourcesDir)

	var processed, updated int

	err := filepath.Walk(resourcesDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			return nil
		}
		if filepath.Ext(path) != ".jsonld" {
			return nil
		}
		// Skip special directories
		if strings.Contains(path, "_vectors") || strings.Contains(path, "_index") {
			return nil
		}

		processed++

		data, err := os.ReadFile(path)
		if err != nil {
			log.Printf("Warning: failed to read %s: %v", path, err)
			return nil
		}

		var doc map[string]interface{}
		if err := json.Unmarshal(data, &doc); err != nil {
			log.Printf("Warning: failed to parse %s: %v", path, err)
			return nil
		}

		id, hasID := doc["@id"].(string)
		if !hasID || id == "" {
			return nil
		}

		// Check if ID already has nanoid pattern (contains uppercase and lowercase mix with numbers)
		if isNanoidFormat(id) {
			return nil
		}

		// Generate new nanoid
		nanoid, err := gonanoid.New(21)
		if err != nil {
			log.Printf("Warning: failed to generate nanoid: %v", err)
			return nil
		}

		// Extract prefix from current ID
		prefix := extractPrefix(id)
		newID := prefix + ":" + nanoid

		// Add gh:slug from current ID
		slug := extractSlug(id)

		log.Printf("  %s", path)
		log.Printf("    old @id: %s", id)
		log.Printf("    new @id: %s", newID)
		log.Printf("    gh:slug: %s", slug)

		if dryRun {
			updated++
			return nil
		}

		// Update document
		doc["@id"] = newID
		if slug != "" {
			doc["gh:slug"] = slug
		}

		// Write back
		newData, err := json.MarshalIndent(doc, "", "  ")
		if err != nil {
			log.Printf("Warning: failed to marshal %s: %v", path, err)
			return nil
		}

		if err := os.WriteFile(path, newData, 0644); err != nil {
			log.Printf("Warning: failed to write %s: %v", path, err)
			return nil
		}

		updated++
		return nil
	})

	if err != nil {
		log.Fatalf("Walk failed: %v", err)
	}

	log.Printf("Processed %d files, updated %d", processed, updated)
	if dryRun {
		log.Printf("(dry-run mode, no files were modified)")
	}
}

// runList lists all indexed documents
func runList(resourcesDir string) {
	idx, err := index.NewLiveIndex(resourcesDir)
	if err != nil {
		log.Fatalf("Failed to create index: %v", err)
	}
	defer idx.Stop()

	fmt.Println("=== Documents by ID ===")
	for id, path := range idx.IDToPath {
		fmt.Printf("  %s\n    → %s\n", id, path)
	}

	fmt.Println("\n=== Slugs ===")
	for slug, id := range idx.SlugToID {
		fmt.Printf("  %s → %s\n", slug, id)
	}

	fmt.Println("\n=== Number Keys ===")
	for key, id := range idx.NumberToID {
		fmt.Printf("  %s → %s\n", key, id)
	}

	fmt.Println("\n=== Statistics ===")
	fmt.Printf("  Total documents: %d\n", len(idx.IDToPath))
	fmt.Printf("  Total slugs: %d\n", len(idx.SlugToID))
	fmt.Printf("  Total number keys: %d\n", len(idx.NumberToID))

	// Count by type
	typeCounts := make(map[string]int)
	for id := range idx.IDToPath {
		parts := strings.SplitN(id, ":", 2)
		if len(parts) > 0 {
			typeCounts[parts[0]]++
		}
	}
	fmt.Println("\n=== By Type ===")
	for t, count := range typeCounts {
		fmt.Printf("  %s: %d\n", t, count)
	}
}

// Helper functions

func isNanoidFormat(id string) bool {
	// Check if the ID part (after prefix:) looks like a nanoid
	parts := strings.SplitN(id, ":", 2)
	if len(parts) != 2 {
		return false
	}
	idPart := parts[1]
	
	// Nanoid typically has 21 characters with mix of a-zA-Z0-9_-
	if len(idPart) == 21 {
		hasLower := false
		hasUpper := false
		hasDigit := false
		for _, c := range idPart {
			if c >= 'a' && c <= 'z' {
				hasLower = true
			} else if c >= 'A' && c <= 'Z' {
				hasUpper = true
			} else if c >= '0' && c <= '9' {
				hasDigit = true
			}
		}
		// If it has good mix, probably a nanoid
		if (hasLower && hasUpper) || (hasLower && hasDigit) || (hasUpper && hasDigit) {
			return true
		}
	}
	return false
}

func extractPrefix(id string) string {
	// character:Nei → character
	// gh:org/Cschool → gh:org
	if strings.HasPrefix(id, "gh:") {
		// Handle gh:org/, gh:env/, etc.
		parts := strings.SplitN(id, "/", 2)
		if len(parts) == 2 {
			return parts[0]
		}
	}
	parts := strings.SplitN(id, ":", 2)
	if len(parts) > 0 {
		return parts[0]
	}
	return "unknown"
}

func extractSlug(id string) string {
	// character:Nei → Nei
	// gh:org/Cschool → Cschool
	// act:1-introduction → 1-introduction
	if strings.HasPrefix(id, "gh:") {
		parts := strings.SplitN(id, "/", 2)
		if len(parts) == 2 {
			return parts[1]
		}
	}
	parts := strings.SplitN(id, ":", 2)
	if len(parts) == 2 {
		return parts[1]
	}
	return ""
}

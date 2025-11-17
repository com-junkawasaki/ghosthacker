/**
 * @context https://gftd.ai/ontology/epub-editor#
 * @type cpm:Activity
 * @id https://gftd.ai/activity/test-graphql-integration
 * 
 * GraphQL API integration tests
 */
package test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"testing"
)

const graphQLURL = "http://localhost:25326/graphql"

// TestGraphQLIntrospection tests GraphQL introspection query
func TestGraphQLIntrospection(t *testing.T) {
	query := map[string]interface{}{
		"query": `
			{
				__schema {
					queryType {
						name
					}
				}
			}
		`,
	}

	body, err := json.Marshal(query)
	if err != nil {
		t.Fatalf("Failed to marshal query: %v", err)
	}

	resp, err := http.Post(graphQLURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response["data"] == nil {
		t.Error("Response data is nil")
	}

	data, ok := response["data"].(map[string]interface{})
	if !ok {
		t.Error("Response data is not a map")
	}

	schema, ok := data["__schema"].(map[string]interface{})
	if !ok {
		t.Error("__schema is not a map")
	}

	queryType, ok := schema["queryType"].(map[string]interface{})
	if !ok {
		t.Error("queryType is not a map")
	}

	name, ok := queryType["name"].(string)
	if !ok || name != "Query" {
		t.Errorf("Expected queryType name to be 'Query', got %v", name)
	}
}

// TestGraphQLEpubList tests epubList query
func TestGraphQLEpubList(t *testing.T) {
	query := map[string]interface{}{
		"query": `
			{
				epubList {
					id
					title
				}
			}
		`,
	}

	body, err := json.Marshal(query)
	if err != nil {
		t.Fatalf("Failed to marshal query: %v", err)
	}

	resp, err := http.Post(graphQLURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	// Check if response has data or errors
	if response["errors"] != nil {
		t.Logf("GraphQL errors: %v", response["errors"])
	}

	if response["data"] == nil {
		t.Error("Response data is nil")
	}
}

// TestGraphQLChapters tests chapters query
func TestGraphQLChapters(t *testing.T) {
	query := map[string]interface{}{
		"query": `
			query GetChapters($epubId: ID!) {
				chapters(epubId: $epubId) {
					id
					title
					order
				}
			}
		`,
		"variables": map[string]interface{}{
			"epubId": "test-epub-id",
		},
	}

	body, err := json.Marshal(query)
	if err != nil {
		t.Fatalf("Failed to marshal query: %v", err)
	}

	resp, err := http.Post(graphQLURL, "application/json", bytes.NewBuffer(body))
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	var response map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	// Check if response has data or errors
	if response["errors"] != nil {
		t.Logf("GraphQL errors: %v", response["errors"])
	}

	if response["data"] == nil {
		t.Error("Response data is nil")
	}
}


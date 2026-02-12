package dapr

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"
)

// StoryboardActorState holds per-project storyboard state
type StoryboardActorState struct {
	ProjectDir     string                 `json:"projectDir"`
	FilePath       string                 `json:"filePath"`
	LastModified   time.Time              `json:"lastModified"`
	ActiveWorkflow string                 `json:"activeWorkflow,omitempty"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
}

// AgentActorState holds per-agent state
type AgentActorState struct {
	AgentMode    string    `json:"agentMode"`
	Model        string    `json:"model"`
	LastCalled   time.Time `json:"lastCalled"`
	CallCount    int       `json:"callCount"`
	LastError    string    `json:"lastError,omitempty"`
	TotalTokens  int       `json:"totalTokens"`
}

// SessionActorState holds chat session state
type SessionActorState struct {
	SessionID  string           `json:"sessionId"`
	ProjectDir string           `json:"projectDir"`
	History    []SessionMessage `json:"history"`
	CreatedAt  time.Time        `json:"createdAt"`
	UpdatedAt  time.Time        `json:"updatedAt"`
}

// SessionMessage represents a single chat message in session history
type SessionMessage struct {
	Role      string `json:"role"`
	AgentMode string `json:"agentMode"`
	Content   string `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

// ActorStore provides in-process actor state management (no Dapr sidecar needed for slim mode)
type ActorStore struct {
	mu           sync.RWMutex
	storyboards  map[string]*StoryboardActorState
	agents       map[string]*AgentActorState
	sessions     map[string]*SessionActorState
}

// NewActorStore creates a new in-process actor store
func NewActorStore() *ActorStore {
	return &ActorStore{
		storyboards: make(map[string]*StoryboardActorState),
		agents:      make(map[string]*AgentActorState),
		sessions:    make(map[string]*SessionActorState),
	}
}

// Global actor store instance
var globalActorStore *ActorStore
var actorStoreOnce sync.Once

// GetActorStore returns the singleton actor store
func GetActorStore() *ActorStore {
	actorStoreOnce.Do(func() {
		globalActorStore = NewActorStore()
	})
	return globalActorStore
}

// --- Storyboard Actor ---

// GetStoryboard retrieves or creates a storyboard actor state
func (s *ActorStore) GetStoryboard(_ context.Context, projectDir string) *StoryboardActorState {
	s.mu.RLock()
	state, ok := s.storyboards[projectDir]
	s.mu.RUnlock()
	if ok {
		return state
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Double-check after acquiring write lock
	if state, ok := s.storyboards[projectDir]; ok {
		return state
	}

	state = &StoryboardActorState{
		ProjectDir: projectDir,
		Metadata:   make(map[string]interface{}),
	}
	s.storyboards[projectDir] = state
	log.Printf("[ActorStore] Created storyboard actor: project=%s", projectDir)
	return state
}

// SetActiveWorkflow sets the active workflow for a project
func (s *ActorStore) SetActiveWorkflow(_ context.Context, projectDir, workflowID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	state, ok := s.storyboards[projectDir]
	if !ok {
		state = &StoryboardActorState{
			ProjectDir: projectDir,
			Metadata:   make(map[string]interface{}),
		}
		s.storyboards[projectDir] = state
	}
	state.ActiveWorkflow = workflowID
	state.LastModified = time.Now()
}

// ClearActiveWorkflow clears the active workflow for a project
func (s *ActorStore) ClearActiveWorkflow(_ context.Context, projectDir string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if state, ok := s.storyboards[projectDir]; ok {
		state.ActiveWorkflow = ""
		state.LastModified = time.Now()
	}
}

// GetActiveWorkflow returns the active workflow ID for a project
func (s *ActorStore) GetActiveWorkflow(_ context.Context, projectDir string) string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if state, ok := s.storyboards[projectDir]; ok {
		return state.ActiveWorkflow
	}
	return ""
}

// --- Agent Actor ---

// RecordAgentCall records an agent invocation
func (s *ActorStore) RecordAgentCall(_ context.Context, agentMode, model string, err error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	state, ok := s.agents[agentMode]
	if !ok {
		state = &AgentActorState{
			AgentMode: agentMode,
			Model:     model,
		}
		s.agents[agentMode] = state
	}

	state.LastCalled = time.Now()
	state.CallCount++
	state.Model = model
	if err != nil {
		state.LastError = err.Error()
	} else {
		state.LastError = ""
	}
}

// GetAgentStats returns stats for an agent
func (s *ActorStore) GetAgentStats(_ context.Context, agentMode string) *AgentActorState {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if state, ok := s.agents[agentMode]; ok {
		return state
	}
	return nil
}

// GetAllAgentStats returns stats for all agents
func (s *ActorStore) GetAllAgentStats(_ context.Context) map[string]*AgentActorState {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make(map[string]*AgentActorState, len(s.agents))
	for k, v := range s.agents {
		result[k] = v
	}
	return result
}

// --- Session Actor ---

// GetSession retrieves or creates a session
func (s *ActorStore) GetSession(_ context.Context, sessionID, projectDir string) *SessionActorState {
	s.mu.RLock()
	state, ok := s.sessions[sessionID]
	s.mu.RUnlock()
	if ok {
		return state
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if state, ok := s.sessions[sessionID]; ok {
		return state
	}

	state = &SessionActorState{
		SessionID:  sessionID,
		ProjectDir: projectDir,
		History:    make([]SessionMessage, 0),
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	}
	s.sessions[sessionID] = state
	log.Printf("[ActorStore] Created session actor: id=%s project=%s", sessionID, projectDir)
	return state
}

// AddMessage adds a message to session history
func (s *ActorStore) AddMessage(_ context.Context, sessionID string, msg SessionMessage) {
	s.mu.Lock()
	defer s.mu.Unlock()

	state, ok := s.sessions[sessionID]
	if !ok {
		return
	}

	msg.Timestamp = time.Now()
	state.History = append(state.History, msg)
	state.UpdatedAt = time.Now()

	// Keep last 100 messages per session
	if len(state.History) > 100 {
		state.History = state.History[len(state.History)-100:]
	}
}

// GetHistory returns session message history
func (s *ActorStore) GetHistory(_ context.Context, sessionID string) []SessionMessage {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if state, ok := s.sessions[sessionID]; ok {
		result := make([]SessionMessage, len(state.History))
		copy(result, state.History)
		return result
	}
	return nil
}

// DumpState returns the entire actor store state as JSON (for debugging)
func (s *ActorStore) DumpState() (string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	dump := map[string]interface{}{
		"storyboards": s.storyboards,
		"agents":      s.agents,
		"sessions":    len(s.sessions),
	}

	data, err := json.MarshalIndent(dump, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal actor state: %w", err)
	}
	return string(data), nil
}

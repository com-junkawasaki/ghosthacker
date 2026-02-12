package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	gonanoid "github.com/matoous/go-nanoid/v2"
	storyboardpb "storyboard-editor/backend/proto"
)

// Job statuses
const (
	JobStatusQueued    = "queued"
	JobStatusRunning   = "running"
	JobStatusCompleted = "completed"
	JobStatusFailed    = "failed"
	JobStatusCancelled = "cancelled"
)

// JobProgress tracks generation step progress.
type JobProgress struct {
	CurrentStep       int     `json:"gh:currentStep"`
	TotalSteps        int     `json:"gh:totalSteps"`
	EstimatedRemainMs float64 `json:"gh:estimatedRemainingMs"`
	AvgStepTimeMs     float64 `json:"gh:avgStepTimeMs"`
}

// GenerationJob represents a single image generation job.
type GenerationJob struct {
	ID          string      `json:"@id"`
	Type        string      `json:"@type"`
	Status      string      `json:"gh:status"`
	EpisodeID   string      `json:"gh:episodeId"`
	PageNumber  int32       `json:"gh:pageNumber"`
	Panel       int32       `json:"gh:panel"`
	Model       string      `json:"gh:model"`
	Prompt      string      `json:"gh:prompt"`
	ImageURL    string      `json:"gh:imageUrl,omitempty"`
	Progress    JobProgress `json:"gh:progress"`
	Error       string      `json:"gh:error,omitempty"`
	CreatedAt   time.Time   `json:"gh:createdAt"`
	StartedAt   *time.Time  `json:"gh:startedAt,omitempty"`
	CompletedAt *time.Time  `json:"gh:completedAt,omitempty"`

	// Internal fields (not serialized to JSON-LD)
	cancelFunc context.CancelFunc `json:"-"`
	filePath   string             `json:"-"`
	panelData  *storyboardpb.PanelData `json:"-"`
}

// queueDocument represents the JSON-LD structure persisted to disk.
type queueDocument struct {
	Context       map[string]string `json:"@context"`
	Type          string            `json:"@type"`
	MaxConcurrent int               `json:"gh:maxConcurrent"`
	Jobs          []*GenerationJob  `json:"gh:jobs"`
}

// JobExecutor is the function type that actually runs a generation job.
type JobExecutor func(ctx context.Context, job *GenerationJob) error

// JobQueue manages generation jobs with scheduling, progress tracking, and JSON-LD persistence.
type JobQueue struct {
	mu            sync.RWMutex
	jobs          map[string]*GenerationJob
	pending       []string // ordered job IDs awaiting execution
	maxConcurrent int
	running       int
	resourcesDir  string
	broadcastFn   func(*storyboardpb.StreamUpdatesResponse)
	executor      JobExecutor
	imageGenURL   string
}

// NewJobQueue creates a new job queue.
func NewJobQueue(resourcesDir string, broadcastFn func(*storyboardpb.StreamUpdatesResponse), executor JobExecutor) *JobQueue {
	imageGenURL := os.Getenv("IMAGE_GEN_URL")
	if imageGenURL == "" {
		imageGenURL = "http://localhost:8100"
	}

	q := &JobQueue{
		jobs:          make(map[string]*GenerationJob),
		maxConcurrent: 1,
		resourcesDir:  resourcesDir,
		broadcastFn:   broadcastFn,
		executor:      executor,
		imageGenURL:   imageGenURL,
	}

	q.loadFromDisk()
	return q
}

// EnqueueJob adds a new job to the queue and starts processing if possible.
func (q *JobQueue) EnqueueJob(job *GenerationJob) string {
	q.mu.Lock()

	id, _ := gonanoid.New(12)
	job.ID = "job:" + id
	job.Type = "gh:GenerationJob"
	job.Status = JobStatusQueued
	job.CreatedAt = time.Now()

	q.jobs[job.ID] = job
	q.pending = append(q.pending, job.ID)
	q.mu.Unlock()

	q.broadcastJobUpdate(job)
	q.persistToDisk()
	q.tryProcessNext()

	return job.ID
}

// CancelJob cancels a queued or running job.
func (q *JobQueue) CancelJob(jobID string) error {
	q.mu.Lock()
	job, ok := q.jobs[jobID]
	if !ok {
		q.mu.Unlock()
		return fmt.Errorf("job not found: %s", jobID)
	}

	switch job.Status {
	case JobStatusQueued:
		job.Status = JobStatusCancelled
		now := time.Now()
		job.CompletedAt = &now
		// Remove from pending
		for i, id := range q.pending {
			if id == jobID {
				q.pending = append(q.pending[:i], q.pending[i+1:]...)
				break
			}
		}
		q.mu.Unlock()

	case JobStatusRunning:
		job.Status = JobStatusCancelled
		now := time.Now()
		job.CompletedAt = &now
		if job.cancelFunc != nil {
			job.cancelFunc()
		}
		q.mu.Unlock()
		// Also tell Python service to cancel
		q.cancelImageGen()

	default:
		q.mu.Unlock()
		return fmt.Errorf("job %s is already in terminal state: %s", jobID, job.Status)
	}

	q.broadcastJobUpdate(job)
	q.persistToDisk()
	return nil
}

// GetJob returns a copy of a job's current state.
func (q *JobQueue) GetJob(jobID string) *GenerationJob {
	q.mu.RLock()
	defer q.mu.RUnlock()
	return q.jobs[jobID]
}

// ListJobs returns all jobs ordered by creation time (newest first).
func (q *JobQueue) ListJobs() []*GenerationJob {
	q.mu.RLock()
	defer q.mu.RUnlock()

	result := make([]*GenerationJob, 0, len(q.jobs))
	for _, job := range q.jobs {
		result = append(result, job)
	}
	return result
}

// tryProcessNext picks the next queued job and runs it.
func (q *JobQueue) tryProcessNext() {
	q.mu.Lock()
	if q.running >= q.maxConcurrent || len(q.pending) == 0 {
		q.mu.Unlock()
		return
	}

	jobID := q.pending[0]
	q.pending = q.pending[1:]
	job := q.jobs[jobID]
	job.Status = JobStatusRunning
	now := time.Now()
	job.StartedAt = &now
	q.running++
	q.mu.Unlock()

	q.broadcastJobUpdate(job)
	q.persistToDisk()

	// Run in goroutine
	go func() {
		ctx, cancel := context.WithCancel(context.Background())
		q.mu.Lock()
		job.cancelFunc = cancel
		q.mu.Unlock()

		// Start progress polling
		stopProgress := q.startProgressPolling(job)

		err := q.executor(ctx, job)

		stopProgress()
		cancel()

		q.mu.Lock()
		q.running--
		if job.Status == JobStatusCancelled {
			// Already cancelled, don't overwrite
			q.mu.Unlock()
		} else if err != nil {
			job.Status = JobStatusFailed
			job.Error = err.Error()
			endTime := time.Now()
			job.CompletedAt = &endTime
			q.mu.Unlock()
			q.broadcastJobUpdate(job)
		} else {
			job.Status = JobStatusCompleted
			endTime := time.Now()
			job.CompletedAt = &endTime
			q.mu.Unlock()
			q.broadcastJobUpdate(job)
		}

		q.persistToDisk()
		q.tryProcessNext()
	}()
}

// startProgressPolling polls the Python image-gen /progress endpoint every 2s.
func (q *JobQueue) startProgressPolling(job *GenerationJob) func() {
	done := make(chan struct{})

	go func() {
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-done:
				return
			case <-ticker.C:
				progress, err := q.fetchProgress()
				if err != nil {
					continue
				}
				q.mu.Lock()
				if job.Status == JobStatusRunning {
					job.Progress = progress
				}
				q.mu.Unlock()
				q.broadcastJobUpdate(job)
			}
		}
	}()

	return func() { close(done) }
}

// fetchProgress calls the Python image-gen /progress endpoint.
func (q *JobQueue) fetchProgress() (JobProgress, error) {
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Get(q.imageGenURL + "/progress")
	if err != nil {
		return JobProgress{}, err
	}
	defer resp.Body.Close()

	var result struct {
		Generating         bool    `json:"generating"`
		CurrentStep        int     `json:"current_step"`
		TotalSteps         int     `json:"total_steps"`
		AvgStepTimeMs      float64 `json:"avg_step_time_ms"`
		EstimatedRemainMs  float64 `json:"estimated_remaining_ms"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return JobProgress{}, err
	}

	return JobProgress{
		CurrentStep:       result.CurrentStep,
		TotalSteps:        result.TotalSteps,
		EstimatedRemainMs: result.EstimatedRemainMs,
		AvgStepTimeMs:     result.AvgStepTimeMs,
	}, nil
}

// cancelImageGen sends a cancel request to the Python image-gen service.
func (q *JobQueue) cancelImageGen() {
	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Post(q.imageGenURL+"/cancel", "application/json", nil)
	if err != nil {
		log.Printf("Failed to cancel image gen: %v", err)
		return
	}
	defer resp.Body.Close()
	io.ReadAll(resp.Body)
}

// broadcastJobUpdate sends a job progress/status update to all connected clients.
func (q *JobQueue) broadcastJobUpdate(job *GenerationJob) {
	if q.broadcastFn == nil {
		return
	}

	var updateType string
	switch job.Status {
	case JobStatusQueued, JobStatusRunning:
		updateType = "job_progress"
	case JobStatusCompleted:
		updateType = "job_completed"
	case JobStatusFailed:
		updateType = "job_failed"
	case JobStatusCancelled:
		updateType = "job_cancelled"
	}

	q.broadcastFn(&storyboardpb.StreamUpdatesResponse{
		UpdateType:     updateType,
		EpisodeId:      job.EpisodeID,
		PageNumber:     job.PageNumber,
		Panel:          job.Panel,
		JobId:          job.ID,
		JobStatus:      job.Status,
		JobCurrentStep: int32(job.Progress.CurrentStep),
		JobTotalSteps:  int32(job.Progress.TotalSteps),
		JobEtaMs:       float32(job.Progress.EstimatedRemainMs),
		JobError:       job.Error,
		JobImageUrl:    job.ImageURL,
	})
}

// persistToDisk writes the queue state as a JSON-LD file.
func (q *JobQueue) persistToDisk() {
	q.mu.RLock()
	doc := queueDocument{
		Context: map[string]string{
			"gh": "https://ghosthacker.gftd.ai/ns/",
		},
		Type:          "gh:GenerationQueue",
		MaxConcurrent: q.maxConcurrent,
		Jobs:          make([]*GenerationJob, 0, len(q.jobs)),
	}
	for _, job := range q.jobs {
		doc.Jobs = append(doc.Jobs, job)
	}
	q.mu.RUnlock()

	data, err := json.MarshalIndent(doc, "", "  ")
	if err != nil {
		log.Printf("Failed to marshal job queue: %v", err)
		return
	}

	dir := filepath.Join(q.resourcesDir, "jobs")
	os.MkdirAll(dir, fs.FileMode(0755))
	path := filepath.Join(dir, "queue.jsonld")
	if err := os.WriteFile(path, data, fs.FileMode(0644)); err != nil {
		log.Printf("Failed to persist job queue: %v", err)
	}
}

// loadFromDisk loads persisted queue state and re-queues interrupted jobs.
func (q *JobQueue) loadFromDisk() {
	path := filepath.Join(q.resourcesDir, "jobs", "queue.jsonld")
	data, err := os.ReadFile(path)
	if err != nil {
		return // No persisted state
	}

	var doc queueDocument
	if err := json.Unmarshal(data, &doc); err != nil {
		log.Printf("Failed to parse persisted job queue: %v", err)
		return
	}

	for _, job := range doc.Jobs {
		// Re-queue jobs that were running when server stopped
		if job.Status == JobStatusRunning {
			job.Status = JobStatusQueued
			job.StartedAt = nil
			job.Progress = JobProgress{}
			q.pending = append(q.pending, job.ID)
		}
		q.jobs[job.ID] = job
	}

	if len(q.pending) > 0 {
		log.Printf("Loaded %d interrupted jobs from disk, re-queuing", len(q.pending))
	}
}

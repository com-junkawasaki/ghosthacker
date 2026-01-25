package temporal

import (
	"os"

	"go.temporal.io/sdk/client"
)

const (
	// TaskQueue is the task queue for storyboard production workflows
	TaskQueue = "storyboard-production"
)

// NewClient creates a new Temporal client
func NewClient() (client.Client, error) {
	temporalAddress := os.Getenv("TEMPORAL_ADDRESS")
	if temporalAddress == "" {
		temporalAddress = "localhost:7233"
	}

	return client.Dial(client.Options{
		HostPort: temporalAddress,
	})
}

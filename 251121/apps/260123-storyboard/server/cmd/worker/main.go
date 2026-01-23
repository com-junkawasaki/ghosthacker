//go:generate buf generate

package main

import (
	"log"
	"os"

	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"

	"storyboard-editor/backend/internal/temporal"
)

func main() {
	temporalAddress := os.Getenv("TEMPORAL_ADDRESS")
	if temporalAddress == "" {
		temporalAddress = "localhost:7233"
	}

	c, err := client.Dial(client.Options{
		HostPort: temporalAddress,
	})
	if err != nil {
		log.Fatalln("Unable to create Temporal client", err)
	}
	defer c.Close()

	w := worker.New(c, "storyboard-task-queue", worker.Options{})

	// Register workflows and activities
	w.RegisterWorkflow(temporal.StoryboardUpdateWorkflow)
	w.RegisterActivity(temporal.SaveStoryboardActivity)

	err = w.Run(worker.InterruptCh())
	if err != nil {
		log.Fatalln("Unable to start worker", err)
	}
}

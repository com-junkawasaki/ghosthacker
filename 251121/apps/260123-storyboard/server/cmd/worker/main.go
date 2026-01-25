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
	temporalAddress := os.Getenv("TEMPORAL_HOST")
	if temporalAddress == "" {
		temporalAddress = os.Getenv("TEMPORAL_ADDRESS")
	}
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
	w.RegisterWorkflow(temporal.AutonomousGenerationWorkflow)
	w.RegisterWorkflow(temporal.ScenarioGenerationWorkflow)
	w.RegisterWorkflow(temporal.EpisodeGenerationWorkflow)
	w.RegisterWorkflow(temporal.CharacterRefinementWorkflow)
	w.RegisterWorkflow(temporal.CinematicSketchWorkflow)
	w.RegisterWorkflow(temporal.ReviewerAgentWorkflow)
	w.RegisterWorkflow(temporal.EvaluationAgentWorkflow)
	w.RegisterWorkflow(temporal.EpisodeMasterWorkflow)

	w.RegisterActivity(temporal.SaveStoryboardActivity)
	w.RegisterActivity(temporal.ScenarioAgentActivity)
	w.RegisterActivity(temporal.EpisodeAgentActivity)
	w.RegisterActivity(temporal.CharacterAgentActivity)
	w.RegisterActivity(temporal.CinematicAgentActivity)
	w.RegisterActivity(temporal.ReviewerAgentActivity)
	w.RegisterActivity(temporal.EvaluationAgentActivity)
	w.RegisterActivity(temporal.BroadcastAgentMessageActivity)
	w.RegisterActivity(temporal.VisionAnalysisActivity)

	err = w.Run(worker.InterruptCh())
	if err != nil {
		log.Fatalln("Unable to start worker", err)
	}
}

package main

import (
	"log"

	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
)

func main() {
	c, err := client.Dial(client.Options{})
	if err != nil {
		log.Fatalln("Unable to create client", err)
	}
	defer c.Close()

	w := worker.New(c, "zen-editor-tasks", worker.Options{})

	// Register workflows and activities
	// w.RegisterWorkflow(workflows.StoryGraphWorkflow)
	// w.RegisterActivity(activities.ExtractEntitiesActivity)

	err = w.Run(worker.InterruptCh())
	if err != nil {
		log.Fatalln("Unable to start worker", err)
	}
}


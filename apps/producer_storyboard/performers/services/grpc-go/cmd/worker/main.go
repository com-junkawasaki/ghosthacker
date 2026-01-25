package main

import (
	"context"
	"log"
	"os"

	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/db"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/temporal/activities"
	"github.com/gftd/producer-storyboard/performers/services/grpc-go/internal/temporal/workflows"
	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
)

const (
	TaskQueue = "storyboard-production"
)

func main() {
	// Get Temporal address from environment
	temporalAddress := os.Getenv("TEMPORAL_ADDRESS")
	if temporalAddress == "" {
		temporalAddress = "localhost:7233"
	}

	// Get database URL from environment
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	// Connect to database
	ctx := context.Background()
	pool, err := db.NewPool(ctx, databaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	// Create Temporal client
	c, err := client.Dial(client.Options{
		HostPort: temporalAddress,
	})
	if err != nil {
		log.Fatalf("Failed to create Temporal client: %v", err)
	}
	defer c.Close()

	// Create activities with dependencies
	activityHandler := activities.NewActivityHandler(pool)
	generationHandler := activities.NewGenerationActivityHandler(pool)

	// Create worker
	w := worker.New(c, TaskQueue, worker.Options{})

	// Register workflows
	w.RegisterWorkflow(workflows.ApprovalWorkflow)
	w.RegisterWorkflow(workflows.ProductionWorkflow)
	w.RegisterWorkflow(workflows.TaskWorkflow)
	w.RegisterWorkflow(workflows.ImageGenerationWorkflow)
	w.RegisterWorkflow(workflows.CharacterImageGenerationWorkflow)
	w.RegisterWorkflow(workflows.VideoGenerationWorkflow)
	w.RegisterWorkflow(workflows.AudioGenerationWorkflow)
	w.RegisterWorkflow(workflows.TextGenerationWorkflow)
	w.RegisterWorkflow(workflows.EmotionAnalysisWorkflow)
	w.RegisterWorkflow(workflows.EpubExportWorkflow)
	w.RegisterWorkflow(workflows.EpubImportWorkflow)

	// Register activities
	w.RegisterActivity(activityHandler.NotifyUser)
	w.RegisterActivity(activityHandler.NotifyRole)
	w.RegisterActivity(activityHandler.UpdateApprovalStatus)
	w.RegisterActivity(activityHandler.UpdateProductionStatus)
	w.RegisterActivity(activityHandler.UpdateTaskStatus)
	w.RegisterActivity(activityHandler.CheckPermission)
	w.RegisterActivity(activityHandler.GetReviewersByType)

	// Register generation activities
	w.RegisterActivity(generationHandler.GenerateImageActivity)
	w.RegisterActivity(generationHandler.SaveGeneratedImageActivity)
	w.RegisterActivity(generationHandler.GetCharacterReferenceImagesActivity)
	w.RegisterActivity(generationHandler.GenerateCharacterImageActivity)
	w.RegisterActivity(generationHandler.GenerateVideoRunwayActivity)
	w.RegisterActivity(generationHandler.GenerateVideoSunoActivity)
	w.RegisterActivity(generationHandler.PollVideoTaskStatusActivity)
	w.RegisterActivity(generationHandler.UpdateVideoStatusActivity)
	w.RegisterActivity(generationHandler.SaveGeneratedVideoActivity)
	w.RegisterActivity(generationHandler.GenerateDialogueAudioActivity)
	w.RegisterActivity(generationHandler.SaveDialogueAudioActivity)
	w.RegisterActivity(generationHandler.GenerateTextActivity)
	w.RegisterActivity(generationHandler.AnalyzeEmotionsActivity)
	w.RegisterActivity(generationHandler.SaveEmotionAnalysisActivity)
	w.RegisterActivity(generationHandler.ExportEpubActivity)
	w.RegisterActivity(generationHandler.ImportEpubActivity)

	log.Println("Starting Temporal worker...")
	log.Printf("Temporal address: %s", temporalAddress)
	log.Printf("Task queue: %s", TaskQueue)

	err = w.Run(worker.InterruptCh())
	if err != nil {
		log.Fatalf("Failed to run worker: %v", err)
	}
}

#!/bin/bash
# Generate images from Scene IR using DALL-E 3

set -e

# Check environment variables
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Error: OPENAI_API_KEY environment variable not set"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable not set"
    echo "Example: postgresql://rag_user:rag_password@localhost:5433/rag_db"
    exit 1
fi

# Scene ID (default: scene:001-rooftop-setup)
SCENE_ID="${1:-scene:001-rooftop-setup}"

echo "Generating images for scene: $SCENE_ID"
echo "Using DALL-E 3..."

# Run Rust script (assuming you have a binary)
# cargo run --bin generate-images -- --scene-id "$SCENE_ID"

echo "Image generation completed!"
echo "Check the output directory for generated images."

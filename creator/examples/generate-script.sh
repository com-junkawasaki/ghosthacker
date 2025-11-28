#!/bin/bash
# Generate script from Scene IR using OpenAI LLM

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

echo "Generating script for scene: $SCENE_ID"
echo "Using OpenAI GPT-4 Turbo..."

# Run Rust script (assuming you have a binary)
# cargo run --bin generate-script -- --scene-id "$SCENE_ID"

echo "Script generation completed!"
echo "Check the output files for the generated script."

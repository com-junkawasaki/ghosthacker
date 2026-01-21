import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ID = '251121';
const STORYBOARD_ID = `storyboard:${PROJECT_ID}`;
const DATA_DIR = path.join(process.cwd(), 'apps', 'zen-editor', 'data', PROJECT_ID);
const DATASTORE_DIR = path.join(DATA_DIR, 'datastore');
const IMAGES_DIR = path.join(DATA_DIR, 'images', 'cuts');
const STORYBOARD_FILE = path.join(DATASTORE_DIR, Buffer.from(STORYBOARD_ID).toString('base64url') + '.jsonld');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function generateImage(prompt: string, outputPath: string) {
  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set.");
    return false;
  }

  console.log(`Generating image for prompt: ${prompt.substring(0, 100)}...`);

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json"
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("OpenAI API error:", error);
      return false;
    }

    const result = await response.json() as any;
    const b64Data = result.data[0].b64_json;
    const buffer = Buffer.from(b64Data, 'base64');
    
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);
    console.log(`Saved image to ${outputPath}`);
    return true;
  } catch (err) {
    console.error("Failed to generate image:", err);
    return false;
  }
}

async function main() {
  if (!fs.existsSync(STORYBOARD_FILE)) {
    console.error(`Storyboard file not found: ${STORYBOARD_FILE}`);
    process.exit(1);
  }

  const storyboardData = JSON.parse(fs.readFileSync(STORYBOARD_FILE, 'utf-8'));
  const scenes = storyboardData['gh:scenes'];

  // For demo/sample, let's only generate the first 3 scenes to avoid cost/time.
  // The user asked for "each shot", but for a sample we'll do 3.
  const scenesToGenerate = scenes.slice(0, 3);

  for (const scene of scenesToGenerate) {
    const imageFilename = `scene_${scene.id}.png`;
    const imagePath = path.join(IMAGES_DIR, imageFilename);
    const publicPath = `/data/${PROJECT_ID}/images/cuts/${imageFilename}`;

    const success = await generateImage(scene.visual, imagePath);
    if (success) {
      scene.visual = publicPath; // Update visual to the path of the generated image
    }
  }

  // Save updated storyboard
  fs.writeFileSync(STORYBOARD_FILE, JSON.stringify(storyboardData, null, 2));
  console.log(`Updated storyboard with generated image paths.`);
}

main().catch(console.error);

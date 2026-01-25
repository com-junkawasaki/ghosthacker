import * as fs from 'fs';
import * as path from 'path';

interface ShotProperties {
  'gh:atmosphere'?: string;
  'gh:composition'?: string;
  'gh:lighting'?: string;
  'gh:distance'?: string;
  'gh:lens'?: string;
  'gh:aperture'?: string;
  'gh:focus'?: string;
  'gh:angle'?: string;
}

interface Panel {
  panel: number;
  shot: string;
  'gh:shotProperties': ShotProperties;
  'gh:runwayPrompt': string;
}

interface Page {
  'gh:pageNumber': number;
  'gh:panels': Panel[];
}

interface Episode {
  'gh:episode': number;
  'dct:title': string;
  'gh:pages': Page[];
}

interface StoryboardJsonLd {
  'gh:episodes': Episode[];
}

interface StoryboardScene {
  id: number;
  visual: string;
  description: string;
  audio: string;
  timing: string;
  fps: number;
  persons: string[];
  places: string[];
  items: string[];
  emotions: string[];
}

const PROJECT_ID = '260125-jump';
const STORYBOARD_ID = `storyboard:${PROJECT_ID}`;
const INPUT_PATH = path.join(process.cwd(), '260125-jump', 'storyboard.jsonld');
const OUTPUT_DIR = path.join(process.cwd(), 'apps', 'zen-editor', 'data', PROJECT_ID, 'datastore');

function idToFilename(id: string): string {
  return Buffer.from(id).toString('base64url') + '.jsonld';
}

function extractEntities(prompt: string) {
  // Simple extraction for demo purposes. 
  // In a real scenario, we might use NLP or check against a list of known characters/places.
  const persons: string[] = [];
  const places: string[] = [];
  
  // Known characters from character_profiles.jsonld (based on previous knowledge)
  const knownCharacters = ['Ren', 'Nei', 'Kaname', 'Takeru', 'Shouta', 'Goro', 'Matsuda', 'Yasumoto'];
  knownCharacters.forEach(char => {
    if (prompt.includes(char)) {
      persons.push(char);
    }
  });

  // Known places
  const knownPlaces = ['Tokyo', 'Office', 'Lab', 'Server Room', 'Cyberspace'];
  knownPlaces.forEach(place => {
    if (prompt.includes(place)) {
      places.push(place);
    }
  });

  return { persons, places };
}

async function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Input file not found: ${INPUT_PATH}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf-8')) as StoryboardJsonLd;
  const scenes: StoryboardScene[] = [];
  let sceneId = 1;

  for (const episode of data['gh:episodes']) {
    for (const page of episode['gh:pages']) {
      for (const panel of page['gh:panels']) {
        const { persons, places } = extractEntities(panel['gh:runwayPrompt']);
        
        scenes.push({
          id: sceneId++,
          visual: panel['gh:runwayPrompt'], // Initially set visual as the prompt
          description: `Episode ${episode['gh:episode']}, Page ${page['gh:pageNumber']}, Panel ${panel.panel}. ${panel.shot}.`,
          audio: "",
          timing: "5s", // Default timing
          fps: 24,
          persons: persons,
          places: places,
          items: [],
          emotions: []
        });
      }
    }
  }

  const storyboardData = {
    "@context": {
      "gh": "https://gftd.ai/ghost-hacker/ontology/",
      "scenes": "gh:scenes"
    },
    "@id": STORYBOARD_ID,
    "@type": "gh:Storyboard",
    "gh:scenes": scenes
  };

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const filename = idToFilename(STORYBOARD_ID);
  const outputPath = path.join(OUTPUT_DIR, filename);

  fs.writeFileSync(outputPath, JSON.stringify(storyboardData, null, 2));
  console.log(`Saved ${scenes.length} scenes to ${outputPath}`);
}

main().catch(console.error);

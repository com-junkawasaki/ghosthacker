import {
  Act,
  Scene,
  Character,
  Location,
  Event,
  Concept,
  Episode,
} from "../ontology/schema";

const GHOntology = "gh:";

interface ParsedEpisodeData {
  episode: Partial<Episode>;
  acts: Partial<Act>[];
  scenes: Partial<Scene>[];
  characters: Partial<Character>[];
  locations: Partial<Location>[];
  events: Partial<Event>[];
  concepts: Partial<Concept>[];
}

function createIRI(type: string, name: string): string {
  const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, "-");
  return `${GHOntology}${type}:${sanitizedName}`;
}

export function parseEpisodeMarkdown(markdown: string): ParsedEpisodeData {
  const data: ParsedEpisodeData = {
    episode: {},
    acts: [],
    scenes: [],
    characters: [],
    locations: [],
    events: [],
    concepts: [],
  };

  const lines = markdown.split("\n");

  let currentAct: Partial<Act> | null = null;
  let currentScene: Partial<Scene> | null = null;
  let sceneContent: string[] = [];

  const episodeTitleMatch = lines[0].match(/### (.*?): (.*)/);
  if (episodeTitleMatch) {
    const name = episodeTitleMatch[1].trim();
    data.episode = {
      "@id": createIRI("Episode", name),
      "@type": `${GHOntology}Episode`,
      name,
      has_act: [],
    };
  }

  const flushScene = () => {
    if (currentScene && currentAct) {
        currentScene.textContent = sceneContent.join('\n').trim();
        
        // --- Entity Extraction (LLM Analyzed) ---
        currentScene.appears_in = [];
        currentScene.mentions = [];
        currentScene.takes_place_in = undefined;
        currentScene.includes_event = [];

        const knownCharacters = ["Tamaki", "Kaede", "Hibiki", "Nee-Chan", "Logos", "Elias", "少年"];
        const knownLocations = ["渋谷の運河", "オフィス", "コンサルティングルーム", "ライブラリ", "アルカディア・モデル"];
        const knownConcepts = ["ゴースト", "スピリット", "生命の樹", "精神汚染", "フォトン", "非分離", "アヤワスカ"];
        const knownEvents = ["データ流出", "精神ダイブ", "「アヤワスカ」を起動", "魂の解放"];

        for (const char of knownCharacters) {
            if (currentScene.textContent.includes(char)) {
                const charId = createIRI("Character", char);
                if (!currentScene.appears_in.some(c => c['@id'] === charId)) {
                    currentScene.appears_in.push({ '@id': charId });
                }
                if (!data.characters.some(c => c['@id'] === charId)) {
                    data.characters.push({ '@id': charId, '@type': `${GHOntology}Character`, name: char });
                }
            }
        }

        for (const loc of knownLocations) {
            if (currentScene.textContent.includes(loc)) {
                const locId = createIRI("Location", loc);
                currentScene.takes_place_in = { '@id': locId }; // Assuming one primary location per scene for simplicity
                if (!data.locations.some(l => l['@id'] === locId)) {
                    data.locations.push({ '@id': locId, '@type': `${GHOntology}Location`, name: loc });
                }
            }
        }
        
        for (const concept of knownConcepts) {
            if (currentScene.textContent.includes(concept)) {
                const conceptId = createIRI("Concept", concept);
                 if (!currentScene.mentions.some(c => c['@id'] === conceptId)) {
                    currentScene.mentions.push({ '@id': conceptId });
                }
                if (!data.concepts.some(c => c['@id'] === conceptId)) {
                    data.concepts.push({ '@id': conceptId, '@type': `${GHOntology}Concept`, name: concept });
                }
            }
        }

        for (const event of knownEvents) {
            if (currentScene.textContent.includes(event)) {
                const eventId = createIRI("Event", event);
                if (!currentScene.includes_event.some(e => e['@id'] === eventId)) {
                    currentScene.includes_event.push({ '@id': eventId });
                }
                if (!data.events.some(e => e['@id'] === eventId)) {
                    data.events.push({ '@id': eventId, '@type': `${GHOntology}Event`, name: event });
                }
            }
        }
        // --- End Entity Extraction ---

        currentAct.has_scene?.push({ '@id': currentScene['@id']! });
        data.scenes.push(currentScene);
    }
    sceneContent = [];
  }

  for (const line of lines) {
    const actMatch = line.match(/#### \*\*(.*?)：(.*?)\*\*/);
    if (actMatch) {
      flushScene();
      currentScene = null;
      
      const name = actMatch[2].trim();
      currentAct = {
        "@id": createIRI("Act", name),
        "@type": `${GHOntology}Act`,
        name,
        has_scene: [],
      };
      data.acts.push(currentAct);
      data.episode.has_act?.push({ '@id': currentAct['@id']! });
      continue;
    }

    if(currentAct && line.trim().length > 0 && !line.startsWith('#')) {
        if(!currentScene) {
            const sceneName = `${currentAct.name}-scene-${(currentAct.has_scene?.length ?? 0) + 1}`;
            currentScene = {
                '@id': createIRI('Scene', sceneName),
                '@type': `${GHOntology}Scene`,
                name: sceneName,
                textContent: ''
            };
        }
        sceneContent.push(line);
    } else if (line.trim().length === 0) {
        if(currentScene) {
            flushScene();
            currentScene = null;
        }
    }
  }
  flushScene(); 

  // This parser now uses a pre-analyzed list of entities based on LLM analysis.
  // For a fully dynamic system, this would be replaced with a live NLP service call.

  return data;
}

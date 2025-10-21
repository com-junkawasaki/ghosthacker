import fs from 'node:fs';
import path from 'node:path';

const GHOSTHACKER_ONTOLOGY_PREFIX = 'gh';
const SCHEMA_ORG_PREFIX = 'schema';

// Helper function to parse sections from markdown content
function parseMarkdownSections(content: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = content.split('\n');
    let currentSection = '';
    
    lines.forEach(line => {
        const sectionMatch = line.match(/^##\s+(.*)/);
        if (sectionMatch) {
            currentSection = sectionMatch[1].trim().toLowerCase();
            sections[currentSection] = '';
        } else if (currentSection && line.trim()) {
            sections[currentSection] += `${line.trim()}\n`;
        }
    });

    return sections;
}

async function main() {
    console.log('Analyzing character files...');

    const charactersDir = path.resolve(process.cwd(), '..', '250806', 'character');
    const outputDir = path.resolve(process.cwd(), 'src', 'ontology');
    const outputPath = path.join(outputDir, 'characters.jsonld');

    const characterDirs = fs.readdirSync(charactersDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    const characterGraph = [];

    for (const charDir of characterDirs) {
        const characterDirPath = path.join(charactersDir, charDir);
        const files = fs.readdirSync(characterDirPath).filter(file => file.endsWith('.md'));

        const characterId = `${GHOSTHACKER_ONTOLOGY_PREFIX}:character-${charDir}`;
        const characterNode: Record<string, any> = {
            '@id': characterId,
            '@type': `${GHOSTHACKER_ONTOLOGY_PREFIX}:Character`,
        };

        for (const mdFile of files) {
            const filePath = path.join(characterDirPath, mdFile);
            const content = fs.readFileSync(filePath, 'utf-8');
            const sections = parseMarkdownSections(content);
            
            if (mdFile.includes('akito.md') || mdFile.includes('character.md')) { // Generic character info
                 const nameMatch = content.match(/^#\s*(.*)/);
                 if(nameMatch) characterNode[`${SCHEMA_ORG_PREFIX}:name`] = nameMatch[1].trim();
                 Object.assign(characterNode, sections);

            } else if (mdFile.includes('ghost.md')) {
                const ghostNameMatch = content.match(/^#\s*Ghost:\s*(.*)/);
                const ghostName = ghostNameMatch ? ghostNameMatch[1].trim() : `ghost-of-${charDir}`;
                characterNode[`${GHOSTHACKER_ONTOLOGY_PREFIX}:has_ghost`] = {
                    '@id': `${GHOSTHACKER_ONTOLOGY_PREFIX}:character-${ghostName.toLowerCase().replace(/\s/g, '-')}`,
                    '@type': `${GHOSTHACKER_ONTOLOGY_PREFIX}:Character`,
                    [`${SCHEMA_ORG_PREFIX}:name`]: ghostName,
                    ...sections,
                };

            } else if (mdFile.includes('portrait.md')) {
                characterNode[`${GHOSTHACKER_ONTOLOGY_PREFIX}:portraitPrompt`] = sections;
            }
        }
        characterGraph.push(characterNode);
    }

    const jsonld = {
        '@context': {
            "gh": "https://ghosthacker.gftd.co.jp/ontology#",
            "schema": "http://schema.org/",
        },
        '@graph': characterGraph,
    };

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(jsonld, null, 2));

    console.log(`Successfully generated characters.jsonld at ${outputPath}`);
}

main();

import { readFile, writeFile } from 'node:fs/promises';

const [, , episodePathArg, outlinePathArg] = process.argv;
const episodePath = episodePathArg || '../../260123-jump/resources/episodes/arc0-1-origin/episode.jsonld';
const outlinePath = outlinePathArg || '../../260123-jump/resources/episodes/arc0-1-origin/story-outline.jsonld';
const revision = process.env.INSERT_REVISION || 'story-outline-v2';

function itemText(item) {
	const type = item['gh:type'] || 'text';
	const speaker = item['gh:speaker'];
	const text = item['gh:text'] || '';
	if (!text) return '';
	if (['dialogue', 'monologue', 'dm'].includes(type)) return speaker ? `${speaker}: ${text}` : text;
	if (type === 'sfx') return `SFX: ${text}`;
	if (type === 'notification') return `通知: ${text}`;
	if (type === 'screen') return `画面: ${text}`;
	if (type === 'telop') return `テロップ: ${text}`;
	if (type === 'title') return `タイトル: ${text}`;
	if (type === 'outro') return `アウトロ: ${text}`;
	return text;
}

function isDialogue(item) {
	return ['dialogue', 'monologue', 'dm'].includes(String(item['gh:type'] || '')) && item['gh:speaker'] && item['gh:text'];
}

function chunkFor(items, index, count) {
	if (!items.length) return [];
	const start = Math.floor(index * items.length / count);
	const end = Math.ceil((index + 1) * items.length / count);
	return items.slice(start, end);
}

function compactPrompt(value) {
	return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 900);
}

function insertPanel(pageNumber, sourcePage, sourcePanels, index, count) {
	const script = sourcePage['gh:script'] || [];
	const lines = chunkFor(script.map(itemText).filter(Boolean), index, count);
	const scriptChunk = chunkFor(script, index, count);
	const fallback = sourcePage['gh:visualNote'] || sourcePage['gh:pageTitle'] || '';
	const visual = (lines.length ? lines : [fallback]).join('\n');
	const dialogue = scriptChunk.filter(isDialogue).map((item) => ({
		speaker: item['gh:speaker'],
		text: item['gh:text'],
		type: item['gh:type']
	}));
	const prompt = compactPrompt(`${sourcePage['gh:pageTitle']}。${visual}`);
	return {
		'@id': `panel:p${pageNumber}n${index + 1}-insert-${revision}`,
		'@type': 'gh:Panel',
		panel: index + 1,
		'gh:panelIndex': index + 1,
		'gh:inserted': true,
		'gh:insertedRevision': revision,
		'gh:insertedSource': 'story-outline.jsonld',
		visual,
		'gh:visual': visual,
		dialogue,
		'gh:dialogue': dialogue.map((d) => ({
			'gh:speaker': d.speaker,
			'gh:text': d.text,
			'gh:type': d.type
		})),
		'gh:imagePrompt': prompt,
		'gh:sdxlPrompt': prompt,
		'gh:generatedImages': [],
		'gh:currentImageIndex': -1
	};
}

const episode = JSON.parse(await readFile(episodePath, 'utf8'));
const outline = JSON.parse(await readFile(outlinePath, 'utf8'));
const outlinePages = new Map((outline['gh:pages'] || []).map((page) => [page['gh:pageNumber'], page]));

let inserted = 0;
for (const page of episode['gh:pages'] || []) {
	const pageNumber = page['gh:pageNumber'];
	const sourcePage = outlinePages.get(pageNumber);
	if (!sourcePage) continue;
	const panels = page['gh:panels'] || [];
	if (!panels.length) continue;

	const originalPanels = panels.filter((panel) => panel['gh:insertedRevision'] !== revision);
	const nextPanels = [];
	for (const [index, panel] of originalPanels.entries()) {
		nextPanels.push(panel);
		nextPanels.push(insertPanel(pageNumber, sourcePage, originalPanels, index, originalPanels.length));
		inserted += 1;
	}
	for (let i = 0; i < nextPanels.length; i += 1) {
		nextPanels[i].panel = i + 1;
		nextPanels[i]['gh:panelIndex'] = i + 1;
	}
	page['gh:panels'] = nextPanels;
	page['gh:panelCount'] = nextPanels.length;
	page['gh:insertedRevision'] = revision;
}

episode['gh:insertedRevision'] = revision;
episode['gh:insertedSource'] = outlinePath;
await writeFile(episodePath, JSON.stringify(episode, null, 2) + '\n');

console.log(`inserted=${inserted}`);

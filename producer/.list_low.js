const fs = require('fs');
const p = '/Users/junkawasaki/jun784/ghosthacker/251022/wattpad/episode-structure.jsonld';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
const g = j['@graph'] || [];
const lows = g.filter((x) => {
  const t = x['@type'];
  if (t !== 'EpisodePart' && t !== 'gh:EpisodePart') return false;
  const lang = x.language || '';
  const wc = Number(x.wordCount || 0);
  return (lang === 'ja' ? wc < 600 : wc < 800);
});
for (const x of lows) {
  const ep = (x.episode && x.episode['@id']) || '';
  const pr = (x.part && x.part['@id']) || '';
  console.log();
}

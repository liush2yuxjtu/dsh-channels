import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

// Observations are search results, never model recommendations or Google ranks.
const [input, competitorsFile, output] = process.argv.slice(2);
if (!input || !competitorsFile || !output) throw new Error('Usage: node scripts/geo-retrieval.mjs observations.json competitors.json output.json');
const raw = await readFile(resolve(input), 'utf8');
const observations = JSON.parse(raw);
const registry = JSON.parse(await readFile(resolve(competitorsFile), 'utf8'));
const products = Array.isArray(registry) ? registry : registry.products || registry.competitors;
if (!Array.isArray(observations) || !Array.isArray(products)) throw new Error('Expected observations array and competitor registry');
const canon = value => {
  const u = new URL(value); return (u.hostname.replace(/^www\./, '') + u.pathname).replace(/\/$/, '').toLowerCase();
};
const rows = [{ id: 'dsh-channels', canonical_url: 'https://github.com/liush2yuxjtu/dsh-channels' }, ...products].map(p => ({
  id: p.id || p.name, urls: [p.canonical_url || p.canonicalUrl || p.url, ...(p.aliases || [])].filter(x => typeof x === 'string' && /^https?:/.test(x)).map(canon),
}));
const seen = new Set();
for (const o of observations) {
  if (!o.promptId || !o.query || !o.provider || !o.checkedAt || !Array.isArray(o.results)) throw new Error('Incomplete observation');
  const key = `${o.provider}:${o.promptId}:${o.sampleId || ''}`;
  if (seen.has(key)) throw new Error('Duplicate observation: ' + key); seen.add(key);
  o.results.forEach(r => canon(r.url));
}
const metrics = rows.map(p => {
  const hits = observations.map(o => {
    const i = o.results.findIndex(r => { const c = canon(r.url); return p.urls.some(u => c === u || c.startsWith(u + '/')); });
    return { promptId: o.promptId, resultPosition: i < 0 ? null : i + 1 };
  });
  return { id: p.id, samples: observations.length, hits: hits.filter(h => h.resultPosition !== null).length,
    exposure: observations.length ? hits.filter(h => h.resultPosition !== null).length / observations.length : null,
    meanReciprocalResultPosition: observations.length ? hits.reduce((n, h) => n + (h.resultPosition ? 1 / h.resultPosition : 0), 0) / observations.length : null, observations: hits };
});
await writeFile(resolve(output), JSON.stringify({ measuredAt: new Date().toISOString(), observationSha256: createHash('sha256').update(raw).digest('hex'),
  scope: 'Observed retrieval only; result position is provider order, not a search-engine rank or recommendation. Missing model answers mean recommendation and citation metrics are unmeasured.',
  recommendationRate: null, supportedCitationRate: null, metrics }, null, 2) + '\n');
console.log(JSON.stringify(metrics.map(({id,hits,samples}) => ({id,hits,samples}))));

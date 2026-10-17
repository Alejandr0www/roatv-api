const router = require('express').Router();
const { json, route } = require('./core');
// Narrow selection of public broadcasters. Only use their HTTPS distribution hosts.
const selection = [
  { id: 'France24.fr', feed: 'Spanish', name: 'France 24 Español', country: 'FR', category: 'Noticias', host: 'live.france24.com' },
  { id: 'DW.de', feed: 'Espanol', name: 'DW Español', country: 'DE', category: 'Noticias', host: 'dwamdstream104.akamaized.net' },
  { id: 'CanalInstitucional.co', name: 'Canal Institucional', country: 'CO', category: 'Actualidad', host: 'streaming.rtvc.gov.co' },
  { id: 'SenalColombia.co', name: 'Señal Colombia', country: 'CO', category: 'Cultura', host: 'streaming.rtvc.gov.co' },
];
let verified = { expires: 0, results: [] };
let pending;
async function channels() {
  if (verified.expires > Date.now()) return verified.results;
  if (pending) return pending;
  pending = (async () => {
    const streams = await json('https://iptv-org.github.io/api/streams.json', {}, 3600000);
    const results = await Promise.all(selection.map(async channel => {
      const stream = streams.find(s => {
        try { return s.channel === channel.id && (!channel.feed || s.feed === channel.feed) && new URL(s.url).hostname === channel.host && s.url.startsWith('https:'); }
        catch { return false; }
      });
      if (!stream) return null;
      try {
        const response = await fetch(stream.url, { signal: AbortSignal.timeout(8000) });
        if (!response.ok || !(await response.text()).trimStart().startsWith('#EXTM3U')) return null;
        return { id: channel.id, name: channel.name, country: channel.country, category: channel.category, url: stream.url, quality: stream.quality, checkedAt: new Date().toISOString() };
      } catch { return null; }
    }));
    verified = { expires: Date.now() + 300000, results: results.filter(Boolean) };
    return verified.results;
  })().finally(() => { pending = undefined; });
  return pending;
}
router.get('/', route(async (req, res) => res.json({ results: await channels(), attribution: 'Directorio IPTV-org. Emisiones de sus respectivos canales.' })));
module.exports = router;

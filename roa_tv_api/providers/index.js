const { fetchStreams } = require('./stremio');
const { normalizeStreams } = require('./normalize');
const { createHash } = require('node:crypto');

async function collect(providers, type, key, fetcher = global.fetch, allowTorrents = false) {
  const results = await Promise.all(providers.map(async p => {
    if (!p.types.includes(type)) return { streams: [], report: { id: p.id, name: p.name, status: 'unsupported', count: 0 } };
    try {
      const items = await fetchStreams(p, type, key, fetcher);
      const streams = normalizeStreams(items, p, allowTorrents);
      return { streams, report: { id: p.id, name: p.name, status: streams.length ? 'ok' : 'empty', count: streams.length, excluded: items.length - streams.length } };
    } catch {
      // Never expose provider URLs, tokens, redirect locations or raw errors.
      return { streams: [], report: { id: p.id, name: p.name, status: 'unavailable', count: 0 } };
    }
  }));
  const seen = new Set();
  const streams = results.flatMap(r => r.streams).filter(s => {
    // Keep distinct subtitle sets even if the same video appears twice.
    const key = JSON.stringify([s.infoHash || s.url, s.fileIndex, s.subtitles]);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a, b) => Number(b.latinoReported) - Number(a.latinoReported));
  return { streams: streams.map(s => {
    const media = s.infoHash || (() => { const u = new URL(s.url); return u.origin + u.pathname; })();
    return { ...s, sourceKey: createHash('sha256').update(JSON.stringify([s.providerId, media, s.infoHash ? null : s.title, s.fileIndex ?? null])).digest('hex') };
  }), providers: results.map(r => r.report) };
}
module.exports = { collect };

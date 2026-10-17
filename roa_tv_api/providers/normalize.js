function normalizeStreams(items, provider = { id: "unknown", name: "Proveedor" }, allowTorrents = false) {
  const seen = new Set();
  return items.flatMap(stream => {
    if (!stream || stream.externalUrl || stream.behaviorHints?.proxyHeaders) return [];
    if (allowTorrents && typeof stream.infoHash === 'string' && /^[a-f0-9]{40}$/i.test(stream.infoHash)) {
      const fileIndex = stream.fileIdx;
      if (fileIndex != null && (!Number.isInteger(fileIndex) || fileIndex < 0 || fileIndex > 100000)) return [];
      const infoHash = stream.infoHash.toLowerCase();
      const key = `${infoHash}:${fileIndex ?? 'auto'}`;
      if (seen.has(key)) return [];
      seen.add(key);
      const title = String(stream.title || stream.name || 'Torrent').slice(0, 500);
      const trackers = (Array.isArray(stream.sources) ? stream.sources : []).flatMap(s => {
        if (typeof s !== 'string' || !s.startsWith('tracker:') || s.length > 2048) return [];
        try {
          const u = new URL(s.slice(8));
          return ['https:', 'http:', 'udp:'].includes(u.protocol) && !u.username && !u.password ? [u.href] : [];
        } catch { return []; }
      }).slice(0, 20);
      return [{ title, url: '', kind: 'torrent', infoHash, fileIndex: fileIndex ?? null, trackers, subtitles: [], latinoReported: /latino|latam/i.test(title), providerId: provider.id, providerName: provider.name, audioStatus: 'unverified', format: 'Torrent · Android' }];
    }
    if (typeof stream.url !== 'string') return [];
    try {
      const url = new URL(stream.url);
      if (url.protocol !== 'https:' || url.username || url.password || seen.has(url.href)) return [];
      seen.add(url.href);
      const title = String(stream.title || stream.name || 'Fuente').slice(0, 500);
      const subtitles = (Array.isArray(stream.subtitles) ? stream.subtitles : []).flatMap(sub => {
        try {
          const link = new URL(sub.url);
          if (link.protocol !== 'https:' || link.username || link.password) return [];
          return [{ url: link.href, lang: String(sub.lang || 'Subtítulos').slice(0, 80) }];
        } catch { return []; }
      }).slice(0, 50);
      return [{ title, url: url.href, latinoReported: /latino|latam/i.test(title), subtitles, providerId: provider.id, providerName: provider.name, audioStatus: "unverified", format: /\.m3u8$/i.test(url.pathname) ? "HLS" : /\.mp4$/i.test(url.pathname) ? "MP4" : "Sin confirmar" }];
    } catch { return []; }
  }).sort((a, b) => Number(b.latinoReported) - Number(a.latinoReported));
}

module.exports = { normalizeStreams };


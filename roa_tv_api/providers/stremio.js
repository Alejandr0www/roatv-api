const { ApiError } = require('../core');

function configuration(env = process.env) {
  let entries = [];
  if (env.STREAM_PROVIDERS?.trim()) {
    try { entries = JSON.parse(env.STREAM_PROVIDERS); }
    catch { throw new ApiError(503, 'STREAM_PROVIDERS debe contener una lista JSON válida.'); }
    if (!Array.isArray(entries) || entries.length > 5) throw new ApiError(503, 'Configura como máximo cinco proveedores.');
  }
  if (entries.some(p => !p || typeof p !== 'object' || Array.isArray(p))) throw new ApiError(503, 'Cada proveedor debe ser un objeto de configuración.');
  if (env.ADDON_LATAM_MANIFEST_URL?.trim() && !entries.some(p => p.id === 'addon-latam')) {
    entries.unshift({ id: 'addon-latam', name: 'Addon Latam', manifestUrl: env.ADDON_LATAM_MANIFEST_URL });
  }
  if (env.TORRENTIO_MANIFEST_URL?.trim() && !entries.some(p => p.id === 'torrentio')) {
    entries.push({ id: 'torrentio', name: 'Torrentio', manifestUrl: env.TORRENTIO_MANIFEST_URL });
  }
  if (env.AIOSTREAMS_MANIFEST_URL?.trim() && !entries.some(p => p.id === 'aiostreams')) {
    entries.push({ id: 'aiostreams', name: 'AIOStreams', manifestUrl: env.AIOSTREAMS_MANIFEST_URL });
  }
  entries = entries.filter(p => p.enabled !== false);
  if (entries.length > 5) throw new ApiError(503, 'Configura como máximo cinco proveedores incluyendo Addon Latam.');
  const ids = new Set(), urls = new Set();
  return entries.map(p => {
    try {
      if (!/^[a-z0-9-]{1,40}$/.test(p.id) || ids.has(p.id)) throw Error();
      if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 60) throw Error();
      const url = new URL(p.manifestUrl);
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !url.pathname.endsWith('/manifest.json')) throw Error();
      // Server-admin configuration only; never accept provider URLs from requests.
      if (url.hostname === 'localhost' || !url.hostname.includes('.') || /^[\d.[\]:]+$/.test(url.hostname) || /\.(local|localhost|internal)$/.test(url.hostname)) throw Error();
      ids.add(p.id);
      if (urls.has(url.href)) return null;
      urls.add(url.href);
      const types = p.types ?? ['movie', 'series'];
      if (!Array.isArray(types) || !types.length || types.some(t => !['movie', 'series'].includes(t))) throw Error();
      return { id: p.id, name: p.name.trim(), manifestUrl: url.href, types };
    } catch { throw new ApiError(503, 'Revisa los identificadores, nombres y URLs HTTPS de STREAM_PROVIDERS.'); }
  }).filter(Boolean);
}

async function fetchStreams(provider, type, key, fetcher = global.fetch) {
  const url = new URL(provider.manifestUrl);
  url.pathname = url.pathname.replace(/manifest\.json$/, `stream/${type}/${key}.json`);
  // No redirects: personal manifest paths must not be forwarded to another host.
  const response = await fetcher(url, { headers: { accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw Error('provider');
  const reader = response.body.getReader();
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2 * 1024 * 1024) throw Error('size');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!Array.isArray(data.streams)) throw Error('schema');
  return data.streams.slice(0, 100);
}

module.exports = { configuration, fetchStreams };

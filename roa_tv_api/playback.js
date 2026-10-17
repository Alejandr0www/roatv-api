const router = require('express').Router();
const { tmdb, integer, mediaType, route } = require('./core');
const { configuration } = require('./providers/stremio');
const { collect } = require('./providers');
const { normalizeStreams } = require('./providers/normalize');

router.get('/providers', route(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ providers: configuration().map(({ id, name, types }) => ({ id, name, types })) });
}));
async function sources(req, res, type, rawId) {
  res.set('Cache-Control', 'no-store');
  type = mediaType(type);
  const id = integer(rawId, undefined, 1, 2147483647);
  const season = type === 'tv' ? integer(req.query.season, 1, 1, 1000) : null;
  const episode = type === 'tv' ? integer(req.query.episode, 1, 1, 10000) : null;
  let providers = configuration();
  if (req.query.provider) providers = providers.filter(p => p.id === req.query.provider);
  if (!providers.length) return res.status(503).json({ message: 'Configura al menos un proveedor de reproducción en el servidor.' });
  const ids = await tmdb(`${type}/${id}/external_ids`);
  if (!/^tt\d+$/.test(ids.imdb_id || '')) return res.json({ streams: [], providers: [], message: 'El título no tiene un identificador compatible con los proveedores.' });
  const key = type === 'tv' ? `${ids.imdb_id}:${season}:${episode}` : ids.imdb_id;
  const data = await collect(providers, type === 'tv' ? 'series' : 'movie', key, global.fetch, req.query.transport === 'android');
  // Empty success and upstream outage are different states for clients.
  if (data.providers.every(p => ['unavailable', 'unsupported'].includes(p.status)) && data.providers.some(p => p.status === 'unavailable')) {
    return res.status(502).json({ ...data, message: 'Los proveedores consultados no respondieron correctamente. Intenta de nuevo.' });
  }
  res.json(data);
}
router.get('/movies/:tmdbId/streams', route((req, res) => sources(req, res, 'movie', req.params.tmdbId)));
router.get('/:type/:id/streams', route((req, res) => sources(req, res, req.params.type, req.params.id)));
module.exports = router;
module.exports.normalizeStreams = normalizeStreams;

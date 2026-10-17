const router = require('express').Router();
const { tmdb, integer, mediaType, region, image, normalize, route } = require('./core');
async function providersFor(type, id, country) {
  const data = await tmdb(`${type}/${id}/watch/providers`);
  return data.results?.[country] || {};
}
router.get('/providers', route(async (req, res) => {
  const data = await tmdb(`watch/providers/${mediaType(req.query.type)}`, { watch_region: region(req.query.region) });
  res.json({ results: (data.results || []).map(p => ({ id: p.provider_id, name: p.provider_name, logo: image(p.logo_path, 'w92') })) });
}));
router.get('/genres', route(async (req, res) => res.json(await tmdb(`genre/${mediaType(req.query.type)}/list`))));
async function catalog(req, res, fixedType) {
  const type = mediaType(fixedType || req.query.type), country = region(req.query.region);
  const page = integer(req.query.page, 1), provider = integer(req.query.provider, undefined, 1, 999999), genre = integer(req.query.genre, undefined, 1, 999999);
  const query = String(req.query.query || '').trim().slice(0, 120);
  const sort = ['popular', 'top_rated', 'trending'].includes(req.query.sort) ? req.query.sort : 'popular';
  const params = { page, include_adult: false };
  let endpoint;
  if (query) { endpoint = `search/${type}`; params.query = query; }
  else if (sort === 'trending') { endpoint = `trending/${type}/week`; }
  else if (provider || genre) {
    endpoint = `discover/${type}`;
    Object.assign(params, { watch_region: country, with_watch_providers: provider, with_watch_monetization_types: provider ? 'flatrate' : undefined,
      with_genres: genre, sort_by: sort === 'top_rated' ? 'vote_average.desc' : 'popularity.desc', 'vote_count.gte': sort === 'top_rated' ? 100 : undefined });
  } else endpoint = sort === 'trending' ? `trending/${type}/week` : `${type}/${sort}`;
  const data = await tmdb(endpoint, params);
  let items = (data.results || []).filter(m => !m.adult);
  if ((query || sort === 'trending') && genre) items = items.filter(m => (m.genre_ids || []).includes(genre));
  if ((query || sort === 'trending') && provider) {
    const matches = [];
    for (let i = 0; i < items.length; i += 4) {
      const batch = await Promise.all(items.slice(i, i + 4).map(async item => {
        const available = await providersFor(type, item.id, country);
        return (available.flatrate || []).some(p => p.provider_id === provider) ? item : null;
      }));
      matches.push(...batch.filter(Boolean));
    }
    items = matches;
  }
  res.json({ page: data.page, totalPages: Math.min(data.total_pages || 0, 500), filteredSearch: Boolean((query || sort === 'trending') && (provider || genre)), results: items.map(m => normalize(m, type)) });
}
router.get('/catalog', route((req, res) => catalog(req, res)));
router.get('/movies', route((req, res) => catalog(req, res, 'movie')));
router.get('/detail/:type/:id', route(async (req, res) => {
  const type = mediaType(req.params.type), id = integer(req.params.id, undefined, 1, 2147483647), country = region(req.query.region);
  const [item, availability] = await Promise.all([tmdb(`${type}/${id}`), providersFor(type, id, country)]);
  res.json({ ...normalize(item, type), genres: item.genres || [], runtime: item.runtime || null,
    providers: (availability.flatrate || []).map(p => ({ id: p.provider_id, name: p.provider_name, logo: image(p.logo_path, 'w92') })), availabilityUrl: availability.link || null,
    seasons: (item.seasons || []).filter(s => s.season_number > 0).map(s => ({ number: s.season_number, name: s.name, count: s.episode_count })) });
}));
router.get('/tv/:id/season/:season', route(async (req, res) => {
  const id = integer(req.params.id, undefined, 1, 2147483647), season = integer(req.params.season, undefined, 0, 1000);
  const data = await tmdb(`tv/${id}/season/${season}`);
  res.json({ episodes: (data.episodes || []).map(e => ({ number: e.episode_number, title: e.name, overview: e.overview || '', airDate: e.air_date, image: image(e.still_path) })) });
}));
module.exports = router;

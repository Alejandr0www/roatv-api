const cache = new Map();
class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
async function json(url, headers = {}, ttl = 0) {
  const key = String(url), entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.data;
  let response;
  try { response = await fetch(url, { headers: { accept: 'application/json', ...headers }, signal: AbortSignal.timeout(15000) }); }
  catch { throw new ApiError(502, 'No se pudo conectar con el servicio. Intenta nuevamente.'); }
  if (!response.ok) throw new ApiError(502, `El servicio respondió con estado ${response.status}.`);
  let data;
  try { data = await response.json(); } catch { throw new ApiError(502, 'El servicio devolvió una respuesta inesperada.'); }
  if (ttl) {
    if (cache.size >= 500) cache.delete(cache.keys().next().value);
    cache.set(key, { data, expires: Date.now() + ttl });
  }
  return data;
}
async function tmdb(path, params = {}) {
  const token = process.env.TMDB_TOKEN?.trim();
  if (!token) throw new ApiError(503, 'Falta configurar TMDB_TOKEN en el servidor.');
  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  url.searchParams.set('language', 'es-MX');
  for (const [key, value] of Object.entries(params)) if (value !== '' && value != null) url.searchParams.set(key, String(value));
  return json(url, { Authorization: `Bearer ${token}` }, 300000);
}
function integer(value, fallback, min = 1, max = 500) {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new ApiError(400, 'Parámetro numérico no válido.');
  return n;
}
function mediaType(value = 'movie') {
  if (!['movie', 'tv'].includes(value)) throw new ApiError(400, 'Tipo de contenido no válido.');
  return value;
}
function region(value = 'CO') {
  if (!/^[A-Z]{2}$/.test(value)) throw new ApiError(400, 'País no válido.');
  return value;
}
function image(path, size = 'w500') { return path ? `https://image.tmdb.org/t/p/${size}${path}` : null; }
function normalize(item, type) {
  return { id: item.id, tmdbId: item.id, type, title: item.title || item.name || 'Sin título', overview: item.overview || '',
    releaseDate: item.release_date || item.first_air_date || '', posterUrl: image(item.poster_path), backdropUrl: image(item.backdrop_path, 'w1280'), rating: item.vote_average || 0, genreIds: item.genre_ids || [] };
}
const route = fn => async (req, res, next) => { try { await fn(req, res); } catch (error) { next(error); } };
module.exports = { ApiError, json, tmdb, integer, mediaType, region, image, normalize, route };

const express = require('express');
const cors = require('cors');
function createApp() {
  const app = express();
  app.disable('x-powered-by');
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5000,http://127.0.0.1:5000').split(',').map(s => s.trim());
  app.use(cors({ origin: (origin, done) => done(null, !origin || origins.includes(origin)) }));
  app.use(express.json({ limit: '32kb' }));
  app.get('/api/health', (req, res) => {
    let providerCount = 0, playbackConfigurationValid = true;
    try { providerCount = require('./providers/stremio').configuration().length; }
    catch { playbackConfigurationValid = false; }
    res.json({ ok: true, catalogConfigured: Boolean(process.env.TMDB_TOKEN), playbackConfigured: providerCount > 0, providerCount, playbackConfigurationValid });
  });
  app.use('/api/tmdb', require('./tmdb'));
  app.use('/api/playback', require('./playback'));
  app.use('/api/live', require('./live'));
  app.get('/api/contents', async (req, res) => {
    if (process.env.ENABLE_SQL !== 'true') return res.json([]);
    try {
      const { pool } = require('./db');
      if (!pool.connected) await pool.connect();
      const result = await pool.request().query('SELECT CONVERT(VARCHAR(20), Id) AS id, Title AS title, Category AS category, VideoUrl AS videoUrl FROM dbo.Contents ORDER BY Id');
      res.json(result.recordset);
    } catch { res.status(503).json({ message: 'El catálogo personal de SQL no está disponible.' }); }
  });
  app.use((req, res) => res.status(404).json({ message: 'Ruta no encontrada.' }));
  app.use((error, req, res, next) => res.status(error.status || 500).json({ message: error.status ? error.message : 'No se pudo completar la solicitud.' }));
  return app;
}
module.exports = { createApp };

const path = require('node:path');
try { process.loadEnvFile(path.join(__dirname, '.env')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const { createApp } = require('./app');
const port = Number(process.env.PORT || 3000), host = process.env.HOST || '127.0.0.1';
const server = createApp().listen(port, host, error => {
  if (error) { console.error('No se pudo iniciar la API:', error.code); process.exitCode = 1; return; }
  console.log(`RoaTV API disponible en http://${host}:${port}`);
  if (!process.env.TMDB_TOKEN) console.log('Configura TMDB_TOKEN en .env para cargar películas y series.');
});
process.on('SIGINT', () => server.close());
process.on('SIGTERM', () => server.close());

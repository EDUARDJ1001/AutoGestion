require('dotenv').config();

const app = require('./app');
const { pool } = require('./config/db');

const port = Number(process.env.PORT || 4000);

const server = app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});

const shutdown = async (signal) => {
  console.log(`${signal} recibido. Cerrando servidor...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

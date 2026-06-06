require('dotenv').config();

const app = require('./app');
const { pool } = require('./config/db');

const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';

const server = app.listen(port, host, () => {
  console.log(`API escuchando en http://${host}:${port}`);
  console.log(`En red local usa http://IP_DEL_EQUIPO:${port}`);
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

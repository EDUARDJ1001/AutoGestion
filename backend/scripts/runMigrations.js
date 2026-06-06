require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

const migrationsDir = path.resolve(__dirname, '../db/migrations');

const run = async () => {
  if (!fs.existsSync(migrationsDir)) {
    console.log('No hay carpeta de migraciones.');
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (!files.length) {
    console.log('No hay migraciones SQL para aplicar.');
    return;
  }

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`Aplicando migracion: ${file}`);
    await pool.query(sql);
  }

  console.log('Migraciones aplicadas correctamente.');
};

run()
  .catch((error) => {
    console.error('Error aplicando migraciones:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config();

// Habilitar CORS
app.use(cors());
app.use(bodyParser.json());

// Conexión a PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect()
  .then(() => console.log('Conectado a PostgreSQL en la nube'))
  .catch(err => console.error('Error de conexión', err.stack));

// Ruta para verificar huella
app.post('/verify-fingerprint', async (req, res) => {
  const { fingerprintId } = req.body;

  // Verificar el ID de la huella en la base de datos
  const result = await client.query('SELECT * FROM users WHERE fingerprint_id = $1', [fingerprintId]);

  if (result.rows.length > 0) {
    res.json({ message: 'Acceso permitido' });
  } else {
    res.json({ message: 'Acceso denegado' });
  }
});

// Ruta para registrar nuevos usuarios (en caso de que quieras agregar usuarios manualmente)
app.post('/register-user', async (req, res) => {
  const { name, fingerprintId } = req.body;
  try {
    await client.query('INSERT INTO users (name, fingerprint_id) VALUES ($1, $2)', [name, fingerprintId]);
    res.json({ message: 'Usuario registrado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al registrar usuario' });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

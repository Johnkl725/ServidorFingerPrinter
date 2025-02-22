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
  
    // Verificar el ID de la huella en el esquema 'fingerregister'
    const result = await client.query('SELECT * FROM fingerregister.users WHERE fingerprint_id = $1', [fingerprintId]);
  
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
      // Usar el esquema 'fingerregister' para insertar
      await client.query('INSERT INTO fingerregister.users (name, fingerprint_id) VALUES ($1, $2)', [name, fingerprintId]);
      res.json({ message: 'Usuario registrado con éxito' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error al registrar usuario' });
    }
});

app.delete('/delete-fingerprint/:id', async (req, res) => {
  const { id } = req.params;
  try {
      const result = await client.query('DELETE FROM fingerregister.users WHERE fingerprint_id = $1', [id]);

      if (result.rowCount > 0) {
          res.json({ message: `Huella con ID ${id} eliminada con éxito` });
      } else {
          res.status(404).json({ message: 'Huella no encontrada' });
      }
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error al eliminar huella' });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

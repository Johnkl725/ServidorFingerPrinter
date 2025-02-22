const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const { Client } = require("pg");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const port = process.env.PORT || 3000;

// Habilitar CORS y JSON
app.use(cors());
app.use(bodyParser.json());

// Conexión a PostgreSQL
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

client
  .connect()
  .then(() => console.log("Conectado a PostgreSQL en la nube"))
  .catch((err) => console.error("Error de conexión", err.stack));

// Ruta para verificar huella
app.post("/verify-fingerprint", async (req, res) => {
  const { fingerprintId } = req.body;

  try {
    const result = await client.query(
      "SELECT * FROM fingerregister.users WHERE fingerprint_id = $1",
      [fingerprintId]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      io.emit("fingerprint-verified", { message: "Acceso permitido", id: user.id, name: user.name });
      res.json({ message: "Acceso permitido", id: user.id, name: user.name });
    } else {
      io.emit("fingerprint-verified", { message: "Acceso denegado" });
      res.json({ message: "Acceso denegado" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error del servidor" });
  }
});

// Ruta para registrar nuevos usuarios
app.post("/register-user", async (req, res) => {
  const { name, fingerprintId } = req.body;
  try {
    await client.query(
      "INSERT INTO fingerregister.users (name, fingerprint_id) VALUES ($1, $2)",
      [name, fingerprintId]
    );
    res.json({ message: "Usuario registrado con éxito" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al registrar usuario" });
  }
});

// Ruta para eliminar huella
app.delete("/delete-fingerprint/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query("DELETE FROM fingerregister.users WHERE fingerprint_id = $1", [id]);

    if (result.rowCount > 0) {
      res.json({ message: `Huella con ID ${id} eliminada con éxito` });
    } else {
      res.status(404).json({ message: "Huella no encontrada" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al eliminar huella" });
  }
});

// Manejo de WebSockets
io.on("connection", (socket) => {
  console.log("Cliente conectado a WebSockets");

  socket.on("disconnect", () => {
    console.log("Cliente desconectado");
  });
});

// Iniciar el servidor
server.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
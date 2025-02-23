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
  pingInterval: 10000, // Reducido para mantener la conexión viva en Render
  pingTimeout: 60000, // Tiempo de espera para evitar desconexiones
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
      io.emit("fingerprint-verified", { 
        message: "Acceso permitido", 
        id: user.id, 
        name: user.name 
      });
      res.json({ message: "Acceso permitido", id: user.id, name: user.name });
    } else {
      io.emit("fingerprint-verified", { message: "Acceso denegado" });
      res.json({ message: "Acceso denegado" });
    }
  } catch (err) {
    console.error("Error en verify-fingerprint:", err);
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
    console.error("Error en register-user:", err);
    res.status(500).json({ message: "Error al registrar usuario" });
  }
});

// Ruta para eliminar huella
app.delete("/delete-fingerprint/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query(
      "DELETE FROM fingerregister.users WHERE fingerprint_id = $1",
      [id]
    );

    if (result.rowCount > 0) {
      res.json({ message: `Huella con ID ${id} eliminada con éxito` }); // Corrección de sintaxis
    } else {
      res.status(404).json({ message: "Huella no encontrada" });
    }
  } catch (err) {
    console.error("Error en delete-fingerprint:", err);
    res.status(500).json({ message: "Error al eliminar huella" });
  }
});

// Ruta para iniciar el enrolamiento
app.post("/start-enroll", async (req, res) => {
  try {
    console.log("Enviando evento start-enroll al ESP32");
    io.emit("start-enroll"); // Notifica al ESP32 para iniciar el enrolamiento
    res.json({ message: "Esperando huella..." });
  } catch (err) {
    console.error("Error al iniciar enrolamiento:", err);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// Ruta para obtener el próximo ID disponible
app.get("/get-available-id", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT fingerprint_id FROM fingerregister.users ORDER BY fingerprint_id"
    );
    
    const usedIds = result.rows.map(row => row.fingerprint_id);
    let nextId = 1;
    
    while (usedIds.includes(nextId)) {
      nextId++;
    }
    
    res.json({ nextId });
  } catch (err) {
    console.error("Error en get-available-id:", err);
    res.status(500).json({ message: "Error del servidor" });
  }
});

// WebSocket para manejar eventos del ESP32
io.on("connection", (socket) => {
  console.log("Cliente conectado a WebSockets:", socket.id);

  socket.on("connect", () => {
    console.log("Cliente confirmó conexión:", socket.id);
  });

  socket.on("fingerprint-registered", (data) => {
    console.log("Huella registrada desde ESP32:", data);
    io.emit("fingerprint-registered", { 
      message: data.success ? "Huella registrada con éxito" : "Error al registrar",
      id: data.id 
    });
  });

  socket.on("fingerprint-verified", (data) => {
    console.log("Verificación desde ESP32:", data);
    io.emit("fingerprint-verified", { 
      message: data.success ? "Acceso permitido" : "Acceso denegado",
      id: data.success ? data.id : null 
    });
  });

  socket.on("delete-complete", (data) => {
    console.log("Borrado desde ESP32:", data);
    io.emit("delete-complete", { 
      message: data.success ? "Huella eliminada con éxito" : "Error al eliminar",
      id: data.id 
    });
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });

  socket.on("error", (err) => {
    console.error("Error en Socket.IO:", err);
  });
});

// Iniciar el servidor
server.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`);
});
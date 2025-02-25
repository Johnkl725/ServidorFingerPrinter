const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingInterval: 25000,
  pingTimeout: 60000,
});

const port = process.env.PORT || 3000;

// Habilitar CORS y JSON
app.use(cors());
app.use(bodyParser.json());

let esp32Ip = ""; // 📡 Guardar la última IP del ESP32

// 📌 📡 Ruta para obtener la IP del ESP32 (para React)
app.get("/esp32-ip", (req, res) => {
  if (esp32Ip) {
    res.json({ esp32_ip: esp32Ip });
  } else {
    res.status(404).json({ error: "ESP32 no conectado" });
  }
});

// 📡 📌 WebSocket para conectar ESP32 y el frontend
io.on("connection", (socket) => {
  console.log("🔗 Cliente conectado al WebSocket");

  // 📌 Guardar la IP del ESP32 y enviarla al frontend
  socket.on("esp32-ip", (data) => {
    if (data.esp32_ip) {
      console.log("🌐 IP del ESP32 recibida:", data.esp32_ip);
      esp32Ip = data.esp32_ip; // Guardar la IP
      io.emit("esp32-ip", { esp32_ip: esp32Ip }); // Enviar la IP a todos los clientes
    }
  });

  // 📡 📌 Redirigir eventos del frontend al ESP32
  socket.on("start-verify", () => {
    console.log("📤 Enviando 'start-verify' al ESP32...");
    io.emit("start-verify");
  });

  socket.on("start-enroll", (data) => {
    if (data && data.id) {
      console.log(`📤 Enviando 'enroll_id_${data.id}' al ESP32`);
      io.emit(`enroll_id_${data.id}`);
    } else {
      console.log("⚠️ Error: No se recibió un ID válido para enrolamiento.");
    }
  });

  socket.on("delete-fingerprint", (data) => {
    if (data && data.id) {
      console.log(`🗑 Enviando 'delete_id_${data.id}' al ESP32`);
      io.emit(`delete_id_${data.id}`);
    } else {
      console.log("⚠️ Error: No se recibió un ID válido para eliminar.");
    }
  });

  // 📌 Respuestas del ESP32 al frontend
  socket.on("fingerprint-verified", (data) => {
    console.log("📥 Respuesta de verificación:", data);
    io.emit("fingerprint-verified", data);
  });

  socket.on("fingerprint-registered", (data) => {
    console.log("📥 Respuesta de registro:", data);
    io.emit("fingerprint-registered", data);
  });

  socket.on("fingerprint-deleted", (data) => {
    console.log("📥 Respuesta de eliminación:", data);
    io.emit("fingerprint-deleted", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectado");
  });
});

// Iniciar el servidor
server.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});

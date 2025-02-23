#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_Fingerprint.h>

// 15 16 17 18

// 📌 Credenciales Wi-Fi (reemplaza con tus datos)
const char* ssid = "ALDANA_5G";
const char* password = "42123520";

// 📌 Servidor HTTP en Render (reemplaza con tu URL)
const char* serverUrl = "https://servidorfingerprinter.onrender.com";

// 📌 Configuración del sensor de huellas
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&Serial2);

void setup() {
    Serial.begin(9600);
    Serial2.begin(57600, SERIAL_8N1, 23, 22);
    while (!Serial);  // Espera a que el serial esté listo
    delay(100);
    Serial.println("\n\nSistema de Huellas Digitales");

    // Conexión Wi-Fi
    Serial.print("Conectando a Wi-Fi...");
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.print(".");
    }
    Serial.println("\n✅ Conectado a Wi-Fi");

    // Verificar sensor de huellas
    if (finger.verifyPassword()) {
        Serial.println("✅ Sensor de huellas detectado!");
        // Mostrar parámetros del sensor (opcional)
        Serial.println(F("Leyendo parámetros del sensor"));
        finger.getParameters();
        Serial.print(F("Status: 0x")); Serial.println(finger.status_reg, HEX);
        Serial.print(F("Sys ID: 0x")); Serial.println(finger.system_id, HEX);
        Serial.print(F("Capacity: ")); Serial.println(finger.capacity);
        Serial.print(F("Security level: ")); Serial.println(finger.security_level);
        Serial.print(F("Device address: ")); Serial.println(finger.device_addr, HEX);
        Serial.print(F("Packet len: ")); Serial.println(finger.packet_len);
        Serial.print(F("Baud rate: ")); Serial.println(finger.baud_rate);
    } else {
        Serial.println("❌ Error: No se detectó el sensor de huellas.");
        while (1);
    }
}

void loop() {
    Serial.println("\nIngrese un comando: 'e' para enrolar, 'v' para verificar, 'b' para borrar");
    while (!Serial.available());  // Espera un comando del usuario
    char comando = Serial.read();
    Serial.print("Comando recibido: ");
    Serial.println(comando);

    switch (comando) {
        case 'e':
            enrollFingerprint();
            break;
        case 'v':
            verifyFingerprint();
            break;
        case 'b':
            deleteFingerprint();
            break;
        default:
            Serial.println("⚠️ Comando no reconocido. Use 'e', 'v' o 'b'.");
    }
    delay(100);  // Pequeño retardo para evitar lecturas rápidas
}

uint8_t readnumber(void) {
    uint8_t num = 0;
    while (num == 0) {
        while (!Serial.available());
        num = Serial.parseInt();
    }
    return num;
}

// 📌 *Enrolar Huella*
void enrollFingerprint() {
    Serial.println("🖐 Listo para enrolar una huella!");
    Serial.println("Ingrese el ID # (de 1 a 127) donde desea guardar esta huella...");
    uint8_t id = readnumber();
    if (id == 0) {
        Serial.println("❌ ID #0 no permitido, intente de nuevo.");
        return;
    }
    Serial.print("📌 Enrolando ID #");
    Serial.println(id);

    int p = -1;
    Serial.print("✋ Esperando una huella válida para enrolar como #"); Serial.println(id);
    while (p != FINGERPRINT_OK) {
        p = finger.getImage();
        switch (p) {
            case FINGERPRINT_OK:
                Serial.println("✅ Imagen capturada");
                break;
            case FINGERPRINT_NOFINGER:
                Serial.print(".");
                break;
            case FINGERPRINT_PACKETRECIEVEERR:
                Serial.println("❌ Error de comunicación");
                break;
            case FINGERPRINT_IMAGEFAIL:
                Serial.println("❌ Error de imagen");
                break;
            default:
                Serial.println("❌ Error desconocido");
                break;
        }
    }

    p = finger.image2Tz(1);
    switch (p) {
        case FINGERPRINT_OK:
            Serial.println("✅ Imagen convertida");
            break;
        case FINGERPRINT_IMAGEMESS:
            Serial.println("❌ Imagen demasiado desordenada");
            return;
        case FINGERPRINT_PACKETRECIEVEERR:
            Serial.println("❌ Error de comunicación");
            return;
        case FINGERPRINT_FEATUREFAIL:
            Serial.println("❌ No se pudieron encontrar características de la huella");
            return;
        case FINGERPRINT_INVALIDIMAGE:
            Serial.println("❌ Imagen inválida");
            return;
        default:
            Serial.println("❌ Error desconocido");
            return;
    }

    Serial.println("Retire el dedo");
    delay(2000);
    p = 0;
    while (p != FINGERPRINT_NOFINGER) {
        p = finger.getImage();
    }
    Serial.print("ID "); Serial.println(id);
    p = -1;
    Serial.println("✋ Coloque el mismo dedo nuevamente");
    while (p != FINGERPRINT_OK) {
        p = finger.getImage();
        switch (p) {
            case FINGERPRINT_OK:
                Serial.println("✅ Imagen capturada");
                break;
            case FINGERPRINT_NOFINGER:
                Serial.print(".");
                break;
            case FINGERPRINT_PACKETRECIEVEERR:
                Serial.println("❌ Error de comunicación");
                break;
            case FINGERPRINT_IMAGEFAIL:
                Serial.println("❌ Error de imagen");
                break;
            default:
                Serial.println("❌ Error desconocido");
                break;
        }
    }

    p = finger.image2Tz(2);
    switch (p) {
        case FINGERPRINT_OK:
            Serial.println("✅ Imagen convertida");
            break;
        case FINGERPRINT_IMAGEMESS:
            Serial.println("❌ Imagen demasiado desordenada");
            return;
        case FINGERPRINT_PACKETRECIEVEERR:
            Serial.println("❌ Error de comunicación");
            return;
        case FINGERPRINT_FEATUREFAIL:
            Serial.println("❌ No se pudieron encontrar características de la huella");
            return;
        case FINGERPRINT_INVALIDIMAGE:
            Serial.println("❌ Imagen inválida");
            return;
        default:
            Serial.println("❌ Error desconocido");
            return;
    }

    Serial.print("Creando modelo para #"); Serial.println(id);
    p = finger.createModel();
    if (p == FINGERPRINT_OK) {
        Serial.println("✅ ¡Huellas coinciden!");
    } else if (p == FINGERPRINT_PACKETRECIEVEERR) {
        Serial.println("❌ Error de comunicación");
        return;
    } else if (p == FINGERPRINT_ENROLLMISMATCH) {
        Serial.println("❌ Las huellas no coinciden");
        return;
    } else {
        Serial.println("❌ Error desconocido");
        return;
    }

    Serial.print("ID "); Serial.println(id);
    p = finger.storeModel(id);
    if (p == FINGERPRINT_OK) {
        Serial.println("✅ ¡Almacenado localmente!");
        sendFingerprintToServer(id);  // Enviar al servidor
    } else if (p == FINGERPRINT_PACKETRECIEVEERR) {
        Serial.println("❌ Error de comunicación");
        return;
    } else if (p == FINGERPRINT_BADLOCATION) {
        Serial.println("❌ No se pudo almacenar en esa ubicación");
        return;
    } else if (p == FINGERPRINT_FLASHERR) {
        Serial.println("❌ Error al escribir en la flash");
        return;
    } else {
        Serial.println("❌ Error desconocido");
        return;
    }
}

// 📌 *Enviar Huella al Servidor*
void sendFingerprintToServer(uint8_t id) {
    HTTPClient http;
    http.begin(String(serverUrl) + "/register-user");
    http.addHeader("Content-Type", "application/json");

    String postData = "{\"name\": \"Usuario" + String(id) + "\", \"fingerprintId\": " + String(id) + "}";
    int httpResponseCode = http.POST(postData);

    if (httpResponseCode == 200) {
        Serial.println("✅ Huella registrada en el servidor!");
    } else {
        Serial.printf("❌ Error registrando huella en el servidor: %d\n", httpResponseCode);
    }
    http.end();
}

// 📌 *Verificar Huella*
void verifyFingerprint() {
    Serial.println("🔎 Esperando una huella válida para verificar...");
    uint8_t p = finger.getImage();
    switch (p) {
        case FINGERPRINT_OK:
            Serial.println("✅ Imagen capturada");
            break;
        case FINGERPRINT_NOFINGER:
            Serial.println("❌ No se detectó huella");
            return;
        case FINGERPRINT_PACKETRECIEVEERR:
            Serial.println("❌ Error de comunicación");
            return;
        case FINGERPRINT_IMAGEFAIL:
            Serial.println("❌ Error de imagen");
            return;
        default:
            Serial.println("❌ Error desconocido");
            return;
    }

    p = finger.image2Tz();
    switch (p) {
        case FINGERPRINT_OK:
            Serial.println("✅ Imagen convertida");
            break;
        case FINGERPRINT_IMAGEMESS:
            Serial.println("❌ Imagen demasiado desordenada");
            return;
        case FINGERPRINT_PACKETRECIEVEERR:
            Serial.println("❌ Error de comunicación");
            return;
        case FINGERPRINT_FEATUREFAIL:
            Serial.println("❌ No se pudieron encontrar características de la huella");
            return;
        case FINGERPRINT_INVALIDIMAGE:
            Serial.println("❌ Imagen inválida");
            return;
        default:
            Serial.println("❌ Error desconocido");
            return;
    }

    p = finger.fingerSearch();
    if (p == FINGERPRINT_OK) {
        Serial.println("✅ ¡Huella encontrada!");
        Serial.print("ID encontrado #"); Serial.print(finger.fingerID);
        Serial.print(" con confianza de "); Serial.println(finger.confidence);
        sendVerificationToServer(finger.fingerID);  // Enviar verificación al servidor
    } else if (p == FINGERPRINT_PACKETRECIEVEERR) {
        Serial.println("❌ Error de comunicación");
    } else if (p == FINGERPRINT_NOTFOUND) {
        Serial.println("❌ No se encontró coincidencia");
    } else {
        Serial.println("❌ Error desconocido");
    }
}

// 📌 *Enviar Verificación al Servidor*
void sendVerificationToServer(uint8_t id) {
    HTTPClient http;
    http.begin(String(serverUrl) + "/verify-fingerprint");
    http.addHeader("Content-Type", "application/json");

    String postData = "{\"fingerprintId\": " + String(id) + "}";
    int httpResponseCode = http.POST(postData);

    if (httpResponseCode == 200) {
        String response = http.getString();
        Serial.println("✅ Respuesta del servidor: " + response);
    } else {
        Serial.printf("❌ Error verificando huella en el servidor: %d\n", httpResponseCode);
    }
    http.end();
}

// 📌 *Borrar Huella*
void deleteFingerprint() {
    Serial.println("🗑 Ingrese el ID # (de 1 a 127) que desea borrar...");
    uint8_t id = readnumber();
    if (id == 0) {
        Serial.println("❌ ID #0 no permitido, intente de nuevo.");
        return;
    }
    Serial.print("Borrando ID #");
    Serial.println(id);

    uint8_t p = finger.deleteModel(id);
    if (p == FINGERPRINT_OK) {
        Serial.println("✅ ¡Borrado localmente!");
        sendDeleteToServer(id);  // Enviar eliminación al servidor
    } else if (p == FINGERPRINT_PACKETRECIEVEERR) {
        Serial.println("❌ Error de comunicación");
    } else if (p == FINGERPRINT_BADLOCATION) {
        Serial.println("❌ No se pudo borrar en esa ubicación");
    } else if (p == FINGERPRINT_FLASHERR) {
        Serial.println("❌ Error al escribir en la flash");
    } else {
        Serial.print("❌ Error desconocido: 0x"); Serial.println(p, HEX);
    }
}

// 📌 *Enviar Eliminación al Servidor*
void sendDeleteToServer(uint8_t id) {
    HTTPClient http;
    http.begin(String(serverUrl) + "/delete-fingerprint/" + String(id));
    int httpResponseCode = http.sendRequest("DELETE");

    if (httpResponseCode == 200) {
        Serial.printf("✅ Huella con ID #%d eliminada del servidor\n", id);
    } else {
        Serial.printf("❌ Error eliminando huella del servidor: %d\n", httpResponseCode);
    }
    http.end();
}
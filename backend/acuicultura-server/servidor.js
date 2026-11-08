const path = require("path");
// Ruta absoluta al .env: funciona sin importar desde qué carpeta se arranque el servidor
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const { rateLimit, MINUTE, DAY } = require("express-rate-limit");
const fs = require("fs/promises");
const { cargarDocumentos, construirInstrucciones, separarFuentes } = require("./contexto");
const app = express();

const PUERTO = process.env.PORT || 3000;
const MODELO = process.env.GEMINI_MODELO || "gemini-3.6-flash";
const URL_GEMINI = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;
const LARGO_MAXIMO_PREGUNTA = 500;

// Ruta absoluta: funciona sin importar desde qué carpeta se arranque el servidor
const RUTA_MUESTRAS = path.join(__dirname, "muestras.json");

// Artículos de referencia que el asistente puede citar (uno por archivo .txt). Se leen una sola vez al arrancar.
const DOCUMENTOS = cargarDocumentos(path.join(__dirname, "conocimiento"));
if (!DOCUMENTOS.length) {
  console.warn("Aviso: la carpeta conocimiento/ no tiene artículos. El chat solo usará los datos del muestreo.");
}

// Mismos datos que reciben las gráficas de la página Datos y el contexto del chat
async function leerMuestras() {
  const contenido = await fs.readFile(RUTA_MUESTRAS, "utf8");
  return JSON.parse(contenido);
}

// Orígenes que pueden llamar a la API desde el navegador.
// Por defecto: cualquier puerto de localhost / 127.0.0.1 (desarrollo local, p. ej. Live Server).
// En producción, definir ORIGENES_PERMITIDOS en .env, separados por comas.
const origenesPermitidos = process.env.ORIGENES_PERMITIDOS
  ? process.env.ORIGENES_PERMITIDOS.split(",").map(function (o) { return o.trim(); })
  : [/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];

if (!process.env.GEMINI_API_KEY) {
  console.warn("Aviso: falta GEMINI_API_KEY en el archivo .env. El chat no funcionará.");
}

// Si el servidor se publica detrás de un proxy (Render, Railway, Nginx...), req.ip sería
// la IP del proxy y todos los usuarios compartirían el mismo límite. TRUST_PROXY=1 lo corrige.
if (process.env.TRUST_PROXY) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY));
}

// Límites de preguntas al chat por IP: frenan ráfagas y protegen la cuota de Gemini.
// Se guardan en memoria: se reinician cuando se reinicia el servidor.
const limitePorMinuto = rateLimit({
  windowMs: MINUTE,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Demasiadas preguntas seguidas. Espera un minuto e inténtalo de nuevo." },
});
const limitePorDia = rateLimit({
  windowMs: DAY,
  limit: 100,
  standardHeaders: false,
  legacyHeaders: false,
  message: { error: "Alcanzaste el límite diario de preguntas. Vuelve mañana." },
});

app.use(cors({ origin: origenesPermitidos }));
app.use(express.json({ limit: "10kb" }));

app.get("/api/datos", async function (req, res) {
  try {
    res.json(await leerMuestras());
  } catch (error) {
    console.error("No se pudo leer muestras.json:", error.message);
    res.status(500).json({ error: "No se pudieron cargar los datos del muestreo." });
  }
});

app.post("/api/chat", limitePorMinuto, limitePorDia, async function (req, res) {
  const mensaje = req.body && req.body.mensaje;
  const pregunta = typeof mensaje === "string" ? mensaje.trim() : "";

  if (!pregunta || pregunta.length > LARGO_MAXIMO_PREGUNTA) {
    return res.status(400).json({
      error: `La pregunta debe tener entre 1 y ${LARGO_MAXIMO_PREGUNTA} caracteres.`,
    });
  }

  let instrucciones;
  try {
    instrucciones = construirInstrucciones({ muestras: await leerMuestras(), documentos: DOCUMENTOS });
  } catch (error) {
    console.error("No se pudo preparar el contexto del chat:", error.message);
    return res.status(500).json({ error: "No se pudieron cargar los datos del muestreo." });
  }

  try {
    const respuestaGemini = await fetch(URL_GEMINI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY || "",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: instrucciones }] },
        contents: [{ role: "user", parts: [{ text: pregunta }] }],
        // Temperatura baja: respuestas pegadas a las fuentes, con menos invención
        generationConfig: { temperature: 0.2 },
      }),
    });

    const datos = await respuestaGemini.json();
    // La respuesta puede venir en varias partes; se unen las de texto y se omiten las de razonamiento
    const texto = (datos.candidates?.[0]?.content?.parts || [])
      .filter((parte) => typeof parte.text === "string" && !parte.thought)
      .map((parte) => parte.text)
      .join("")
      .trim();

    if (!respuestaGemini.ok || !texto) {
      // Solo se registra el estado y el mensaje de error, nunca la clave
      console.error("Respuesta inesperada de Gemini:", respuestaGemini.status, datos.error?.message || "");
      return res.status(502).json({ error: "El asistente no pudo responder en este momento." });
    }

    // La línea final "Fuentes:" se envía aparte, como lista, para mostrarla con su propio formato
    res.json(separarFuentes(texto, DOCUMENTOS));
  } catch (error) {
    console.error("Error al contactar a Gemini:", error.message);
    res.status(502).json({ error: "No se pudo contactar al asistente." });
  }
});

// En Vercel la app se exporta como función (api/index.js) y no abre un puerto;
// en local (node servidor.js) sí se arranca el servidor
if (require.main === module) {
  // En Express 5 los errores al abrir el puerto llegan como argumento de este callback
  app.listen(PUERTO, function (error) {
    if (error) {
      console.error(error.code === "EADDRINUSE"
        ? `El puerto ${PUERTO} ya está en uso. ¿Tienes otro servidor abierto? Ciérralo o usa otro PORT.`
        : "No se pudo iniciar el servidor: " + error.message);
      process.exit(1);
    }
    console.log("Servidor corriendo en http://localhost:" + PUERTO);
  });
}

module.exports = app;

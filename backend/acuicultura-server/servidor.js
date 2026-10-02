const path = require("path");
// Ruta absoluta al .env: funciona sin importar desde qué carpeta se arranque el servidor
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const { rateLimit, MINUTE, DAY } = require("express-rate-limit");
const fs = require("fs/promises");
const app = express();

const PUERTO = process.env.PORT || 3000;
const MODELO = process.env.GEMINI_MODELO || "gemini-3.6-flash";
const URL_GEMINI = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`;
const LARGO_MAXIMO_PREGUNTA = 500;

// Ruta absoluta: funciona sin importar desde qué carpeta se arranque el servidor
const RUTA_MUESTRAS = path.join(__dirname, "muestras.json");

// Contexto que recibe el asistente en cada pregunta, para que responda sobre el proyecto
const CONTEXTO_PROYECTO = `Eres el asistente del proyecto de investigación "Emisiones de gases de efecto invernadero (GEI) en estanques piscícolas de cachama" de la Universidad de los Llanos (Villavicencio, Meta, Colombia).
Responde en español, de forma clara y breve, a público general y estudiantes.
Responde en texto plano: sin Markdown, sin asteriscos ni títulos con #. Si necesitas una lista, usa líneas que empiecen con "- ".

Resumen del proyecto:
- Mide y caracteriza las emisiones de CO2 y CH4 en estanques de tierra usados para cultivar cachama (Piaractus orinoquensis) en la Orinoquía.
- El alimento no consumido, la producción primaria y las heces se acumulan en el sedimento y se descomponen. Con oxígeno se libera principalmente CO2; sin oxígeno domina la metanogénesis y se libera CH4.
- Se monitorean semanalmente cuatro estanques de tierra (identificados como 11, 5, 3 y A4).
- Variables: CO2, CH4 disuelto, pH, temperatura del agua y oxígeno disuelto (OD).

Las cinco fases de muestreo en campo:
1. Toma de muestras de agua con bomba peristáltica: selección del punto, verificación del equipo, extracción, renovación del volumen de la botella (al menos 2 volúmenes), sellado y conservación.
2. Medición de flujos de CO2 con cámara flotante conectada a un analizador Li-COR + LoggerNet. El equipo se estabiliza 30 minutos antes de medir y se registran 8 minutos de datos por punto.
3. Parámetros fisicoquímicos in situ con equipo multiparámetro: pH, temperatura (°C) y OD (ppm y % de saturación), con el sensor sumergido sin tocar sedimentos y esperando a que la lectura se estabilice.
4. Muestreo de aire ambiente en bolsas Tedlar como "blanco atmosférico". La bolsa se llena con el brazo extendido para que el CO2 exhalado no contamine la muestra.
5. Muestreo de gas disuelto por headspace: se extraen 500 mL de agua mientras se inyectan 500 mL de aire atmosférico, se agita la botella 2 minutos, el gas desplazado se captura en una bolsa Tedlar y se analiza en un equipo Picarro de alta precisión.
Si te preguntan algo que no está en este contexto, dilo y responde con conocimiento general, aclarando que no es un dato propio del proyecto. No inventes resultados ni cifras del proyecto.`;

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
    const contenido = await fs.readFile(RUTA_MUESTRAS, "utf8");
    res.json(JSON.parse(contenido));
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

  try {
    const respuestaGemini = await fetch(URL_GEMINI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY || "",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: CONTEXTO_PROYECTO }] },
        contents: [{ role: "user", parts: [{ text: pregunta }] }],
      }),
    });

    const datos = await respuestaGemini.json();
    const texto = datos.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!respuestaGemini.ok || !texto) {
      // Solo se registra el estado y el mensaje de error, nunca la clave
      console.error("Respuesta inesperada de Gemini:", respuestaGemini.status, datos.error?.message || "");
      return res.status(502).json({ error: "El asistente no pudo responder en este momento." });
    }

    res.json({ respuesta: texto });
  } catch (error) {
    console.error("Error al contactar a Gemini:", error.message);
    res.status(502).json({ error: "No se pudo contactar al asistente." });
  }
});

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

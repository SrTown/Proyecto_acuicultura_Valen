require("dotenv").config({ path: require("path").join(__dirname, ".env") });

// Prueba rápida de la conexión con Gemini: node prueba_ai.js
async function preguntar() {
  const modelo = process.env.GEMINI_MODELO || "gemini-3.6-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;

  const respuesta = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY || "",
    },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: "¿Qué es el oxígeno disuelto en el agua, en una frase simple?" }] }
      ]
    }),
  });

  const datos = await respuesta.json();
  const texto = datos.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!respuesta.ok || !texto) {
    console.error("Falló la prueba. Estado HTTP:", respuesta.status, "-", datos.error?.message || "sin texto en la respuesta");
    process.exitCode = 1;
    return;
  }
  console.log(texto);
}

preguntar();

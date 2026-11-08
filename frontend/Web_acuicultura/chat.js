const URL_API_CHAT = "http://localhost:3000/api/chat";
const LARGO_MAXIMO_PREGUNTA = 500; // el mismo límite que valida el servidor

const botonLanzador = document.querySelector("#chat-lanzador");
const panelChat = document.querySelector("#chat-panel");
const formulario = document.querySelector("#form-chat");
const inputPregunta = document.querySelector("#input-pregunta");
const botonEnviar = formulario.querySelector("button[type=submit]");
const parrafoRespuesta = document.querySelector("#respuesta-ia");

inputPregunta.maxLength = LARGO_MAXIMO_PREGUNTA;

botonLanzador.addEventListener("click", function () {
  panelChat.classList.toggle("oculto");
  const abierto = !panelChat.classList.contains("oculto");
  botonLanzador.setAttribute("aria-expanded", String(abierto));
  if (abierto) inputPregunta.focus();
});

// Muestra el texto de la IA convirtiendo el formato Markdown más común
// (**negrita**, viñetas "- " o "* " y títulos "#") en elementos reales.
// Se crean nodos con textContent, nunca innerHTML, para no ejecutar HTML recibido.
function mostrarRespuesta(texto) {
  parrafoRespuesta.textContent = "";

  texto.split("\n").forEach(function (linea, i) {
    if (i > 0) parrafoRespuesta.appendChild(document.createElement("br"));

    const lineaLimpia = linea.replace(/^\s*[-*]\s+/, "• ").replace(/^#+\s*/, "");
    // Al partir por la negrita, los trozos impares son los que iban entre **
    lineaLimpia.split(/\*\*(.+?)\*\*/).forEach(function (trozo, j) {
      if (j % 2 === 1) {
        const negrita = document.createElement("strong");
        negrita.textContent = trozo;
        parrafoRespuesta.appendChild(negrita);
      } else if (trozo) {
        parrafoRespuesta.appendChild(document.createTextNode(trozo));
      }
    });
  });
}

formulario.addEventListener("submit", async function (event) {
  event.preventDefault();

  const pregunta = inputPregunta.value.trim();
  if (!pregunta) return;

  parrafoRespuesta.textContent = "Procesando tu pregunta...";
  botonEnviar.disabled = true;

  try {
    const respuesta = await fetch(URL_API_CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensaje: pregunta }),
    });
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      parrafoRespuesta.textContent = datos.error || "El asistente no pudo responder.";
      return;
    }
    mostrarRespuesta(datos.respuesta);
  } catch (error) {
    parrafoRespuesta.textContent = "No se pudo conectar con el asistente. ¿Está encendido el servidor?";
    console.log("Error al procesar la pregunta:", error);
  } finally {
    botonEnviar.disabled = false;
  }
});

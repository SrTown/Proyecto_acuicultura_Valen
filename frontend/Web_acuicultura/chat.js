const URL_API_CHAT = URL_BASE_API + "/api/chat";
const LARGO_MAXIMO_PREGUNTA = 500; // el mismo límite que valida el servidor

const botonLanzador = document.querySelector("#chat-lanzador");
const panelChat = document.querySelector("#chat-panel");
const formulario = document.querySelector("#form-chat");
const inputPregunta = document.querySelector("#input-pregunta");
const botonEnviar = formulario.querySelector("button[type=submit]");
const parrafoRespuesta = document.querySelector("#respuesta-ia");

inputPregunta.maxLength = LARGO_MAXIMO_PREGUNTA;

// Bloque de fuentes bajo la respuesta (se crea aquí para no repetirlo en cada página HTML)
const bloqueFuentes = document.createElement("div");
bloqueFuentes.className = "chat-fuentes";
bloqueFuentes.hidden = true;
parrafoRespuesta.after(bloqueFuentes);

// Solo se enlazan destinos conocidos: artículos por DOI y la página de Datos del propio sitio
function esEnlaceSeguro(url) {
  return typeof url === "string" && (url.startsWith("https://doi.org/") || url === "datos.html");
}

function mostrarFuentes(fuentes) {
  bloqueFuentes.textContent = "";
  bloqueFuentes.hidden = !Array.isArray(fuentes) || fuentes.length === 0;
  if (bloqueFuentes.hidden) return;

  const titulo = document.createElement("span");
  titulo.className = "chat-fuentes-titulo";
  titulo.textContent = "Fuentes";
  const lista = document.createElement("ul");
  fuentes.forEach(function (fuente) {
    const item = document.createElement("li");
    if (esEnlaceSeguro(fuente.url)) {
      const enlace = document.createElement("a");
      enlace.href = fuente.url;
      enlace.textContent = fuente.nombre;
      if (fuente.url.startsWith("https://")) {
        enlace.target = "_blank";
        enlace.rel = "noopener noreferrer";
      }
      item.appendChild(enlace);
    } else {
      item.textContent = fuente.nombre;
    }
    lista.appendChild(item);
  });
  bloqueFuentes.append(titulo, lista);
}

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
  mostrarFuentes([]);
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
    mostrarFuentes(datos.fuentes);
  } catch (error) {
    parrafoRespuesta.textContent = "No se pudo conectar con el asistente. ¿Está encendido el servidor?";
    console.log("Error al procesar la pregunta:", error);
  } finally {
    botonEnviar.disabled = false;
  }
});

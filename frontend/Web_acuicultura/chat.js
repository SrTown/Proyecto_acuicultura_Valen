const URL_API_CHAT = URL_BASE_API + "/api/chat";
const LARGO_MAXIMO_PREGUNTA = 500; // el mismo límite que valida el servidor
const CLAVE_HISTORIAL = "acuicultura-chat-v1";
const MAXIMO_GUARDADO = 100; // mensajes que se conservan en el navegador
const MAXIMO_CONTEXTO = 8; // mensajes anteriores que se envían para entender preguntas de seguimiento

const botonLanzador = document.querySelector("#chat-lanzador");
const panelChat = document.querySelector("#chat-panel");
const formulario = document.querySelector("#form-chat");
const inputPregunta = document.querySelector("#input-pregunta");
const botonEnviar = formulario.querySelector("button[type=submit]");
const contenedorMensajes = document.querySelector("#chat-mensajes");
const botonLimpiar = document.querySelector("#chat-limpiar");

inputPregunta.maxLength = LARGO_MAXIMO_PREGUNTA;

// La conversación se guarda en el navegador (localStorage) para que siga visible al cambiar de
// página o recargar. Si el navegador no permite guardarla, el chat funciona igual sin historial.
function esMensajeValido(mensaje) {
  return mensaje && (mensaje.rol === "usuario" || mensaje.rol === "asistente") && typeof mensaje.texto === "string";
}

function leerHistorial() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_HISTORIAL));
    return Array.isArray(guardado) ? guardado.filter(esMensajeValido) : [];
  } catch (error) {
    return [];
  }
}

function guardarHistorial() {
  try {
    localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(mensajes.slice(-MAXIMO_GUARDADO)));
  } catch (error) {
    // Sin almacenamiento disponible (modo privado, cuota llena): la conversación solo dura en esta página
  }
}

let mensajes = leerHistorial();

// Escribe el texto de la IA convirtiendo el formato Markdown más común
// (**negrita**, viñetas "- " o "* " y títulos "#") en elementos reales.
// Se crean nodos con textContent, nunca innerHTML, para no ejecutar HTML recibido.
function escribirTextoFormateado(contenedor, texto) {
  texto.split("\n").forEach(function (linea, i) {
    if (i > 0) contenedor.appendChild(document.createElement("br"));

    const lineaLimpia = linea.replace(/^\s*[-*]\s+/, "• ").replace(/^#+\s*/, "");
    // Al partir por la negrita, los trozos impares son los que iban entre **
    lineaLimpia.split(/\*\*(.+?)\*\*/).forEach(function (trozo, j) {
      if (j % 2 === 1) {
        const negrita = document.createElement("strong");
        negrita.textContent = trozo;
        contenedor.appendChild(negrita);
      } else if (trozo) {
        contenedor.appendChild(document.createTextNode(trozo));
      }
    });
  });
}

// Solo se enlazan destinos conocidos: artículos por DOI y la página de Datos del propio sitio
function esEnlaceSeguro(url) {
  return typeof url === "string" && (url.startsWith("https://doi.org/") || url === "datos.html");
}

function crearFuentes(fuentes) {
  if (!Array.isArray(fuentes) || fuentes.length === 0) return null;
  const bloque = document.createElement("div");
  bloque.className = "chat-fuentes";
  const titulo = document.createElement("span");
  titulo.className = "chat-fuentes-titulo";
  titulo.textContent = "Fuentes";
  const lista = document.createElement("ul");
  fuentes.forEach(function (fuente) {
    if (!fuente || typeof fuente.nombre !== "string") return;
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
  bloque.append(titulo, lista);
  return bloque;
}

function crearBurbuja(mensaje) {
  const burbuja = document.createElement("div");
  burbuja.className = `chat-mensaje chat-mensaje-${mensaje.rol}`;
  const autor = document.createElement("span");
  autor.className = "visualmente-oculto";
  autor.textContent = mensaje.rol === "usuario" ? "Tú: " : "Asistente: ";
  burbuja.appendChild(autor);

  if (mensaje.rol === "asistente") {
    escribirTextoFormateado(burbuja, mensaje.texto);
    const fuentes = crearFuentes(mensaje.fuentes);
    if (fuentes) burbuja.appendChild(fuentes);
  } else {
    burbuja.appendChild(document.createTextNode(mensaje.texto));
  }
  return burbuja;
}

function crearBienvenida() {
  const bienvenida = document.createElement("div");
  bienvenida.className = "chat-mensaje chat-mensaje-asistente chat-bienvenida";
  bienvenida.textContent = "Hola. Puedo responder preguntas sobre el proyecto, sus datos de muestreo y los artículos científicos de referencia. ¿Qué quieres saber?";
  return bienvenida;
}

function bajarAlFinal() {
  contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
}

function pintarConversacion() {
  contenedorMensajes.textContent = "";
  if (mensajes.length === 0) contenedorMensajes.appendChild(crearBienvenida());
  mensajes.forEach((mensaje) => contenedorMensajes.appendChild(crearBurbuja(mensaje)));
  bajarAlFinal();
}

function quitarBienvenida() {
  const bienvenida = contenedorMensajes.querySelector(".chat-bienvenida");
  if (bienvenida) bienvenida.remove();
}

function agregarMensaje(mensaje) {
  quitarBienvenida();
  mensajes.push(mensaje);
  guardarHistorial();
  contenedorMensajes.appendChild(crearBurbuja(mensaje));
  bajarAlFinal();
}

// Los errores se muestran en la conversación, pero no se guardan ni se envían como contexto
function mostrarError(texto) {
  const burbuja = document.createElement("div");
  burbuja.className = "chat-mensaje chat-mensaje-error";
  burbuja.textContent = texto;
  contenedorMensajes.appendChild(burbuja);
  bajarAlFinal();
}

function mostrarEscribiendo() {
  const indicador = document.createElement("div");
  indicador.className = "chat-mensaje chat-mensaje-asistente chat-escribiendo";
  indicador.setAttribute("aria-label", "El asistente está escribiendo");
  for (let i = 0; i < 3; i += 1) indicador.appendChild(document.createElement("span"));
  contenedorMensajes.appendChild(indicador);
  bajarAlFinal();
  return indicador;
}

function abrirChat() {
  panelChat.classList.remove("oculto");
  botonLanzador.setAttribute("aria-expanded", "true");
  bajarAlFinal();
  inputPregunta.focus();
}

// Al cerrar, el foco vuelve al botón que abre el chat (útil con teclado)
function cerrarChat() {
  panelChat.classList.add("oculto");
  botonLanzador.setAttribute("aria-expanded", "false");
  botonLanzador.focus();
}

botonLanzador.addEventListener("click", function () {
  if (panelChat.classList.contains("oculto")) abrirChat();
  else cerrarChat();
});
document.querySelector("#chat-cerrar").addEventListener("click", cerrarChat);
panelChat.addEventListener("keydown", function (event) {
  if (event.key === "Escape") cerrarChat();
});

botonLimpiar.addEventListener("click", function () {
  mensajes = [];
  guardarHistorial();
  pintarConversacion();
  inputPregunta.focus();
});

formulario.addEventListener("submit", async function (event) {
  event.preventDefault();

  const pregunta = inputPregunta.value.trim();
  if (!pregunta || botonEnviar.disabled) return;

  // Contexto: los últimos mensajes antes de esta pregunta, sin las fuentes
  const historial = mensajes.slice(-MAXIMO_CONTEXTO).map(({ rol, texto }) => ({ rol, texto }));
  agregarMensaje({ rol: "usuario", texto: pregunta });
  inputPregunta.value = "";
  botonEnviar.disabled = true;
  const indicador = mostrarEscribiendo();

  try {
    const respuesta = await fetch(URL_API_CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensaje: pregunta, historial }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    indicador.remove();

    if (!respuesta.ok || typeof datos.respuesta !== "string") {
      mostrarError(datos.error || "El asistente no pudo responder.");
      return;
    }
    agregarMensaje({ rol: "asistente", texto: datos.respuesta, fuentes: datos.fuentes || [] });
  } catch (error) {
    indicador.remove();
    mostrarError("No se pudo conectar con el asistente. ¿Está encendido el servidor?");
    console.log("Error al procesar la pregunta:", error);
  } finally {
    botonEnviar.disabled = false;
    inputPregunta.focus();
  }
});

pintarConversacion();

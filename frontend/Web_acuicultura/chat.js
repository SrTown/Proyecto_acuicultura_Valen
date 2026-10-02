const botonLanzador = document.querySelector("#chat-lanzador");
const panelChat = document.querySelector("#chat-panel");

botonLanzador.addEventListener("click", function () {
  panelChat.classList.toggle("oculto");
});

const formulario = document.querySelector("#form-chat");
const inputPregunta = document.querySelector("#input-pregunta");
const parrafoRespuesta = document.querySelector("#respuesta-ia");

formulario.addEventListener("submit", async function (event) {
  event.preventDefault();

  const pregunta = inputPregunta.value;
  parrafoRespuesta.textContent = "Procesando tu pregunta...";

  try {
  const respuesta = await fetch("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensaje: pregunta }),
  });

  const datos = await respuesta.json();
  parrafoRespuesta.textContent = datos.respuesta;
} catch (error) {
  parrafoRespuesta.textContent = "Error al procesar tu pregunta.";
  console.log("Error al procesar la pregunta:", error);
}
});
const URL_API_DATOS = "http://localhost:3000/api/datos";

const listaMuestras = document.querySelector("#lista-muestras");
const botonesFiltro = document.querySelectorAll("#filtros button");

function mostrarMensaje(texto) {
  listaMuestras.textContent = "";
  const item = document.createElement("li");
  item.className = "mensaje-lista";
  item.textContent = texto;
  listaMuestras.appendChild(item);
}

function renderizarMuestras(arrayAMostrar) {
  if (arrayAMostrar.length === 0) {
    mostrarMensaje("No hay muestras registradas con esta técnica todavía.");
    return;
  }

  listaMuestras.textContent = ""; // limpia lo que había antes de volver a dibujar
  arrayAMostrar.forEach(function (muestra) {
    const item = document.createElement("li");
    item.textContent = `Fecha: ${muestra.fecha}, pH: ${muestra.ph}, Temperatura: ${muestra.temperatura}°C, Oxígeno: ${muestra.oxigeno} mg/L, Técnica: ${muestra.tecnica}`;
    listaMuestras.appendChild(item);
  });
}

function marcarFiltroActivo(botonActivo) {
  botonesFiltro.forEach(function (boton) {
    const activo = boton === botonActivo;
    boton.classList.toggle("activo", activo);
    boton.setAttribute("aria-pressed", String(activo));
  });
}

mostrarMensaje("Cargando muestras...");

fetch(URL_API_DATOS)
  .then(function (respuesta) {
    if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);
    return respuesta.json();
  })
  .then(function (muestras) {
    renderizarMuestras(muestras);
    marcarFiltroActivo(document.querySelector('#filtros button[data-tecnica="todas"]'));

    botonesFiltro.forEach(function (boton) {
      boton.addEventListener("click", function () {
        const tecnicaSeleccionada = boton.dataset.tecnica;
        marcarFiltroActivo(boton);

        if (tecnicaSeleccionada === "todas") {
          renderizarMuestras(muestras);
        } else {
          renderizarMuestras(muestras.filter(function (muestra) {
            return muestra.tecnica === tecnicaSeleccionada;
          }));
        }
      });
    });
  })
  .catch(function (error) {
    mostrarMensaje("No se pudieron cargar las muestras. Verifica que el servidor esté encendido.");
    console.log("Error al cargar las muestras:", error);
  });

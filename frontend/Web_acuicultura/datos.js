const URL_API_DATOS = "http://localhost:3000/api/datos";

const cuerpoTabla = document.querySelector("#cuerpo-muestras");
const botonesFiltro = document.querySelectorAll("#filtros button");
const contador = document.querySelector("#contador-muestras");
const resumen = document.querySelector("#resumen-muestras");

const NOMBRES_TECNICA = { multiparametro: "Multiparámetro", headspace: "Headspace" };
const COLUMNAS = ["Fecha", "pH", "Temperatura (°C)", "Oxígeno disuelto (mg/L)", "Técnica"];
const formatoFecha = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" });

// "2025-01-15" -> "15 ene 2025". Se construye en hora local para que no cambie el día por la zona horaria.
function formatearFecha(texto) {
  const [anio, mes, dia] = String(texto).split("-").map(Number);
  if (!anio || !mes || !dia) return String(texto);
  return formatoFecha.format(new Date(anio, mes - 1, dia));
}

function celda(texto, etiqueta, clase) {
  const td = document.createElement("td");
  td.textContent = texto;
  td.dataset.etiqueta = etiqueta; // en móvil se muestra como título de cada dato
  if (clase) td.className = clase;
  return td;
}

function mostrarMensaje(texto) {
  cuerpoTabla.textContent = "";
  const fila = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = COLUMNAS.length;
  td.className = "mensaje-tabla";
  td.textContent = texto;
  fila.appendChild(td);
  cuerpoTabla.appendChild(fila);
  contador.textContent = "";
  resumen.hidden = true;
}

function actualizarResumen(muestras) {
  const rango = (clave, unidad) => {
    const valores = muestras.map((m) => Number(m[clave])).filter((v) => !Number.isNaN(v));
    if (!valores.length) return "—";
    const min = Math.min(...valores), max = Math.max(...valores);
    return (min === max ? `${min}` : `${min} – ${max}`) + (unidad ? ` ${unidad}` : "");
  };
  resumen.querySelector('[data-resumen="ph"]').textContent = rango("ph", "");
  resumen.querySelector('[data-resumen="temperatura"]').textContent = rango("temperatura", "°C");
  resumen.querySelector('[data-resumen="oxigeno"]').textContent = rango("oxigeno", "mg/L");
  resumen.hidden = false;
}

function renderizarMuestras(arrayAMostrar) {
  if (arrayAMostrar.length === 0) {
    mostrarMensaje("No hay muestras registradas con esta técnica todavía.");
    return;
  }

  cuerpoTabla.textContent = ""; // limpia lo que había antes de volver a dibujar
  arrayAMostrar.forEach(function (muestra, i) {
    const fila = document.createElement("tr");
    fila.style.setProperty("--i", i); // retraso escalonado de la animación de entrada

    const fecha = celda(formatearFecha(muestra.fecha), COLUMNAS[0], "celda-fecha");
    fecha.title = muestra.fecha;
    fila.appendChild(fecha);
    fila.appendChild(celda(muestra.ph, COLUMNAS[1], "celda-num"));
    fila.appendChild(celda(muestra.temperatura, COLUMNAS[2], "celda-num"));
    fila.appendChild(celda(muestra.oxigeno, COLUMNAS[3], "celda-num"));

    const tecnica = celda("", COLUMNAS[4]);
    const insignia = document.createElement("span");
    insignia.className = "insignia insignia-" + muestra.tecnica;
    insignia.textContent = NOMBRES_TECNICA[muestra.tecnica] || muestra.tecnica;
    tecnica.appendChild(insignia);
    fila.appendChild(tecnica);

    cuerpoTabla.appendChild(fila);
  });

  const n = arrayAMostrar.length;
  contador.textContent = n === 1 ? "1 muestra" : `${n} muestras`;
  actualizarResumen(arrayAMostrar);
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

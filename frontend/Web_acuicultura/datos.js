const URL_API_DATOS = "http://localhost:3000/api/datos";

const listaMuestras = document.querySelector("#lista-muestras");
const filtros = document.querySelector("#filtros");
const contador = document.querySelector("#contador-muestras");
const estadoGraficas = document.querySelector("#estado-graficas");
const graficaTemporal = document.querySelector("#grafica-temporal");

const CONFIGURACION_CAMPOS = {
  codigo: { etiqueta: "Estanque / registro", unidad: "" },
  fecha: { etiqueta: "Fecha", unidad: "" },
  ho: { etiqueta: "Hora de inicio", unidad: "" },
  hf: { etiqueta: "Hora de finalización", unidad: "" },
  temperatura_botella: { etiqueta: "Temperatura de botella", unidad: "°C" },
  co2_headspace: { etiqueta: "CO₂ en headspace", unidad: "ppm" },
  ch4_headspace: { etiqueta: "CH₄ en headspace", unidad: "ppm" },
  cam_t0: { etiqueta: "Inicio de cámara", unidad: "" },
  cam_tf: { etiqueta: "Final de cámara", unidad: "" },
  co2_camara: { etiqueta: "CO₂ en cámara", unidad: "ppm" },
  ch4_camara: { etiqueta: "CH₄ en cámara", unidad: "ppm" },
  temperatura_insitu: { etiqueta: "Temperatura in situ", unidad: "°C" },
  ph: { etiqueta: "pH", unidad: "" },
  od_mgl: { etiqueta: "Oxígeno disuelto", unidad: "mg/L" },
  od_porcentaje: { etiqueta: "Oxígeno disuelto", unidad: "%" }
};

const formatoFecha = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" });

// "2025-01-15" -> "15 ene 2025". Se construye en hora local para que no cambie el día por la zona horaria.
function formatearFecha(texto) {
  const [anio, mes, dia] = String(texto).split("-").map(Number);
  if (!anio || !mes || !dia) return String(texto);
  return formatoFecha.format(new Date(anio, mes - 1, dia));
}

function mostrarMensaje(texto) {
  listaMuestras.textContent = "";
  const mensaje = document.createElement("li");
  mensaje.className = "mensaje-lista";
  mensaje.textContent = texto;
  listaMuestras.appendChild(mensaje);
  contador.textContent = "";
}

function formatearValor(valor) {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "number") return Number.isFinite(valor) ? String(Number(valor.toFixed(3))) : "—";
  return String(valor);
}

function obtenerCampo(campo) {
  return CONFIGURACION_CAMPOS[campo] || { etiqueta: campo, unidad: "" };
}

function renderizarMuestras(arrayAMostrar) {
  if (arrayAMostrar.length === 0) {
    mostrarMensaje("No hay muestras registradas con este filtro.");
    return;
  }

  listaMuestras.textContent = "";
  arrayAMostrar.forEach(function (muestra, i) {
    const item = document.createElement("li");
    item.className = "muestra-item";
    item.style.setProperty("--i", i);

    const encabezado = document.createElement("div");
    encabezado.className = "muestra-encabezado";
    const titulo = document.createElement("h3");
    titulo.textContent = formatearValor(muestra.codigo);
    const fecha = document.createElement("time");
    fecha.className = "muestra-fecha";
    fecha.dateTime = formatearValor(muestra.fecha);
    fecha.textContent = formatearFecha(muestra.fecha);
    encabezado.append(titulo, fecha);

    const variables = document.createElement("dl");
    variables.className = "muestra-variables";
    Object.entries(muestra).forEach(function ([campo, valor]) {
      if (campo === "codigo" || campo === "fecha") return;
      const configuracion = obtenerCampo(campo);
      const etiqueta = document.createElement("dt");
      etiqueta.textContent = configuracion.etiqueta;
      const valorElemento = document.createElement("dd");
      valorElemento.textContent = formatearValor(valor) + (configuracion.unidad && formatearValor(valor) !== "—" ? ` ${configuracion.unidad}` : "");
      variables.append(etiqueta, valorElemento);
    });

    item.append(encabezado, variables);
    listaMuestras.appendChild(item);
  });

  const n = arrayAMostrar.length;
  contador.textContent = n === 1 ? "1 muestra" : `${n} muestras`;
}

function crearFiltros(muestras) {
  filtros.textContent = "";
  const valores = [...new Set(muestras.map((muestra) => muestra.codigo).filter((valor) => valor !== null && valor !== undefined && valor !== ""))];
  const botones = ["todas", ...valores];
  botones.forEach(function (valor) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.dataset.tecnica = valor;
    boton.textContent = valor === "todas" ? "Todas" : valor;
    filtros.appendChild(boton);
  });
  return filtros.querySelectorAll("button");
}

function marcarFiltroActivo(botones, botonActivo) {
  botones.forEach(function (boton) {
    const activo = boton === botonActivo;
    boton.classList.toggle("activo", activo);
    boton.setAttribute("aria-pressed", String(activo));
  });
}

function prepararCanvas(canvas, alto = 380) {
  const ancho = Math.max(canvas.clientWidth, 280);
  const escala = window.devicePixelRatio || 1;
  canvas.width = ancho * escala;
  canvas.height = alto * escala;
  canvas.style.height = `${alto}px`;
  const contexto = canvas.getContext("2d");
  contexto.setTransform(escala, 0, 0, escala, 0, 0);
  return { contexto, ancho, alto };
}

function colorVariable(nombre) {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

const CONFIGURACION_CORRELACIONES = [
  {
    canvas: "#correlacion-od-ch4",
    resultado: "#resultado-od-ch4",
    x: "od_mgl",
    xLabel: "Oxígeno disuelto",
    xUnidad: "mg/L",
    relaciones: [
      { y: "ch4_headspace", yLabel: "CH₄ en headspace", yUnidad: "ppm", metodo: "Headspace", figura: "círculo" }
    ]
  },
  {
    canvas: "#correlacion-temp-co2",
    resultado: "#resultado-temp-co2",
    x: "temperatura_botella",
    xLabel: "Temperatura del agua",
    xUnidad: "°C",
    relaciones: [
      { y: "co2_headspace", yLabel: "CO₂ en headspace", yUnidad: "ppm", metodo: "Botella + headspace", figura: "círculo" }
    ]
  },
  {
    canvas: "#correlacion-ph-ch4",
    resultado: "#resultado-ph-ch4",
    x: "ph",
    xLabel: "pH",
    xUnidad: "",
    relaciones: [
      { y: "ch4_headspace", yLabel: "CH₄ en headspace", yUnidad: "ppm", metodo: "Headspace", figura: "círculo" }
    ]
  }
];

function identificarEstanque(codigo) {
  const coincidencia = String(codigo).match(/^Estanque\s+(.+?)_[AB]$/);
  return coincidencia ? coincidencia[1] : null;
}

function esRegistroHeadspace(muestra) {
  return typeof muestra.co2_headspace === "number" || typeof muestra.ch4_headspace === "number";
}

function calcularRangos(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return { min: min - 1, max: max + 1 };
  const margen = (max - min) * 0.08;
  return { min: min - margen, max: max + margen };
}

function calcularSpearman(filas, campoX, campoY) {
  if (filas.length < 2) return null;

  function rangos(valores) {
    const ordenados = valores.map((valor, indice) => ({ valor, indice })).sort((a, b) => a.valor - b.valor);
    const resultado = Array(valores.length);
    for (let inicio = 0; inicio < ordenados.length;) {
      let fin = inicio + 1;
      while (fin < ordenados.length && ordenados[fin].valor === ordenados[inicio].valor) fin += 1;
      const rango = (inicio + fin + 1) / 2;
      for (let indice = inicio; indice < fin; indice += 1) resultado[ordenados[indice].indice] = rango;
      inicio = fin;
    }
    return resultado;
  }

  const rangosX = rangos(filas.map((fila) => fila[campoX]));
  const rangosY = rangos(filas.map((fila) => fila[campoY]));
  const promedioX = rangosX.reduce((suma, valor) => suma + valor, 0) / rangosX.length;
  const promedioY = rangosY.reduce((suma, valor) => suma + valor, 0) / rangosY.length;
  let numerador = 0;
  let sumaX = 0;
  let sumaY = 0;
  rangosX.forEach(function (valor, indice) {
    const diferenciaX = valor - promedioX;
    const diferenciaY = rangosY[indice] - promedioY;
    numerador += diferenciaX * diferenciaY;
    sumaX += diferenciaX ** 2;
    sumaY += diferenciaY ** 2;
  });
  return sumaX && sumaY ? numerador / Math.sqrt(sumaX * sumaY) : null;
}

function textoCorrelacion(valor) {
  return valor === null ? "no calculable" : `ρ = ${valor >= 0 ? "+" : ""}${valor.toFixed(3)}`;
}

function dibujarPunto(contexto, figura, x, y, color) {
  contexto.fillStyle = color;
  contexto.beginPath();
  if (figura === "triángulo") {
    contexto.moveTo(x, y - 5);
    contexto.lineTo(x - 5, y + 4);
    contexto.lineTo(x + 5, y + 4);
    contexto.closePath();
  } else {
    contexto.arc(x, y, 4, 0, Math.PI * 2);
  }
  contexto.fill();
}

function activarTooltip(canvas, tooltip) {
  if (canvas.dataset.tooltipActivo) return;
  canvas.dataset.tooltipActivo = "true";
  canvas.addEventListener("pointermove", function (evento) {
    const rectangulo = canvas.getBoundingClientRect();
    const x = evento.clientX - rectangulo.left;
    const y = evento.clientY - rectangulo.top;
    let cercano = null;
    let distancia = 12;
    canvas._puntos.forEach(function (punto) {
      const distanciaPunto = Math.hypot(punto.x - x, punto.y - y);
      if (distanciaPunto < distancia) {
        cercano = punto;
        distancia = distanciaPunto;
      }
    });
    if (!cercano) {
      tooltip.hidden = true;
      return;
    }
    tooltip.textContent = `${cercano.estanque}: ${cercano.metodo} · ${cercano.xLabel}: ${formatearValor(cercano.valorX)}${cercano.xUnidad ? ` ${cercano.xUnidad}` : ""} · ${cercano.yLabel}: ${formatearValor(cercano.valorY)} ${cercano.yUnidad}`;
    tooltip.hidden = false;
  });
  canvas.addEventListener("pointerleave", function () { tooltip.hidden = true; });
}

function dibujarCorrelacion(muestras, configuracion) {
  const canvas = document.querySelector(configuracion.canvas);
  const resultado = document.querySelector(configuracion.resultado);
  const tooltip = canvas.parentElement.querySelector(".correlacion-tooltip");
  const estanques = [...new Set(muestras.map((muestra) => identificarEstanque(muestra.codigo)).filter(Boolean))];
  const colores = ["--verde-400", "--naranja-400", "--verde-500", "--naranja-500", "--hueso-dim"];
  const colorPorEstanque = Object.fromEntries(estanques.map((estanque, indice) => [estanque, colorVariable(colores[indice % colores.length])]));
  const series = configuracion.relaciones.map(function (relacion) {
    const campoX = relacion.xAlternativo || configuracion.x;
    const filas = muestras.filter((muestra) => identificarEstanque(muestra.codigo) && typeof muestra[campoX] === "number" && typeof muestra[relacion.y] === "number");
    return { ...relacion, campoX, filas, rho: calcularSpearman(filas, campoX, relacion.y) };
  });
  const todasLasFilas = series.flatMap((serie) => serie.filas.map((fila) => ({ ...fila, metodo: serie.metodo, yLabel: serie.yLabel, yUnidad: serie.yUnidad, figura: serie.figura, valorX: fila[serie.campoX], valorY: fila[serie.y] })));
  const { contexto, ancho, alto } = prepararCanvas(canvas);
  const valoresX = todasLasFilas.map((fila) => fila.valorX);
  const valoresY = todasLasFilas.map((fila) => fila.valorY);
  if (!valoresX.length) {
    resultado.textContent = "No hay pares completos suficientes para esta relación.";
    return;
  }
  const rangoX = calcularRangos(valoresX);
  const rangoY = calcularRangos(valoresY);
  const margen = { arriba: 34, derecha: 24, abajo: 52, izquierda: 64 };
  const anchoUtil = ancho - margen.izquierda - margen.derecha;
  const altoUtil = alto - margen.arriba - margen.abajo;
  const posicion = (valor, rango, longitud) => (valor - rango.min) / (rango.max - rango.min) * longitud;

  contexto.font = "11px " + colorVariable("--font-mono");
  contexto.strokeStyle = colorVariable("--linea");
  contexto.fillStyle = colorVariable("--hueso-dim");
  for (let indice = 0; indice < 5; indice += 1) {
    const y = margen.arriba + (altoUtil * indice) / 4;
    const valor = rangoY.max - ((rangoY.max - rangoY.min) * indice) / 4;
    contexto.beginPath();
    contexto.moveTo(margen.izquierda, y);
    contexto.lineTo(ancho - margen.derecha, y);
    contexto.stroke();
    contexto.textAlign = "right";
    contexto.textBaseline = "middle";
    contexto.fillText(valor.toFixed(2), margen.izquierda - 8, y);
  }
  contexto.textAlign = "center";
  contexto.textBaseline = "top";
  for (let indice = 0; indice < 5; indice += 1) {
    const x = margen.izquierda + (anchoUtil * indice) / 4;
    const valor = rangoX.min + ((rangoX.max - rangoX.min) * indice) / 4;
    contexto.fillText(valor.toFixed(2), x, alto - margen.abajo + 10);
  }
  contexto.save();
  contexto.translate(14, margen.arriba + altoUtil / 2);
  contexto.rotate(-Math.PI / 2);
  contexto.fillStyle = colorVariable("--hueso-dim");
  contexto.fillText(`${series[0].yLabel} (${series[0].yUnidad})`, 0, 0);
  contexto.restore();
  contexto.fillStyle = colorVariable("--hueso-dim");
  contexto.fillText(`${configuracion.xLabel}${configuracion.xUnidad ? ` (${configuracion.xUnidad})` : ""}`, margen.izquierda + anchoUtil / 2, alto - 12);

  canvas._puntos = [];
  todasLasFilas.forEach(function (fila) {
    const x = margen.izquierda + posicion(fila.valorX, rangoX, anchoUtil);
    const y = margen.arriba + altoUtil - posicion(fila.valorY, rangoY, altoUtil);
    dibujarPunto(contexto, fila.figura, x, y, colorPorEstanque[identificarEstanque(fila.codigo)]);
    canvas._puntos.push({ x, y, estanque: identificarEstanque(fila.codigo), metodo: fila.metodo, valorX: fila.valorX, valorY: fila.valorY, xLabel: configuracion.xLabel, xUnidad: configuracion.xUnidad, yLabel: fila.yLabel, yUnidad: fila.yUnidad });
  });
  activarTooltip(canvas, tooltip);
  resultado.textContent = "";
  series.forEach(function (serie) {
    const indicador = document.createElement("span");
    indicador.className = "indicador-correlacion";
    indicador.textContent = `${serie.metodo}: ${textoCorrelacion(serie.rho)} · n = ${serie.filas.length}`;
    resultado.appendChild(indicador);
  });
}

function crearLeyendaCorrelaciones(muestras) {
  const leyenda = document.querySelector("#leyenda-correlaciones");
  leyenda.textContent = "";
  const estanques = [...new Set(muestras.map((muestra) => identificarEstanque(muestra.codigo)).filter(Boolean))];
  const colores = ["--verde-400", "--naranja-400", "--verde-500", "--naranja-500", "--hueso-dim"];
  estanques.forEach(function (estanque, indice) {
    const elemento = document.createElement("span");
    elemento.className = "leyenda-item";
    elemento.innerHTML = `<i style="background:${colorVariable(colores[indice % colores.length])}"></i> Estanque ${estanque}`;
    leyenda.appendChild(elemento);
  });
  const metodo = document.createElement("span");
  metodo.className = "leyenda-item leyenda-metodo";
  metodo.textContent = "Círculo: Headspace";
  leyenda.appendChild(metodo);
}

function dibujarCorrelaciones(muestras) {
  const muestrasHeadspace = muestras.filter(esRegistroHeadspace);
  crearLeyendaCorrelaciones(muestrasHeadspace);
  CONFIGURACION_CORRELACIONES.forEach((configuracion) => dibujarCorrelacion(muestrasHeadspace, configuracion));
}

function dibujarGraficaTemporal(muestras) {
  const { contexto, ancho, alto } = prepararCanvas(graficaTemporal);
  const porFecha = {};
  muestras.forEach(function (muestra) {
    if (!porFecha[muestra.fecha]) porFecha[muestra.fecha] = { ph: [], temperatura: [] };
    if (typeof muestra.ph === "number") porFecha[muestra.fecha].ph.push(muestra.ph);
    if (typeof muestra.temperatura_insitu === "number") porFecha[muestra.fecha].temperatura.push(muestra.temperatura_insitu);
  });
  const datos = Object.entries(porFecha).sort(([fechaA], [fechaB]) => fechaA.localeCompare(fechaB)).map(([fecha, valores]) => ({
    fecha,
    ph: valores.ph.length ? valores.ph.reduce((a, b) => a + b, 0) / valores.ph.length : null,
    temperatura: valores.temperatura.length ? valores.temperatura.reduce((a, b) => a + b, 0) / valores.temperatura.length : null
  }));
  const margen = { arriba: 34, derecha: 42, abajo: 38, izquierda: 38 };
  const anchoUtil = ancho - margen.izquierda - margen.derecha;
  const altoUtil = alto - margen.arriba - margen.abajo;
  const escalas = { ph: [6, 10], temperatura: [24, 35] };
  const colores = { ph: colorVariable("--verde-400"), temperatura: colorVariable("--naranja-400") };

  contexto.font = "11px " + colorVariable("--font-mono");
  contexto.strokeStyle = colorVariable("--linea");
  contexto.fillStyle = colorVariable("--hueso-dim");
  contexto.textAlign = "center";
  contexto.textBaseline = "top";
  for (let indice = 0; indice < 5; indice += 1) {
    const y = margen.arriba + (altoUtil * indice) / 4;
    contexto.beginPath();
    contexto.moveTo(margen.izquierda, y);
    contexto.lineTo(ancho - margen.derecha, y);
    contexto.stroke();
    contexto.textAlign = "right";
    contexto.textBaseline = "middle";
    contexto.fillText((escalas.ph[1] - ((escalas.ph[1] - escalas.ph[0]) * indice) / 4).toFixed(1), margen.izquierda - 8, y);
    contexto.textAlign = "left";
    contexto.fillText((escalas.temperatura[1] - ((escalas.temperatura[1] - escalas.temperatura[0]) * indice) / 4).toFixed(0), ancho - margen.derecha + 8, y);
  }

  function dibujarSerie(campo) {
    contexto.strokeStyle = colores[campo];
    contexto.lineWidth = 2;
    contexto.beginPath();
    datos.forEach(function (dato, indice) {
      if (dato[campo] === null) return;
      const x = margen.izquierda + (datos.length === 1 ? anchoUtil / 2 : (anchoUtil * indice) / (datos.length - 1));
      const [minimo, maximo] = escalas[campo];
      const y = margen.arriba + altoUtil - ((dato[campo] - minimo) / (maximo - minimo)) * altoUtil;
      if (indice === 0 || !datos.slice(0, indice).some((anterior) => anterior[campo] !== null)) contexto.moveTo(x, y);
      else contexto.lineTo(x, y);
    });
    contexto.stroke();
    contexto.fillStyle = colores[campo];
    datos.forEach(function (dato, indice) {
      if (dato[campo] === null) return;
      const x = margen.izquierda + (datos.length === 1 ? anchoUtil / 2 : (anchoUtil * indice) / (datos.length - 1));
      const [minimo, maximo] = escalas[campo];
      const y = margen.arriba + altoUtil - ((dato[campo] - minimo) / (maximo - minimo)) * altoUtil;
      contexto.beginPath();
      contexto.arc(x, y, 3, 0, Math.PI * 2);
      contexto.fill();
    });
  }

  dibujarSerie("ph");
  dibujarSerie("temperatura");
  contexto.font = "11px " + colorVariable("--font-mono");
  contexto.textAlign = "center";
  contexto.textBaseline = "top";
  datos.forEach(function (dato, indice) {
    if (indice % Math.max(1, Math.ceil(datos.length / 6)) !== 0) return;
    const x = margen.izquierda + (datos.length === 1 ? anchoUtil / 2 : (anchoUtil * indice) / (datos.length - 1));
    contexto.fillStyle = colorVariable("--hueso-dim");
    contexto.fillText(formatearFecha(dato.fecha), x, alto - margen.abajo + 10);
  });
  contexto.textAlign = "left";
  contexto.fillStyle = colores.ph;
  contexto.fillText("pH", margen.izquierda, 10);
  contexto.fillStyle = colores.temperatura;
  contexto.fillText("Temperatura °C", margen.izquierda + 34, 10);
}

function dibujarGraficas(muestras) {
  if (!muestras.length) {
    estadoGraficas.textContent = "No hay datos suficientes para dibujar las gráficas.";
    return;
  }
  estadoGraficas.textContent = "";
  dibujarGraficaTemporal(muestras);
  dibujarCorrelaciones(muestras);
  window.addEventListener("resize", function () {
    dibujarGraficaTemporal(muestras);
    dibujarCorrelaciones(muestras);
  });
}

mostrarMensaje("Cargando muestras...");

fetch(URL_API_DATOS)
  .then(function (respuesta) {
    if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);
    return respuesta.json();
  })
  .then(function (muestras) {
    const botonesFiltro = crearFiltros(muestras);
    dibujarGraficas(muestras);
    renderizarMuestras(muestras);
    marcarFiltroActivo(botonesFiltro, document.querySelector('#filtros button[data-tecnica="todas"]'));

    botonesFiltro.forEach(function (boton) {
      boton.addEventListener("click", function () {
        const tecnicaSeleccionada = boton.dataset.tecnica;
        marcarFiltroActivo(botonesFiltro, boton);

        if (tecnicaSeleccionada === "todas") {
          renderizarMuestras(muestras);
        } else {
          renderizarMuestras(muestras.filter(function (muestra) {
            return muestra.codigo === tecnicaSeleccionada;
          }));
        }
      });
    });
  })
  .catch(function (error) {
    mostrarMensaje("No se pudieron cargar las muestras. Verifica que el servidor esté encendido.");
    console.log("Error al cargar las muestras:", error);
  });

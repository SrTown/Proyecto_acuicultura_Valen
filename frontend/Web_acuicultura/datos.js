
const listaMuestras = document.querySelector("#lista-muestras");

function renderizarMuestras(arrayAMostrar) {
  listaMuestras.innerHTML = ""; // limpia lo que había antes de volver a dibujar

  arrayAMostrar.forEach(function (muestra) {
    const item = document.createElement("li");
    item.textContent = `Fecha: ${muestra.fecha}, pH: ${muestra.ph}, Temperatura: ${muestra.temperatura}°C, Oxígeno: ${muestra.oxigeno} mg/L, Técnica: ${muestra.tecnica}`;
    listaMuestras.appendChild(item);
  });
}

fetch("http://localhost:3000/api/datos")
    .then(function (respuesta){
        return respuesta.json();
    })
    .then(function (muestras){
        renderizarMuestras(muestras);
    

    const botones = document.querySelectorAll("#filtros button");


        botones.forEach(function (boton) {
            boton.addEventListener("click", function () {
                const tecnicaSeleccionada = boton.dataset.tecnica;
                console.log("Técnica seleccionada:", tecnicaSeleccionada);

                if(tecnicaSeleccionada=== "todas") {
                    renderizarMuestras(muestras);
                } else {
                    const muestrasFiltradas = muestras.filter(function (muestra) {
                        return muestra.tecnica === tecnicaSeleccionada;
                    });
                    renderizarMuestras(muestrasFiltradas);
                     }
                });
             });

         });



// ---------- Carrusel de imágenes (cinta circular en ambas direcciones) ----------
(function () {
  const carrusel = document.querySelector(".carrusel");
  const track = document.querySelector(".carrusel-track");
  if (!track || !carrusel) return;

  const slidesOriginales = Array.from(track.querySelectorAll("img"));
  const totalReal = slidesOriginales.length;

  // Clonamos la última imagen y la ponemos al principio, y clonamos la
  // primera y la ponemos al final. Así, sin importar la dirección, siempre
  // hay una imagen "de repuesto" esperando al otro lado para dar la vuelta
  // sin que se note el salto.
  const clonInicial = slidesOriginales[totalReal - 1].cloneNode(true);
  const clonFinal = slidesOriginales[0].cloneNode(true);
  clonInicial.setAttribute("aria-hidden", "true");
  clonFinal.setAttribute("aria-hidden", "true");
  track.insertBefore(clonInicial, slidesOriginales[0]);
  track.appendChild(clonFinal);

  // slides ahora es: [clonUltima, real0, real1, ..., realN-1, clonPrimera]
  const slides = Array.from(track.querySelectorAll("img"));
  const puntosCont = document.querySelector(".carrusel-puntos");

  // Arrancamos mostrando real0, que ahora vive en la posición 1 (por el clon inicial)
  let indiceActual = 1;

  slidesOriginales.forEach((_, i) => {
    const punto = document.createElement("button");
    if (i === 0) punto.classList.add("activo");
    punto.addEventListener("click", () => { irADot(i); reiniciarTemporizador(); });
    puntosCont.appendChild(punto);
  });

  function anchoDeSlide() {
    // offsetWidth da el tamaño real de la caja (CSS), sin verse afectado
    // por el transform: scale() que aplicamos a las imágenes no activas.
    return slides[1].offsetWidth;
  }

  function centrarSlide(i, animado) {
    track.style.transition = animado ? "transform 0.5s ease" : "none";
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    const anchoContenedor = carrusel.clientWidth;
    const anchoSlide = anchoDeSlide();
    const offset = (anchoContenedor / 2) - (anchoSlide / 2) - i * (anchoSlide + gap);
    track.style.transform = `translateX(${offset}px)`;
  }

  function marcarImagenActiva(i) {
    slides.forEach((img, idx) => img.classList.toggle("activa", idx === i));
  }

  function marcarPuntoActivo(indiceReal) {
    puntosCont.querySelectorAll("button").forEach((btn, idx) => {
      btn.classList.toggle("activo", idx === indiceReal);
    });
  }

  function saltarSinTransicion(nuevoIndice) {
    // Apaga TODAS las transiciones (posición + opacidad/desenfoque/escala
    // de cada imagen) justo para este cambio de golpe, evitando el parpadeo.
    track.classList.add("sin-transicion");
    indiceActual = nuevoIndice;
    centrarSlide(indiceActual, false);
    marcarImagenActiva(indiceActual);

    // Forzamos al navegador a aplicar el cambio "sin transición" ya mismo,
    // antes de reactivar las transiciones en el siguiente frame.
    void track.offsetWidth;
    requestAnimationFrame(() => {
      track.classList.remove("sin-transicion");
    });
  }

  function avanzar() {
    indiceActual++;
    centrarSlide(indiceActual, true);
    marcarImagenActiva(indiceActual);
    marcarPuntoActivo((indiceActual - 1) % totalReal);

    // Llegamos al clon final (idéntico a real0): saltamos sin animar
    if (indiceActual === slides.length - 1) {
      track.addEventListener("transitionend", function saltar(e) {
        if (e.target !== track) return; // ignorar eventos que burbujean desde las imágenes hijas
        track.removeEventListener("transitionend", saltar);
        saltarSinTransicion(1);
      });
    }
  }

  function retroceder() {
    indiceActual--;
    centrarSlide(indiceActual, true);
    marcarImagenActiva(indiceActual);
    marcarPuntoActivo((((indiceActual - 1) % totalReal) + totalReal) % totalReal);

    // Llegamos al clon inicial (idéntico al último real): saltamos sin animar
    if (indiceActual === 0) {
      track.addEventListener("transitionend", function saltar(e) {
        if (e.target !== track) return; // ignorar eventos que burbujean desde las imágenes hijas
        track.removeEventListener("transitionend", saltar);
        saltarSinTransicion(totalReal);
      });
    }
  }

  function irADot(indiceReal) {
    indiceActual = indiceReal + 1;
    centrarSlide(indiceActual, true);
    marcarImagenActiva(indiceActual);
    marcarPuntoActivo(indiceReal);
  }

  document.querySelector(".carrusel-flecha.izq").addEventListener("click", () => { retroceder(); reiniciarTemporizador(); });
  document.querySelector(".carrusel-flecha.der").addEventListener("click", () => { avanzar(); reiniciarTemporizador(); });

  window.addEventListener("resize", () => centrarSlide(indiceActual, false));

  let temporizador = setInterval(avanzar, 5000);
  function reiniciarTemporizador() {
    clearInterval(temporizador);
    temporizador = setInterval(avanzar, 5000);
  }

  // Posición inicial (sin animar)
  centrarSlide(indiceActual, false);
  marcarImagenActiva(indiceActual);
})();

// ---------- Botón volver arriba ----------
(function () {
  const boton = document.getElementById("volver-arriba");
  if (!boton) return;

  window.addEventListener("scroll", () => {
    boton.classList.toggle("visible", window.scrollY > 400);
  });

  boton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();
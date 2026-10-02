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

// ---------- Cabecera: se vuelve sólida al bajar (en páginas con banner) ----------
(function () {
  const cabecera = document.querySelector("body.con-banner > header");
  if (!cabecera) return;

  function actualizar() {
    cabecera.classList.toggle("solida", window.scrollY > 40);
  }
  window.addEventListener("scroll", actualizar, { passive: true });
  actualizar();
})();

// ---------- Aparición de elementos al hacer scroll ----------
(function () {
  const elementos = document.querySelectorAll("[data-revelar]");
  if (!elementos.length) return;

  // Sin soporte de IntersectionObserver: se muestra todo directamente
  if (!("IntersectionObserver" in window)) {
    elementos.forEach((el) => el.classList.add("revelado"));
    return;
  }

  // Los elementos hermanos aparecen escalonados (uno detrás de otro)
  elementos.forEach((el) => {
    const hermanos = Array.from(el.parentElement.children).filter((h) => h.hasAttribute("data-revelar"));
    const posicion = hermanos.indexOf(el);
    if (posicion > 0) el.style.setProperty("--retraso", Math.min(posicion * 0.1, 0.5) + "s");
  });

  // Al terminar de aparecer, se quita la marca para que el elemento recupere
  // sus propias transiciones (p. ej. el efecto al pasar el ratón, sin retraso)
  function terminar(el) {
    el.removeAttribute("data-revelar");
    el.classList.remove("revelado");
    el.style.removeProperty("--retraso");
  }

  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      const el = entrada.target;
      el.classList.add("revelado");
      el.addEventListener("transitionend", function fin(e) {
        if (e.target !== el || e.propertyName !== "opacity") return;
        el.removeEventListener("transitionend", fin);
        terminar(el);
      });
      observador.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

  elementos.forEach((el) => observador.observe(el));
})();

// ---------- Cifras que cuentan desde 0 al aparecer ----------
(function () {
  const cifras = document.querySelectorAll("[data-contar]");
  const reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!cifras.length || reducirMovimiento || !("IntersectionObserver" in window)) return;

  function contar(el) {
    const final = Number(el.dataset.contar);
    const duracion = 1600;
    const inicio = performance.now();
    function paso(ahora) {
      const t = Math.min((ahora - inicio) / duracion, 1);
      const suavizado = 1 - Math.pow(1 - t, 3); // desacelera al final
      el.textContent = Math.round(final * suavizado);
      if (t < 1) requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);
  }

  const observador = new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      contar(entrada.target);
      observador.unobserve(entrada.target);
    });
  }, { threshold: 0.6 });

  cifras.forEach((el) => observador.observe(el));
})();

// ---------- Metodología: línea de tiempo que se llena e índice de fases ----------
(function () {
  const linea = document.querySelector(".linea-tiempo");
  if (!linea) return;
  const fases = Array.from(linea.querySelectorAll(".fase"));
  const enlaces = Array.from(document.querySelectorAll(".indice-fases a"));

  let pendiente = false;
  function actualizar() {
    pendiente = false;
    // Referencia: un poco por encima del centro de la pantalla
    const referencia = window.innerHeight * 0.45;
    const caja = linea.getBoundingClientRect();
    const progreso = Math.min(Math.max((referencia - caja.top) / caja.height, 0), 1);
    linea.style.setProperty("--progreso", progreso.toFixed(3));

    let actual = -1;
    fases.forEach((fase, i) => {
      const alcanzada = fase.getBoundingClientRect().top < referencia;
      fase.classList.toggle("alcanzada", alcanzada);
      if (alcanzada) actual = i;
    });
    enlaces.forEach((a, i) => a.classList.toggle("activa", i === actual));
  }
  function programar() {
    if (!pendiente) { pendiente = true; requestAnimationFrame(actualizar); }
  }
  window.addEventListener("scroll", programar, { passive: true });
  window.addEventListener("resize", programar);
  actualizar();
})();

// ---------- Visor de imágenes: clic en una imagen con data-ampliar ----------
(function () {
  const imagenes = Array.from(document.querySelectorAll("img[data-ampliar]"));
  if (!imagenes.length || typeof HTMLDialogElement !== "function") return;

  const icono = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const visor = document.createElement("dialog");
  visor.className = "visor";
  visor.setAttribute("aria-label", "Visor de imágenes");
  visor.innerHTML = `
    <button class="boton-cristal visor-cerrar" aria-label="Cerrar">${icono("M6 6l12 12M18 6L6 18")}</button>
    <button class="boton-cristal visor-anterior" aria-label="Imagen anterior">${icono("M15 5l-7 7 7 7")}</button>
    <figure>
      <img alt="">
      <figcaption></figcaption>
      <span class="visor-contador"></span>
    </figure>
    <button class="boton-cristal visor-siguiente" aria-label="Imagen siguiente">${icono("M9 5l7 7-7 7")}</button>`;
  document.body.appendChild(visor);

  const img = visor.querySelector("img");
  const texto = visor.querySelector("figcaption");
  const contador = visor.querySelector(".visor-contador");
  let indice = 0;

  function mostrar(i) {
    indice = (i + imagenes.length) % imagenes.length;
    const origen = imagenes[indice];
    img.src = origen.currentSrc || origen.src;
    img.alt = origen.alt;
    // Pie de foto: el de la figura si existe; si no, el texto alternativo
    const pie = origen.closest("figure")?.querySelector("figcaption");
    texto.textContent = pie ? pie.textContent.trim() : origen.alt;
    contador.textContent = `${indice + 1} / ${imagenes.length}`;
    // Reinicia la animación de entrada en cada cambio
    img.style.animation = "none";
    void img.offsetWidth;
    img.style.animation = "";
  }

  imagenes.forEach((im, i) => {
    im.tabIndex = 0;
    im.setAttribute("role", "button");
    im.setAttribute("aria-label", "Ampliar imagen: " + im.alt);
    const abrir = () => { mostrar(i); visor.showModal(); };
    im.addEventListener("click", abrir);
    im.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); }
    });
  });

  visor.querySelector(".visor-cerrar").addEventListener("click", () => visor.close());
  visor.querySelector(".visor-anterior").addEventListener("click", () => mostrar(indice - 1));
  visor.querySelector(".visor-siguiente").addEventListener("click", () => mostrar(indice + 1));
  visor.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") mostrar(indice - 1);
    if (e.key === "ArrowRight") mostrar(indice + 1);
  });
  // Clic fuera de la imagen (en el fondo oscuro) cierra el visor
  visor.addEventListener("click", (e) => {
    if (e.target === visor) visor.close();
  });
})();
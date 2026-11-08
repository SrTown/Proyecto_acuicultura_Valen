// Dirección base de la API. En local el sitio se sirve aparte (Live Server, http.server...) y la API
// corre en el puerto 3000; publicado (Vercel), el sitio y la API comparten dominio y basta la ruta relativa.
const URL_BASE_API = ["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port !== "3000"
  ? "http://localhost:3000"
  : "";

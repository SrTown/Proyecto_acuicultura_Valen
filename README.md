# Emisiones de GEI en estanques piscícolas de cachama

Sitio web del proyecto de investigación de la Universidad de los Llanos que mide las
emisiones de CO₂ y CH₄ en estanques de tierra para el cultivo de cachama
(*Piaractus orinoquensis*) en la Orinoquía.

El sitio tiene tres páginas (Inicio, Metodología y Datos) y un asistente de chat con IA
(Gemini) que responde preguntas sobre el proyecto y sus cinco fases de muestreo.

## Estructura

```
Proyecto_Valen/
├── backend/acuicultura-server/   Servidor Node.js + Express (API de datos y chat)
│   ├── servidor.js               Rutas /api/datos y /api/chat
│   ├── muestras.json             Datos del muestreo (preliminares)
│   ├── prueba_ai.js              Prueba rápida de la conexión con Gemini
│   └── .env.example              Plantilla de variables de entorno
├── frontend/Web_acuicultura/     Sitio estático
│   ├── index.html                Inicio
│   ├── metodologia.html          Las cinco fases de muestreo
│   ├── datos.html                Tabla de muestras con filtros
│   ├── styles.css                Sistema visual de todo el sitio (colores, tipografía, componentes)
│   ├── interfaz.js               Carrusel, animaciones, línea de tiempo y visor de imágenes
│   ├── datos.js                  Carga y muestra los datos de /api/datos
│   ├── chat.js                   Asistente de chat
│   └── img/                      Fotografías del proyecto
└── docs/                         Presentaciones y documentos del proyecto (no forman parte del sitio)
```

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior (lo exige Express 5).
- Una clave de la API de Gemini: <https://aistudio.google.com/apikey>.
- Visual Studio Code con la extensión **Live Server**, o cualquier servidor estático, para abrir el frontend.

## Puesta en marcha

### 1. Backend

```powershell
cd backend\acuicultura-server
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }   # solo si aún no existe .env
```

Abre `.env` y escribe tu clave en `GEMINI_API_KEY=`. **Nunca subas `.env` a git**: ya está
excluido en `.gitignore`.

Comprueba la conexión con Gemini (opcional):

```powershell
node prueba_ai.js
```

Arranca el servidor:

```powershell
npm run dev     # se reinicia solo al guardar cambios
# o
npm start
```

Debe mostrar `Servidor corriendo en http://localhost:3000`. Si en cambio muestra
`El puerto 3000 ya está en uso`, ya tienes otro servidor abierto: ciérralo o arranca con
otro puerto (ver `PORT` en [Variables de entorno](#variables-de-entorno)).

### 2. Frontend

Abre `frontend/Web_acuicultura/index.html` con **Live Server** (clic derecho → *Open with Live Server*).

El frontend llama a la API en `http://localhost:3000`, así que el backend debe estar encendido
para que funcionen la página de Datos y el chat. Si está apagado, el sitio lo indica con un
mensaje.

> No abras los HTML con doble clic (`file://`): el servidor solo acepta peticiones desde
> `localhost` / `127.0.0.1`.

Las fuentes se cargan desde Google Fonts, así que se necesita conexión a internet para verlas.
Sin conexión el sitio funciona igual, con fuentes de respaldo: Georgia para los títulos y la
fuente del sistema para el texto.

## Diseño del sitio

### Sistema visual

El diseño es **mixto**: las secciones alternan entre fondo oscuro (azul de estanque) y fondo
claro (arena cálida). Todas las páginas abren con un banner fotográfico a ancho completo.

Los colores, tipografías, radios y sombras están definidos como variables en `:root`, al
inicio de `styles.css`. Para cambiar un color en todo el sitio basta con cambiar su variable:

| Variable | Uso |
|---|---|
| `--noche`, `--azul-950` … `--azul-700` | Fondos oscuros |
| `--arena`, `--arena-2`, `--blanco` | Fondos claros y tarjetas |
| `--tinta`, `--tinta-suave` | Texto sobre fondo claro |
| `--hueso`, `--hueso-dim` | Texto sobre fondo oscuro |
| `--verde-500`, `--verde-400` | Acento principal sobre fondo oscuro |
| `--verde-700`, `--naranja-600` | Acentos para texto sobre fondo claro (más oscuros, para que se lean bien) |
| `--naranja-500`, `--naranja-400` | Acento secundario |

**Tipografía:** Fraunces para los títulos, Inter para el texto y JetBrains Mono para las
etiquetas pequeñas (`--font-display`, `--font-body` y `--font-mono`).

### Construir una sección

Cada sección usa una clase de fondo y un `.contenedor` que limita el ancho del contenido:

```html
<section class="seccion seccion-clara">   <!-- o seccion-oscura / seccion-profunda -->
  <div class="contenedor">
    <div class="encabezado-seccion" data-revelar>
      <span class="eyebrow">Etiqueta pequeña</span>
      <h2>Título de la sección</h2>
    </div>
    ...
  </div>
</section>
```

Dentro de `.seccion-clara`, los títulos, textos y enlaces cambian solos a los colores para
fondo claro.

### Interacciones (`interfaz.js`)

Se activan con atributos en el HTML:

| Atributo | Efecto |
|---|---|
| `data-revelar` | El elemento aparece con un desvanecimiento al llegar a él con el scroll. Los elementos hermanos aparecen escalonados. |
| `data-contar="196"` | La cifra cuenta desde 0 hasta el valor al aparecer en pantalla. |
| `data-ampliar` (en un `<img>`) | Al hacer clic, la imagen se abre en el visor a pantalla completa. Usa como pie el `<figcaption>` de su `<figure>` o, si no hay, el texto alternativo. Se navega con las flechas y se cierra con Esc. |

En las tres páginas, la cabecera flota transparente sobre el banner y se vuelve sólida al
bajar. Además, cada página tiene:

- **Inicio:** carrusel de fotos.
- **Metodología:** índice de fases que marca la fase visible y línea de tiempo que se llena
  al hacer scroll.
- **Datos:** tabla que en móvil se muestra como tarjetas y resumen con el rango de cada
  variable.

### Accesibilidad

- Si el sistema tiene activada la opción de **reducir movimiento**, se desactivan las
  animaciones.
- **Sin JavaScript** el contenido se ve completo: las animaciones de aparición solo se
  aplican cuando el JavaScript está activo.
- El visor, el carrusel, el chat y los filtros se pueden usar con teclado.

### Imágenes

Para los banners conviene usar fotos de **al menos 1400 px de ancho**; más pequeñas se ven
borrosas a pantalla completa. Las fotos de las fases se recortan en formato cuadrado, así
que conviene que el motivo principal esté centrado.

## API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/datos` | Devuelve el contenido de `muestras.json`. |
| `POST` | `/api/chat` | Recibe `{ "mensaje": "..." }` (1 a 500 caracteres) y devuelve `{ "respuesta": "..." }`. |

Si hay un error, ambas rutas responden con `{ "error": "..." }` y el código HTTP correspondiente:

| Código | Causa |
|---|---|
| `400` | La pregunta está vacía o supera los 500 caracteres. |
| `429` | Se superó el límite de preguntas (ver abajo). |
| `500` | No se pudo leer `muestras.json`. |
| `502` | Gemini no respondió o devolvió un error (clave inválida, cuota agotada...). La causa queda en la consola del servidor. |

### Límite de preguntas al chat

Para evitar abusos y proteger la cuota de Gemini, cada IP puede hacer como máximo
**10 preguntas por minuto** y **100 por día**. Los contadores se guardan en memoria y se
reinician al reiniciar el servidor. Los valores se cambian en `servidor.js`
(`limitePorMinuto` y `limitePorDia`).

### Contexto del asistente

El chat envía a Gemini una instrucción de sistema con el resumen del proyecto y las cinco
fases de muestreo (`CONTEXTO_PROYECTO` en `servidor.js`). Si cambia la metodología,
actualiza ese texto para que el asistente responda con la información correcta.

## Variables de entorno

| Variable | Obligatoria | Por defecto | Descripción |
|---|---|---|---|
| `GEMINI_API_KEY` | Sí | — | Clave de la API de Gemini. |
| `PORT` | No | `3000` | Puerto del servidor. Si lo cambias, actualiza la URL en `chat.js` y `datos.js`. |
| `GEMINI_MODELO` | No | `gemini-3.6-flash` | Modelo de Gemini que se usa. |
| `ORIGENES_PERMITIDOS` | No | `localhost` y `127.0.0.1` (cualquier puerto) | Dominios que pueden usar la API desde el navegador, separados por comas. Necesario al publicar el sitio. |
| `TRUST_PROXY` | No | — | Número de proxies delante del servidor (por ejemplo `1` en Render o Railway), para que el límite de preguntas se aplique por usuario. |

## Datos del muestreo

`backend/acuicultura-server/muestras.json` contiene datos **preliminares**. Cada muestra tiene
este formato:

```json
{ "fecha": "2025-01-15", "ph": 7.2, "temperatura": 24.5, "oxigeno": 6.1, "tecnica": "multiparametro" }
```

`tecnica` debe ser `multiparametro` o `headspace` para que funcionen los filtros de la página
de Datos. Al reemplazar el archivo con los datos completos, la página se actualiza sin
cambiar el código: la tabla, el contador de muestras y el resumen de rangos se calculan
solos.

Para añadir una técnica nueva:

1. Añade un botón en `datos.html`, dentro de `#filtros`: `<button data-tecnica="nueva">Nombre</button>`.
2. Añade su nombre para mostrar en `NOMBRES_TECNICA`, en `datos.js`.
3. Opcional: dale un color a su insignia en `styles.css` con `.insignia-nueva { ... }`. Si no,
   usa el estilo neutro.

## Publicar en internet (pendiente)

El proyecto está preparado para trabajar en local. Para publicarlo hay que:

1. Alojar el backend en un servicio de Node.js y definir allí las variables de entorno
   (`GEMINI_API_KEY`, `ORIGENES_PERMITIDOS` y `TRUST_PROXY`).
2. Cambiar `http://localhost:3000` en `frontend/Web_acuicultura/chat.js` y `datos.js` por la
   URL pública del backend.
3. Alojar el frontend como sitio estático.

## Equipo

- Valentina Wilches Ávila — valentina.wilches@unillanos.edu.co
- Yudy Alejandra Solano López — yudy.solano@unillanos.edu.co
- Diego David Pardo Buitrago
- João Henrique Fernandes Amaral

Universidad de los Llanos — Sede Barcelona, Villavicencio (Meta), Colombia.

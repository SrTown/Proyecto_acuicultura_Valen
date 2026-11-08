# Emisiones de GEI en estanques piscícolas de cachama

Sitio web del proyecto de investigación de la Universidad de los Llanos que mide las
emisiones de CO₂ y CH₄ en estanques de tierra para el cultivo de cachama
(*Piaractus orinoquensis*) en la Orinoquía.

El sitio tiene tres páginas (Inicio, Metodología y Datos) y un asistente de chat con IA
(Gemini) que responde **solo** preguntas sobre el proyecto, sus datos de muestreo (los mismos
de las gráficas) y los artículos científicos de referencia, citando la fuente de cada respuesta.

## Estructura

```
Proyecto_Valen/
├── backend/acuicultura-server/   Servidor Node.js + Express (API de datos y chat)
│   ├── servidor.js               Rutas /api/datos y /api/chat
│   ├── contexto.js               Arma las instrucciones del asistente (datos + artículos)
│   ├── contexto.test.js          Pruebas (npm test)
│   ├── conocimiento/             Artículos de referencia del asistente, uno por .txt
│   ├── muestras.json             Datos del muestreo
│   ├── prueba_ai.js              Prueba rápida de la conexión con Gemini
│   └── .env.example              Plantilla de variables de entorno
├── api/index.js                  Entrada de la API en Vercel (usa la app de servidor.js)
├── vercel.json                   Configuración de despliegue en Vercel
├── frontend/Web_acuicultura/     Sitio estático
│   ├── index.html                Inicio
│   ├── metodologia.html          Las cinco fases de muestreo
│   ├── datos.html                Gráficas y tabla de muestras con filtros, paginador y ficha de cada muestra (clic en la fila)
│   ├── styles.css                Sistema visual de todo el sitio (colores, tipografía, componentes)
│   ├── interfaz.js               Carrusel, animaciones, línea de tiempo y visor de imágenes
│   ├── config.js                 Dirección de la API (local o publicada)
│   ├── favicon.svg               Ícono de la pestaña (el mismo de la cabecera), con versiones PNG
│   ├── datos.js                  Carga y muestra los datos de /api/datos
│   ├── chat.js                   Asistente de chat (conversación guardada en el navegador con localStorage)
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
| `POST` | `/api/chat` | Recibe `{ "mensaje": "...", "historial": [{ "rol": "usuario" \| "asistente", "texto": "..." }] }` (mensaje de 1 a 500 caracteres; `historial` es opcional, el servidor usa los últimos 8 mensajes, de hasta 2000 caracteres cada uno, para entender preguntas de seguimiento) y devuelve `{ "respuesta": "...", "fuentes": [{ "nombre": "...", "url": "..." }] }`. `url` es el DOI del artículo, `datos.html` para los datos o `null`. |

Si hay un error, ambas rutas responden con `{ "error": "..." }` y el código HTTP correspondiente:

| Código | Causa |
|---|---|
| `400` | La pregunta está vacía o supera los 500 caracteres. |
| `429` | Se superó el límite de preguntas (ver abajo). |
| `500` | No se pudo leer `muestras.json`. |
| `502` | Gemini no respondió o devolvió un error (por ejemplo, clave inválida). La causa queda en la consola del servidor. |
| `503` | Se agotó la cuota de Gemini. En el plan gratuito hay un número fijo de preguntas al día por modelo (20 para `gemini-3.6-flash` al momento de escribir esto; se ve en AI Studio). |

### Límite de preguntas al chat

Para evitar abusos y proteger la cuota de Gemini, cada IP puede hacer como máximo
**10 preguntas por minuto** y **100 por día**. Los contadores se guardan en memoria y se
reinician al reiniciar el servidor. Los valores se cambian en `servidor.js`
(`limitePorMinuto` y `limitePorDia`).

### Contexto del asistente

En cada pregunta, `contexto.js` arma la instrucción de sistema que recibe Gemini con tres
fuentes:

1. **Sitio web del proyecto**: resumen, las cinco fases de muestreo, el equipo de investigación
   y la sede (`DESCRIPCION_PROYECTO`). Si cambia la metodología o el equipo de la página de
   Inicio, actualiza también ese texto.
2. **Datos del muestreo**: se leen de `muestras.json` en cada pregunta (los mismos que las
   gráficas). Incluye la tabla completa, un resumen por estanque (mínimo, promedio y máximo)
   y las tres correlaciones de Spearman de la página Datos, calculadas con la misma fórmula.
3. **Artículos de referencia**: cada archivo `.txt` de `conocimiento/` se carga al arrancar.

El asistente solo responde sobre esas fuentes. Si la pregunta es de otro tema o la respuesta
no está en ellas, contesta con un mensaje fijo (`MENSAJE_FUERA_DE_ALCANCE`). El modelo termina
cada respuesta con una línea `Fuentes:`; el servidor la separa (`separarFuentes`), descarta las
fuentes que no son del proyecto y la envía como lista, que el chat muestra aparte con enlace al
DOI de cada artículo y a la página Datos.

Para añadir un artículo, crea un `.txt` en `conocimiento/` con este encabezado y reinicia el
servidor (o vuelve a publicar):

```
Titulo: <título completo>
Autores: <autores>
Anio: <año>
Revista: <revista>
DOI: <doi>
Licencia: <licencia>
Cita corta: <p. ej. Vroom et al. (2023)>
Tipo: <texto completo | resumen propio>
---
<texto del artículo>
```

Todo el contexto viaja en cada pregunta, así que cada artículo largo consume cuota de tokens
de Gemini. Las pruebas del armado del contexto se ejecutan con `npm test`.

## Variables de entorno

| Variable | Obligatoria | Por defecto | Descripción |
|---|---|---|---|
| `GEMINI_API_KEY` | Sí | — | Clave de la API de Gemini. |
| `PORT` | No | `3000` | Puerto del servidor en local. Si lo cambias, actualiza la URL en `frontend/Web_acuicultura/config.js`. |
| `GEMINI_MODELO` | No | `gemini-3.6-flash` | Modelo de Gemini que se usa. |
| `ORIGENES_PERMITIDOS` | No | `localhost` y `127.0.0.1` (cualquier puerto) | Dominios que pueden usar la API desde el navegador, separados por comas. Necesario al publicar el sitio. |
| `TRUST_PROXY` | No | — | Número de proxies delante del servidor (por ejemplo `1` en Render o Railway), para que el límite de preguntas se aplique por usuario. |

## Datos del muestreo

`backend/acuicultura-server/muestras.json` es un arreglo con una entrada por muestra. Cada una
tiene estos campos (`null` cuando no hay dato):

`codigo` (p. ej. `Estanque 11_A` o `Aire`), `fecha` (`AAAA-MM-DD`), `ho`, `hf`,
`temperatura_botella` (°C), `co2_headspace` y `ch4_headspace` (ppm), `cam_t0`, `cam_tf`,
`co2_camara` y `ch4_camara` (ppm), `temperatura_insitu` (°C), `ph`, `od_mgl` (mg/L) y
`od_porcentaje` (%).

Los filtros de la página Datos se crean solos a partir de los valores de `codigo`. Al
reemplazar el archivo, la página, las gráficas y el asistente usan los datos nuevos sin
cambiar el código.

## Publicar en Vercel

El repositorio ya está preparado para Vercel (`vercel.json`): el frontend se publica como
sitio estático y la app de Express corre como una función en `/api/*` (`api/index.js`). El
frontend detecta solo si está en local o publicado (`config.js`). Vercel instala las
dependencias desde el `package.json` de la raíz, que debe tener las mismas que
`backend/acuicultura-server/package.json` (`npm test` lo comprueba): al añadir o actualizar una
dependencia del servidor, cámbiala en los dos.

1. Crea el proyecto en Vercel sin framework (Other) y con Node.js 22.
2. Define las variables de entorno `GEMINI_API_KEY` y `TRUST_PROXY=1`. `ORIGENES_PERMITIDOS`
   no hace falta: el sitio y la API comparten dominio.
3. Publica con `vercel deploy --prod` o conectando el repositorio.

Los límites de preguntas se guardan en la memoria de cada instancia de la función, así que en
Vercel son aproximados.

## Equipo

- Valentina Wilches Ávila — valentina.wilches@unillanos.edu.co
- Yudy Alejandra Solano López — yudy.solano@unillanos.edu.co
- Diego David Pardo Buitrago
- João Henrique Fernandes Amaral

Universidad de los Llanos — Sede Barcelona, Villavicencio (Meta), Colombia.

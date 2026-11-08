const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  MENSAJE_FUERA_DE_ALCANCE,
  calcularSpearman,
  correlacionesDeGraficas,
  resumenPorCodigo,
  muestrasATabla,
  cargarDocumentos,
  construirInstrucciones,
} = require("./contexto");

function muestra(datos) {
  return {
    codigo: "Estanque 11_A", fecha: "2025-09-06", ho: null, hf: null, temperatura_botella: null,
    co2_headspace: null, ch4_headspace: null, cam_t0: null, cam_tf: null, co2_camara: null,
    ch4_camara: null, temperatura_insitu: null, ph: null, od_mgl: null, od_porcentaje: null,
    ...datos,
  };
}

test("calcularSpearman da +1 y -1 en relaciones monótonas perfectas", () => {
  const filas = [{ x: 1, y: 10 }, { x: 2, y: 20 }, { x: 3, y: 35 }, { x: 4, y: 90 }];
  assert.equal(calcularSpearman(filas, "x", "y"), 1);
  const inversas = filas.map((fila) => ({ x: fila.x, y: -fila.y }));
  assert.equal(calcularSpearman(inversas, "x", "y"), -1);
});

test("calcularSpearman promedia los rangos de valores empatados", () => {
  // x con empate: rangos 1, 2.5, 2.5, 4 frente a y 1, 2, 3, 4 -> rho = 0.9487 (4.5 / sqrt(4.5 * 5))
  const filas = [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 4 }];
  assert.ok(Math.abs(calcularSpearman(filas, "x", "y") - 0.9487) < 0.0001);
});

test("calcularSpearman devuelve null con menos de dos filas o sin variación", () => {
  assert.equal(calcularSpearman([{ x: 1, y: 1 }], "x", "y"), null);
  assert.equal(calcularSpearman([{ x: 1, y: 1 }, { x: 1, y: 2 }], "x", "y"), null);
});

test("correlacionesDeGraficas excluye el aire y los registros sin headspace, como la página Datos", () => {
  const muestras = [
    muestra({ od_mgl: 1, ch4_headspace: 30 }),
    muestra({ codigo: "Estanque 5_B", od_mgl: 2, ch4_headspace: 20 }),
    muestra({ codigo: "Estanque 3_A", od_mgl: 3, ch4_headspace: 10 }),
    muestra({ codigo: "Aire", od_mgl: 9, ch4_headspace: 99 }),
    muestra({ codigo: "Estanque 3_B", od_mgl: 4 }),
  ];
  const [odCh4] = correlacionesDeGraficas(muestras);
  assert.equal(odCh4.x, "od_mgl");
  assert.equal(odCh4.y, "ch4_headspace");
  assert.equal(odCh4.n, 3);
  assert.equal(odCh4.rho, -1);
});

test("resumenPorCodigo calcula mínimo, promedio y máximo ignorando valores vacíos", () => {
  const resumen = resumenPorCodigo([
    muestra({ fecha: "2025-10-01", ph: 7 }),
    muestra({ fecha: "2025-09-06", ph: 8 }),
    muestra({ fecha: "2025-11-01", ph: null }),
  ]);
  assert.equal(resumen.length, 1);
  assert.equal(resumen[0].codigo, "Estanque 11_A");
  assert.equal(resumen[0].muestras, 3);
  assert.equal(resumen[0].desde, "2025-09-06");
  assert.equal(resumen[0].hasta, "2025-11-01");
  assert.deepEqual(resumen[0].variables.ph, { n: 2, minimo: 7, promedio: 7.5, maximo: 8 });
  assert.equal(resumen[0].variables.od_mgl, undefined);
});

test("muestrasATabla genera una fila CSV por muestra con celdas vacías para null", () => {
  const tabla = muestrasATabla([muestra({ ph: 7.2 }), muestra({ codigo: "Aire" })]).split("\n");
  assert.equal(tabla.length, 3);
  assert.ok(tabla[0].startsWith("codigo,fecha,ho,hf,"));
  assert.ok(tabla[1].startsWith("Estanque 11_A,2025-09-06,,,"));
  assert.equal(tabla[1].split(",").length, tabla[0].split(",").length);
  assert.ok(tabla[1].includes(",7.2,"));
});

test("cargarDocumentos lee el encabezado y el texto de cada .txt e ignora otros archivos", () => {
  const carpeta = fs.mkdtempSync(path.join(os.tmpdir(), "conocimiento-"));
  try {
    fs.writeFileSync(path.join(carpeta, "b.txt"), "Titulo: Artículo B\r\nCita corta: Autor B (2024)\r\n---\r\nTexto B.\r\n");
    fs.writeFileSync(path.join(carpeta, "a.txt"), "Titulo: Artículo A\nCita corta: Autor A (2023)\n---\nTexto A.\n");
    fs.writeFileSync(path.join(carpeta, "notas.md"), "no se carga");
    const documentos = cargarDocumentos(carpeta);
    assert.deepEqual(documentos.map((d) => d.citaCorta), ["Autor A (2023)", "Autor B (2024)"]);
    assert.equal(documentos[1].titulo, "Artículo B");
    assert.equal(documentos[1].cuerpo, "Texto B.");
  } finally {
    fs.rmSync(carpeta, { recursive: true, force: true });
  }
  assert.deepEqual(cargarDocumentos(path.join(os.tmpdir(), "carpeta-que-no-existe-xyz")), []);
});

test("construirInstrucciones limita el asistente a las fuentes e incluye datos y artículos", () => {
  const instrucciones = construirInstrucciones({
    muestras: [muestra({ ph: 7.2 }), muestra({ codigo: "Aire" })],
    documentos: [{ citaCorta: "Vroom et al. (2023)", encabezado: "Titulo: X", cuerpo: "Ebullition dominates." }],
  });
  assert.ok(instrucciones.includes(MENSAJE_FUERA_DE_ALCANCE));
  assert.ok(instrucciones.includes("No uses conocimiento general"));
  assert.ok(instrucciones.includes("[Vroom et al. (2023)]"));
  assert.ok(instrucciones.includes("Ebullition dominates."));
  assert.ok(instrucciones.includes("Tabla completa (2 registros, CSV)"));
  assert.ok(instrucciones.includes("Estanque 11_A,2025-09-06"));
  assert.ok(!instrucciones.includes("responde con conocimiento general"));
});

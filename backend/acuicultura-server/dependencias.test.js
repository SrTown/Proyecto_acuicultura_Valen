const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

// En Vercel las dependencias se instalan desde el package.json de la raíz del repositorio;
// si no coinciden con las del servidor, la función falla con "Cannot find module"
test("las dependencias de la raíz coinciden con las del servidor", () => {
  const raiz = require(path.join(__dirname, "..", "..", "package.json"));
  const servidor = require(path.join(__dirname, "package.json"));
  assert.deepEqual(raiz.dependencies, servidor.dependencies);
});

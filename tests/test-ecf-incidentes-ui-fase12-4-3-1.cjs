"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ui = fs.readFileSync(path.resolve(__dirname,"../src/components/cash/EcfIncidentsModal.jsx"),"utf8");
test("Filtros legibles son botones con estado accesible", () => {
  assert.match(ui, /role="group" aria-label="Filtrar estado"/);
  assert.match(ui, /aria-pressed=\{filter === value\}/);
  assert.match(ui, /\["open", "Pendientes"\]/);
  assert.match(ui, /\["finished", "Finalizados"\]/);
  assert.match(ui, /\["all", "Todos"\]/);
  assert.doesNotMatch(ui, /<select[^>]*aria-label="Filtrar estado"/);
});
test("La selección conserva los valores admitidos por el backend", () => {
  assert.match(ui, /setFilter\(value\)/);
  assert.match(ui, /useEffect\(\(\) => setPage\(1\), \[mode, filter\]\)/);
});
test("La guía explica estados y no pide manipular documentos aceptados", () => {
  assert.match(ui, /pasarela DGII simulada/);
  assert.match(ui, /No modifiques facturas aceptadas/);
});
test("Demostración local disponible únicamente en desarrollo Vite", () => {
  assert.match(ui, /canShowVisualExample = import\.meta\.env\.DEV/);
  assert.match(ui, /canShowVisualExample && showExample/);
  assert.match(ui, /data-ecf-example="visual-only"/);
  assert.match(ui, /EJEMPLO-NO-REAL/);
  assert.match(ui, /<button type="button" disabled/);
});
test("No se añade un endpoint de creación ni de reenvío fiscal", () => {
  assert.match(ui, /\/ecf\/reconcile/);
  assert.doesNotMatch(ui, /issue-ecf|\/ecf\/create|submitDocument|reissueDocument/);
  assert.match(ui, /No se envían documentos ni se reservan nuevos e-NCF/);
});

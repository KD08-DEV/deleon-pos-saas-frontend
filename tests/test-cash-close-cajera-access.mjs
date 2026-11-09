import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolveClosingViewerRole, canViewClosingDocumentsForRole } from "../src/lib/cashCloseViewerRole.mjs";

test("Cajera de sesión vigente ve botón aunque localStorage contenga rol viejo", () => {
  const role = resolveClosingViewerRole({membershipRole: "Cajera", storageRole: "Camarero"});
  assert.equal(role, "Cajera");
  assert.equal(canViewClosingDocumentsForRole(role), true);
});
test("Rol Redux prevalece sobre el rol antiguo del navegador", () => {
  assert.equal(resolveClosingViewerRole({reduxRole:"Cajera",storageRole:"Cocina"}),"Cajera");
});
test("Cajera, Owner y Admin tienen vista en solo lectura", () => {
  for (const role of ["Cajera", "Owner", "Admin", " cajera "]) assert.equal(canViewClosingDocumentsForRole(role),true);
});
test("Cocina, Camarero y usuario sin rol no ven la opción", () => {
  for (const role of ["Cocina","Camarero", "", "Invitado"]) assert.equal(canViewClosingDocumentsForRole(role),false);
});
test("Un permiso E33/E34 no eleva a un Camarero", () => {
  assert.equal(canViewClosingDocumentsForRole("Camarero", {fiscal:{ecfDebitNote:true,ecfCreditNote:true}}), false);
});
test("El componente usa el rol actual y no condiciona el botón a emisión E33/E34", () => {
  const here = new URL("../src/pages/admin/CashRegister.jsx", import.meta.url);
  const src = readFileSync(fileURLToPath(here), "utf8");
  assert.match(src, /membershipRole: usageResp\?\.data\?\.currentUser\?\.role/);
  assert.match(src, /\{canConsultClosingDocuments && \(/);
  assert.match(src, /Ver facturas y notas/);
});

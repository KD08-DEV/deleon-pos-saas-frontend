const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/pages/admin/CashRegister.jsx'), 'utf8');
const match = source.match(/const canManageFiscalIncidents =([\s\S]*?);/);
assert.ok(match, 'Falta la regla de visibilidad');
function canView({ country = true, plan = true, enabled = true, role = 'owner', canIssue = true } = {}) {
  const scope = {
    supportsDominicanFiscal: country,
    planFeatures: { fiscal: plan },
    tenantEcfStatus: { enabled, canIssue },
    closingViewerRole: role,
  };
  return vm.runInNewContext(`Boolean(${match[1]})`, scope);
}
test('Owner dominicano con plan fiscal y e-CF activo ve Incidentes', () => assert.equal(canView(), true));
test('Admin autorizado con e-CF activo ve Incidentes', () => assert.equal(canView({ role: 'admin' }), true));
test('e-CF desactivado mantiene la consulta histórica de incidentes', () => assert.equal(canView({ enabled: false }), true));
test('plan sin fiscal oculta Incidentes', () => assert.equal(canView({ plan: false }), false));
test('pais extranjero oculta Incidentes', () => assert.equal(canView({ country: false }), false));
test('Cajera no ve el boton aunque tenga permiso para notas', () => assert.equal(canView({ role: 'cajera' }), false));
test('Camarero no ve Incidentes', () => assert.equal(canView({ role: 'camarero' }), false));
test('CanIssue=false con modulo habilitado permite investigar incidentes', () => assert.equal(canView({ canIssue: false }), true));
test('estado e-CF se consulta por tenant, sede y usuario', () => {
  assert.match(source, /queryKey: \["tenant-ecf-status-for-adjustments", currentTenantId, currentClientId, currentUserId, localization\.countryCode\]/);
});
test('uso del plan segmentado por cuenta y usuario', () => assert.match(source, /queryKey: \["admin\/usage", cashScopeKey\]/));
test('modal cierra si se pierden permisos o contexto fiscal', () => assert.match(source, /if \(!canManageFiscalIncidents\) setShowEcfIncidents\(false\)/));

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  assignedBranches, normalizedRole, canAdministrateBranches, scopeForAuthenticatedUser,
} from '../src/lib/sessionScope.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = rel => fs.readFileSync(path.resolve(root, '..', 'src', rel), 'utf8');
const branch2 = 'sucursal-santiago';

test('Cajera secundaria entra en su sucursal; no en default', () => {
  const c = { _id:'C1',tenantId:'T1',role:'Cajera',clientIds:[branch2] };
  assert.deepEqual(scopeForAuthenticatedUser(c), { tenantId:'T1', clientId:branch2, userId:'C1' });
  assert.equal(canAdministrateBranches(c), false);
});
test('Una cajera no conserva la sucursal de la cuenta anterior, incluso si comparten tenant', () => {
  const next = scopeForAuthenticatedUser(
    { _id:'C2',tenantId:'T1',role:'Cajera',clientIds:[branch2] },
    { tenantId:'T1',clientId:'default',userId:'C1' }
  );
  assert.equal(next.clientId,branch2);
});
test('Camarero/Cocina sin asignaciones modernas conservan default legacy', () => {
  for (const role of ['Camarero','Cocina']) {
    assert.equal(scopeForAuthenticatedUser({ _id:'x',tenantId:'t',role }).clientId,'default');
  }
});
test('Owner/Admin mantienen su sucursal solo si corresponde a la MISMA identidad', () => {
  for (const role of ['Owner','Admin']) {
    const u = { _id:'1',tenantId:'T',role };
    assert.equal(scopeForAuthenticatedUser(u,{ userId:'1',tenantId:'T',clientId:branch2 }).clientId,branch2);
    assert.equal(scopeForAuthenticatedUser(u,{ userId:'otra',tenantId:'T',clientId:branch2 }).clientId,'default');
    assert.equal(scopeForAuthenticatedUser(u,{ userId:'1',tenantId:'otro',clientId:branch2 }).clientId,'default');
    assert.equal(canAdministrateBranches(u),true);
  }
});
test('No tomar privilegios de la propiedad role si membershipRole la contradice', () => {
  const u={_id:'C',tenantId:'T',role:'Admin',membershipRole:'Cajera',clientIds:[branch2]};
  assert.equal(normalizedRole(u),'cajera');
  assert.equal(canAdministrateBranches(u),false);
  assert.equal(scopeForAuthenticatedUser(u).clientId,branch2);
});
test('Membresías con varias sucursales no habilitan selector a Cajera', () => {
  const u={_id:'1',tenantId:'T',role:'Cajera',clientIds:[branch2,'default']};
  assert.equal(canAdministrateBranches(u),false);
  assert.equal(scopeForAuthenticatedUser(u).clientId,branch2);
  assert.deepEqual(assignedBranches({...u,clientIds:[branch2,branch2]}),[branch2]);
});
test('Identidad incompleta no crea ámbito cruzado', () => {
  assert.throws(()=>scopeForAuthenticatedUser({role:'Cajera',tenantId:'t'}),/AUTH_SCOPE_MISSING_IDENTITY/);
});
test('Header solo consulta lista de sucursales en perfiles administrativos, clave incluye usuario', () => {
  const code=read('components/shared/Header.jsx');
  assert.match(code,/enabled: Boolean\(tenantId && user\?\._id && canSwitch\)/);
  assert.match(code,/queryKey: \["header-branches", tenantId, user\?\._id\]/);
  assert.match(code,/if \(!canSwitch \|\| branches\.length < 2\) return null/);
});
test('Login limpia Query/Redux y aplica clientIds reales antes de mostrar nueva sesión', () => {
  const code=read('components/auth/Login.jsx');
  assert.match(code,/await queryClient\.cancelQueries\(\)/);
  assert.match(code,/queryClient\.clear\(\)/);
  assert.match(code,/dispatch\(removeAllItems\(\)\)/);
  assert.match(code,/scopeForAuthenticatedUser/);
  assert.match(code,/clientIds: userData\.clientIds/);
});
test('Al refrescar, carga tardía de otro token no sustituye el usuario vigente', () => {
  const code=read('hooks/useLoadData.js');
  assert.match(code,/localStorage\.getItem\("token"\) === loginToken/);
  assert.match(code,/if \(!belongsToCurrentLogin\(\)\) return/);
});
test('Logout limpia autenticación, pertenencia y datos de cliente', () => {
  const code=read('components/shared/Header.jsx');
  assert.match(code,/queryClient\.clear\(\)/);
  assert.match(code,/dispatch\(clearTenant\(\)\)/);
  assert.match(code,/dispatch\(removeCustomer\(\)\)/);
});

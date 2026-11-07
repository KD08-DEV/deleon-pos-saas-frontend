import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAvailableOriginalCredit, getAdjustmentCode } from '../src/lib/ecfAdjustmentUiRules.mjs';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/pages/admin/CashRegister.jsx', import.meta.url), 'utf8');
test('Límite e34 original 649 menos crédito 59 = 590',()=>{
  assert.equal(getAvailableOriginalCredit(649,59),590);
});
test('Límite e34 no aumenta por e33 de 59',()=>{
  assert.equal(getAvailableOriginalCredit(649,59),590);
  assert.equal(getAvailableOriginalCredit(649,649),0);
});
test('El saldo nunca es negativo',()=>{
  assert.equal(getAvailableOriginalCredit(649,700),0);
});
test('El modo total de e34 mantiene código 1',()=>assert.equal(getAdjustmentCode('34','total'),'1'));
test('El modo total de e33 mantiene código 3',()=>assert.equal(getAdjustmentCode('33','total'),'3'));
test('Caja usa saldo del original sin E33',()=>{
  assert.ok(source.includes('getAvailableOriginalCredit(\n        originalEcfTotal,\n        acceptedCreditNotesTotal'));
  assert.ok(!source.includes('originalEcfTotal + acceptedDebitNotesTotal - acceptedCreditNotesTotal'));
});
test('Caja remite confirmación expresa para anulaciones',()=>{
  assert.ok(source.includes('confirmFullCancellation: true'));
  assert.ok(source.includes('confirmedFullCredit'));
});
test('Interfaz bloquea emitir mientras carga historial de notas',()=>{
  assert.ok(source.includes('ecfAdjustmentsLoading || ecfAdjustmentsFailed'));
});
test('La pantalla no bloquea anulación solo por créditos anteriores',()=>{
  assert.ok(!source.includes('Math.abs(availableCreditTotal - originalEcfTotal) > 0.01'));
});

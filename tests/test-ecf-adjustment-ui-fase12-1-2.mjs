import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdjustmentCode, getPreviewTaxRate, getPreviewTaxAmount } from '../src/lib/ecfAdjustmentUiRules.mjs';
for (const [type,mode,expected] of [['34','partial','3'],['34','total','1'],['33','partial','3'],['33','total','3']]) {
  test(`${type} ${mode} => código ${expected}`,()=>assert.equal(getAdjustmentCode(type,mode),expected));
}
test('rechaza modos inválidos',()=>assert.throws(()=>getAdjustmentCode('33','unknown')));
function order(rate) {
 return {items:[{taxSnapshot:{code:rate?'ITBIS':'EXENTO',name:rate?'ITBIS':'EXENTO',ratePercent:rate,includedInPrice:false}}]};
}
test('base 50 al 18% muestra 9 y no 0.90',()=>assert.equal(getPreviewTaxAmount(50,getPreviewTaxRate(order(18))),9));
test('base 50 al 16% muestra 8',()=>assert.equal(getPreviewTaxAmount(50,getPreviewTaxRate(order(16))),8));
test('exento muestra 0',()=>assert.equal(getPreviewTaxAmount(50,getPreviewTaxRate(order(0))),0));
test('impuestos mixtos no generan estimación',()=>assert.equal(getPreviewTaxRate({items:[...order(18).items,...order(0).items]}),null));
test('sin desglose fiscal no inventa 18%',()=>assert.equal(getPreviewTaxRate({items:[{}]}),null));
test('precio con impuesto incluido no se infiere',()=>assert.equal(getPreviewTaxRate({items:[{taxSnapshot:{ratePercent:18,includedInPrice:true}}]}),null));

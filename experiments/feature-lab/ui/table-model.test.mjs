import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures,rowKey,cellValue,quantityText,windowKey,chartCoordinates} from './table-model.mjs';
import terminal from '../../../terminal.js';
test('row identity retains leading zeros and physical source line',()=>{
  const rows=fixtures(200); assert.equal(rows[0].article_id,'000000');
  assert.equal(new Set(rows.map(rowKey)).size,200);
  assert.notEqual(rowKey({...rows[0],source_file_id:'other'}),rowKey(rows[0]));
});
test('chart pixel ratios retain fractional signs and never convert unbounded quantities to Number',()=>{
  const points=chartCoordinates([{quantity:-1n},{quantity:0n},{quantity:1n}]);
  assert.deepEqual(points.map(p=>p[1]),[145,85,25]);
  const huge=10n**100n;
  assert.deepEqual(chartCoordinates([{quantity:huge},{quantity:2n*huge}]).map(p=>p[1]),[85,25]);
});
test('quantity formatting is exact above Number precision and at seven decimals',()=>{
  assert.equal(quantityText(90071992547409931234567n,'en'),'9007199254740993.1234567');
  assert.equal(quantityText(-1n,'de'),'-0,0000001');
  assert.equal(cellValue(fixtures(1)[0],'article_id','de'),'000000');
  assert.equal(cellValue({...fixtures(1)[0],delivery_date:null},'delivery_date','de'),'');
});
test('window contract uses current production virtualization, including empty and bounds',()=>{
  assert.deepEqual(terminal.visibleLineWindow(50000,320,480,32,8),{start:2,end:33,before:64,after:1598944});
  assert.deepEqual(terminal.visibleLineWindow(0,0,480,32,8),{start:0,end:0,before:0,after:0});
});
test('same-count column change, locale and revision invalidate window guard',()=>{
  const rows=fixtures(1), v={start:0,end:1}; const key=windowKey(rows,v,'de',['article_id'],1);
  assert.notEqual(key,windowKey(rows,v,'de',['customer'],1));
  assert.notEqual(key,windowKey(rows,v,'en',['article_id'],1));
  assert.notEqual(key,windowKey(rows,v,'de',['article_id'],2));
});

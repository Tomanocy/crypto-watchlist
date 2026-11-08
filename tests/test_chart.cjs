'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const C=require('../chart.js');
const rows=[['2026-01-01',100],['2026-01-02',110],['2026-01-03',90],['2026-01-08',120],['2026-01-31',150]];
test('rebase starts at 0 and is percent of first close',()=>{const r=C.rebase(rows);assert.equal(r[0][1],0);assert.ok(Math.abs(r[1][1]-10)<1e-9);assert.ok(Math.abs(r[2][1]+10)<1e-9);assert.deepEqual(C.rebase([]),[]);});
test('range slicing is inclusive of end-days and Max returns all',()=>{assert.deepEqual(C.sliceRange(rows,7,'2026-01-08').map(r=>r[0]),['2026-01-01','2026-01-02','2026-01-03','2026-01-08']);assert.deepEqual(C.sliceRange(rows,7).map(r=>r[0]),['2026-01-31']);assert.equal(C.sliceRange(rows,Infinity).length,5);assert.deepEqual(C.sliceRange([],7),[]);});
test('align uses latest close on/before date, never future (weekend forward-fill)',()=>{const stock=[['2026-01-02',10],['2026-01-05',12]];assert.deepEqual(C.align(['2026-01-01','2026-01-03','2026-01-04','2026-01-05','2026-01-06'],stock),[['2026-01-01',null],['2026-01-03',10],['2026-01-04',10],['2026-01-05',12],['2026-01-06',12]]);});
test('ratio and perf',()=>{const r=C.ratio([['2026-01-02',50],['2026-01-03',60]],[['2026-01-02',10]]);assert.deepEqual(r,[['2026-01-02',5],['2026-01-03',6]]);assert.ok(Math.abs(C.perf(rows,Infinity)-50)<1e-9);assert.equal(C.perf([['2026-01-01',1]],7),null);});
test('hash parsing',()=>{assert.equal(C.parseHash('#coin=xrp'),'XRP');assert.equal(C.parseHash('#coin=<x>'),null);assert.equal(C.parseHash('#news'),null);});

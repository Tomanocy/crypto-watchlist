'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const C=require('../compare-chart.js');
test('ranges and metrics',()=>{assert.deepEqual(C.RANGES.map(r=>r[0]),['7D','1M','3M','6M','1Y','2Y','3Y','5Y','Max']);assert.equal(C.METRICS[0][0],'price');assert.ok(C.COLORS.length>=16);assert.equal(new Set(C.COLORS).size,C.COLORS.length);});
test('yearless labels infer year, never future',()=>{assert.equal(C.labelToIso('Oct 06','2026-11-07T09:00:00-06:00'),'2026-10-06');assert.equal(C.labelToIso('Dec 20','2026-11-07T09:00:00-06:00'),'2025-12-20');assert.equal(C.labelToIso('2026-01-02'),'2026-01-02');assert.equal(C.labelToIso('bogus'),null);});
test('normalize sorts and drops non-numbers',()=>{assert.deepEqual(C.normalize([['Oct 07',2],['Oct 06',1],['Oct 08',null]],'2026-11-07'),[['2026-10-06',1],['2026-10-07',2]]);});
test('rebase uses each line first valid positive point',()=>{assert.deepEqual(C.rebase([['a',null],['b',50],['c',75]]),[['a',null],['b',0],['c',50]]);assert.equal(C.rebase([['a',0],['b',null]]),null);});
test('align never looks ahead and is null before first point',()=>{assert.deepEqual(C.align(['2026-01-01','2026-01-03','2026-01-05'],[['2026-01-02',1],['2026-01-04',2]]),[['2026-01-01',null],['2026-01-03',1],['2026-01-05',2]]);});
test('available ranges need at least one covering series',()=>{const end='2026-11-07';const month=[['2026-10-07',1],['2026-11-07',2]];assert.deepEqual(C.availableRanges([month],end),['7D','1M','Max']);const long=[['2019-01-01',1],[end,2]];assert.deepEqual(C.availableRanges([month,long],end),C.RANGES.map(r=>r[0]));});

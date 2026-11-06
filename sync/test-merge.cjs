const assert=require('node:assert/strict');
const {merge}=require('./merge.js');
const base={records:{a:{done:false}},notes:{a:'原笔记'},moves:{},custom:[],checks:{a:{x:true}},politics:{index:0,updatedAt:''}};
const copy=x=>JSON.parse(JSON.stringify(x));
const phone=copy(base),computer=copy(base);
phone.records.a={done:true,updatedAt:'2026-11-06T10:00:00Z'};
computer.notes.a='电脑笔记';computer.moves.b={date:'2026-11-07'};
let result=merge(base,phone,computer);
assert(result.records.a.done);assert.equal(result.notes.a,'电脑笔记');assert.equal(result.moves.b.date,'2026-11-07');
// Turning a completed task off, clearing a note and removing a move are real edits.
let next=copy(result);next.records.a={done:false,updatedAt:'2026-11-06T11:00:00Z'};next.notes.a='';delete next.moves.b;next.checks.a.x=false;
result=merge(result,next,result);assert.equal(result.records.a.done,false);assert.equal(result.notes.a,'');assert(!result.moves.b);assert.equal(result.checks.a.x,false);
// Independent custom tasks survive concurrent additions.
assert.equal(merge({custom:[]},{custom:[{id:'phone'}]},{custom:[{id:'computer'}]}).custom.length,2);
// Initial import keeps newer cloud progress rather than fresh device defaults.
assert.equal(merge({},base,{politics:{index:4,updatedAt:'2026-11-06T12:00:00Z'}}).politics.index,4);
// A stale offline completion cannot overwrite a later cancellation.
assert.equal(merge({}, {records:{a:{done:true,updatedAt:'2026-11-06T10:00:00Z'}}}, {records:{a:{done:false,updatedAt:'2026-11-06T12:00:00Z'}}}).records.a.done,false);
assert.equal({}.polluted,undefined);
merge({},JSON.parse('{"__proto__":{"polluted":true}}'),{});assert.equal({}.polluted,undefined);
console.log('Merge checks passed: concurrent devices, cancellation, cleared notes, deleted moves, task additions, fresh device and stale offline edits.');
